// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/ButtonGroup
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * glass: the site's pill nav track (.identity-strip nav) holding nav-weight buttons, the default.
     * primary: one ink pill split by on-ink hairlines. text: link-weight actions split by short hairlines.
     * The group sets this variant on every child Button.
     */
    variant?: 'glass' | 'primary' | 'text';
    /** sm 36px, md 46px (the site's nav), lg 54px. The group sets this size on every child Button. */
    size?: 'sm' | 'md' | 'lg';
    /** A row (default) or a column. */
    orientation?: 'horizontal' | 'vertical';
    /** Stretch to the container width; the buttons share it equally. */
    fullWidth?: boolean;
    /** Disable every button in the group. */
    disabled?: boolean;
    /** Button elements. Name the group with aria-label or aria-labelledby. */
    children?: React.ReactNode;
}
/** Related Buttons in one track: the site's pill nav, an ink pill split into segments, or hairline-split text actions. */
export declare const ButtonGroup: React.ForwardRefExoticComponent<ButtonGroupProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
