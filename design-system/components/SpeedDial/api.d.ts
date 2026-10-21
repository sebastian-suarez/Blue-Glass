// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// navigation/SpeedDial
export type SpeedDialDirection = 'up' | 'down' | 'left' | 'right';
export type SpeedDialOpenReason = 'toggle' | 'mouseEnter' | 'keyboard';
export type SpeedDialCloseReason = 'toggle' | 'blur' | 'mouseLeave' | 'escapeKeyDown' | 'actionClick';
export interface SpeedDialProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'hidden' | 'children'> {
    /** Accessible name of the trigger, such as "Contact and share". Required: the trigger is icon-only. */
    ariaLabel: string;
    /** Open (controlled). */
    open?: boolean;
    /** Open at first (uncontrolled). */
    defaultOpen?: boolean;
    /** Called when it asks to open, with the reason: toggle, mouseEnter or keyboard. */
    onOpen?: (event: React.SyntheticEvent, reason: SpeedDialOpenReason) => void;
    /** Called when it asks to close, with the reason: toggle, blur, mouseLeave, escapeKeyDown or actionClick. */
    onClose?: (event: React.SyntheticEvent | Event, reason: SpeedDialCloseReason) => void;
    /** The way the actions fan out from the trigger. Default up. */
    direction?: SpeedDialDirection;
    /** Zoom the whole dial out, closing it; for example while the reader scrolls down. */
    hidden?: boolean;
    /** The trigger's icon. Default a SpeedDialIcon: a plus that turns 45° into a close. */
    icon?: React.ReactNode;
    /** Also open on hover with a fine pointer, not only on click. Default true. */
    openOnHover?: boolean;
    /** Props for the trigger Fab, e.g. size. It stays the ink circle. */
    FabProps?: Partial<FabProps>;
    /** SpeedDialActions, the one nearest the trigger first. */
    children?: React.ReactNode;
}
/** A floating action button that fans out up to five related actions, each a small glass Fab with a label pill. */
export declare const SpeedDial: React.ForwardRefExoticComponent<SpeedDialProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface SpeedDialActionProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onClick'> {
    /** The action's icon. */
    icon: React.ReactNode;
    /** The action's name: shown in its label pill, and the button's accessible name. */
    tooltipTitle: React.ReactNode;
    /** Keep the label pill shown while the dial is open (touch screens have no hover). Otherwise it shows on hover and focus. */
    tooltipOpen?: boolean;
    /** Side the label sits on. Default left for up and down dials, top for left and right ones. */
    tooltipPlacement?: 'left' | 'right' | 'top' | 'bottom';
    /** Can't be chosen; skipped by the arrow keys. */
    disabled?: boolean;
    /** Called on click, Enter or Space. The dial then closes, unless you call event.preventDefault(). */
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    /** Entry delay in ms. SpeedDial sets it to stagger the actions; leave it unset. */
    delay?: number;
    /** Props for the action's glass Fab. */
    FabProps?: Partial<FabProps>;
}
/** One action of a SpeedDial: a small glass Fab with an ink label pill. */
export declare const SpeedDialAction: React.ForwardRefExoticComponent<SpeedDialActionProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface SpeedDialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** The closed icon. Default a plus, which turns 45° into a close as the dial opens. */
    icon?: React.ReactNode;
    /** An icon to cross-fade to when open, instead of turning the plus. */
    openIcon?: React.ReactNode;
    /** Override the dial's open state. */
    open?: boolean;
}
/** The trigger's icon: a plus that turns 45° into a close, or a cross-fade to openIcon. */
export declare const SpeedDialIcon: React.ForwardRefExoticComponent<SpeedDialIconProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
