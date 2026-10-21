import * as React from 'react';
import { cx } from '../internal/cx';

export interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * static: in the flow with no fill, the site's header over the light field (default).
   * sticky: sticks to the top of its scroll container, on glass. fixed: fixed to the
   * viewport (or the nearest transformed ancestor), on glass. Both sit at z-app-bar.
   */
  position?: 'static' | 'sticky' | 'fixed';
  /** Sticky and fixed: lift the bar with a shadow only once its scroll container has scrolled. */
  elevateOnScroll?: boolean;
  /** The element to render. Default "header". */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/**
 * The page's top bar (.identity-strip's header). Static it is the site's header,
 * transparent over the light field; sticky and fixed put it on glass with blur-control.
 */
export const AppBar = React.forwardRef<HTMLElement, AppBarProps>(function AppBar(
  { position = 'static', elevateOnScroll = false, component: Component = 'header', className, children, ...rest },
  ref,
) {
  const floating = position !== 'static';
  const watch = floating && elevateOnScroll;
  const sentinelRef = React.useRef<HTMLSpanElement | null>(null);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    if (!watch) return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    // The sentinel sits just above the bar: once it leaves the visible area, the
    // container has scrolled (sticky: the bar is stuck). Works for any scroll container.
    const io = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      setScrolled(!entry.isIntersecting);
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [watch]);

  // One stable structure, so toggling elevateOnScroll never remounts the bar.
  return (
    <>
      {watch ? <span ref={sentinelRef} className="gl-app-bar-sentinel" aria-hidden="true" /> : null}
      <Component
        ref={ref}
        className={cx(
          'gl-app-bar',
          `gl-app-bar-${position}`,
          floating && 'gl-glass',
          watch && (scrolled ? 'gl-app-bar-elevated' : 'gl-app-bar-resting'),
          className,
        )}
        data-scrolled={watch ? String(scrolled) : undefined}
        {...rest}
      >
        {children}
      </Component>
    </>
  );
});

export interface ToolbarProps extends React.HTMLAttributes<HTMLElement> {
  /** regular: the site's identity strip, 38px 5% (28px from 1000px down). dense: 12px tall padding, for sticky bars. */
  variant?: 'regular' | 'dense';
  /** Drop the 5% side padding. */
  disableGutters?: boolean;
  /** The element to render. Default "div". */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/**
 * The bar's row (.identity-strip): flex, centred items, space-between, 25px
 * gaps, capped at size-header (1380px). It wraps under 700px.
 */
export const Toolbar = React.forwardRef<HTMLElement, ToolbarProps>(function Toolbar(
  { variant = 'regular', disableGutters = false, component: Component = 'div', className, children, ...rest },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cx('gl-toolbar', variant === 'dense' && 'gl-toolbar-dense', disableGutters && 'gl-toolbar-flush', className)}
      {...rest}
    >
      {children}
    </Component>
  );
});
