// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/Divider
export interface DividerProps extends React.HTMLAttributes<HTMLElement> {
    /** horizontal (default) or vertical. A vertical divider is one line of text tall unless it's a flexItem. */
    orientation?: 'horizontal' | 'vertical';
    /** full width (default), inset past a list row's icon (42px, or --gl-divider-inset), or middle (16px in from both ends). */
    variant?: 'full' | 'inset' | 'middle';
    /** Stretch a vertical divider to the full height of its flex row. */
    flexItem?: boolean;
    /** Where a label sits: centred between two lines (default) or at the start, the line after it. */
    textAlign?: 'center' | 'left';
    /** Render as another element. Default hr, or div when there is a label. Use "li" inside a List. */
    component?: React.ElementType;
    /** An optional label, set in 12px color-muted. */
    children?: React.ReactNode;
}
/** A 1px color-line hairline that separates content, as the site's rows, strips and footer do. */
export declare const Divider: React.ForwardRefExoticComponent<DividerProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
