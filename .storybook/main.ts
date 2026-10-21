import type { StorybookConfig } from "@storybook/react-vite";

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
	features: {
		// The frame paints the canvas colour itself; a backgrounds toolbar would paint over it.
		backgrounds: false,
	},
};

export default config;
