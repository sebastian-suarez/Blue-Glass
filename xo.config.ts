import { type FlatXoConfig } from "xo";
import xoReact from "eslint-config-xo-react";

const xoConfig: FlatXoConfig = [
	{
		// The exported reference stays exactly as the artifact produced it, and the token
		// generator keeps the style of the reference tool it copies, so changes carry over.
		ignores: ["design-system/**", "scripts/build-tokens.mjs"],
	},
	{
		// The consumer apps stand in for outside projects, with their own dependencies and
		// config, outside the root tsconfig. Their builds in npm run check:package test them.
		ignores: ["tests/consumer/**"],
	},
	{
		// XO 5 formats with its own Prettier style over .prettierrc. "compat" turns off
		// the rules that clash with Prettier, so .prettierrc stays the source of truth.
		prettier: "compat",
	},
	...xoReact({ prettier: "compat" }),
	{
		files: ["package.json"],
		rules: {
			// Exact versions for Prettier, since even a patch release can change formatting,
			// and for Mermaid, since parity compares layouts with the reference's 11.16.1.
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
			// React's own contract uses null: refs are set to null, and components render null.
			"unicorn/no-null": "off",
			"@typescript-eslint/no-restricted-types": "off",
			// This is browser code: `window` is the browser's global, typed as Window.
			"unicorn/prefer-global-this": "off",
		},
	},
	{
		files: ["scripts/**/*.ts"],
		rules: {
			// The browser gates hand callbacks to page.evaluate, which run in the page, where
			// these globals exist. The rule still catches a callback closing over Node values.
			"unicorn/isolated-functions": [
				"error",
				{
					overrideGlobals: {
						document: "readonly",
						window: "readonly",
						getComputedStyle: "readonly",
						requestAnimationFrame: "readonly",
						// A DOM global, named by the DOM.
						// eslint-disable-next-line @typescript-eslint/naming-convention
						NodeFilter: "readonly",
					},
				},
			],
			// The harness drives DOM APIs, whose types use null.
			"unicorn/no-null": "off",
			"@typescript-eslint/no-restricted-types": "off",
		},
	},
	{
		files: ["src/**/*.{ts,tsx}", "stories/**/*.tsx", ".storybook/**/*.tsx"],
		rules: {
			// The plugin's own recommended options. XO's React config drops them, which bans the
			// standard ARIA list patterns the reference uses (ul role="listbox" with li role="option",
			// ul role="menu", ul role="tablist") and the focusable tab panel.
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
			// The published code supports the browsers Base UI does ("Baseline Widely
			// Available" at its last major), and the v flag isn't there yet: Safari 17 added it.
			"require-unicode-regexp": ["error", { requireFlag: "u" }],
		},
	},
	{
		files: ["src/components/**/*.{ts,tsx}"],
		rules: {
			// A component module is named after the component it exports.
			"unicorn/filename-case": [
				"error",
				{ cases: { pascalCase: true, kebabCase: true } },
			],
		},
	},
	{
		files: ["stories/*.stories.tsx"],
		rules: {
			// Like a component's stories, a docs entry's stories are named after what they show.
			"unicorn/filename-case": [
				"error",
				{ cases: { pascalCase: true, kebabCase: true } },
			],
		},
	},
];

export default xoConfig;
