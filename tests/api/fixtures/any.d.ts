/* eslint-disable @typescript-eslint/naming-convention -- it redeclares documented components */
// The documented API with any planted where assignability can't see it: Chip's label prop,
// BadgeProps as a whole, the parameters of ToggleButton's onChange, the element of its ref,
// the elements of PaneAccordion's items, and the element of useTransition's nodeRef. Each
// passes every assignability check, which is why the gate looks for any, inside callbacks,
// refs and arrays too. One control must pass: MermaidDiagram's config turns from
// Record<string, unknown> into Record<string, any>, which weakens nothing, since unknown
// already accepts everything.
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
