"use client";
import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useShouldReduceMotion } from "../../internal/hooks.js";

export type FabProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"type"
> & {
	/**
Primary: the ink circle (.btn-primary), the default. glass: the frosted circle (.btn-glass) for a second floating action.
*/
	variant?: "primary" | "glass";
	/**
Sm 36px, md 46px (the site's control height, default), lg 56px.
*/
	size?: "sm" | "md" | "lg";
	/**
A pill with an icon and a visible label instead of a circle (MUI's variant="extended").
*/
	extended?: boolean;
	/**
Accessible name. Required when the Fab shows only an icon; an extended Fab is named by its label.
*/
	"aria-label"?: string;
	/**
Render an <a> instead of a <BaseButton>, e.g. "Back to top" with href="#top".
*/
	href?: string;
	/**
Link target, with href.
*/
	target?: string;
	/**
Link rel, with href.
*/
	rel?: string;
	/**
Button type. Default "button".
*/
	type?: "button" | "submit" | "reset";
	/**
The icon, or the icon then the label when extended.
*/
	children?: React.ReactNode;
};
const OWN_TRANSITION =
	"background-color var(--duration-hover) ease, box-shadow var(--duration-hover) ease, " +
	"color var(--duration-hover) ease, scale var(--duration-press) var(--ease-out-quint)";
/**
The floating action button: the site's ink or glass pill cut as a circle for a screen's one action, extended with a label, and safe inside Zoom.
*/
export function Fab({
	ref,
	variant = "primary",
	size = "md",
	extended = false,
	href,
	disabled = false,
	className,
	style,
	children,
	type = "button",
	onClick,
	...rest
}: FabProps & {
	ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
}) {
	const isReduced = useShouldReduceMotion();
	const classes = cx(
		"gl-fab",
		`gl-fab-${variant}`,
		`gl-fab-${size}`,
		extended && "gl-fab-extended",
		className,
	);
	const transition = style?.transition;
	const shouldMergeTransitions =
		!isReduced && transition !== undefined && transition !== "";
	const merged = shouldMergeTransitions
		? { ...style, transition: `${transition}, ${OWN_TRANSITION}` }
		: style;

	if (href !== undefined) {
		return (
			<a
				ref={ref as React.Ref<HTMLAnchorElement>}
				className={classes}
				style={merged}
				href={disabled ? undefined : href}
				aria-disabled={disabled || undefined}
				role={disabled ? "link" : undefined}
				onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
					if (disabled) {
						event.preventDefault();
						return;
					}

					(
						onClick as unknown as
							React.MouseEventHandler<HTMLAnchorElement> | undefined
					)?.(event);
				}}
				{...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
			>
				{children}
			</a>
		);
	}

	return (
		<BaseButton
			ref={ref}
			type={type}
			className={classes}
			style={merged}
			disabled={disabled}
			onClick={onClick}
			{...rest}
		>
			{children}
		</BaseButton>
	);
}
