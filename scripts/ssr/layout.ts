import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { build, type Plugin } from "esbuild";
import { chromium, type Browser } from "playwright";
import {
	compareLayouts,
	newContext,
	openPage,
	settle,
	textPositions,
	viewports,
} from "../lib/capture.ts";
import { fontStyle, startServer, type Server } from "../lib/pages.ts";
import { currentPhase } from "../lib/phases.ts";
import { root } from "../lib/reference.ts";
import { buildRuntimes, reactGlobals } from "../runtimes.ts";

type Manifest = { stories: Array<{ file: string; phase: number }> };

type Expectation = Record<string, { phone: boolean; desktop: boolean }>;

type Outcome = {
	file: string;
	story: string;
	width: keyof typeof viewports;
	passed: boolean;
	problems: string[];
};

const work = path.join(root, ".cache/story-gate");
const selfTest = "tests/ssr/fixtures/layout.stories.tsx";

const selfExpectation: Expectation = {
	/* eslint-disable @typescript-eslint/naming-convention -- the keys are the fixture stories' export names */
	JsLayout: { phone: false, desktop: true },
	CssLayout: { phone: true, desktop: true },
	/* eslint-enable @typescript-eslint/naming-convention */
};

// eslint-disable-next-line require-unicode-regexp
const rawImport = /\?raw$/;

const rawText: Plugin = {
	name: "raw-text",
	setup(builder) {
		builder.onResolve({ filter: rawImport }, (arguments_) => ({
			path: path.resolve(
				arguments_.resolveDir,
				arguments_.path.replace(/\?raw$/v, ""),
			),
			namespace: "raw-text",
		}));
		// eslint-disable-next-line require-unicode-regexp -- Go's regexp engine, as above
		builder.onLoad({ filter: /.*/, namespace: "raw-text" }, (arguments_) => ({
			contents: fs.readFileSync(arguments_.path, "utf8"),
			loader: "text",
		}));
	},
};

const nodeRequire =
	'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);';

const slug = (file: string) => file.replaceAll(/\W+/gv, "-");

async function bundle(
	file: string,
): Promise<{ node: string; browser: string }> {
	fs.mkdirSync(work, { recursive: true });
	const stories = JSON.stringify(path.join(root, file));
	const preview = JSON.stringify(path.join(root, ".storybook/preview.tsx"));
	const head = [
		`import * as stories from ${stories};`,
		`import preview from ${preview};`,
		'import { composeStories, setProjectAnnotations } from "@storybook/react-vite";',
		'import { createElement } from "react";',
		"setProjectAnnotations(preview);",
		"const composed = composeStories(stories);",
	];
	const nodeEntry = path.join(work, `${slug(file)}.node.tsx`);
	fs.writeFileSync(
		nodeEntry,
		[
			...head,
			'import { renderToString } from "react-dom/server";',
			"export const names = Object.keys(composed);",
			"export const render = (name) => renderToString(createElement(composed[name]));",
		].join("\n"),
	);
	const browserEntry = path.join(work, `${slug(file)}.browser.tsx`);
	fs.writeFileSync(
		browserEntry,
		[
			...head,
			'import { hydrateRoot } from "react-dom/client";',
			"window.__glHydrationErrors = [];",
			"window.__glHydrate = (name) => hydrateRoot(document.getElementById('root'), createElement(composed[name]), {",
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
	const node = path.join(work, `${slug(file)}.node.mjs`);
	const browser = path.join(work, `${slug(file)}.browser.js`);
	await build({
		...shared,
		entryPoints: [nodeEntry],
		outfile: node,
		platform: "node",
		format: "esm",
		external: ["react", "react-dom"],
		plugins: [rawText],
		banner: { js: nodeRequire },
	});
	await build({
		...shared,
		entryPoints: [browserEntry],
		outfile: browser,
		platform: "browser",
		format: "iife",
		define: { "process.env.NODE_ENV": '"production"' },
		plugins: [rawText, reactGlobals],
	});
	return { node, browser: path.basename(browser) };
}

function writeShell(name: string, html: string, scripts: string): string {
	const file = path.join(work, `${name}.html`);
	fs.writeFileSync(
		file,
		[
			'<!doctype html><html lang="en"><head><meta charset="utf-8">',
			'<meta name="viewport" content="width=device-width, initial-scale=1">',
			fontStyle,
			'<link rel="stylesheet" href="/runtimes/package.css">',
			"</head><body>",
			`<div id="root">${html}</div>`,
			scripts,
			"</body></html>",
		].join("\n"),
	);
	return `/story/${path.basename(file)}`;
}

async function check(
	browser: Browser,
	server: Server,
	{
		file,
		story,
		html,
		browserBundle,
	}: { file: string; story: string; html: string; browserBundle: string },
): Promise<Outcome[]> {
	const base = `${slug(file)}--${story}`;
	const staticUrl = writeShell(`${base}--nojs`, html, "");
	const hydrateUrl = writeShell(
		`${base}--hydrate`,
		html,
		[
			'<script src="/runtimes/react.js"></script>',
			`<script src="/story/${browserBundle}"></script>`,
			`<script>window.__glHydrate(${JSON.stringify(story)});</script>`,
		].join("\n"),
	);
	const outcomes: Outcome[] = [];
	/* eslint-disable no-await-in-loop -- one width after the other keeps timing steady */
	for (const width of ["phone", "desktop"] as const) {
		const size = viewports[width];
		const staticContext = await newContext(browser, {
			...size,
			javaScriptEnabled: false,
		});
		const staticPage = await openPage(
			staticContext,
			`${server.origin}${staticUrl}`,
		);
		const before = await textPositions(staticPage.page);
		await staticContext.close();
		const hydrateContext = await newContext(browser, size);
		const hydrated = await openPage(
			hydrateContext,
			`${server.origin}${hydrateUrl}`,
		);
		await settle(hydrated.page);
		const after = await textPositions(hydrated.page);
		const recoverable = await hydrated.page.evaluate(
			() =>
				(globalThis as unknown as { __glHydrationErrors?: string[] })
					.__glHydrationErrors ?? [],
		);
		await hydrateContext.close();
		const { moved, changed } = compareLayouts(before, after);
		const problems = [
			...(moved.length > 0
				? [
						`${moved.length} text(s) move when the page hydrates, e.g. "${moved.slice(0, 3).join('", "')}"`,
					]
				: []),
			...(changed ? ["the texts change when the page hydrates"] : []),
			...recoverable.map(
				(error) => `hydration: ${error.split("\n", 1)[0] ?? ""}`,
			),
			...hydrated.errors.map((error) => `page: ${error}`),
		];
		outcomes.push({
			file,
			story,
			width,
			passed: problems.length === 0,
			problems,
		});
	}
	/* eslint-enable no-await-in-loop */

	return outcomes;
}

function argument(name: string): string | undefined {
	const at = process.argv.indexOf(name);
	return at === -1 ? undefined : process.argv[at + 1];
}

async function main(): Promise<number> {
	const isSelfTest = process.argv.includes("--self");
	const phaseArgument = argument("--phase");
	const phase =
		phaseArgument === undefined ? currentPhase() : Number(phaseArgument);
	const manifest = JSON.parse(
		fs.readFileSync(path.join(root, "tests/ssr/layout.json"), "utf8"),
	) as Manifest;
	const files = isSelfTest
		? [selfTest]
		: manifest.stories
				.filter((entry) => entry.phase <= phase)
				.map((entry) => entry.file);
	const missing = files.filter((file) => !fs.existsSync(path.join(root, file)));
	if (missing.length > 0) {
		console.log(
			`missing stories files for phase ${phase}: ${missing.join(", ")}`,
		);
		return 1;
	}

	await buildRuntimes("package");
	fs.rmSync(work, { recursive: true, force: true });
	const server = await startServer();
	const browser = await chromium.launch();
	const outcomes: Outcome[] = [];
	try {
		/* eslint-disable no-await-in-loop -- each file's bundles feed its checks, in order */
		for (const file of files) {
			const bundles = await bundle(file);
			const compiled = (await import(pathToFileURL(bundles.node).href)) as {
				names: string[];
				render: (name: string) => string;
			};
			for (const story of compiled.names) {
				outcomes.push(
					...(await check(browser, server, {
						file,
						story,
						html: compiled.render(story),
						browserBundle: bundles.browser,
					})),
				);
			}
		}
		/* eslint-enable no-await-in-loop */
	} finally {
		await browser.close();
		await server.close();
	}

	for (const outcome of outcomes) {
		console.log(
			`${outcome.passed ? "pass" : "FAIL"}  ${outcome.file} ${outcome.story} at ${outcome.width}${outcome.problems.length > 0 ? ` — ${outcome.problems.join("; ")}` : ""}`,
		);
	}

	if (isSelfTest) {
		const wrong = outcomes.filter(
			(outcome) =>
				selfExpectation[outcome.story]?.[outcome.width] !== outcome.passed,
		);
		console.log(
			`layout self-test: ${outcomes.length - wrong.length} of ${outcomes.length} as expected (CssLayout passes, JsLayout fails at the phone width)`,
		);
		return wrong.length === 0 && outcomes.length === 4 ? 0 : 1;
	}

	const failed = outcomes.filter((outcome) => !outcome.passed).length;
	console.log(
		`story layout, phase ${phase}: ${outcomes.length - failed} of ${outcomes.length} checks pass (${files.length} stories files)`,
	);
	return failed === 0 ? 0 : 1;
}

process.exitCode = await main();
