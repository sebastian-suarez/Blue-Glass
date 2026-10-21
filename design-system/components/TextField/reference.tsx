import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useForkRef, useId } from '../internal/hooks';
import { TextareaAutosize } from '../utils/TextareaAutosize';
import { FieldShell, focusFromPadding, hasContent, idList, renderSlot } from './_inputs-b-field';

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
export const InputAdornment = React.forwardRef<HTMLSpanElement, InputAdornmentProps>(function InputAdornment(
  { position, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={cx('gl-field-adornment', `gl-field-adornment-${position}`, className)} {...rest}>
      {children}
    </span>
  );
});
(InputAdornment as unknown as { __glAdornment: boolean }).__glAdornment = true;

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
export const TextField = React.forwardRef<HTMLDivElement, TextFieldProps>(function TextField(props, ref) {
  const {
    label, helperText, error = false, required = false, disabled = false, readOnly = false, fullWidth = false,
    size = 'md', variant = 'outlined', value: valueProp, defaultValue, onChange, type = 'text', placeholder, name,
    id: idProp, autoComplete, autoFocus, multiline = false, minRows, maxRows, rows, maxLength, showCount = false,
    startAdornment, endAdornment, inputProps, inputRef, className, style,
    'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby': ariaDescribedby,
    ...rest
  } = props;
  const id = useId(idProp);
  const [value, setValue] = useControlled<string>(valueProp, defaultValue ?? '');
  const [focused, setFocused] = React.useState(false);
  const inner = React.useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const extra = (inputProps ?? {}) as Record<string, unknown> & {
    className?: string;
    ref?: React.Ref<HTMLInputElement | HTMLTextAreaElement>;
    onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    'aria-describedby'?: string;
  };
  const handleRef = useForkRef(inner, inputRef, extra.ref);

  const helperId = `${id}-helper`;
  const counterId = `${id}-count`;
  const start = renderSlot(startAdornment, 'start', `${id}-start`);
  const end = renderSlot(endAdornment, 'end', `${id}-end`);
  const text = value == null ? '' : String(value);

  const counter = showCount ? (
    <span id={counterId} className="gl-field-counter">
      <span aria-hidden="true">{maxLength ? `${text.length}/${maxLength}` : text.length}</span>
      <span className="gl-sr-only">{maxLength ? `${text.length} of ${maxLength} characters` : `${text.length} characters`}</span>
    </span>
  ) : null;

  const shared = {
    ...extra,
    ref: handleRef,
    id,
    name,
    placeholder,
    disabled,
    readOnly,
    required,
    autoFocus,
    autoComplete,
    maxLength,
    value: text,
    className: cx('gl-field-input', extra.className),
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
    'aria-invalid': error || undefined,
    'aria-describedby': idList(
      hasContent(helperText) && helperId,
      showCount && counterId,
      start.text && start.id,
      end.text && end.id,
      ariaDescribedby as string | undefined,
      extra['aria-describedby'],
    ),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      (extra.onChange as ((ev: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | undefined)?.(e);
      setValue(e.target.value);
      onChange?.(e, e.target.value);
    },
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFocused(true);
      extra.onFocus?.(e);
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFocused(false);
      extra.onBlur?.(e);
    },
  };

  return (
    <FieldShell
      rootRef={ref}
      kind="gl-text-field"
      className={className as string | undefined}
      style={style as React.CSSProperties | undefined}
      rootProps={rest}
      label={label}
      labelId={`${id}-label`}
      htmlFor={id}
      helperText={helperText}
      helperId={helperId}
      counter={counter}
      error={error}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      fullWidth={fullWidth}
      size={size}
      variant={variant}
      multiline={multiline}
    >
      <div
        className="gl-field-control"
        data-focused={focused && !disabled ? '' : undefined}
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => focusFromPadding(e, inner.current, disabled)}
      >
        {start.el}
        {multiline ? (
          <TextareaAutosize {...shared} minRows={rows ?? minRows ?? 1} maxRows={rows ?? maxRows} />
        ) : (
          <input type={type} {...shared} />
        )}
        {end.el}
      </div>
    </FieldShell>
  );
});
