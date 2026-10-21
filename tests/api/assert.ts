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
Keys the package requires and the documentation doesn't: new keys, and documented optional
keys that became required. Documented code leaves them out. A type check alone misses the
second kind when the key's type admits undefined, as ReactNode does.
*/
export type NewRequiredKeys<Documented, Package> =
	IsAny<Package> extends true
		? never
		: Exclude<RequiredKeys<Package>, RequiredKeys<Documented>>;

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
Strict identity, which tells any apart from every other type.
*/
type Same<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

type AnyFunction = (...parameters: never) => unknown;
type FunctionsOf<T> = T extends AnyFunction ? T : never;
type ArraysOf<T> = T extends readonly unknown[] ? T : never;
type ObjectsOf<T> = T extends AnyFunction | readonly unknown[]
	? never
	: T extends object
		? T
		: never;

type Prefix<Head extends string, Paths> = Paths extends string
	? `${Head}${Paths}`
	: never;

/**
True for any and unknown: types that already accept everything, so any in their place
weakens nothing the documentation promises.
*/
type AcceptsAll<T> = unknown extends T ? true : false;

/**
Where Package has any and Documented, in the same place, doesn't: "" for the type itself,
"(0)" for a function's first parameter, "=>" for its return type, "[]" for an array's
elements and ".key" for a property. So a callback whose parameters turned into any, or a
React.Ref<any>, is caught, not just a prop that is any as a whole. It walks only the places
both types have and only where they differ, five levels deep, and stops wherever the
documentation itself says any or unknown.
*/
type NewAny<Documented, Package, Depth extends unknown[] = []> =
	AcceptsAll<Documented> extends true
		? never
		: IsAny<Package> extends true
			? ""
			: Same<Documented, Package> extends true
				? never
				: Depth["length"] extends 5
					? never
					: | NewAnyInFunctions<
								FunctionsOf<Documented>,
								FunctionsOf<Package>,
								[...Depth, unknown]
						  >
						| NewAnyInArrays<
								ArraysOf<Documented>,
								ArraysOf<Package>,
								[...Depth, unknown]
						  >
						| NewAnyInObjects<
								ObjectsOf<Documented>,
								ObjectsOf<Package>,
								[...Depth, unknown]
						  >;

/**
The parameter indexes both functions have. Mapping over an intersection of keys, rather
than over one side's keys with -?, keeps optional parameters' undefined on both sides:
otherwise the two sides would never look identical and the walk would never stop early.
*/
type SharedIndexes<Documented, Package> = keyof Documented &
	keyof Package &
	`${number}`;

type NewAnyInParameters<
	Documented extends readonly unknown[],
	Package extends readonly unknown[],
	Depth extends unknown[],
> = {
	[K in SharedIndexes<Documented, Package>]: Prefix<
		`(${K})`,
		NewAny<Documented[K], Package[K], Depth>
	>;
}[SharedIndexes<Documented, Package>];

/**
True when either side is never: then there's no place both have, so nothing to compare.
*/
type EitherNever<A, B> = [A] extends [never]
	? true
	: [B] extends [never]
		? true
		: false;

type NewAnyInFunctions<Documented, Package, Depth extends unknown[]> =
	EitherNever<Documented, Package> extends true
		? never
		: [Documented] extends [
					(...parameters: infer DP extends readonly unknown[]) => infer DR,
			  ]
			? [Package] extends [
					(...parameters: infer PP extends readonly unknown[]) => infer PR,
				]
				? | NewAnyInParameters<DP, PP, Depth>
					| Prefix<"=>", NewAny<DR, PR, Depth>>
				: never
			: never;

type NewAnyInArrays<Documented, Package, Depth extends unknown[]> =
	EitherNever<Documented, Package> extends true
		? never
		: [Documented] extends [ReadonlyArray<infer DE>]
			? [Package] extends [ReadonlyArray<infer PE>]
				? Prefix<"[]", NewAny<DE, PE, Depth>>
				: never
			: never;

type NewAnyInObjects<Documented, Package, Depth extends unknown[]> =
	EitherNever<Documented, Package> extends true
		? never
		: {
				[K in keyof Documented & keyof Package]: Prefix<
					`.${K & string}`,
					NewAny<Documented[K], Package[K], Depth>
				>;
			}[keyof Documented & keyof Package];

/**
Documented keys with any in the package's type where the documentation has none, each
with its path: "label" for the prop itself, "onChange(0)" for a callback's parameter,
"ref.current" for a ref's element.
*/
export type AnyKeys<Documented, Package> =
	IsAny<Package> extends true
		? never
		: {
				// Over the shared keys, not Documented's with -?, for the reason SharedIndexes gives.
				[K in keyof Documented & keyof Package]: Prefix<
					K & string,
					NewAny<Documented[K], Package[K]>
				>;
			}[keyof Documented & keyof Package];

/**
Where a function, constant or type has any that the documentation doesn't, named after it:
"useMediaQuery is any", "useTransition(1).current" or "AnchorEl=>".
*/
export type AnyIn<Name extends string, Documented, Package> =
	NewAny<Documented, Package> extends infer Path extends string
		? Path extends ""
			? `${Name} is any`
			: `${Name}${Path}`
		: never;

/**
What RefElement gives for React.Ref<any>. It fits no documented element, so the check
fails, and the compiler prints its name: a string message would print as "string".
*/
type RefElementIsAny = { readonly refElementIsAny: true };

type KnownElement<E> = IsAny<E> extends true ? RefElementIsAny : NonNullable<E>;

/**
The element a ref prop points at: E for React.Ref<E>, or RefElementIsAny when E is any.
*/
export type RefElement<R> =
	IsAny<R> extends true
		? never
		: NonNullable<R> extends infer U
			? U extends React.RefObject<infer E>
				? KnownElement<E>
				: U extends (instance: infer E) => unknown
					? KnownElement<E>
					: never
			: never;

/**
The type argument for generic checks. Nothing else is assignable to it, so a package that
ignores or hardcodes a type parameter fails.
*/
export type Probe = { readonly apiProbe: "type argument" };
