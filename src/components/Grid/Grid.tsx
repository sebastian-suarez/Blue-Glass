import type * as React from "react";
import { cx } from "../../internal/cx.js";
import {
	isIntegerIn,
	isSpace,
	responsiveClasses,
} from "../../internal/layout.js";
import type { SpaceValue } from "../Box/Box.js";

/**
The site's breakpoints, as min-width queries (the inverse of global.css's
max-width ones): xs 0, sm 361px, md 701px, lg 900px, xl 1001px.
*/
export type LayoutBreakpoint = "xs" | "sm" | "md" | "lg" | "xl";

/**
One value, or one per breakpoint. Mobile first: a breakpoint without a value takes the one below it.
*/
export type ResponsiveValue<T> = T | Partial<Record<LayoutBreakpoint, T>>;

export type GridProps = React.HTMLAttributes<HTMLElement> & {
	/**
	Lay the children out on the column grid. A Grid can be a container and an item at once.
	*/
	container?: boolean;
	/**
	Container: the number of columns. Responsive values take 1–12; a single number can be any whole number. Default 12.
	*/
	columns?: ResponsiveValue<number>;
	/**
	Container: gap between rows and columns, a spacing token name ("xs" … "section") or 0.
	*/
	spacing?: SpaceValue;
	/**
	Container: gap between rows; wins over spacing.
	*/
	rowSpacing?: SpaceValue;
	/**
	Container: gap between columns; wins over spacing.
	*/
	columnSpacing?: SpaceValue;
	/**
	Item: how many columns it spans, 1–12, per breakpoint. With no size the item fills its row.
	*/
	size?: ResponsiveValue<number>;
	/**
	Item: empty columns before it, 0–11, per breakpoint; it pushes from where the item would sit, as in MUI.
	*/
	offset?: ResponsiveValue<number>;
	/**
	The element to render, e.g. "ul" or "section". Default "div".
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

// Per prop: the values the stylesheet has breakpoint classes for (min to max), and the cap on
// a single number past them, which is set inline instead, as in the reference.
const ranges = {
	columns: [1, 12, 96],
	size: [1, 12, 96],
	offset: [0, 11, 95],
} as const;

type Track = keyof typeof ranges;

/**
A responsive whole-number prop as classes, one per breakpoint (gl-grid-size-md-6…), or a
single number past the classes as its custom property (--gl-grid-size).
*/
function track(
	name: Track,
	value: ResponsiveValue<number> | undefined,
): { classes: string[]; variables: Record<string, number> } {
	const [min, max, cap] = ranges[name];
	const classes = responsiveClasses(`gl-grid-${name}`, value, (at) =>
		isIntegerIn(at, min, max),
	);
	const isInline =
		classes.length === 0 &&
		typeof value === "number" &&
		isIntegerIn(value, min, cap);
	return {
		classes,
		variables: isInline ? { [`--gl-grid-${name}`]: value } : {},
	};
}

/**
A 12-column CSS grid on the site's breakpoints: a container sets the columns
and the gap token, its items span columns per breakpoint and can be offset.
*/
export function Grid({
	ref,
	container = false,
	columns,
	spacing,
	rowSpacing,
	columnSpacing,
	size,
	offset,
	component: Component = "div",
	className,
	style,
	children,
	...rest
}: GridProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const classes = ["gl-grid", "gl-grid-item"];
	let variables: Record<string, number> = {};
	const place = (name: Track, value: ResponsiveValue<number> | undefined) => {
		const placed = track(name, value);
		classes.push(...placed.classes);
		variables = { ...variables, ...placed.variables };
	};

	if (container) {
		classes.push("gl-grid-container");
		place("columns", columns);
		for (const [gap, value] of [
			["spacing", spacing],
			["row-spacing", rowSpacing],
			["column-spacing", columnSpacing],
		] as const) {
			if (isSpace(value)) {
				classes.push(`gl-grid-${gap}-${value}`);
			}
		}
	}

	if (size !== undefined || offset !== undefined) {
		classes.push("gl-grid-sized");
		place("size", size);
		place("offset", offset);
	}

	return (
		<Component
			ref={ref}
			className={cx(...classes, className)}
			style={{ ...variables, ...style }}
			{...rest}
		>
			{children}
		</Component>
	);
}
