import * as React from 'react';
import { cx } from '../internal/cx';
import { useEventCallback, useForkRef } from '../internal/hooks';
import { Portal } from '../utils/Portal';
import { Slide } from '../utils/Transitions';
import { ClickAwayListener } from '../utils/ClickAwayListener';
import { Icon } from '../data-display/Icon';
import { FeedbackLiveContext } from './_feedback-live';

export type SnackbarCloseReason = 'timeout' | 'clickaway' | 'escapeKeyDown' | 'closeButton';

export interface SnackbarOrigin {
  /** The edge it sits on and slides in from. */
  vertical: 'top' | 'bottom';
  /** Where along that edge. */
  horizontal: 'left' | 'center' | 'right';
}

const DEFAULT_ORIGIN: SnackbarOrigin = { vertical: 'bottom', horizontal: 'center' };

export interface SnackbarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'onClose'> {
  /** Show the snackbar. */
  open: boolean;
  /** Called with the reason: timeout, clickaway, escapeKeyDown or closeButton. You decide whether to close. */
  onClose?: (event: React.SyntheticEvent | Event | null, reason: SnackbarCloseReason) => void;
  /** The message: one short sentence. */
  message?: React.ReactNode;
  /** One action after the message, usually a text Button at size sm ("Undo", "View"). */
  action?: React.ReactNode;
  /** Add a close icon button after the action; it calls onClose with "closeButton". */
  closable?: boolean;
  /** Accessible name (and tooltip) of the close button. Default "Close". */
  closeText?: string;
  /** The edge and position. Default bottom center. */
  anchorOrigin?: SnackbarOrigin;
  /** Close after this many ms (reason "timeout"); null keeps it open. Paused while pointed at, focused, or the window is in the background. */
  autoHideDuration?: number | null;
  /** Time left after a pause ends. Default half of autoHideDuration. */
  resumeHideDuration?: number;
  /** Keep the timer running while the window is in the background. */
  disableWindowBlurListener?: boolean;
  /** Slide timing in ms, or { enter, exit }. Default 280 in, 220 out. */
  transitionDuration?: number | { enter?: number; exit?: number };
  /** Render in place (inside a showcase Stage) instead of in document.body. */
  disablePortal?: boolean;
  /** Where the portal mounts. Default document.body. */
  container?: Element | (() => Element | null) | null;
  /** Replace the ink surface with your own element, e.g. an Alert. message, action and closable are then ignored. */
  children?: React.ReactElement;
}

/**
 * A brief message at the edge of the screen: the ink pill's ground and lift, sliding
 * in from its edge, read politely, closing itself after a pause-aware timeout.
 */
export const Snackbar = React.forwardRef<HTMLDivElement, SnackbarProps>(function Snackbar(props, ref) {
  const {
    open, onClose, message, action, closable = false, closeText = 'Close', anchorOrigin = DEFAULT_ORIGIN,
    autoHideDuration = null, resumeHideDuration, disableWindowBlurListener = false, transitionDuration,
    disablePortal = false, container, role = 'status', className, children, ...rest
  } = props;
  const vertical = anchorOrigin.vertical === 'top' ? 'top' : 'bottom';
  const horizontal = anchorOrigin.horizontal ?? 'center';
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = useForkRef(rootRef, ref);
  const close = useEventCallback((event: React.SyntheticEvent | Event | null, reason: SnackbarCloseReason) => {
    onClose?.(event, reason);
  });

  // Stay mounted until the slide out has finished.
  const [exited, setExited] = React.useState(!open);
  if (open && exited) setExited(false);
  const mounted = open || !exited;

  // Auto-hide. Each hold (pointer, focus, window) stops the clock; the last release restarts it.
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const holds = React.useRef<Set<string>>(new Set());
  const clear = useEventCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  });
  const arm = useEventCallback((delay: number) => {
    clear();
    if (!open || autoHideDuration == null || holds.current.size > 0) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      close(null, 'timeout');
    }, delay);
  });
  const hold = useEventCallback((why: string) => {
    holds.current.add(why);
    clear();
  });
  const release = useEventCallback((why: string) => {
    if (!holds.current.delete(why) || holds.current.size > 0) return;
    if (open && autoHideDuration != null) arm(resumeHideDuration ?? autoHideDuration / 2);
  });

  React.useEffect(() => {
    if (!open) {
      holds.current.clear();
      return undefined;
    }
    if (autoHideDuration != null) arm(autoHideDuration);
    return clear;
  }, [open, autoHideDuration, arm, clear]);

  React.useEffect(() => {
    if (!open || disableWindowBlurListener) return undefined;
    const onWindowBlur = () => hold('window');
    const onWindowFocus = () => release('window');
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [open, disableWindowBlurListener, hold, release]);

  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      // One Escape closes one layer: while focus is in an open modal, that modal takes it.
      const modal = (document.activeElement as Element | null)?.closest?.('.gl-modal[data-open]');
      if (modal && !modal.contains(rootRef.current)) return;
      close(e, 'escapeKeyDown');
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const surface = children ?? (
    <div className="gl-snackbar-surface">
      <div className="gl-snackbar-message">{message}</div>
      {(action != null && action !== false) || closable ? (
        <div className="gl-snackbar-action">
          {action}
          {closable ? (
            <button
              type="button"
              className="gl-snackbar-close"
              aria-label={closeText}
              title={closeText}
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => close(e, 'closeButton')}
            >
              <Icon name="close" size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  // The root stays mounted while closed: a live region that exists before its message arrives
  // is announced reliably. data-gl-live keeps it usable while a Modal makes the page inert.
  return (
    <Portal container={container} disablePortal={disablePortal}>
      <div
        ref={handleRef}
        role={role}
        aria-live={role === 'alert' ? undefined : 'polite'}
        data-gl-live=""
        className={cx('gl-snackbar', `gl-snackbar-${vertical}`, `gl-snackbar-${horizontal}`, className)}
        {...rest}
      >
        <FeedbackLiveContext.Provider value={true}>
          {mounted ? (
            <ClickAwayListener
              onClickAway={(e) => {
                if (open) close(e, 'clickaway');
              }}
            >
              <Slide in={open} appear direction={vertical === 'top' ? 'down' : 'up'} timeout={transitionDuration} onExited={() => setExited(true)}>
                <div
                  className="gl-snackbar-slot"
                  onMouseEnter={() => hold('pointer')}
                  onMouseLeave={() => release('pointer')}
                  onFocus={() => hold('focus')}
                  onBlur={(e: React.FocusEvent<HTMLDivElement>) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) release('focus');
                  }}
                >
                  {surface}
                </div>
              </Slide>
            </ClickAwayListener>
          ) : null}
        </FeedbackLiveContext.Provider>
      </div>
    </Portal>
  );
});
