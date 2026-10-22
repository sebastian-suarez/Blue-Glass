"use client";
import { Separator } from "@base-ui/react/separator";
import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { useId } from "../../internal/hooks.js";

export type DividerProps = React.HTMLAttributes<HTMLElement> & {
	/**
	Horizontal (default) or vertical. A vertical divider is one line of text tall unless it's a flexItem.
	*/
	orientation?: "horizontal" | "vertical";
	/**
	Full width (default), inset past a list row's icon (42px, or --gl-divider-inset), or middle (16px in from both ends).
	*/
	variant?: "full" | "inset" | "middle";
	/**
	Stretch a vertical divider to the full height of its flex row.
	*/
	flexItem?: boolean;
	/**
	Where a label sits: centred between two lines (default) or at the start, the line after it.
	*/
	textAlign?: "center" | "left";
	/**
	Render as another element. Default hr, or div when there is a label. Use "li" inside a List.
	*/
	component?: React.ElementType;
	/**
	An optional label, set in 12px color-muted.
	*/
	children?: React.ReactNode;
};

// Children that make no label, as in the reference.
const nothing: ReadonlySet<unknown> = new Set([undefined, null, false, ""]);

/**
A 1px color-line hairline that separates content, as the site's rows, strips and footer do.
*/
export function Divider({
	ref,
	orientation = "horizontal",
	variant = "full",
	flexItem = false,
	textAlign = "center",
	component,
	className,
	children,
	id,
	...rest
}: DividerProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const labelId = useId(
		id === undefined || id === "" ? undefined : `${id}-label`,
	);
	const hasLabel = !nothing.has(children);
	// An hr can't hold a label.
	const Component: React.ElementType =
		hasLabel && (component === undefined || component === "hr")
			? "div"
			: (component ?? "hr");
	return (
		<Separator
			// Base UI types the ref for its default div; the element is the one Component names.
			ref={ref as React.Ref<HTMLDivElement>}
			render={<Component />}
			orientation={orientation}
			// An hr is a separator on its own; Base UI would give it the role too.
			role={Component === "hr" ? undefined : "separator"}
			id={id}
			aria-labelledby={hasLabel ? labelId : undefined}
			className={cx(
				"gl-divider",
				`gl-divider-${orientation}`,
				variant !== "full" && `gl-divider-${variant}`,
				flexItem && "gl-divider-flex-item",
				hasLabel && "gl-divider-labelled",
				hasLabel && textAlign === "left" && "gl-divider-text-left",
				className,
			)}
			{...rest}
		>
			{hasLabel ? (
				<span id={labelId} className="gl-divider-label">
					{children}
				</span>
			) : null}
		</Separator>
	);
}
