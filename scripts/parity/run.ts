/**
The parity gate (docs/package-plan.md, acceptance suite item 1). Every preview in scope runs
unchanged on two runtimes, the reference and the package, on the same React 19 production
build. Their frozen screenshots are compared section by section, and the opened states in
tests/parity/states.ts are compared too.

A preview fails when the package page logs an error, its size differs from the reference
page, or a region has more differing pixels than its budget (tests/parity/thresholds.json).
The report, with the three images per preview, goes to reports/parity/.

Usage:
  node scripts/parity/run.ts             the gate, for the phase in scope
  node scripts/parity/run.ts --self      the reference against itself, every preview, at rest
                                         and in the opened states
  node scripts/parity/run.ts --mutate    proves planted defects fail the gate
  --only components/Button,sections/Hero  limits the previews
  --phase N                               overrides the phase (as BLUE_GLASS_PHASE does)
*/
import type { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium, type Browser, type Page } from "playwright";
import {
	newContext,
	openPage,
	regions,
	screenshot,
	settle,
} from "../lib/capture.ts";
import { diffImages, type RegionDiff } from "../lib/diff.ts";
import {
	startServer,
	writePage,
	type Runtime,
	type Server,
} from "../lib/pages.ts";
import { scope } from "../lib/phases.ts";
import { previews, root, type Preview } from "../lib/reference.ts";
import { buildRuntimes } from "../runtimes.ts";
import {
	selfTestStates,
	states,
	type Action,
	type State,
} from "../../tests/parity/states.ts";

type Budget = { regionPixels: number; sizeTolerance: number };

type Thresholds = {
	default: Budget;
	previews: Record<string, Partial<Budget> & { reason: string }>;
};

type Capture = { png: Buffer; errors: string[] };

type Result = {
	id: string;
	state: string;
	passed: boolean;
	problems: string[];
	referenceErrors: string[];
	regions: RegionDiff[];
	size: { reference: string; candidate: string };
	images: string;
};

type Mode = "gate" | "self" | "mutate";

const reportDirectory = path.join(root, "reports/parity");

function argument(name: string): string | undefined {
	const at = process.argv.indexOf(name);
	return at === -1 ? undefined : process.argv[at + 1];
}

function readThresholds(): Thresholds {
	return JSON.parse(
		fs.readFileSync(path.join(root, "tests/parity/thresholds.json"), "utf8"),
	) as Thresholds;
}

function budgetFor(id: string, thresholds: Thresholds): Budget {
	return { ...thresholds.default, ...thresholds.previews[id] };
}

async function perform(page: Page, actions: Action[]): Promise<void> {
	/* eslint-disable no-await-in-loop -- a state's actions must run in order */
	for (const action of actions) {
		if ("click" in action) {
			await page.locator(action.click).click();
		} else if ("hover" in action) {
			await page.locator(action.hover).hover();
		} else if ("focus" in action) {
			await page.locator(action.focus).focus();
		} else if ("press" in action) {
			await page.keyboard.press(action.press);
		} else {
			await page.waitForTimeout(action.wait);
		}
	}
	/* eslint-enable no-await-in-loop */
}

async function capture(
	browser: Browser,
	server: Server,
	url: string,
	state: State | undefined,
): Promise<Capture & { page: Page; close: () => Promise<void> }> {
	const context = await newContext(browser);
	const { page, errors } = await openPage(context, `${server.origin}${url}`);
	await settle(page);
	if (state !== undefined) {
		await perform(page, state.actions);
		await settle(page);
	}

	const png = await screenshot(page);
	return {
		png,
		errors,
		page,
		async close() {
			await context.close();
		},
	};
}

type Comparison = {
	preview: Preview;
	candidate: Runtime;
	css?: string;
	state?: State;
	label?: string;
};

/**
A comparison that can't run (an action fails, a page crashes) fails instead of stopping the run.
*/
async function compareSafely(
	browser: Browser,
	server: Server,
	thresholds: Thresholds,
	comparison: Comparison,
): Promise<Result> {
	try {
		return await compare(browser, server, thresholds, comparison);
	} catch (error) {
		return {
			id: comparison.preview.id,
			state: comparison.label ?? comparison.state?.name ?? "rest",
			passed: false,
			problems: [
				`harness: ${error instanceof Error ? (error.message.split("\n", 1)[0] ?? "") : String(error)}`,
			],
			referenceErrors: [],
			regions: [],
			size: { reference: "", candidate: "" },
			images: "",
		};
	}
}

async function compare(
	browser: Browser,
	server: Server,
	thresholds: Thresholds,
	{ preview, candidate, css, state, label }: Comparison,
): Promise<Result> {
	const referenceUrl = writePage(preview, "reference");
	const candidateUrl = writePage(preview, candidate, {
		css,
		// One page per mutation: two mutations of one preview run side by side in the pool.
		variant:
			css === undefined
				? undefined
				: `mutated-${(label ?? "css").replaceAll(/\W+/gv, "-")}`,
	});
	const reference = await capture(browser, server, referenceUrl, state);
	const boxes = await regions(reference.page);
	await reference.close();
	const other = await capture(browser, server, candidateUrl, state);
	await other.close();

	const diff = diffImages(reference.png, other.png, boxes);
	const budget = budgetFor(preview.id, thresholds);
	const problems = other.errors.map(
		(error) => `error on the ${candidate} page: ${error}`,
	);

	const widthGap = Math.abs(diff.reference.width - diff.candidate.width);
	const heightGap = Math.abs(diff.reference.height - diff.candidate.height);
	if (widthGap > budget.sizeTolerance || heightGap > budget.sizeTolerance) {
		problems.push(
			`page size ${diff.candidate.width}×${diff.candidate.height}, reference ${diff.reference.width}×${diff.reference.height}`,
		);
	}

	for (const region of diff.regions) {
		if (region.pixels > budget.regionPixels) {
			problems.push(
				`"${region.label}": ${region.pixels} px differ (budget ${budget.regionPixels})`,
			);
		}
	}

	const stateName = state?.name ?? "rest";
	const folder = path.join(
		reportDirectory,
		"images",
		`${preview.id.replace("/", "--")}--${label ?? stateName}`,
	);
	fs.mkdirSync(folder, { recursive: true });
	fs.writeFileSync(path.join(folder, "reference.png"), reference.png);
	fs.writeFileSync(path.join(folder, "candidate.png"), other.png);
	fs.writeFileSync(path.join(folder, "diff.png"), diff.image);
	return {
		id: preview.id,
		state: label ?? stateName,
		passed: problems.length === 0,
		problems,
		referenceErrors: reference.errors,
		regions: diff.regions,
		size: {
			reference: `${diff.reference.width}×${diff.reference.height}`,
			candidate: `${diff.candidate.width}×${diff.candidate.height}`,
		},
		images: path.relative(reportDirectory, folder),
	};
}

/**
Runs jobs a few at a time. The results come back in the order of the jobs.
*/
async function pool<T>(
	jobs: Array<() => Promise<T>>,
	size: number,
): Promise<T[]> {
	const results = new Map<number, T>();
	let next = 0;
	async function worker(): Promise<void> {
		while (next < jobs.length) {
			const index = next++;
			const job = jobs[index];
			// Each worker runs its jobs one after another; the workers run side by side.
			// eslint-disable-next-line no-await-in-loop
			results.set(index, await job());
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(size, jobs.length) }, worker),
	);
	return jobs.map((_job, index) => results.get(index)!);
}

const worstOf = (result: Result) =>
	Math.max(0, ...result.regions.map((region) => region.pixels));

const escape = (text: string) =>
	text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function writeReport(mode: Mode, phase: number, results: Result[]): void {
	const rows = results
		.map((result) => {
			const worst = worstOf(result);
			return `<tr class="${result.passed ? "pass" : "fail"}"><td>${escape(result.id)}</td><td>${escape(result.state)}</td><td>${result.passed ? "pass" : "fail"}</td><td>${worst}</td><td>${result.size.reference} / ${result.size.candidate}</td><td>${escape([...result.problems, ...result.referenceErrors.map((error) => `reference: ${error}`)].join("; "))}</td><td><a href="${result.images}/reference.png">reference</a> · <a href="${result.images}/candidate.png">candidate</a> · <a href="${result.images}/diff.png">diff</a></td></tr>`;
		})
		.join("\n");
	const failed = results.filter((result) => !result.passed).length;
	const html = `<!doctype html><meta charset="utf-8"><title>Parity: ${mode}, phase ${phase}</title>
<style>body{font:14px/1.5 system-ui;margin:24px;color:#233047}table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.fail td:nth-child(3){color:#b42318;font-weight:600}</style>
<h1>Parity: ${mode}, phase ${phase}</h1><p>${results.length - failed} of ${results.length} captures pass.</p>
<table><tr><th>Preview</th><th>State</th><th>Result</th><th>Worst region (px)</th><th>Size reference / candidate</th><th>Problems</th><th>Images</th></tr>
${rows}</table>`;
	fs.mkdirSync(reportDirectory, { recursive: true });
	fs.writeFileSync(path.join(reportDirectory, "index.html"), html);
	fs.writeFileSync(
		path.join(reportDirectory, "summary.json"),
		`${JSON.stringify({ mode, phase, results }, undefined, "\t")}\n`,
	);
}

/**
Planted defects the gate must catch, each on a preview that shows the mutated rule.
*/
const mutations = [
	{
		name: "radius",
		preview: "components/Button",
		css: ".gl-button-primary { border-radius: 12px !important; }",
	},
	{
		// Only the fill changes, to the hover token: the subtlest colour defect a port is likely to make.
		name: "ink at rest",
		preview: "components/Button",
		css: ".gl-button-primary { background-color: var(--ink-hover) !important; }",
	},
	{
		name: "2px shift",
		preview: "components/Card",
		css: "#root section:nth-of-type(2) { transform: translateY(2px); }",
	},
	{
		name: "tracking",
		preview: "components/Typography",
		css: ".text-heading { letter-spacing: -0.03em !important; }",
	},
];

async function main(): Promise<number> {
	const mode: Mode = process.argv.includes("--mutate")
		? "mutate"
		: process.argv.includes("--self")
			? "self"
			: "gate";
	const phaseArgument = argument("--phase");
	const phase =
		phaseArgument === undefined ? scope().phase : Number(phaseArgument);
	const only = argument("--only")?.split(",");
	const thresholds = readThresholds();

	await buildRuntimes(mode === "gate" ? undefined : "reference");
	fs.rmSync(reportDirectory, { recursive: true, force: true });
	const server = await startServer();
	const browser = await chromium.launch();
	try {
		let jobs: Array<() => Promise<Result>>;
		if (mode === "mutate") {
			const controls = [
				...new Set(mutations.map((mutation) => mutation.preview)),
			];
			const byId = new Map(previews().map((preview) => [preview.id, preview]));
			jobs = [
				...controls.map(
					(id) => async () =>
						compareSafely(browser, server, thresholds, {
							preview: byId.get(id)!,
							candidate: "reference",
							label: "control",
						}),
				),
				...mutations.map(
					(mutation) => async () =>
						compareSafely(browser, server, thresholds, {
							preview: byId.get(mutation.preview)!,
							candidate: "reference",
							css: mutation.css,
							label: mutation.name,
						}),
				),
			];
		} else {
			const available = mode === "self" ? previews() : scope(phase).previews;
			const chosen =
				only === undefined
					? available
					: available.filter((preview) => only.includes(preview.id));
			// The self-test runs the gate's opened states too, so their budgets come from the
			// reference against itself, plus its own states that prove the mechanism.
			const statesOf = (id: string): State[] => {
				const gate = states[id] ?? [];
				if (mode !== "self") {
					return gate;
				}

				const names = new Set(gate.map((state) => state.name));
				return [
					...gate,
					...(selfTestStates[id] ?? []).filter(
						(state) => !names.has(state.name),
					),
				];
			};

			const candidate: Runtime = mode === "self" ? "reference" : "package";
			jobs = chosen.flatMap((preview) => [
				async () =>
					compareSafely(browser, server, thresholds, { preview, candidate }),
				...statesOf(preview.id).map(
					(state) => async () =>
						compareSafely(browser, server, thresholds, {
							preview,
							candidate,
							state,
						}),
				),
			]);
		}

		const results = await pool(jobs, 4);
		writeReport(mode, phase, results);
		const failed = results.filter((result) => !result.passed);
		for (const result of results) {
			const worst = worstOf(result);
			console.log(
				`${result.passed ? "pass" : "FAIL"}  ${result.id} [${result.state}] worst region ${worst} px${result.problems.length > 0 ? ` — ${result.problems.join("; ")}` : ""}`,
			);
		}

		if (mode === "mutate") {
			const controlsFailed = results.filter(
				(result) => result.state === "control" && !result.passed,
			);
			const missed = results.filter(
				(result) => result.state !== "control" && result.passed,
			);
			console.log(
				`mutation test: ${results.length - controlsFailed.length - missed.length} of ${results.length} as expected (controls pass, every planted defect fails)`,
			);
			return controlsFailed.length + missed.length === 0 ? 0 : 1;
		}

		console.log(
			`parity ${mode}, phase ${phase}: ${results.length - failed.length} of ${results.length} captures pass → reports/parity/index.html`,
		);
		return failed.length === 0 ? 0 : 1;
	} finally {
		await browser.close();
		await server.close();
	}
}

process.exitCode = await main();
