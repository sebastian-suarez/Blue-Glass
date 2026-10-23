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
	/**
This option's value: what the group's value becomes when it is chosen.
*/
	value: string;
	/**
The visible label. Clicking it chooses the option.
*/
	label?: React.ReactNode;
	/**
A second line under the label, linked by aria-describedby.
*/
	helperText?: React.ReactNode;
	/**
Checked, controlled. Inside a RadioGroup the group's value decides.
*/
	checked?: boolean;
	/**
Initially checked, uncontrolled (outside a RadioGroup).
*/
	defaultChecked?: boolean;
	/**
Called with the change event and true when this option becomes checked.
*/
	onChange?: (
		event: React.ChangeEvent<HTMLInputElement>,
		isChecked: boolean,
	) => void;
	/**
Md: a 20px circle (default). sm: a 16px circle. Inherits the group's.
*/
	size?: "sm" | "md";
	/**
Invalid: a danger ring and aria-invalid. Inherits the group's.
*/
	error?: boolean;
	/**
Disables this option. The group's disabled disables every option.
*/
	disabled?: boolean;
	/**
The input's id; generated when omitted.
*/
	id?: string;
	/**
Ids of more descriptions for the input; the helper text's id is added to them.
*/
	"aria-describedby"?: string;
	/**
Classes on the root wrapper. The ref and every other attribute go to the native input.
*/
	className?: string;
	/**
Style on the root wrapper.
*/
	style?: React.CSSProperties;
};
/**
One native radio drawn as a Blue Glass circle: a dg-edge outline, then an ink ring and dot once chosen.
*/
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
	/**
The visible group label. It sits above the options and names the radiogroup.
*/
	label?: React.ReactNode;
	/**
The name every radio shares; generated when omitted.
*/
	name?: string;
	/**
The chosen value, controlled; null for none.
*/
	value?: string | null;
	/**
The initially chosen value, uncontrolled.
*/
	defaultValue?: string | null;
	/**
Called with the change event and the newly chosen value.
*/
	onChange?: (
		event: React.ChangeEvent<HTMLInputElement>,
		value: string,
	) => void;
	/**
Lay the options out in a wrapping row instead of a column.
*/
	row?: boolean;
	/**
A line under the options, linked by aria-describedby. With error, it is the error message.
*/
	helperText?: React.ReactNode;
	/**
Invalid: danger rings, aria-invalid, and helperText in danger with an error icon.
*/
	error?: boolean;
	/**
Required: an asterisk on the label, aria-required, and required on every radio.
*/
	required?: boolean;
	/**
Disables every option.
*/
	disabled?: boolean;
	/**
Md: 20px circles (default). sm: 16px circles.
*/
	size?: "sm" | "md";
	/**
The group's id; generated when omitted. The label and helper ids derive from it.
*/
	id?: string;
	/**
Ids of more labels for the group; the visible label's id is added to them.
*/
	"aria-labelledby"?: string;
	/**
Ids of more descriptions for the group; the helper text's id is added to them.
*/
	"aria-describedby"?: string;
	/**
Classes on the radiogroup element.
*/
	className?: string;
	/**
Radio elements.
*/
	children?: React.ReactNode;
};
/**
A labelled set of Radios sharing one name. The browser's own arrow keys move the choice; Tab leaves the group.
*/
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
