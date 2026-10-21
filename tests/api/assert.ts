/**
Type-level assertions for the API gate. scripts/api/generate.ts writes one line per check
into tests/api/generated/, and a line compiles only while its check holds. A failing check
is a constraint error whose message says what broke: the missing keys, the types that no
longer fit, or what turned into any.
*/
import type * as React from "react";

/**
Compiles when From can be used where To is expected.
*/
export type Assignable<From extends To, To> = From;

/**
Compiles when T is never. The error lists what T holds instead.
*/
export type Never<T extends never> = T;

export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
Message when T is any, else never.
*/
export type IfAny<T, Message extends string> =
	IsAny<T> extends true ? Message : never;

/**
T[K], or unknown when T has no K: a missing key is reported once, by the key check.
*/
export type Prop<T, K extends PropertyKey> = K extends keyof T ? T[K] : unknown;

/**
T with its function types rewritten as plain function types. TypeScript compares methods,
and React's event handler types, bivariantly, so a callback whose event got wider would
still be assignable; plain function types make it compare parameters strictly.
*/
export type Strict<T> = T extends (...parameters: infer P) => infer R
	? (...parameters: P) => R
	: T;

/**
Documented keys the package's type doesn't have. Assignability alone misses a removed
optional key, so this compares the key sets.
*/
export type MissingKeys<Documented, Package> = Exclude<
	keyof Documented,
	keyof Package
>;

type RequiredKeys<T> = {
	[K in keyof T]-?: T extends Record<K, T[K]> ? K : never;
}[keyof T];

/**
Keys the package requires that the documentation doesn't have, so documented code leaves them out.
*/
export type NewRequiredKeys<Documented, Package> =
	IsAny<Package> extends true
		? never
		: Exclude<RequiredKeys<Package>, keyof Documented>;

/**
Documented keys whose package type is any, unless the documentation types them any too.
*/
export type AnyKeys<Documented, Package> =
	IsAny<Package> extends true
		? never
		: {
				[K in keyof Documented]-?: K extends keyof Package
					? IsAny<Package[K]> extends true
						? IsAny<Documented[K]> extends true
							? never
							: K
						: never
					: never;
			}[keyof Documented];

/**
Keys (among Keys) whose documented type the package's type doesn't accept, comparing
callbacks strictly.
*/
export type IncompatibleKeys<
	Documented,
	Package,
	Keys extends keyof Documented = keyof Documented,
> = {
	[K in Keys]-?: K extends keyof Package
		? [Strict<Documented[K]>] extends [Strict<Package[K]>]
			? never
			: K
		: never;
}[Keys];

/**
The element a ref prop points at: E for React.Ref<E>.
*/
export type RefElement<R> =
	IsAny<R> extends true
		? never
		: NonNullable<R> extends infer U
			? U extends React.RefObject<infer E>
				? NonNullable<E>
				: U extends (instance: infer E) => unknown
					? NonNullable<E>
					: never
			: never;

type AnyParameters<
	Package extends readonly unknown[],
	Documented extends readonly unknown[],
> = {
	// -? because an optional parameter would add undefined to the result.
	[K in keyof Package]-?: IsAny<Package[K]> extends true
		? K extends keyof Documented
			? IsAny<Documented[K]> extends true
				? never
				: `parameter ${K & string}`
			: `parameter ${K & string}`
		: never;
}[number];

/**
What in the package's function is any where the documented one isn't: the function itself,
a parameter (counted from 0) or the return type.
*/
export type AnyInSignature<Package, Documented> =
	IsAny<Package> extends true
		? "the function itself"
		: Package extends (...parameters: infer P) => infer R
			? Documented extends (...parameters: infer DP) => infer DR
				? | AnyParameters<P, DP>
					| (IsAny<R> extends true
							? IsAny<DR> extends true
								? never
								: "the return type"
							: never)
				: never
			: never;

/**
The type argument for generic checks. Nothing else is assignable to it, so a package that
ignores or hardcodes a type parameter fails.
*/
export type Probe = { readonly apiProbe: "type argument" };
