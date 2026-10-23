"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";

export type BadgeTone =
	"default" | "accent" | "danger" | "warning" | "success" | "info";
export type BadgeAnchor =
	"top-right" | "top-left" | "bottom-right" | "bottom-left";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
	badgeContent?: React.ReactNode;
	variant?: "standard" | "dot";
	tone?: BadgeTone;
	max?: number;
	showZero?: boolean;
	invisible?: boolean;
	anchor?: BadgeAnchor;
	overlap?: "rectangular" | "circular";
	label?: string;
	"aria-label"?: string;
	component?: React.ElementType;
	children?: React.ReactNode;
};

const isUnset = (value: unknown) => value === undefined || value === null;

export function Badge({
	badgeContent,
	variant = "standard",
	tone = "default",
	max = 99,
	showZero = false,
	invisible: isInvisibleProp = false,
	anchor = "top-right",
	overlap = "rectangular",
	label,
	component: Component = "span",
	className,
	children,
	"aria-label": ariaLabel,
	ref,
	...rest
}: BadgeProps & { ref?: React.Ref<HTMLSpanElement> }) {
	const isEmpty =
		isUnset(badgeContent) || badgeContent === false || badgeContent === "";
	const isInvisible =
		isInvisibleProp ||
		(badgeContent === 0 && !showZero) ||
		(isEmpty && variant !== "dot");
	let display: React.ReactNode = badgeContent;
	if (variant === "dot") {
		display = null;
	} else if (typeof badgeContent === "number" && badgeContent > max) {
		display = `${max}+`;
	}

	const [lastShown, setLastShown] = React.useState<React.ReactNode>(display);
	if (!isInvisible && !Object.is(lastShown, display)) {
		setLastShown(display);
	}

	const shown = isInvisible ? lastShown : display;
	const isStandalone = isUnset(children) || children === false;
	const isPassedThrough =
		ariaLabel !== undefined && React.isValidElement(children);
	let spoken = "";
	if (!isPassedThrough) {
		spoken =
			ariaLabel ??
			label ??
			(typeof display === "string" || typeof display === "number"
				? String(display)
				: "");
	}

	const child =
		isPassedThrough && !isInvisible
			? // eslint-disable-next-line @eslint-react/no-clone-element -- The documented aria-label goes to the child, so focus on it reads the count.
				React.cloneElement(
					children as React.ReactElement<{ "aria-label"?: string }>,
					{
						"aria-label": ariaLabel,
					},
				)
			: children;

	return (
		<Component
			ref={ref}
			className={cx(
				"gl-badge",
				`gl-badge-${anchor}`,
				overlap === "circular" && "gl-badge-circular",
				tone !== "default" && `gl-badge-${tone}`,
				isStandalone && "gl-badge-standalone",
				className,
			)}
			{...rest}
		>
			{child}
			<span
				className={cx(
					"gl-badge-badge",
					variant === "dot" && "gl-badge-dot",
					isInvisible && "gl-badge-invisible",
				)}
				aria-hidden="true"
			>
				{shown}
			</span>
			{!isInvisible && spoken !== "" ? (
				<span className="gl-sr-only">{spoken}</span>
			) : null}
		</Component>
	);
}
