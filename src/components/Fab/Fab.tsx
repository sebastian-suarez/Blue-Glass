"use client";
import { Button as BaseButton } from "@base-ui/react/button";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useShouldReduceMotion } from "../../internal/hooks.js";

export type FabProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"type"
> & {
	variant?: "primary" | "glass";
	size?: "sm" | "md" | "lg";
	extended?: boolean;
	"aria-label"?: string;
	href?: string;
	target?: string;
	rel?: string;
	type?: "button" | "submit" | "reset";
	children?: React.ReactNode;
};
const OWN_TRANSITION =
	"background-color var(--duration-hover) ease, box-shadow var(--duration-hover) ease, " +
	"color var(--duration-hover) ease, scale var(--duration-press) var(--ease-out-quint)";
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
