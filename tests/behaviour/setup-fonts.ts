import { satoshiFontFace } from "../../scripts/lib/font-face.ts";

const style = document.createElement("style");
style.textContent = satoshiFontFace("/fonts");
document.head.append(style);
const faces = await document.fonts.load('400 16px "Satoshi"');
if (faces.length === 0) {
	throw new Error("Satoshi didn't load: run `npm run fonts`.");
}
