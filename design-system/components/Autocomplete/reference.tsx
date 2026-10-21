import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useForkRef, useId } from '../internal/hooks';
import { Popper } from '../utils/Popper';
import { Grow } from '../utils/Transitions';
import { Icon } from '../data-display/Icon';
import { FieldShell, focusFromPadding, hasContent, idList, renderSlot } from './_inputs-b-field';
import { edgeIndex, fold, jumpIndex, matchRange, scrollIntoViewNearest, stepIndex } from './_inputs-b-list';
import type { FieldBaseProps } from './TextField';

/** An option: a string, or an object with a label (plus anything else you need). */
export type AutocompleteOption =
  | string
  | { label: string; value?: string | number; disabled?: boolean; secondary?: React.ReactNode; [key: string]: unknown };
export type AutocompleteChangeReason = 'selectOption' | 'removeOption' | 'createOption' | 'clear';
export type AutocompleteCloseReason = 'selectOption' | 'escape' | 'blur' | 'toggleInput';
export type AutocompleteInputChangeReason = 'input' | 'reset' | 'clear';

export interface AutocompleteProps<T = AutocompleteOption> extends FieldBaseProps, Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** The suggestions. Sort them by group when you use groupBy. */
  options: ReadonlyArray<T>;
  /** The chosen option (controlled); an array with `multiple`; a string is allowed with `freeSolo`. Null for none. */
  value?: T | string | Array<T | string> | null;
  /** The starting value (uncontrolled). */
  defaultValue?: T | string | Array<T | string> | null;
  /** Called with the new value and why it changed. */
  onChange?: (event: React.SyntheticEvent, value: any, reason: AutocompleteChangeReason) => void;
  /** The text in the input (controlled). */
  inputValue?: string;
  /** The starting text (uncontrolled). Default: the chosen option's label. */
  defaultInputValue?: string;
  /** Called when the text changes: typing (input), after a choice (reset) or the clear button (clear). */
  onInputChange?: (event: React.SyntheticEvent | null, value: string, reason: AutocompleteInputChangeReason) => void;
  /** Popup open state (controlled). */
  open?: boolean;
  /** Start with the popup open (uncontrolled), e.g. in a showcase. */
  defaultOpen?: boolean;
  /** Called when the popup asks to open. */
  onOpen?: (event: React.SyntheticEvent) => void;
  /** Called when the popup asks to close, with the reason. */
  onClose?: (event: React.SyntheticEvent, reason: AutocompleteCloseReason) => void;
  /** Choose several: removable chips before the input. */
  multiple?: boolean;
  /** Accept any text, not only an option: Enter commits what was typed. */
  freeSolo?: boolean;
  /** Hide the clear button. */
  disableClearable?: boolean;
  /** Keep the popup open after a choice (handy with multiple). */
  disableCloseOnSelect?: boolean;
  /** Open the popup when the input takes focus. */
  openOnFocus?: boolean;
  /** Highlight the first match while typing, so Enter takes it. */
  autoHighlight?: boolean;
  /** Escape on a closed popup clears the text and the value. */
  clearOnEscape?: boolean;
  /** Options are on their way: the popup says loadingText while the list is empty. */
  loading?: boolean;
  /** Default "Loading…". */
  loadingText?: React.ReactNode;
  /** Default "No options". */
  noOptionsText?: React.ReactNode;
  /** The text for an option. Default: the string itself, or `option.label`. */
  getOptionLabel?: (option: T | string) => string;
  /** Options that can't be chosen; the keyboard skips them. Default: `option.disabled`. */
  getOptionDisabled?: (option: T) => boolean;
  /** Match an option against the value. Default: same `value` field, else same label. */
  isOptionEqualToValue?: (option: T, value: T | string) => boolean;
  /** Group heading for an option; consecutive options with one heading form a group. */
  groupBy?: (option: T) => string;
  /** Replace the default filter (accent- and case-insensitive "contains" on the label). */
  filterOptions?: (options: ReadonlyArray<T>, state: { inputValue: string; getOptionLabel: (option: T | string) => string }) => T[];
  /** Custom row content; `label` arrives with the match already highlighted. */
  renderOption?: (option: T, state: { selected: boolean; inputValue: string; label: React.ReactNode }) => React.ReactNode;
  /** Hint in the empty input, in color-muted. Never a substitute for the label. */
  placeholder?: string;
  /** Form field name (the input's text; one hidden input per chip with multiple). */
  name?: string;
  /** The input's id. Generated when omitted. */
  id?: string;
  /** Focusable, not editable. */
  readOnly?: boolean;
  /** Focus the input on mount. */
  autoFocus?: boolean;
  /** Inside the pill before the input: an InputAdornment or Icon (search). */
  startAdornment?: React.ReactNode;
  /** Render the popup in place instead of in document.body (showcases, dialogs). */
  disablePortal?: boolean;
  /** Extra attributes for the <input>. */
  inputProps?: Record<string, unknown>;
  /** Ref to the <input>. */
  inputRef?: React.Ref<HTMLInputElement>;
}

type Opt = any;

function defaultLabel(o: Opt): string {
  if (o == null) return '';
  if (typeof o === 'string') return o;
  if (typeof o === 'number') return String(o);
  if (typeof o === 'object' && 'label' in o) return String((o as { label: unknown }).label ?? '');
  return String(o);
}

const prevent = (e: React.SyntheticEvent) => e.preventDefault();

const AutocompleteImpl = React.forwardRef<HTMLDivElement, AutocompleteProps<Opt>>(function Autocomplete(props, ref) {
  const {
    label, helperText, error = false, required = false, disabled = false, fullWidth = false, size = 'md',
    variant = 'outlined', options, value: valueProp, defaultValue, onChange, inputValue: inputValueProp,
    defaultInputValue, onInputChange, open: openProp, defaultOpen = false, onOpen, onClose, multiple = false,
    freeSolo = false, disableClearable = false, disableCloseOnSelect = false, openOnFocus = false,
    autoHighlight = false, clearOnEscape = false, loading = false, loadingText = 'Loading…',
    noOptionsText = 'No options', getOptionLabel, getOptionDisabled, isOptionEqualToValue, groupBy, filterOptions,
    renderOption, placeholder, name, id: idProp, readOnly = false, autoFocus, startAdornment, disablePortal = false,
    inputProps, inputRef, className, style,
    'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby': ariaDescribedby,
    ...rest
  } = props;
  const id = useId(idProp);
  const labelId = `${id}-label`;
  const helperId = `${id}-helper`;
  const listboxId = `${id}-listbox`;
  const optionId = (i: number) => `${id}-option-${i}`;
  const extra = (inputProps ?? {}) as Record<string, unknown> & {
    className?: string;
    ref?: React.Ref<HTMLInputElement>;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  };

  const getLabel = (o: Opt): string => (o == null ? '' : typeof o === 'string' ? o : getOptionLabel ? getOptionLabel(o) : defaultLabel(o));
  const keyOf = (o: Opt): string =>
    typeof o === 'object' && o !== null && (o as { value?: unknown }).value !== undefined ? `v:${String((o as { value: unknown }).value)}` : `l:${getLabel(o)}`;
  const eq = (o: Opt, v: Opt): boolean => o === v || (v != null && o != null && (isOptionEqualToValue ? isOptionEqualToValue(o, v) : keyOf(o) === keyOf(v)));
  const isDisabled = (o: Opt): boolean => (getOptionDisabled ? getOptionDisabled(o) : typeof o === 'object' && o !== null && !!(o as { disabled?: boolean }).disabled);

  const [value, setValueState] = useControlled<Opt>(valueProp, defaultValue !== undefined ? defaultValue : multiple ? [] : null);
  const values: Opt[] = multiple ? (Array.isArray(value) ? value : []) : [];
  const single: Opt = multiple ? null : value ?? null;
  const [inputValue, setInputState] = useControlled<string>(inputValueProp, defaultInputValue ?? (single != null ? getLabel(single) : ''));
  const [open, setOpenState] = useControlled<boolean>(openProp, defaultOpen);
  const [dirty, setDirty] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const [keyboard, setKeyboard] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [control, setControl] = React.useState<HTMLDivElement | null>(null);
  const [controlWidth, setControlWidth] = React.useState<number | undefined>(undefined);
  const inputEl = React.useRef<HTMLInputElement | null>(null);
  const handleInputRef = useForkRef(inputEl, inputRef, extra.ref);
  const lastPointer = React.useRef({ x: -1, y: -1 });

  // Filter on what was typed; a pristine input that shows the chosen label lists everything.
  const query = !multiple && single != null && !dirty && inputValue === getLabel(single) ? '' : inputValue;
  const filterFor = (text: string): Opt[] => {
    if (filterOptions) return filterOptions(options, { inputValue: text, getOptionLabel: getLabel });
    const q = fold(text.trim());
    return q ? options.filter((o) => fold(getLabel(o)).includes(q)) : options.slice();
  };
  const filtered = filterFor(query);
  const n = filtered.length;
  const enabled = (i: number) => i >= 0 && i < n && !isDisabled(filtered[i]);
  const activeIdx = active < n ? active : -1;
  const isSelected = (o: Opt) => (multiple ? values.some((v) => eq(o, v)) : single != null && eq(o, single));
  const popupOpen = open && !disabled && !readOnly && (n > 0 || loading || !freeSolo);
  const hasValue = multiple ? values.length > 0 : single != null;

  React.useEffect(() => {
    if (!control) return;
    const measure = () => setControlWidth(control.offsetWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(control);
    return () => ro.disconnect();
  }, [control]);

  React.useEffect(() => {
    if (!popupOpen || activeIdx < 0) return;
    const raf = requestAnimationFrame(() => scrollIntoViewNearest(document.getElementById(optionId(activeIdx))));
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupOpen, activeIdx]);

  const setInput = (e: React.SyntheticEvent | null, text: string, reason: AutocompleteInputChangeReason) => {
    if (text === inputValue) return;
    setInputState(text);
    onInputChange?.(e, text, reason);
  };
  const setValue = (e: React.SyntheticEvent, next: Opt, reason: AutocompleteChangeReason) => {
    setValueState(next);
    onChange?.(e, next, reason);
  };
  const selectedIndexIn = (list: Opt[]) => (!multiple && single != null ? list.findIndex((o) => eq(o, single)) : -1);
  const openPopup = (e: React.SyntheticEvent) => {
    if (open || disabled || readOnly) return;
    setOpenState(true);
    onOpen?.(e);
  };
  const closePopup = (e: React.SyntheticEvent, reason: AutocompleteCloseReason) => {
    setActive(-1);
    if (!open) return;
    setOpenState(false);
    onClose?.(e, reason);
  };

  const selectOption = (e: React.SyntheticEvent, option: Opt) => {
    if (isDisabled(option) || readOnly) return;
    if (multiple) {
      const has = values.some((v) => eq(option, v));
      setValue(e, has ? values.filter((v) => !eq(option, v)) : [...values, option], has ? 'removeOption' : 'selectOption');
      setInput(e, '', 'reset');
      setActive(filterFor('').findIndex((o) => eq(o, option)));
    } else {
      if (!(single != null && eq(option, single))) setValue(e, option, 'selectOption');
      setInput(e, getLabel(option), 'reset');
    }
    setDirty(false);
    if (!disableCloseOnSelect) closePopup(e, 'selectOption');
  };
  const commitText = (e: React.SyntheticEvent) => {
    const text = inputValue.trim();
    if (!text) return;
    if (multiple) {
      if (!values.some((v) => getLabel(v) === text)) setValue(e, [...values, text], 'createOption');
      setInput(e, '', 'reset');
    } else if (single == null || getLabel(single) !== text) {
      setValue(e, text, 'createOption');
    }
    setDirty(false);
    closePopup(e, 'selectOption');
  };
  const focusTag = (i: number) => {
    const btn = control?.querySelector<HTMLButtonElement>(`[data-tag-index="${i}"] button`);
    if (btn) btn.focus();
    else inputEl.current?.focus();
  };
  const removeAt = (e: React.SyntheticEvent, i: number, refocus: 'input' | 'tag') => {
    setValue(e, values.filter((_, k) => k !== i), 'removeOption');
    const target = i > 0 ? i - 1 : 0;
    requestAnimationFrame(() => (refocus === 'tag' && values.length > 1 ? focusTag(target) : inputEl.current?.focus()));
  };
  const clearAll = (e: React.SyntheticEvent) => {
    setInput(e, '', 'clear');
    if (hasValue) setValue(e, multiple ? [] : null, 'clear');
    setDirty(false);
    setActive(-1);
  };

  const onInputChangeEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    (extra.onChange as ((ev: React.ChangeEvent<HTMLInputElement>) => void) | undefined)?.(e);
    const text = e.target.value;
    setInputState(text);
    onInputChange?.(e, text, 'input');
    setDirty(true);
    if (text === '' && !multiple && !disableClearable && single != null) setValue(e, null, 'clear');
    openPopup(e);
    if (autoHighlight) {
      const list = filterFor(text);
      setActive(list.findIndex((o) => !isDisabled(o)));
      setKeyboard(true);
    } else {
      setActive(-1);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    extra.onKeyDown?.(e);
    if (e.defaultPrevented || disabled || readOnly) return;
    const k = e.key;
    switch (k) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (e.altKey) {
          if (k === 'ArrowDown') openPopup(e);
          else closePopup(e, 'escape');
          return;
        }
        setKeyboard(true);
        if (!open) {
          openPopup(e);
          const sel = selectedIndexIn(filtered);
          setActive(sel >= 0 ? sel : edgeIndex(k === 'ArrowDown' ? 1 : -1, n, enabled));
          return;
        }
        setActive(stepIndex(activeIdx, k === 'ArrowDown' ? 1 : -1, n, enabled, true));
        return;
      }
      case 'PageDown':
      case 'PageUp':
        if (!popupOpen) return;
        e.preventDefault();
        setKeyboard(true);
        setActive(jumpIndex(activeIdx, k === 'PageDown' ? 5 : -5, n, enabled));
        return;
      case 'Home':
      case 'End':
        if (!popupOpen || freeSolo) return;
        e.preventDefault();
        setKeyboard(true);
        setActive(edgeIndex(k === 'Home' ? 1 : -1, n, enabled));
        return;
      case 'Enter':
        if (e.nativeEvent.isComposing) return;
        if (popupOpen && activeIdx >= 0) {
          e.preventDefault();
          selectOption(e, filtered[activeIdx]);
        } else if (freeSolo && inputValue.trim() !== '') {
          e.preventDefault();
          commitText(e);
        }
        return;
      case 'Escape':
        if (open) {
          e.preventDefault();
          e.stopPropagation();
          closePopup(e, 'escape');
        } else if (clearOnEscape && (inputValue !== '' || hasValue)) {
          e.preventDefault();
          e.stopPropagation();
          clearAll(e);
        }
        return;
      case 'Backspace':
        if (multiple && inputValue === '' && values.length) removeAt(e, values.length - 1, 'input');
        return;
      case 'ArrowLeft': {
        const el = e.currentTarget;
        if (multiple && values.length && el.selectionStart === 0 && el.selectionEnd === 0) {
          e.preventDefault();
          focusTag(values.length - 1);
        }
        return;
      }
      case 'Tab':
        if (open) closePopup(e, 'blur');
        return;
      default:
    }
  };

  const onTagKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (i > 0) focusTag(i - 1);
        return;
      case 'ArrowRight':
        e.preventDefault();
        if (i < values.length - 1) focusTag(i + 1);
        else inputEl.current?.focus();
        return;
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        removeAt(e, i, 'tag');
        return;
      case 'Escape':
        e.preventDefault();
        inputEl.current?.focus();
        return;
      default:
    }
  };

  const hover = (e: React.PointerEvent, i: number) => {
    const p = lastPointer.current;
    if (p.x === e.clientX && p.y === e.clientY) return;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    if (enabled(i) && (i !== activeIdx || keyboard)) {
      setActive(i);
      setKeyboard(false);
    }
  };

  const renderRow = (o: Opt, i: number) => {
    const text = getLabel(o);
    const sel = isSelected(o);
    const dis = isDisabled(o);
    const range = query.trim() ? matchRange(text, query) : null;
    const content: React.ReactNode = range ? (
      <>
        {text.slice(0, range[0])}
        <span className="gl-autocomplete-match">{text.slice(range[0], range[1])}</span>
        {text.slice(range[1])}
      </>
    ) : (
      text
    );
    const secondary = typeof o === 'object' && o !== null ? (o as { secondary?: React.ReactNode }).secondary : undefined;
    return (
      <li
        key={`${keyOf(o)}:${i}`}
        id={optionId(i)}
        role="option"
        aria-selected={sel}
        aria-disabled={dis || undefined}
        className="gl-option"
        data-active={i === activeIdx && keyboard ? '' : undefined}
        onPointerMove={(e: React.PointerEvent<HTMLLIElement>) => hover(e, i)}
        onClick={(e: React.MouseEvent<HTMLLIElement>) => {
          if (!dis) selectOption(e, o);
        }}
      >
        {renderOption ? (
          renderOption(o, { selected: sel, inputValue: query, label: content })
        ) : (
          <span className="gl-option-text">
            <span>{content}</span>
            {hasContent(secondary) ? <span className="gl-option-secondary">{secondary}</span> : null}
          </span>
        )}
        {sel ? (
          <span className="gl-option-end">
            <Icon name="check" size={16} />
          </span>
        ) : null}
      </li>
    );
  };

  const labelledBy = (ariaLabelledby as string | undefined) ?? (hasContent(label) ? labelId : undefined);
  const listProps = {
    id: listboxId,
    role: 'listbox',
    className: 'gl-listbox gl-autocomplete-listbox',
    'aria-labelledby': labelledBy,
    'aria-label': labelledBy ? undefined : (ariaLabel as string | undefined),
    'aria-multiselectable': multiple || undefined,
    onPointerLeave: () => {
      if (!keyboard) setActive(-1);
    },
  };
  let list: React.ReactNode;
  if (groupBy) {
    const groups: Array<{ key: string; items: Array<[Opt, number]> }> = [];
    filtered.forEach((o, i) => {
      const g = groupBy(o);
      const last = groups[groups.length - 1];
      if (last && last.key === g) last.items.push([o, i]);
      else groups.push({ key: g, items: [[o, i]] });
    });
    list = (
      <div {...listProps}>
        {groups.map((g, gi) => (
          <ul key={gi} role="group" aria-labelledby={`${id}-group-${gi}`} className="gl-listbox gl-autocomplete-group">
            <li role="presentation" id={`${id}-group-${gi}`} className="gl-option-group">
              {g.key}
            </li>
            {g.items.map(([o, i]) => renderRow(o, i))}
          </ul>
        ))}
      </div>
    );
  } else {
    list = <ul {...listProps}>{filtered.map(renderRow)}</ul>;
  }

  const start = renderSlot(startAdornment, 'start', `${id}-start`);
  const clearable = !disableClearable && !disabled && !readOnly;
  const canClear = clearable && (inputValue !== '' || hasValue);
  const endCount = (clearable ? 1 : 0) + (freeSolo ? 0 : 1);
  const statusText = popupOpen && n === 0 ? (loading ? (typeof loadingText === 'string' ? loadingText : 'Loading…') : typeof noOptionsText === 'string' ? noOptionsText : 'No options') : '';

  return (
    <FieldShell
      rootRef={ref}
      kind="gl-autocomplete"
      className={className as string | undefined}
      style={style as React.CSSProperties | undefined}
      rootProps={rest}
      label={label}
      labelId={labelId}
      htmlFor={id}
      helperText={helperText}
      helperId={helperId}
      error={error}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      fullWidth={fullWidth}
      size={size}
      variant={variant}
      modifiers={cx(multiple && 'gl-autocomplete-multiple', multiple && values.length > 0 && 'gl-autocomplete-has-tags')}
    >
      <div
        ref={setControl}
        className="gl-field-control gl-autocomplete-control"
        data-focused={focused && !disabled ? '' : undefined}
        data-open={popupOpen ? '' : undefined}
        data-end={endCount}
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => focusFromPadding(e, inputEl.current, disabled)}
      >
        {start.el}
        {multiple
          ? values.map((v, i) => {
              const text = getLabel(v);
              return (
                <span key={`${keyOf(v)}:${i}`} className="gl-autocomplete-tag" data-tag-index={i}>
                  <span className="gl-autocomplete-tag-label">{text}</span>
                  {!disabled && !readOnly ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      className="gl-autocomplete-tag-remove"
                      aria-label={`Remove ${text}`}
                      onMouseDown={prevent}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => removeAt(e, i, 'input')}
                      onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => onTagKeyDown(e, i)}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  ) : null}
                </span>
              );
            })
          : null}
        <input
          {...extra}
          ref={handleInputRef}
          id={id}
          name={multiple ? undefined : name}
          type="text"
          role="combobox"
          className={cx('gl-field-input', 'gl-autocomplete-input', extra.className)}
          value={inputValue}
          placeholder={multiple && values.length ? undefined : placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required && !hasValue}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={popupOpen}
          aria-controls={popupOpen ? listboxId : undefined}
          aria-activedescendant={popupOpen && activeIdx >= 0 ? optionId(activeIdx) : undefined}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={idList(hasContent(helperText) && helperId, ariaDescribedby as string | undefined)}
          aria-invalid={error || undefined}
          onChange={onInputChangeEvent}
          onKeyDown={onKeyDown}
          onMouseDown={(e: React.MouseEvent<HTMLInputElement>) => {
            if (e.button === 0 && !open) {
              setKeyboard(false);
              openPopup(e);
            }
          }}
          onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
            setFocused(true);
            if (openOnFocus) openPopup(e);
            extra.onFocus?.(e);
          }}
          onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
            setFocused(false);
            closePopup(e, 'blur');
            if (!freeSolo) setInput(e, multiple || single == null ? '' : getLabel(single), 'reset');
            setDirty(false);
            extra.onBlur?.(e);
          }}
        />
        {endCount ? (
          <span className="gl-autocomplete-end">
            {clearable ? (
              <button
                type="button"
                tabIndex={-1}
                className="gl-autocomplete-button gl-autocomplete-clear"
                aria-label="Clear"
                title="Clear"
                data-empty={canClear ? undefined : ''}
                onMouseDown={prevent}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  clearAll(e);
                  inputEl.current?.focus();
                }}
              >
                <Icon name="close" size={16} />
              </button>
            ) : null}
            {!freeSolo ? (
              <button
                type="button"
                tabIndex={-1}
                className="gl-autocomplete-button gl-autocomplete-popup-indicator"
                aria-label={popupOpen ? 'Close' : 'Open'}
                title={popupOpen ? 'Close' : 'Open'}
                disabled={disabled}
                onMouseDown={prevent}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  if (readOnly) return;
                  if (open) closePopup(e, 'toggleInput');
                  else {
                    setKeyboard(false);
                    openPopup(e);
                  }
                  inputEl.current?.focus();
                }}
              >
                <Icon name="chevron-down" size={16} />
              </button>
            ) : null}
          </span>
        ) : null}
      </div>
      {multiple && name ? values.map((v, i) => <input key={i} type="hidden" name={name} value={getLabel(v)} />) : null}
      <span className="gl-sr-only" role="status" aria-live="polite">
        {statusText}
      </span>
      <Popper
        open={popupOpen && !!control}
        anchorEl={control}
        placement="bottom-start"
        matchWidth
        transition
        disablePortal={disablePortal}
        className="gl-autocomplete-popper"
        style={{ width: controlWidth }}
      >
        {({ TransitionProps }: { TransitionProps: { in: boolean; onExited: () => void; appear: boolean } }) => (
          <Grow {...TransitionProps}>
            <div className="gl-popover gl-popover-pad-sm gl-autocomplete-popup" onMouseDown={prevent}>
              {n === 0 ? <div className="gl-autocomplete-status">{loading ? loadingText : noOptionsText}</div> : list}
            </div>
          </Grow>
        )}
      </Popper>
    </FieldShell>
  );
});

/**
 * A text field with suggestions: the field's pill as an editable combobox over a
 * non-modal glass listbox that filters as you type and sets the match in 600,
 * with groups, free text, removable chips, and loading and empty states.
 */
export const Autocomplete = AutocompleteImpl as <T = AutocompleteOption>(
  props: AutocompleteProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement | null;
