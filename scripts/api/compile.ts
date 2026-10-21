/**
Compiles the API gate's checks with TypeScript 7 and names the ones that fail, by the
`// @check <id> — <what it checks>` comment that ends each generated line.

Usage: node scripts/api/compile.ts. It compiles tests/api/tsconfig.json (the checks in
tests/api/generated against dist/index.d.ts), lets the checks tests/api/allowlist.json waives
fail, and exits 1 on any other failure, on a compiler error outside the checks, or on a
waiver whose check now passes.
*/
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { root } from "../lib/reference.ts";
import { readAllowlist, type Allowlist } from "./allowlist.ts";
import { generatedDirectory } from "./generate.ts";

export type Failure = {
	id: string;
	description: string;
	/**
	The file and line, relative to the repository.
	*/
	location: string;
	message: string;
};

export type Compiled = {
	/**
	Ids of every check compiled, failing or not.
	*/
	ids: string[];
	failures: Failure[];
	/**
	Compiler errors that no check owns, such as a broken declaration file or tsconfig.
	*/
	errors: string[];
};

const tsc = path.join(root, "node_modules/.bin/tsc");
const marker = /\/\/ @check (?<id>\S+) — (?<description>.+)$/v;

async function runTsc(tsconfig: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(
			tsc,
			["--noEmit", "--pretty", "false", "-p", tsconfig],
			{ cwd: root, maxBuffer: 256 * 1024 * 1024 },
			(error, stdout, stderr) => {
				// The compiler exits with 1 or 2 when it reports errors; they're in stdout either way.
				if (error !== null && typeof error.code !== "number") {
					reject(new Error(`Can't run ${tsc}`, { cause: error }));
					return;
				}

				resolve(`${stdout}${stderr}`);
			},
		);
	});
}

type Diagnostic = { file?: string; line?: number; text: string[] };

function parse(output: string): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];
	for (const line of output.split("\n")) {
		const located =
			/^(?<file>.+?)\((?<line>\d+),\d+\): error (?<text>TS\d+: .*)$/v.exec(
				line,
			);
		const global = /^error (?<text>TS\d+: .*)$/v.exec(line);
		if (located?.groups) {
			diagnostics.push({
				file: located.groups.file,
				line: Number(located.groups.line),
				text: [located.groups.text],
			});
		} else if (global?.groups) {
			diagnostics.push({ text: [global.groups.text] });
		} else if (line.trim() !== "") {
			// An elaboration of the previous diagnostic, or output tsc doesn't format as one.
			const last = diagnostics.at(-1);
			if (last === undefined) {
				diagnostics.push({ text: [line] });
			} else {
				last.text.push(line);
			}
		}
	}

	return diagnostics;
}

function checkIds(directory: string): string[] {
	return fs
		.readdirSync(directory)
		.filter((file) => file.endsWith(".tsx"))
		.flatMap((file) =>
			fs
				.readFileSync(path.join(directory, file), "utf8")
				.split("\n")
				.map((line) => marker.exec(line)?.groups?.id)
				.filter((id) => id !== undefined),
		);
}

/**
Compiles `tsconfig`, whose checks are in `directory`, and sorts the errors into failed
checks and errors no check owns.
*/
export async function compile({
	tsconfig = path.join(root, "tests/api/tsconfig.json"),
	directory = generatedDirectory,
}: { tsconfig?: string; directory?: string } = {}): Promise<Compiled> {
	const lines = new Map<string, string[]>();
	const lineOf = (file: string, line: number) => {
		const absolute = path.resolve(root, file);
		if (!lines.has(absolute)) {
			lines.set(
				absolute,
				fs.existsSync(absolute)
					? fs.readFileSync(absolute, "utf8").split("\n")
					: [],
			);
		}

		return lines.get(absolute)?.[line - 1] ?? "";
	};

	const compiled: Compiled = {
		ids: checkIds(directory),
		failures: [],
		errors: [],
	};
	for (const diagnostic of parse(await runTsc(tsconfig))) {
		const { file, line } = diagnostic;
		const groups =
			file !== undefined && line !== undefined
				? marker.exec(lineOf(file, line))?.groups
				: undefined;
		if (groups && file !== undefined) {
			compiled.failures.push({
				id: groups.id,
				description: groups.description,
				location: `${path.relative(root, path.resolve(root, file))}:${line}`,
				message: diagnostic.text.map((text) => text.trim()).join("\n"),
			});
		} else {
			const where = file === undefined ? "" : `${file}(${line}): `;
			compiled.errors.push(`${where}${diagnostic.text.join("\n")}`);
		}
	}

	return compiled;
}

export type Verdict = {
	/**
	Failures no waiver covers.
	*/
	failures: Failure[];
	waived: Array<{ id: string; reason: string }>;
	/**
	Waivers whose checks were compiled and passed: they must go, so the list stays true.
	*/
	stale: string[];
};

/**
Applies the waivers of tests/api/allowlist.json to a compile.
*/
export function judge(compiled: Compiled, allowlist: Allowlist): Verdict {
	const failing = new Set(compiled.failures.map((failure) => failure.id));
	return {
		failures: compiled.failures.filter(
			(failure) => !allowlist.checks.has(failure.id),
		),
		waived: allowlist.checks
			.entries()
			.filter(([id]) => failing.has(id))
			.map(([id, reason]) => ({ id, reason }))
			.toArray(),
		stale: allowlist.checks
			.keys()
			.filter((id) => compiled.ids.includes(id) && !failing.has(id))
			.toArray(),
	};
}

/**
The subject of a check id: "ButtonProps" for "ButtonProps.href" or "ButtonProps#keys".
*/
const subjectOf = (id: string) => /^[^#.]+/v.exec(id)?.[0] ?? id;

const indent = (text: string, depth: number) =>
	text
		.split("\n")
		.slice(0, 12)
		.map((line) => `${" ".repeat(depth)}${line}`)
		.join("\n");

/**
The failures as a report: one entry per subject and error, so a missing export, which
breaks every check of its subject the same way, reads as one problem.
*/
export function formatFailures(failures: Failure[]): string {
	const entries = new Map<string, Failure[]>();
	for (const failure of failures) {
		const key = `${subjectOf(failure.id)}\n${failure.message}`;
		entries.set(key, [...(entries.get(key) ?? []), failure]);
	}

	return entries
		.values()
		.map((group) => {
			const [first] = group;
			const ids = [...new Set(group.map((failure) => failure.id))];
			const what =
				ids.length === 1 ? `${first.id}: ${first.description}` : ids.join(", ");
			return `✗ ${what}\n${indent(first.message, 4)}\n    at ${first.location}`;
		})
		.toArray()
		.join("\n\n");
}

if (import.meta.main) {
	const compiled = await compile();
	const { failures, waived, stale } = judge(compiled, readAllowlist());
	const failed = new Set(compiled.failures.map((failure) => failure.id)).size;
	const sections = [
		[
			`API checks: ${compiled.ids.length} compiled from ${path.relative(root, generatedDirectory)}/, ${failed} failed.`,
			...waived.map(({ id, reason }) => `Waived ${id}: ${reason}`),
		],
		failures.length > 0 ? [formatFailures(failures)] : [],
		compiled.errors.length > 0
			? ["Compiler errors outside the checks:", ...compiled.errors]
			: [],
		stale.length > 0
			? [
					`Waivers in tests/api/allowlist.json whose checks pass now; remove them: ${stale.join(", ")}`,
				]
			: [],
	];
	console.log(
		sections
			.filter((section) => section.length > 0)
			.map((section) => section.join("\n"))
			.join("\n\n"),
	);
	if (failures.length + compiled.errors.length + stale.length > 0) {
		process.exitCode = 1;
	}
}
