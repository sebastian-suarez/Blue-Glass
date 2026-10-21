/* eslint-disable @typescript-eslint/naming-convention -- it redeclares documented components */
// The documented API with two prop mutations: Button drops its optional href, which plain
// assignability can't see, and Divider requires a label that documented code doesn't pass.
import type * as React from "react";
import type * as Documented from "../../../design-system/source/index.js";

export * from "../../../design-system/source/index.js";

export type ButtonProps = Omit<Documented.ButtonProps, "href">;
export declare const Button: React.ForwardRefExoticComponent<
	ButtonProps & {
		ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> | undefined;
	}
>;

export type DividerProps = Documented.DividerProps & { label: string };
export declare const Divider: React.ForwardRefExoticComponent<
	DividerProps & { ref?: React.Ref<HTMLElement> | undefined }
>;
