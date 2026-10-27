export const satoshiFile = "Satoshi-Variable.woff2";

export function satoshiFontFace(folder: string): string {
	return `@font-face { font-family: "Satoshi"; src: url("${folder}/${satoshiFile}") format("woff2"); font-weight: 300 900; font-style: normal; font-display: swap; }`;
}
