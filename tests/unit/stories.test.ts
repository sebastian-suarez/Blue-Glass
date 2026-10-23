import fs from "node:fs";
import path from "node:path";
import {
	composeStories,
	type composeStory,
	setProjectAnnotations,
} from "@storybook/react-vite";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import ts from "typescript";
import { describe, expect, test } from "vitest";
import preview from "../../.storybook/preview.tsx";
import { currentPhase } from "../../scripts/lib/phases.ts";
import { viewports } from "../../scripts/lib/viewports.ts";
import * as fixtureExports from "./fixtures/stories.tsx";
import {
	type CsfModule,
	failing,
	passing,
	phoneFailing,
	phonePassing,
} from "./fixtures/stories.tsx";

setProjectAnnotations(preview);

type Exemption = {
	readonly noControls?: string;
	readonly afterHydration?: Readonly<Record<string, string>>;
};

type Allowlist = {
	readonly noControls: Readonly<Record<string, string>>;
	readonly afterHydration: Readonly<Record<string, Record<string, string>>>;
};

type ComposedStory = ReturnType<typeof composeStory>;

const compose = (module: CsfModule) =>
	composeStories(module as Parameters<typeof composeStories>[0]) as Record<
		string,
		ComposedStory
	>;

type Controls = { readonly disable?: boolean; readonly include?: unknown };

type Annotations = {
	readonly component?: unknown;
	readonly argTypes?: Readonly<Record<string, unknown>>;
};

type Props = ReadonlyMap<string, readonly unknown[] | undefined>;

const root = path.resolve(import.meta.dirname, "../..");
const read = <T>(file: string) =>
	JSON.parse(fs.readFileSync(path.join(root, file), "utf8")) as T;

const allowlist = read<Allowlist>("tests/unit/stories.json");
const layout = read<{
	stories: Array<{ file: string; phase: number }>;
}>("tests/ssr/layout.json");

const loaders = import.meta.glob<CsfModule>([
	"../../src/components/*/*.stories.tsx",
	"../../stories/**/*.stories.tsx",
]);
const modules = new Map(
	Object.entries(loaders).map(([key, loader]) => [
		path.relative(root, path.resolve(import.meta.dirname, key)),
		loader,
	]),
);
const files = modules.keys().toArray().toSorted();
const componentFiles = files.filter((file) => file.startsWith("src/"));
const docsFiles = files.filter((file) => !file.startsWith("src/"));

async function load(file: string): Promise<CsfModule> {
	const loader = modules.get(file);
	if (loader === undefined) {
		throw new Error(`No stories file ${file}`);
	}

	return loader();
}

const notLiteral = Symbol("not a literal");

function literalOptions(
	checker: ts.TypeChecker,
	type: ts.Type,
): readonly unknown[] | undefined {
	if (!type.isUnion()) {
		return undefined;
	}

	const values = type.types.map((member): unknown => {
		if (member.isStringLiteral() || member.isNumberLiteral()) {
			return member.value;
		}

		const text = checker.typeToString(member);
		return text === "true" || text === "false" ? text === "true" : notLiteral;
	});
	return values.includes(notLiteral) ? undefined : values;
}

function propsOf(
	checker: ts.TypeChecker,
	symbol: ts.Symbol,
): Props | undefined {
	const [parameter] =
		checker.getTypeOfSymbol(symbol).getCallSignatures()[0]?.parameters ?? [];
	const initial = symbol.name.charAt(0);
	if (parameter === undefined || initial === initial.toLowerCase()) {
		return undefined;
	}

	return new Map(
		checker
			.getTypeOfSymbol(parameter)
			.getProperties()
			.map((prop) => [
				prop.name,
				literalOptions(
					checker,
					checker.getNonNullableType(checker.getTypeOfSymbol(prop)),
				),
			]),
	);
}

function readProps(): ReadonlyMap<string, Props> {
	const config = ts.getParsedCommandLineOfConfigFile(
		path.join(root, "tsconfig.json"),
		{},
		{
			...ts.sys,
			onUnRecoverableConfigFileDiagnostic(diagnostic) {
				throw new Error(
					ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
				);
			},
		},
	);
	const sources = [
		...ts.sys.readDirectory(path.join(root, "src/components"), [".tsx"]),
		path.join(root, "tests/unit/fixtures/stories.tsx"),
	].filter((file) => !/\.(?:stories|test|browser\.test)\.tsx$/v.test(file));
	const program = ts.createProgram(sources, config?.options ?? {});
	const checker = program.getTypeChecker();
	const components = new Map<string, Props>();
	for (const file of sources) {
		const source = program.getSourceFile(file);
		const module_ = source && checker.getSymbolAtLocation(source);
		for (const symbol of module_ ? checker.getExportsOfModule(module_) : []) {
			const props = propsOf(checker, symbol);
			if (props !== undefined) {
				components.set(symbol.name, props);
			}
		}
	}

	return components;
}

const componentProps = readProps();

const componentModules = import.meta.glob<Record<string, unknown>>(
	[
		"../../src/components/*/*.tsx",
		"!../../src/components/*/*.stories.tsx",
		"!../../src/components/*/*.test.tsx",
	],
	{ eager: true },
);
const exportNames = new Map<unknown, string>();
for (const module_ of [...Object.values(componentModules), fixtureExports]) {
	for (const [name, value] of Object.entries(module_)) {
		if (!exportNames.has(value)) {
			exportNames.set(value, name);
		}
	}
}

const render = (story: ComposedStory, args: Record<string, unknown> = {}) =>
	renderToString(createElement(story, args));

const controlsOf = (story: ComposedStory) =>
	(story.parameters.controls ?? {}) as Controls;

function alternatives(
	value: unknown,
	options: readonly unknown[] | undefined,
): unknown[] {
	if (options !== undefined) {
		return options.filter((option) => option !== value);
	}

	if (typeof value === "boolean") {
		return [!value];
	}

	if (typeof value === "number") {
		return [value + 1];
	}

	return typeof value === "string" ? [`${value} changed`] : [];
}

const isMountOnly = (key: string) =>
	key.startsWith("default") && key.charAt(7) !== key.charAt(7).toLowerCase();

function controlProblems(
	module: CsfModule,
	{
		component = true,
		exemption = {},
	}: { component?: boolean; exemption?: Exemption } = {},
): string[] {
	const stories = compose(module);
	const problems = Object.entries(stories)
		.filter(([name]) => !component || name !== "Default")
		.filter(([, story]) => controlsOf(story).disable !== true)
		.map(([name]) => `${name} leaves Controls on`);
	if (!component) {
		return problems;
	}

	const story = stories.Default;
	if (story === undefined) {
		return [...problems, "no Default story"];
	}

	const controls = controlsOf(story);
	if (exemption.noControls !== undefined) {
		return controls.disable === true
			? problems
			: [...problems, "Default leaves Controls on, though it has none"];
	}

	if (controls.disable === true) {
		return [...problems, "Default turns Controls off"];
	}

	const { include } = controls;
	if (!Array.isArray(include) || include.length === 0) {
		return [...problems, "Default lists no args in controls.include"];
	}

	if (story.parameters.__isArgsStory !== true) {
		return [...problems, "Default's render takes no args"];
	}

	const keys = include.map(String);
	const annotations = module as Record<string, Annotations | undefined>;
	const name = exportNames.get(annotations.default?.component) ?? "";
	const props = componentProps.get(name);
	if (props === undefined) {
		return [...problems, "no props found for the meta's component"];
	}

	const base = render(story);
	if (render(story) !== base) {
		return [...problems, "Default renders differently each time"];
	}

	for (const key of keys) {
		problems.push(...argProblems(key, story, props));
	}

	for (const key of Object.keys(exemption.afterHydration ?? {})) {
		if (!keys.includes(key)) {
			problems.push(`the allowlist names ${key}, which Default doesn't list`);
		}
	}

	return problems;

	function argProblems(
		key: string,
		listed: ComposedStory,
		known: Props,
	): string[] {
		if (isMountOnly(key)) {
			return [`${key} is read only at mount, so list the controlled prop`];
		}

		const declared =
			annotations.default?.argTypes?.[key] ??
			annotations.Default?.argTypes?.[key];
		if (declared === undefined && !known.has(key)) {
			return [`${key} isn't a prop of ${name}, so it needs argTypes`];
		}

		const value: unknown = listed.args[key];
		if (value === undefined) {
			return [`${key} has no value in args`];
		}

		const options = listed.argTypes[key]?.options ?? known.get(key);
		const others = alternatives(value, options);
		if (others.length === 0) {
			return [
				options === undefined
					? `${key} has no boolean, number or string value`
					: `${key} has no other option`,
			];
		}

		if (exemption.afterHydration?.[key] !== undefined) {
			return [];
		}

		const seen = new Map<string, unknown>([[base, value]]);
		const dead: string[] = [];
		for (const other of others) {
			const html = render(listed, { [key]: other });
			if (seen.has(html)) {
				dead.push(
					`${JSON.stringify(other)} renders like ${JSON.stringify(seen.get(html))}`,
				);
			} else {
				seen.set(html, other);
			}
		}

		return dead.length === 0
			? []
			: [`${key} doesn't change the render: ${dead.join(", ")}`];
	}
}

const viewportOf = (story: ComposedStory) =>
	(story.globals.viewport as { value?: string } | undefined)?.value;

function phoneProblems(module: CsfModule): string[] {
	const pinned = Object.entries(compose(module)).filter(
		([, story]) => viewportOf(story) === "phone",
	);
	if (pinned.length === 0) {
		return ["no story pinned to phone"];
	}

	return pinned
		.filter(([, story]) => story.tags.includes("autodocs"))
		.map(([name]) => `${name} shows on the docs page`);
}

describe("the guard's fixtures", () => {
	test.each(Object.entries(failing))(
		"%s fails",
		(_name, { module, problem }) => {
			expect(
				controlProblems(module).filter((found) => found.startsWith(problem)),
			).not.toEqual([]);
		},
	);

	test.each(Object.entries(passing))("%s passes", (_name, module) => {
		expect(controlProblems(module)).toEqual([]);
	});

	test.each(Object.entries(phoneFailing))(
		"%s fails the phone check",
		(_name, { module, problem }) => {
			expect(phoneProblems(module)).toContain(problem);
		},
	);

	test("a pinned twin off the docs page passes the phone check", () => {
		expect(phoneProblems(phonePassing)).toEqual([]);
	});
});

describe("Controls act", () => {
	test.each(componentFiles)("%s", async (file) => {
		const exemption = {
			noControls: allowlist.noControls[file],
			afterHydration: allowlist.afterHydration[file],
		};
		expect(controlProblems(await load(file), { exemption })).toEqual([]);
	});

	test.each(docsFiles)("%s", async (file) => {
		expect(controlProblems(await load(file), { component: false })).toEqual([]);
	});

	test("the allowlist names stories files that exist", () => {
		const named = [
			...Object.keys(allowlist.noControls),
			...Object.keys(allowlist.afterHydration),
		];
		expect(named.filter((file) => !componentFiles.includes(file))).toEqual([]);
	});
});

describe("viewports", () => {
	test("the toolbar offers the sizes the gates capture at", () => {
		const options = (
			preview.parameters?.viewport as
				{ options?: Record<string, { styles?: unknown }> } | undefined
		)?.options;
		for (const [name, { width, height }] of Object.entries(viewports)) {
			expect(options?.[name]?.styles).toEqual({
				width: `${width}px`,
				height: `${height}px`,
			});
		}
	});

	const phase = currentPhase();
	test.each(
		layout.stories
			.filter((entry) => entry.phase <= phase)
			.map((entry) => entry.file),
	)("%s has a phone twin off the docs page", async (file) => {
		expect(phoneProblems(await load(file))).toEqual([]);
	});
});
