// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// layout/Stack
export type StackDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export interface StackProps extends React.HTMLAttributes<HTMLElement> {
    /** Main axis, or one per breakpoint (xs, sm ≥361, md ≥701, lg ≥900, xl ≥1001). Default "column". */
    direction?: ResponsiveValue<StackDirection>;
    /** Gap between children: a spacing token name ("xs" … "section") or 0. Default 0. */
    spacing?: SpaceValue;
    /** Alias of spacing, the CSS name. spacing wins when both are set. */
    gap?: SpaceValue;
    /**
     * Put this element between each pair of children. true draws the built-in hairline
     * (color-line), which turns to match the direction at every breakpoint.
     */
    divider?: React.ReactNode;
    /** Cross-axis alignment. */
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline' | 'start' | 'end';
    /** Main-axis distribution. */
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly' | 'start' | 'end';
    /** Let children wrap onto new lines. */
    wrap?: boolean;
    /** The element to render, e.g. "ul" or "nav". Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** One-dimensional layout: children in a column or a row, a token gap between them, an optional divider. */
export declare const Stack: React.ForwardRefExoticComponent<StackProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
