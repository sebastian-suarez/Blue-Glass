import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

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
			setupFiles: ["tests/behaviour/setup-fonts.ts"],
			browser: chromium(),
		},
	};
}

export default defineConfig({
	test: {
		fsModuleCache: false,
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
