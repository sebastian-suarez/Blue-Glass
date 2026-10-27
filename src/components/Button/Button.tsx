"use client";
import { Button as BaseButton } from "@base-ui/react/button";
import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type ButtonProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"type"
> & {
	variant?: "primary" | "glass" | "text";
	tone?: "default" | "danger";
	size?: "sm" | "md" | "lg";
	startIcon?: React.ReactNode;
	endIcon?: React.ReactNode;
	loading?: boolean;
	fullWidth?: boolean;
	href?: string;
	target?: string;
	rel?: string;
	type?: "button" | "submit" | "reset";
	children?: React.ReactNode;
};

function Spinner() {
	return (
		<svg
			className="gl-button-spinner"
			viewBox="0 0 24 24"
			width="16"
			height="16"
			aria-hidden="true"
			focusable="false"
		>
			<circle
				cx="12"
				cy="12"
				r="9"
				fill="none"
				stroke="currentColor"
				strokeOpacity="0.25"
				strokeWidth="2.5"
			/>
			<path
				d="M21 12a9 9 0 0 0-9-9"
				fill="none"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}

type Look = Required<
	Pick<ButtonProps, "variant" | "tone" | "size" | "fullWidth" | "loading">
> &
	Pick<ButtonProps, "className">;

function classesOf({
	variant,
	tone,
	size,
	fullWidth,
	loading,
	className,
}: Look): string {
	return cx(
		"gl-button",
		`gl-button-${variant}`,
		tone === "danger" && "gl-button-danger",
		size !== "md" && `gl-button-${size}`,
		fullWidth && "gl-button-full",
		loading && "gl-button-loading",
		className,
	);
}

function content({
	loading,
	startIcon,
	endIcon,
	children,
}: Pick<ButtonProps, "startIcon" | "endIcon" | "children"> & {
	loading: boolean;
}) {
	const hasStartIcon = Boolean(startIcon);
	const hasEndIcon = Boolean(endIcon);
	const start = hasStartIcon ? (
		<span className="gl-button-icon">{startIcon}</span>
	) : null;
	return (
		<>
			{loading ? <Spinner /> : start}
			<span className="gl-button-label">{children}</span>
			{hasEndIcon ? <span className="gl-button-icon">{endIcon}</span> : null}
		</>
	);
}

export function Button({
	variant = "glass",
	tone = "default",
	size = "md",
	startIcon,
	endIcon,
	loading = false,
	fullWidth = false,
	href,
	disabled = false,
	className,
	children,
	type = "button",
	onClick,
	ref,
	...rest
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> }) {
	const isInactive = disabled || loading;
	const classes = classesOf({
		variant,
		tone,
		size,
		fullWidth,
		loading,
		className,
	});
	const inner = content({ loading, startIcon, endIcon, children });
	if (href !== undefined) {
		return (
			<a
				ref={ref as React.Ref<HTMLAnchorElement>}
				className={classes}
				href={isInactive ? undefined : href}
				aria-disabled={isInactive || undefined}
				aria-busy={loading || undefined}
				role={isInactive ? "link" : undefined}
				onClick={(event: React.MouseEvent<HTMLAnchorElement>) => {
					if (isInactive) {
						event.preventDefault();
						return;
					}

					(onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined)?.(
						event,
					);
				}}
				{...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
			>
				{inner}
			</a>
		);
	}

	return (
		<BaseButton
			ref={ref}
			type={type}
			className={classes}
			disabled={disabled}
			aria-disabled={loading || undefined}
			aria-busy={loading || undefined}
			onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
				if (loading) {
					event.preventDefault();
					return;
				}

				onClick?.(event);
			}}
			{...rest}
		>
			{inner}
		</BaseButton>
	);
}
