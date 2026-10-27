"use client";
import { Input } from "@base-ui/react/input";
import { Field } from "@base-ui/react/field";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useControlled, useForkRef, useId } from "../../internal/hooks.js";
import { TextareaAutosize } from "../TextareaAutosize/index.js";
import {
	FieldShell,
	focusFromPadding,
	hasContent,
	idList,
	renderSlot,
} from "../../internal/field.js";

export type FieldBaseProps = {
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: boolean;
	required?: boolean;
	disabled?: boolean;
	fullWidth?: boolean;
	size?: "sm" | "md";
	variant?: "outlined" | "filled";
};
export type InputAdornmentProps = React.HTMLAttributes<HTMLSpanElement> & {
	position: "start" | "end";
	children?: React.ReactNode;
};
export function InputAdornment({
	position,
	className,
	children,
	ref,
	...rest
}: InputAdornmentProps & {
	ref?: React.Ref<HTMLSpanElement>;
}) {
	return (
		<span
			ref={ref}
			className={cx(
				"gl-field-adornment",
				`gl-field-adornment-${position}`,
				className,
			)}
			{...rest}
		>
			{children}
		</span>
	);
}

InputAdornment.__glAdornment = true;
export type TextFieldProps = FieldBaseProps &
	Omit<
		React.HTMLAttributes<HTMLDivElement>,
		"onChange" | "defaultValue" | "onInput"
	> & {
		value?: string;
		defaultValue?: string;
		onChange?: (
			event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
			value: string,
		) => void;
		type?: "text" | "email" | "password" | "number" | "search" | "tel" | "url";
		placeholder?: string;
		name?: string;
		id?: string;
		autoComplete?: string;
		autoFocus?: boolean;
		readOnly?: boolean;
		multiline?: boolean;
		minRows?: number;
		maxRows?: number;
		rows?: number;
		maxLength?: number;
		showCount?: boolean;
		startAdornment?: React.ReactNode;
		endAdornment?: React.ReactNode;
		inputProps?: Record<string, unknown>;
		inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
	};
export function TextField({
	ref,
	...props
}: TextFieldProps & {
	ref?: React.Ref<HTMLDivElement>;
}) {
	const {
		label,
		helperText,
		error = false,
		required = false,
		disabled = false,
		readOnly = false,
		fullWidth = false,
		size = "md",
		variant = "outlined",
		value: valueProp,
		defaultValue,
		onChange,
		type = "text",
		placeholder,
		name,
		id: idProp,
		autoComplete,
		autoFocus,
		multiline = false,
		minRows,
		maxRows,
		rows,
		maxLength,
		showCount = false,
		startAdornment,
		endAdornment,
		inputProps,
		inputRef,
		className,
		style,
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledby,
		"aria-describedby": ariaDescribedby,
		...rest
	} = props;
	const id = useId(idProp);
	const [value, setValue] = useControlled<string>(
		valueProp,
		defaultValue ?? "",
	);
	const [focused, setFocused] = React.useState(false);
	const innerRef = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(
		null,
	);
	const extra = (inputProps ?? {}) as Record<string, unknown> & {
		className?: string;
		ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
		onFocus?: (
			event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
		) => void;
		onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
		onBlur?: (
			event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
		) => void;
		"aria-describedby"?: string;
	};
	const handleRef = useForkRef(innerRef, inputRef, extra.ref);
	const helperId = `${id}-helper`;
	const counterId = `${id}-count`;
	const start = renderSlot(startAdornment, "start", `${id}-start`);
	const end = renderSlot(endAdornment, "end", `${id}-end`);
	const text = value;
	const counter = showCount ? (
		<span id={counterId} className="gl-field-counter">
			<span aria-hidden="true">
				{maxLength !== undefined && maxLength !== 0 && !Number.isNaN(maxLength)
					? `${text.length}/${maxLength}`
					: text.length}
			</span>
			<span className="gl-sr-only">
				{maxLength !== undefined && maxLength !== 0 && !Number.isNaN(maxLength)
					? `${text.length} of ${maxLength} characters`
					: `${text.length} characters`}
			</span>
		</span>
	) : null;
	const shared = {
		...extra,
		ref: handleRef,
		id,
		name,
		placeholder,
		disabled,
		readOnly,
		required,
		autoFocus,
		autoComplete,
		maxLength,
		value: text,
		className: cx("gl-field-input", extra.className),
		"aria-label": ariaLabel,
		"aria-labelledby": ariaLabelledby,
		"aria-invalid": error || undefined,
		"aria-describedby": idList(
			hasContent(helperText) && helperId,
			showCount && counterId,
			start.text && start.id,
			end.text && end.id,
			ariaDescribedby,
			extra["aria-describedby"],
		),
		onChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
			(
				extra.onChange as
					| ((
							ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
					  ) => void)
					| undefined
			)?.(event);
			setValue(event.target.value);
			onChange?.(event, event.target.value);
		},
		onFocus(event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
			setFocused(true);
			extra.onFocus?.(event);
		},
		onBlur(event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
			setFocused(false);
			extra.onBlur?.(event);
		},
	};
	return (
		<FieldShell
			rootRef={ref}
			kind="gl-text-field"
			className={className}
			style={style}
			rootProps={rest}
			label={label}
			labelId={`${id}-label`}
			htmlFor={id}
			helperText={helperText}
			helperId={helperId}
			counter={counter}
			error={error}
			required={required}
			disabled={disabled}
			readOnly={readOnly}
			fullWidth={fullWidth}
			size={size}
			variant={variant}
			multiline={multiline}
		>
			<div
				className="gl-field-control"
				data-focused={focused && !disabled ? "" : undefined}
				onMouseDown={(event: React.MouseEvent<HTMLDivElement>) => {
					focusFromPadding(event, innerRef.current, disabled);
				}}
			>
				{start.el}
				{multiline ? (
					<Field.Control
						{...shared}
						render={
							<TextareaAutosize
								minRows={rows ?? minRows ?? 1}
								maxRows={rows ?? maxRows}
							/>
						}
					/>
				) : (
					<Input
						type={type}
						{...shared}
						onKeyDown={(event) => {
							extra.onKeyDown?.(event);
							if (event.key === "Enter") {
								event.preventBaseUIHandler();
							}
						}}
					/>
				)}
				{end.el}
			</div>
		</FieldShell>
	);
}
