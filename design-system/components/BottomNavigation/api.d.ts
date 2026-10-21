// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// navigation/BottomNavigation
export interface BottomNavigationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange' | 'defaultValue'> {
    /** The selected action's value (controlled). Actions without a value use their index. */
    value?: any;
    /** The selected value when uncontrolled. */
    defaultValue?: any;
    /** Called with the event and the chosen action's value. */
    onChange?: (event: React.SyntheticEvent, value: any) => void;
    /** Show every action's label. Default false: only the selected action shows its label. */
    showLabels?: boolean;
    /** Pin the bar bottom-centre in the viewport, above the safe-area inset, at z-app-bar. */
    fixed?: boolean;
    /** Three to five BottomNavigationAction elements. */
    children?: React.ReactNode;
}
export interface BottomNavigationActionProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
    /** The visible label. It stays the accessible name when hidden, so always pass one. */
    label?: React.ReactNode;
    /** An Icon, drawn at 20px above the label. */
    icon?: React.ReactNode;
    /** Identifies the action. Default its index. */
    value?: any;
    /** Render a link (<a href>) instead of a <button>: use it to move between pages. */
    href?: string;
    /** Render a router link component instead of <a>; it receives href and className. */
    component?: React.ElementType;
    /** Show the label even when not selected. Set by BottomNavigation from showLabels. */
    showLabel?: boolean;
    /** Set by BottomNavigation. */
    selected?: boolean;
    /** Set by BottomNavigation: called with the event and this action's value. */
    onChange?: (event: React.SyntheticEvent, value: any) => void;
}
/**
 * The header's nav pill as a bottom bar: three to five icon-over-label actions, the
 * current one raised out of the track.
 */
export declare const BottomNavigation: React.ForwardRefExoticComponent<BottomNavigationProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
/** One destination in a BottomNavigation: an icon over its label; aria-current="page" when selected. */
export declare const BottomNavigationAction: React.ForwardRefExoticComponent<BottomNavigationActionProps & {
    ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement> | undefined;
}>;
