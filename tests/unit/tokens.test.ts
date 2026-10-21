import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { expect, test } from "vitest";
import { root } from "../../scripts/lib/reference.ts";

const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const withoutHeader = (css: string) => css.replace(/^\/\*.*?\*\/\n/v, "");
const flat = (css: string) => css.replaceAll(/\s+/gv, " ").trim();

test("src/styles/tokens.css is up to date with tokens.json", () => {
	const directory = path.join(root, ".cache/test-tmp");
	fs.mkdirSync(directory, { recursive: true });
	const output = path.join(directory, "tokens.css");
	execFileSync(process.execPath, [
		path.join(root, "scripts/build-tokens.mjs"),
		"--strict",
		"--output",
		output,
	]);
	expect(fs.readFileSync(output, "utf8")).toBe(read("src/styles/tokens.css"));
});

test("tokens.css matches the reference's, apart from the layered type classes", () => {
	const ours = withoutHeader(read("src/styles/tokens.css"))
		.replace(
			"@layer gl-fallback, gl-base, gl-components;\n\n@layer gl-base {\n",
			"",
		)
		.replace(/\n\}\n$/v, "\n");
	const reference = withoutHeader(read("design-system/tokens/tokens.css"));
	expect(flat(ours)).toBe(flat(reference));
});

test("the type classes are layered and the custom properties aren't", () => {
	const css = read("src/styles/tokens.css");
	const layer = css.indexOf("@layer gl-base {");
	expect(layer).toBeGreaterThan(-1);
	expect(css.indexOf(".text-display")).toBeGreaterThan(layer);
	expect(css.indexOf("--color-canvas")).toBeLessThan(layer);
});
