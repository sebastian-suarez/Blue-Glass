import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
	fontsDirectory,
	hasSatoshi,
	satoshiPath,
	satoshiSha256,
	satoshiSource,
	sha256,
} from "./lib/fonts.ts";
import { root } from "./lib/reference.ts";

const target = path.relative(root, satoshiPath);

if (hasSatoshi()) {
	console.log(`${target} is up to date.`);
} else {
	const response = await fetch(satoshiSource.url, {
		signal: AbortSignal.timeout(60_000),
	});
	if (!response.ok) {
		throw new Error(`Fontshare answered ${response.status} for Satoshi.`);
	}

	const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "satoshi-"));
	try {
		const zip = path.join(temporary, "satoshi.zip");
		fs.writeFileSync(zip, new Uint8Array(await response.arrayBuffer()));
		const file = execFileSync("unzip", ["-p", zip, satoshiSource.member], {
			maxBuffer: 16 * 1024 * 1024,
		});
		const hash = sha256(file);
		if (hash !== satoshiSha256) {
			throw new Error(
				`Fontshare's ${path.basename(satoshiPath)} isn't the recorded release (sha256 ${hash}). Take a new release on purpose: see satoshiSha256 in scripts/lib/fonts.ts.`,
			);
		}

		fs.mkdirSync(fontsDirectory, { recursive: true });
		fs.writeFileSync(satoshiPath, file);
		console.log(`Downloaded ${target} from Fontshare.`);
	} finally {
		fs.rmSync(temporary, { recursive: true, force: true });
	}
}
