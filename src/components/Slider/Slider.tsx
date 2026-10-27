"use client";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import * as React from "react";
import { documentedEvent, rememberReactEvent } from "../../internal/events.js";
import { cx } from "../../internal/cx.js";
import {
	useControlled,
	useForkRef,
	useIsoLayoutEffect,
} from "../../internal/hooks.js";

export type SliderMark = {
	value: number;
	label?: React.ReactNode;
};
export type SliderProps = Omit<
	React.HTMLAttributes<HTMLSpanElement>,
	"onChange" | "defaultValue"
> & {
	value?: number | number[];
	defaultValue?: number | number[];
	onChange?: (
		event: React.SyntheticEvent,
		value: number | number[],
		activeThumb: number,
	) => void;
	onChangeCommitted?: (
		event: React.SyntheticEvent,
		value: number | number[],
	) => void;
	min?: number;
	max?: number;
	step?: number | null;
	shiftStep?: number;
	marks?: boolean | SliderMark[];
	orientation?: "horizontal" | "vertical";
	disabled?: boolean;
	track?: "normal" | "inverted" | false;
	valueLabelDisplay?: "auto" | "on" | "off";
	valueLabelFormat?:
		string | ((value: number, index: number) => React.ReactNode);
	getAriaValueText?: (value: number, index: number) => string;
	getAriaLabel?: (index: number) => string;
	name?: string;
};
function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(maximum, Math.max(minimum, value));
}

function decimals(value: number): number {
	const text = String(value);
	if (text.includes("e-")) {
		return Number(text.split("e-", 2)[1]);
	}

	const index = text.indexOf(".");
	return index === -1 ? 0 : text.length - index - 1;
}

export function Slider({
	ref,
	value: valueProp,
	defaultValue,
	onChange,
	onChangeCommitted,
	min = 0,
	max = 100,
	step = 1,
	shiftStep,
	marks: marksProp = false,
	orientation = "horizontal",
	disabled = false,
	track = "normal",
	valueLabelDisplay = "auto",
	valueLabelFormat,
	getAriaValueText,
	getAriaLabel,
	name,
	className,
	"aria-label": ariaLabel,
	"aria-labelledby": ariaLabelledby,
	"aria-describedby": ariaDescribedby,
	...rest
}: SliderProps & { ref?: React.Ref<HTMLSpanElement> }) {
	const [state, setState] = useControlled(valueProp, defaultValue ?? min);
	const isRange = Array.isArray(state);
	const values = (
		Array.isArray(state) ? state.toSorted((a, b) => a - b) : [state]
	).map((value) => clamp(value, min, max));
	const isVertical = orientation === "vertical";
	const rootRef = React.useRef<HTMLSpanElement | null>(null);
	const handleRef = useForkRef(rootRef, ref);
	const currentRef = React.useRef(values);
	const interactionRef = React.useRef<React.SyntheticEvent | null>(null);

	const rememberInteraction = (event: React.SyntheticEvent) => {
		rememberReactEvent(event);
		interactionRef.current = event;
	};

	useIsoLayoutEffect(() => {
		currentRef.current = values;
	});
	const marks = React.useMemo<SliderMark[]>(() => {
		if (Array.isArray(marksProp)) {
			return marksProp;
		}

		if (!marksProp || step === null || step <= 0) {
			return [];
		}

		const count = Math.floor((max - min) / step);
		if (count > 200) {
			return [];
		}

		const result: SliderMark[] = [];
		const precision = decimals(step);
		for (let index = 0; index <= count; index++) {
			const increment = index * step;
			const position = min + increment;
			result.push({ value: Number(position.toFixed(precision)) });
		}

		return result;
	}, [marksProp, step, min, max]);
	const markValues = marks.map((mark) => mark.value).toSorted((a, b) => a - b);
	const bounds = (current: number[], index: number): [number, number] => [
		index > 0 ? current[index - 1] : min,
		index < current.length - 1 ? current[index + 1] : max,
	];
	const output = (current: number[]): number | number[] =>
		isRange ? current : current[0];
	const snap = (raw: number): number => {
		const value = clamp(raw, min, max);
		if (step === null) {
			if (markValues.length === 0) {
				return value;
			}

			let nearest = markValues[0];
			for (const mark of markValues) {
				if (Math.abs(mark - value) < Math.abs(nearest - value)) {
					nearest = mark;
				}
			}

			return nearest;
		}

		if (step <= 0) {
			return value;
		}

		const rounded = Math.round((value - min) / step) * step;
		const position = Number((rounded + min).toFixed(decimals(step)));
		return clamp(position, min, max);
	};

	const commit = (event: React.SyntheticEvent, index: number, raw: number) => {
		const { current } = currentRef;
		const [low, high] = bounds(current, index);
		const value = clamp(snap(raw), low, high);
		if (value === current[index]) {
			return;
		}

		const next = [...current];
		next[index] = value;
		currentRef.current = next;
		setState(output(next));
		onChange?.(event, output(next), index);
		onChangeCommitted?.(event, output(next));
	};

	const onMarkKeyDown = (
		event: React.KeyboardEvent<HTMLInputElement>,
		index: number,
	) => {
		if (disabled || step !== null) {
			return;
		}

		const { current } = currentRef;
		const [low, high] = bounds(current, index);
		let next: number;
		switch (event.key) {
			case "ArrowRight":
			case "ArrowUp":
			case "PageUp": {
				next =
					markValues.find((value) => value > current[index]) ?? current[index];
				break;
			}

			case "ArrowLeft":
			case "ArrowDown":
			case "PageDown": {
				next =
					markValues.findLast((value) => value < current[index]) ??
					current[index];
				break;
			}

			case "Home": {
				next = low;
				break;
			}

			case "End": {
				next = high;
				break;
			}

			default: {
				return;
			}
		}

		event.preventDefault();
		commit(event, index, next);
	};

	const format = (value: number, index: number): React.ReactNode =>
		typeof valueLabelFormat === "function"
			? valueLabelFormat(value, index)
			: (valueLabelFormat ?? value);
	const valueText = (value: number, index: number): string | undefined => {
		if (getAriaValueText) {
			return getAriaValueText(value, index);
		}

		const formatted = format(value, index);
		return typeof formatted === "string" && formatted !== String(value)
			? formatted
			: undefined;
	};

	const percentage = (value: number) =>
		max === min ? 0 : ((value - min) / (max - min)) * 100;
	const at = (position: number): React.CSSProperties =>
		isVertical ? { bottom: `${position}%` } : { left: `${position}%` };
	const first = values[0];
	const last = values.at(-1)!;
	const start = isRange || track === "inverted" ? percentage(first) : 0;
	const end = isRange
		? percentage(last)
		: track === "inverted"
			? 100
			: percentage(first);
	const isInTrack = (value: number) => {
		if (track === false) {
			return false;
		}

		if (isRange) {
			return value >= first && value <= last;
		}

		return track === "inverted" ? value >= first : value <= first;
	};

	const hasLabels = marks.some(
		(mark) =>
			mark.label !== undefined && mark.label !== null && mark.label !== "",
	);
	const continuousStep = (max - min) / 10_000;
	const largeStep = shiftStep ?? (step === null ? (max - min) / 10 : step * 10);
	return (
		<BaseSlider.Root
			ref={handleRef}
			render={<span />}
			{...rest}
			value={isRange ? values : first}
			min={min}
			max={max}
			step={step ?? continuousStep}
			largeStep={largeStep}
			orientation={orientation}
			disabled={disabled}
			name={name}
			thumbCollisionBehavior="none"
			className={cx(
				"gl-slider",
				isVertical ? "gl-slider-vertical" : "gl-slider-horizontal",
				disabled && "gl-slider-disabled",
				hasLabels && "gl-slider-labelled",
				valueLabelDisplay === "on" && "gl-slider-label-on",
				valueLabelDisplay === "auto" && "gl-slider-label-auto",
				className,
			)}
			onKeyDownCapture={(event) => {
				rest.onKeyDownCapture?.(event);
				rememberInteraction(event);
			}}
			onPointerDownCapture={(event) => {
				rest.onPointerDownCapture?.(event);
				rememberInteraction(event);
			}}
			onPointerMoveCapture={(event) => {
				rest.onPointerMoveCapture?.(event);
				rememberInteraction(event);
			}}
			onPointerUpCapture={(event) => {
				rest.onPointerUpCapture?.(event);
				rememberInteraction(event);
			}}
			onValueChange={(next, details) => {
				const nextValues = Array.isArray(next) ? [...next] : [next];
				const index = details.activeThumbIndex;
				const [low, high] = bounds(currentRef.current, index);
				nextValues[index] = clamp(snap(nextValues[index]), low, high);
				if (nextValues[index] === currentRef.current[index]) {
					details.cancel();
					return;
				}

				currentRef.current = nextValues;
				setState(output(nextValues));
				onChange?.(
					interactionRef.current ??
						documentedEvent(details.event, rootRef.current ?? undefined),
					output(nextValues),
					index,
				);
			}}
			onValueCommitted={(_next, details) => {
				onChangeCommitted?.(
					documentedEvent(details.event, rootRef.current ?? undefined),
					output(currentRef.current),
				);
			}}
		>
			<BaseSlider.Control render={<span />} className="gl-slider-control">
				<span className="gl-slider-rail" />
				{track === false ? null : (
					<span
						className="gl-slider-track"
						style={
							isVertical
								? { bottom: `${start}%`, height: `${end - start}%` }
								: { left: `${start}%`, width: `${end - start}%` }
						}
					/>
				)}
				{marks.map((mark) => {
					const position = percentage(clamp(mark.value, min, max));
					const active = isInTrack(mark.value) ? "" : undefined;
					return (
						<React.Fragment key={mark.value}>
							<span
								className="gl-slider-mark"
								style={at(position)}
								data-active={active}
							/>
							{mark.label !== undefined &&
							mark.label !== null &&
							mark.label !== "" ? (
								<span
									aria-hidden="true"
									className="gl-slider-mark-label"
									style={at(position)}
									data-active={active}
									data-edge={
										position <= 0
											? "start"
											: position >= 100
												? "end"
												: undefined
									}
								>
									{mark.label}
								</span>
							) : null}
						</React.Fragment>
					);
				})}
				{values.map((value, index) => {
					const [low, high] = bounds(values, index);
					return (
						<BaseSlider.Thumb
							// eslint-disable-next-line @eslint-react/no-array-index-key
							key={index}
							index={index}
							getAriaValueText={(_formatted, thumbValue, thumbIndex) =>
								valueText(thumbValue, thumbIndex)!
							}
							render={(props, thumb) => (
								<span
									{...props}
									data-active={
										thumb.dragging && thumb.activeThumbIndex === index
											? ""
											: undefined
									}
								/>
							)}
							inputRef={(element) => {
								if (!element) {
									return;
								}

								element.setAttribute("aria-valuemin", String(low));
								element.setAttribute("aria-valuemax", String(high));
							}}
							className="gl-slider-thumb"
							style={{
								...at(percentage(value)),
								transform: "none",
								...(isVertical && { top: "auto" }),
							}}
							aria-disabled={disabled || undefined}
							aria-label={getAriaLabel ? getAriaLabel(index) : ariaLabel}
							aria-labelledby={getAriaLabel ? undefined : ariaLabelledby}
							aria-describedby={ariaDescribedby}
							onKeyDown={(event) => {
								onMarkKeyDown(event, index);
							}}
						>
							{valueLabelDisplay === "off" ? null : (
								<span className="gl-slider-value" aria-hidden="true">
									{format(value, index)}
								</span>
							)}
						</BaseSlider.Thumb>
					);
				})}
			</BaseSlider.Control>
		</BaseSlider.Root>
	);
}
