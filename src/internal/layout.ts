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

export function space(
	value: SpaceValue | "auto" | undefined | null,
): string | undefined {
	if (value === undefined || value === null) {
		return undefined;
	}

	if (String(value) === "0") {
		return "0px";
	}

	return value === "auto" ? "auto" : `var(--space-${value})`;
}

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

export function isIntegerIn(value: unknown, min: number, max: number): boolean {
	return (
		typeof value === "number" &&
		Number.isSafeInteger(value) &&
		value >= min &&
		value <= max
	);
}

export function isSpace(value: unknown): value is SpaceValue {
	return value === 0 || spaceTokens.includes(value as SpaceToken);
}
