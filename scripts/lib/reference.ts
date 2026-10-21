/**
Facts read from the exported reference in design-system/: module categories, exports,
the stylesheet's section order and what each preview uses. Every script and gate that
needs them reads them here, so there's one interpretation of the reference.
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Preview = {
	/**
	"components/Button" or "sections/Hero".
	*/
	id: string;
	kind: "component" | "section";
	name: string;
	/**
	Absolute path of its preview.html.
	*/
	file: string;
};

export type Surface = { values: string[]; types: string[] };

export const root = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
export const designSystem = path.join(root, "design-system");

const byName = (a: string, b: string) => a.localeCompare(b);
const read = (relative: string) =>
	fs.readFileSync(path.join(designSystem, relative), "utf8");

/**
Component folder names in design-system/components, sorted.
*/
export function componentNames(): string[] {
	return fs
		.readdirSync(path.join(designSystem, "components"))
		.filter((name) =>
			fs.existsSync(path.join(designSystem, "components", name, "api.d.ts")),
		)
		.toSorted(byName);
}

/**
Section folder names in design-system/sections, sorted.
*/
export function sectionNames(): string[] {
	return fs.readdirSync(path.join(designSystem, "sections")).toSorted(byName);
}

/**
Each component folder's original module path, from its api.d.ts header ("// inputs/Button").
*/
export function modulePaths(): Map<string, string> {
	const map = new Map<string, string>();
	for (const name of componentNames()) {
		const header = /^\/\/ (?<path>[\-a-z]+\/[\w\-]+)$/mv.exec(
			read(`components/${name}/api.d.ts`),
		);
		if (!header?.groups) {
			throw new Error(`${name}/api.d.ts has no "// category/Module" header`);
		}

		map.set(name, header.groups.path);
	}

	return map;
}

/**
The public surface in source/index.d.ts, grouped by original module path. Values are
`export declare const|function`; types are `export interface|type`. The lines before the
first header belong to internal/position.
*/
export function exportsByModule(): Map<string, Surface> {
	const sections = new Map<string, Surface>();
	let current = "internal/position";
	const entry = (key: string): Surface => {
		const existing = sections.get(key);
		if (existing) {
			return existing;
		}

		const created: Surface = { values: [], types: [] };
		sections.set(key, created);
		return created;
	};

	for (const line of read("source/index.d.ts").split("\n")) {
		const header = /^\/\/ (?<path>[\-a-z]+\/[\w\-]+)$/v.exec(line);
		const value = /^export declare (?:const|function) (?<name>\w+)/v.exec(line);
		const type = /^export (?:interface|type) (?<name>\w+)/v.exec(line);
		if (header?.groups) {
			current = header.groups.path;
		} else if (value?.groups) {
			entry(current).values.push(value.groups.name);
		} else if (type?.groups) {
			entry(current).types.push(type.groups.name);
		}
	}

	return sections;
}

/**
The component folder that owns each original module path. internal/position is Popper's public API.
*/
export function ownerOfModule(): Map<string, string> {
	const owners = new Map<string, string>([["internal/position", "Popper"]]);
	for (const [folder, modulePath] of modulePaths()) {
		owners.set(modulePath, folder);
	}

	return owners;
}

// The reference doesn't change while a process runs, and the gates ask for these thousands of
// times (each scope reads all 71 previews), so they're computed once.
let valueOwnersCache: ReadonlyMap<string, string> | undefined;
const previewUsesCache = new Map<string, readonly string[]>();

/**
The component folder that owns each exported value.
*/
export function valueOwners(): ReadonlyMap<string, string> {
	valueOwnersCache ??= computeValueOwners();
	return valueOwnersCache;
}

function computeValueOwners(): Map<string, string> {
	const moduleOwners = ownerOfModule();
	const owners = new Map<string, string>();
	for (const [modulePath, { values }] of exportsByModule()) {
		const folder = moduleOwners.get(modulePath);
		if (folder === undefined) {
			throw new Error(`No component owns ${modulePath}`);
		}

		for (const value of values) {
			owners.set(value, folder);
		}
	}

	return owners;
}

function sectionKey(heading: string): string {
	const h = heading.trim();
	if (
		/^(?:Blue Glass|Defaults for|The site's base layer|Glass material)/v.test(h)
	) {
		return "foundation";
	}

	if (h.startsWith("Chart chrome")) {
		return "shared:charts-chrome";
	}

	return h.startsWith("MermaidDiagram")
		? "Mermaid"
		: (/^(?<word>[A-Za-z]+)/v.exec(h)?.groups?.word ?? "unknown");
}

/**
The comment heading a bundle.css section: the first comment from two lines before its layer rule to three after.
*/
function headingAt(lines: string[], index: number): string {
	const end = Math.min(lines.length, index + 4);
	for (let line = Math.max(0, index - 2); line < end; line++) {
		// Headings can contain "*" themselves (".text-*", ".gl-dg-*"), so read up to "*/" or the line's end.
		const comment = /^\s*\/\*(?<text>.+?)(?:\*\/|$)/v.exec(lines[line]);
		if (comment?.groups) {
			return comment.groups.text;
		}
	}

	return "";
}

/**
Section keys of source/bundle.css in cascade order, split the way
design-system/tools/build_reference.py splits it: a section starts at each line beginning
with a layer rule, and the comment around it names the section.
*/
export function cssSectionOrder(): string[] {
	const lines = read("source/bundle.css").split("\n");
	const order: string[] = [];
	for (const [index, line] of lines.entries()) {
		if (!line.startsWith("@layer")) {
			continue;
		}

		const key = sectionKey(headingAt(lines, index));
		if (order.at(-1) !== key) {
			order.push(key);
		}
	}

	return order;
}

/**
Every preview: the 66 component previews, then the 5 section previews.
*/
export function previews(): Preview[] {
	const entry = (kind: Preview["kind"], name: string): Preview => {
		const folder = kind === "component" ? "components" : "sections";
		return {
			id: `${folder}/${name}`,
			kind,
			name,
			file: path.join(designSystem, folder, name, "preview.html"),
		};
	};

	return [
		...componentNames().map((name) => entry("component", name)),
		...sectionNames().map((name) => entry("section", name)),
	];
}

/**
The inline script of a preview page.
*/
export function previewScript(file: string): string {
	const script = /<script>(?<body>[\s\S]*?)<\/script>/v.exec(
		fs.readFileSync(file, "utf8"),
	)?.groups?.body;
	if (script === undefined) {
		throw new Error(`${file} has no inline script`);
	}

	return script;
}

/**
Exported values a preview's script reads. The scripts are minified, so this matches
`x.Name` for every exported Name; a false positive only makes a preview wait longer.
*/
export function previewUses(file: string): string[] {
	const cached = previewUsesCache.get(file);
	if (cached !== undefined) {
		return [...cached];
	}

	const owners = valueOwners();
	const used = new Set<string>();
	for (const match of previewScript(file).matchAll(
		/\b[\w$]+\.(?<name>[A-Za-z]\w*)\b/gv,
	)) {
		const name = match.groups?.name;
		if (name !== undefined && owners.has(name)) {
			used.add(name);
		}
	}

	const uses = used.values().toArray().toSorted(byName);
	previewUsesCache.set(file, uses);
	return [...uses];
}
