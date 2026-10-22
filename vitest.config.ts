import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// Behaviour tests import the components from "#ui" and the stylesheet from "#ui/styles.css".
// The package project points them at src; the reference project at the reassembled reference
// (npm run reference), so the same specs run on both.
const targets = {
	package: {
		ui: path.join(root, "src/index.ts"),
		styles: path.join(root, "src/styles/index.css"),
	},
	reference: {
		ui: path.join(root, ".cache/reference/src/index.ts"),
		styles: path.join(root, ".cache/reference/styles.css"),
	},
};

// Every Base UI entry point and React, bundled before the first test. When Vite meets an entry
// point mid-run it bundles again, and the test that hit it fails with "Invalid hook call"
// because it gets a second copy of React.
const baseUiExports = (
	JSON.parse(
		fs.readFileSync(
			path.join(root, "node_modules/@base-ui/react/package.json"),
			"utf8",
		),
	) as { exports: Record<string, unknown> }
).exports;
const optimizeDeps = {
	include: [
		"react",
		"react-dom",
		"react-dom/client",
		"react-dom/server",
		"react/jsx-runtime",
		"react/jsx-dev-runtime",
		...Object.keys(baseUiExports)
			.filter(
				(key) =>
					key.startsWith("./") &&
					key !== "./package.json" &&
					key !== "./types" &&
					!key.startsWith("./internals"),
			)
			.map((key) => `@base-ui/react/${key.slice(2)}`),
	],
};

// A fresh object per project: Vitest names each browser instance after its project.
const chromium = () => ({
	enabled: true,
	provider: playwright(),
	headless: true,
	instances: [{ browser: "chromium" as const }],
});

function behaviour(target: keyof typeof targets) {
	return {
		plugins: [react()],
		optimizeDeps,
		resolve: {
			alias: [
				{ find: /^#ui\/styles\.css$/v, replacement: targets[target].styles },
				{ find: /^#ui$/v, replacement: targets[target].ui },
			],
		},
		define: { "import.meta.env.BLUE_GLASS_TARGET": JSON.stringify(target) },
		test: {
			name: `behaviour:${target}`,
			include: ["tests/behaviour/**/*.test.tsx"],
			// The specs measure text in Satoshi, the system's typeface.
			setupFiles: ["tests/behaviour/setup-fonts.ts"],
			browser: chromium(),
		},
	};
}

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "unit",
					environment: "node",
					include: [
						"tests/unit/**/*.test.ts",
						"tests/api/**/*.test.ts",
						"src/**/*.test.ts",
					],
				},
			},
			{
				// Package-only tests that need a real browser: internals and adapters.
				plugins: [react()],
				optimizeDeps,
				test: {
					name: "browser",
					include: ["src/**/*.test.tsx", "tests/browser/**/*.test.tsx"],
					browser: chromium(),
				},
			},
			behaviour("package"),
			behaviour("reference"),
			{
				// Renders every story from .storybook/main.ts's globs, then runs axe on it; the
				// preview's a11y.test is "error", so a violation fails the story. The plugin
				// resolves configDir against the working directory, so it gets an absolute path.
				plugins: [storybookTest({ configDir: path.join(root, ".storybook") })],
				optimizeDeps,
				test: {
					name: "storybook",
					browser: chromium(),
				},
			},
		],
	},
});
