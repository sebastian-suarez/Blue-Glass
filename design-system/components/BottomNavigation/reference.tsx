import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback } from '../internal/hooks';

export interface BottomNavigationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange' | 'defaultValue'> {
  /** The selected action's value (controlled). Actions without a value use their index. */
  value?: any;
  /** The selected value when uncontrolled. */
  defaultValue?: any;
  /** Called with the event and the chosen action's value. */
  onChange?: (event: React.SyntheticEvent, value: any) => void;
  /** Show every action's label. Default false: only the selected action shows its label. */
  showLabels?: boolean;
  /** Pin the bar bottom-centre in the viewport, above the safe-area inset, at z-app-bar. */
  fixed?: boolean;
  /** Three to five BottomNavigationAction elements. */
  children?: React.ReactNode;
}

export interface BottomNavigationActionProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
  /** The visible label. It stays the accessible name when hidden, so always pass one. */
  label?: React.ReactNode;
  /** An Icon, drawn at 20px above the label. */
  icon?: React.ReactNode;
  /** Identifies the action. Default its index. */
  value?: any;
  /** Render a link (<a href>) instead of a <button>: use it to move between pages. */
  href?: string;
  /** Render a router link component instead of <a>; it receives href and className. */
  component?: React.ElementType;
  /** Show the label even when not selected. Set by BottomNavigation from showLabels. */
  showLabel?: boolean;
  /** Set by BottomNavigation. */
  selected?: boolean;
  /** Set by BottomNavigation: called with the event and this action's value. */
  onChange?: (event: React.SyntheticEvent, value: any) => void;
}

/**
 * The header's nav pill as a bottom bar: three to five icon-over-label actions, the
 * current one raised out of the track.
 */
export const BottomNavigation = React.forwardRef<HTMLElement, BottomNavigationProps>(function BottomNavigation(
  { value: valueProp, defaultValue, onChange, showLabels = false, fixed = false, className, children, ...rest },
  ref,
) {
  const [value, setValue] = useControlled<any>(valueProp, defaultValue);
  const handleChange = useEventCallback((event: React.SyntheticEvent, next: any) => {
    setValue(next);
    onChange?.(event, next);
  });
  let index = 0;
  const actions = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const props = child.props as BottomNavigationActionProps;
    const childValue = props.value === undefined ? index : props.value;
    index += 1;
    return React.cloneElement(child, {
      value: childValue,
      selected: childValue === value,
      showLabel: props.showLabel !== undefined ? props.showLabel : showLabels,
      onChange: handleChange,
    });
  });
  return (
    <nav ref={ref} className={cx('gl-bottom-nav', fixed && 'gl-bottom-nav-fixed', className)} {...rest}>
      {actions}
    </nav>
  );
});

/** One destination in a BottomNavigation: an icon over its label; aria-current="page" when selected. */
export const BottomNavigationAction = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, BottomNavigationActionProps>(
  function BottomNavigationAction(
    { label, icon, value, href, component, showLabel = false, selected = false, onChange, onClick, disabled = false, className, ...rest },
    ref,
  ) {
    const Root: React.ElementType = component ?? (href !== undefined ? 'a' : 'button');
    const isButton = Root === 'button';
    const labelShown = selected || showLabel;
    return (
      <Root
        ref={ref}
        className={cx(
          'gl-bottom-nav-action',
          selected && 'gl-bottom-nav-action-selected',
          !labelShown && 'gl-bottom-nav-action-icon-only',
          className,
        )}
        href={isButton || disabled ? undefined : href}
        type={isButton ? 'button' : undefined}
        disabled={isButton ? disabled : undefined}
        aria-disabled={!isButton && disabled ? true : undefined}
        aria-current={selected ? 'page' : undefined}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onChange?.(event, value);
          onClick?.(event);
        }}
        {...rest}
      >
        {icon ? <span className="gl-bottom-nav-icon" aria-hidden="true">{icon}</span> : null}
        <span className="gl-bottom-nav-label">
          <span className="gl-bottom-nav-label-clip">
            <span className="gl-bottom-nav-label-text">{label}</span>
          </span>
        </span>
      </Root>
    );
  },
);
