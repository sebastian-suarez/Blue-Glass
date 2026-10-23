import { type FlatXoConfig } from "xo";
import xoReact from "eslint-config-xo-react";

const xoConfig: FlatXoConfig = [
	{
		ignores: ["design-system/**", "scripts/build-tokens.mjs"],
	},
	{
		ignores: ["tests/consumer/**"],
	},
	{
		prettier: "compat",
	},
	...xoReact({ prettier: "compat" }),
	{
		files: ["package.json"],
		rules: {
			"package-json/dependency-version-range": [
				"error",
				{ exceptions: ["prettier", "mermaid"] },
			],
		},
	},
	{
		files: [
			"src/**/*.{ts,tsx}",
			"tests/**/*.{ts,tsx}",
			".storybook/**/*.{ts,tsx}",
			"stories/**/*.{ts,tsx}",
		],
		rules: {
			"unicorn/no-null": "off",
			"@typescript-eslint/no-restricted-types": "off",
			"unicorn/prefer-global-this": "off",
		},
	},
	{
		files: ["scripts/**/*.ts"],
		rules: {
			"unicorn/isolated-functions": [
				"error",
				{
					overrideGlobals: {
						document: "readonly",
						window: "readonly",
						getComputedStyle: "readonly",
						requestAnimationFrame: "readonly",
						// eslint-disable-next-line @typescript-eslint/naming-convention
						NodeFilter: "readonly",
					},
				},
			],
			"unicorn/no-null": "off",
			"@typescript-eslint/no-restricted-types": "off",
		},
	},
	{
		files: ["src/**/*.{ts,tsx}", "stories/**/*.tsx", ".storybook/**/*.tsx"],
		rules: {
			"jsx-a11y-x/no-noninteractive-element-to-interactive-role": [
				"error",
				{
					ul: [
						"listbox",
						"menu",
						"menubar",
						"radiogroup",
						"tablist",
						"tree",
						"treegrid",
					],
					ol: [
						"listbox",
						"menu",
						"menubar",
						"radiogroup",
						"tablist",
						"tree",
						"treegrid",
					],
					li: [
						"menuitem",
						"menuitemradio",
						"menuitemcheckbox",
						"option",
						"row",
						"tab",
						"treeitem",
					],
					table: ["grid"],
					td: ["gridcell"],
					fieldset: ["radiogroup", "presentation"],
				},
			],
			"jsx-a11y-x/no-noninteractive-tabindex": [
				"error",
				{ tags: [], roles: ["tabpanel"], allowExpressionValues: true },
			],
		},
	},
	{
		files: ["src/**/*.{ts,tsx}"],
		rules: {
			"require-unicode-regexp": ["error", { requireFlag: "u" }],
		},
	},
	{
		files: ["src/components/**/*.{ts,tsx}"],
		rules: {
			"unicorn/filename-case": [
				"error",
				{ cases: { pascalCase: true, kebabCase: true } },
			],
		},
	},
	{
		files: ["stories/**/*.stories.tsx"],
		rules: {
			"unicorn/filename-case": [
				"error",
				{ cases: { pascalCase: true, kebabCase: true } },
			],
		},
	},
];

export default xoConfig;
