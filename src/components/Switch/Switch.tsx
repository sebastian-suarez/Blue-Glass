"use client";
import * as React from "react";
import { SwitchControl } from "../../internal/form-control.js";
import { idList } from "../../internal/field.js";
import { cx } from "../../internal/cx.js";
import { useId } from "../../internal/hooks.js";

export type SwitchProps = Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	| "type"
	| "size"
	| "onChange"
	| "checked"
	| "defaultChecked"
	| "role"
	| "children"
> & {
	/**
On, controlled.
*/
	checked?: boolean;
	/**
Initially on, uncontrolled.
*/
	defaultChecked?: boolean;
	/**
Called with the change event and the new state. A switch acts at once: apply the setting here.
*/
	onChange?: (
		event: React.ChangeEvent<HTMLInputElement>,
		isChecked: boolean,
	) => void;
	/**
The visible label: what the switch turns on. Without one, give the switch an aria-label.
*/
	label?: React.ReactNode;
	/**
End: the label after the switch (default). start: the label first, the switch pushed to the far end.
*/
	labelPlacement?: "start" | "end";
	/**
A line under the label, linked by aria-describedby.
*/
	helperText?: React.ReactNode;
	/**
Md: a 40 × 24 track (default). sm: 32 × 20.
*/
	size?: "sm" | "md";
	/**
Disables the input and dims the row.
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
Style on the root wrapper. Give it width: 100% with labelPlacement="start" for a settings row.
*/
	style?: React.CSSProperties;
};
/**
An on/off setting that applies at once: a native checkbox with role="switch", drawn as a pill track and a sliding thumb.
*/
export function Switch({
	ref,
	checked,
	defaultChecked = false,
	onChange,
	label,
	labelPlacement = "end",
	helperText,
	size = "md",
	disabled = false,
	className,
	style,
	id: idProp,
	"aria-describedby": describedBy,
	...rest
}: SwitchProps & {
	ref?: React.Ref<HTMLInputElement>;
}) {
	const id = useId(idProp);
	const helperId =
		helperText !== null && helperText !== undefined
			? `${id}-helper`
			: undefined;
	const control = (
		<span className="gl-switch-control">
			<SwitchControl
				{...rest}
				ref={ref}
				id={id}
				className="gl-switch-input"
				checked={checked}
				defaultChecked={defaultChecked}
				disabled={disabled}
				aria-describedby={idList(describedBy, helperId)}
				onChange={onChange}
			>
				<span className="gl-switch-track" aria-hidden="true">
					<span className="gl-switch-thumb" />
				</span>
			</SwitchControl>
		</span>
	);
	const text =
		label !== null && label !== undefined ? (
			<span className="gl-switch-label">{label}</span>
		) : null;
	return (
		<span
			className={cx(
				"gl-switch",
				`gl-switch-${size}`,
				labelPlacement === "start" && "gl-switch-start",
				disabled && "gl-switch-disabled",
				className,
			)}
			style={style}
		>
			<label className="gl-switch-row">
				{labelPlacement === "start" ? text : control}
				{labelPlacement === "start" ? control : text}
			</label>
			{helperText !== null && helperText !== undefined ? (
				<span id={helperId} className="gl-switch-helper">
					{helperText}
				</span>
			) : null}
		</span>
	);
}
