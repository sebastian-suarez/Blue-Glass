import * as React from 'react';
import { cx } from '../internal/cx';
import { usePrefersReducedMotion } from '../internal/hooks';

export interface FabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** primary: the ink circle (.btn-primary), the default. glass: the frosted circle (.btn-glass) for a second floating action. */
  variant?: 'primary' | 'glass';
  /** sm 36px, md 46px (the site's control height, default), lg 56px. */
  size?: 'sm' | 'md' | 'lg';
  /** A pill with an icon and a visible label instead of a circle (MUI's variant="extended"). */
  extended?: boolean;
  /** Accessible name. Required when the Fab shows only an icon; an extended Fab is named by its label. */
  'aria-label'?: string;
  /** Render an <a> instead of a <button>, e.g. "Back to top" with href="#top". */
  href?: string;
  /** Link target, with href. */
  target?: string;
  /** Link rel, with href. */
  rel?: string;
  /** Button type. Default "button". */
  type?: 'button' | 'submit' | 'reset';
  /** The icon, or the icon then the label when extended. */
  children?: React.ReactNode;
}

/*
 * Transitions (Zoom, Fade) write `transition` inline on their child, which would drop the
 * Fab's own hover and press transitions. When one arrives, append ours so both keep running.
 */
const OWN_TRANSITION =
  'background-color var(--duration-hover) ease, box-shadow var(--duration-hover) ease, ' +
  'color var(--duration-hover) ease, scale var(--duration-press) var(--ease-out-quint)';

/** The floating action button: the site's ink or glass pill cut as a circle for a screen's one action, extended with a label, and safe inside Zoom. */
export const Fab = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, FabProps>(function Fab(
  { variant = 'primary', size = 'md', extended = false, href, disabled = false, className, style, children, type = 'button', onClick, ...rest },
  ref,
) {
  const reduced = usePrefersReducedMotion();
  const classes = cx('gl-fab', `gl-fab-${variant}`, `gl-fab-${size}`, extended && 'gl-fab-extended', className);
  const inline = style as React.CSSProperties | undefined;
  const merged = inline && inline.transition && !reduced ? { ...inline, transition: `${inline.transition}, ${OWN_TRANSITION}` } : inline;

  if (href !== undefined) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={classes}
        style={merged}
        href={disabled ? undefined : href}
        aria-disabled={disabled || undefined}
        role={disabled ? 'link' : undefined}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          (onClick as unknown as React.MouseEventHandler<HTMLAnchorElement> | undefined)?.(e);
        }}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      style={merged}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
});
