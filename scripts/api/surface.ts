import path from "node:path";
import ts from "typescript";
import { designSystem, root } from "../lib/reference.ts";

export const documentedFile = path.join(designSystem, "source/index.d.ts");

export type TypeParameter = {
	name: string;
	constraint: string | undefined;
	default: string | undefined;
};

export type DocumentedType = {
	name: string;
	isObject: boolean;
	typeParameters: TypeParameter[];
	ownKeys: string[];
	hasInheritedKeys: boolean;
};

export type DocumentedValue =
	| {
			name: string;
			kind: "component";
			typeParameters: TypeParameter[];
			hasRef: boolean;
	  }
	| {
			name: string;
			kind: "function";
			arities: number[];
	  }
	| { name: string; kind: "constant" };

export type Surface = {
	types: Map<string, DocumentedType>;
	values: Map<string, DocumentedValue>;
};

function hasFlag(flags: number, flag: number): boolean {
	// eslint-disable-next-line no-bitwise -- testing one bit of a flag set
	return (flags & flag) !== 0;
}

function compilerOptions(): ts.CompilerOptions {
	const parsed = ts.getParsedCommandLineOfConfigFile(
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
	if (parsed === undefined) {
		throw new Error("Can't read tsconfig.json");
	}

	return { ...parsed.options, noEmit: true, types: [] };
}

function load(file: string) {
	const program = ts.createProgram([file], compilerOptions());
	const checker = program.getTypeChecker();
	const source = program.getSourceFile(file);
	const moduleSymbol = source && checker.getSymbolAtLocation(source);
	if (source === undefined || moduleSymbol === undefined) {
		throw new Error(`${path.relative(root, file)} is not a module`);
	}

	return { checker, source, exports: checker.getExportsOfModule(moduleSymbol) };
}

function qualify(
	node: ts.TypeNode | undefined,
	checker: ts.TypeChecker,
	source: ts.SourceFile,
): string | undefined {
	if (node === undefined) {
		return undefined;
	}

	const start = node.getStart(source);
	const offsets: number[] = [];
	const visit = (child: ts.Node) => {
		if (ts.isTypeReferenceNode(child) && ts.isIdentifier(child.typeName)) {
			const declaration = checker.getSymbolAtLocation(child.typeName)
				?.declarations?.[0];
			if (declaration?.parent === source) {
				offsets.push(child.typeName.getStart(source) - start);
			}
		}

		ts.forEachChild(child, visit);
	};

	visit(node);
	let text = node.getText(source);
	for (const offset of offsets.toSorted((a, b) => b - a)) {
		text = `${text.slice(0, offset)}Doc.${text.slice(offset)}`;
	}

	return text;
}

function typeParametersOf(
	parameters: readonly ts.TypeParameterDeclaration[] | undefined,
	checker: ts.TypeChecker,
	source: ts.SourceFile,
): TypeParameter[] {
	return (parameters ?? []).map((parameter) => ({
		name: parameter.name.text,
		constraint: qualify(parameter.constraint, checker, source),
		default: qualify(parameter.default, checker, source),
	}));
}

function readType(
	symbol: ts.Symbol,
	declaration: ts.InterfaceDeclaration | ts.TypeAliasDeclaration,
	checker: ts.TypeChecker,
	source: ts.SourceFile,
): DocumentedType {
	const isObject =
		ts.isInterfaceDeclaration(declaration) ||
		ts.isTypeLiteralNode(declaration.type) ||
		ts.isIntersectionTypeNode(declaration.type) ||
		ts.isMappedTypeNode(declaration.type);
	const keys = isObject
		? checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))
		: [];
	const ownKeys = keys
		.filter((key) =>
			key.declarations?.some((node) => node.getSourceFile() === source),
		)
		.map((key) => key.name);
	return {
		name: symbol.name,
		isObject,
		typeParameters: typeParametersOf(
			declaration.typeParameters,
			checker,
			source,
		),
		ownKeys,
		hasInheritedKeys: ownKeys.length < keys.length,
	};
}

function readValue(
	symbol: ts.Symbol,
	checker: ts.TypeChecker,
	source: ts.SourceFile,
): DocumentedValue {
	const { name } = symbol;
	const signatures = checker.getTypeOfSymbol(symbol).getCallSignatures();
	const [signature] = signatures;
	if (signature === undefined) {
		return { name, kind: "constant" };
	}

	if (signatures.length > 1) {
		throw new Error(
			`${name} is overloaded. Teach scripts/api/generate.ts to check each overload.`,
		);
	}

	const declaration = signature.getDeclaration();
	const typeParameters = typeParametersOf(
		declaration.typeParameters,
		checker,
		source,
	);
	if (/^[A-Z]/v.test(name) && /[a-z]/v.test(name)) {
		const [props] = signature.getParameters();
		const hasRef =
			props !== undefined &&
			checker.getTypeOfSymbol(props).getProperty("ref") !== undefined;
		return { name, kind: "component", typeParameters, hasRef };
	}

	if (typeParameters.length > 0) {
		throw new Error(
			`${name} is a generic function. Teach scripts/api/generate.ts to instantiate it.`,
		);
	}

	const { parameters } = declaration;
	if (parameters.some((parameter) => parameter.dotDotDotToken)) {
		throw new Error(
			`${name} has a rest parameter. Teach scripts/api/generate.ts to call it.`,
		);
	}

	const required = parameters.filter(
		(parameter) =>
			parameter.questionToken === undefined &&
			parameter.initializer === undefined,
	).length;
	const arities = Array.from(
		{ length: parameters.length - required + 1 },
		(_, index) => required + index,
	);
	return { name, kind: "function", arities };
}

export function readSurface(): Surface {
	const { checker, source, exports } = load(documentedFile);
	const surface: Surface = { types: new Map(), values: new Map() };
	for (const symbol of exports) {
		const declaration = symbol.declarations?.[0];
		if (
			declaration !== undefined &&
			(ts.isInterfaceDeclaration(declaration) ||
				ts.isTypeAliasDeclaration(declaration))
		) {
			surface.types.set(
				symbol.name,
				readType(symbol, declaration, checker, source),
			);
		} else {
			surface.values.set(symbol.name, readValue(symbol, checker, source));
		}
	}

	return surface;
}

function isTypeOnlyExport(node: ts.Declaration): boolean {
	return (
		ts.isExportSpecifier(node) &&
		(node.isTypeOnly || node.parent.parent.isTypeOnly)
	);
}

export function listExports(entry: string): {
	values: Set<string>;
	types: Set<string>;
} {
	const { checker, exports } = load(entry);
	const values = new Set<string>();
	const types = new Set<string>();
	for (const symbol of exports) {
		const target = hasFlag(symbol.flags, ts.SymbolFlags.Alias)
			? checker.getAliasedSymbol(symbol)
			: symbol;
		const isTypeOnly =
			symbol.declarations?.some((node) => isTypeOnlyExport(node)) ?? false;
		if (!isTypeOnly && hasFlag(target.flags, ts.SymbolFlags.Value)) {
			values.add(symbol.name);
		}

		if (hasFlag(target.flags, ts.SymbolFlags.Type)) {
			types.add(symbol.name);
		}
	}

	return { values, types };
}
