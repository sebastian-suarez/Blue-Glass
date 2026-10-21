import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback, useForkRef, useId, usePrefersReducedMotion } from '../internal/hooks';
import { Zoom } from '../utils/Transitions';
import { Fab, FabProps } from '../inputs/Fab';
import { Icon } from '../data-display/Icon';

export type SpeedDialDirection = 'up' | 'down' | 'left' | 'right';
export type SpeedDialOpenReason = 'toggle' | 'mouseEnter' | 'keyboard';
export type SpeedDialCloseReason = 'toggle' | 'blur' | 'mouseLeave' | 'escapeKeyDown' | 'actionClick';

interface SpeedDialContextValue {
  open: boolean;
  direction: SpeedDialDirection;
  close: (event: React.SyntheticEvent | Event, reason: SpeedDialCloseReason) => void;
}
const SpeedDialContext = React.createContext<SpeedDialContextValue | null>(null);

const NEXT_KEY: Record<SpeedDialDirection, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const PREV_KEY: Record<SpeedDialDirection, string> = { up: 'ArrowDown', down: 'ArrowUp', left: 'ArrowRight', right: 'ArrowLeft' };
/** Entry stagger, nearest action first. */
const OPEN_STAGGER = 40;
/** Exit stagger, farthest action first; exits are quicker. */
const CLOSE_STAGGER = 25;
/** Grace before a hover-opened dial closes, so the pointer can cross the gaps. */
const HOVER_CLOSE_DELAY = 160;
/** A click this soon after a hover opened the dial keeps it open instead of closing it. */
const PIN_WINDOW = 400;

/** `on`, switched after `delay` ms (immediately when delay is 0). */
function useStaggered(on: boolean, delay: number): boolean {
  const [shown, setShown] = React.useState(delay > 0 ? false : on);
  React.useEffect(() => {
    if (shown === on || delay <= 0) return;
    const t = setTimeout(() => setShown(on), delay);
    return () => clearTimeout(t);
  }, [on, delay, shown]);
  if (delay <= 0 && shown !== on) setShown(on);
  return delay <= 0 ? on : shown;
}

export interface SpeedDialProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'hidden' | 'children'> {
  /** Accessible name of the trigger, such as "Contact and share". Required: the trigger is icon-only. */
  ariaLabel: string;
  /** Open (controlled). */
  open?: boolean;
  /** Open at first (uncontrolled). */
  defaultOpen?: boolean;
  /** Called when it asks to open, with the reason: toggle, mouseEnter or keyboard. */
  onOpen?: (event: React.SyntheticEvent, reason: SpeedDialOpenReason) => void;
  /** Called when it asks to close, with the reason: toggle, blur, mouseLeave, escapeKeyDown or actionClick. */
  onClose?: (event: React.SyntheticEvent | Event, reason: SpeedDialCloseReason) => void;
  /** The way the actions fan out from the trigger. Default up. */
  direction?: SpeedDialDirection;
  /** Zoom the whole dial out, closing it; for example while the reader scrolls down. */
  hidden?: boolean;
  /** The trigger's icon. Default a SpeedDialIcon: a plus that turns 45° into a close. */
  icon?: React.ReactNode;
  /** Also open on hover with a fine pointer, not only on click. Default true. */
  openOnHover?: boolean;
  /** Props for the trigger Fab, e.g. size. It stays the ink circle. */
  FabProps?: Partial<FabProps>;
  /** SpeedDialActions, the one nearest the trigger first. */
  children?: React.ReactNode;
}

/** A floating action button that fans out up to five related actions, each a small glass Fab with a label pill. */
export const SpeedDial = React.forwardRef<HTMLDivElement, SpeedDialProps>(function SpeedDial(props, ref) {
  const {
    ariaLabel, open: openProp, defaultOpen = false, onOpen, onClose, direction = 'up', hidden = false, icon, openOnHover = true,
    FabProps, id, className, onKeyDown, onPointerEnter, onPointerLeave, onBlur, onPointerDownCapture, children, ...rest
  } = props;
  const baseId = useId(id);
  const fabId = `${baseId}-trigger`;
  const actionsId = `${baseId}-actions`;
  const reduced = usePrefersReducedMotion();
  const [openState, setOpenState] = useControlled(openProp, defaultOpen);
  const open = openState && !hidden;
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = useForkRef(rootRef, ref);
  const fabRef = React.useRef<HTMLButtonElement | null>(null);
  const actionsRef = React.useRef<HTMLDivElement | null>(null);
  const openedBy = React.useRef<{ reason: SpeedDialOpenReason; at: number } | null>(null);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pressing = React.useRef(false);
  const [focusIndex, setFocusIndex] = React.useState<number | null>(null);

  const getActions = () =>
    actionsRef.current ? Array.from(actionsRef.current.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)')) : [];

  const doOpen = useEventCallback((event: React.SyntheticEvent, reason: SpeedDialOpenReason) => {
    clearTimeout(hoverTimer.current);
    if (open || hidden) return;
    openedBy.current = { reason, at: event.timeStamp };
    setOpenState(true);
    onOpen?.(event, reason);
  });
  const doClose = useEventCallback((event: React.SyntheticEvent | Event, reason: SpeedDialCloseReason) => {
    clearTimeout(hoverTimer.current);
    if (!open) return;
    openedBy.current = null;
    // Focus on an action would be lost as it hides: hand it back to the trigger.
    if (actionsRef.current?.contains(document.activeElement)) fabRef.current?.focus({ preventScroll: true });
    setOpenState(false);
    onClose?.(event, reason);
  });

  React.useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // A press outside closes it (Safari never focuses buttons, so blur alone isn't enough).
  React.useEffect(() => {
    if (!open) return;
    const onDown = (ev: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) doClose(ev, 'blur');
    };
    const onUp = () => {
      pressing.current = false;
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
    };
  }, [open, doClose]);

  // Keyboard opening focuses the first action as soon as it is visible.
  React.useEffect(() => {
    if (!open || focusIndex === null) return;
    let raf = 0;
    let tries = 0;
    const attempt = () => {
      const el = getActions()[focusIndex];
      if (el) {
        el.focus({ preventScroll: true });
        if (document.activeElement === el) {
          setFocusIndex(null);
          return;
        }
      }
      tries += 1;
      if (tries < 30) raf = requestAnimationFrame(attempt);
      else setFocusIndex(null);
    };
    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, [open, focusIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if (!open) return;
      e.stopPropagation();
      doClose(e, 'escapeKeyDown');
      fabRef.current?.focus({ preventScroll: true });
      return;
    }
    const next = e.key === NEXT_KEY[direction];
    if (!next && e.key !== PREV_KEY[direction]) return;
    const actions = getActions();
    const i = actions.indexOf(document.activeElement as HTMLElement);
    if (i < 0 && document.activeElement !== fabRef.current) return;
    e.preventDefault();
    if (next) {
      if (!open) {
        doOpen(e, 'keyboard');
        setFocusIndex(0);
        return;
      }
      const target = Math.min(i + 1, actions.length - 1);
      if (target < 0) return;
      actions[target].focus();
      if (document.activeElement !== actions[target]) setFocusIndex(target); // still zooming in
    } else if (i > 0) actions[i - 1].focus();
    else if (i === 0) fabRef.current?.focus();
  };

  const hoverable = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerEnter?.(e);
    if (e.pointerType !== 'mouse' || !openOnHover || hidden || !hoverable()) return;
    clearTimeout(hoverTimer.current);
    if (!open) doOpen(e, 'mouseEnter');
  };
  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e);
    if (e.pointerType !== 'mouse' || openedBy.current?.reason !== 'mouseEnter') return;
    const native = e.nativeEvent;
    hoverTimer.current = setTimeout(() => doClose(native, 'mouseLeave'), HOVER_CLOSE_DELAY);
  };
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    onBlur?.(e);
    const to = e.relatedTarget as Node | null;
    if (!open || pressing.current || (to && rootRef.current?.contains(to))) return;
    if (openedBy.current?.reason === 'mouseEnter') return; // the pointer decides
    doClose(e, 'blur');
  };
  const handleFabClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    (FabProps?.onClick as React.MouseEventHandler<HTMLButtonElement> | undefined)?.(e);
    if (e.defaultPrevented) return;
    if (!open) {
      doOpen(e, 'toggle');
      return;
    }
    const by = openedBy.current;
    if (by && by.reason === 'mouseEnter' && e.timeStamp - by.at < PIN_WINDOW) {
      openedBy.current = { reason: 'toggle', at: e.timeStamp }; // the click that met a hover-open: keep it open
      return;
    }
    doClose(e, 'toggle');
  };

  const items = React.Children.toArray(children).filter(React.isValidElement) as Array<React.ReactElement<SpeedDialActionProps>>;
  const count = items.length;
  const actions = items.map((child, i) =>
    React.cloneElement(child, {
      delay: child.props.delay ?? (reduced ? 0 : open ? i * OPEN_STAGGER : (count - 1 - i) * CLOSE_STAGGER),
    }),
  );

  const ctx = React.useMemo<SpeedDialContextValue>(() => ({ open, direction, close: doClose }), [open, direction, doClose]);

  return (
    <SpeedDialContext.Provider value={ctx}>
      <div
        ref={handleRef}
        id={id}
        className={cx('gl-speed-dial', `gl-speed-dial-${direction}`, className)}
        data-open={open ? '' : undefined}
        onKeyDown={handleKeyDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onBlur={handleBlur}
        onPointerDownCapture={(e: React.PointerEvent<HTMLDivElement>) => {
          onPointerDownCapture?.(e);
          pressing.current = true;
        }}
        {...rest}
      >
        <Zoom in={!hidden} appear={false}>
          <Fab
            ref={fabRef}
            id={fabId}
            aria-label={ariaLabel}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={actionsId}
            {...FabProps}
            variant="primary"
            className={cx('gl-speed-dial-fab', FabProps?.className)}
            onClick={handleFabClick}
          >
            {icon ?? <SpeedDialIcon />}
          </Fab>
        </Zoom>
        <div
          ref={actionsRef}
          id={actionsId}
          role="menu"
          aria-orientation={direction === 'up' || direction === 'down' ? 'vertical' : 'horizontal'}
          aria-labelledby={fabId}
          className="gl-speed-dial-actions"
        >
          {actions}
        </div>
      </div>
    </SpeedDialContext.Provider>
  );
});

export interface SpeedDialActionProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onClick'> {
  /** The action's icon. */
  icon: React.ReactNode;
  /** The action's name: shown in its label pill, and the button's accessible name. */
  tooltipTitle: React.ReactNode;
  /** Keep the label pill shown while the dial is open (touch screens have no hover). Otherwise it shows on hover and focus. */
  tooltipOpen?: boolean;
  /** Side the label sits on. Default left for up and down dials, top for left and right ones. */
  tooltipPlacement?: 'left' | 'right' | 'top' | 'bottom';
  /** Can't be chosen; skipped by the arrow keys. */
  disabled?: boolean;
  /** Called on click, Enter or Space. The dial then closes, unless you call event.preventDefault(). */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Entry delay in ms. SpeedDial sets it to stagger the actions; leave it unset. */
  delay?: number;
  /** Props for the action's glass Fab. */
  FabProps?: Partial<FabProps>;
}

/** One action of a SpeedDial: a small glass Fab with an ink label pill. */
export const SpeedDialAction = React.forwardRef<HTMLSpanElement, SpeedDialActionProps>(function SpeedDialAction(props, ref) {
  const { icon, tooltipTitle, tooltipOpen = false, tooltipPlacement, disabled = false, onClick, delay = 0, FabProps, id, className, ...rest } = props;
  const ctx = React.useContext(SpeedDialContext);
  const open = ctx?.open ?? false;
  const direction = ctx?.direction ?? 'up';
  const placement = tooltipPlacement ?? (direction === 'up' || direction === 'down' ? 'left' : 'top');
  const labelId = `${useId(id)}-label`;
  const shown = useStaggered(open, delay);
  return (
    <Zoom in={shown}>
      <span
        ref={ref}
        id={id}
        role="none"
        className={cx('gl-speed-dial-action', className)}
        data-placement={placement}
        data-tooltip-open={tooltipOpen ? '' : undefined}
        {...rest}
      >
        <span id={labelId} className="gl-speed-dial-label" aria-hidden="true">
          {tooltipTitle}
        </span>
        <Fab
          variant="glass"
          size="sm"
          role="menuitem"
          tabIndex={-1}
          aria-labelledby={labelId}
          disabled={disabled}
          {...FabProps}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(e);
            (FabProps?.onClick as React.MouseEventHandler<HTMLButtonElement> | undefined)?.(e);
            if (!e.defaultPrevented) ctx?.close(e, 'actionClick');
          }}
        >
          {icon}
        </Fab>
      </span>
    </Zoom>
  );
});

export interface SpeedDialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The closed icon. Default a plus, which turns 45° into a close as the dial opens. */
  icon?: React.ReactNode;
  /** An icon to cross-fade to when open, instead of turning the plus. */
  openIcon?: React.ReactNode;
  /** Override the dial's open state. */
  open?: boolean;
}

/** The trigger's icon: a plus that turns 45° into a close, or a cross-fade to openIcon. */
export const SpeedDialIcon = React.forwardRef<HTMLSpanElement, SpeedDialIconProps>(function SpeedDialIcon(
  { icon, openIcon, open: openProp, className, ...rest },
  ref,
) {
  const ctx = React.useContext(SpeedDialContext);
  const open = openProp ?? ctx?.open ?? false;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cx('gl-speed-dial-icon', open && 'gl-speed-dial-icon-open', !!openIcon && 'gl-speed-dial-icon-swap', className)}
      {...rest}
    >
      <span className="gl-speed-dial-icon-closed">{icon ?? <Icon name="plus" />}</span>
      {openIcon ? <span className="gl-speed-dial-icon-opened">{openIcon}</span> : null}
    </span>
  );
});
