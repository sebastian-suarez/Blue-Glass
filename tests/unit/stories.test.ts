/**
The stories guard (stories/README.md). A component's Default story lists in
parameters.controls.include the args it renders through, and changing any one of them changes its
server HTML. Every other story turns Controls off, so no panel offers a control that does nothing.
Each stories file tests/ssr/layout.json lists by the current phase has a story pinned to the phone
viewport, so its axe test runs at 390px too. tests/unit/stories.json holds the exemptions.
*/
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
import { type CsfModule, failing, passing } from "./fixtures/stories.tsx";

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

/**
The annotations the guard reads straight from a stories module: the inferred argTypes on a
composed story cover every arg, so only these say which ones the story declares.
*/
type Annotations = {
	readonly component?: { readonly name?: string };
	readonly argTypes?: Readonly<Record<string, unknown>>;
};

/**
A component's props, each with its options when its type is a union of literals.
*/
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

/**
A prop's options, when its type is a union of string, number or boolean literals.
*/
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

/**
A component's props, from the type of its first parameter. Undefined for an export that isn't a
component: no call signature, or a name that doesn't start with a capital.
*/
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

/**
The props of every component src/components and the guard's fixtures export, read from their
types as Storybook's docgen reads them for the Controls panel: a union of literals gives a prop
its options.
*/
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

const render = (story: ComposedStory, args: Record<string, unknown> = {}) =>
	renderToString(createElement(story, args));

const controlsOf = (story: ComposedStory) =>
	(story.parameters.controls ?? {}) as Controls;

/**
Another value of the arg's type: the next of its options, or a flipped boolean, a moved number, a
longer string. Undefined when the arg has none of those.
*/
function changed(value: unknown, options?: readonly unknown[]): unknown {
	const other = options?.find((option) => option !== value);
	if (other !== undefined) {
		return other;
	}

	if (typeof value === "boolean") {
		return !value;
	}

	if (typeof value === "number") {
		return value + 1;
	}

	return typeof value === "string" ? `${value} changed` : undefined;
}

/**
What's wrong with a stories module's Controls. In a component's file, Default lists the args it
renders through, and each one changes its server HTML; every other story turns Controls off. In a
docs or section file, every story does.
*/
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

	const keys = include.map(String);
	const annotations = module as Record<string, Annotations | undefined>;
	const name = annotations.default?.component?.name ?? "";
	const props = componentProps.get(name);
	if (props === undefined) {
		return [...problems, "no props found for the meta's component"];
	}

	const base = render(story);
	if (render(story) !== base) {
		return [...problems, "Default renders differently each time"];
	}

	for (const key of keys) {
		// The story's own argTypes win, as in the panel; a prop's own options come next.
		const declared =
			annotations.default?.argTypes?.[key] ??
			annotations.Default?.argTypes?.[key];
		if (declared === undefined && !props.has(key)) {
			problems.push(`${key} isn't a prop of ${name}, so it needs argTypes`);
			continue;
		}

		const next = changed(
			story.args[key],
			story.argTypes[key]?.options ?? props.get(key),
		);
		if (next === undefined) {
			problems.push(`${key} has no boolean, number or string value`);
		} else if (
			exemption.afterHydration?.[key] === undefined &&
			render(story, { [key]: next }) === base
		) {
			problems.push(`${key} doesn't change the render`);
		}
	}

	for (const key of Object.keys(exemption.afterHydration ?? {})) {
		if (!keys.includes(key)) {
			problems.push(`the allowlist names ${key}, which Default doesn't list`);
		}
	}

	return problems;
}

describe("the guard's fixtures", () => {
	test.each(Object.entries(failing))(
		"%s fails",
		(_name, { module, problem }) => {
			expect(controlProblems(module)).toContain(problem);
		},
	);

	test.each(Object.entries(passing))("%s passes", (_name, module) => {
		expect(controlProblems(module)).toEqual([]);
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
	)("%s has a story pinned to phone", async (file) => {
		const stories = Object.values(compose(await load(file)));
		const pinned = stories.filter(
			(story) =>
				(story.globals.viewport as { value?: string } | undefined)?.value ===
				"phone",
		);
		expect(pinned.length).toBeGreaterThan(0);
	});
});
