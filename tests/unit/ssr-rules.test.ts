import { expect, test } from "vitest";
import type { Preview } from "../../scripts/lib/reference.ts";
import {
	judge,
	type Observation,
	type Rules,
} from "../../scripts/lib/ssr-rules.ts";

const preview: Preview = {
	id: "components/Dialog",
	kind: "component",
	name: "Dialog",
	file: "/dev/null",
};

const clean: Observation = { clientOnly: [], hydrationErrors: [], shifted: 0 };

const packageRules: Rules = {
	runtime: "package",
	baseline: {
		"components/Dialog": { clientOnly: ["Keep draft"], hydrationErrors: 0 },
	},
	exceptions: {},
};

test("a clean observation passes", () => {
	expect(judge(preview, clean, packageRules).passed).toBe(true);
});

test("text the reference also shows only after JavaScript passes, with a note", () => {
	const result = judge(
		preview,
		{ ...clean, clientOnly: ["Keep draft"] },
		packageRules,
	);
	expect(result.passed).toBe(true);
	expect(result.notes.join(",")).toContain("as in the reference");
});

test("text only the package hides before JavaScript fails", () => {
	const result = judge(
		preview,
		{ ...clean, clientOnly: ["Keep draft", "Delete draft"] },
		packageRules,
	);
	expect(result.passed).toBe(false);
	expect(result.problems.join(",")).toContain("Delete draft");
});

test("an exception allows client-only text, and says why", () => {
	const result = judge(
		preview,
		{ ...clean, clientOnly: ["Delete draft"] },
		{
			...packageRules,
			exceptions: { "components/Dialog": { reason: "by design" } },
		},
	);
	expect(result.passed).toBe(true);
	expect(result.notes.join(",")).toContain("allowed: by design");
});

test("any hydration error fails, even where the reference had one", () => {
	const result = judge(
		preview,
		{ ...clean, hydrationErrors: ["Minified React error #418"] },
		{
			...packageRules,
			baseline: { "components/Dialog": { clientOnly: [], hydrationErrors: 1 } },
		},
	);
	expect(result.passed).toBe(false);
});

test("a server render error fails", () => {
	const result = judge(
		preview,
		{ ...clean, serverError: "document is not defined" },
		packageRules,
	);
	expect(result.problems.join(",")).toContain("server render");
});

test("the reference's qualification counts every client-only text", () => {
	const result = judge(
		preview,
		{ ...clean, clientOnly: ["Keep draft"] },
		{ ...packageRules, runtime: "reference" },
	);
	expect(result.passed).toBe(false);
});
