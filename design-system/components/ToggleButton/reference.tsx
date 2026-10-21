import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback } from '../internal/hooks';

type Selection = string | string[] | null;

interface ToggleGroupContextValue {
  isSelected: (value: string) => boolean;
  onItemClick: (event: React.MouseEvent<HTMLButtonElement>, value: string) => void;
  onItemFocus: (value: string) => void;
  size: 'sm' | 'md' | 'lg';
  disabled: boolean;
  /** The one button that is in the tab order; null turns roving off. */
  tabStop: string | null;
  roving: boolean;
}

const ToggleButtonGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

export interface ToggleButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'type'> {
  /** The value this button stands for: required, and unique within its group. */
  value: string;
  /** Pressed, controlled (standalone). In a group, the group's value decides. */
  selected?: boolean;
  /** Initially pressed, uncontrolled (standalone). */
  defaultSelected?: boolean;
  /** Called on every press with the click event and this button's value. */
  onChange?: (event: React.MouseEvent<HTMLButtonElement>, value: string) => void;
  /** sm, md (default) or lg. Inherits the group's. */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to the container width (standalone). */
  fullWidth?: boolean;
  /** Disables this button. The group's disabled disables every button. */
  disabled?: boolean;
  /** Called first on every press; call event.preventDefault() to stop the toggle. */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /** Called on focus. */
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  /** Tab order (standalone). In a group the group manages it: one tab stop. */
  tabIndex?: number;
  /** Classes on the button. */
  className?: string;
  /** The label: text, an Icon, or both. An icon-only button needs an aria-label. */
  children?: React.ReactNode;
}

/** A button that stays pressed (aria-pressed): alone, a glass pill; in a ToggleButtonGroup, a segment of the site's pill track. */
export const ToggleButton = React.forwardRef<HTMLButtonElement, ToggleButtonProps>(function ToggleButton(
  {
    value, selected: selectedProp, defaultSelected = false, onChange, onClick, onFocus, size: sizeProp, fullWidth = false,
    disabled: disabledProp = false, className, children, tabIndex, ...rest
  },
  ref,
) {
  const group = React.useContext(ToggleButtonGroupContext);
  const [ownSelected, setOwnSelected] = useControlled(selectedProp, defaultSelected);
  const selected = group ? group.isSelected(value) : ownSelected;
  const size = sizeProp ?? group?.size ?? 'md';
  const disabled = disabledProp || !!group?.disabled;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    onChange?.(event, value);
    if (group) group.onItemClick(event, value);
    else setOwnSelected(!selected);
  };
  const handleFocus = (event: React.FocusEvent<HTMLButtonElement>) => {
    onFocus?.(event);
    group?.onItemFocus(value);
  };

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      className={cx(
        'gl-toggle-button',
        `gl-toggle-button-${size}`,
        !group && 'gl-toggle-button-standalone',
        fullWidth && 'gl-toggle-button-full',
        className,
      )}
      aria-pressed={selected}
      disabled={disabled}
      tabIndex={group && group.roving ? (group.tabStop === value ? 0 : -1) : tabIndex}
      onClick={handleClick}
      onFocus={handleFocus}
    >
      <span className="gl-toggle-button-label">{children}</span>
    </button>
  );
});

export interface ToggleButtonGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** The pressed value, controlled: a string or null when exclusive, an array of strings otherwise. */
  value?: Selection;
  /** The initially pressed value, uncontrolled. */
  defaultValue?: Selection;
  /**
   * Called with the click event and the new value: when exclusive, the pressed string, or null when the
   * pressed button is pressed again (ignore null to keep one always pressed); otherwise the new array.
   */
  onChange?: (event: React.MouseEvent<HTMLButtonElement>, value: any) => void;
  /** One button pressed at a time. */
  exclusive?: boolean;
  /** A row (default) or a column. Arrow keys follow it. */
  orientation?: 'horizontal' | 'vertical';
  /** sm 36px, md 46px (the site's nav track, default), lg 54px. Sets every button's size. */
  size?: 'sm' | 'md' | 'lg';
  /** Disables every button. */
  disabled?: boolean;
  /** Stretch to the container width; the buttons share it equally. */
  fullWidth?: boolean;
  /** Called before the group's own arrow-key handling; call event.preventDefault() to take over. */
  onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
  /** Classes on the group. */
  className?: string;
  /** ToggleButton elements. Name the group with aria-label or aria-labelledby. */
  children?: React.ReactNode;
}

/**
 * The site's segmented pill: ToggleButtons in the nav track, the pressed one raised. One tab stop;
 * arrow keys, Home and End move between buttons; Space or Enter presses.
 */
export const ToggleButtonGroup = React.forwardRef<HTMLDivElement, ToggleButtonGroupProps>(function ToggleButtonGroup(
  {
    value: valueProp, defaultValue, onChange, exclusive = false, orientation = 'horizontal', size = 'md', disabled = false,
    fullWidth = false, className, children, onKeyDown, ...rest
  },
  ref,
) {
  const [value, setValue] = useControlled<Selection>(valueProp, defaultValue !== undefined ? defaultValue : exclusive ? null : []);
  const isSelected = React.useCallback(
    (v: string) => (Array.isArray(value) ? value.indexOf(v) >= 0 : value === v),
    [value],
  );

  const onItemClick = useEventCallback((event: React.MouseEvent<HTMLButtonElement>, v: string) => {
    let next: Selection;
    if (exclusive) {
      next = value === v ? null : v;
    } else {
      const current = Array.isArray(value) ? value : value == null ? [] : [value];
      next = current.indexOf(v) >= 0 ? current.filter((x) => x !== v) : current.concat(v);
    }
    setValue(next);
    onChange?.(event, next);
  });

  // Roving tabindex: the tab stop is the last focused button, else the first pressed one, else the first enabled one.
  const [focused, setFocused] = React.useState<string | null>(null);
  const onItemFocus = useEventCallback((v: string) => setFocused(v));
  const items: Array<{ value: string; disabled: boolean }> = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const props = child.props as { value?: unknown; disabled?: boolean };
    if (typeof props.value === 'string') items.push({ value: props.value, disabled: disabled || !!props.disabled });
  });
  const enabled = items.filter((item) => !item.disabled);
  const fallback = enabled.find((item) => isSelected(item.value)) ?? enabled[0];
  const tabStop = enabled.some((item) => item.value === focused) ? focused : fallback ? fallback.value : null;
  const roving = items.length > 0;

  const context = React.useMemo<ToggleGroupContextValue>(
    () => ({ isSelected, onItemClick, onItemFocus, size, disabled, tabStop, roving }),
    [isSelected, onItemClick, onItemFocus, size, disabled, tabStop, roving],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const root = event.currentTarget;
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('.gl-toggle-button')).filter(
      (button) => !button.disabled && button.closest('.gl-toggle-group') === root,
    );
    const current = buttons.indexOf(root.ownerDocument.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const rtl = getComputedStyle(root).direction === 'rtl';
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const prevKey = orientation === 'vertical' ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    let target: number;
    if (event.key === nextKey) target = (current + 1) % buttons.length;
    else if (event.key === prevKey) target = (current - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[target].focus();
  };

  return (
    <div
      ref={ref}
      role="group"
      className={cx(
        'gl-toggle-group',
        `gl-toggle-group-${size}`,
        orientation === 'vertical' && 'gl-toggle-group-vertical',
        fullWidth && 'gl-toggle-group-full',
        disabled && 'gl-toggle-group-disabled',
        className,
      )}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      <ToggleButtonGroupContext.Provider value={context}>{children}</ToggleButtonGroupContext.Provider>
    </div>
  );
});
