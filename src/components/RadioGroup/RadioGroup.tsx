"use client";
import * as React from "react";
import {
	RadioControl,
	RadioGroupControl,
} from "../../internal/form-control.js";
import { idList } from "../../internal/field.js";
import { cx } from "../../internal/cx.js";
import { useId } from "../../internal/hooks.js";
import { Icon } from "../Icon/index.js";

type RadioGroupContextValue = {
	disabled: boolean;
	required: boolean;
	error: boolean;
	size: "sm" | "md";
};
const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
	null,
);
export type RadioProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	| "type"
	| "size"
	| "onChange"
	| "value"
	| "checked"
	| "defaultChecked"
	| "children"
> & {
	value: string;
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: (
		event: React.ChangeEvent<HTMLInputElement>,
		isChecked: boolean,
	) => void;
	size?: "sm" | "md";
	error?: boolean;
	disabled?: boolean;
	id?: string;
	"aria-describedby"?: string;
	className?: string;
	style?: React.CSSProperties;
};
export function Radio({
	ref,
	value,
	label,
	helperText,
	checked: checkedProp,
	defaultChecked,
	onChange,
	size: sizeProp,
	error: errorProp,
	disabled: disabledProp = false,
	name: nameProp,
	required: requiredProp,
	className,
	style,
	id: idProp,
	"aria-describedby": describedBy,
	...rest
}: RadioProps & {
	ref?: React.Ref<HTMLInputElement>;
}) {
	const group = React.use(RadioGroupContext);
	const id = useId(idProp);
	const helperId =
		helperText !== null && helperText !== undefined
			? `${id}-helper`
			: undefined;
	const size = sizeProp ?? group?.size ?? "md";
	const isError = errorProp ?? group?.error ?? false;
	const isDisabled = disabledProp || group?.disabled === true;
	return (
		<span
			className={cx(
				"gl-radio",
				`gl-radio-${size}`,
				isError && "gl-radio-error",
				isDisabled && "gl-radio-disabled",
				className,
			)}
			style={style}
		>
			<label className="gl-radio-row">
				<span className="gl-radio-control">
					<RadioControl
						{...rest}
						ref={ref}
						id={id}
						className="gl-radio-input"
						name={nameProp}
						value={value}
						checked={group ? undefined : checkedProp}
						defaultChecked={group ? undefined : defaultChecked}
						disabled={isDisabled}
						required={requiredProp ?? group?.required}
						aria-invalid={isError || undefined}
						aria-describedby={idList(describedBy, helperId)}
						onChange={onChange}
					>
						<span className="gl-radio-circle" aria-hidden="true" />
					</RadioControl>
				</span>
				{label !== null && label !== undefined ? (
					<span className="gl-radio-label">{label}</span>
				) : null}
			</label>
			{helperText !== null && helperText !== undefined ? (
				<span id={helperId} className="gl-radio-helper">
					{helperText}
				</span>
			) : null}
		</span>
	);
}

export type RadioGroupProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"onChange" | "defaultValue"
> & {
	label?: React.ReactNode;
	name?: string;
	value?: string | null;
	defaultValue?: string | null;
	onChange?: (
		event: React.ChangeEvent<HTMLInputElement>,
		value: string,
	) => void;
	row?: boolean;
	helperText?: React.ReactNode;
	error?: boolean;
	required?: boolean;
	disabled?: boolean;
	size?: "sm" | "md";
	id?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	className?: string;
	children?: React.ReactNode;
};
export function RadioGroup({
	ref,
	label,
	name: nameProp,
	value,
	defaultValue = null,
	onChange,
	row = false,
	helperText,
	error = false,
	required = false,
	disabled = false,
	size = "md",
	className,
	children,
	id: idProp,
	"aria-labelledby": labelledBy,
	"aria-describedby": describedBy,
	...rest
}: RadioGroupProps & {
	ref?: React.Ref<HTMLDivElement>;
}) {
	const id = useId(idProp);
	const name = nameProp ?? `${id}-choice`;
	const labelId =
		label !== null && label !== undefined ? `${id}-label` : undefined;
	const helperId =
		helperText !== null && helperText !== undefined
			? `${id}-helper`
			: undefined;
	const context = React.useMemo<RadioGroupContextValue>(
		() => ({ disabled, required, error, size }),
		[disabled, required, error, size],
	);
	return (
		<RadioGroupControl
			ref={ref}
			name={name}
			value={value}
			defaultValue={defaultValue}
			required={required}
			disabled={disabled}
			id={id}
			role="radiogroup"
			aria-labelledby={idList(labelledBy, labelId)}
			aria-describedby={idList(describedBy, helperId)}
			aria-required={required || undefined}
			aria-invalid={error || undefined}
			aria-disabled={disabled || undefined}
			className={cx(
				"gl-radio-group",
				row && "gl-radio-group-row",
				error && "gl-radio-group-error",
				disabled && "gl-radio-group-disabled",
				className,
			)}
			onChange={onChange}
			{...rest}
		>
			{label !== null && label !== undefined ? (
				<span id={labelId} className="gl-radio-group-label">
					{label}
					{required ? (
						<span className="gl-radio-group-asterisk" aria-hidden="true">
							{" *"}
						</span>
					) : null}
				</span>
			) : null}
			<div className="gl-radio-group-options">
				<RadioGroupContext value={context}>{children}</RadioGroupContext>
			</div>
			{helperText !== null && helperText !== undefined ? (
				<span id={helperId} className="gl-radio-group-helper">
					{error ? (
						<Icon
							name="error"
							size={14}
							className="gl-radio-group-helper-icon"
						/>
					) : null}
					<span>{helperText}</span>
				</span>
			) : null}
		</RadioGroupControl>
	);
}
