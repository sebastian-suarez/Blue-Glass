import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useForkRef, useId, useIsoLayoutEffect } from '../internal/hooks';
import { Icon } from '../data-display/Icon';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onChange' | 'checked' | 'defaultChecked' | 'children'> {
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
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    checked: checkedProp, defaultChecked = false, onChange, indeterminate = false, label, helperText, error = false,
    size = 'md', disabled = false, required = false, className, style, id: idProp, 'aria-describedby': describedBy, ...rest
  },
  ref,
) {
  const id = useId(idProp);
  const helperId = helperText != null ? `${id}-helper` : undefined;
  const [checked, setChecked] = useControlled(checkedProp, defaultChecked);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const handleRef = useForkRef<HTMLInputElement>(inputRef, ref);

  // indeterminate is a DOM property, not an attribute, and a click clears it: re-apply it on every render.
  useIsoLayoutEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    setChecked(next);
    onChange?.(event, next);
  };

  return (
    <span
      className={cx('gl-checkbox', `gl-checkbox-${size}`, error && 'gl-checkbox-error', disabled && 'gl-checkbox-disabled', className)}
      style={style}
    >
      <label className="gl-checkbox-row">
        <span className="gl-checkbox-control">
          <input
            {...rest}
            ref={handleRef}
            id={id}
            type="checkbox"
            className="gl-checkbox-input"
            checked={checked}
            disabled={disabled}
            required={required}
            aria-invalid={error || undefined}
            aria-describedby={cx(describedBy, helperId) || undefined}
            onChange={handleChange}
          />
          <span className="gl-checkbox-box" aria-hidden="true">
            <Icon name="check" className="gl-checkbox-mark gl-checkbox-check" />
            <Icon name="minus" className="gl-checkbox-mark gl-checkbox-dash" />
          </span>
        </span>
        {label != null ? (
          <span className="gl-checkbox-label">
            {label}
            {required ? <span className="gl-checkbox-asterisk" aria-hidden="true">{' *'}</span> : null}
          </span>
        ) : null}
      </label>
      {helperText != null ? (
        <span id={helperId} className="gl-checkbox-helper">
          {error ? <Icon name="error" size={14} className="gl-checkbox-helper-icon" /> : null}
          <span>{helperText}</span>
        </span>
      ) : null}
    </span>
  );
});
