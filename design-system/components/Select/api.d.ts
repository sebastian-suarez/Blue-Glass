// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/Select
export type SelectValue = string | number;
export type SelectCloseReason = 'escapeKeyDown' | 'backdropClick' | 'select' | 'tabKeyDown';
/** One entry of Select's `options` array. */
export interface SelectOption {
    /** The value stored when this row is chosen. */
    value: SelectValue;
    /** What the row and the trigger show. Default: the value. */
    label?: React.ReactNode;
    /** Plain text for typeahead and native mode when the label is not a string. */
    textValue?: string;
    /** Not selectable; the keyboard skips it. */
    disabled?: boolean;
    /** A second line in color-muted. */
    secondary?: React.ReactNode;
    /** A leading icon (16px). */
    icon?: React.ReactNode;
}
export interface OptionProps extends Omit<React.HTMLAttributes<HTMLLIElement>, 'value'> {
    /** The value stored when this row is chosen. */
    value: SelectValue;
    /** Not selectable; the keyboard skips it. */
    disabled?: boolean;
    /** Plain text for typeahead and native mode when children is not a string. */
    textValue?: string;
    /** A second line in color-muted. */
    secondary?: React.ReactNode;
    /** A leading icon (16px, color-muted). */
    icon?: React.ReactNode;
    /** Set by Select: the raised row with a check. */
    selected?: boolean;
    /** The label. Default: the value. */
    children?: React.ReactNode;
}
/** One row of a Select: a gl-option with role="option"; Select injects its id, state and handlers. */
export declare const Option: React.ForwardRefExoticComponent<OptionProps & {
    ref?: React.Ref<HTMLLIElement> | undefined;
}>;
export interface SelectProps extends FieldBaseProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    /** The chosen value (controlled): one value, or an array with `multiple`. Use null or '' for none. */
    value?: SelectValue | SelectValue[] | null;
    /** The starting value (uncontrolled). */
    defaultValue?: SelectValue | SelectValue[] | null;
    /** Called with the new value (an array with `multiple`). */
    onChange?: (event: React.SyntheticEvent, value: any) => void;
    /** Choose several: chips in the trigger, rows toggle, the list stays open. */
    multiple?: boolean;
    /** Shown in color-muted while nothing is chosen. Never a substitute for the label. */
    placeholder?: string;
    /** The rows as data, instead of <Option> children. */
    options?: ReadonlyArray<SelectValue | SelectOption>;
    /** <Option value="…"> rows. */
    children?: React.ReactNode;
    /** Render a styled native <select> (the platform's own list) instead of the listbox. */
    native?: boolean;
    /** Form field name: hidden inputs carry the value. */
    name?: string;
    /** The trigger's id. Generated when omitted. */
    id?: string;
    /** Focusable but can't be opened or changed. */
    readOnly?: boolean;
    /** Open state (controlled). */
    open?: boolean;
    /** Start open (uncontrolled). Opening on mount doesn't move focus. */
    defaultOpen?: boolean;
    /** Called when the list asks to open. */
    onOpen?: (event: React.SyntheticEvent) => void;
    /** Called when the list asks to close, with the reason. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: SelectCloseReason) => void;
    /** Custom trigger content for the current value. */
    renderValue?: (value: any) => React.ReactNode;
    /** Inside the pill before the value: an InputAdornment or Icon. */
    startAdornment?: React.ReactNode;
    /** Passed to the Popover that holds the list (disablePortal, disableScrollLock, container…). */
    PopoverProps?: Partial<PopoverProps>;
}
/**
 * A select-only combobox in the field's pill that opens a glass Popover listbox
 * (the side selector's rows), with the APG keyboard, typeahead, the site's chips
 * for `multiple` and a styled native select for `native`.
 */
export declare const Select: React.ForwardRefExoticComponent<SelectProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
