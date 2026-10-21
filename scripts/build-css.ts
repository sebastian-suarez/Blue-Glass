/**
Builds dist/styles.css from src/styles/index.css with every import inlined, and copies
dist/tokens.css, dist/baseline.css and dist/tokens.json. Nothing is minified: the consumer's bundler does that.

It refuses to build when index.css breaks the reference bundle's cascade order or leaves out
a component's stylesheet, because rules in one layer resolve by order.
*/
import fs from "node:fs";
import path from "node:path";
import { checkOrder, entry, inline } from "./lib/css.ts";
import { designSystem, root } from "./lib/reference.ts";

const styles = path.join(root, "src/styles");
const dist = path.join(root, "dist");

const sections = checkOrder();
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, "styles.css"), `${inline(entry).trim()}\n`);
fs.copyFileSync(path.join(styles, "tokens.css"), path.join(dist, "tokens.css"));
fs.copyFileSync(
	path.join(styles, "baseline.css"),
	path.join(dist, "baseline.css"),
);
fs.copyFileSync(
	path.join(designSystem, "tokens/tokens.json"),
	path.join(dist, "tokens.json"),
);
console.log(
	`styles.css: ${sections.length} sections (${sections.join(", ")}) → dist/`,
);
