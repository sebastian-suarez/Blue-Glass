// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/RadioGroup
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'value' | 'checked' | 'defaultChecked' | 'children'> {
    /** This option's value: what the group's value becomes when it is chosen. */
    value: string;
    /** The visible label. Clicking it chooses the option. */
    label?: React.ReactNode;
    /** A second line under the label, linked by aria-describedby. */
    helperText?: React.ReactNode;
    /** Checked, controlled. Inside a RadioGroup the group's value decides. */
    checked?: boolean;
    /** Initially checked, uncontrolled (outside a RadioGroup). */
    defaultChecked?: boolean;
    /** Called with the change event and true when this option becomes checked. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    /** md: a 20px circle (default). sm: a 16px circle. Inherits the group's. */
    size?: 'sm' | 'md';
    /** Invalid: a danger ring and aria-invalid. Inherits the group's. */
    error?: boolean;
    /** Disables this option. The group's disabled disables every option. */
    disabled?: boolean;
    /** The input's id; generated when omitted. */
    id?: string;
    /** Ids of more descriptions for the input; the helper text's id is added to them. */
    'aria-describedby'?: string;
    /** Classes on the root wrapper. The ref and every other attribute go to the native input. */
    className?: string;
    /** Style on the root wrapper. */
    style?: React.CSSProperties;
}
/** One native radio drawn as a Blue Glass circle: a dg-edge outline, then an ink ring and dot once chosen. */
export declare const Radio: React.ForwardRefExoticComponent<RadioProps & {
    ref?: React.Ref<HTMLInputElement> | undefined;
}>;
export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
    /** The visible group label. It sits above the options and names the radiogroup. */
    label?: React.ReactNode;
    /** The name every radio shares; generated when omitted. */
    name?: string;
    /** The chosen value, controlled; null for none. */
    value?: string | null;
    /** The initially chosen value, uncontrolled. */
    defaultValue?: string | null;
    /** Called with the change event and the newly chosen value. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, value: string) => void;
    /** Lay the options out in a wrapping row instead of a column. */
    row?: boolean;
    /** A line under the options, linked by aria-describedby. With error, it is the error message. */
    helperText?: React.ReactNode;
    /** Invalid: danger rings, aria-invalid, and helperText in danger with an error icon. */
    error?: boolean;
    /** Required: an asterisk on the label, aria-required, and required on every radio. */
    required?: boolean;
    /** Disables every option. */
    disabled?: boolean;
    /** md: 20px circles (default). sm: 16px circles. */
    size?: 'sm' | 'md';
    /** The group's id; generated when omitted. The label and helper ids derive from it. */
    id?: string;
    /** Ids of more labels for the group; the visible label's id is added to them. */
    'aria-labelledby'?: string;
    /** Ids of more descriptions for the group; the helper text's id is added to them. */
    'aria-describedby'?: string;
    /** Classes on the radiogroup element. */
    className?: string;
    /** Radio elements. */
    children?: React.ReactNode;
}
/** A labelled set of Radios sharing one name. The browser's own arrow keys move the choice; Tab leaves the group. */
export declare const RadioGroup: React.ForwardRefExoticComponent<RadioGroupProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
