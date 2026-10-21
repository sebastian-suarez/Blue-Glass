// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// utils/useMediaQuery
/**
 * The site's own breakpoints (global.css): phones at 700px and below, the
 * one-column layout at 899px and below, desktop from 900px, compact desktop at
 * 1000px and below, tiny phones at 360px and below; plus the input and
 * preference queries the site gates behaviour on.
 */
export declare const media: {
    readonly tiny: "(max-width: 360px)";
    readonly phone: "(max-width: 700px)";
    readonly tablet: "(max-width: 899px)";
    readonly desktop: "(min-width: 900px)";
    readonly compact: "(max-width: 1000px)";
    readonly hover: "(hover: hover) and (pointer: fine)";
    readonly reducedMotion: "(prefers-reduced-motion: reduce)";
    readonly reducedTransparency: "(prefers-reduced-transparency: reduce)";
};
export interface UseMediaQueryOptions {
    /** Value before the first browser read (server render). Default false. */
    defaultMatches?: boolean;
}
/** Live boolean for a CSS media query, e.g. useMediaQuery(media.phone). */
export declare function useMediaQuery(query: string, options?: UseMediaQueryOptions): boolean;
