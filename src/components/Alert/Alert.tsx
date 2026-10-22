"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { FeedbackLiveContext } from "../../internal/feedback-live.js";
import { Icon } from "../Icon/index.js";

export type AlertSeverity = "success" | "info" | "warning" | "error";

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	The state it reports. Sets the icon, the status colour, the role and the word read before the message. Default info.
	*/
	severity?: AlertSeverity;
	/**
	standard: the soft status tint (default). outlined: glass-control with a 1px status border. filled: the status fill under on-ink.
	*/
	variant?: "standard" | "outlined" | "filled";
	/**
	Replace the severity glyph. false hides it: do that only when the title or message names the state.
	*/
	icon?: React.ReactNode | false;
	/**
	Actions after the message, usually one text Button at size sm ("Retry", "Undo").
	*/
	action?: React.ReactNode;
	/**
	Shows a close button after the action and is called when it's pressed.
	*/
	onClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	/**
	Accessible name (and tooltip) of the close button. Default "Close".
	*/
	closeText?: string;
	/**
	The word screen readers hear before the message. Default Success, Info, Warning or Error.
	*/
	severityText?: string;
	/**
	The message. Start it with an AlertTitle for a two-part message.
	*/
	children?: React.ReactNode;
};

export type AlertTitleProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	The title text: a few words that name the state ("Upload failed").
	*/
	children?: React.ReactNode;
};

const words: Record<AlertSeverity, string> = {
	success: "Success",
	info: "Info",
	warning: "Warning",
	error: "Error",
};

/**
A status message with its icon and word: success, info, warning or error, on a soft tint, an outline or a status fill.
*/
export function Alert({
	severity = "info",
	variant = "standard",
	icon,
	action,
	onClose,
	closeText = "Close",
	severityText,
	role,
	className,
	children,
	ref,
	...rest
}: AlertProps & { ref?: React.Ref<HTMLDivElement> }) {
	const isInLiveRegion = React.use(FeedbackLiveContext);
	// Errors and warnings interrupt; the rest wait their turn. Inside a Snackbar the snackbar
	// announces, so the alert takes no role of its own.
	let defaultRole: React.AriaRole | undefined;
	if (!isInLiveRegion) {
		defaultRole =
			severity === "error" || severity === "warning" ? "alert" : "status";
	}

	const hasAction =
		action !== undefined && action !== null && action !== false;
	return (
		<div
			ref={ref}
			role={role ?? defaultRole}
			className={cx(
				"gl-alert",
				`gl-alert-${variant}`,
				`gl-alert-${severity}`,
				className,
			)}
			{...rest}
		>
			{icon === false ? null : (
				<span className="gl-alert-icon" aria-hidden="true">
					{icon ?? <Icon name={severity} size={20} />}
				</span>
			)}
			<div className="gl-alert-message">
				<span className="gl-sr-only">{`${severityText ?? words[severity]}: `}</span>
				{children}
			</div>
			{hasAction ? <div className="gl-alert-action">{action}</div> : null}
			{typeof onClose === "function" ? (
				<button
					type="button"
					className="gl-alert-close"
					aria-label={closeText}
					title={closeText}
					onClick={onClose}
				>
					<Icon name="close" size={16} />
				</button>
			) : null}
		</div>
	);
}

/**
The alert's first line: weight 600 in the status colour.
*/
export function AlertTitle({
	className,
	children,
	ref,
	...rest
}: AlertTitleProps & { ref?: React.Ref<HTMLDivElement> }) {
	return (
		<div ref={ref} className={cx("gl-alert-title", className)} {...rest}>
			{children}
		</div>
	);
}
