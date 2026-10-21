/**
The server-HTML gate (docs/package-plan.md, acceptance suite item 2). For every preview in
scope it:

1. renders the preview in Node with no window or document (scripts/lib/server-render.ts);
2. loads that HTML in Chromium with JavaScript off and lists the texts the client render
   shows inside #root that the server HTML hides or lacks: islands hydrate late, so server
   HTML has to stand on its own;
3. hydrates the same HTML and records every recoverable error and every page error;
4. counts texts that move by more than 2px when the page hydrates (reported here; the story
   layout gate, scripts/ssr/layout.ts, fails layout shifts).

What fails is in scripts/lib/ssr-rules.ts: any error, any text the server HTML hides, and any
text it lacks that the reference's server HTML had (tests/ssr/reference-baseline.json).

Usage:
  node scripts/ssr/run.ts                       the gate, on the package's build (npm run build first)
  node scripts/ssr/run.ts --reference           the reference's qualification, every preview
  node scripts/ssr/run.ts --reference --record  … and records the baseline
  --only components/Tabs,sections/Hero          limits the previews
  --phase N                                     overrides the phase
*/
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import {
	allTexts,
	compareLayouts,
	newContext,
	openPage,
	settle,
	textPositions,
	visibleTexts,
	type TextPosition,
} from "../lib/capture.ts";
import {
	startServer,
	writePage,
	type Runtime,
	type Server,
} from "../lib/pages.ts";
import { scope } from "../lib/phases.ts";
import { previews, root, type Preview } from "../lib/reference.ts";
import { renderPreview } from "../lib/server-render.ts";
import {
	judge,
	type Baseline,
	type Exception,
	type Observation,
	type Result,
	type Rules,
} from "../lib/ssr-rules.ts";
import { buildRuntimes, runtimes } from "../runtimes.ts";

const reportDirectory = path.join(root, "reports/ssr");
const baselineFile = path.join(root, "tests/ssr/reference-baseline.json");

function argument(name: string): string | undefined {
	const at = process.argv.indexOf(name);
	return at === -1 ? undefined : process.argv[at + 1];
}

const firstLine = (text: string) => text.split("\n", 1)[0] ?? "";

/**
Text positions inside #root on a page, with JavaScript on (after settling) or off.
*/
async function positionsOn(
	browser: Browser,
	server: Server,
	url: string,
	isScripted: boolean,
): Promise<TextPosition[]> {
	const context = await newContext(browser, { javaScriptEnabled: isScripted });
	const { page } = await openPage(context, `${server.origin}${url}`);
	if (isScripted) {
		await settle(page);
	}

	const positions = await textPositions(page);
	await context.close();
	return positions;
}

type Session = {
	browser: Browser;
	server: Server;
	runtime: Runtime;
	blueGlass: Record<string, unknown>;
};

async function observe(
	{ browser, server, runtime, blueGlass }: Session,
	preview: Preview,
): Promise<Observation> {
	const rendered = renderPreview(preview, blueGlass);
	if ("error" in rendered) {
		return {
			hidden: [],
			absent: [],
			hydrationErrors: [],
			pageErrors: [],
			shifted: 0,
			serverError: rendered.error,
		};
	}

	const clientContext = await newContext(browser);
	const client = await openPage(
		clientContext,
		`${server.origin}${writePage(preview, runtime)}`,
	);
	await settle(client.page);
	const shown = new Set(await visibleTexts(client.page));
	await clientContext.close();

	const staticUrl = writePage(preview, runtime, {
		ssr: rendered.html,
		noScript: true,
		variant: "nojs",
	});
	const staticContext = await newContext(browser, { javaScriptEnabled: false });
	const staticPage = await openPage(
		staticContext,
		`${server.origin}${staticUrl}`,
	);
	const shownWithoutScript = new Set(await visibleTexts(staticPage.page));
	const inServerHtml = new Set(await allTexts(staticPage.page));
	await staticContext.close();

	const hydrateUrl = writePage(preview, runtime, {
		ssr: rendered.html,
		hydrate: true,
		variant: "hydrate",
	});
	const hydrateContext = await newContext(browser);
	const hydrated = await openPage(
		hydrateContext,
		`${server.origin}${hydrateUrl}`,
	);
	await settle(hydrated.page);
	const recoverable = await hydrated.page.evaluate(
		() =>
			(globalThis as unknown as { __glHydrationErrors?: string[] })
				.__glHydrationErrors ?? [],
	);
	await hydrateContext.close();
	const hydrationErrors = recoverable.map((error) => firstLine(error));
	// Every error counts: React's production build reports "Minified React error #…", which a
	// filter on the word "hydration" would miss, and a crash is a failure whatever it says.
	const pageErrors = [
		...client.errors.map((error) => `client render: ${error}`),
		...hydrated.errors.map((error) => `hydrated page: ${error}`),
	];

	const before = await positionsOn(browser, server, staticUrl, false);
	const after = await positionsOn(browser, server, hydrateUrl, true);
	const shifted = compareLayouts(before, after).moved.length;

	const clientOnly = shown.difference(shownWithoutScript);
	return {
		hidden: [...clientOnly.intersection(inServerHtml)],
		absent: [...clientOnly.difference(inServerHtml)],
		hydrationErrors,
		pageErrors,
		shifted,
	};
}

const escape = (text: string) =>
	text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function writeReport(runtime: Runtime, phase: number, results: Result[]): void {
	const rows = results
		.map(
			(result) =>
				`<tr class="${result.passed ? "pass" : "fail"}"><td>${escape(result.id)}</td><td>${result.passed ? "pass" : "fail"}</td><td>${escape(result.problems.join("; "))}</td><td>${escape(result.notes.join("; "))}</td></tr>`,
		)
		.join("\n");
	const failed = results.filter((result) => !result.passed).length;
	fs.mkdirSync(reportDirectory, { recursive: true });
	fs.writeFileSync(
		path.join(reportDirectory, "index.html"),
		`<!doctype html><meta charset="utf-8"><title>Server HTML: ${runtime}, phase ${phase}</title>
<style>body{font:14px/1.5 system-ui;margin:24px;color:#233047}table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}.fail td:nth-child(2){color:#b42318;font-weight:600}</style>
<h1>Server HTML: ${runtime}, phase ${phase}</h1><p>${results.length - failed} of ${results.length} previews pass.</p>
<table><tr><th>Preview</th><th>Result</th><th>Problems</th><th>Notes</th></tr>
${rows}</table>`,
	);
	fs.writeFileSync(
		path.join(reportDirectory, "summary.json"),
		`${JSON.stringify({ runtime, phase, results }, undefined, "\t")}\n`,
	);
}

function readJson<T>(file: string, fallback: T): T {
	return fs.existsSync(file)
		? (JSON.parse(fs.readFileSync(file, "utf8")) as T)
		: fallback;
}

async function main(): Promise<number> {
	const runtime: Runtime = process.argv.includes("--reference")
		? "reference"
		: "package";
	const isRecording = process.argv.includes("--record");
	if (isRecording && runtime !== "reference") {
		throw new Error(
			"--record records the reference's baseline: pass --reference too.",
		);
	}

	const phaseArgument = argument("--phase");
	const phase =
		phaseArgument === undefined ? scope().phase : Number(phaseArgument);
	const only = argument("--only")?.split(",");
	const candidates =
		runtime === "reference" ? previews() : scope(phase).previews;
	const chosen =
		only === undefined
			? candidates
			: candidates.filter((preview) => only.includes(preview.id));
	const baseline = readJson<Baseline>(baselineFile, {});
	const { previews: exceptions } = readJson<{
		previews: Record<string, Exception>;
	}>(path.join(root, "tests/ssr/exceptions.json"), { previews: {} });

	await buildRuntimes(runtime);
	const modulePath =
		runtime === "reference"
			? path.join(runtimes, "reference.node.mjs")
			: path.join(root, "dist/index.js");
	if (!fs.existsSync(modulePath)) {
		throw new Error(
			`${path.relative(root, modulePath)} is missing: run npm run build first.`,
		);
	}

	const blueGlass = (await import(pathToFileURL(modulePath).href)) as Record<
		string,
		unknown
	>;
	fs.rmSync(reportDirectory, { recursive: true, force: true });
	const server = await startServer();
	const browser = await chromium.launch();
	const results: Result[] = [];
	const session: Session = { browser, server, runtime, blueGlass };
	const rules: Rules = { runtime, baseline, exceptions };
	try {
		for (const preview of chosen) {
			// One preview at a time: each opens several pages, and timing must not vary.
			// eslint-disable-next-line no-await-in-loop
			const observation = await observe(session, preview);
			const result = judge(preview, observation, rules);
			results.push(result);
			const details = [...result.problems, ...result.notes];
			console.log(
				`${result.passed ? "pass" : "FAIL"}  ${result.id}${details.length > 0 ? ` — ${details.join("; ")}` : ""}`,
			);
		}
	} finally {
		await browser.close();
		await server.close();
	}

	writeReport(runtime, phase, results);
	if (isRecording) {
		const recorded: Baseline = Object.fromEntries(
			results.map((result) => [
				result.id,
				{
					hidden: result.hidden,
					absent: result.absent,
					hydrationErrors: result.hydrationErrors.length,
				},
			]),
		);
		fs.writeFileSync(
			baselineFile,
			`${JSON.stringify(recorded, undefined, "\t")}\n`,
		);
		console.log(
			`recorded the reference baseline → ${path.relative(root, baselineFile)}`,
		);
	}

	const failed = results.filter((result) => !result.passed).length;
	console.log(
		`server HTML, ${runtime}, phase ${phase}: ${results.length - failed} of ${results.length} previews pass → reports/ssr/index.html`,
	);
	return failed === 0 || isRecording ? 0 : 1;
}

process.exitCode = await main();
