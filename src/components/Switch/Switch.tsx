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
	checked?: boolean;
	defaultChecked?: boolean;
	onChange?: (
		event: React.ChangeEvent<HTMLInputElement>,
		isChecked: boolean,
	) => void;
	label?: React.ReactNode;
	labelPlacement?: "start" | "end";
	helperText?: React.ReactNode;
	size?: "sm" | "md";
	disabled?: boolean;
	id?: string;
	"aria-describedby"?: string;
	className?: string;
	style?: React.CSSProperties;
};
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
