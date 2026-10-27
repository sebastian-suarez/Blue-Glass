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
import { scope } from "./lib/phases.ts";
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

/**
The shared helpers a component's reference imports: by their underscored names, such as Box's
`./_surfaces-layout-system`, or as `../internal/<name>` for the ones `shared/` keeps without an
underscore, such as Popper's `position`. A change to one is a change to every component built on
it. The helpers every component imports (cx, dom, hooks) are tracked once, as shared files.
*/
function sharedHelpersOf(name: string): string[] {
	const source = fs.readFileSync(
		path.join(designSystem, `components/${name}/reference.tsx`),
		"utf8",
	);
	const helpers = new Set(
		source
			.matchAll(
				/from\s+["'](?:[^"']*\/(?<sibling>_[\w\-]+)|\.\.\/internal\/(?<internal>[\w\-]+))["']/gv,
			)
			.map((match) => match.groups?.sibling ?? match.groups?.internal ?? "")
			.filter((helper) => !sharedFiles.includes(`shared/${helper}.ts`)),
	);
	return [...helpers].flatMap((helper) =>
		["ts", "tsx"]
			.map((extension) => `shared/${helper}.${extension}`)
			.filter((relative) => fs.existsSync(path.join(designSystem, relative))),
	);
}

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
		files: filesOf([
			...componentFiles.map((file) => `components/${name}/${file}`),
			...sharedHelpersOf(name),
		]),
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
	// A module the phase has ported but never recorded would go unwatched.
	const unrecorded = [...scope().modules].filter(
		(name) => manifest.components[name] === undefined,
	);
	for (const line of changed) {
		console.log(`changed since it was ported  ${line}`);
	}

	for (const name of unrecorded) {
		console.log(`not recorded  ${name}: run --record ${name}`);
	}

	const problems = changed.length + unrecorded.length;
	console.log(
		problems === 0
			? `in sync: ${Object.keys(manifest.components).length} ported modules and the shared files match their reference`
			: `${changed.length} reference file(s) changed and ${unrecorded.length} module(s) not recorded: re-port and record them`,
	);
	process.exitCode = problems === 0 ? 0 : 1;
}
