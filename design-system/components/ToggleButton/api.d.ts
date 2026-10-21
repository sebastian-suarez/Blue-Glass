// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/ToggleButton
type Selection = string | string[] | null;
export interface ToggleButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'type'> {
    /** The value this button stands for: required, and unique within its group. */
    value: string;
    /** Pressed, controlled (standalone). In a group, the group's value decides. */
    selected?: boolean;
    /** Initially pressed, uncontrolled (standalone). */
    defaultSelected?: boolean;
    /** Called on every press with the click event and this button's value. */
    onChange?: (event: React.MouseEvent<HTMLButtonElement>, value: string) => void;
    /** sm, md (default) or lg. Inherits the group's. */
    size?: 'sm' | 'md' | 'lg';
    /** Stretch to the container width (standalone). */
    fullWidth?: boolean;
    /** Disables this button. The group's disabled disables every button. */
    disabled?: boolean;
    /** Called first on every press; call event.preventDefault() to stop the toggle. */
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    /** Called on focus. */
    onFocus?: React.FocusEventHandler<HTMLButtonElement>;
    /** Tab order (standalone). In a group the group manages it: one tab stop. */
    tabIndex?: number;
    /** Classes on the button. */
    className?: string;
    /** The label: text, an Icon, or both. An icon-only button needs an aria-label. */
    children?: React.ReactNode;
}
/** A button that stays pressed (aria-pressed): alone, a glass pill; in a ToggleButtonGroup, a segment of the site's pill track. */
export declare const ToggleButton: React.ForwardRefExoticComponent<ToggleButtonProps & {
    ref?: React.Ref<HTMLButtonElement> | undefined;
}>;
export interface ToggleButtonGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    /** The pressed value, controlled: a string or null when exclusive, an array of strings otherwise. */
    value?: Selection;
    /** The initially pressed value, uncontrolled. */
    defaultValue?: Selection;
    /**
     * Called with the click event and the new value: when exclusive, the pressed string, or null when the
     * pressed button is pressed again (ignore null to keep one always pressed); otherwise the new array.
     */
    onChange?: (event: React.MouseEvent<HTMLButtonElement>, value: any) => void;
    /** One button pressed at a time. */
    exclusive?: boolean;
    /** A row (default) or a column. Arrow keys follow it. */
    orientation?: 'horizontal' | 'vertical';
    /** sm 36px, md 46px (the site's nav track, default), lg 54px. Sets every button's size. */
    size?: 'sm' | 'md' | 'lg';
    /** Disables every button. */
    disabled?: boolean;
    /** Stretch to the container width; the buttons share it equally. */
    fullWidth?: boolean;
    /** Called before the group's own arrow-key handling; call event.preventDefault() to take over. */
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
    /** Classes on the group. */
    className?: string;
    /** ToggleButton elements. Name the group with aria-label or aria-labelledby. */
    children?: React.ReactNode;
}
/**
 * The site's segmented pill: ToggleButtons in the nav track, the pressed one raised. One tab stop;
 * arrow keys, Home and End move between buttons; Space or Enter presses.
 */
export declare const ToggleButtonGroup: React.ForwardRefExoticComponent<ToggleButtonGroupProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
