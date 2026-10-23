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
