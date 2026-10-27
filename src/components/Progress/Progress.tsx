"use client";
import { Progress } from "@base-ui/react/progress";
import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { useId } from "../../internal/hooks.js";

export type LinearProgressProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"color"
> & {
	variant?: "determinate" | "indeterminate" | "buffer";
	value?: number;
	valueBuffer?: number;
	label?: React.ReactNode;
	valueText?: string;
	showValue?: boolean;
	color?: "default" | "inherit";
};

export type CircularProgressProps = Omit<
	React.HTMLAttributes<HTMLSpanElement>,
	"color"
> & {
	variant?: "determinate" | "indeterminate";
	value?: number;
	size?: "xs" | "sm" | "md" | "lg" | number;
	thickness?: number;
	showValue?: boolean;
	color?: "default" | "inherit";
};

function clamp(value: number): number {
	return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

const isUnset = (value: unknown) => value === undefined || value === null;

function isNamedBy(attributes: React.AriaAttributes): boolean {
	return (
		!isUnset(attributes["aria-label"]) ||
		!isUnset(attributes["aria-labelledby"])
	);
}

export function LinearProgress({
	variant = "indeterminate",
	value = 0,
	valueBuffer = 0,
	label,
	valueText,
	showValue = false,
	color = "default",
	id,
	className,
	ref,
	...rest
}: LinearProgressProps & { ref?: React.Ref<HTMLDivElement> }) {
	const labelId = useId(id === undefined ? undefined : `${id}-label`);
	const isDeterminate = variant !== "indeterminate";
	const clamped = clamp(value);
	const isNamed = isNamedBy(rest);
	const hasLabel = !isUnset(label);
	const shown =
		valueText ??
		(showValue && isDeterminate ? `${Math.round(clamped)}%` : undefined);
	return (
		<Progress.Root
			ref={ref}
			id={id}
			value={isDeterminate ? clamped : null}
			aria-valuenow={isDeterminate ? Math.round(clamped) : undefined}
			aria-valuetext={valueText}
			aria-labelledby={!isNamed && hasLabel ? labelId : undefined}
			aria-label={!isNamed && !hasLabel ? "Loading" : undefined}
			className={cx(
				"gl-linear-progress",
				`gl-linear-progress-${variant}`,
				color === "inherit" && "gl-progress-inherit",
				className,
			)}
			{...rest}
		>
			{hasLabel || shown !== undefined ? (
				<div className="gl-linear-progress-head">
					{hasLabel ? (
						<Progress.Label id={labelId} className="gl-linear-progress-label">
							{label}
						</Progress.Label>
					) : null}
					{shown === undefined ? null : (
						<Progress.Value className="gl-linear-progress-value">
							{() => shown}
						</Progress.Value>
					)}
				</div>
			) : null}
			<Progress.Track className="gl-linear-progress-track">
				{variant === "buffer" ? (
					<div
						className="gl-linear-progress-buffer-bar"
						style={{ width: `${clamp(valueBuffer)}%` }}
					/>
				) : null}
				{isDeterminate ? (
					<Progress.Indicator className="gl-linear-progress-bar" />
				) : null}
			</Progress.Track>
		</Progress.Root>
	);
}

const sizes = { xs: 20, sm: 28, md: 40, lg: 56 } as const;

function strokeFor(pixels: number): number {
	if (pixels <= 20) {
		return 2.5;
	}

	if (pixels <= 28) {
		return 3;
	}

	return pixels <= 40 ? 4 : 4.5;
}

export function CircularProgress({
	variant = "indeterminate",
	value = 0,
	size = "md",
	thickness,
	showValue = false,
	color = "default",
	className,
	style,
	ref,
	...rest
}: CircularProgressProps & { ref?: React.Ref<HTMLSpanElement> }) {
	const pixels = typeof size === "number" ? size : sizes[size];
	const stroke = thickness ?? strokeFor(pixels);
	const centre = pixels / 2;
	const radius = (pixels - stroke) / 2;
	const isDeterminate = variant === "determinate";
	const clamped = clamp(value);
	return (
		<Progress.Root
			ref={ref as React.Ref<HTMLDivElement> | undefined}
			render={<span />}
			value={isDeterminate ? clamped : null}
			aria-valuenow={isDeterminate ? Math.round(clamped) : undefined}
			aria-valuetext={undefined}
			aria-label={isNamedBy(rest) ? undefined : "Loading"}
			className={cx(
				"gl-circular-progress",
				`gl-circular-progress-${variant}`,
				color === "inherit" && "gl-progress-inherit",
				className,
			)}
			style={{ width: pixels, height: pixels, ...style }}
			{...rest}
		>
			<svg
				className="gl-circular-progress-svg"
				viewBox={`0 0 ${pixels} ${pixels}`}
				width={pixels}
				height={pixels}
				aria-hidden="true"
				focusable="false"
			>
				<circle
					className="gl-circular-progress-track"
					cx={centre}
					cy={centre}
					r={radius}
					fill="none"
					strokeWidth={stroke}
				/>
				<circle
					className="gl-circular-progress-arc"
					cx={centre}
					cy={centre}
					r={radius}
					fill="none"
					strokeWidth={stroke}
					pathLength={100}
					strokeDasharray={isDeterminate ? "100 100" : undefined}
					strokeDashoffset={isDeterminate ? 100 - clamped : undefined}
					style={
						isDeterminate && clamped <= 0 ? { visibility: "hidden" } : undefined
					}
				/>
			</svg>
			{showValue && isDeterminate && pixels >= 40 ? (
				<Progress.Value
					className="gl-circular-progress-value"
					style={{ fontSize: Math.round(pixels * 0.27) }}
				>
					{() => `${Math.round(clamped)}%`}
				</Progress.Value>
			) : null}
		</Progress.Root>
	);
}
