/**
The phase manifest (tests/phases.json) turned into each gate's scope: the modules ported
up to a phase, their exported values and types, and the previews that can run because
every component they use exists by then.
*/
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
	componentNames,
	exportsByModule,
	ownerOfModule,
	previewUses,
	previews,
	root,
	type Preview,
} from "./reference.ts";

type Manifest = { current: number; phases: Record<string, string[]> };

export type Scope = {
	phase: number;
	modules: Set<string>;
	values: Set<string>;
	types: Set<string>;
	previews: Preview[];
};

export function readManifest(): Manifest {
	return JSON.parse(
		fs.readFileSync(path.join(root, "tests/phases.json"), "utf8"),
	) as Manifest;
}

/**
The phase gates run at: BLUE_GLASS_PHASE when it's set, else the manifest's `current`.
*/
export function currentPhase(): number {
	const fromEnvironment = process.env.BLUE_GLASS_PHASE;
	return fromEnvironment === undefined
		? readManifest().current
		: Number(fromEnvironment);
}

/**
Map of component folder to the phase that ports it.
*/
export function phaseOfModule(): Map<string, number> {
	const map = new Map<string, number>();
	for (const [phase, modules] of Object.entries(readManifest().phases)) {
		for (const name of modules) {
			if (map.has(name)) {
				throw new Error(`${name} is listed in two phases`);
			}

			map.set(name, Number(phase));
		}
	}

	const missing = componentNames().filter((name) => !map.has(name));
	if (missing.length > 0) {
		throw new Error(`Not in any phase: ${missing.join(", ")}`);
	}

	return map;
}

/**
A preview can run once its own component and every component its script uses exist.
Section previews also wait for the site set.
*/
function canRun(
	preview: Preview,
	modules: Set<string>,
	values: Set<string>,
	phase: number,
): boolean {
	const isWaiting =
		(preview.kind === "component" && !modules.has(preview.name)) ||
		(preview.kind === "section" && phase < 1);
	return (
		!isWaiting && previewUses(preview.file).every((value) => values.has(value))
	);
}

/**
Everything in scope at `phase`, cumulatively.
*/
export function scope(phase = currentPhase()): Scope {
	const modules = new Set(
		phaseOfModule()
			.entries()
			.filter(([, modulePhase]) => modulePhase <= phase)
			.map(([name]) => name),
	);
	const owners = ownerOfModule();
	const values = new Set<string>();
	const types = new Set<string>();
	for (const [modulePath, surface] of exportsByModule()) {
		const owner = owners.get(modulePath);
		if (owner === undefined || !modules.has(owner)) {
			continue;
		}

		for (const value of surface.values) {
			values.add(value);
		}

		for (const type of surface.types) {
			types.add(type);
		}
	}

	return {
		phase,
		modules,
		values,
		types,
		previews: previews().filter((preview) =>
			canRun(preview, modules, values, phase),
		),
	};
}
