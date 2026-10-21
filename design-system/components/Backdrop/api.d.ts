// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// feedback/Backdrop
export interface BackdropProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Show the backdrop. */
    open: boolean;
    /** Transparent: still catches clicks (popovers, menus). */
    invisible?: boolean;
    /** Fade duration in ms. */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    /** Keep in the DOM while closed. */
    keepMounted?: boolean;
    children?: React.ReactNode;
}
/** The scrim behind a modal task: dims and frosts the page so the dialog reads first. Also a loading cover. */
export declare const Backdrop: React.ForwardRefExoticComponent<BackdropProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
