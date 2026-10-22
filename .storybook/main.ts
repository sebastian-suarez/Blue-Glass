import type { StorybookConfig } from "@storybook/react-vite";
import { satoshiFontFace } from "../scripts/lib/font-face.ts";
import { assertFonts } from "../scripts/lib/fonts.ts";

// Satoshi comes from `npm run fonts`, not the repository (scripts/lib/fonts.ts). Checked here, it
// fails with that advice before Storybook fails on a missing static folder.
// eslint-disable-next-line unicorn/no-top-level-side-effects -- the check has to run when the config loads
assertFonts();

type DocgenProp = {
	readonly declarations?: ReadonlyArray<{ readonly fileName: string }>;
};

const config: StorybookConfig = {
	framework: "@storybook/react-vite",
	stories: [
		"../stories/**/*.mdx",
		"../stories/**/*.stories.tsx",
		"../src/**/*.stories.tsx",
	],
	addons: [
		"@storybook/addon-docs",
		"@storybook/addon-a11y",
		"@storybook/addon-vitest",
	],
	typescript: {
		// Props tables from the TypeScript checker, so a union prop lists its values.
		reactDocgen: "react-docgen-typescript",
		// This object replaces Storybook's defaults, so the first two restate them. Components
		// live in src, and the default **/*.tsx makes the plugin warn about .storybook's files.
		// @ts-expect-error Storybook types this option from the docgen plugin's CommonJS typings, which node16 resolution reads as a namespace, so it narrows to undefined.
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			shouldRemoveUndefinedFromOptional: true,
			include: ["src/**/*.tsx"],
			// The native attributes a component forwards stay out of its table, but a prop it
			// declares itself stays in, even one React's DOM types declare too, like children.
			propFilter: (prop: DocgenProp) =>
				prop.declarations?.some(
					({ fileName }) => !fileName.includes("node_modules"),
				) ?? true,
		},
	},
	// The canvas loads Satoshi from fonts/, which the build copies next to iframe.html.
	staticDirs: [{ from: "../fonts", to: "/fonts" }],
	previewHead: (head) => `${head}\n<style>${satoshiFontFace("fonts")}</style>`,
	features: {
		// The frame paints the canvas colour itself; a backgrounds toolbar would paint over it.
		backgrounds: false,
	},
};

export default config;
