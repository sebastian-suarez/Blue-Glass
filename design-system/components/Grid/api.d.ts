// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// layout/Grid
/**
 * The site's breakpoints, as min-width queries (the inverse of global.css's
 * max-width ones): xs 0, sm 361px, md 701px, lg 900px, xl 1001px.
 */
export type LayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
/** One value, or one per breakpoint. Mobile first: a breakpoint without a value takes the one below it. */
export type ResponsiveValue<T> = T | Partial<Record<LayoutBreakpoint, T>>;
export interface GridProps extends React.HTMLAttributes<HTMLElement> {
    /** Lay the children out on the column grid. A Grid can be a container and an item at once. */
    container?: boolean;
    /** Container: the number of columns. Responsive values take 1–12; a single number can be any whole number. Default 12. */
    columns?: ResponsiveValue<number>;
    /** Container: gap between rows and columns, a spacing token name ("xs" … "section") or 0. */
    spacing?: SpaceValue;
    /** Container: gap between rows; wins over spacing. */
    rowSpacing?: SpaceValue;
    /** Container: gap between columns; wins over spacing. */
    columnSpacing?: SpaceValue;
    /** Item: how many columns it spans, 1–12, per breakpoint. With no size the item fills its row. */
    size?: ResponsiveValue<number>;
    /** Item: empty columns before it, 0–11, per breakpoint; it pushes from where the item would sit, as in MUI. */
    offset?: ResponsiveValue<number>;
    /** The element to render, e.g. "ul" or "section". Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * A 12-column CSS grid on the site's breakpoints: a container sets the columns
 * and the gap token, its items span columns per breakpoint and can be offset.
 */
export declare const Grid: React.ForwardRefExoticComponent<GridProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
