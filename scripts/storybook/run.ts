/**
The Storybook gate (docs/storybook-gate-plan.md). The stories guard (tests/unit/stories.test.ts)
renders each story once in Node; this gate drives the built Storybook (`npm run build-storybook`)
in Chromium, as a reader does, and checks what only a mounted story shows:

1. renders: every story and docs page in scope opens with no page or console error;
2. panel: a Default's Controls tab lists exactly its `controls.include`, and other stories none;
3. controls: every value the panel offers for a listed control changes the story;
4. interactions: the steps in tests/storybook/interactions.ts, on the canvas (the panel follows
   each step), after a change in the panel (the story follows it), and on the docs page (the
   Default responds, and a canvas opened from there still shows the initial args);
5. toolbar: the viewports, and each phone twin at 390px, off its docs page.

A story is observed through its snapshot: the markup of body (the story and what it portals),
the live values of its form controls and every element's box. Infinite and SVG animations are
paused at 0 first, and a story counts as settled once its snapshot holds for 300ms.

Usage:
  node scripts/storybook/run.ts           the gate, for the phase in scope
  node scripts/storybook/run.ts --self    plants each defect in `mutations`, each of which must
                                          fail its own check, and replays every interaction
                                          entry on the reference's preview page
  node scripts/storybook/run.ts --qualify only replays the interaction entries on the reference
  --phase N                               overrides the phase
  --only <story ids>                      limits the stories
*/
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import {
	chromium,
	type Browser,
	type Frame,
	type Locator,
	type Page,
} from "playwright";
import type { Action } from "../../tests/parity/states.ts";
import {
	interactions,
	type Interaction,
	type Step,
} from "../../tests/storybook/interactions.ts";
import { newContext, settle as settlePreview } from "../lib/capture.ts";
import { waitForFonts } from "../lib/fonts.ts";
import { startServer, writePage, type Server } from "../lib/pages.ts";
import { scope as phaseScope } from "../lib/phases.ts";
import { previews, root, type Preview } from "../lib/reference.ts";
import { buildRuntimes } from "../runtimes.ts";
import { mutations, recordEvents, type Mutation } from "./injected.ts";
import {
	errorsOf,
	eventCount,
	firedIn,
	settled,
	waitForEvent,
	type Recorded,
	type Worker,
} from "./frames.ts";
import {
	currentOf,
	otherValues,
	setWidget,
	showControls,
	waitForWidget,
	widgetOf,
	controlNames,
	GateError,
	pollFor,
} from "./panel.ts";

export type Check =
	"scope" | "renders" | "panel" | "controls" | "interactions" | "toolbar";
type Where = "index" | "canvas" | "docs" | "reference";
type Result = {
	check: Check;
	story: string;
	where: Where;
	ok: boolean;
	detail: string;
};

type Entry = {
	id: string;
	title: string;
	name: string;
	importPath: string;
	type: "story" | "docs";
	exportName?: string;
};

type StoryInfo = {
	controls: { disable?: boolean; include?: string[] };
	initialArgs: Record<string, unknown>;
	viewport: string | undefined;
};

/**
What a step's selectors look inside first (`area`), and what holds the app (`app`): a match
outside the app was portalled into body, and counts when nothing inside the area matches.
*/
type Scope = { area: string; app: string };

const storybookDirectory = path.join(root, "storybook-static");
const reportDirectory = path.join(root, "reports/storybook");
const workerCount = 4;
const appOfStorybook = "#storybook-root, #storybook-docs";
const canvas: Scope = { area: "#storybook-root", app: appOfStorybook };

function argument(name: string): string | undefined {
	const at = process.argv.indexOf(name);
	return at === -1 ? undefined : process.argv[at + 1];
}

const errorMessage = (error: unknown) =>
	error instanceof Error
		? (error.message.split("\n", 1)[0] ?? "")
		: String(error);

/**
Storybook's id for a title: lower case, with runs of other characters turned into one dash.
*/
function sanitize(value: string): string {
	return value
		.toLowerCase()
		.replaceAll(/[^\da-z]+/gv, "-")
		.replaceAll(/^-|-$/gv, "");
}

function groupOf(preview: Preview): string | undefined {
	const first = fs.readFileSync(preview.file, "utf8").split("\n", 1)[0] ?? "";
	return /group="(?<group>[^"]+)"/v.exec(first)?.groups?.group;
}

/**
The component preview whose Default story has this id: "feedback-dialog--default" is Dialog's.
*/
function previewOfStory(id: string): Preview | undefined {
	return previews().find((preview) => {
		const group = groupOf(preview);
		return (
			preview.kind === "component" &&
			group !== undefined &&
			`${sanitize(`${group}-${preview.name}`)}--default` === id
		);
	});
}

function readIndex(): Entry[] {
	const file = path.join(storybookDirectory, "index.json");
	if (!fs.existsSync(file)) {
		throw new Error("Run `npm run build-storybook` first.");
	}

	const index = JSON.parse(fs.readFileSync(file, "utf8")) as {
		entries: Record<string, Entry>;
	};
	return Object.values(index.entries);
}

function moduleOfImport(importPath: string): string | undefined {
	return /^\.\/src\/components\/(?<name>[^\/]+)\//v.exec(importPath)?.groups
		?.name;
}

/**
A docs entry's id prefix, which its stories' ids share: "inputs-button--".
*/
const prefixOfDocs = (docsId: string) => docsId.replace(/docs$/v, "");

type Plan = {
	stories: Entry[];
	docs: Entry[];
	scopeResults: Result[];
};

function scopeResultsOf(entries: Entry[], modules: Set<string>): Result[] {
	const results: Result[] = [];
	for (const name of [...modules].toSorted()) {
		const file = `./src/components/${name}/${name}.stories.tsx`;
		const hasDefault = entries.some(
			(entry) => entry.importPath === file && entry.exportName === "Default",
		);
		results.push({
			check: "scope",
			story: name,
			where: "index",
			ok: hasDefault,
			detail: hasDefault
				? `${file} has a Default`
				: `${file} with a Default story is missing`,
		});
	}

	for (const id of Object.keys(interactions)) {
		const isKnown = entries.some((entry) => entry.id === id);
		const preview = previewOfStory(id);
		if (preview === undefined) {
			results.push({
				check: "scope",
				story: id,
				where: "index",
				ok: false,
				detail: "no component preview has this Default's id",
			});
		} else if (!isKnown && modules.has(preview.name)) {
			results.push({
				check: "scope",
				story: id,
				where: "index",
				ok: false,
				detail: "its interaction entry's story is missing",
			});
		}
	}

	return results;
}

function plan(phase: number, only: string[] | undefined): Plan {
	const entries = readIndex();
	const { modules } = phaseScope(phase);
	const isInScope = (entry: Entry) => {
		if (entry.importPath.startsWith("./stories/")) {
			return true;
		}

		const name = moduleOfImport(entry.importPath);
		return name !== undefined && modules.has(name);
	};

	const isChosen = (entry: Entry) =>
		only === undefined ||
		only.includes(entry.id) ||
		(entry.type === "docs" &&
			only.some((id) => id.startsWith(prefixOfDocs(entry.id))));
	const chosen = entries.filter((entry) => isInScope(entry) && isChosen(entry));
	return {
		stories: chosen.filter((entry) => entry.type === "story"),
		docs: chosen.filter((entry) => entry.type === "docs"),
		scopeResults: scopeResultsOf(entries, modules),
	};
}

/**
Collects results for one job, and the planted defect's count of actions.
*/
class Log {
	readonly results: Result[] = [];
	fired = 0;

	pass(check: Check, story: string, where: Where, detail: string) {
		this.results.push({ check, story, where, ok: true, detail });
	}

	fail(check: Check, story: string, where: Where, detail: string) {
		this.results.push({ check, story, where, ok: false, detail });
	}
}

async function open(
	worker: Worker,
	server: Server,
	pathname: string,
): Promise<Frame> {
	worker.errors.length = 0;
	await worker.page.goto(`${server.origin}/storybook/?path=${pathname}`);
	const handle = await worker.page.waitForSelector(
		"#storybook-preview-iframe",
		{ timeout: 30_000 },
	);
	const frame = await handle.contentFrame();
	if (frame === null) {
		throw new GateError("the preview iframe has no frame");
	}

	await frame.waitForURL(/iframe\.html/v, { timeout: 30_000 });
	await frame.waitForFunction(
		() => Array.isArray((globalThis as unknown as Recorded).__glEvents),
		undefined,
		{ timeout: 30_000 },
	);
	return frame;
}

async function openCanvas(
	worker: Worker,
	server: Server,
	id: string,
): Promise<Frame> {
	const frame = await open(worker, server, `/story/${id}`);
	await waitForEvent(frame, { type: "storyRendered", id, since: 0 });
	await waitForFonts(frame);
	await settled(frame);
	return frame;
}

async function openDocs(
	worker: Worker,
	server: Server,
	docsId: string,
): Promise<Frame> {
	const frame = await open(worker, server, `/docs/${docsId}`);
	await waitForEvent(frame, { type: "docsRendered", id: docsId, since: 0 });
	await waitForFonts(frame);
	await settled(frame);
	return frame;
}

async function storyInfo(frame: Frame, id: string): Promise<StoryInfo> {
	return frame.evaluate(async (storyId) => {
		type Prepared = {
			parameters?: {
				controls?: { disable?: boolean; include?: string[] };
			};
			initialArgs?: Record<string, unknown>;
			storyGlobals?: { viewport?: { value?: string } };
		};
		const preview = (
			globalThis as unknown as {
				__STORYBOOK_PREVIEW__: {
					storyStoreValue: {
						loadStory: (options: { storyId: string }) => Promise<Prepared>;
					};
				};
			}
		).__STORYBOOK_PREVIEW__;
		const story = await preview.storyStoreValue.loadStory({ storyId });
		const initialArgs: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(story.initialArgs ?? {})) {
			if (["string", "number", "boolean"].includes(typeof value)) {
				initialArgs[key] = value;
			}
		}

		return {
			controls: {
				disable: story.parameters?.controls?.disable,
				include: story.parameters?.controls?.include,
			},
			initialArgs,
			viewport: story.storyGlobals?.viewport?.value,
		};
	}, id);
}

/**
The elements a selector picks in a scope: those inside its area, else those portalled out of
the app into body.
*/
async function candidates(
	frame: Frame,
	selector: string,
	scope: Scope,
): Promise<Locator[]> {
	const all = frame.locator(selector);
	const count = await all.count();
	const inside: Locator[] = [];
	const portalled: Locator[] = [];
	/* eslint-disable no-await-in-loop -- one element at a time, in order */
	for (let index = 0; index < count; index++) {
		const match = all.nth(index);
		// An overlay can unmount between the count and this call, at the end of its exit
		// transition, which is what a step that hides it waits for: count it as gone.
		const where = await match
			.evaluate(
				(element, areas) => {
					if (element.closest(areas.area) !== null) {
						return "inside";
					}

					return element.closest(areas.app) === null
						? "portalled"
						: "elsewhere";
				},
				scope,
				{ timeout: 1000 },
			)
			.catch(() => "gone");
		if (where === "inside") {
			inside.push(match);
		} else if (where === "portalled") {
			portalled.push(match);
		}
	}
	/* eslint-enable no-await-in-loop */

	return inside.length > 0 ? inside : portalled;
}

async function isShown(
	frame: Frame,
	selector: string,
	scope: Scope,
): Promise<boolean> {
	for (const match of await candidates(frame, selector, scope)) {
		// eslint-disable-next-line no-await-in-loop -- stops at the first visible one
		if (await match.isVisible()) {
			return true;
		}
	}

	return false;
}

async function act(frame: Frame, action: Action, scope: Scope): Promise<void> {
	if ("press" in action) {
		// A key goes to the focused frame, which after a page load is the manager's; focusing
		// the preview's window keeps whatever element inside it has focus.
		await frame.evaluate(() => {
			if (!document.hasFocus()) {
				globalThis.focus();
			}
		});
		await frame.page().keyboard.press(action.press);
		return;
	}

	if ("wait" in action) {
		await delay(action.wait);
		return;
	}

	const selector =
		"click" in action
			? action.click
			: "hover" in action
				? action.hover
				: action.focus;
	const [target] = await candidates(frame, selector, scope);
	if (target === undefined) {
		throw new GateError(`nothing matches ${selector}`);
	}

	if ("click" in action) {
		await target.click();
	} else if ("hover" in action) {
		await target.hover();
	} else {
		await target.focus();
	}
}

function describeAction(action: Action): string {
	const [kind, value] = (
		Object.entries(action) as Array<[string, unknown]>
	)[0] ?? ["", ""];
	return `${kind} ${String(value)}`;
}

type Panel = { page: Page; arg: string };

/**
Polls until the step's outcome holds: the panel's arg (when `panel` is given) and what it shows
and hides. Returns what still didn't hold when time ran out.
*/
async function outcome(
	frame: Frame,
	step: Pick<Step, "arg" | "shows" | "hides">,
	scope: Scope,
	panel?: Panel,
): Promise<string[]> {
	const start = Date.now();
	let problems: string[] = [];
	/* eslint-disable no-await-in-loop -- polled until it holds */
	do {
		problems = [];
		if (panel !== undefined) {
			const current = currentOf(await widgetOf(panel.page, panel.arg));
			if (current !== String(step.arg)) {
				problems.push(
					`the panel shows ${panel.arg} = ${String(current)}, not ${String(step.arg)}`,
				);
			}
		}

		for (const selector of step.shows ?? []) {
			if (!(await isShown(frame, selector, scope))) {
				problems.push(`${selector} isn't shown`);
			}
		}

		for (const selector of step.hides ?? []) {
			if (await isShown(frame, selector, scope)) {
				problems.push(`${selector} is still shown`);
			}
		}

		if (problems.length === 0) {
			return [];
		}

		await delay(100);
	} while (Date.now() - start < pollFor);
	/* eslint-enable no-await-in-loop */

	return problems;
}

type Job = {
	check: Check;
	story: string;
	where: Where;
	run: (worker: Worker, log: Log) => Promise<void>;
};

async function checkPanel(
	worker: Worker,
	log: Log,
	entry: Entry,
	info: StoryInfo,
): Promise<void> {
	const expected =
		entry.exportName === "Default" && info.controls.disable === false
			? (info.controls.include ?? []).toSorted()
			: [];
	// A panel that should stay empty gets a moment to fill wrongly.
	await delay(expected.length === 0 ? 1000 : 0);
	const start = Date.now();
	let names: string[] = [];
	/* eslint-disable no-await-in-loop -- polled until it holds */
	do {
		names = await controlNames(worker.page);
		if (names.join(",") === expected.join(",")) {
			break;
		}

		await delay(100);
	} while (Date.now() - start < pollFor);
	/* eslint-enable no-await-in-loop */

	if (names.join(",") === expected.join(",")) {
		log.pass(
			"panel",
			entry.id,
			"canvas",
			expected.length === 0 ? "no controls" : names.join(", "),
		);
	} else {
		log.fail(
			"panel",
			entry.id,
			"canvas",
			`lists [${names.join(", ")}], not [${expected.join(", ")}]`,
		);
	}
}

async function checkTwin(worker: Worker, log: Log, id: string): Promise<void> {
	const handle = await worker.page.$("#storybook-preview-iframe");
	const box = await handle?.boundingBox();
	const width = Math.round(box?.width ?? 0);
	const label =
		(await worker.page
			.getByRole("button", { name: /viewport/iv })
			.first()
			.getAttribute("aria-label")) ?? "";
	const isLocked =
		label.includes("set by story parameters") && label.includes("Phone");
	if (width === 390 && isLocked) {
		log.pass("toolbar", id, "canvas", "a phone twin at 390px");
	} else {
		log.fail(
			"toolbar",
			id,
			"canvas",
			`a phone twin ${width}px wide, toolbar "${label}"`,
		);
	}
}

function storyJob(server: Server, entry: Entry, info: StoryInfo): Job {
	return {
		check: "renders",
		story: entry.id,
		where: "canvas",
		async run(worker, log) {
			const frame = await openCanvas(worker, server, entry.id);
			const errors = await errorsOf(worker, frame);
			if (errors.length === 0) {
				log.pass("renders", entry.id, "canvas", "no errors");
			} else {
				log.fail("renders", entry.id, "canvas", errors.join(" | "));
			}

			await showControls(worker.page);
			await checkPanel(worker, log, entry, info);
			if (info.viewport === "phone") {
				await checkTwin(worker, log, entry.id);
			}

			log.fired += await firedIn(worker, frame);
		},
	};
}

function controlJob(server: Server, entry: Entry, name: string): Job {
	return {
		check: "controls",
		story: entry.id,
		where: "canvas",
		async run(worker, log) {
			let frame = await openCanvas(worker, server, entry.id);
			await showControls(worker.page);
			const widget = await waitForWidget(worker.page, name);
			if (widget === undefined) {
				log.fail(
					"controls",
					entry.id,
					"canvas",
					`the panel has no control for ${name}`,
				);
				log.fired += await firedIn(worker, frame);
				return;
			}

			if (widget.kind === "other") {
				log.fail(
					"controls",
					entry.id,
					"canvas",
					`${name}: the panel's control is a <${widget.tag}>, which a reader can't set`,
				);
			}

			/* eslint-disable no-await-in-loop -- one value per fresh story */
			for (const [index, value] of otherValues(widget).entries()) {
				const label = `${name} = ${String(value)}`;
				try {
					if (index > 0) {
						frame = await openCanvas(worker, server, entry.id);
						await showControls(worker.page);
					}

					const before = await settled(frame);
					const since = await eventCount(frame);
					await setWidget(worker.page, name, widget, value);
					await waitForEvent(frame, {
						type: "storyArgsUpdated",
						id: entry.id,
						since,
						timeout: 5000,
					});
					const after = await settled(frame);
					const errors = await errorsOf(worker, frame);
					if (errors.length > 0) {
						log.fail(
							"controls",
							entry.id,
							"canvas",
							`${label}: ${errors.join(" | ")}`,
						);
					} else if (after === before) {
						log.fail(
							"controls",
							entry.id,
							"canvas",
							`${label} changes nothing in the story`,
						);
					} else {
						log.pass("controls", entry.id, "canvas", label);
					}
				} catch (error) {
					log.fail(
						"controls",
						entry.id,
						"canvas",
						`${label}: ${errorMessage(error)}`,
					);
				}

				log.fired += await firedIn(worker, frame);
			}
			/* eslint-enable no-await-in-loop */
		},
	};
}

/**
Runs an entry's steps and logs one result per step. Stops at the first that fails, and says
whether every step passed.
*/
async function runSteps(
	log: Log,
	options: {
		story: string;
		where: Where;
		label: string;
		frame: Frame;
		steps: Step[];
		scope: Scope;
		panel?: Panel;
		errors: () => Promise<string[]>;
	},
): Promise<{ hasPassed: boolean }> {
	/* eslint-disable no-await-in-loop -- steps run in order */
	for (const [index, step] of options.steps.entries()) {
		const name = `${options.label}, step ${index + 1} (${describeAction(step.action)})`;
		try {
			await act(options.frame, step.action, options.scope);
			const problems = await outcome(
				options.frame,
				step,
				options.scope,
				options.panel,
			);
			const errors = await options.errors();
			if (problems.length > 0 || errors.length > 0) {
				log.fail(
					"interactions",
					options.story,
					options.where,
					`${name}: ${[...problems, ...errors].join(" | ")}`,
				);
				return { hasPassed: false };
			}

			log.pass("interactions", options.story, options.where, name);
		} catch (error) {
			log.fail(
				"interactions",
				options.story,
				options.where,
				`${name}: ${errorMessage(error)}`,
			);
			return { hasPassed: false };
		}
	}
	/* eslint-enable no-await-in-loop */

	return { hasPassed: true };
}

type InteractionContext = {
	worker: Worker;
	server: Server;
	log: Log;
	id: string;
	interaction: Interaction;
};

/**
After the panel sets the first step's value, the story follows it, and the next steps still
sync with the panel.
*/
async function afterPanelChange(context: InteractionContext): Promise<void> {
	const { worker, server, log, id, interaction } = context;
	const [first, ...rest] = interaction.steps;
	if (first === undefined) {
		return;
	}

	const label = `after the panel sets ${interaction.arg} = ${String(first.arg)}`;
	let frame: Frame | undefined;
	try {
		frame = await openCanvas(worker, server, id);
		const opened = frame;
		await showControls(worker.page);
		const widget = await waitForWidget(worker.page, interaction.arg);
		if (widget === undefined) {
			throw new GateError(`the panel has no control for ${interaction.arg}`);
		}

		const since = await eventCount(opened);
		await setWidget(
			worker.page,
			interaction.arg,
			widget,
			typeof first.arg === "boolean" ? first.arg : String(first.arg),
		);
		await waitForEvent(opened, {
			type: "storyArgsUpdated",
			id,
			since,
			timeout: 5000,
		});
		const problems = await outcome(opened, first, canvas);
		const errors = await errorsOf(worker, opened);
		if (problems.length > 0 || errors.length > 0) {
			log.fail(
				"interactions",
				id,
				"canvas",
				`${label}: the story doesn't follow: ${[...problems, ...errors].join(" | ")}`,
			);
		} else {
			log.pass("interactions", id, "canvas", `${label}: the story follows`);
			await runSteps(log, {
				story: id,
				where: "canvas",
				label,
				frame: opened,
				steps: rest,
				scope: canvas,
				panel: { page: worker.page, arg: interaction.arg },
				errors: async () => errorsOf(worker, opened),
			});
		}
	} catch (error) {
		log.fail("interactions", id, "canvas", `${label}: ${errorMessage(error)}`);
	}

	log.fired += await firedIn(worker, frame);
}

/**
On the docs page the Default responds, and a canvas opened from there through the sidebar,
without reloading the preview, still shows the initial value: the docs page wrote no args.
*/
async function onDocsPage(
	context: InteractionContext,
	docsId: string,
	initial: unknown,
): Promise<void> {
	const { worker, server, log, id, interaction } = context;
	let frame: Frame | undefined;
	try {
		frame = await openDocs(worker, server, docsId);
		const opened = frame;
		const { hasPassed } = await runSteps(log, {
			story: id,
			where: "docs",
			label: "docs page",
			frame: opened,
			steps: interaction.steps,
			scope: { area: `#anchor--${id}`, app: appOfStorybook },
			errors: async () => errorsOf(worker, opened),
		});
		if (hasPassed) {
			const since = await eventCount(opened);
			await worker.page.locator(`[data-item-id="${id}"]`).first().click();
			await waitForEvent(opened, { type: "storyRendered", id, since });
			await showControls(worker.page);
			const problems = await outcome(
				opened,
				{ arg: initial as Step["arg"] },
				canvas,
				{ page: worker.page, arg: interaction.arg },
			);
			if (problems.length > 0) {
				log.fail(
					"interactions",
					id,
					"docs",
					`the canvas opened from the docs page: ${problems.join(" | ")}`,
				);
			} else {
				log.pass(
					"interactions",
					id,
					"docs",
					`the canvas opened from the docs page shows ${interaction.arg} = ${String(initial)}`,
				);
			}
		}
	} catch (error) {
		log.fail("interactions", id, "docs", errorMessage(error));
	}

	log.fired += await firedIn(worker, frame);
}

function interactionJob(
	server: Server,
	entry: Entry,
	details: { docsId: string; interaction: Interaction; info: StoryInfo },
): Job {
	const { docsId, interaction, info } = details;
	const { id } = entry;
	return {
		check: "interactions",
		story: id,
		where: "canvas",
		async run(worker, log) {
			const context = { worker, server, log, id, interaction };
			// On the canvas, the panel follows each step.
			const frame = await openCanvas(worker, server, id);
			await showControls(worker.page);
			await runSteps(log, {
				story: id,
				where: "canvas",
				label: "canvas",
				frame,
				steps: interaction.steps,
				scope: canvas,
				panel: { page: worker.page, arg: interaction.arg },
				errors: async () => errorsOf(worker, frame),
			});
			log.fired += await firedIn(worker, frame);
			await afterPanelChange(context);
			await onDocsPage(context, docsId, info.initialArgs[interaction.arg]);
		},
	};
}

function docsJob(server: Server, entry: Entry, twins: Set<string>): Job {
	return {
		check: "renders",
		story: entry.id,
		where: "docs",
		async run(worker, log) {
			const frame = await openDocs(worker, server, entry.id);
			const errors = await errorsOf(worker, frame);
			if (errors.length === 0) {
				log.pass("renders", entry.id, "docs", "no errors");
			} else {
				log.fail("renders", entry.id, "docs", errors.join(" | "));
			}

			const anchors = await frame.$$eval("[id^='anchor--']", (nodes) =>
				nodes.map((node) => node.id.replace(/^anchor--/v, "")),
			);
			const shownTwins = anchors.filter((id) => twins.has(id));
			if (shownTwins.length > 0) {
				log.fail(
					"toolbar",
					entry.id,
					"docs",
					`phone twins on the docs page: ${shownTwins.join(", ")}`,
				);
			}

			log.fired += await firedIn(worker, frame);
		},
	};
}

function toolbarJob(server: Server, id: string): Job {
	return {
		check: "toolbar",
		story: id,
		where: "canvas",
		async run(worker, log) {
			await openCanvas(worker, server, id);
			await worker.page
				.getByRole("button", { name: /viewport/iv })
				.first()
				.click();
			const menu = await worker.page.locator("body").innerText();
			const missing = ["Phone", "Tablet", "Desktop"].filter(
				(name) => !menu.includes(name),
			);
			await worker.page.keyboard.press("Escape");
			if (missing.length === 0) {
				log.pass("toolbar", id, "canvas", "offers Phone, Tablet and Desktop");
			} else {
				log.fail(
					"toolbar",
					id,
					"canvas",
					`the viewport menu lacks ${missing.join(", ")}`,
				);
			}
		},
	};
}

async function withWorkers<T>(
	browser: Browser,
	init: string,
	work: (workers: Worker[]) => Promise<T>,
): Promise<T> {
	const workers = await Promise.all(
		Array.from({ length: workerCount }, async () => {
			const context = await newContext(browser, { width: 1600, height: 1000 });
			await context.addInitScript({ content: init });
			const page = await context.newPage();
			const worker: Worker = { page, errors: [] };
			page.on("pageerror", (error) => {
				worker.errors.push(`pageerror: ${errorMessage(error)}`);
			});
			page.on("console", (message) => {
				if (message.type() === "error") {
					worker.errors.push(
						`console: ${message.text().split("\n", 1)[0] ?? ""}`,
					);
				}
			});
			return worker;
		}),
	);
	try {
		return await work(workers);
	} finally {
		await Promise.all(
			workers.map(async (worker) => worker.page.context().close()),
		);
	}
}

async function runJobs(
	workers: Worker[],
	jobs: Job[],
): Promise<{ results: Result[]; fired: number }> {
	const logs: Log[] = [];
	const queue = [...jobs];
	await Promise.all(
		workers.map(async (worker) => {
			/* eslint-disable no-await-in-loop -- a worker runs one job at a time */
			for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
				const log = new Log();
				logs.push(log);
				try {
					await job.run(worker, log);
				} catch (error) {
					log.fail(job.check, job.story, job.where, errorMessage(error));
				}
			}
			/* eslint-enable no-await-in-loop */
		}),
	);
	return {
		results: logs.flatMap((log) => log.results),
		fired: logs.reduce((sum, log) => sum + log.fired, 0),
	};
}

/**
Reads every story's parameters once, from a single preview.
*/
async function catalog(
	worker: Worker,
	server: Server,
	stories: Entry[],
): Promise<Map<string, StoryInfo>> {
	const infos = new Map<string, StoryInfo>();
	const [first] = stories;
	if (first === undefined) {
		return infos;
	}

	const frame = await open(worker, server, `/story/${first.id}`);
	await waitForEvent(frame, { type: "storyRendered", id: first.id, since: 0 });
	for (const story of stories) {
		// eslint-disable-next-line no-await-in-loop -- one story store, read in turn
		infos.set(story.id, await storyInfo(frame, story.id));
	}

	return infos;
}

async function catalogOf(
	browser: Browser,
	server: Server,
	stories: Entry[],
): Promise<Map<string, StoryInfo>> {
	return withWorkers(browser, recordEvents, async ([worker]) => {
		if (worker === undefined) {
			throw new Error("No worker");
		}

		return catalog(worker, server, stories);
	});
}

function jobsFor(
	server: Server,
	planned: Plan,
	infos: Map<string, StoryInfo>,
): Job[] {
	const twins = new Set(
		[...infos]
			.filter(([, info]) => info.viewport === "phone")
			.map(([id]) => id),
	);
	const docsOf = (entry: Entry) =>
		planned.docs.find((docs) => docs.title === entry.title)?.id ??
		`${sanitize(entry.title)}--docs`;
	const jobs: Job[] = [];
	for (const entry of planned.stories) {
		const info = infos.get(entry.id);
		if (info === undefined) {
			continue;
		}

		jobs.push(storyJob(server, entry, info));
		if (entry.exportName === "Default" && info.controls.disable === false) {
			for (const name of info.controls.include ?? []) {
				jobs.push(controlJob(server, entry, name));
			}
		}

		const interaction = interactions[entry.id];
		if (interaction !== undefined) {
			jobs.push(
				interactionJob(server, entry, {
					docsId: docsOf(entry),
					interaction,
					info,
				}),
			);
		}
	}

	for (const entry of planned.docs) {
		jobs.push(docsJob(server, entry, twins));
	}

	const firstDefault = planned.stories.find(
		(entry) => entry.exportName === "Default",
	);
	if (firstDefault !== undefined) {
		jobs.push(toolbarJob(server, firstDefault.id));
	}

	return jobs;
}

/**
Marks the reference preview's "Default" section, which the Default story renders, if it has one.
*/
async function hasDefaultSection(page: Page): Promise<boolean> {
	return page.evaluate(() => {
		const section = [...document.querySelectorAll("#root section h2")]
			.find((heading) => heading.textContent.trim() === "Default")
			?.closest("section");
		section?.setAttribute("data-gl-default-section", "");
		return section !== undefined;
	});
}

/**
Replays each interaction entry on the reference's preview page, inside its "Default" section,
where the other sections stand open beside it as the other stories do on the docs page.
*/
async function qualify(browser: Browser, server: Server): Promise<Result[]> {
	await buildRuntimes("reference");
	const results: Result[] = [];
	const context = await newContext(browser, { width: 1280, height: 900 });
	/* eslint-disable no-await-in-loop -- one preview at a time */
	try {
		for (const [id, interaction] of Object.entries(interactions)) {
			const preview = previewOfStory(id);
			if (preview === undefined) {
				results.push({
					check: "interactions",
					story: id,
					where: "reference",
					ok: false,
					detail: "no component preview has this Default's id",
				});
				continue;
			}

			const page = await context.newPage();
			const errors: string[] = [];
			page.on("pageerror", (error) => {
				errors.push(`pageerror: ${errorMessage(error)}`);
			});
			page.on("console", (message) => {
				if (message.type() === "error") {
					errors.push(`console: ${message.text()}`);
				}
			});
			await page.goto(`${server.origin}${writePage(preview, "reference")}`, {
				waitUntil: "networkidle",
			});
			await waitForFonts(page);
			await settlePreview(page);
			if (await hasDefaultSection(page)) {
				const log = new Log();
				await runSteps(log, {
					story: id,
					where: "reference",
					label: preview.id,
					frame: page.mainFrame(),
					steps: interaction.steps,
					scope: { area: "[data-gl-default-section]", app: "#root" },
					errors: async () => errors.splice(0),
				});
				results.push(...log.results);
			} else {
				results.push({
					check: "interactions",
					story: id,
					where: "reference",
					ok: false,
					detail: `${preview.id} has no "Default" section`,
				});
			}

			await page.close();
		}
	} finally {
		await context.close();
	}
	/* eslint-enable no-await-in-loop */

	return results;
}

function print(results: Result[]): number {
	let failed = 0;
	for (const result of results) {
		if (!result.ok) {
			failed++;
		}

		console.log(
			`${result.ok ? "PASS" : "FAIL"}  ${result.check}  ${result.story} (${result.where})  ${result.detail}`,
		);
	}

	return failed;
}

const keyOf = (result: Result) =>
	`${result.check} ${result.story} ${result.where}`;

const componentOf = (id: string) => id.replace(/--[^\-]+$/v, "--");

/**
A planted defect is caught when its script acted, its own check failed on its story and frame,
nothing failed elsewhere that the clean run passed, and the control story stayed clean.
*/
function verdict(
	mutation: Mutation,
	control: string,
	run: { results: Result[]; fired: number },
	cleanFailures: Set<string>,
): { caught?: Result; problems: string[] } {
	const failures = run.results.filter((result) => !result.ok);
	const caught = failures.find(
		(result) =>
			result.check === mutation.check &&
			result.story === mutation.story &&
			result.where === mutation.where,
	);
	const stray = failures.filter(
		(result) =>
			!cleanFailures.has(keyOf(result)) &&
			!result.story.startsWith(componentOf(mutation.story)),
	);
	const controlFailures = failures.filter((result) =>
		result.story.startsWith(componentOf(control)),
	);
	return {
		caught,
		problems: [
			...(run.fired > 0 ? [] : ["the planted script never acted"]),
			...(caught === undefined
				? [
						`no ${mutation.check} failure on ${mutation.story} (${mutation.where})`,
					]
				: []),
			...stray.map(
				(result) => `stray failure: ${keyOf(result)}: ${result.detail}`,
			),
			...controlFailures.map(
				(result) => `control story failed: ${keyOf(result)}: ${result.detail}`,
			),
		],
	};
}

async function selfTest(
	browser: Browser,
	server: Server,
	phase: number,
): Promise<number> {
	const qualification = await qualify(browser, server);
	console.log("Interaction entries on the reference's preview pages:");
	let failed = print(qualification);

	const controlOf = (mutation: Mutation) =>
		mutation.story === "inputs-button--default"
			? "navigation-tabs--default"
			: "inputs-button--default";
	const ids = [
		...new Set(
			mutations.flatMap((mutation) => [mutation.story, controlOf(mutation)]),
		),
	];
	const planned = plan(phase, ids);
	const infos = await catalogOf(browser, server, planned.stories);
	const subset = (stories: string[]): Plan => ({
		stories: planned.stories.filter((entry) => stories.includes(entry.id)),
		docs: planned.docs.filter((docs) =>
			stories.some((id) => id.startsWith(prefixOfDocs(docs.id))),
		),
		scopeResults: [],
	});
	const clean = await withWorkers(browser, recordEvents, async (workers) =>
		runJobs(workers, jobsFor(server, subset(ids), infos)),
	);
	const cleanFailures = new Set(
		clean.results.filter((result) => !result.ok).map((result) => keyOf(result)),
	);
	console.log(
		`\nClean run on the self-test's stories: ${clean.results.length - cleanFailures.size} of ${clean.results.length} checks pass.`,
	);
	failed += print(clean.results.filter((result) => !result.ok));

	console.log("\nPlanted defects:");
	/* eslint-disable no-await-in-loop -- one planted defect at a time */
	for (const mutation of mutations) {
		const control = controlOf(mutation);
		const script = `${recordEvents}\n(() => { const TARGET = ${JSON.stringify(mutation.story)}; ${mutation.script} })();`;
		const run = await withWorkers(browser, script, async (workers) =>
			runJobs(
				workers,
				jobsFor(server, subset([mutation.story, control]), infos),
			),
		);
		const { caught, problems } = verdict(mutation, control, run, cleanFailures);
		if (caught !== undefined && problems.length === 0) {
			console.log(`CAUGHT  ${mutation.name}: ${caught.detail}`);
		} else {
			failed++;
			console.log(`MISSED  ${mutation.name}: ${problems.join(" | ")}`);
		}
	}
	/* eslint-enable no-await-in-loop */

	return failed;
}

async function gate(
	browser: Browser,
	server: Server,
	phase: number,
	only: string[] | undefined,
): Promise<number> {
	const planned = plan(phase, only);
	const infos = await catalogOf(browser, server, planned.stories);
	const started = Date.now();
	const { results } = await withWorkers(
		browser,
		recordEvents,
		async (workers) => runJobs(workers, jobsFor(server, planned, infos)),
	);
	const all = [...planned.scopeResults, ...results];
	fs.rmSync(reportDirectory, { recursive: true, force: true });
	fs.mkdirSync(reportDirectory, { recursive: true });
	fs.writeFileSync(
		path.join(reportDirectory, "results.json"),
		`${JSON.stringify(all, undefined, "\t")}\n`,
	);
	const failed = print(all);
	const seconds = Math.round((Date.now() - started) / 1000);
	console.log(
		`\nStorybook gate at phase ${phase}: ${all.length - failed} of ${all.length} checks pass, ${planned.stories.length} stories and ${planned.docs.length} docs pages, in ${seconds}s.`,
	);
	return failed;
}

async function main(): Promise<number> {
	const phaseArgument = argument("--phase");
	const phase =
		phaseArgument === undefined ? phaseScope().phase : Number(phaseArgument);
	const server = await startServer();
	const browser = await chromium.launch();
	try {
		if (process.argv.includes("--qualify")) {
			const failed = print(await qualify(browser, server));
			return failed === 0 ? 0 : 1;
		}

		if (process.argv.includes("--self")) {
			const failed = await selfTest(browser, server, phase);
			console.log(
				failed === 0
					? "\nThe self-test passes."
					: `\nThe self-test fails: ${failed} problem${failed === 1 ? "" : "s"}.`,
			);
			return failed === 0 ? 0 : 1;
		}

		const failed = await gate(
			browser,
			server,
			phase,
			argument("--only")?.split(","),
		);
		return failed === 0 ? 0 : 1;
	} finally {
		await browser.close();
		await server.close();
	}
}

if (import.meta.main) {
	process.exitCode = await main();
}
