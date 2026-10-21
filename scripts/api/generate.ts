/**
Writes the API gate's type checks (tests/api/README.md): for every documented type and value
in the phase's scope, one line per check that compiles only while the package keeps the
documented API. Each line ends in `// @check <id> — <what it checks>`, which
scripts/api/compile.ts reads back to name the checks that fail.

Usage: node scripts/api/generate.ts (BLUE_GLASS_PHASE overrides the manifest's phase).

The checks import the documented types as "#api/documented" and the package as
"#api/package"; the tsconfig that compiles them maps both, so the same checks run against
dist/index.d.ts or a test fixture.
*/
import fs from "node:fs";
import path from "node:path";
import { currentPhase, scope } from "../lib/phases.ts";
import { exportsByModule, ownerOfModule, root } from "../lib/reference.ts";
import {
	readSurface,
	type DocumentedType,
	type DocumentedValue,
	type Surface,
	type TypeParameter,
} from "./surface.ts";

export const generatedDirectory = path.join(root, "tests/api/generated");
const assertFile = path.join(root, "tests/api/assert.ts");

type Check = { id: string; description: string; code: string };

class Writer {
	#count = 0;
	readonly checks: Check[] = [];
	readonly declarations: string[] = [];

	name(): string {
		this.#count++;
		return `_${this.#count}`;
	}

	/**
	A type-level check: the alias compiles only if the check holds.
	*/
	type(id: string, description: string, expression: string) {
		this.checks.push({
			id,
			description,
			code: `type ${this.name()} = ${expression};`,
		});
	}

	/**
	A value-level check: JSX or a call that must compile.
	*/
	value(id: string, description: string, expression: string, type = "") {
		this.checks.push({
			id,
			description,
			code: `export const ${this.name()}${type === "" ? "" : `: ${type}`} = ${expression};`,
		});
	}

	/**
	A documented value to feed the checks, typed from the documentation.
	*/
	declare(type: string): string {
		const name = this.name();
		this.declarations.push(`declare const ${name}: ${type};`);
		return name;
	}
}

const quote = (key: string) => JSON.stringify(key);

/**
The type arguments each generic is checked with: its defaults, when it has them, and the
Probe, which nothing else is assignable to. A type can leave its defaults implicit, so each
side's own defaults apply; a component's instantiation expression needs them spelled out.
*/
function instantiations(
	parameters: TypeParameter[],
	{ spellDefaults }: { spellDefaults: boolean },
): string[] {
	if (parameters.length === 0) {
		return [""];
	}

	const probe = parameters.map((parameter) =>
		parameter.constraint === undefined
			? "Probe"
			: `(${parameter.constraint}) & Probe`,
	);
	const hasDefaults = parameters.every(
		(parameter) => parameter.default !== undefined,
	);
	const defaults = spellDefaults
		? `<${parameters.map((parameter) => parameter.default).join(", ")}>`
		: "";
	return [...(hasDefaults ? [defaults] : []), `<${probe.join(", ")}>`];
}

const label = (name: string, typeArguments: string) =>
	`${name}${typeArguments.replaceAll("Doc.", "")}`;

function checkType(writer: Writer, type: DocumentedType) {
	for (const typeArguments of instantiations(type.typeParameters, {
		spellDefaults: false,
	})) {
		const subject = label(type.name, typeArguments);
		const documented = `Doc.${type.name}${typeArguments}`;
		const ours = `Pkg.${type.name}${typeArguments}`;
		writer.type(
			`${subject}#any`,
			"the package's type isn't any",
			`Never<IfAny<${ours}, "is any">>`,
		);
		if (!type.isObject) {
			writer.type(
				`${subject}#assignable`,
				"accepts every documented value",
				`Assignable<${documented}, ${ours}>`,
			);
			continue;
		}

		writer.type(
			`${subject}#keys`,
			"keeps every documented key",
			`Never<MissingKeys<${documented}, ${ours}>>`,
		);
		writer.type(
			`${subject}#required`,
			"requires no key the documentation doesn't have",
			`Never<NewRequiredKeys<${documented}, ${ours}>>`,
		);
		writer.type(
			`${subject}#any-props`,
			"types no documented key as any",
			`Never<AnyKeys<${documented}, ${ours}>>`,
		);
		for (const key of type.ownKeys) {
			writer.type(
				`${subject}.${key}`,
				`accepts the documented type of ${key}`,
				`Assignable<Strict<Prop<${documented}, ${quote(key)}>>, Strict<Prop<${ours}, ${quote(key)}>>>`,
			);
		}

		if (!type.hasInheritedKeys) {
			continue;
		}

		const own =
			type.ownKeys.length === 0
				? "never"
				: type.ownKeys.map((key) => quote(key)).join(" | ");
		writer.type(
			`${subject}#inherited`,
			"accepts the documented types of the keys inherited from React's types",
			`Never<IncompatibleKeys<${documented}, ${ours}, Exclude<keyof ${documented}, ${own}>>>`,
		);
	}
}

function checkComponent(
	writer: Writer,
	value: Extract<DocumentedValue, { kind: "component" }>,
) {
	const isGeneric = value.typeParameters.length > 0;
	for (const typeArguments of instantiations(value.typeParameters, {
		spellDefaults: true,
	})) {
		const subject = label(value.name, typeArguments);
		const component = `Pkg.${value.name}${typeArguments}`;
		const documentedProps = `React.ComponentProps<typeof Doc.${value.name}${typeArguments}>`;
		const props = `React.ComponentProps<typeof ${component}>`;
		const documented = writer.declare(documentedProps);
		writer.type(
			`${subject}#any`,
			"the component and its props aren't any",
			`Never<IfAny<typeof ${component}, "the component is any"> | IfAny<${props}, "its props are any">>`,
		);
		writer.type(
			`${subject}#keys`,
			"takes every documented prop",
			`Never<MissingKeys<${documentedProps}, ${props}>>`,
		);
		writer.type(
			`${subject}#any-props`,
			"types no documented prop as any",
			`Never<AnyKeys<${documentedProps}, ${props}>>`,
		);
		writer.type(
			`${subject}#props`,
			"accepts the documented type of every prop, callbacks compared strictly",
			`Never<IncompatibleKeys<${documentedProps}, ${props}>>`,
		);
		writer.value(
			`${subject}#jsx`,
			"compiles in JSX with the documented props",
			`<${component} {...${documented}} />`,
		);
		if (isGeneric) {
			writer.value(
				`${subject}#jsx-inferred`,
				"infers its type arguments in JSX from the documented props",
				`<Pkg.${value.name} {...${documented}} />`,
			);
		}

		if (!value.hasRef) {
			continue;
		}

		writer.type(
			`${subject}#ref`,
			"takes the documented ref",
			`Assignable<Prop<${documentedProps}, "ref">, Prop<${props}, "ref">>`,
		);
		writer.type(
			`${subject}#ref-element`,
			"gives the ref the documented element, or a narrower one",
			`Assignable<RefElement<Prop<${props}, "ref">>, RefElement<Prop<${documentedProps}, "ref">>>`,
		);
	}
}

function checkValue(writer: Writer, value: DocumentedValue) {
	const { name } = value;
	switch (value.kind) {
		case "component": {
			checkComponent(writer, value);
			break;
		}

		case "function": {
			const parameters = writer.declare(`Parameters<typeof Doc.${name}>`);
			writer.type(
				`${name}#any`,
				"has nothing typed any that the documentation doesn't",
				`Never<AnyInSignature<typeof Pkg.${name}, typeof Doc.${name}>>`,
			);
			// The package's function in the documented one's place: it must take every
			// documented call and return what the documentation promises. The reverse
			// would let a narrower parameter through.
			writer.type(
				`${name}#signature`,
				"can stand in for the documented function",
				`Assignable<typeof Pkg.${name}, typeof Doc.${name}>`,
			);
			for (const arity of value.arities) {
				const call = Array.from(
					{ length: arity },
					(_, index) => `${parameters}[${index}]`,
				);
				writer.value(
					`${name}#call/${arity}`,
					`takes the documented call with ${arity} argument${arity === 1 ? "" : "s"} and returns the documented type`,
					`Pkg.${name}(${call.join(", ")})`,
					`ReturnType<typeof Doc.${name}>`,
				);
			}

			break;
		}

		case "constant": {
			writer.type(
				`${name}#any`,
				"isn't any",
				`Never<IfAny<typeof Pkg.${name}, "is any">>`,
			);
			writer.type(
				`${name}#value`,
				"can stand in for the documented value",
				`Assignable<typeof Pkg.${name}, typeof Doc.${name}>`,
			);
			break;
		}
	}
}

/**
The checks for one component folder, as the text of a .tsx module.
*/
function moduleText(
	folder: string,
	names: { types: string[]; values: string[] },
	surface: Surface,
	options: { phase: number; assertImport: string },
): { text: string; checks: number } {
	const writer = new Writer();
	for (const name of names.types) {
		const type = surface.types.get(name);
		if (type === undefined) {
			throw new Error(`The compiler doesn't see the documented type ${name}`);
		}

		checkType(writer, type);
	}

	for (const name of names.values) {
		const value = surface.values.get(name);
		if (value === undefined) {
			throw new Error(`The compiler doesn't see the documented value ${name}`);
		}

		checkValue(writer, value);
	}

	const lines = [
		`// ${folder}: generated by scripts/api/generate.ts for phase ${options.phase}. Don't edit;`,
		"// npm run check:api writes it again. See tests/api/README.md.",
		'import type * as React from "react";',
		'import type * as Doc from "#api/documented";',
		'import * as Pkg from "#api/package";',
		`import type { AnyInSignature, AnyKeys, Assignable, IfAny, IncompatibleKeys, MissingKeys, Never, NewRequiredKeys, Probe, Prop, RefElement, Strict } from ${quote(options.assertImport)};`,
		"",
		...writer.declarations,
		"",
		...writer.checks.map(
			(check) => `${check.code} // @check ${check.id} — ${check.description}`,
		),
		"",
	];
	return { text: lines.join("\n"), checks: writer.checks.length };
}

export type Generated = { phase: number; files: string[]; checks: number };

/**
Writes the checks for everything in scope at `phase` to `directory` (emptied first), one
.tsx file per component folder.
*/
export function generate({
	phase = currentPhase(),
	directory = generatedDirectory,
	surface = readSurface(),
}: { phase?: number; directory?: string; surface?: Surface } = {}): Generated {
	const inScope = scope(phase);
	const owners = ownerOfModule();
	const byFolder = new Map<string, { types: string[]; values: string[] }>();
	for (const [modulePath, { types, values }] of exportsByModule()) {
		const folder = owners.get(modulePath);
		if (folder === undefined || !inScope.modules.has(folder)) {
			continue;
		}

		const entry = byFolder.get(folder) ?? { types: [], values: [] };
		entry.types.push(...types.filter((name) => inScope.types.has(name)));
		entry.values.push(...values.filter((name) => inScope.values.has(name)));
		byFolder.set(folder, entry);
	}

	fs.rmSync(directory, { recursive: true, force: true });
	fs.mkdirSync(directory, { recursive: true });
	let assertImport = path
		.relative(directory, assertFile)
		.replaceAll(path.sep, "/");
	assertImport = assertImport.startsWith(".")
		? assertImport
		: `./${assertImport}`;
	const files: string[] = [];
	let checks = 0;
	for (const [folder, names] of byFolder) {
		const file = path.join(directory, `${folder}.tsx`);
		const module = moduleText(folder, names, surface, { phase, assertImport });
		fs.writeFileSync(file, module.text);
		files.push(file);
		checks += module.checks;
	}

	return { phase, files, checks };
}

if (import.meta.main) {
	const { phase, files, checks } = generate();
	console.log(
		`API checks for phase ${phase}: ${checks} in ${files.length} files → ${path.relative(root, generatedDirectory)}/`,
	);
}
