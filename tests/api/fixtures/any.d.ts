/* eslint-disable @typescript-eslint/naming-convention -- it redeclares documented components */
import type * as React from "react";
import type * as Documented from "../../../design-system/source/index.js";

export * from "../../../design-system/source/index.js";

export type ChipProps = Omit<Documented.ChipProps, "label"> & { label: any };
export declare const Chip: React.ForwardRefExoticComponent<
	ChipProps & { ref?: React.Ref<HTMLElement> | undefined }
>;

export type BadgeProps = any;
export declare const Badge: React.ForwardRefExoticComponent<BadgeProps>;

export type ToggleButtonProps = Omit<
	Documented.ToggleButtonProps,
	"onChange"
> & {
	onChange?: (event: any, value: any) => void;
};
export declare const ToggleButton: React.ForwardRefExoticComponent<
	ToggleButtonProps & { ref?: React.Ref<any> | undefined }
>;

export type PaneAccordionProps = Omit<
	Documented.PaneAccordionProps,
	"items"
> & { items: any[] };

export type MermaidDiagramProps = Omit<
	Documented.MermaidDiagramProps,
	"config"
> & { config?: Record<string, any> };

export declare function useTransition(
	props: Omit<Documented.TransitionProps, "children">,
	nodeRef: React.RefObject<any>,
	defaults: { enter: number; exit: number },
): Documented.TransitionStatus;
