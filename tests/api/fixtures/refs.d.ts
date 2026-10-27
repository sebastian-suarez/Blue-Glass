/* eslint-disable @typescript-eslint/naming-convention -- it redeclares documented components */
import type * as React from "react";
import type * as Documented from "../../../design-system/source/index.js";

export * from "../../../design-system/source/index.js";

export declare const Button: React.ForwardRefExoticComponent<
	Documented.ButtonProps & { ref?: React.Ref<HTMLButtonElement> | undefined }
>;
export declare const Link: React.ForwardRefExoticComponent<
	Documented.LinkProps & { ref?: React.Ref<HTMLElement> | undefined }
>;
