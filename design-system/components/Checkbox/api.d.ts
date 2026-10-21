// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/Checkbox
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'checked' | 'defaultChecked' | 'children'> {
    /** Checked, controlled. */
    checked?: boolean;
    /** Initially checked, uncontrolled. */
    defaultChecked?: boolean;
    /** Called with the change event and the new checked state. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    /** The mixed state (a minus): some, not all, of a set is checked. Sets the input's indeterminate property. */
    indeterminate?: boolean;
    /** The visible label. Clicking it toggles the box. Without one, give the checkbox an aria-label. */
    label?: React.ReactNode;
    /** A line under the label, linked by aria-describedby. With error, it is the error message. */
    helperText?: React.ReactNode;
    /** Invalid: a danger border, aria-invalid, and helperText in danger with an error icon. */
    error?: boolean;
    /** md: a 20px box (default). sm: a 16px box. */
    size?: 'sm' | 'md';
    /** Disables the input and dims the row. */
    disabled?: boolean;
    /** Sets required on the input and marks the label with an asterisk. */
    required?: boolean;
    /** The input's id; generated when omitted. */
    id?: string;
    /** Ids of more descriptions for the input; the helper text's id is added to them. */
    'aria-describedby'?: string;
    /** Classes on the root wrapper. The ref and every other attribute go to the native input. */
    className?: string;
    /** Style on the root wrapper. */
    style?: React.CSSProperties;
}
/** A native checkbox drawn as a Blue Glass box: a 1.5px dg-edge outline on glass, filled with ink when checked or mixed. */
export declare const Checkbox: React.ForwardRefExoticComponent<CheckboxProps & {
    ref?: React.Ref<HTMLInputElement> | undefined;
}>;
