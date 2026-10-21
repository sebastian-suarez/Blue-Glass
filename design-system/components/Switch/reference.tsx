import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useId } from '../internal/hooks';

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'checked' | 'defaultChecked' | 'role' | 'children'> {
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
export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  {
    checked: checkedProp, defaultChecked = false, onChange, label, labelPlacement = 'end', helperText, size = 'md',
    disabled = false, className, style, id: idProp, 'aria-describedby': describedBy, ...rest
  },
  ref,
) {
  const id = useId(idProp);
  const helperId = helperText != null ? `${id}-helper` : undefined;
  const [checked, setChecked] = useControlled(checkedProp, defaultChecked);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    setChecked(next);
    onChange?.(event, next);
  };

  const control = (
    <span className="gl-switch-control">
      <input
        {...rest}
        ref={ref}
        id={id}
        type="checkbox"
        role="switch"
        className="gl-switch-input"
        checked={checked}
        disabled={disabled}
        aria-describedby={cx(describedBy, helperId) || undefined}
        onChange={handleChange}
      />
      <span className="gl-switch-track" aria-hidden="true">
        <span className="gl-switch-thumb" />
      </span>
    </span>
  );
  const text = label != null ? <span className="gl-switch-label">{label}</span> : null;

  return (
    <span
      className={cx(
        'gl-switch',
        `gl-switch-${size}`,
        labelPlacement === 'start' && 'gl-switch-start',
        disabled && 'gl-switch-disabled',
        className,
      )}
      style={style}
    >
      <label className="gl-switch-row">
        {labelPlacement === 'start' ? text : control}
        {labelPlacement === 'start' ? control : text}
      </label>
      {helperText != null ? (
        <span id={helperId} className="gl-switch-helper">{helperText}</span>
      ) : null}
    </span>
  );
});
