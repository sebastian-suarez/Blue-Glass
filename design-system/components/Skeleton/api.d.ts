// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// feedback/Skeleton
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** text: one line at the current font size (default). rectangular: square corners. rounded: radius-well. circular: a circle. */
    variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
    /** Width: a number of px or any CSS length. Default the full line (text) or the children's width. */
    width?: number | string;
    /** Height: a number of px or any CSS length. Text takes its height from the font size. */
    height?: number | string;
    /** pulse: a slow opacity breath (default). wave: a light sheen moving across. false: still. */
    animation?: 'pulse' | 'wave' | false;
    /** Content to size the placeholder by; it stays invisible. */
    children?: React.ReactNode;
}
/** A color-line placeholder in the shape of what is loading, always aria-hidden (the region it stands in for carries aria-busy). */
export declare const Skeleton: React.ForwardRefExoticComponent<SkeletonProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
