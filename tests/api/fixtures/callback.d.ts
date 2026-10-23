/* eslint-disable @typescript-eslint/naming-convention, unicorn/consistent-boolean-name -- it redeclares documented names */
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
