import fs from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { checkOrder } from "../../scripts/lib/css.ts";
import {
	componentNames,
	cssSectionOrder,
	designSystem,
	root,
} from "../../scripts/lib/reference.ts";

test("index.css imports follow the reference bundle's cascade order", () => {
	expect(() => checkOrder()).not.toThrow();
});

test("every component with a stylesheet section has a place in the order", () => {
	const order = cssSectionOrder();
	const withSection = componentNames().filter((name) =>
		fs
			.readFileSync(
				path.join(designSystem, "components", name, "styles.css"),
				"utf8",
			)
			.includes("@layer"),
	);
	expect(withSection.filter((name) => !order.includes(name))).toEqual([]);
	expect(order[0]).toBe("foundation");
});

const flat = (css: string) => css.replaceAll(/\s+/gv, " ").trim();

test("baseline.css is the CSS CssBaseline injects", () => {
	const reference = fs.readFileSync(
		path.join(designSystem, "components/CssBaseline/reference.tsx"),
		"utf8",
	);
	const injected = /const CSS = `\n(?<css>[\s\S]*?)`;/v.exec(reference)?.groups
		?.css;
	const baseline = fs.readFileSync(
		path.join(root, "src/styles/baseline.css"),
		"utf8",
	);
	expect(injected).toBeDefined();
	expect(flat(baseline)).toContain(flat(injected ?? ""));
});
