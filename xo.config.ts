import { type FlatXoConfig } from "xo";

const xoConfig: FlatXoConfig = [
	{
		// XO 5 formats with its own Prettier style over .prettierrc. "compat" turns off
		// the rules that clash with Prettier, so .prettierrc stays the source of truth.
		prettier: "compat",
	},
	{
		files: ["package.json"],
		rules: {
			// Prettier asks for an exact version: even a patch release can change formatting.
			"package-json/dependency-version-range": [
				"error",
				{ exceptions: ["prettier"] },
			],
		},
	},
];

export default xoConfig;
