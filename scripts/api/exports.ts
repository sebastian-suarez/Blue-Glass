import { phaseOfModule, type Scope } from "../lib/phases.ts";
import { exportsByModule, ownerOfModule } from "../lib/reference.ts";
import { type Allowlist } from "./allowlist.ts";

export type Exported = {
	values: Set<string>;
	types: Set<string>;
	runtime?: Record<string, unknown>;
};

function documentedNames(): Map<string, string> {
	const owners = ownerOfModule();
	const phases = phaseOfModule();
	const names = new Map<string, string>();
	for (const [modulePath, { values, types }] of exportsByModule()) {
		const owner = owners.get(modulePath) ?? modulePath;
		for (const name of [...values, ...types]) {
			names.set(name, `${owner}, phase ${phases.get(owner) ?? "?"}`);
		}
	}

	return names;
}

export function exportProblems(
	scope: Scope,
	exported: Exported,
	allowlist: Allowlist,
): string[] {
	const documented = documentedNames();
	const { runtime } = exported;
	const problems: string[] = [];
	const missing = (name: string, kind: string, other: Set<string>) =>
		`${name} (${documented.get(name)}): the documented ${kind} isn't exported${other.has(name) ? `, only as a ${kind === "value" ? "type" : "value"}` : ""}`;
	for (const name of scope.values) {
		if (!exported.values.has(name)) {
			problems.push(missing(name, "value", exported.types));
		}
	}

	for (const name of scope.types) {
		if (!exported.types.has(name)) {
			problems.push(missing(name, "type", exported.values));
		}
	}

	const atRuntime = Object.keys(runtime ?? {});
	for (const name of new Set([...exported.values, ...atRuntime])) {
		if (runtime !== undefined && runtime[name] === undefined) {
			problems.push(`${name}: exported, but undefined at runtime`);
		}
	}

	const all = new Set([...exported.values, ...exported.types, ...atRuntime]);
	for (const name of all) {
		if (!documented.has(name) && !allowlist.exports.has(name)) {
			problems.push(
				`${name}: exported, but design-system/source/index.d.ts doesn't have it. Stop exporting it, or list it in tests/api/allowlist.json with the reason.`,
			);
		}
	}

	for (const name of allowlist.exports.keys()) {
		if (documented.has(name)) {
			problems.push(
				`${name}: documented, so tests/api/allowlist.json doesn't need it`,
			);
		} else if (!all.has(name)) {
			problems.push(
				`${name}: listed in tests/api/allowlist.json, but not exported any more`,
			);
		}
	}

	return problems;
}
