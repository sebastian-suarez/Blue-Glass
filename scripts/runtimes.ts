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
	"react-dom/test-utils": "{}",
};

// eslint-disable-next-line require-unicode-regexp
const reactEntryPoint = /^react(?:-dom)?(?:\/.*)?$/;
// eslint-disable-next-line require-unicode-regexp
const anyPath = /.*/;

export const reactGlobals: Plugin = {
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
