/* eslint-disable unicorn/consistent-boolean-name -- it redeclares the documented useMediaQuery */
import type * as Documented from "../../../design-system/source/index.js";

export * from "../../../design-system/source/index.js";

export declare function useMediaQuery(
	query: string,
	options: Documented.UseMediaQueryOptions,
): boolean;
export declare function computePosition(
	anchor: DOMRect,
	floating: { width: number; height: number },
	options?: Documented.PositionOptions,
): Documented.PositionResult | undefined;
export declare const media: Omit<
	typeof Documented.media,
	"reducedTransparency"
>;
