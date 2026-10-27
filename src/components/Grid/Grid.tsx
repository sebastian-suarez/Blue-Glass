import type * as React from "react";
import { cx } from "../../internal/cx.js";
import {
	breakpoints,
	isIntegerIn,
	isSpace,
	responsiveClasses,
} from "../../internal/layout.js";
import type { SpaceValue } from "../Box/Box.js";

export type LayoutBreakpoint = "xs" | "sm" | "md" | "lg" | "xl";

export type ResponsiveValue<T> = T | Partial<Record<LayoutBreakpoint, T>>;

export type GridProps = React.HTMLAttributes<HTMLElement> & {
	container?: boolean;
	columns?: ResponsiveValue<number>;
	spacing?: SpaceValue;
	rowSpacing?: SpaceValue;
	columnSpacing?: SpaceValue;
	size?: ResponsiveValue<number>;
	offset?: ResponsiveValue<number>;
	component?: React.ElementType;
	children?: React.ReactNode;
};

const ranges = {
	columns: [1, 12, 96],
	size: [1, 12, 96],
	offset: [0, 11, 95],
} as const;

type Track = keyof typeof ranges;

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
		const from =
			"--gl-grid-size" in variables
				? "xs"
				: breakpoints.find((breakpoint) =>
						classes.some((name) =>
							name.startsWith(`gl-grid-size-${breakpoint}-`),
						),
					);
		if (from !== undefined) {
			classes.push(`gl-grid-placed-${from}`);
		}
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
