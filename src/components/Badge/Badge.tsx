"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";

export type BadgeTone =
	"default" | "accent" | "danger" | "warning" | "success" | "info";
export type BadgeAnchor =
	"top-right" | "top-left" | "bottom-right" | "bottom-left";

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
	/**
	The count or a short word in the pill. Numbers above max show as "max+".
	*/
	badgeContent?: React.ReactNode;
	/**
	standard: the count pill (18px, 11px text). dot: an 8px dot, no text.
	*/
	variant?: "standard" | "dot";
	/**
	Fill: default is color-ink; accent and the status tones fill under on-ink. Pair a status with a word.
	*/
	tone?: BadgeTone;
	/**
	Cap for a numeric count. Default 99, shown as "99+".
	*/
	max?: number;
	/**
	Show the pill when the count is 0 (hidden by default).
	*/
	showZero?: boolean;
	/**
	Hide the pill; it fades and scales out.
	*/
	invisible?: boolean;
	/**
	The child's corner the pill sits on. Default top-right.
	*/
	anchor?: BadgeAnchor;
	/**
	circular pulls the pill in onto a round child such as an Avatar. Default rectangular.
	*/
	overlap?: "rectangular" | "circular";
	/**
	What the badge means, read by screen readers instead of the bare count, e.g. "4 unread".
	Rendered as visually hidden text after the child; the visible pill is always aria-hidden.
	Defaults to the visible count. Pass "" when the child's own name already says it.
	*/
	label?: string;
	/**
	The child's full name with the count, e.g. "Messages, 4 unread". Passed through to the child element,
	so focus on a button reads it; no hidden text is added then.
	*/
	"aria-label"?: string;
	/**
	Render as another element. Default span.
	*/
	component?: React.ElementType;
	/**
	The element the badge sits on. Without one, the pill renders inline.
	*/
	children?: React.ReactNode;
};

const isUnset = (value: unknown) => value === undefined || value === null;

/**
A count pill or a dot on a corner of its child: unread messages, pending reviews, presence.
*/
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

	// The pill keeps the last content it showed while it animates out, so a count that drops to
	// 0 scales out still reading its old number.
	const [lastShown, setLastShown] = React.useState<React.ReactNode>(display);
	if (!isInvisible && !Object.is(lastShown, display)) {
		setLastShown(display);
	}

	const shown = isInvisible ? lastShown : display;
	const isStandalone = isUnset(children) || children === false;
	// With aria-label the child carries the whole name, so focus reads the count with it.
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

	// While hidden the child keeps its own name.
	const child =
		isPassedThrough && !isInvisible
			? // eslint-disable-next-line @eslint-react/no-clone-element -- The documented aria-label goes to the child, so focus on it reads the count.
				React.cloneElement(children as React.ReactElement<{ "aria-label"?: string }>, {
					"aria-label": ariaLabel,
				})
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
