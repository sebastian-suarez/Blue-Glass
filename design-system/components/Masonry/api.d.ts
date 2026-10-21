// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// lab/Masonry
export interface MasonryProps extends React.HTMLAttributes<HTMLElement> {
    /** Number of columns, or one per breakpoint (1–12; xs, sm ≥361, md ≥701, lg ≥900, xl ≥1001). Default { xs: 1, sm: 2, md: 3 }. */
    columns?: ResponsiveValue<number>;
    /** Space between items, both ways: a spacing token name ("3xs" … "xl") or 0. Default "md". */
    spacing?: SpaceValue;
    /** The element to render. Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * Items of uneven height in balanced columns: each item goes to the shortest
 * column, measured with ResizeObserver, while the DOM keeps reading order
 * (columns are built with flex `order`). Before it measures, CSS columns lay it out.
 */
export declare const Masonry: React.ForwardRefExoticComponent<MasonryProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
