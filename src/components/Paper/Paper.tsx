import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type PaperProps = React.HTMLAttributes<HTMLElement> & {
	variant?: "glass" | "inset" | "solid" | "outlined";
	elevation?: 0 | 1 | 2;
	radius?: "panel" | "pane" | "well" | "control" | "none";
	component?: React.ElementType;
	children?: React.ReactNode;
};

const defaultRadius = {
	glass: "panel",
	inset: "well",
	solid: "panel",
	outlined: "pane",
} as const;

const defaultElevation = { glass: 2, inset: 0, solid: 1, outlined: 0 } as const;

export function Paper({
	variant = "glass",
	elevation,
	radius,
	component: Component = "div",
	className,
	children,
	ref,
	...rest
}: PaperProps & { ref?: React.Ref<HTMLElement> }) {
	const corner = radius ?? defaultRadius[variant];
	const depth = elevation ?? defaultElevation[variant];
	return (
		<Component
			ref={ref}
			className={cx(
				"gl-paper",
				`gl-paper-${variant}`,
				`gl-radius-${corner}`,
				`gl-elevation-${depth}`,
				variant === "glass" && "gl-glass",
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	);
}
