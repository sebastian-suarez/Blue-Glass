import fs from "node:fs";
import path from "node:path";
import { cssSectionOrder, root } from "./reference.ts";

const components = path.join(root, "src/components");
export const entry = path.join(root, "src/styles/index.css");
const importLine = /^@import\s+"(?<specifier>[^"]+)";\s*$/gmv;

function sectionOf(file: string): string {
	const relative = path.relative(root, file).split(path.sep).join("/");
	const fixed: Record<string, string> = {
		"src/styles/tokens.css": "tokens",
		"src/styles/foundation.css": "foundation",
		"src/styles/charts-chrome.css": "shared:charts-chrome",
	};
	const component =
		/^src\/components\/(?<name>[A-Za-z]+)\/\k<name>\.css$/v.exec(relative)
			?.groups?.name;
	const key = fixed[relative] ?? component;
	if (key === undefined) {
		throw new Error(`index.css imports ${relative}, which has no section`);
	}

	return key;
}

function importsOf(file: string): string[] {
	return fs
		.readFileSync(file, "utf8")
		.matchAll(importLine)
		.map((match) =>
			path.resolve(path.dirname(file), match.groups?.specifier ?? ""),
		)
		.toArray();
}

function componentsWithStyles(): string[] {
	if (!fs.existsSync(components)) {
		return [];
	}

	return fs
		.readdirSync(components)
		.filter((name) =>
			fs.existsSync(path.join(components, name, `${name}.css`)),
		);
}

export function checkOrder(): string[] {
	const imported = importsOf(entry).map((file) => {
		if (!fs.existsSync(file)) {
			throw new Error(
				`index.css imports ${path.relative(root, file)}, which doesn't exist`,
			);
		}

		return sectionOf(file);
	});
	if (imported[0] !== "tokens" || imported[1] !== "foundation") {
		throw new Error("index.css must import tokens.css, then foundation.css");
	}

	const order = cssSectionOrder();
	const sections = imported.slice(1);
	for (const [index, key] of sections.entries()) {
		if (!order.includes(key)) {
			throw new Error(`${key} has no section in the reference bundle`);
		}

		const previous = sections[index - 1];
		if (
			previous !== undefined &&
			order.indexOf(key) < order.indexOf(previous)
		) {
			throw new Error(
				`index.css imports ${key} after ${previous}; the reference bundle has them the other way round`,
			);
		}
	}

	const missing = componentsWithStyles().filter(
		(name) => !imported.includes(name),
	);
	if (missing.length > 0) {
		throw new Error(`index.css doesn't import: ${missing.join(", ")}`);
	}

	return imported;
}

export function inline(file: string, seen = new Set<string>()): string {
	return fs
		.readFileSync(file, "utf8")
		.replaceAll(importLine, (_line, specifier: string) => {
			const target = path.resolve(path.dirname(file), specifier);
			if (seen.has(target)) {
				throw new Error(`${specifier} is imported twice`);
			}

			seen.add(target);
			const label = path.relative(root, target).split(path.sep).join("/");
			return `/* ${label} */\n${inline(target, seen).trim()}\n`;
		});
}
