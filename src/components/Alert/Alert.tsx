"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { FeedbackLiveContext } from "../../internal/feedback-live.js";
import { Icon } from "../Icon/index.js";

export type AlertSeverity = "success" | "info" | "warning" | "error";

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
	severity?: AlertSeverity;
	variant?: "standard" | "outlined" | "filled";
	icon?: React.ReactNode | false;
	action?: React.ReactNode;
	onClose?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	closeText?: string;
	severityText?: string;
	children?: React.ReactNode;
};

export type AlertTitleProps = React.HTMLAttributes<HTMLDivElement> & {
	children?: React.ReactNode;
};

const words: Record<AlertSeverity, string> = {
	success: "Success",
	info: "Info",
	warning: "Warning",
	error: "Error",
};

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
	let defaultRole: React.AriaRole | undefined;
	if (!isInLiveRegion) {
		defaultRole =
			severity === "error" || severity === "warning" ? "alert" : "status";
	}

	const hasAction = action !== undefined && action !== null && action !== false;
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
