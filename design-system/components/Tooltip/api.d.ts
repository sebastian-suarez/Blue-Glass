// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/Tooltip
export interface TooltipProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'children'> {
    /** The hint: a few words. Empty ('' or null) shows no tooltip. */
    title: React.ReactNode;
    /** One element that can hold a ref and takes pointer and focus handlers (a button, a link, an Avatar…). */
    children: React.ReactElement;
    /** Side and alignment. Default top. Flips when there is no room. */
    placement?: Placement;
    /** A small arrow pointing at the child. */
    arrow?: boolean;
    /** Wait before showing on hover, ms. Default 500. */
    enterDelay?: number;
    /** Wait before hiding once the pointer leaves, ms. Default 0. */
    leaveDelay?: number;
    /** Long-press time on touch, ms. Default 700. */
    enterTouchDelay?: number;
    /** How long it stays after the finger lifts, ms. Default 1500. */
    leaveTouchDelay?: number;
    /**
     * true (default): the title describes the child (aria-describedby while open).
     * false: the title names the child (aria-label), for icon-only buttons.
     */
    describeChild?: boolean;
    /** Controlled open state. */
    open?: boolean;
    /** Asked to open (hover after the delay, keyboard focus, long press). */
    onOpen?: (event: React.SyntheticEvent | Event) => void;
    /** Asked to close (pointer left, blur, Escape, press). */
    onClose?: (event: React.SyntheticEvent | Event) => void;
    disableHoverListener?: boolean;
    disableFocusListener?: boolean;
    disableTouchListener?: boolean;
    /** The tooltip ignores the pointer and closes as soon as it leaves the child. */
    disableInteractive?: boolean;
    /** Render in place instead of in document.body (inside a showcase stage). */
    disablePortal?: boolean;
    /** Props for the inner parts: the Popper layer and the role="tooltip" surface. */
    slotProps?: {
        popper?: Partial<PopperProps>;
        tooltip?: React.HTMLAttributes<HTMLDivElement>;
    };
}
/**
 * A short ink label for its child. It opens on hover after 500ms (at once when moving from another
 * tooltip), on keyboard focus and on a long press; Escape, blur and leaving close it.
 */
export declare const Tooltip: React.ForwardRefExoticComponent<TooltipProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
