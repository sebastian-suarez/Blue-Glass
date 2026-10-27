import type * as React from "react";

export type Assignable<From extends To, To> = From;

export type Never<T extends never> = T;

export type IsAny<T> = 0 extends 1 & T ? true : false;

export type IfAny<T, Message extends string> =
	IsAny<T> extends true ? Message : never;

export type Prop<T, K extends PropertyKey> = K extends keyof T ? T[K] : unknown;

export type Strict<T> = T extends (...parameters: infer P) => infer R
	? (...parameters: P) => R
	: T;

export type MissingKeys<Documented, Package> = Exclude<
	keyof Documented,
	keyof Package
>;

type RequiredKeys<T> = {
	[K in keyof T]-?: T extends Record<K, T[K]> ? K : never;
}[keyof T];

export type NewRequiredKeys<Documented, Package> =
	IsAny<Package> extends true
		? never
		: Exclude<RequiredKeys<Package>, RequiredKeys<Documented>>;

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

type AcceptsAll<T> = unknown extends T ? true : false;

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

type DocumentedIndexes<Documented> = keyof Documented & `${number}`;

type ParameterAt<
	Package extends readonly unknown[],
	K extends string,
> = K extends keyof Package
	? Package[K]
	: number extends Package["length"]
		? Package[number]
		: never;

type NewAnyInParameters<
	Documented extends readonly unknown[],
	Package extends readonly unknown[],
	Depth extends unknown[],
> = {
	[K in DocumentedIndexes<Documented>]: Prefix<
		`(${K})`,
		NewAny<Documented[K], ParameterAt<Package, K>, Depth>
	>;
}[DocumentedIndexes<Documented>];

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

export type AnyKeys<Documented, Package> =
	IsAny<Package> extends true
		? never
		: {
				[K in keyof Documented & keyof Package]: Prefix<
					K & string,
					NewAny<Documented[K], Package[K]>
				>;
			}[keyof Documented & keyof Package];

export type AnyIn<Name extends string, Documented, Package> =
	NewAny<Documented, Package> extends infer Path extends string
		? Path extends ""
			? `${Name} is any`
			: `${Name}${Path}`
		: never;

type RefElementIsAny = { readonly refElementIsAny: true };

type KnownElement<E> = IsAny<E> extends true ? RefElementIsAny : NonNullable<E>;

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

export type Probe = { readonly apiProbe: "type argument" };
