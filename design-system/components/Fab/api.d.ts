// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/Fab
export interface FabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    /** primary: the ink circle (.btn-primary), the default. glass: the frosted circle (.btn-glass) for a second floating action. */
    variant?: 'primary' | 'glass';
    /** sm 36px, md 46px (the site's control height, default), lg 56px. */
    size?: 'sm' | 'md' | 'lg';
    /** A pill with an icon and a visible label instead of a circle (MUI's variant="extended"). */
    extended?: boolean;
    /** Accessible name. Required when the Fab shows only an icon; an extended Fab is named by its label. */
    'aria-label'?: string;
    /** Render an <a> instead of a <button>, e.g. "Back to top" with href="#top". */
    href?: string;
    /** Link target, with href. */
    target?: string;
    /** Link rel, with href. */
    rel?: string;
    /** Button type. Default "button". */
    type?: 'button' | 'submit' | 'reset';
    /** The icon, or the icon then the label when extended. */
    children?: React.ReactNode;
}
/** The floating action button: the site's ink or glass pill cut as a circle for a screen's one action, extended with a label, and safe inside Zoom. */
export declare const Fab: React.ForwardRefExoticComponent<FabProps & {
    ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> | undefined;
}>;
