import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback, useForkRef, useId, useIsoLayoutEffect } from '../internal/hooks';
import type { Placement } from '../internal/position';
import { Popper } from '../utils/Popper';
import type { PopperProps, PopperChildProps } from '../utils/Popper';
import { Grow } from '../utils/Transitions';

/**
 * Shared by every tooltip on the page: while one is open, or for 300ms after it closes,
 * the next one opens at once and without animation (moving along a toolbar).
 */
const handoff = { open: 0, lastClose: -Infinity };
const HANDOFF_MS = 300;
const isHandoff = () => handoff.open > 0 || Date.now() - handoff.lastClose < HANDOFF_MS;

type Timer = ReturnType<typeof setTimeout> | undefined;

export interface TooltipProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  /** The hint: a few words. Empty ('' or null) shows no tooltip. */
  title: React.ReactNode;
  /** One element that can hold a ref and takes pointer and focus handlers (a button, a link, an Avatar…). */
  children: React.ReactElement;
  /** Side and alignment. Default top. Flips when there is no room. */
  placement?: Placement;
  /** A small arrow pointing at the child. */
  arrow?: boolean;
  /** Wait before showing on hover, ms. Default 500. */
  enterDelay?: number;
  /** Wait before hiding once the pointer leaves, ms. Default 0. */
  leaveDelay?: number;
  /** Long-press time on touch, ms. Default 700. */
  enterTouchDelay?: number;
  /** How long it stays after the finger lifts, ms. Default 1500. */
  leaveTouchDelay?: number;
  /**
   * true (default): the title describes the child (aria-describedby while open).
   * false: the title names the child (aria-label), for icon-only buttons.
   */
  describeChild?: boolean;
  /** Controlled open state. */
  open?: boolean;
  /** Asked to open (hover after the delay, keyboard focus, long press). */
  onOpen?: (event: React.SyntheticEvent | Event) => void;
  /** Asked to close (pointer left, blur, Escape, press). */
  onClose?: (event: React.SyntheticEvent | Event) => void;
  disableHoverListener?: boolean;
  disableFocusListener?: boolean;
  disableTouchListener?: boolean;
  /** The tooltip ignores the pointer and closes as soon as it leaves the child. */
  disableInteractive?: boolean;
  /** Render in place instead of in document.body (inside a showcase stage). */
  disablePortal?: boolean;
  /** Props for the inner parts: the Popper layer and the role="tooltip" surface. */
  slotProps?: { popper?: Partial<PopperProps>; tooltip?: React.HTMLAttributes<HTMLDivElement> };
}

function childRefOf(child: React.ReactElement): React.Ref<HTMLElement> | undefined {
  const props = child.props as { ref?: React.Ref<HTMLElement> };
  if (props && 'ref' in props) return props.ref;
  return (child as unknown as { ref?: React.Ref<HTMLElement> }).ref;
}

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  side: string;
  arrow: boolean;
  anchor: HTMLElement | null;
  children?: React.ReactNode;
}

/** The role="tooltip" surface. Measures where the arrow meets the anchor's centre. */
const TooltipSurface = React.forwardRef<HTMLDivElement, SurfaceProps>(function TooltipSurface(
  { side, arrow, anchor, className, children, ...rest },
  ref,
) {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = useForkRef(innerRef, ref);
  const [arrowAt, setArrowAt] = React.useState<number | null>(null);
  const vertical = side === 'top' || side === 'bottom';
  useIsoLayoutEffect(() => {
    if (!arrow) return;
    const el = innerRef.current;
    const layer = el?.parentElement;
    if (!el || !layer || !anchor) return;
    // The layer is never transformed (Grow scales the surface), so its box is the true position.
    const a = anchor.getBoundingClientRect();
    const b = layer.getBoundingClientRect();
    const length = vertical ? el.offsetWidth : el.offsetHeight;
    const raw = vertical ? a.left + a.width / 2 - b.left : a.top + a.height / 2 - b.top;
    const next = Math.round(Math.min(Math.max(raw, 12), Math.max(12, length - 12)));
    setArrowAt((prev) => (prev === next ? prev : next));
  });
  return (
    <div ref={handleRef} role="tooltip" data-side={side} className={cx('gl-tooltip', arrow && 'gl-tooltip-arrowed', className)} {...rest}>
      {children}
      {arrow ? (
        <span
          className="gl-tooltip-arrow"
          aria-hidden="true"
          style={arrowAt == null ? undefined : vertical ? { left: arrowAt } : { top: arrowAt }}
        />
      ) : null}
    </div>
  );
});

/**
 * A short ink label for its child. It opens on hover after 500ms (at once when moving from another
 * tooltip), on keyboard focus and on a long press; Escape, blur and leaving close it.
 */
export const Tooltip = React.forwardRef<HTMLElement, TooltipProps>(function Tooltip(props, ref) {
  const {
    title, children, placement = 'top', arrow = false, enterDelay = 500, leaveDelay = 0, enterTouchDelay = 700,
    leaveTouchDelay = 1500, describeChild = true, open: openProp, onOpen, onClose, disableHoverListener = false,
    disableFocusListener = false, disableTouchListener = false, disableInteractive = false, disablePortal = false,
    slotProps, id: idProp, ...other
  } = props;
  const child = React.Children.only(children) as React.ReactElement<Record<string, any>>;
  const base: Record<string, any> = { ...other, ...child.props };
  const id = useId(idProp as string | undefined);
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
  const [openState, setOpenState] = useControlled<boolean>(openProp, false);
  const hasTitle = title != null && title !== false && title !== '';
  const open = hasTitle && !!openState;
  const [instant, setInstant] = React.useState(false);

  const openRef = React.useRef(open);
  useIsoLayoutEffect(() => {
    openRef.current = open;
  });
  const timers = React.useRef<{ enter: Timer; leave: Timer; touch: Timer }>({ enter: undefined, leave: undefined, touch: undefined });
  const reasons = React.useRef({ hover: false, focus: false });
  const suppressed = React.useRef(false);
  const byInteraction = React.useRef(false);

  const clear = React.useCallback((which: Array<'enter' | 'leave' | 'touch'> = ['enter', 'leave', 'touch']) => {
    for (const k of which) {
      clearTimeout(timers.current[k]);
      timers.current[k] = undefined;
    }
  }, []);
  React.useEffect(() => () => clear(), [clear]);

  // Count tooltips the person opened, for the hand-off. Ones held open by a parent don't count.
  React.useEffect(() => {
    if (!open || !byInteraction.current) return undefined;
    handoff.open += 1;
    return () => {
      handoff.open -= 1;
      handoff.lastClose = Date.now();
    };
  }, [open]);

  const show = useEventCallback((event: React.SyntheticEvent | Event, quick: boolean) => {
    clear();
    if (openRef.current) return;
    byInteraction.current = true;
    setInstant(quick);
    setOpenState(true);
    onOpen?.(event);
  });
  const hide = useEventCallback((event: React.SyntheticEvent | Event) => {
    clear();
    if (!openRef.current) return;
    setOpenState(false);
    onClose?.(event);
  });
  const hideLater = (event: React.SyntheticEvent, delay: number) => {
    clear(['enter', 'leave']);
    timers.current.leave = setTimeout(() => hide(event), delay);
  };

  // Escape dismisses, before anything else on the page hears it (a dialog under it stays open).
  React.useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || (openProp !== undefined && !onClose)) return;
      e.stopPropagation();
      if (reasons.current.hover) suppressed.current = true;
      hide(e);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, openProp, onClose, hide]);

  const handlePointerEnter = (e: React.PointerEvent<HTMLElement>) => {
    base.onPointerEnter?.(e);
    if (e.pointerType === 'touch' || disableHoverListener || !hasTitle) return;
    reasons.current.hover = true;
    if (suppressed.current) return;
    clear(['leave']);
    if (openRef.current) return;
    const quick = isHandoff();
    if (quick || enterDelay <= 0) show(e, quick);
    else {
      clear(['enter']);
      timers.current.enter = setTimeout(() => show(e, false), enterDelay);
    }
  };
  const handlePointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    base.onPointerLeave?.(e);
    if (e.pointerType === 'touch') return;
    reasons.current.hover = false;
    suppressed.current = false;
    clear(['enter']);
    if (!reasons.current.focus) hideLater(e, disableInteractive ? 0 : leaveDelay);
  };
  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    base.onPointerDown?.(e);
    if (e.pointerType === 'touch') {
      if (disableTouchListener || !hasTitle) return;
      clear();
      timers.current.touch = setTimeout(() => show(e, false), enterTouchDelay);
      return;
    }
    // A press means acting, not reading: hide until the pointer leaves.
    suppressed.current = true;
    reasons.current.focus = false;
    hide(e);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLElement>) => {
    base.onPointerUp?.(e);
    if (e.pointerType !== 'touch') return;
    clear(['touch']);
    timers.current.leave = setTimeout(() => hide(e), leaveTouchDelay);
  };
  const handlePointerCancel = (e: React.PointerEvent<HTMLElement>) => {
    base.onPointerCancel?.(e);
    if (e.pointerType !== 'touch') return;
    clear(['touch']);
    timers.current.leave = setTimeout(() => hide(e), leaveTouchDelay);
  };
  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    base.onFocus?.(e);
    if (disableFocusListener || !hasTitle) return;
    let keyboard = true;
    try {
      keyboard = (e.target as HTMLElement).matches(':focus-visible');
    } catch {
      keyboard = true;
    }
    if (!keyboard) return;
    reasons.current.focus = true;
    show(e, isHandoff());
  };
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    base.onBlur?.(e);
    reasons.current.focus = false;
    if (!reasons.current.hover) hide(e);
  };

  const handleRef = useForkRef<HTMLElement>(setAnchor as React.RefCallback<HTMLElement>, childRefOf(child), ref);
  const merged: Record<string, unknown> = {
    ...base,
    className: cx(other.className as string | undefined, child.props.className) || undefined,
    style: other.style || child.props.style ? { ...(other.style as React.CSSProperties), ...child.props.style } : undefined,
    ref: handleRef,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onFocus: handleFocus,
    onBlur: handleBlur,
  };
  const labels = !describeChild && typeof title === 'string';
  if (describeChild) {
    if (open) merged['aria-describedby'] = cx(base['aria-describedby'], id);
  } else if (labels) {
    if (base['aria-label'] == null && base['aria-labelledby'] == null) merged['aria-label'] = title;
  } else if (open) {
    merged['aria-labelledby'] = cx(base['aria-labelledby'], id);
  }

  const popperProps = slotProps?.popper ?? {};
  const surfaceProps = slotProps?.tooltip ?? {};
  return (
    <>
      {React.cloneElement(child, merged)}
      {hasTitle ? (
        <Popper
          placement={placement}
          offset={arrow ? 12 : 8}
          transition
          disablePortal={disablePortal}
          zIndex="var(--z-tooltip, 1500)"
          {...popperProps}
          open={open && !!anchor}
          anchorEl={anchor}
          className={cx('gl-tooltip-popper', disableInteractive && 'gl-tooltip-popper-static', popperProps.className as string | undefined)}
        >
          {({ placement: current, TransitionProps }: PopperChildProps) => (
            <Grow {...TransitionProps} timeout={instant ? 0 : undefined}>
              <TooltipSurface
                {...surfaceProps}
                id={id}
                side={current.split('-')[0]}
                arrow={arrow}
                anchor={anchor}
                // When the title is the child's name, the popup would only repeat it.
                aria-hidden={labels ? true : undefined}
                onPointerEnter={(e: React.PointerEvent<HTMLDivElement>) => {
                  surfaceProps.onPointerEnter?.(e as never);
                  if (disableInteractive || e.pointerType === 'touch') return;
                  reasons.current.hover = true;
                  clear(['leave']);
                }}
                onPointerLeave={(e: React.PointerEvent<HTMLDivElement>) => {
                  surfaceProps.onPointerLeave?.(e as never);
                  if (disableInteractive || e.pointerType === 'touch') return;
                  reasons.current.hover = false;
                  if (!reasons.current.focus) hideLater(e, leaveDelay);
                }}
              >
                {title}
              </TooltipSurface>
            </Grow>
          )}
        </Popper>
      ) : null}
    </>
  );
});
