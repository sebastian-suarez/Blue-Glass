/* eslint-disable @typescript-eslint/naming-convention, unicorn/consistent-boolean-name -- it redeclares documented components and useMediaQuery */
import type * as React from "react";
import type * as Documented from "../../../design-system/source/index.js";

export * from "../../../design-system/source/index.js";

export type ToggleButtonProps = Omit<
	Documented.ToggleButtonProps,
	"onChange"
> & {
	onChange?: (...args: any[]) => void;
};
export declare const ToggleButton: React.ForwardRefExoticComponent<
	ToggleButtonProps & { ref?: React.Ref<HTMLButtonElement> | undefined }
>;

export type TabsProps = Omit<Documented.TabsProps, "onChange"> & {
	onChange?: (event: React.SyntheticEvent, ...rest: any[]) => void;
};
export declare const Tabs: React.ForwardRefExoticComponent<
	TabsProps & { ref?: React.Ref<HTMLDivElement> | undefined }
>;

export declare function useMediaQuery(...args: any[]): boolean;
