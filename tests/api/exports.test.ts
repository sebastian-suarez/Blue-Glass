/**
The export names half of the API gate: src/index.ts exports every documented value and type
in the phase's scope (BLUE_GLASS_PHASE overrides tests/phases.json), each value is defined,
and nothing else is exported unless tests/api/allowlist.json gives the reason.
*/
import path from "node:path";
import { expect, test } from "vitest";
import { readAllowlist } from "../../scripts/api/allowlist.ts";
import { exportProblems } from "../../scripts/api/exports.ts";
import { listExports } from "../../scripts/api/surface.ts";
import { scope } from "../../scripts/lib/phases.ts";
import { root } from "../../scripts/lib/reference.ts";
import * as runtime from "../../src/index.ts";

const inScope = scope();

test(`src/index.ts exports the documented API of phase ${inScope.phase}`, () => {
	const exported = listExports(path.join(root, "src/index.ts"));
	expect(
		exportProblems(inScope, { ...exported, runtime }, readAllowlist()),
	).toEqual([]);
});
