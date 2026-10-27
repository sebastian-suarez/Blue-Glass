import fs from "node:fs";
import path from "node:path";
import { beforeAll, expect, test } from "vitest";
import { type Allowlist } from "../../scripts/api/allowlist.ts";
import {
	compile,
	formatFailures,
	judge,
	type Compiled,
} from "../../scripts/api/compile.ts";
import { exportProblems } from "../../scripts/api/exports.ts";
import { generate } from "../../scripts/api/generate.ts";
import { documentedFile, listExports } from "../../scripts/api/surface.ts";
import { scope } from "../../scripts/lib/phases.ts";
import { root } from "../../scripts/lib/reference.ts";

const out = path.join(root, ".cache/api-gate");
const generated = path.join(out, "generated");
const full = scope(5);
const none: Allowlist = { exports: new Map(), checks: new Map() };

type Expectation = {
	failing: string[] | ((id: string) => boolean);
	says: string[];
};

const mutations: Record<string, Expectation> = {
	props: {
		failing: [
			"ButtonProps#keys",
			"Button#keys",
			"DividerProps#required",
			"Divider#jsx",
			"CardProps#required",
			"Card#jsx",
		],
		says: [
			`Type '"href"' does not satisfy the constraint 'never'`,
			`"label"`,
			`Type '"children"' does not satisfy the constraint 'never'`,
			"Property 'children' is optional in type",
		],
	},
	callback: {
		failing: [
			"CheckboxProps.onChange",
			"Checkbox#props",
			"Checkbox#jsx",
			"ToggleButtonProps.onChange",
			"ToggleButton#props",
		],
		says: [
			"Types of parameters 'event' and 'event' are incompatible",
			"'SyntheticEvent<HTMLInputElement, Event>' is not assignable to type 'ChangeEvent<HTMLInputElement, Element>'",
			"'SyntheticEvent<Element, Event>' is missing the following properties from type 'MouseEvent<HTMLButtonElement, MouseEvent>'",
		],
	},
	any: {
		failing: [
			"BadgeProps#any",
			"Badge#any",
			"ChipProps#any-props",
			"Chip#any-props",
			"ToggleButtonProps#any-props",
			"ToggleButton#any-props",
			"ToggleButton#ref-element",
			"PaneAccordionProps#any-props",
			"useTransition#any",
		],
		says: [
			`Type '"label"' does not satisfy`,
			`"its props are any"`,
			`"onChange(0)"`,
			`"onChange(1)"`,
			`"ref.current"`,
			`Type '"items[]"' does not satisfy`,
			"Type 'RefElementIsAny' is missing the following properties from type 'HTMLButtonElement'",
			`"useTransition(1).current"`,
		],
	},
	"rest-any": {
		failing: [
			"ToggleButtonProps#any-props",
			"ToggleButton#any-props",
			"TabsProps#any-props",
			"Tabs#any-props",
			"useMediaQuery#any",
		],
		says: [`"onChange(0)"`, `"onChange(1)"`, `"useMediaQuery(0)"`],
	},
	refs: {
		failing: [
			"Button#props",
			"Button#jsx",
			"Button#ref",
			"Link#props",
			"Link#ref-element",
		],
		says: [
			"'Ref<HTMLAnchorElement | HTMLButtonElement> | undefined' does not satisfy the constraint 'Ref<HTMLButtonElement> | undefined'",
			"Type 'HTMLElement' is missing the following properties from type 'HTMLAnchorElement'",
		],
	},
	generic: {
		failing: (id) =>
			[
				"AutocompleteProps.options",
				"AutocompleteProps.value",
				"AutocompleteProps.defaultValue",
				"AutocompleteProps.filterOptions",
			].includes(id) ||
			(id.startsWith("Autocomplete<") &&
				id !== "Autocomplete<AutocompleteOption>#jsx-inferred"),
		says: [
			"has no signatures for which the type argument list is applicable",
			"Type 'readonly AutocompleteOption[]' does not satisfy the constraint 'readonly string[]'",
		],
	},
	signatures: {
		failing: [
			"computePosition#signature",
			"computePosition#call/2",
			"computePosition#call/3",
			"media#value",
			"useMediaQuery#signature",
			"useMediaQuery#call/1",
			"useMediaQuery#call/2",
		],
		says: [
			"Expected 2 arguments, but got 1",
			"Type 'PositionResult | undefined' is not assignable to type 'PositionResult'",
			"Property 'reducedTransparency' is missing",
		],
	},
	"missing-export": {
		failing: (id) => /^Divider[#.]/v.test(id),
		says: ["Property 'Divider' does not exist"],
	},
};

function writeExplicitCopy(name: string, without: string[]): string {
	const file = path.join(out, `${name}.d.ts`);
	const from = JSON.stringify(
		path
			.relative(out, documentedFile)
			.replaceAll(path.sep, "/")
			.replace(/\.d\.ts$/v, ".js"),
	);
	const keep = (names: Set<string>) =>
		[...names].filter((each) => !without.includes(each)).join(", ");
	const change = without.length === 0 ? "changes" : without.join(", ");
	fs.writeFileSync(
		file,
		[
			`// The documented API without ${change}, written by tests/api/gate.test.ts.`,
			`export type { ${keep(full.types)} } from ${from};`,
			`export { ${keep(full.values)} } from ${from};`,
			"",
		].join("\n"),
	);
	return file;
}

async function compileAgainst(name: string, packageFile: string) {
	const tsconfig = path.join(out, `${name}.tsconfig.json`);
	const config = {
		extends: path.join(root, "tests/api/tsconfig.json"),
		compilerOptions: {
			paths: {
				"#api/documented": [documentedFile],
				"#api/package": [packageFile],
			},
		},
		include: [path.join(root, "tests/api/assert.ts"), generated],
	};
	fs.writeFileSync(tsconfig, JSON.stringify(config, undefined, "\t"));
	return [name, await compile({ tsconfig, directory: generated })] as const;
}

let results: Record<string, Compiled> = {};

beforeAll(async () => {
	fs.rmSync(out, { recursive: true, force: true });
	generate({ phase: 5, directory: generated });
	const fixtures = Object.keys(mutations).map(async (name) => {
		const file =
			name === "missing-export"
				? writeExplicitCopy(name, ["Divider"])
				: path.join(root, "tests/api/fixtures", `${name}.d.ts`);
		return compileAgainst(name, file);
	});
	results = Object.fromEntries(
		await Promise.all([
			compileAgainst("documented", documentedFile),
			...fixtures,
		]),
	);
}, 120_000);

test("the phase 5 checks cover the whole documented API and pass on it", () => {
	const { ids, failures, errors } = results.documented;
	expect(errors).toEqual([]);
	expect(failures).toEqual([]);
	const subjects = new Set(ids.map((id) => /^[^#.<]+/v.exec(id)?.[0]));
	expect(subjects.size).toBe(full.types.size + full.values.size);
});

test.each(Object.entries(mutations))(
	"the %s fixture fails exactly the checks that cover its break",
	(name, { failing, says }) => {
		const { ids, failures, errors } = results[name];
		expect(errors).toEqual([]);
		const byName = (a: string, b: string) => a.localeCompare(b);
		const failed = [...new Set(failures.map((failure) => failure.id))].toSorted(
			byName,
		);
		const expected = Array.isArray(failing)
			? failing.toSorted(byName)
			: ids.filter((id) => failing(id)).toSorted(byName);
		expect(expected.length).toBeGreaterThan(0);
		expect(failed).toEqual(expected);
		const report = formatFailures(failures);
		for (const text of says) {
			expect(report).toContain(text);
		}
	},
);

test("a waiver lets its check fail, and fails itself once the check passes", () => {
	const allowlist: Allowlist = {
		exports: new Map(),
		checks: new Map([
			["ButtonProps#keys", "href moved to LinkButton (docs/deviations.md)."],
			["Button#keys", "href moved to LinkButton (docs/deviations.md)."],
			["Chip#jsx", "A deviation that was undone."],
		]),
	};
	const { failures, waived, stale } = judge(results.props, allowlist);
	expect(
		failures
			.map((failure) => failure.id)
			.toSorted((a, b) => a.localeCompare(b)),
	).toEqual([
		"Card#jsx",
		"CardProps#required",
		"Divider#jsx",
		"DividerProps#required",
	]);
	expect(waived.map(({ id }) => id)).toEqual([
		"ButtonProps#keys",
		"Button#keys",
	]);
	expect(stale).toEqual(["Chip#jsx"]);
});

test("the export check passes on the documented API and names what's missing", () => {
	const documented = listExports(writeExplicitCopy("all-exports", []));
	expect(exportProblems(full, documented, none)).toEqual([]);
	const missing = listExports(writeExplicitCopy("no-divider", ["Divider"]));
	expect(exportProblems(full, missing, none)).toEqual([
		"Divider (Divider, phase 1): the documented value isn't exported",
	]);
});

test("the export check catches placeholders, type-only values and undocumented names", () => {
	const values = new Set(full.values);
	values.delete("Chip");
	const exported = {
		values: new Set([...values, "internalHelper"]),
		types: new Set([...full.types, "Chip"]),
		runtime: Object.fromEntries(
			[...values, "internalHelper"].map((name) => [
				name,
				name === "Button" ? undefined : () => null,
			]),
		),
	};
	expect(exportProblems(full, exported, none)).toEqual([
		"Chip (Chip, phase 1): the documented value isn't exported, only as a type",
		"Button: exported, but undefined at runtime",
		"internalHelper: exported, but design-system/source/index.d.ts doesn't have it. Stop exporting it, or list it in tests/api/allowlist.json with the reason.",
	]);
	const allowlist: Allowlist = {
		exports: new Map([
			["internalHelper", "Shared by the portfolio's own islands."],
			["Gone", "No longer exported."],
			["Button", "Documented already."],
		]),
		checks: new Map(),
	};
	expect(
		exportProblems(full, exported, allowlist).filter(
			(problem) => !problem.startsWith("Chip") && !problem.includes("runtime"),
		),
	).toEqual([
		"Gone: listed in tests/api/allowlist.json, but not exported any more",
		"Button: documented, so tests/api/allowlist.json doesn't need it",
	]);
});
