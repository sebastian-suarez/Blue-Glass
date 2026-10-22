"use client";
import { Button as BaseButton } from "@base-ui/react/button";
import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type ButtonProps = Omit<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	"type"
> & {
	/**
	`primary`: the ink pill, once per view. `glass`: the frosted pill (default). `text`: a link-weight action.
	*/
	variant?: "primary" | "glass" | "text";
	/**
	`danger` for destructive actions.
	*/
	tone?: "default" | "danger";
	/**
	`md` is the site's 46px pill; `sm` and `lg` are additions.
	*/
	size?: "sm" | "md" | "lg";
	/**
	Icon before the label.
	*/
	startIcon?: React.ReactNode;
	/**
	Icon after the label; outbound links take the arrow-ne glyph.
	*/
	endIcon?: React.ReactNode;
	/**
	Busy: shows a spinner, sets aria-busy and blocks clicks.
	*/
	loading?: boolean;
	/**
	Stretch to the container width.
	*/
	fullWidth?: boolean;
	/**
	Render an <a> instead of a <button>.
	*/
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

/**
The pill's content: the spinner or the start icon, the label, then the end icon.
*/
function content({
	loading,
	startIcon,
	endIcon,
	children,
}: Pick<ButtonProps, "startIcon" | "endIcon" | "children"> & {
	loading: boolean;
}) {
	// As in the reference, a falsy icon (null, false, 0, "") draws no slot.
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

/**
The site's pill button (.btn): primary is the ink pill for the one thing a
view is for, glass the frosted pill beside it, text a link-weight action.
*/
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
		// Base UI's Button is for buttons only: its docs style a link as a plain <a>, as the
		// reference does. With no href an <a> has no role, so an inactive one keeps role="link".
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

	// Loading only blocks clicks, as in the reference: the button stays focusable and gets its other
	// handlers, and preventing the click keeps a busy submit button from submitting. Base UI's
	// disabled would swallow every handler.
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
