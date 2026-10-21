/**
 * Private field scaffolding shared by TextField, Select and Autocomplete
 * (builder inputs-b): the label above, the control slot, and the helper,
 * error and counter line below. Classes live in TextField.css.
 */
import * as React from 'react';
import { cx } from '../internal/cx';
import { Icon } from '../data-display/Icon';

export interface FieldShellProps {
  rootRef: React.Ref<HTMLDivElement>;
  /** The component's own root class, e.g. "gl-select". */
  kind: string;
  className?: string;
  style?: React.CSSProperties;
  /** Remaining props for the root element. */
  rootProps?: Record<string, unknown>;
  label?: React.ReactNode;
  labelId: string;
  /** The control's id when it is a labelable element (input, textarea, select). */
  htmlFor?: string;
  /** For controls that a <label> can't point at (a combobox div): what a label press does. */
  onLabelClick?: () => void;
  helperText?: React.ReactNode;
  helperId: string;
  /** The character counter, already rendered. */
  counter?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
  variant?: 'outlined' | 'filled';
  multiline?: boolean;
  /** Extra modifier classes on the root. */
  modifiers?: string | false;
  children?: React.ReactNode;
}

export function hasContent(node: React.ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== true && node !== '';
}

/** Space-separated ids, skipping empties; undefined when none. */
export function idList(...ids: Array<string | false | null | undefined>): string | undefined {
  const s = ids.filter(Boolean).join(' ');
  return s || undefined;
}

/** Label above, control, then one footer line: helper (or error) on the left, counter on the right. */
export function FieldShell(p: FieldShellProps): React.ReactElement {
  const showLabel = hasContent(p.label);
  const showHelper = hasContent(p.helperText);
  const LabelTag = p.htmlFor ? 'label' : 'span';
  return (
    <div
      ref={p.rootRef}
      className={cx(
        'gl-field',
        p.kind,
        p.variant === 'filled' && 'gl-field-filled',
        p.size === 'sm' && 'gl-field-sm',
        p.multiline && 'gl-field-multiline',
        p.fullWidth && 'gl-field-full',
        p.error && 'gl-field-error',
        p.disabled && 'gl-field-disabled',
        p.readOnly && 'gl-field-readonly',
        p.modifiers,
        p.className,
      )}
      style={p.style}
      {...p.rootProps}
    >
      {showLabel ? (
        <LabelTag id={p.labelId} htmlFor={p.htmlFor} className="gl-field-label" onClick={p.onLabelClick}>
          {p.label}
          {p.required ? <span className="gl-field-asterisk" aria-hidden="true">*</span> : null}
        </LabelTag>
      ) : null}
      {p.children}
      {showHelper || p.counter ? (
        <div className="gl-field-footer">
          {showHelper ? (
            <span id={p.helperId} className={cx('gl-field-helper', p.error && 'gl-field-helper-error')}>
              {p.error ? <Icon name="error" size={14} /> : null}
              <span>{p.helperText}</span>
            </span>
          ) : null}
          {p.counter}
        </div>
      ) : null}
    </div>
  );
}

function isText(node: React.ReactNode): boolean {
  return typeof node === 'string' || typeof node === 'number';
}

/**
 * Put a start or end node inside the pill. An InputAdornment passes through
 * (given an id if it has none); anything else is wrapped in the same slot.
 * `text` is true for a unit such as "ms", which then joins aria-describedby.
 */
export function renderSlot(node: React.ReactNode, position: 'start' | 'end', fallbackId: string): { el: React.ReactNode; id: string; text: boolean } {
  if (!hasContent(node)) return { el: null, id: fallbackId, text: false };
  if (React.isValidElement(node) && (node.type as { __glAdornment?: boolean }).__glAdornment) {
    const props = node.props as { id?: string; children?: React.ReactNode };
    const id = props.id ?? fallbackId;
    return { el: props.id ? node : React.cloneElement(node, { id }), id, text: isText(props.children) };
  }
  return {
    el: <span id={fallbackId} className={cx('gl-field-adornment', `gl-field-adornment-${position}`)}>{node}</span>,
    id: fallbackId,
    text: isText(node),
  };
}

/** Pressing the pill's padding focuses its input, like pressing the input itself. */
export function focusFromPadding(e: React.MouseEvent<HTMLElement>, input: HTMLElement | null, disabled?: boolean): void {
  if (!input || disabled || e.button !== 0) return;
  const t = e.target as HTMLElement;
  if (t === input || t.closest('button, a, input, textarea, select, [role="button"]')) return;
  e.preventDefault();
  if (document.activeElement !== input) input.focus();
}
