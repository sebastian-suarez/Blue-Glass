// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/Switch
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'checked' | 'defaultChecked' | 'role' | 'children'> {
    /** On, controlled. */
    checked?: boolean;
    /** Initially on, uncontrolled. */
    defaultChecked?: boolean;
    /** Called with the change event and the new state. A switch acts at once: apply the setting here. */
    onChange?: (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => void;
    /** The visible label: what the switch turns on. Without one, give the switch an aria-label. */
    label?: React.ReactNode;
    /** end: the label after the switch (default). start: the label first, the switch pushed to the far end. */
    labelPlacement?: 'start' | 'end';
    /** A line under the label, linked by aria-describedby. */
    helperText?: React.ReactNode;
    /** md: a 40 × 24 track (default). sm: 32 × 20. */
    size?: 'sm' | 'md';
    /** Disables the input and dims the row. */
    disabled?: boolean;
    /** The input's id; generated when omitted. */
    id?: string;
    /** Ids of more descriptions for the input; the helper text's id is added to them. */
    'aria-describedby'?: string;
    /** Classes on the root wrapper. The ref and every other attribute go to the native input. */
    className?: string;
    /** Style on the root wrapper. Give it width: 100% with labelPlacement="start" for a settings row. */
    style?: React.CSSProperties;
}
/** An on/off setting that applies at once: a native checkbox with role="switch", drawn as a pill track and a sliding thumb. */
export declare const Switch: React.ForwardRefExoticComponent<SwitchProps & {
    ref?: React.Ref<HTMLInputElement> | undefined;
}>;
