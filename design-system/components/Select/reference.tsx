import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useForkRef, useId, usePrevious } from '../internal/hooks';
import { Popover } from '../utils/Popover';
import type { PopoverProps } from '../utils/Popover';
import { Icon } from '../data-display/Icon';
import { FieldShell, hasContent, idList, renderSlot } from './_inputs-b-field';
import { edgeIndex, isPrintableKey, jumpIndex, scrollIntoViewNearest, stepIndex, useTypeahead } from './_inputs-b-list';
import type { FieldBaseProps } from './TextField';

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
export const Option = React.forwardRef<HTMLLIElement, OptionProps>(function Option(
  { value, disabled = false, textValue: _textValue, secondary, icon, selected = false, className, children, ...rest },
  ref,
) {
  return (
    <li
      ref={ref}
      role="option"
      aria-selected={selected}
      aria-disabled={disabled || undefined}
      data-value={String(value)}
      className={cx('gl-option', className as string | undefined)}
      {...rest}
    >
      {icon ? <span className="gl-option-icon">{icon}</span> : null}
      <span className="gl-option-text">
        <span>{hasContent(children) ? children : String(value)}</span>
        {hasContent(secondary) ? <span className="gl-option-secondary">{secondary}</span> : null}
      </span>
      {selected ? (
        <span className="gl-option-end">
          <Icon name="check" size={16} />
        </span>
      ) : null}
    </li>
  );
});

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

interface Row {
  value: SelectValue;
  label: React.ReactNode;
  text: string;
  disabled: boolean;
  secondary?: React.ReactNode;
  icon?: React.ReactNode;
  element: React.ReactElement | null;
}

function plain(node: React.ReactNode): string | null {
  return typeof node === 'string' || typeof node === 'number' ? String(node) : null;
}

function toRows(options: SelectProps['options'], children: React.ReactNode): Row[] {
  if (options) {
    return options.map((o) => {
      if (typeof o === 'object' && o !== null) {
        const label = hasContent(o.label) ? o.label : String(o.value);
        return { value: o.value, label, text: o.textValue ?? plain(label) ?? String(o.value), disabled: !!o.disabled, secondary: o.secondary, icon: o.icon, element: null };
      }
      return { value: o, label: String(o), text: String(o), disabled: false, element: null };
    });
  }
  const rows: Row[] = [];
  React.Children.forEach(children, (child: React.ReactNode) => {
    if (!React.isValidElement(child)) return;
    const p = child.props as OptionProps;
    if (p.value === undefined) return;
    const label = hasContent(p.children) ? p.children : String(p.value);
    rows.push({ value: p.value, label, text: p.textValue ?? plain(label) ?? String(p.value), disabled: !!p.disabled, element: child });
  });
  return rows;
}

/**
 * A select-only combobox in the field's pill that opens a glass Popover listbox
 * (the side selector's rows), with the APG keyboard, typeahead, the site's chips
 * for `multiple` and a styled native select for `native`.
 */
export const Select = React.forwardRef<HTMLDivElement, SelectProps>(function Select(props, ref) {
  const {
    label, helperText, error = false, required = false, disabled = false, fullWidth = false, size = 'md',
    variant = 'outlined', value: valueProp, defaultValue, onChange, multiple = false, placeholder, options, children,
    native = false, name, id: idProp, readOnly = false, open: openProp, defaultOpen = false, onOpen, onClose,
    renderValue, startAdornment, PopoverProps: popoverProps, className, style,
    'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby': ariaDescribedby,
    ...rest
  } = props;
  const id = useId(idProp);
  const labelId = `${id}-label`;
  const helperId = `${id}-helper`;
  const listboxId = `${id}-listbox`;
  const optionId = (i: number) => `${id}-option-${i}`;

  const rows = React.useMemo(() => toRows(options, children), [options, children]);
  const texts = React.useMemo(() => rows.map((r) => r.text), [rows]);
  const [value, setValue] = useControlled<SelectValue | SelectValue[] | null | undefined>(valueProp, defaultValue ?? (multiple ? [] : null));
  const values: SelectValue[] = multiple
    ? Array.isArray(value) ? value : []
    : value == null || value === '' || Array.isArray(value) ? [] : [value];
  const isSelected = (v: SelectValue) => values.some((x) => x === v);
  const selectedIndex = rows.findIndex((r) => isSelected(r.value));
  const enabled = (i: number) => !!rows[i] && !rows[i].disabled;
  const firstEnabled = () => edgeIndex(1, rows.length, enabled);

  const [open, setOpen] = useControlled<boolean>(openProp, defaultOpen);
  const [active, setActive] = React.useState<number>(() => (open ? (selectedIndex >= 0 ? selectedIndex : firstEnabled()) : -1));
  const [keyboard, setKeyboard] = React.useState(false);
  const [anchor, setAnchor] = React.useState<HTMLDivElement | null>(null);
  const [nativeFocus, setNativeFocus] = React.useState(false);
  const triggerRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const lastPointer = React.useRef({ x: -1, y: -1 });
  const handleTriggerRef = useForkRef<HTMLDivElement>(triggerRef, setAnchor as React.RefCallback<HTMLDivElement>);
  const typeahead = useTypeahead();
  const start = renderSlot(startAdornment, 'start', `${id}-start`);
  const describedBy = idList(hasContent(helperText) && helperId, ariaDescribedby as string | undefined);
  const labelledBy = (ariaLabelledby as string | undefined) ?? (hasContent(label) ? labelId : undefined);

  const openMenu = (e: React.SyntheticEvent, at?: number, viaKeyboard = false) => {
    if (disabled || readOnly) return;
    setActive(at !== undefined && at >= 0 ? at : selectedIndex >= 0 ? selectedIndex : firstEnabled());
    setKeyboard(viaKeyboard);
    if (!open) {
      setOpen(true);
      onOpen?.(e);
    }
  };
  const closeMenu = (e: React.SyntheticEvent | KeyboardEvent, reason: SelectCloseReason) => {
    setOpen(false);
    onClose?.(e, reason);
  };
  const choose = (e: React.SyntheticEvent, i: number) => {
    const row = rows[i];
    if (!row || row.disabled || readOnly) return;
    if (multiple) {
      const has = isSelected(row.value);
      const next = has ? values.filter((v) => v !== row.value) : [...values, row.value];
      const order = new Map(rows.map((r, k) => [r.value, k] as [SelectValue, number]));
      next.sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9));
      setValue(next);
      onChange?.(e, next);
      setActive(i);
    } else {
      if (!isSelected(row.value)) {
        setValue(row.value);
        onChange?.(e, row.value);
      }
      closeMenu(e, 'select');
    }
  };

  // Focus moves into the list when it opens after mount (never on a first render that starts open).
  const prevOpen = usePrevious(open);
  React.useEffect(() => {
    if (!open || prevOpen !== false) return;
    if (active < 0) setActive(selectedIndex >= 0 ? selectedIndex : firstEnabled());
    if (popoverProps?.disableAutoFocus) return;
    const raf = requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  React.useEffect(() => {
    if (!open || active < 0) return;
    const raf = requestAnimationFrame(() => scrollIntoViewNearest(document.getElementById(optionId(active))));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || readOnly) return;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Enter' || k === ' ') {
      e.preventDefault();
      openMenu(e, undefined, true);
    } else if (k === 'Home' || k === 'End') {
      e.preventDefault();
      openMenu(e, edgeIndex(k === 'Home' ? 1 : -1, rows.length, enabled), true);
    } else if (isPrintableKey(e)) {
      e.preventDefault();
      openMenu(e, typeahead(k, texts, selectedIndex, enabled), true);
    }
  };

  const onListKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const n = rows.length;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowDown':
        next = stepIndex(active, 1, n, enabled);
        break;
      case 'ArrowUp':
        if (e.altKey) {
          e.preventDefault();
          if (!multiple && active >= 0) choose(e, active);
          else closeMenu(e, 'select');
          return;
        }
        next = stepIndex(active, -1, n, enabled);
        break;
      case 'Home':
        next = edgeIndex(1, n, enabled);
        break;
      case 'End':
        next = edgeIndex(-1, n, enabled);
        break;
      case 'PageDown':
        next = jumpIndex(active, 10, n, enabled);
        break;
      case 'PageUp':
        next = jumpIndex(active, -10, n, enabled);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        setKeyboard(true);
        if (active >= 0) choose(e, active);
        return;
      case 'Tab':
        e.preventDefault();
        closeMenu(e, 'tabKeyDown');
        return;
      default:
        if (isPrintableKey(e)) {
          e.preventDefault();
          const i = typeahead(e.key, texts, active, enabled);
          if (i >= 0) next = i;
          else return;
        }
    }
    if (next !== null) {
      e.preventDefault();
      setKeyboard(true);
      if (next >= 0) setActive(next);
    }
  };

  const shellProps = {
    rootRef: ref,
    kind: 'gl-select',
    className: className as string | undefined,
    style: style as React.CSSProperties | undefined,
    rootProps: rest,
    label,
    labelId,
    helperText,
    helperId,
    error,
    required,
    disabled,
    readOnly,
    fullWidth,
    size,
    variant,
  };

  if (native) {
    const strValue = multiple ? values.map(String) : values.length ? String(values[0]) : '';
    return (
      <FieldShell {...shellProps} htmlFor={id} modifiers={cx('gl-select-native-field', multiple && 'gl-select-native-multiple')}>
        <div className="gl-field-control gl-select-native-control" data-focused={nativeFocus && !disabled ? '' : undefined}>
          {start.el}
          <select
            id={id}
            name={name}
            className="gl-field-input gl-select-native"
            value={strValue}
            multiple={multiple}
            disabled={disabled}
            required={required}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            aria-describedby={describedBy}
            aria-invalid={error || undefined}
            aria-readonly={readOnly || undefined}
            data-empty={!multiple && strValue === '' ? '' : undefined}
            onFocus={() => setNativeFocus(true)}
            onBlur={() => setNativeFocus(false)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              if (readOnly) return;
              const el = e.target;
              const find = (s: string) => rows.find((r) => String(r.value) === s);
              if (multiple) {
                const next = Array.from(el.selectedOptions).map((o) => find(o.value)?.value ?? o.value);
                setValue(next);
                onChange?.(e, next);
              } else {
                const next = el.value === '' ? null : find(el.value)?.value ?? el.value;
                setValue(next);
                onChange?.(e, next);
              }
            }}
          >
            {!multiple && (placeholder !== undefined || strValue === '') ? (
              <option value="" disabled={required}>{placeholder ?? ''}</option>
            ) : null}
            {rows.map((r) => (
              <option key={String(r.value)} value={String(r.value)} disabled={r.disabled}>
                {r.text}
              </option>
            ))}
          </select>
          {!multiple ? (
            <span className="gl-select-icon" aria-hidden="true">
              <Icon name="chevron-down" size={16} />
            </span>
          ) : null}
        </div>
      </FieldShell>
    );
  }

  const placeholderEl = <span className="gl-select-placeholder">{placeholder ?? ''}</span>;
  let display: React.ReactNode;
  if (renderValue && values.length) {
    display = (
      <span className="gl-select-value">
        <span className="gl-select-current">{renderValue(value)}</span>
      </span>
    );
  } else if (multiple && values.length) {
    display = (
      <span className="gl-select-chips">
        {values.map((v) => {
          const r = rows.find((x) => x.value === v);
          return (
            <span key={String(v)} className="gl-select-chip">
              {r ? r.label : String(v)}
            </span>
          );
        })}
      </span>
    );
  } else {
    const r = selectedIndex >= 0 ? rows[selectedIndex] : null;
    // Every label sits invisibly in the same grid cell, so the trigger is as wide as the longest one.
    display = (
      <span className="gl-select-value">
        {!multiple
          ? rows.map((x, i) => (
              <span key={i} className="gl-select-sizer" aria-hidden="true">
                {x.label}
              </span>
            ))
          : null}
        {!multiple && placeholder ? <span className="gl-select-sizer" aria-hidden="true">{placeholder}</span> : null}
        <span className="gl-select-current">{r ? r.label : placeholderEl}</span>
      </span>
    );
  }

  return (
    <FieldShell
      {...shellProps}
      modifiers={cx(multiple && 'gl-select-multiple', open && 'gl-select-open')}
      onLabelClick={() => triggerRef.current?.focus()}
    >
      <div
        ref={handleTriggerRef}
        id={id}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        className="gl-field-control gl-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-describedby={describedBy}
        aria-invalid={error || undefined}
        aria-required={required || undefined}
        aria-disabled={disabled || undefined}
        aria-readonly={readOnly || undefined}
        onClick={(e: React.MouseEvent<HTMLDivElement>) => (open ? closeMenu(e, 'select') : openMenu(e))}
        onKeyDown={onTriggerKeyDown}
      >
        {start.el}
        {display}
        <span className="gl-select-icon" aria-hidden="true">
          <Icon name="chevron-down" size={16} />
        </span>
      </div>
      {name
        ? multiple
          ? values.map((v) => <input key={String(v)} type="hidden" name={name} value={String(v)} />)
          : <input type="hidden" name={name} value={values.length ? String(values[0]) : ''} />
        : null}
      <Popover
        {...popoverProps}
        open={open && !!anchor}
        anchorEl={anchor}
        onClose={(e: React.SyntheticEvent | KeyboardEvent, reason: 'backdropClick' | 'escapeKeyDown') => {
          popoverProps?.onClose?.(e, reason);
          closeMenu(e, reason);
        }}
        placement={popoverProps?.placement ?? 'bottom-start'}
        padding={popoverProps?.padding ?? 'sm'}
        matchWidth
        disableAutoFocus
        className={cx('gl-select-popover', popoverProps?.className as string | undefined)}
      >
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          className="gl-listbox gl-select-listbox"
          aria-labelledby={labelledBy}
          aria-label={labelledBy ? undefined : ariaLabel}
          aria-multiselectable={multiple || undefined}
          aria-activedescendant={active >= 0 && active < rows.length ? optionId(active) : undefined}
          onKeyDown={onListKeyDown}
        >
          {rows.map((r, i) => {
            const own = (r.element?.props ?? {}) as {
              onClick?: (e: React.MouseEvent<HTMLLIElement>) => void;
              onPointerMove?: (e: React.PointerEvent<HTMLLIElement>) => void;
            };
            const injected = {
              key: i,
              id: optionId(i),
              value: r.value,
              selected: isSelected(r.value),
              disabled: r.disabled,
              'data-active': i === active && keyboard ? '' : undefined,
              onClick: (e: React.MouseEvent<HTMLLIElement>) => {
                own.onClick?.(e);
                choose(e, i);
              },
              onPointerMove: (e: React.PointerEvent<HTMLLIElement>) => {
                own.onPointerMove?.(e);
                const p = lastPointer.current;
                if (p.x === e.clientX && p.y === e.clientY) return;
                lastPointer.current = { x: e.clientX, y: e.clientY };
                if (!r.disabled && (i !== active || keyboard)) {
                  setActive(i);
                  setKeyboard(false);
                }
              },
            };
            return r.element ? (
              React.cloneElement(r.element, injected)
            ) : (
              <Option {...injected} secondary={r.secondary} icon={r.icon}>
                {r.label}
              </Option>
            );
          })}
        </ul>
      </Popover>
    </FieldShell>
  );
});
