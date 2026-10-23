import fs from "node:fs";
import path from "node:path";
import {
	designSystem,
	exportsByModule,
	modulePaths,
	root,
} from "./lib/reference.ts";

type Repair = { search: string; replacement: string; reason: string };

const out = path.join(root, ".cache/reference");
const source = path.join(out, "src");

const shared: Record<string, string> = {
	"cx.ts": "internal",
	"dom.ts": "internal",
	"hooks.ts": "internal",
	"position.ts": "internal",
	"_inputs-b-field.tsx": "inputs",
	"_inputs-b-list.ts": "inputs",
	"_charts-chrome.tsx": "charts",
	"_charts-scale.ts": "charts",
	"_mermaid-layout.ts": "charts",
	"_feedback-live.ts": "feedback",
	"_surfaces-layout-system.ts": "layout",
};

const repairs: Record<string, Repair[]> = {};

function put(relative: string, from: string) {
	const to = path.join(source, relative);
	fs.mkdirSync(path.dirname(to), { recursive: true });
	let text = fs.readFileSync(from, "utf8");
	for (const { search, replacement, reason } of repairs[relative] ?? []) {
		if (!text.includes(search)) {
			throw new Error(`The repair to ${relative} no longer applies: ${reason}`);
		}

		text = text.replace(search, () => replacement);
	}

	fs.writeFileSync(to, text);
}

fs.rmSync(out, { recursive: true, force: true });
for (const [file, folder] of Object.entries(shared)) {
	put(`${folder}/${file}`, path.join(designSystem, "shared", file));
}

for (const [folder, modulePath] of modulePaths()) {
	put(
		`${modulePath}.tsx`,
		path.join(designSystem, "components", folder, "reference.tsx"),
	);
}

const lines = exportsByModule()
	.entries()
	.filter(([, surface]) => surface.values.length > 0)
	.map(
		([modulePath, surface]) =>
			`export { ${surface.values.join(", ")} } from "./${modulePath}";`,
	)
	.toArray();
fs.writeFileSync(path.join(source, "index.ts"), `${lines.join("\n")}\n`);
fs.writeFileSync(
	path.join(out, "styles.css"),
	[
		fs.readFileSync(path.join(designSystem, "tokens/tokens.css"), "utf8"),
		fs.readFileSync(path.join(designSystem, "source/bundle.css"), "utf8"),
	].join("\n"),
);
console.log(
	`reference: ${modulePaths().size} modules, ${lines.length} export lines → .cache/reference/`,
);
