import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { expect, test } from "vitest";
import { currentPhase, readManifest } from "../../scripts/lib/phases.ts";
import { root } from "../../scripts/lib/reference.ts";
import { doesQueryMatch } from "../../scripts/lib/server-render.ts";

test("the ported modules and shared files still match their reference", () => {
	// Throws, failing the test, when check-sync exits 1 after design-system/ changes.
	const output = execFileSync(
		process.execPath,
		[path.join(root, "scripts/check-sync.ts")],
		{
			encoding: "utf8",
		},
	);
	expect(output).toContain("in sync");
});

const nextPhase = String(currentPhase() + 1);
test.skipIf(!Object.hasOwn(readManifest().phases, nextPhase))(
	"the sync check fails on a module in scope that was never recorded",
	() => {
		// The next phase's modules aren't ported, so none of them is recorded yet.
		const result = spawnSync(
			process.execPath,
			[path.join(root, "scripts/check-sync.ts")],
			{
				encoding: "utf8",
				// eslint-disable-next-line @typescript-eslint/naming-convention -- an environment variable
				env: { ...process.env, BLUE_GLASS_PHASE: nextPhase },
			},
		);
		expect(result.status).toBe(1);
		expect(result.stdout).toContain("not recorded");
	},
);

test("server rendering answers media queries for a 1280px desktop reader", () => {
	const desktop = { width: 1280, height: 900 };
	expect(doesQueryMatch("(max-width: 700px)", desktop)).toBe(false);
	expect(doesQueryMatch("@media (min-width: 900px)", desktop)).toBe(true);
	expect(doesQueryMatch("(hover: hover) and (pointer: fine)", desktop)).toBe(
		true,
	);
	expect(doesQueryMatch("(prefers-reduced-motion: reduce)", desktop)).toBe(
		false,
	);
	expect(doesQueryMatch("(hover: none), (max-width: 899px)", desktop)).toBe(
		false,
	);
	expect(
		doesQueryMatch("(hover: none), (max-width: 899px)", {
			width: 390,
			height: 844,
		}),
	).toBe(true);
	expect(doesQueryMatch("not (min-width: 900px)", desktop)).toBe(false);
});
