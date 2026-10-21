/**
The export names half of the API gate (tests/api/exports.test.ts): the package exports every
documented value and type in scope, its values are defined at runtime, and it exports
nothing else unless tests/api/allowlist.json gives the reason.
*/
import { phaseOfModule, type Scope } from "../lib/phases.ts";
import { exportsByModule, ownerOfModule } from "../lib/reference.ts";
import { type Allowlist } from "./allowlist.ts";

export type Exported = {
	/**
	Names with a runtime meaning, and names with a type meaning (a name can have both).
	*/
	values: Set<string>;
	types: Set<string>;
	/**
	The imported module, to check that each value is defined. Fixtures have no runtime.
	*/
	runtime?: Record<string, unknown>;
};

/**
Where each documented name comes from, for messages: "Button (phase 1)".
*/
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

/**
Everything wrong with `exported` at `scope`, one readable line each. Empty means it passes.
*/
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

	// A placeholder is as bad as a missing export, in scope or ahead of it.
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
