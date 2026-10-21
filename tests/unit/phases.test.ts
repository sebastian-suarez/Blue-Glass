import { expect, test } from "vitest";
import { phaseOfModule, scope } from "../../scripts/lib/phases.ts";
import {
	componentNames,
	exportsByModule,
	previews,
} from "../../scripts/lib/reference.ts";

const byName = (a: string, b: string) => a.localeCompare(b);

test("every reference module is in exactly one phase", () => {
	expect(phaseOfModule().keys().toArray().toSorted(byName)).toEqual(
		componentNames(),
	);
});

test("phase 5 covers the whole reference", () => {
	const surfaces = exportsByModule().values().toArray();
	const full = scope(5);
	expect(full.modules.size).toBe(66);
	expect(full.values.size).toBe(
		surfaces.flatMap((surface) => surface.values).length,
	);
	expect(full.types.size).toBe(
		surfaces.flatMap((surface) => surface.types).length,
	);
	expect(full.previews.map((preview) => preview.id).toSorted(byName)).toEqual(
		previews()
			.map((preview) => preview.id)
			.toSorted(byName),
	);
});

test("each phase's scope contains the previous one's", () => {
	for (let phase = 1; phase <= 5; phase++) {
		const before = scope(phase - 1);
		const after = scope(phase);
		expect(before.modules.isSubsetOf(after.modules)).toBe(true);
		const ids = new Set(after.previews.map((preview) => preview.id));
		expect(before.previews.every((preview) => ids.has(preview.id))).toBe(true);
	}
});

test("phase 0 has nothing in scope", () => {
	const empty = scope(0);
	expect(empty.modules.size + empty.values.size + empty.previews.length).toBe(
		0,
	);
});
