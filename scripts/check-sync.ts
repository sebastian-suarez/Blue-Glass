/**
Finds what the package must re-port after design-system/ is regenerated. tests/sync.json
records a hash of every reference file a ported module came from, at the time it was
ported; this script recomputes them and lists what changed.

Usage:
  node scripts/check-sync.ts                  lists changes; exits 1 when there are any
  node scripts/check-sync.ts --record Button  records Button's current reference files
  node scripts/check-sync.ts --record-shared  records the shared files the foundation copies
*/
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { componentNames, designSystem, root } from "./lib/reference.ts";

type Entry = { files: Record<string, string> };
type Manifest = { shared: Entry; components: Record<string, Entry> };

const manifestFile = path.join(root, "tests/sync.json");

/**
The reference files the foundation copies or generates from.
*/
const sharedFiles = [
	"foundation.css",
	"tokens/tokens.json",
	"tokens/tokens.css",
	"tools/build-tokens.mjs",
	"source/bundle.css",
	"shared/cx.ts",
	"shared/dom.ts",
	"shared/hooks.ts",
];

const componentFiles = [
	"README.md",
	"api.d.ts",
	"styles.css",
	"preview.html",
	"reference.tsx",
];

const hash = (relative: string) =>
	createHash("sha256")
		.update(fs.readFileSync(path.join(designSystem, relative)))
		.digest("hex")
		.slice(0, 16);

function read(): Manifest {
	return fs.existsSync(manifestFile)
		? (JSON.parse(fs.readFileSync(manifestFile, "utf8")) as Manifest)
		: { shared: { files: {} }, components: {} };
}

function write(manifest: Manifest): void {
	fs.writeFileSync(
		manifestFile,
		`${JSON.stringify(manifest, undefined, "\t")}\n`,
	);
}

const filesOf = (relatives: string[]) =>
	Object.fromEntries(relatives.map((relative) => [relative, hash(relative)]));

function changes(entry: Entry): string[] {
	return Object.entries(entry.files)
		.filter(
			([relative, recorded]) =>
				!fs.existsSync(path.join(designSystem, relative)) ||
				hash(relative) !== recorded,
		)
		.map(([relative]) => relative);
}

const manifest = read();
const recordAt = process.argv.indexOf("--record");
if (recordAt !== -1) {
	const name = process.argv[recordAt + 1];
	if (name === undefined || !componentNames().includes(name)) {
		throw new Error(`--record takes a component folder name, such as Button`);
	}

	manifest.components[name] = {
		files: filesOf(componentFiles.map((file) => `components/${name}/${file}`)),
	};
	write(manifest);
	console.log(`recorded ${name}`);
} else if (process.argv.includes("--record-shared")) {
	manifest.shared = { files: filesOf(sharedFiles) };
	write(manifest);
	console.log(`recorded ${sharedFiles.length} shared files`);
} else {
	const changed = [
		...changes(manifest.shared).map((file) => `shared: ${file}`),
		...Object.entries(manifest.components).flatMap(([name, entry]) =>
			changes(entry).map((file) => `${name}: ${file}`),
		),
	];
	for (const line of changed) {
		console.log(`changed since it was ported  ${line}`);
	}

	console.log(
		changed.length === 0
			? `in sync: ${Object.keys(manifest.components).length} ported modules and the shared files match their reference`
			: `${changed.length} reference file(s) changed: re-port them, then record them again`,
	);
	process.exitCode = changed.length === 0 ? 0 : 1;
}
