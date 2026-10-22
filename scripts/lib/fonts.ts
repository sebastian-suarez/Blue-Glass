/**
Satoshi, the system's typeface since 22 Oct 2026, from Fontshare under the ITF Free Font License.
The licence lets a site self-host the font but not pass the files on, through a repository or a
package among other ways, so they're in neither: `npm run fonts` (scripts/fonts.ts) downloads the
official file into fonts/, which git ignores, and checks it against the hash the gates were
recorded with.
*/
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { Frame, Page } from "playwright";
import { satoshiFile } from "./font-face.ts";
import { root } from "./reference.ts";

export const fontsDirectory = path.join(root, "fonts");
export const satoshiPath = path.join(fontsDirectory, satoshiFile);

/**
Fontshare's download of the family, and the file in it.
*/
export const satoshiSource = {
	url: "https://api.fontshare.com/v2/fonts/download/satoshi",
	member: `Satoshi_Complete/Fonts/WEB/fonts/${satoshiFile}`,
};

/**
The release the baselines were recorded with. A new one from Fontshare changes the glyphs every
capture compares, so take it on purpose: update this hash, then run the gates' self-tests again.
*/
export const satoshiSha256 =
	"e739aff9b4d02c264341d6d4872edcda28e79373aeda936f659566a1cd3eb47f";

export function sha256(data: Uint8Array): string {
	return crypto.createHash("sha256").update(data).digest("hex");
}

export function hasSatoshi(): boolean {
	return (
		fs.existsSync(satoshiPath) &&
		sha256(fs.readFileSync(satoshiPath)) === satoshiSha256
	);
}

export function assertFonts(): void {
	if (!hasSatoshi()) {
		throw new Error(
			`${path.relative(root, satoshiPath)} is missing or isn't the recorded release: run \`npm run fonts\`.`,
		);
	}
}

/**
Waits until the page or frame has Satoshi, so nothing is measured or captured in a fallback
face. Fails when no rule declares it or the file doesn't load.
*/
export async function waitForFonts(page: Page | Frame): Promise<void> {
	const isLoaded = await page.evaluate(async () => {
		try {
			const faces = await document.fonts.load('400 16px "Satoshi"');
			return faces.length > 0;
		} catch {
			return false;
		}
	});
	if (!isLoaded) {
		throw new Error(
			"The page didn't load Satoshi: its @font-face or the file is missing.",
		);
	}
}
