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
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: (
		event: React.ChangeEvent<HTMLInputElement>,
		isChecked: boolean,
	) => void;
	indeterminate?: boolean;
	label?: React.ReactNode;
	helperText?: React.ReactNode;
	error?: boolean;
	size?: "sm" | "md";
	disabled?: boolean;
	required?: boolean;
	id?: string;
	"aria-describedby"?: string;
	className?: string;
	style?: React.CSSProperties;
};
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
