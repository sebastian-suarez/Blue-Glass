import { expect, test } from "vitest";
import type { Preview } from "../../scripts/lib/reference.ts";
import {
	judge,
	missingTexts,
	type Observation,
	type Rules,
} from "../../scripts/lib/ssr-rules.ts";

const preview: Preview = {
	id: "components/Dialog",
	kind: "component",
	name: "Dialog",
	file: "/dev/null",
};

const clean: Observation = {
	hidden: [],
	absent: [],
	hydrationErrors: [],
	pageErrors: [],
	shifted: 0,
};

const packageRules: Rules = {
	runtime: "package",
	baseline: {
		"components/Dialog": {
			hidden: ["Fading in"],
			absent: ["Keep draft"],
			hydrationErrors: 0,
		},
	},
	exceptions: {},
};

test("a clean observation passes", () => {
	expect(judge(preview, clean, packageRules).passed).toBe(true);
});

test("text the reference's server HTML also lacks passes, with a note", () => {
	const result = judge(
		preview,
		{ ...clean, absent: ["Keep draft"] },
		packageRules,
	);
	expect(result.passed).toBe(true);
	expect(result.notes.join(",")).toContain(
		"didn't show before JavaScript either",
	);
});

test("text only the package's server HTML lacks fails", () => {
	const result = judge(
		preview,
		{ ...clean, absent: ["Keep draft", "Delete draft"] },
		packageRules,
	);
	expect(result.passed).toBe(false);
	expect(result.problems.join(",")).toContain("Delete draft");
});

test("text the server HTML hides fails, even where the reference hid it too", () => {
	const result = judge(
		preview,
		{ ...clean, hidden: ["Fading in"] },
		packageRules,
	);
	expect(result.passed).toBe(false);
	expect(result.problems.join(",")).toContain("hidden until JavaScript");
});

test("text the reference held but hid may not be left out of the package's server HTML", () => {
	const result = judge(
		preview,
		{ ...clean, absent: ["Fading in"] },
		packageRules,
	);
	expect(result.passed).toBe(false);
	expect(result.problems.join(",")).toContain("Fading in");
});

test("each copy the reference lacked excuses one missing copy", () => {
	const once = judge(
		preview,
		{ ...clean, absent: ["Keep draft"] },
		packageRules,
	);
	const twice = judge(
		preview,
		{ ...clean, absent: ["Keep draft", "Keep draft"] },
		packageRules,
	);
	expect(once.passed).toBe(true);
	expect(twice.passed).toBe(false);
});

test("a visible copy of a text doesn't stand in for its hidden copy", () => {
	// The Transitions preview: each label inside a transition that starts invisible, and again
	// as a visible caption.
	expect(
		missingTexts(
			["Fade", "Fade", "Grow"],
			["Fade", "Grow"],
			["Fade", "Fade", "Grow"],
		),
	).toEqual({ hidden: ["Fade"], absent: [] });
});

test("missing copies are hidden while the server HTML holds them, absent after", () => {
	expect(missingTexts(["Retry", "Retry", "Retry"], [], ["Retry"])).toEqual({
		hidden: ["Retry"],
		absent: ["Retry", "Retry"],
	});
	expect(
		missingTexts(["Retry"], ["Retry", "Retry"], ["Retry", "Retry"]),
	).toEqual({
		hidden: [],
		absent: [],
	});
});

test("an exception without texts excuses every text, and says why", () => {
	const result = judge(
		preview,
		{ ...clean, hidden: ["Fading in"], absent: ["Delete draft"] },
		{
			...packageRules,
			exceptions: { "components/Dialog": { reason: "by design" } },
		},
	);
	expect(result.passed).toBe(true);
	expect(result.notes.join(",")).toContain("allowed: by design");
});

test("an exception with texts excuses only those", () => {
	const result = judge(
		preview,
		{ ...clean, hidden: ["Scroll sideways", "Delete the draft?"] },
		{
			...packageRules,
			exceptions: {
				"components/Dialog": {
					reason: "measured on the client",
					texts: ["Scroll sideways"],
				},
			},
		},
	);
	expect(result.passed).toBe(false);
	expect(result.problems.join(",")).toContain("Delete the draft?");
	expect(result.problems.join(",")).not.toContain("Scroll sideways");
	expect(result.notes.join(",")).toContain("allowed: measured on the client");
});

test("any page error fails, whatever it says", () => {
	const result = judge(
		preview,
		{
			...clean,
			pageErrors: ["hydrated page: pageerror: Minified React error #31"],
		},
		packageRules,
	);
	expect(result.passed).toBe(false);
});

test("any hydration error fails, even where the reference had one", () => {
	const result = judge(
		preview,
		{ ...clean, hydrationErrors: ["Minified React error #418"] },
		{
			...packageRules,
			baseline: {
				"components/Dialog": { hidden: [], absent: [], hydrationErrors: 1 },
			},
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

test("the reference's qualification counts every absent and hidden text", () => {
	const result = judge(
		preview,
		{ ...clean, absent: ["Keep draft"] },
		{ ...packageRules, runtime: "reference" },
	);
	expect(result.passed).toBe(false);
});
