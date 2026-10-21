// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/TextField
/** Props every Blue Glass field shares: TextField, Select and Autocomplete. */
export interface FieldBaseProps {
    /** Visible label above the field (13px, weight 600). Always give one, or an aria-label: a placeholder is not a label. */
    label?: React.ReactNode;
    /** One line under the field in color-muted, linked with aria-describedby. Under `error` it turns danger and gains the error icon. */
    helperText?: React.ReactNode;
    /** Error state: danger border and aria-invalid. Say what to fix in helperText; colour alone is not enough. */
    error?: boolean;
    /** Adds an asterisk to the label and marks the control required. */
    required?: boolean;
    /** Dims the field to 50% and blocks input. */
    disabled?: boolean;
    /** Stretch to the container's width. */
    fullWidth?: boolean;
    /** md is the site's 46px control height (size-control); sm is 36px. */
    size?: 'sm' | 'md';
    /** outlined: glass-control fill with the dg-edge border (default). filled: a glass-inset well whose edge darkens on hover and focus. */
    variant?: 'outlined' | 'filled';
}
export interface InputAdornmentProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** The side of the input it sits on. */
    position: 'start' | 'end';
    /** An Icon (shown at 16px in color-muted), a unit such as "ms", or a small button. */
    children?: React.ReactNode;
}
/** A slot inside a field's pill, before or after the text: an icon, a unit or a small button. */
export declare const InputAdornment: React.ForwardRefExoticComponent<InputAdornmentProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface TextFieldProps extends FieldBaseProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue' | 'onInput'> {
    /** The text (controlled). */
    value?: string;
    /** The starting text (uncontrolled). */
    defaultValue?: string;
    /** Called on every edit with the new text. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, value: string) => void;
    /** Input type. Number hides the spin buttons (arrow keys still step). Ignored when multiline. */
    type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
    /** Hint inside the empty field, in color-muted. Never a substitute for the label. */
    placeholder?: string;
    /** Form field name. */
    name?: string;
    /** The input's id; the label points at it. Generated when omitted. */
    id?: string;
    /** Browser autofill hint, e.g. "email". */
    autoComplete?: string;
    /** Focus the input on mount. */
    autoFocus?: boolean;
    /** Focusable and selectable, but not editable. Shown as an inset well. */
    readOnly?: boolean;
    /** A textarea that grows with its content (TextareaAutosize), on radius-well. */
    multiline?: boolean;
    /** Multiline: height floor in rows. Default 1. */
    minRows?: number;
    /** Multiline: height ceiling in rows; scrolls past it. */
    maxRows?: number;
    /** Multiline: a fixed number of rows. */
    rows?: number;
    /** Character limit, passed to the input. */
    maxLength?: number;
    /** Show a counter under the field: "42/280" with maxLength, else the length. */
    showCount?: boolean;
    /** Inside the pill before the text: an InputAdornment, an Icon or a word. */
    startAdornment?: React.ReactNode;
    /** Inside the pill after the text: an InputAdornment, an Icon, a unit or a small button. */
    endAdornment?: React.ReactNode;
    /** Extra attributes for the <input> or <textarea> (inputMode, pattern, min, max, step…). */
    inputProps?: Record<string, unknown>;
    /** Ref to the <input> or <textarea>. */
    inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
}
/**
 * A labelled text field in the site's language: the 46px glass pill with a 3:1
 * edge, the label above, helper or error text below; multiline grows on radius-well.
 */
export declare const TextField: React.ForwardRefExoticComponent<TextFieldProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
