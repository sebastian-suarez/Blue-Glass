// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// navigation/Drawer
export type DrawerCloseReason = 'backdropClick' | 'escapeKeyDown' | 'closeButton' | 'swipe';
export type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom';
export interface DrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    /** Shown (temporary, persistent). A permanent drawer is always shown. */
    open?: boolean;
    /** Called with the reason: backdropClick, escapeKeyDown, closeButton or swipe. Set open to false to close. Shows the close button. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: DrawerCloseReason) => void;
    /** The edge it comes from. Default left. */
    anchor?: DrawerAnchor;
    /** temporary: a modal panel over a scrim (default). persistent: slides in and pushes the content beside it. permanent: a static panel. */
    variant?: 'temporary' | 'persistent' | 'permanent';
    /** true: floats 12px in from the edges on radius-panel (default). false: flush to the edge, only the inner corners rounded. */
    inset?: boolean;
    /** Panel width for left and right, a number in px or a CSS length. Default 320. Top and bottom size to their content. */
    width?: number | string;
    /** The heading in the header slot; it also names the drawer. */
    title?: React.ReactNode;
    /** Accessible name of the close button. Default "Close". */
    closeLabel?: string;
    /** temporary: no scrim; the page behind stays visible. */
    hideBackdrop?: boolean;
    /** temporary: keep the panel mounted while closed. */
    keepMounted?: boolean;
    /** temporary: render in place instead of in document.body. */
    disablePortal?: boolean;
    /** temporary: don't lock the page's scroll. */
    disableScrollLock?: boolean;
    /** temporary: don't move focus into the panel on open. */
    disableAutoFocus?: boolean;
    /** temporary: let focus leave the panel while open. */
    disableEnforceFocus?: boolean;
    /** temporary: don't return focus to the opener on close. */
    disableRestoreFocus?: boolean;
    /** temporary: Escape doesn't close it. */
    disableEscapeKeyDown?: boolean;
    /** temporary: where to portal, default document.body. */
    container?: Element | (() => Element | null) | null;
    /** temporary: slide timing in ms (default 280 in, 220 out). */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    /** Props for the glass surface (a Paper). */
    PaperProps?: React.HTMLAttributes<HTMLElement>;
    /** The drawer's content, in a scrolling body under the header. */
    children?: React.ReactNode;
}
/** A glass panel from an edge of the screen: temporary over a scrim, persistent beside the content it pushes, or permanent. */
export declare const Drawer: React.ForwardRefExoticComponent<DrawerProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
