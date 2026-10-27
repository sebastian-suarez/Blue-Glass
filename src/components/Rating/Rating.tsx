"use client";
import * as React from "react";
import {
	RadioControl,
	RadioGroupControl,
} from "../../internal/form-control.js";
import { cx } from "../../internal/cx.js";
import { useControlled, useId } from "../../internal/hooks.js";
import { Icon } from "../Icon/index.js";

function decimalsOf(n: number): number {
	const text = String(n);
	const dot = text.indexOf(".");
	return dot === -1 ? 0 : text.length - dot - 1;
}

function roundTo(value: number, precision: number): number {
	return Number(
		(Math.round(value / precision) * precision).toFixed(decimalsOf(precision)),
	);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export type RatingProps = Omit<
	React.HTMLAttributes<HTMLSpanElement>,
	"onChange" | "defaultValue" | "children"
> & {
	value?: number | null;
	defaultValue?: number | null;
	onChange?: (event: React.SyntheticEvent, value: number | null) => void;
	onChangeActive?: (event: React.SyntheticEvent, value: number) => void;
	max?: number;
	precision?: number;
	readOnly?: boolean;
	disabled?: boolean;
	size?: "sm" | "md" | "lg";
	name?: string;
	label?: React.ReactNode;
	getLabelText?: (value: number) => string;
	emptyLabelText?: string;
	id?: string;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	className?: string;
};
export function Rating({
	ref,
	value: valueProp,
	defaultValue = null,
	onChange,
	onChangeActive,
	max = 5,
	precision = 1,
	readOnly = false,
	disabled = false,
	size = "md",
	name: nameProp,
	label,
	getLabelText,
	emptyLabelText = "No rating",
	className,
	id: idProp,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledby,
	...rest
}: RatingProps & {
	ref?: React.Ref<HTMLSpanElement>;
}) {
	const baseId = useId(idProp);
	const name = nameProp ?? `${baseId}-rating`;
	const [valueState, setValue] = useControlled<number | null>(
		valueProp,
		defaultValue,
	);
	const value =
		valueState === null || valueState === undefined
			? null
			: roundTo(clamp(valueState, 0, max), precision);
	const [hover, setHover] = React.useState(-1);
	const starsRef = React.useRef<HTMLSpanElement | null>(null);
	const isInteractive = !readOnly && !disabled;
	const textFor = getLabelText ?? ((v: number) => `${v} out of ${max} stars`);
	const shown = isInteractive && hover !== -1 ? hover : (value ?? 0);
	const steps = Math.max(1, Math.round(1 / precision));
	const commit = (event: React.SyntheticEvent, next: number | null) => {
		setValue(next);
		onChange?.(event, next);
	};

	const handlePointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
		if (!isInteractive || event.pointerType !== "mouse" || !starsRef.current) {
			return;
		}

		const node = starsRef.current;
		const { left, right, width } = node.getBoundingClientRect();
		if (width === 0) {
			return;
		}

		const isRtl = getComputedStyle(node).direction === "rtl";
		const distance = isRtl ? right - event.clientX : event.clientX - left;
		const percent = distance / width;
		const position = max * percent;
		const halfStep = precision / 2;
		const next = clamp(roundTo(position + halfStep, precision), precision, max);
		if (next === hover) {
			return;
		}

		setHover(next);
		onChangeActive?.(event, next);
	};

	const handlePointerLeave = (event: React.PointerEvent<HTMLSpanElement>) => {
		if (hover === -1) {
			return;
		}

		setHover(-1);
		onChangeActive?.(event, -1);
	};

	const stars: React.ReactNode[] = [];
	for (let i = 1; i <= max; i += 1) {
		const fill = clamp(shown - (i - 1), 0, 1);
		const fillStyle:
			(React.CSSProperties & { "--gl-rating-fill": string }) | undefined =
			fill < 1
				? { "--gl-rating-fill": `${Math.round(fill * 100)}%` }
				: undefined;
		const hits: React.ReactNode[] = [];
		if (!readOnly) {
			for (let k = 1; k <= steps; k += 1) {
				const fraction = k * precision;
				const stepValue = roundTo(i - 1 + fraction, precision);
				const inputId = `${baseId}-${String(stepValue).replace(".", "-")}`;
				const segment =
					steps > 1
						? {
								insetInlineStart: `${((k - 1) / steps) * 100}%`,
								width: `${100 / steps}%`,
							}
						: undefined;
				hits.push(
					<React.Fragment key={k}>
						<RadioControl
							className="gl-rating-input gl-sr-only"
							id={inputId}
							name={name}
							value={String(stepValue)}
							disabled={disabled}
						/>
						<label
							htmlFor={inputId}
							className="gl-rating-hit"
							style={segment}
							onClick={(event: React.MouseEvent<HTMLLabelElement>) => {
								if (!isInteractive || stepValue !== value) {
									return;
								}

								event.preventDefault();
								setHover(-1);
								commit(event, null);
							}}
						>
							<span className="gl-sr-only">{textFor(stepValue)}</span>
						</label>
					</React.Fragment>,
				);
			}
		}

		stars.push(
			<span
				key={i}
				className={cx(
					"gl-rating-star",
					isInteractive &&
						hover !== -1 &&
						Math.ceil(hover) === i &&
						"gl-rating-star-hover",
				)}
			>
				<span className="gl-rating-icon" aria-hidden="true">
					<Icon name="star" className="gl-rating-empty" />
					{fill > 0 ? (
						<Icon
							filled
							name="star"
							className="gl-rating-fill"
							style={fillStyle}
						/>
					) : null}
				</span>
				{hits}
			</span>,
		);
	}

	const valueText =
		value === null || value === undefined ? emptyLabelText : textFor(value);
	return (
		<span
			ref={ref}
			id={idProp}
			className={cx(
				"gl-rating",
				`gl-rating-${size}`,
				readOnly && "gl-rating-readonly",
				disabled && "gl-rating-disabled",
				className,
			)}
			{...rest}
		>
			{readOnly ? (
				<span
					ref={starsRef}
					className="gl-rating-stars"
					role="img"
					aria-label={
						ariaLabel !== undefined && ariaLabel !== ""
							? `${ariaLabel}: ${valueText}`
							: valueText
					}
				>
					{stars}
				</span>
			) : (
				<RadioGroupControl
					ref={starsRef as React.Ref<HTMLDivElement>}
					name={name}
					value={value === null ? "" : String(value)}
					disabled={disabled}
					className="gl-rating-stars"
					aria-label={
						ariaLabelledby !== undefined && ariaLabelledby !== ""
							? undefined
							: (ariaLabel ?? "Rating")
					}
					aria-labelledby={ariaLabelledby}
					aria-disabled={disabled || undefined}
					onChange={(event, next) => {
						commit(event, next === "" ? null : Number(next));
					}}
					onPointerMove={isInteractive ? handlePointerMove : undefined}
					onPointerLeave={isInteractive ? handlePointerLeave : undefined}
				>
					{stars}
					{isInteractive ? (
						<>
							<RadioControl
								className="gl-rating-input gl-rating-none gl-sr-only"
								id={`${baseId}-none`}
								value=""
							/>
							<label htmlFor={`${baseId}-none`} className="gl-sr-only">
								{emptyLabelText}
							</label>
						</>
					) : null}
				</RadioGroupControl>
			)}
			{label !== null && label !== undefined ? (
				<span className="gl-rating-label">{label}</span>
			) : null}
		</span>
	);
}
