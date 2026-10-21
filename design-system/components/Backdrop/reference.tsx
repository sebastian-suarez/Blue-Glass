import * as React from 'react';
import { cx } from '../internal/cx';
import { Fade } from '../utils/Transitions';

export interface BackdropProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show the backdrop. */
  open: boolean;
  /** Transparent: still catches clicks (popovers, menus). */
  invisible?: boolean;
  /** Fade duration in ms. */
  transitionDuration?: number | { enter?: number; exit?: number };
  /** Keep in the DOM while closed. */
  keepMounted?: boolean;
  children?: React.ReactNode;
}

/** The scrim behind a modal task: dims and frosts the page so the dialog reads first. Also a loading cover. */
export const Backdrop = React.forwardRef<HTMLDivElement, BackdropProps>(function Backdrop(
  { open, invisible = false, transitionDuration, keepMounted = false, className, children, ...rest },
  ref,
) {
  return (
    <Fade in={open} timeout={transitionDuration} unmountOnExit={!keepMounted} appear>
      <div ref={ref} aria-hidden="true" className={cx('gl-backdrop', invisible && 'gl-backdrop-invisible', className)} {...rest}>
        {children}
      </div>
    </Fade>
  );
});
