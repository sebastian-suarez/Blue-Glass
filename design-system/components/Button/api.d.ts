// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/Button
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    /** primary: the ink pill, once per view. glass: the frosted pill (default). text: a link-weight action. */
    variant?: 'primary' | 'glass' | 'text';
    /** danger for destructive actions. */
    tone?: 'default' | 'danger';
    /** md is the site's 46px pill; sm and lg are additions. */
    size?: 'sm' | 'md' | 'lg';
    /** Icon before the label. */
    startIcon?: React.ReactNode;
    /** Icon after the label; outbound links take the arrow-ne glyph. */
    endIcon?: React.ReactNode;
    /** Busy: shows a spinner, sets aria-busy and blocks clicks. */
    loading?: boolean;
    /** Stretch to the container width. */
    fullWidth?: boolean;
    /** Render an <a> instead of a <button>. */
    href?: string;
    target?: string;
    rel?: string;
    type?: 'button' | 'submit' | 'reset';
    children?: React.ReactNode;
}
/**
 * The site's pill button (.btn): primary is the ink pill for the one thing a
 * view is for, glass the frosted pill beside it, text a link-weight action.
 */
export declare const Button: React.ForwardRefExoticComponent<ButtonProps & {
    ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> | undefined;
}>;
