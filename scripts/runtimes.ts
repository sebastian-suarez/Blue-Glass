/**
Builds the browser runtimes the preview pages run on, into .cache/runtimes/:

- react.js: React 19 in production, as the globals the previews expect (window.React and
  window.ReactDOM, which also carries createRoot and hydrateRoot), plus the JSX runtime.
- reference.js and package.js: window.BlueGlass, from the reassembled reference
  (npm run reference) and from src/, with React mapped to those globals so both share one
  React. The only difference between the two pages is the component code.
- reference.node.mjs: the reference for Node, for server rendering (the package's own
  build in dist/ serves that purpose for the package).
- reference.css and package.css: the two stylesheets.

Usage: node scripts/runtimes.ts [--only reference|package]
*/
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { build, type Plugin } from "esbuild";
import { entry, inline } from "./lib/css.ts";
import { root } from "./lib/reference.ts";

export const runtimes = path.join(root, ".cache/runtimes");
const referenceSource = path.join(root, ".cache/reference");

const globals: Record<string, string> = {
	react: "window.React",
	"react-dom": "window.ReactDOM",
	"react-dom/client": "window.ReactDOM",
	"react/jsx-runtime": "window.ReactJSXRuntime",
	"react/jsx-dev-runtime": "window.ReactJSXRuntime",
};

// The filters run in Go's regexp engine inside esbuild, which rejects JavaScript flags.
// eslint-disable-next-line require-unicode-regexp
const reactEntryPoint = /^react(?:-dom)?(?:\/.*)?$/;
// eslint-disable-next-line require-unicode-regexp
const anyPath = /.*/;

/**
Resolves React's entry points to the globals react.js sets.
*/
const reactGlobals: Plugin = {
	name: "react-globals",
	setup(builder) {
		builder.onResolve({ filter: reactEntryPoint }, (arguments_) => {
			if (!Object.hasOwn(globals, arguments_.path)) {
				throw new Error(`No browser global for ${arguments_.path}`);
			}

			return { path: arguments_.path, namespace: "react-global" };
		});
		builder.onLoad(
			{ filter: anyPath, namespace: "react-global" },
			(arguments_) => ({
				contents: `module.exports = ${globals[arguments_.path]};`,
				loader: "js",
			}),
		);
	},
};

const shared = {
	bundle: true,
	platform: "browser" as const,
	target: "es2022",
	jsx: "automatic" as const,
	define: { "process.env.NODE_ENV": '"production"' },
	logLevel: "warning" as const,
	// The root tsconfig is for Node; the bundles only need esbuild's defaults.
	tsconfigRaw: { compilerOptions: { jsx: "react-jsx" as const } },
};

async function buildReact() {
	const shim = path.join(runtimes, "react-globals.mjs");
	fs.writeFileSync(
		shim,
		[
			'import * as React from "react";',
			'import * as ReactDOM from "react-dom";',
			'import * as ReactDOMClient from "react-dom/client";',
			'import * as JSXRuntime from "react/jsx-runtime";',
			"window.React = React;",
			"window.ReactDOM = { ...ReactDOM, ...ReactDOMClient };",
			"window.ReactJSXRuntime = JSXRuntime;",
		].join("\n"),
	);
	await build({
		...shared,
		entryPoints: [shim],
		outfile: path.join(runtimes, "react.js"),
		format: "iife",
		minify: true,
		nodePaths: [path.join(root, "node_modules")],
	});
}

async function buildBlueGlass(
	name: "reference" | "package",
	entryPoint: string,
) {
	await build({
		...shared,
		entryPoints: [entryPoint],
		outfile: path.join(runtimes, `${name}.js`),
		format: "iife",
		globalName: "BlueGlass",
		plugins: [reactGlobals],
		// Mermaid is loaded at runtime: the reference fetches a script, the package imports it.
		external: ["mermaid"],
	});
}

async function buildReferenceForNode() {
	await build({
		...shared,
		entryPoints: [path.join(referenceSource, "src/index.ts")],
		outfile: path.join(runtimes, "reference.node.mjs"),
		platform: "node",
		format: "esm",
		external: ["react", "react-dom", "mermaid"],
		define: {},
	});
}

export async function buildRuntimes(only?: "reference" | "package") {
	fs.mkdirSync(runtimes, { recursive: true });
	await buildReact();
	if (only !== "package") {
		if (!fs.existsSync(path.join(referenceSource, "src/index.ts"))) {
			throw new Error("Run `npm run reference` first.");
		}

		await buildBlueGlass(
			"reference",
			path.join(referenceSource, "src/index.ts"),
		);
		await buildReferenceForNode();
		fs.copyFileSync(
			path.join(referenceSource, "styles.css"),
			path.join(runtimes, "reference.css"),
		);
	}

	if (only === "reference") {
		return;
	}

	await buildBlueGlass("package", path.join(root, "src/index.ts"));
	fs.writeFileSync(path.join(runtimes, "package.css"), inline(entry));
}

if (import.meta.main) {
	const at = process.argv.indexOf("--only");
	const only = at === -1 ? undefined : process.argv[at + 1];
	if (only !== undefined && only !== "reference" && only !== "package") {
		throw new Error("--only takes reference or package");
	}

	await buildRuntimes(only);
	console.log(`runtimes → ${path.relative(root, runtimes)}/`);
}
