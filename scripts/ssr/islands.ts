/**
The delayed-hydration gate (docs/package-plan.md, acceptance suite item 2). The portfolio
hydrates its interactive sections late, as islands, so for a while a visitor has only their
server HTML. Each island in tests/ssr/fixtures/islands.tsx, at 390px and at 1280px:

1. renders to HTML in Node, with no window or document;
2. loads with JavaScript on but not yet hydrated, as a late island is, and must already show
   its chosen tab or open rows and hide the rest, wire its ARIA, and give the keyboard the tab
   stop its README documents;
3. hydrates once those checks are done, with no error, no text moving and focus kept;
4. then answers keys and clicks as its README documents.

Usage:
  node scripts/ssr/islands.ts                     the gate, on the package, for the phase in scope
  node scripts/ssr/islands.ts --target reference  the same checks on the reference
  node scripts/ssr/islands.ts --self              proves the checks on the reference: each defect
                                                  planted in \`mutations\` must add its problem
  --phase N                                       overrides the phase
*/
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { build, type Plugin } from "esbuild";
import { chromium, type Browser, type Locator, type Page } from "playwright";
import {
	compareLayouts,
	newContext,
	openPage,
	textPositions,
	viewports,
} from "../lib/capture.ts";
import { startServer, type Server } from "../lib/pages.ts";
import { currentPhase } from "../lib/phases.ts";
import { root } from "../lib/reference.ts";
import { buildRuntimes, reactGlobals } from "../runtimes.ts";

type Target = "package" | "reference";

type Width = keyof typeof viewports;

/**
One island's checks. `before` runs on the server HTML, `after` once it has hydrated; both
return problems. `focus` names the element `before` leaves focused, which hydration must keep.
*/
type Island = {
	phase: number;
	before: (page: Page, width: Width) => Promise<string[]>;
	focus: (page: Page) => Locator;
	after: (page: Page, width: Width) => Promise<string[]>;
};

type Outcome = { island: string; width: Width; problems: string[] };

const nodeRequire =
	'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);';

const work = path.join(root, ".cache/islands");
const fixture = path.join(root, "tests/ssr/fixtures/islands.tsx");
const entries: Record<Target, string> = {
	package: path.join(root, "src/index.ts"),
	reference: path.join(root, ".cache/reference/src/index.ts"),
};

// The filter runs in Go's regexp engine inside esbuild, which rejects JavaScript flags.
// eslint-disable-next-line require-unicode-regexp
const uiImport = /^#ui$/;

/**
Points the fixture's "#ui" at the target, as vitest.config.ts does for the behaviour specs.
*/
function ui(target: Target): Plugin {
	return {
		name: "ui",
		setup(builder) {
			builder.onResolve({ filter: uiImport }, () => ({
				path: entries[target],
			}));
		},
	};
}

/**
Bundles the fixture for Node, to render each island, and for the browser, to hydrate it later.
Both wrap the island with Hydrated, which renders nothing and flags the end of hydration.
*/
async function bundle(target: Target): Promise<{ node: string }> {
	fs.mkdirSync(work, { recursive: true });
	const head = [
		`import { islands } from ${JSON.stringify(fixture)};`,
		'import { createElement, Fragment, useEffect } from "react";',
		"function Hydrated() {",
		"\tuseEffect(() => { globalThis.__glHydrated = true; }, []);",
		"\treturn null;",
		"}",
		"const tree = (name) => createElement(Fragment, null, createElement(islands[name]), createElement(Hydrated));",
	];
	const nodeEntry = path.join(work, "islands.node.tsx");
	fs.writeFileSync(
		nodeEntry,
		[
			...head,
			'import { renderToString } from "react-dom/server";',
			"export const names = Object.keys(islands);",
			"export const render = (name) => renderToString(tree(name));",
		].join("\n"),
	);
	const browserEntry = path.join(work, "islands.browser.tsx");
	fs.writeFileSync(
		browserEntry,
		[
			...head,
			'import { hydrateRoot } from "react-dom/client";',
			"window.__glHydrationErrors = [];",
			"window.__glHydrate = (name) => hydrateRoot(document.getElementById('root'), tree(name), {",
			"\tonRecoverableError: (error) => window.__glHydrationErrors.push(String(error?.message ?? error)),",
			"});",
		].join("\n"),
	);
	const shared = {
		bundle: true,
		jsx: "automatic" as const,
		loader: { ".css": "empty" as const },
		logLevel: "warning" as const,
		tsconfigRaw: { compilerOptions: { jsx: "react-jsx" as const } },
		nodePaths: [path.join(root, "node_modules")],
	};
	const node = path.join(work, `islands.${target}.node.mjs`);
	await build({
		...shared,
		entryPoints: [nodeEntry],
		outfile: node,
		platform: "node",
		format: "esm",
		external: ["react", "react-dom", "mermaid"],
		plugins: [ui(target)],
		// Base UI's CommonJS dependencies (use-sync-external-store) require React, which stays
		// external; ESM output has no require of its own, so the bundle gets Node's.
		banner: { js: nodeRequire },
	});
	await build({
		...shared,
		entryPoints: [browserEntry],
		outfile: path.join(work, `islands.${target}.browser.js`),
		platform: "browser",
		format: "iife",
		define: { "process.env.NODE_ENV": '"production"' },
		external: ["mermaid"],
		plugins: [ui(target), reactGlobals],
	});
	return { node };
}

/**
Whether a reader can see each text: some text node in #root with exactly these words, whose
box isn't hidden by display, visibility or opacity, nor clipped away by an ancestor's overflow
(a collapsed row is often a zero-height box that clips its content).
*/
async function seen(page: Page, texts: string[]): Promise<boolean[]> {
	return page.evaluate((wanted) => {
		const isShown = (node: Text): boolean => {
			const range = document.createRange();
			range.selectNodeContents(node);
			const box = range.getBoundingClientRect();
			let { left, top, right, bottom } = box;
			if (box.width === 0 || box.height === 0) {
				return false;
			}

			for (
				let element = node.parentElement;
				element !== null;
				element = element.parentElement
			) {
				const style = getComputedStyle(element);
				if (
					style.display === "none" ||
					style.visibility === "hidden" ||
					style.visibility === "collapse" ||
					Number(style.opacity) === 0
				) {
					return false;
				}

				if (style.overflowX === "visible" && style.overflowY === "visible") {
					continue;
				}

				const clip = element.getBoundingClientRect();
				left = Math.max(left, clip.left);
				top = Math.max(top, clip.top);
				right = Math.min(right, clip.right);
				bottom = Math.min(bottom, clip.bottom);
				if (right - left < 1 || bottom - top < 1) {
					return false;
				}
			}

			return true;
		};

		const container = document.querySelector("#root");
		const nodes: Text[] = [];
		if (container !== null) {
			const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
			for (
				let node = walker.nextNode();
				node !== null;
				node = walker.nextNode()
			) {
				nodes.push(node as Text);
			}
		}

		const normal = (text: string) => text.replaceAll(/\s+/gv, " ").trim();
		return wanted.map((text) =>
			nodes.some(
				(node) => normal(node.textContent ?? "") === text && isShown(node),
			),
		);
	}, texts);
}

/**
Problems with what a reader sees: each text in `shown` must be seen, each in `hidden` not.
*/
async function expectSeen(
	page: Page,
	when: string,
	{ shown = [], hidden = [] }: { shown?: string[]; hidden?: string[] },
): Promise<string[]> {
	const [seenShown, seenHidden] = await Promise.all([
		seen(page, shown),
		seen(page, hidden),
	]);
	return [
		...shown
			.filter((_, index) => !seenShown[index])
			.map((text) => `${when}: "${text}" isn't visible`),
		...hidden
			.filter((_, index) => seenHidden[index])
			.map((text) => `${when}: "${text}" is visible`),
	];
}

/**
Waits up to 3s for a condition that a transition may delay, and returns the last problems.
*/
async function eventually(
	page: Page,
	read: () => Promise<string[]>,
): Promise<string[]> {
	let problems = await read();
	/* eslint-disable no-await-in-loop -- each try reads the page after the last */
	for (let tries = 0; problems.length > 0 && tries < 60; tries++) {
		await page.waitForTimeout(50);
		problems = await read();
	}
	/* eslint-enable no-await-in-loop */

	return problems;
}

async function isFocused(locator: Locator): Promise<boolean> {
	return (await locator.count()) === 1
		? locator.evaluate((element) => element === document.activeElement)
		: false;
}

/**
Tab from the top of the page, as a keyboard user arriving at the island does.
*/
async function tabIn(page: Page): Promise<void> {
	await page.evaluate(() => {
		const active = document.activeElement as HTMLElement | null;
		if (active !== null) {
			active.blur();
		}

		window.scrollTo(0, 0);
	});
	await page.keyboard.press("Tab");
}

type TabsSpec = {
	list: string;
	selected: string;
	panels: Record<string, string>;
	/**
	The last enabled tab, which End selects.
	*/
	last: string;
};

/**
A Tabs island (Tabs README: "What you provide" and "Keyboard").
*/
function tabsIsland({ list, selected, panels, last }: TabsSpec): Island {
	const tablist = (page: Page) =>
		page.getByRole("tablist", { name: list, exact: true });
	const tab = (page: Page, name: string) =>
		tablist(page).getByRole("tab", { name, exact: true });
	const showing = (name: string) => ({
		shown: [panels[name] ?? name],
		hidden: Object.entries(panels)
			.filter(([label]) => label !== name)
			.map(([, text]) => text),
	});
	const selection = async (page: Page, name: string, when: string) => {
		const chosen = tablist(page).getByRole("tab", { selected: true });
		const count = await chosen.count();
		const isRight = count === 1 && (await tab(page, name).count()) === 1;
		const texts = await chosen.allInnerTexts();
		const names = count === 0 ? "none" : texts.join(", ");
		return isRight &&
			(await tab(page, name).getAttribute("aria-selected")) === "true"
			? []
			: [`${when}: the selected tab is ${names}, not ${name}`];
	};

	return {
		phase: 1,
		async before(page) {
			const problems = [
				...(await selection(page, selected, "server HTML")),
				...(await expectSeen(page, "server HTML", showing(selected))),
			];
			// "Each tab gets aria-controls pointing at its panel, and each panel gets
			// aria-labelledby pointing back."
			const wiring = await tablist(page)
				.getByRole("tab")
				.evaluateAll((tabs) =>
					tabs.flatMap((element) => {
						const label = element.textContent?.trim() ?? "";
						const panelId = element.getAttribute("aria-controls");
						const panel =
							panelId === null
								? null
								: // React's ids hold characters a selector would need escaped.
									// eslint-disable-next-line unicorn/prefer-query-selector
									document.getElementById(panelId);
						if (panel?.getAttribute("role") !== "tabpanel") {
							return [`the tab ${label} controls no tab panel`];
						}

						const labelledBy =
							panel.getAttribute("aria-labelledby")?.split(" ") ?? [];
						return element.id !== "" && labelledBy.includes(element.id)
							? []
							: [`the panel of tab ${label} isn't labelled by it`];
					}),
				);
			problems.push(...wiring.map((problem) => `server HTML: ${problem}`));
			// "Tab moves into the tab list, to the selected tab, and Tab again moves into the panel."
			await tabIn(page);
			if (!(await isFocused(tab(page, selected)))) {
				problems.push(
					`server HTML: Tab doesn't reach the selected tab, ${selected}`,
				);
			}

			// The panel is found from its label, so this holds apart from the wiring above.
			await page.keyboard.press("Tab");
			const isInPanel = await tab(page, selected).evaluate(
				(element) =>
					element.id !== "" &&
					[...document.querySelectorAll('[role="tabpanel"]')].some(
						(panel) =>
							(panel.getAttribute("aria-labelledby") ?? "")
								.split(" ")
								.includes(element.id) && panel.contains(document.activeElement),
					),
			);
			if (!isInPanel) {
				problems.push("server HTML: Tab again doesn't move into the panel");
			}

			await page.keyboard.press("Shift+Tab");
			return problems;
		},
		focus: (page) => tab(page, selected),
		async after(page) {
			// "Home and End select the first and last tab. Disabled tabs are skipped."
			await page.keyboard.press("End");
			const problems = await eventually(page, async () => [
				...(await selection(page, last, "after End")),
				...(await expectSeen(page, "after End", showing(last))),
			]);
			if (!(await isFocused(tab(page, last)))) {
				problems.push(`after End: focus isn't on ${last}`);
			}

			const first = Object.keys(panels)[0] ?? selected;
			await tab(page, first).click();
			problems.push(
				...(await eventually(page, async () => [
					...(await selection(page, first, `after a click on ${first}`)),
					...(await expectSeen(
						page,
						`after a click on ${first}`,
						showing(first),
					)),
				])),
			);
			return problems;
		},
	};
}

type Row = {
	title: string;
	details: string;
	expanded?: boolean;
	disabled?: boolean;
};

/**
A career list of Accordion rows (Accordion README: "Props" and "Keyboard").
*/
function accordionIsland(rows: Row[]): Island {
	const summary = (page: Page, title: string) =>
		page
			.getByRole("heading", { level: 3 })
			.filter({ hasText: title })
			.getByRole("button");
	const rowProblems = async (
		page: Page,
		row: Row,
		isExpanded: boolean,
		when: string,
	) =>
		(await summary(page, row.title).getAttribute("aria-expanded")) ===
		String(isExpanded)
			? expectSeen(page, when, {
					[isExpanded ? "shown" : "hidden"]: [row.details],
				})
			: [`${when}: ${row.title} isn't ${isExpanded ? "open" : "closed"}`];
	const [first, second] = rows as [Row, Row];

	return {
		phase: 1,
		async before(page) {
			const problems: string[] = [];
			for (const row of rows) {
				const button = summary(page, row.title);
				/* eslint-disable no-await-in-loop -- one row after the other */
				if ((await button.count()) === 1) {
					problems.push(
						...(await rowProblems(
							page,
							row,
							row.expanded === true,
							"server HTML",
						)),
					);
					if (row.disabled === true && !(await button.isDisabled())) {
						problems.push(`server HTML: ${row.title} isn't disabled`);
					}
				} else {
					problems.push(
						`server HTML: no button in a level 3 heading for ${row.title}`,
					);
				}
				/* eslint-enable no-await-in-loop */
			}

			// "Tab reaches each summary or pane button."
			await tabIn(page);
			if (!(await isFocused(summary(page, first.title)))) {
				problems.push(
					`server HTML: Tab doesn't reach the first summary, ${first.title}`,
				);
			}

			return problems;
		},
		focus: (page) => summary(page, first.title),
		async after(page) {
			// "Enter and Space open and close it."
			await page.keyboard.press("Enter");
			const problems = await eventually(page, async () =>
				rowProblems(page, first, first.expanded !== true, "after Enter"),
			);
			// "Up and Down move between the summaries of one list."
			await page.keyboard.press("ArrowDown");
			if (!(await isFocused(summary(page, second.title)))) {
				problems.push(`after ArrowDown: focus isn't on ${second.title}`);
			}

			await page.keyboard.press("Space");
			problems.push(
				...(await eventually(page, async () =>
					rowProblems(page, second, second.expanded !== true, "after Space"),
				)),
			);
			return problems;
		},
	};
}

type Pane = { title: string; text: string; chips: string[]; open?: boolean };

/**
A PaneAccordion (Accordion README: "PaneAccordion" rows and "Keyboard").
*/
function panesIsland(panes: Pane[]): Island {
	const button = (page: Page, title: string) =>
		page.getByRole("button", { name: title, exact: true });
	const openProblems = async (page: Page, pane: Pane, when: string) =>
		(await button(page, pane.title).getAttribute("aria-expanded")) === "true"
			? expectSeen(page, when, { shown: pane.chips })
			: [`${when}: ${pane.title} isn't open`];

	return {
		phase: 1,
		async before(page) {
			const problems = await expectSeen(page, "server HTML", {
				shown: panes.map((pane) => pane.text),
			});
			for (const pane of panes) {
				/* eslint-disable no-await-in-loop -- one pane after the other */
				const expanded = await button(page, pane.title).getAttribute(
					"aria-expanded",
				);
				if (expanded !== String(pane.open === true)) {
					problems.push(
						`server HTML: ${pane.title} has aria-expanded ${expanded}`,
					);
				}

				if (pane.open === true) {
					problems.push(...(await openProblems(page, pane, "server HTML")));
				}
				/* eslint-enable no-await-in-loop */
			}

			await tabIn(page);
			return problems;
		},
		focus: (page) => button(page, panes[0].title),
		async after(page) {
			const closed = panes.find((pane) => pane.open !== true)!;
			await button(page, closed.title).click();
			return eventually(page, async () =>
				openProblems(page, closed, `after a press on ${closed.title}`),
			);
		},
	};
}

const islands: Record<string, Island> = {
	/* eslint-disable @typescript-eslint/naming-convention -- the keys are the fixture's islands */
	ClientWork: tabsIsland({
		list: "Choose a project",
		selected: "Intive",
		panels: {
			"Limber Health": "Training PDFs. A shorter wait.",
			Intive: "CMS content, ready for mobile.",
			SunDevs: "A fitness app. Built together.",
		},
		last: "SunDevs",
	}),
	ProjectTabs: tabsIsland({
		list: "VSebCode",
		selected: "Overview",
		panels: {
			Overview: "A VS Code fork with a review gate before every agent edit.",
			"Review gate": "Each change waits for an approval in the editor.",
			Stack: "TypeScript, Electron and the VS Code extension API.",
			Releases: "No public release yet.",
		},
		last: "Stack",
	}),
	Career: accordionIsland([
		{
			title: "EPAM",
			details: "Frontend work for a client in financial services.",
			expanded: true,
		},
		{
			title: "Intive",
			details: "Backend and mobile work across a CMS and its apps.",
		},
		{
			title: "Résumé as a PDF",
			details: "The PDF comes with the next release.",
			disabled: true,
		},
	]),
	Capabilities: panesIsland([
		{
			title: "Backend",
			text: "Node.js and TypeScript services with Clean Architecture boundaries.",
			chips: ["Node.js", "NestJS"],
			open: true,
		},
		{
			title: "Frontend & mobile",
			text: "React and React Native apps, with feature flags.",
			chips: ["React", "React Native"],
		},
		{
			title: "Hardware",
			text: "Rust on embedded targets, plus CAD and carbon fiber.",
			chips: ["Rust", "Arduino"],
		},
	]),
	/* eslint-enable @typescript-eslint/naming-convention */
};

/**
A defect the self-test plants on the reference, and a problem the checks must then report that
they don't report without it.
*/
type Mutation = {
	name: string;
	island: string;
	expect: string;
	/**
	CSS after the stylesheet.
	*/
	css?: string;
	/**
	Rewrites the server HTML.
	*/
	html?: (html: string) => string;
	/**
	Never hydrates: the checks after hydration then meet a dead island.
	*/
	isInert?: boolean;
	/**
	Runs right after hydration, as a layout chosen in JavaScript would.
	*/
	afterHydration?: (page: Page) => Promise<void>;
};

const mutations: Mutation[] = [
	{
		name: "hidden panel",
		island: "ClientWork",
		css: '[role="tabpanel"] { opacity: 0 }',
		expect: '"CMS content, ready for mobile." isn\'t visible',
	},
	{
		name: "no tab stop",
		island: "ProjectTabs",
		html: (html) => html.replaceAll('tabindex="0"', 'tabindex="-1"'),
		expect: "Tab doesn't reach the selected tab",
	},
	{
		name: "open row clipped",
		island: "Career",
		css: ".gl-accordion-surface > * > :last-child { height: 0; overflow: hidden }",
		expect:
			'"Frontend work for a client in financial services." isn\'t visible',
	},
	{
		name: "never hydrates",
		island: "Career",
		isInert: true,
		expect: "after Enter: EPAM isn't closed",
	},
	{
		name: "moves on hydration",
		island: "Capabilities",
		async afterHydration(page) {
			await page.addStyleTag({ content: "#root { padding-top: 12px }" });
		},
		expect: "hydration moves",
	},
];

function writeShell(
	name: string,
	target: Target,
	html: string,
	mutation?: Mutation,
): string {
	const suffix =
		mutation === undefined ? "" : `.${mutation.name.replaceAll(" ", "-")}`;
	const file = path.join(work, `${name}.${target}${suffix}.html`);
	fs.writeFileSync(
		file,
		[
			'<!doctype html><html lang="en"><head><meta charset="utf-8">',
			'<meta name="viewport" content="width=device-width, initial-scale=1">',
			`<link rel="stylesheet" href="/runtimes/${target}.css">`,
			...(mutation?.css === undefined
				? []
				: [`<style>${mutation.css}</style>`]),
			"</head><body>",
			`<div id="root">${mutation?.html?.(html) ?? html}</div>`,
			'<script src="/runtimes/react.js"></script>',
			`<script src="/islands/islands.${target}.browser.js"></script>`,
			"</body></html>",
		].join("\n"),
	);
	return `/islands/${path.basename(file)}`;
}

async function check(
	browser: Browser,
	server: Server,
	{
		name,
		url,
		island,
		mutation,
	}: { name: string; url: string; island: Island; mutation?: Mutation },
): Promise<Outcome[]> {
	const outcomes: Outcome[] = [];
	/* eslint-disable no-await-in-loop -- one width after the other keeps timing steady */
	for (const width of ["phone", "desktop"] as const) {
		const context = await newContext(browser, viewports[width]);
		const { page, errors } = await openPage(context, `${server.origin}${url}`);
		const problems: string[] = [];
		try {
			await page.evaluate(async () => document.fonts.ready);
			problems.push(...(await island.before(page, width)));
			const isFocusedBefore = await isFocused(island.focus(page));
			const before = await textPositions(page);
			await page.evaluate(
				({ islandName, isInert }) => {
					const shell = globalThis as unknown as {
						__glHydrate: (name: string) => void;
						__glHydrated?: boolean;
					};
					if (isInert) {
						shell.__glHydrated = true;
					} else {
						shell.__glHydrate(islandName);
					}
				},
				{ islandName: name, isInert: mutation?.isInert === true },
			);
			await page.waitForFunction(
				() =>
					(globalThis as unknown as { __glHydrated?: boolean }).__glHydrated ===
					true,
				undefined,
				{ timeout: 10_000 },
			);
			await page.evaluate(
				async () =>
					new Promise((resolve) => {
						requestAnimationFrame(() => {
							requestAnimationFrame(resolve);
						});
					}),
			);
			await mutation?.afterHydration?.(page);
			const recoverable = await page.evaluate(
				() =>
					(globalThis as unknown as { __glHydrationErrors?: string[] })
						.__glHydrationErrors ?? [],
			);
			problems.push(
				...recoverable.map(
					(error) => `hydration: ${error.split("\n", 1)[0] ?? ""}`,
				),
			);
			const { moved, changed } = compareLayouts(
				before,
				await textPositions(page),
			);
			if (moved.length > 0) {
				problems.push(
					`hydration moves ${moved.length} text(s), e.g. "${moved.slice(0, 3).join('", "')}"`,
				);
			}

			if (changed) {
				problems.push("hydration changes the texts");
			}

			if (isFocusedBefore && !(await isFocused(island.focus(page)))) {
				problems.push("hydration loses the focus");
			}

			problems.push(...(await island.after(page, width)));
		} catch (error) {
			problems.push(
				`check failed: ${(error instanceof Error ? error.message : String(error)).split("\n", 1)[0] ?? ""}`,
			);
		}

		problems.push(...errors.map((error) => `page: ${error}`));
		await context.close();
		outcomes.push({ island: name, width, problems });
	}
	/* eslint-enable no-await-in-loop */

	return outcomes;
}

function argument(name: string): string | undefined {
	const at = process.argv.indexOf(name);
	return at === -1 ? undefined : process.argv[at + 1];
}

function print(outcomes: Outcome[], label = ""): void {
	for (const outcome of outcomes) {
		console.log(
			`${outcome.problems.length === 0 ? "pass" : "FAIL"}  ${outcome.island}${label} at ${outcome.width}${outcome.problems.length > 0 ? ` — ${outcome.problems.join("; ")}` : ""}`,
		);
	}
}

async function main(): Promise<number> {
	const isSelfTest = process.argv.includes("--self");
	const target = isSelfTest
		? "reference"
		: ((argument("--target") ?? "package") as Target);
	const phaseArgument = argument("--phase");
	const phase =
		phaseArgument === undefined ? currentPhase() : Number(phaseArgument);
	const inScope = Object.entries(islands).filter(
		([, island]) => isSelfTest || island.phase <= phase,
	);
	if (inScope.length === 0) {
		console.log(`islands, phase ${phase}: none in scope`);
		return 0;
	}

	await buildRuntimes(target);
	fs.rmSync(work, { recursive: true, force: true });
	const bundles = await bundle(target);
	const compiled = (await import(pathToFileURL(bundles.node).href)) as {
		render: (name: string) => string;
	};
	const server = await startServer();
	const browser = await chromium.launch();
	const outcomes: Outcome[] = [];
	const planted: Array<{ mutation: Mutation; outcomes: Outcome[] }> = [];
	try {
		/* eslint-disable no-await-in-loop -- one island after the other keeps timing steady */
		for (const [name, island] of inScope) {
			const html = compiled.render(name);
			outcomes.push(
				...(await check(browser, server, {
					name,
					url: writeShell(name, target, html),
					island,
				})),
			);
			for (const mutation of isSelfTest
				? mutations.filter((mutation) => mutation.island === name)
				: []) {
				planted.push({
					mutation,
					outcomes: await check(browser, server, {
						name,
						url: writeShell(name, target, html, mutation),
						island,
						mutation,
					}),
				});
			}
		}
		/* eslint-enable no-await-in-loop */
	} finally {
		await browser.close();
		await server.close();
	}

	print(outcomes);
	if (isSelfTest) {
		// A planted defect counts as caught at a width when it adds its expected problem there.
		const hasReported = (list: Outcome[], width: Width, expected: string) =>
			list.some(
				(outcome) =>
					outcome.width === width &&
					outcome.problems.some((problem) => problem.includes(expected)),
			);
		const isCaught = (mutation: Mutation, mutated: Outcome[], width: Width) =>
			hasReported(mutated, width, mutation.expect) &&
			!hasReported(
				outcomes.filter((outcome) => outcome.island === mutation.island),
				width,
				mutation.expect,
			);
		const missed = planted.flatMap(({ mutation, outcomes: mutated }) =>
			(["phone", "desktop"] as const)
				.filter((width) => !isCaught(mutation, mutated, width))
				.map(
					(width) =>
						`${mutation.name} at ${width}: expected "${mutation.expect}"`,
				),
		);
		for (const { mutation, outcomes: mutated } of planted) {
			print(mutated, ` [${mutation.name}]`);
		}

		for (const line of missed) {
			console.log(`MISSED  ${line}`);
		}

		const total = planted.length * 2;
		console.log(
			`islands self-test: ${total - missed.length} of ${total} planted defects caught`,
		);
		return missed.length === 0 && planted.length === mutations.length ? 0 : 1;
	}

	const failed = outcomes.filter((outcome) => outcome.problems.length > 0);
	console.log(
		`islands, ${target}, phase ${phase}: ${outcomes.length - failed.length} of ${outcomes.length} checks pass`,
	);
	return failed.length === 0 ? 0 : 1;
}

process.exitCode = await main();
