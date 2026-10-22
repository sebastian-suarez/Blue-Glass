"use client";
import { Progress } from "@base-ui/react/progress";
import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { useId } from "../../internal/hooks.js";

export type LinearProgressProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"color"
> & {
	/**
	determinate: a bar for value. buffer: value plus valueBuffer. indeterminate (default): a bar slides while the length is unknown.
	*/
	variant?: "determinate" | "indeterminate" | "buffer";
	/**
	Progress from 0 to 100 (determinate and buffer).
	*/
	value?: number;
	/**
	How much is ready ahead of value, 0 to 100 (buffer), drawn in color-ring at 40%.
	*/
	valueBuffer?: number;
	/**
	Visible label above the track; it also names the progressbar.
	*/
	label?: React.ReactNode;
	/**
	A readable value shown at the end of the label row and read as aria-valuetext ("3 of 5 files").
	*/
	valueText?: string;
	/**
	Show the rounded percentage at the end of the label row (determinate and buffer).
	*/
	showValue?: boolean;
	/**
	default: color-blue on a color-line track. inherit: currentColor, for dark grounds.
	*/
	color?: "default" | "inherit";
};

export type CircularProgressProps = Omit<
	React.HTMLAttributes<HTMLSpanElement>,
	"color"
> & {
	/**
	determinate: an arc for value. indeterminate (default): a turning arc that grows and shrinks.
	*/
	variant?: "determinate" | "indeterminate";
	/**
	Progress from 0 to 100 (determinate).
	*/
	value?: number;
	/**
	xs 20px, sm 28px, md 40px (default), lg 56px, or a number of px.
	*/
	size?: "xs" | "sm" | "md" | "lg" | number;
	/**
	Ring stroke in px. Default 2.5, 3, 4 or 4.5 by size.
	*/
	thickness?: number;
	/**
	Show the rounded percentage in the middle (determinate, 40px and up).
	*/
	showValue?: boolean;
	/**
	default: color-blue on a color-line ring. inherit: currentColor, for dark grounds.
	*/
	color?: "default" | "inherit";
};

/**
A value from 0 to 100; anything that isn't a finite number is 0.
*/
function clamp(value: number): number {
	return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}

const isUnset = (value: unknown) => value === undefined || value === null;

/**
Whether the caller named the progressbar with aria-label or aria-labelledby.
*/
function isNamedBy(attributes: React.AriaAttributes): boolean {
	return (
		!isUnset(attributes["aria-label"]) ||
		!isUnset(attributes["aria-labelledby"])
	);
}

/**
A 4px pill track in color-line with a color-blue bar: determinate, buffered, or sliding while the length is unknown.
*/
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
			// null keeps Base UI indeterminate: no aria-valuenow, no indicator width.
			value={isDeterminate ? clamped : null}
			// The documented attributes, set while rendering so the server HTML has them: the rounded
			// value, the label's id (Base UI wires it only once the label mounts), and valueText alone
			// as aria-valuetext, where Base UI would read out a percentage in the runtime's locale.
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
			{/* The indeterminate bar is the track's ::before; the others grow from the start. */}
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

/**
The ring's stroke for its size, as the reference picks it.
*/
function strokeFor(pixels: number): number {
	if (pixels <= 20) {
		return 2.5;
	}

	if (pixels <= 28) {
		return 3;
	}

	return pixels <= 40 ? 4 : 4.5;
}

/**
An SVG ring: color-line track and a color-blue arc with round caps; determinate, or turning while the length is unknown.
*/
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
			// The documented root is a span, so the ring sits in a line of text.
			render={<span />}
			ref={ref as React.Ref<HTMLDivElement> | undefined}
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
				{/* pathLength 100: dash lengths and offsets read as percentages of the ring. */}
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
					// At 0 the round caps would still draw a dot.
					style={isDeterminate && clamped <= 0 ? { visibility: "hidden" } : undefined}
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
