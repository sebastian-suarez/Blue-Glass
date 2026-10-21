// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// feedback/Snackbar
export type SnackbarCloseReason = 'timeout' | 'clickaway' | 'escapeKeyDown' | 'closeButton';
export interface SnackbarOrigin {
    /** The edge it sits on and slides in from. */
    vertical: 'top' | 'bottom';
    /** Where along that edge. */
    horizontal: 'left' | 'center' | 'right';
}
export interface SnackbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onClose'> {
    /** Show the snackbar. */
    open: boolean;
    /** Called with the reason: timeout, clickaway, escapeKeyDown or closeButton. You decide whether to close. */
    onClose?: (event: React.SyntheticEvent | Event | null, reason: SnackbarCloseReason) => void;
    /** The message: one short sentence. */
    message?: React.ReactNode;
    /** One action after the message, usually a text Button at size sm ("Undo", "View"). */
    action?: React.ReactNode;
    /** Add a close icon button after the action; it calls onClose with "closeButton". */
    closable?: boolean;
    /** Accessible name (and tooltip) of the close button. Default "Close". */
    closeText?: string;
    /** The edge and position. Default bottom center. */
    anchorOrigin?: SnackbarOrigin;
    /** Close after this many ms (reason "timeout"); null keeps it open. Paused while pointed at, focused, or the window is in the background. */
    autoHideDuration?: number | null;
    /** Time left after a pause ends. Default half of autoHideDuration. */
    resumeHideDuration?: number;
    /** Keep the timer running while the window is in the background. */
    disableWindowBlurListener?: boolean;
    /** Slide timing in ms, or { enter, exit }. Default 280 in, 220 out. */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    /** Render in place (inside a showcase Stage) instead of in document.body. */
    disablePortal?: boolean;
    /** Where the portal mounts. Default document.body. */
    container?: Element | (() => Element | null) | null;
    /** Replace the ink surface with your own element, e.g. an Alert. message, action and closable are then ignored. */
    children?: React.ReactElement;
}
/**
 * A brief message at the edge of the screen: the ink pill's ground and lift, sliding
 * in from its edge, read politely, closing itself after a pause-aware timeout.
 */
export declare const Snackbar: React.ForwardRefExoticComponent<SnackbarProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
