import fs from "node:fs";
import path from "node:path";
import { root } from "../lib/reference.ts";

export const allowlistFile = path.join(root, "tests/api/allowlist.json");

export type Allowlist = {
	exports: Map<string, string>;
	checks: Map<string, string>;
};

function reasons(json: unknown, key: string): Map<string, string> {
	const section =
		typeof json === "object" && json !== null
			? (json as Record<string, unknown>)[key]
			: undefined;
	if (typeof section !== "object" || section === null) {
		throw new Error(`tests/api/allowlist.json needs an object "${key}"`);
	}

	const map = new Map<string, string>();
	for (const [name, reason] of Object.entries(section)) {
		if (typeof reason !== "string" || reason.trim() === "") {
			throw new Error(
				`tests/api/allowlist.json: ${key}.${name} needs a reason, as a string`,
			);
		}

		map.set(name, reason);
	}

	return map;
}

export function readAllowlist(file = allowlistFile): Allowlist {
	const json = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
	return { exports: reasons(json, "exports"), checks: reasons(json, "checks") };
}
