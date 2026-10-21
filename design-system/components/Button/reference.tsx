import * as React from 'react';
import { cx } from '../internal/cx';

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** primary: the ink pill, once per view. glass: the frosted pill (default). text: a link-weight action. */
  variant?: 'primary' | 'glass' | 'text';
  /** danger for destructive actions. */
  tone?: 'default' | 'danger';
  /** md is the site's 46px pill; sm and lg are additions. */
  size?: 'sm' | 'md' | 'lg';
  /** Icon before the label. */
  startIcon?: React.ReactNode;
  /** Icon after the label; outbound links take the arrow-ne glyph. */
  endIcon?: React.ReactNode;
  /** Busy: shows a spinner, sets aria-busy and blocks clicks. */
  loading?: boolean;
  /** Stretch to the container width. */
  fullWidth?: boolean;
  /** Render an <a> instead of a <button>. */
  href?: string;
  target?: string;
  rel?: string;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
}

function Spinner() {
  return (
    <svg className="gl-button-spinner" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The site's pill button (.btn): primary is the ink pill for the one thing a
 * view is for, glass the frosted pill beside it, text a link-weight action.
 */
export const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(
  {
    variant = 'glass', tone = 'default', size = 'md', startIcon, endIcon, loading = false, fullWidth = false,
    href, disabled = false, className, children, type = 'button', onClick, ...rest
  },
  ref,
) {
  const inactive = disabled || loading;
  const classes = cx(
    'gl-button',
    `gl-button-${variant}`,
    tone === 'danger' && 'gl-button-danger',
    size !== 'md' && `gl-button-${size}`,
    fullWidth && 'gl-button-full',
    loading && 'gl-button-loading',
    className,
  );
  const inner = (
    <>
      {loading ? <Spinner /> : startIcon ? <span className="gl-button-icon">{startIcon}</span> : null}
      <span className="gl-button-label">{children}</span>
      {endIcon ? <span className="gl-button-icon">{endIcon}</span> : null}
    </>
  );
  if (href !== undefined) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={classes}
        href={inactive ? undefined : href}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        role={inactive ? 'link' : undefined}
        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
          if (inactive) {
            e.preventDefault();
            return;
          }
          (onClick as unknown as React.MouseEventHandler<HTMLAnchorElement> | undefined)?.(e);
        }}
        {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={type}
      className={classes}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        if (loading) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {inner}
    </button>
  );
});
