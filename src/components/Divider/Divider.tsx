"use client";
import { Separator } from "@base-ui/react/separator";
import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { useId } from "../../internal/hooks.js";

export type DividerProps = React.HTMLAttributes<HTMLElement> & {
	orientation?: "horizontal" | "vertical";
	variant?: "full" | "inset" | "middle";
	flexItem?: boolean;
	textAlign?: "center" | "left";
	component?: React.ElementType;
	children?: React.ReactNode;
};

const nothing: ReadonlySet<unknown> = new Set([undefined, null, false, ""]);

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
	const Component: React.ElementType =
		hasLabel && (component === undefined || component === "hr")
			? "div"
			: (component ?? "hr");
	return (
		<Separator
			ref={ref as React.Ref<HTMLDivElement>}
			render={<Component />}
			orientation={orientation}
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
