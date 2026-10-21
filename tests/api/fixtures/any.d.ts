/* eslint-disable @typescript-eslint/naming-convention -- it redeclares documented components */
// The documented API with any planted twice: Chip's label prop, and BadgeProps as a whole.
// Both pass every assignability check, which is why the gate looks for any.
import type * as React from "react";
import type * as Documented from "../../../design-system/source/index.js";

export * from "../../../design-system/source/index.js";

export type ChipProps = Omit<Documented.ChipProps, "label"> & { label: any };
export declare const Chip: React.ForwardRefExoticComponent<
	ChipProps & { ref?: React.Ref<HTMLElement> | undefined }
>;

export type BadgeProps = any;
export declare const Badge: React.ForwardRefExoticComponent<BadgeProps>;
