import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Preview = {
	id: string;
	kind: "component" | "section";
	name: string;
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

export function componentNames(): string[] {
	return fs
		.readdirSync(path.join(designSystem, "components"))
		.filter((name) =>
			fs.existsSync(path.join(designSystem, "components", name, "api.d.ts")),
		)
		.toSorted(byName);
}

export function sectionNames(): string[] {
	return fs.readdirSync(path.join(designSystem, "sections")).toSorted(byName);
}

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

export function ownerOfModule(): Map<string, string> {
	const owners = new Map<string, string>([["internal/position", "Popper"]]);
	for (const [folder, modulePath] of modulePaths()) {
		owners.set(modulePath, folder);
	}

	return owners;
}

let valueOwnersCache: ReadonlyMap<string, string> | undefined;
const previewUsesCache = new Map<string, readonly string[]>();

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

function headingAt(lines: string[], index: number): string {
	const end = Math.min(lines.length, index + 4);
	for (let line = Math.max(0, index - 2); line < end; line++) {
		const comment = /^\s*\/\*(?<text>.+?)(?:\*\/|$)/v.exec(lines[line]);
		if (comment?.groups) {
			return comment.groups.text;
		}
	}

	return "";
}

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

export function previewScript(file: string): string {
	const script = /<script>(?<body>[\s\S]*?)<\/script>/v.exec(
		fs.readFileSync(file, "utf8"),
	)?.groups?.body;
	if (script === undefined) {
		throw new Error(`${file} has no inline script`);
	}

	return script;
}

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
