import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type SkeletonProps = React.HTMLAttributes<HTMLSpanElement> & {
	variant?: "text" | "rectangular" | "rounded" | "circular";
	width?: number | string;
	height?: number | string;
	animation?: "pulse" | "wave" | false;
	children?: React.ReactNode;
};

function toCss(value: number | string | undefined): string | undefined {
	return typeof value === "number" ? `${value}px` : value;
}

const isUnset = (value: unknown) => value === undefined || value === null;

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
			aria-hidden="true"
		>
			{children}
		</span>
	);
}
