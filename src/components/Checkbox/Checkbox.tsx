"use client";
import * as React from "react";
import { CheckboxControl } from "../../internal/form-control.js";
import { idList } from "../../internal/field.js";
import { cx } from "../../internal/cx.js";
import { useId } from "../../internal/hooks.js";
import { Icon } from "../Icon/index.js";

export type CheckboxProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"type" | "size" | "onChange" | "checked" | "defaultChecked" | "children"
> & {
	/**
Checked, controlled.
*/
	checked?: boolean;
	/**
Initially checked, uncontrolled.
*/
	defaultChecked?: boolean;
	/**
Called with the change event and the new checked state.
*/
	onChange?: (
		event: React.ChangeEvent<HTMLInputElement>,
		isChecked: boolean,
	) => void;
	/**
The mixed state (a minus): some, not all, of a set is checked. Sets the input's indeterminate property.
*/
	indeterminate?: boolean;
	/**
The visible label. Clicking it toggles the box. Without one, give the checkbox an aria-label.
*/
	label?: React.ReactNode;
	/**
A line under the label, linked by aria-describedby. With error, it is the error message.
*/
	helperText?: React.ReactNode;
	/**
Invalid: a danger border, aria-invalid, and helperText in danger with an error icon.
*/
	error?: boolean;
	/**
Md: a 20px box (default). sm: a 16px box.
*/
	size?: "sm" | "md";
	/**
Disables the input and dims the row.
*/
	disabled?: boolean;
	/**
Sets required on the input and marks the label with an asterisk.
*/
	required?: boolean;
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
A native checkbox drawn as a Blue Glass box: a 1.5px dg-edge outline on glass, filled with ink when checked or mixed.
*/
export function Checkbox({
	ref,
	checked,
	defaultChecked = false,
	onChange,
	indeterminate = false,
	label,
	helperText,
	error = false,
	size = "md",
	disabled = false,
	required = false,
	className,
	style,
	id: idProp,
	"aria-describedby": describedBy,
	...rest
}: CheckboxProps & {
	ref?: React.Ref<HTMLInputElement>;
}) {
	const id = useId(idProp);
	const helperId =
		helperText !== null && helperText !== undefined
			? `${id}-helper`
			: undefined;
	return (
		<span
			className={cx(
				"gl-checkbox",
				`gl-checkbox-${size}`,
				error && "gl-checkbox-error",
				disabled && "gl-checkbox-disabled",
				className,
			)}
			style={style}
		>
			<label className="gl-checkbox-row">
				<span className="gl-checkbox-control">
					<CheckboxControl
						{...rest}
						ref={ref}
						id={id}
						className="gl-checkbox-input"
						checked={checked}
						defaultChecked={defaultChecked}
						indeterminate={indeterminate}
						disabled={disabled}
						required={required}
						aria-invalid={error || undefined}
						aria-describedby={idList(describedBy, helperId)}
						onChange={onChange}
					>
						<span className="gl-checkbox-box" aria-hidden="true">
							<Icon
								name="check"
								className="gl-checkbox-mark gl-checkbox-check"
							/>
							<Icon
								name="minus"
								className="gl-checkbox-mark gl-checkbox-dash"
							/>
						</span>
					</CheckboxControl>
				</span>
				{label !== null && label !== undefined ? (
					<span className="gl-checkbox-label">
						{label}
						{required ? (
							<span className="gl-checkbox-asterisk" aria-hidden="true">
								{" *"}
							</span>
						) : null}
					</span>
				) : null}
			</label>
			{helperText !== null && helperText !== undefined ? (
				<span id={helperId} className="gl-checkbox-helper">
					{error ? (
						<Icon name="error" size={14} className="gl-checkbox-helper-icon" />
					) : null}
					<span>{helperText}</span>
				</span>
			) : null}
		</span>
	);
}
