import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback, useId } from '../internal/hooks';
import { Icon } from '../data-display/Icon';

interface RadioGroupContextValue {
  name: string;
  value: string | null;
  onChange: (event: React.ChangeEvent<HTMLInputElement>, value: string) => void;
  disabled: boolean;
  required: boolean;
  error: boolean;
  size: 'sm' | 'md';
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'value' | 'checked' | 'defaultChecked' | 'children'> {
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
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(function Radio(
  {
    value, label, helperText, checked: checkedProp, defaultChecked, onChange, size: sizeProp, error: errorProp,
    disabled: disabledProp = false, name: nameProp, required: requiredProp, className, style, id: idProp,
    'aria-describedby': describedBy, ...rest
  },
  ref,
) {
  const group = React.useContext(RadioGroupContext);
  const id = useId(idProp);
  const helperId = helperText != null ? `${id}-helper` : undefined;
  const size = sizeProp ?? group?.size ?? 'md';
  const error = errorProp ?? group?.error ?? false;
  const disabled = disabledProp || !!group?.disabled;
  // In a group the group's value decides. Alone, `checked` controls it and `defaultChecked` leaves it to the
  // browser, which also unchecks it when a radio of the same name is chosen.
  const checked = group ? group.value === value : checkedProp;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event, event.target.checked);
    if (group && event.target.checked) group.onChange(event, value);
  };

  return (
    <span
      className={cx('gl-radio', `gl-radio-${size}`, error && 'gl-radio-error', disabled && 'gl-radio-disabled', className)}
      style={style}
    >
      <label className="gl-radio-row">
        <span className="gl-radio-control">
          <input
            {...rest}
            ref={ref}
            id={id}
            type="radio"
            className="gl-radio-input"
            name={nameProp ?? group?.name}
            value={value}
            checked={checked}
            defaultChecked={checked === undefined ? defaultChecked : undefined}
            disabled={disabled}
            required={requiredProp ?? group?.required}
            aria-invalid={error || undefined}
            aria-describedby={cx(describedBy, helperId) || undefined}
            onChange={handleChange}
          />
          <span className="gl-radio-circle" aria-hidden="true" />
        </span>
        {label != null ? <span className="gl-radio-label">{label}</span> : null}
      </label>
      {helperText != null ? (
        <span id={helperId} className="gl-radio-helper">{helperText}</span>
      ) : null}
    </span>
  );
});

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
export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  {
    label, name: nameProp, value: valueProp, defaultValue = null, onChange, row = false, helperText, error = false,
    required = false, disabled = false, size = 'md', className, children, id: idProp,
    'aria-labelledby': labelledBy, 'aria-describedby': describedBy, ...rest
  },
  ref,
) {
  const id = useId(idProp);
  const name = nameProp ?? `${id}-choice`;
  const labelId = label != null ? `${id}-label` : undefined;
  const helperId = helperText != null ? `${id}-helper` : undefined;
  const [value, setValue] = useControlled<string | null>(valueProp, defaultValue);

  const handleChange = useEventCallback((event: React.ChangeEvent<HTMLInputElement>, next: string) => {
    setValue(next);
    onChange?.(event, next);
  });
  const context = React.useMemo<RadioGroupContextValue>(
    () => ({ name, value, onChange: handleChange, disabled, required, error, size }),
    [name, value, handleChange, disabled, required, error, size],
  );

  return (
    <div
      ref={ref}
      id={id}
      role="radiogroup"
      aria-labelledby={cx(labelledBy, labelId) || undefined}
      aria-describedby={cx(describedBy, helperId) || undefined}
      aria-required={required || undefined}
      aria-invalid={error || undefined}
      aria-disabled={disabled || undefined}
      className={cx(
        'gl-radio-group',
        row && 'gl-radio-group-row',
        error && 'gl-radio-group-error',
        disabled && 'gl-radio-group-disabled',
        className,
      )}
      {...rest}
    >
      {label != null ? (
        <span id={labelId} className="gl-radio-group-label">
          {label}
          {required ? <span className="gl-radio-group-asterisk" aria-hidden="true">{' *'}</span> : null}
        </span>
      ) : null}
      <div className="gl-radio-group-options">
        <RadioGroupContext.Provider value={context}>{children}</RadioGroupContext.Provider>
      </div>
      {helperText != null ? (
        <span id={helperId} className="gl-radio-group-helper">
          {error ? <Icon name="error" size={14} className="gl-radio-group-helper-icon" /> : null}
          <span>{helperText}</span>
        </span>
      ) : null}
    </div>
  );
});
