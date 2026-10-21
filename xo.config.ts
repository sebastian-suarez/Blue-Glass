import { type FlatXoConfig } from "xo";
import xoReact from "eslint-config-xo-react";

const xoConfig: FlatXoConfig = [
	{
		// The exported reference stays exactly as the artifact produced it, and the token
		// generator keeps the style of the reference tool it copies, so changes carry over.
		ignores: ["design-system/**", "scripts/build-tokens.mjs"],
	},
	{
		// XO 5 formats with its own Prettier style over .prettierrc. "compat" turns off
		// the rules that clash with Prettier, so .prettierrc stays the source of truth.
		prettier: "compat",
	},
	...xoReact(),
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
		files: ["src/components/**/*.{ts,tsx}"],
		rules: {
			// A component module is named after the component it exports.
			"unicorn/filename-case": [
				"error",
				{ cases: { pascalCase: true, kebabCase: true } },
			],
		},
	},
];

export default xoConfig;
