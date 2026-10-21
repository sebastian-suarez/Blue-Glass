// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// utils/Modal
export type ModalCloseReason = 'backdropClick' | 'escapeKeyDown';
export interface ModalProps {
    open: boolean;
    /** Called with the reason; the parent decides whether to close. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => void;
    /** One element: usually a transition (Fade, Grow, Slide) wrapping the surface. */
    children: React.ReactElement;
    /** Keep the content mounted while closed. */
    keepMounted?: boolean;
    /** No backdrop at all (the page behind stays visible and clickable outside the content). */
    hideBackdrop?: boolean;
    /** A transparent backdrop that still catches outside clicks (popovers, menus). */
    invisibleBackdrop?: boolean;
    disableEscapeKeyDown?: boolean;
    /** Don't move focus into the content on open. */
    disableAutoFocus?: boolean;
    /** Let focus leave the content while open. */
    disableEnforceFocus?: boolean;
    /** Don't return focus to the opener on close. */
    disableRestoreFocus?: boolean;
    disableScrollLock?: boolean;
    disablePortal?: boolean;
    container?: Element | (() => Element | null) | null;
    BackdropProps?: Partial<BackdropProps>;
    className?: string;
    style?: React.CSSProperties;
    /** z-index; default the z-modal token. */
    zIndex?: string | number;
}
/**
 * The base of Dialog, Drawer, Popover and Menu: a portal layer with a backdrop,
 * focus moved in and kept in, Escape to close, page scroll locked and the rest
 * of the page made inert. Waits for the child's exit transition before unmounting.
 */
export declare const Modal: React.ForwardRefExoticComponent<ModalProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
