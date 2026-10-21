// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// feedback/Dialog
export type DialogScroll = 'paper' | 'body';
export interface DialogProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onClose'> {
    /** Show the dialog. */
    open: boolean;
    /** Called with the reason (backdropClick or escapeKeyDown); you decide whether to close. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => void;
    /** Width cap: xs 444px, sm 600px, md 900px, or false for none. Default sm. */
    maxWidth?: 'xs' | 'sm' | 'md' | false;
    /** Take the whole maxWidth (less the side margins) instead of fitting the content. */
    fullWidth?: boolean;
    /** Fill the viewport with square corners. "phone" does it only at 700px and below. */
    fullScreen?: boolean | 'phone';
    /** paper: the content scrolls between a fixed title and actions, fading at its edges (default). body: the whole dialog scrolls in its layer. */
    scroll?: DialogScroll;
    /** Grow timing in ms, or { enter, exit }. Default 200 in, 140 out. */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    /** Extra props for the glass surface, the element with role="dialog". */
    PaperProps?: Partial<PaperProps>;
    /** Stay in the DOM while closed. */
    keepMounted?: boolean;
    /** No scrim: the page stays undimmed (a press outside still closes). */
    hideBackdrop?: boolean;
    /** Props for the scrim (Backdrop). */
    BackdropProps?: Partial<BackdropProps>;
    /** Escape does nothing. Keep it on unless leaving would lose work. */
    disableEscapeKeyDown?: boolean;
    /** Don't move focus into the dialog on open. */
    disableAutoFocus?: boolean;
    /** Let focus leave the dialog while it's open. */
    disableEnforceFocus?: boolean;
    /** Don't return focus to the opener on close. */
    disableRestoreFocus?: boolean;
    /** Leave the page scrollable underneath. */
    disableScrollLock?: boolean;
    /** Render in place (inside a showcase Stage) instead of in document.body. */
    disablePortal?: boolean;
    /** Where the portal mounts. Default document.body. */
    container?: Element | (() => Element | null) | null;
    /** DialogTitle, DialogContent and DialogActions. */
    children?: React.ReactNode;
}
/**
 * A modal task on a glass panel: Modal underneath (scrim, focus kept in, Escape,
 * scroll lock, the page made inert), Grow from the centre, title and description
 * wired to the surface's aria-labelledby and aria-describedby.
 */
export declare const Dialog: React.ForwardRefExoticComponent<DialogProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
    /** The dialog's name: a question or a verb phrase ("Delete the RS50 bridge draft?"). */
    children?: React.ReactNode;
}
/** The dialog's name in text-title-sm, wired to the surface's aria-labelledby. */
export declare const DialogTitle: React.ForwardRefExoticComponent<DialogTitleProps & {
    ref?: React.Ref<HTMLHeadingElement> | undefined;
}>;
export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Hairlines (color-line) above and below, for long content between the title and the actions. */
    dividers?: boolean;
    /** Body copy (DialogContentText), fields, lists. */
    children?: React.ReactNode;
}
/** The dialog's body, which with scroll="paper" scrolls on its own and fades at whichever edge has more. */
export declare const DialogContent: React.ForwardRefExoticComponent<DialogContentProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface DialogContentTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
    /** One or two sentences: what happens, and what stays as it is. */
    children?: React.ReactNode;
}
/** Body copy in color-muted (text-body-sm), wired to the surface's aria-describedby. */
export declare const DialogContentText: React.ForwardRefExoticComponent<DialogContentTextProps & {
    ref?: React.Ref<HTMLParagraphElement> | undefined;
}>;
export interface DialogActionsProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Buttons, the primary one last. */
    children?: React.ReactNode;
}
/** The button row: right-aligned, space-sm apart, the primary action last. */
export declare const DialogActions: React.ForwardRefExoticComponent<DialogActionsProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
