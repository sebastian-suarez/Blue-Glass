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
	location: string;
	message: string;
};

export type Compiled = {
	ids: string[];
	failures: Failure[];
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
	failures: Failure[];
	waived: Array<{ id: string; reason: string }>;
	stale: string[];
};

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

const subjectOf = (id: string) => /^[^#.]+/v.exec(id)?.[0] ?? id;

const indent = (text: string, depth: number) =>
	text
		.split("\n")
		.slice(0, 12)
		.map((line) => `${" ".repeat(depth)}${line}`)
		.join("\n");

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
