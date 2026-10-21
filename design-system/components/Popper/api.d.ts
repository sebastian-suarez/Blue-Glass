// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// utils/Popper
export type VirtualElement = {
    getBoundingClientRect(): DOMRect;
    contextElement?: Element;
};
export type AnchorEl = HTMLElement | VirtualElement | null | (() => HTMLElement | VirtualElement | null);
export interface PopperChildProps {
    placement: Placement;
    /** Spread into a transition (Grow, Fade) so the Popper unmounts after it exits. */
    TransitionProps: {
        in: boolean;
        onExited: () => void;
        appear: boolean;
    };
}
export interface PopperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    open: boolean;
    /** What to anchor to: an element, a virtual rect, or a function returning one. */
    anchorEl: AnchorEl;
    /** Preferred side and alignment. Default "bottom". Flips when it doesn't fit. */
    placement?: Placement;
    /** Gap to the anchor in px. Default 8. */
    offset?: number;
    /** At least as wide as the anchor. */
    matchWidth?: boolean;
    /** Children use a transition: the Popper stays mounted until TransitionProps.onExited. */
    transition?: boolean;
    keepMounted?: boolean;
    disablePortal?: boolean;
    container?: Element | (() => Element | null) | null;
    /** z-index; default the z-modal token. */
    zIndex?: string | number;
    children?: React.ReactNode | ((props: PopperChildProps) => React.ReactNode);
}
/**
 * Floats content next to an anchor with fixed positioning: flips to the other
 * side when there is no room, shifts to stay on screen, follows scroll and
 * resize, and exposes --gl-transform-origin so transitions grow from the anchor.
 */
export declare const Popper: React.ForwardRefExoticComponent<PopperProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
