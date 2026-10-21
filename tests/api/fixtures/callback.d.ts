/* eslint-disable @typescript-eslint/naming-convention, unicorn/consistent-boolean-name -- it redeclares documented names */
// The documented API with two callbacks whose event got wider. Checkbox calls onChange
// with a SyntheticEvent instead of the documented ChangeEvent, so a handler that reads
// event.target.checked no longer compiles. ToggleButton does the same to its MouseEvent,
// but declares onChange as a method, which TypeScript compares bivariantly: plain
// assignability, and JSX, let that one through.
import type * as React from "react";
import type * as Documented from "../../../design-system/source/index.js";

export * from "../../../design-system/source/index.js";

export type CheckboxProps = Omit<Documented.CheckboxProps, "onChange"> & {
	onChange?: (
		event: React.SyntheticEvent<HTMLInputElement>,
		checked: boolean,
	) => void;
};
export declare const Checkbox: React.ForwardRefExoticComponent<
	CheckboxProps & { ref?: React.Ref<HTMLInputElement> | undefined }
>;

export type ToggleButtonProps = Omit<
	Documented.ToggleButtonProps,
	"onChange"
> & {
	onChange?(event: React.SyntheticEvent, value: string): void;
};
export declare const ToggleButton: React.ForwardRefExoticComponent<
	ToggleButtonProps & { ref?: React.Ref<HTMLButtonElement> | undefined }
>;
