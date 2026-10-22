import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type SkeletonProps = React.HTMLAttributes<HTMLSpanElement> & {
	/**
	text: one line at the current font size (default). rectangular: square corners. rounded: radius-well. circular: a circle.
	*/
	variant?: "text" | "rectangular" | "rounded" | "circular";
	/**
	Width: a number of px or any CSS length. Default the full line (text) or the children's width.
	*/
	width?: number | string;
	/**
	Height: a number of px or any CSS length. Text takes its height from the font size.
	*/
	height?: number | string;
	/**
	pulse: a slow opacity breath (default). wave: a light sheen moving across. false: still.
	*/
	animation?: "pulse" | "wave" | false;
	/**
	Content to size the placeholder by; it stays invisible.
	*/
	children?: React.ReactNode;
};

/**
A number is px; a string is any CSS length.
*/
function toCss(value: number | string | undefined): string | undefined {
	return typeof value === "number" ? `${value}px` : value;
}

const isUnset = (value: unknown) => value === undefined || value === null;

/**
A color-line placeholder in the shape of what is loading, always aria-hidden (the region it stands in for carries aria-busy).
*/
export function Skeleton({
	variant = "text",
	width,
	height,
	animation = "pulse",
	className,
	style,
	children,
	ref,
	...rest
}: SkeletonProps & { ref?: React.Ref<HTMLSpanElement> }) {
	const isSized = !isUnset(children) && children !== false;
	return (
		<span
			ref={ref}
			className={cx(
				"gl-skeleton",
				`gl-skeleton-${variant}`,
				typeof animation === "string" && `gl-skeleton-${animation}`,
				isSized && "gl-skeleton-with-children",
				isSized && isUnset(width) && "gl-skeleton-fit-width",
				isSized && isUnset(height) && "gl-skeleton-fit-height",
				className,
			)}
			style={{ width: toCss(width), height: toCss(height), ...style }}
			{...rest}
			// Last, so it stays hidden whatever is passed: the region it stands in for speaks.
			aria-hidden="true"
		>
			{children}
		</span>
	);
}
