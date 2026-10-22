/**
The layout system Box, Stack and Grid share (ImageList and Masonry join them later), ported from
design-system/shared/_surfaces-layout-system.ts: spacing tokens by name and the site's
breakpoints. The public types live with the components that declare them in the documented
API: SpaceToken and SpaceValue in Box, LayoutBreakpoint and ResponsiveValue in Grid.
*/
import type { SpaceToken, SpaceValue } from "../components/Box/Box.js";
import type {
	LayoutBreakpoint,
	ResponsiveValue,
} from "../components/Grid/Grid.js";

export const spaceTokens: readonly SpaceToken[] = [
	"3xs",
	"2xs",
	"xs",
	"sm",
	"md",
	"lg",
	"xl",
	"2xl",
	"3xl",
	"4xl",
	"section-sm",
	"section",
];

/**
A token name as a CSS value: "lg" is var(--space-lg), 0 is 0px and "auto" stays auto.
*/
export function space(
	value: SpaceValue | "auto" | undefined | null,
): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}

	// Untyped callers may pass the string "0".
	if (String(value) === "0") {
		return "0px";
	}

	return value === "auto" ? "auto" : `var(--space-${value})`;
}

/**
The site's breakpoints as min-width queries, the inverse of global.css's max-width ones.
*/
export const breakpoints: readonly LayoutBreakpoint[] = [
	"xs",
	"sm",
	"md",
	"lg",
	"xl",
];

export function isResponsiveObject<T>(
	value: ResponsiveValue<T> | undefined,
): value is Partial<Record<LayoutBreakpoint, T>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
One class per breakpoint that has an allowed value: prefix-xs-6, prefix-md-4… A single value
is the xs one, which holds at every width.
*/
export function responsiveClasses<T extends string | number>(
	prefix: string,
	value: ResponsiveValue<T> | undefined,
	isAllowed: (value: T) => boolean,
): string[] {
	if (value === undefined || value === null) {
		return [];
	}

	if (!isResponsiveObject(value)) {
		return isAllowed(value) ? [`${prefix}-xs-${value}`] : [];
	}

	const classes: string[] = [];
	for (const breakpoint of breakpoints) {
		const at = value[breakpoint];
		if (at !== undefined && at !== null && isAllowed(at)) {
			classes.push(`${prefix}-${breakpoint}-${at}`);
		}
	}

	return classes;
}

/**
Whether `value` is a whole number from `min` to `max` (the reference's intIn).
*/
export function isIntegerIn(value: unknown, min: number, max: number): boolean {
	return (
		typeof value === "number" &&
		Number.isSafeInteger(value) &&
		value >= min &&
		value <= max
	);
}

/**
Whether `value` is a spacing token name or 0.
*/
export function isSpace(value: unknown): value is SpaceValue {
	return value === 0 || spaceTokens.includes(value as SpaceToken);
}
