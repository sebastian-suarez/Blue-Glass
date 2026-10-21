/**
The package gate (docs/package-plan.md, acceptance suite item 5): builds and packs the
package, lints the tarball with publint and attw (ESM only), then installs it in the Astro
consumer (tests/consumer/astro), builds that and checks the site in Chromium
(scripts/lib/astro-consumer.ts). Prints a line per check and exits with 1 if any fails.
*/
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { publint } from "publint";
import { formatMessage } from "publint/utils";
import { checkSite, consumer, type Outcome } from "./lib/astro-consumer.ts";
import { root } from "./lib/reference.ts";

type Manifest = {
	name: string;
	version: string;
	exports: Record<string, unknown>;
};

type AttwReport = {
	analysis: {
		types: false | { kind: string };
		entrypoints: Record<string, unknown>;
		problems: Array<{
			kind: string;
			entrypoint: string;
			resolutionKind?: string;
		}>;
	};
};

const started = performance.now();
const manifest = JSON.parse(
	fs.readFileSync(path.join(root, "package.json"), "utf8"),
) as Manifest;
const packDirectory = path.join(root, ".cache/pack");
// Named the way npm pack names it: "@scope/name" becomes "scope-name-<version>.tgz".
const tarball = path.join(
	packDirectory,
	`${manifest.name.replace(/^@/v, "").replace("/", "-")}-${manifest.version}.tgz`,
);
const outcomes: Outcome[] = [];

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
Runs a command and returns its stdout. A failure throws with the end of its output, where
npm and Astro put the error.
*/
function run(
	command: string,
	arguments_: string[],
	options: { cwd?: string; env?: Record<string, string> } = {},
): string {
	const result = spawnSync(command, arguments_, {
		cwd: options.cwd ?? root,
		env: { ...process.env, ...options.env },
		encoding: "utf8",
		maxBuffer: 256 * 1024 * 1024,
	});
	if (result.error !== undefined) {
		throw result.error;
	}

	if (result.status !== 0) {
		const output = `${result.stdout}\n${result.stderr}`
			.trim()
			.split("\n")
			.slice(-30)
			.join("\n");
		throw new Error(
			`${[command, ...arguments_].join(" ")} failed with ${result.status ?? result.signal}\n${output}`,
		);
	}

	return result.stdout;
}

function record(outcome: Outcome): Outcome {
	outcomes.push(outcome);
	const [first, ...rest] = outcome.detail.split("\n");
	console.log(`${outcome.ok ? "✓" : "✗"} ${outcome.name.padEnd(22)} ${first}`);
	for (const line of rest) {
		console.log(`  ${" ".repeat(22)} ${line}`);
	}

	return outcome;
}

async function step(
	name: string,
	action: () => Promise<string> | string,
): Promise<Outcome> {
	try {
		return record({ name, ok: true, detail: await action() });
	} catch (error) {
		return record({ name, ok: false, detail: errorMessage(error) });
	}
}

function countFiles(directory: string, extension = ""): number {
	return fs
		.readdirSync(directory, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && entry.name.endsWith(extension)).length;
}

function buildPackage(): string {
	run("npm", ["run", "build"]);
	return `dist/: ${countFiles(path.join(root, "dist"))} files`;
}

function packTarball(): string {
	fs.rmSync(packDirectory, { recursive: true, force: true });
	fs.mkdirSync(packDirectory, { recursive: true });
	// No lifecycle scripts: the build has just run, and `prepare` (husky) would point
	// core.hooksPath, which every worktree shares, at this checkout's .husky.
	const [packed] = JSON.parse(
		run("npm", [
			"pack",
			"--ignore-scripts",
			"--json",
			"--pack-destination",
			packDirectory,
		]),
	) as Array<{ filename: string; size: number; files: unknown[] }>;
	if (path.join(packDirectory, packed.filename) !== tarball) {
		throw new Error(
			`npm pack wrote ${packed.filename}, expected ${path.basename(tarball)}`,
		);
	}

	return `${path.relative(root, tarball)}: ${packed.files.length} files, ${(packed.size / 1024).toFixed(1)} kB`;
}

async function lintTarball(): Promise<string> {
	const { messages, pkg: packed } = await publint({
		pack: { tarball: new Uint8Array(fs.readFileSync(tarball)).buffer },
		// Warnings fail too: they flag fields and files that break in some consumers.
		strict: true,
	});
	const lines = messages.map(
		(message) =>
			`${message.type}: ${formatMessage(message, packed, { color: false }) ?? message.code}`,
	);
	if (messages.some((message) => message.type === "error")) {
		throw new Error(lines.join("\n"));
	}

	return lines.length === 0 ? "no issues" : lines.join("\n");
}

function checkTypes(): string {
	// TypeScript doesn't resolve stylesheets, so attw would report every CSS entry point
	// as unresolved. The consumer build resolves those instead.
	const stylesheets = Object.keys(manifest.exports).filter((entry) =>
		entry.endsWith(".css"),
	);
	const result = spawnSync(
		path.join(root, "node_modules/.bin/attw"),
		[
			tarball,
			"--profile",
			"esm-only",
			"--format",
			"json",
			...(stylesheets.length > 0
				? ["--exclude-entrypoints", ...stylesheets]
				: []),
		],
		{ cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
	);
	// 1 means problems were found; anything else non-zero means attw itself failed.
	if (result.status !== 0 && result.status !== 1) {
		throw new Error(
			`attw failed with ${result.status ?? result.signal}\n${result.stderr.trim()}`,
		);
	}

	const { analysis } = JSON.parse(result.stdout) as AttwReport;
	if (analysis.types === false) {
		throw new Error("the package ships no types");
	}

	// The esm-only profile leaves out the CommonJS resolutions: node10 and node16 from CJS.
	const ignored = new Set(["node10", "node16-cjs"]);
	const problems = analysis.problems
		.filter((problem) => !ignored.has(problem.resolutionKind ?? ""))
		.map(
			(problem) =>
				`${problem.kind}: "${problem.entrypoint}" (${problem.resolutionKind ?? "any resolution"})`,
		);
	if (result.status !== 0 || problems.length > 0) {
		throw new Error(
			problems.length > 0 ? problems.join("\n") : "attw found problems",
		);
	}

	return `types resolve for ${Object.keys(analysis.entrypoints).join(", ")}; CSS left to the consumer`;
}

function installConsumer(): string {
	run("npm", ["ci", "--prefer-offline", "--no-audit", "--no-fund"], {
		cwd: consumer,
	});
	// Unsaved, since a lockfile can't pin a tarball that changes with every build.
	run(
		"npm",
		[
			"install",
			"--no-save",
			"--prefer-offline",
			"--no-audit",
			"--no-fund",
			tarball,
		],
		{ cwd: consumer },
	);
	return `npm ci, then ${path.basename(tarball)}`;
}

function buildConsumer(): string {
	run(path.join(consumer, "node_modules/.bin/astro"), ["build"], {
		cwd: consumer,
		// eslint-disable-next-line @typescript-eslint/naming-convention -- an environment variable
		env: { ASTRO_TELEMETRY_DISABLED: "1" },
	});
	const pages = countFiles(path.join(consumer, "dist"), ".html");
	return `astro build: ${pages} ${pages === 1 ? "page" : "pages"}`;
}

/**
Every step needs the one before it, except that the linters and the consumer only need the
tarball.
*/
async function checkAll() {
	const built = await step("build", buildPackage);
	if (!built.ok) {
		return;
	}

	const packed = await step("pack", packTarball);
	if (!packed.ok) {
		return;
	}

	await step("publint", lintTarball);
	await step("attw (ESM only)", checkTypes);
	const installed = await step("consumer install", installConsumer);
	if (!installed.ok) {
		return;
	}

	const siteBuilt = await step("consumer build", buildConsumer);
	if (!siteBuilt.ok) {
		return;
	}

	try {
		for (const outcome of await checkSite()) {
			record(outcome);
		}
	} catch (error) {
		record({ name: "consumer site", ok: false, detail: errorMessage(error) });
	}
}

await checkAll();
const failed = outcomes.filter((outcome) => !outcome.ok).length;
const seconds = Math.round((performance.now() - started) / 1000);
console.log(
	failed === 0
		? `check:package passed: ${outcomes.length} checks in ${seconds}s`
		: `check:package failed: ${failed} of ${outcomes.length} checks`,
);
if (failed > 0) {
	process.exitCode = 1;
}
