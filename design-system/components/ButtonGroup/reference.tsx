import * as React from 'react';
import { cx } from '../internal/cx';

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * glass: the site's pill nav track (.identity-strip nav) holding nav-weight buttons, the default.
   * primary: one ink pill split by on-ink hairlines. text: link-weight actions split by short hairlines.
   * The group sets this variant on every child Button.
   */
  variant?: 'glass' | 'primary' | 'text';
  /** sm 36px, md 46px (the site's nav), lg 54px. The group sets this size on every child Button. */
  size?: 'sm' | 'md' | 'lg';
  /** A row (default) or a column. */
  orientation?: 'horizontal' | 'vertical';
  /** Stretch to the container width; the buttons share it equally. */
  fullWidth?: boolean;
  /** Disable every button in the group. */
  disabled?: boolean;
  /** Button elements. Name the group with aria-label or aria-labelledby. */
  children?: React.ReactNode;
}

/** Related Buttons in one track: the site's pill nav, an ink pill split into segments, or hairline-split text actions. */
export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  { variant = 'glass', size = 'md', orientation = 'horizontal', fullWidth = false, disabled = false, className, children, ...rest },
  ref,
) {
  // Button reads no context, so the group hands its variant, size and disabled state to each child.
  const items = React.Children.map(children, (child) => {
    if (!React.isValidElement(child) || typeof child.type === 'string') return child;
    const own = child.props as { disabled?: boolean };
    return React.cloneElement(child, { variant, size, disabled: disabled || own.disabled });
  });
  return (
    <div
      ref={ref}
      role="group"
      className={cx(
        'gl-button-group',
        `gl-button-group-${variant}`,
        `gl-button-group-${size}`,
        orientation === 'vertical' && 'gl-button-group-vertical',
        fullWidth && 'gl-button-group-full',
        disabled && 'gl-button-group-disabled',
        className,
      )}
      {...rest}
    >
      {items}
    </div>
  );
});
