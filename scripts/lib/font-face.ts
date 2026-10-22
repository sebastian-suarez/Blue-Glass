/**
Satoshi's `@font-face` rule, for every page that renders the system: the gates' pages, Storybook
and the browser tests (scripts/lib/fonts.ts says where the file comes from). One upright variable
file covers the weights the type scale uses, 400 to 600; the system sets nothing in italics. Kept
free of Node imports, so the browser tests can import it.
*/
export const satoshiFile = "Satoshi-Variable.woff2";

/**
The rule, with the file at `folder`, a URL path such as "/fonts".
*/
export function satoshiFontFace(folder: string): string {
	return `@font-face { font-family: "Satoshi"; src: url("${folder}/${satoshiFile}") format("woff2"); font-weight: 300 900; font-style: normal; font-display: swap; }`;
}
