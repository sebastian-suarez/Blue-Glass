/* eslint-disable @typescript-eslint/naming-convention -- it redeclares a documented component */
// The documented API with two generic changes: Autocomplete loses its type parameter, so
// <Autocomplete<Movie>> no longer compiles, and AutocompleteProps defaults to string
// options instead of AutocompleteOption.
import type * as React from "react";
import type * as Documented from "../../../design-system/source/index.js";

export * from "../../../design-system/source/index.js";

export type AutocompleteProps<T = string> = Documented.AutocompleteProps<T>;
export declare const Autocomplete: React.ForwardRefExoticComponent<
	Documented.AutocompleteProps & { ref?: React.Ref<HTMLDivElement> | undefined }
>;
