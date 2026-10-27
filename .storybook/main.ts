import type { StorybookConfig } from "@storybook/react-vite";
import { satoshiFontFace } from "../scripts/lib/font-face.ts";
import { assertFonts } from "../scripts/lib/fonts.ts";

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
		reactDocgen: "react-docgen-typescript",
		// @ts-expect-error Storybook types this option from the docgen plugin's CommonJS typings, which node16 resolution reads as a namespace, so it narrows to undefined.
		reactDocgenTypescriptOptions: {
			shouldExtractLiteralValuesFromEnum: true,
			shouldRemoveUndefinedFromOptional: true,
			include: ["src/**/*.tsx"],
			propFilter: (prop: DocgenProp) =>
				prop.declarations?.some(
					({ fileName }) => !fileName.includes("node_modules"),
				) ?? true,
		},
	},
	staticDirs: [{ from: "../fonts", to: "/fonts" }],
	previewHead: (head) => `${head}\n<style>${satoshiFontFace("fonts")}</style>`,
	features: {
		backgrounds: false,
	},
};

export default config;
