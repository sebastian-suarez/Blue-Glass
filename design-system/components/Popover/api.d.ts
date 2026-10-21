// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// utils/Popover
export interface PopoverProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    open: boolean;
    /** The element the surface grows from. */
    anchorEl: AnchorEl;
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => void;
    /** Preferred side and alignment. Default "bottom-start". */
    placement?: Placement;
    /** Gap to the anchor in px. Default 8. */
    offset?: number;
    /** At least as wide as the anchor (selects). */
    matchWidth?: boolean;
    /** Surface padding: "none" for lists that pad themselves. Default "md". */
    padding?: 'none' | 'sm' | 'md';
    keepMounted?: boolean;
    disableAutoFocus?: boolean;
    disableRestoreFocus?: boolean;
    disableEnforceFocus?: boolean;
    disableScrollLock?: boolean;
    /** Render in place (inside a showcase stage) instead of in document.body. */
    disablePortal?: boolean;
    container?: Element | (() => Element | null) | null;
    /** Transition timing in ms. */
    transitionDuration?: number | {
        enter?: number;
        exit?: number;
    };
    children?: React.ReactNode;
}
/**
 * A glass surface anchored to an element, on a transparent modal layer: click
 * outside or Escape closes it, focus moves in and returns to the anchor. The
 * base of Menu and Select.
 */
export declare const Popover: React.ForwardRefExoticComponent<PopoverProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
