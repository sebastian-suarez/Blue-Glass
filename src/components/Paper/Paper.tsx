import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type PaperProps = React.HTMLAttributes<HTMLElement> & {
	/**
	`glass`: the frosted panel (.glass-panel), the default.
	`inset`: a well inside a panel (.project-figure).
	`solid`: glass-solid, no blur, for surfaces stacked on glass.
	`outlined`: transparent with a hairline.
	*/
	variant?: "glass" | "inset" | "solid" | "outlined";
	/**
	Shadow depth: 0 none, 1 shadow-pane, 2 shadow-panel (glass default).
	*/
	elevation?: 0 | 1 | 2;
	/**
	Corner radius token. Default radius-panel for glass and solid, radius-well for inset, radius-pane for outlined.
	*/
	radius?: "panel" | "pane" | "well" | "control" | "none";
	/**
	Render as another element, e.g. "section" or "figure".
	*/
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

/**
The surface every panel is cut from: translucent white over the light field, blurred, with a top highlight.
*/
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
