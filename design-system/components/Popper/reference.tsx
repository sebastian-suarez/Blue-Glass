import * as React from 'react';
import { cx } from '../internal/cx';
import { positionFixed, Placement, PositionResult } from '../internal/position';
import { useForkRef, useIsoLayoutEffect } from '../internal/hooks';
import { Portal } from './Portal';

export { computePosition, positionFixed } from '../internal/position';
export type { Placement, PositionOptions, PositionResult } from '../internal/position';

export type VirtualElement = { getBoundingClientRect(): DOMRect; contextElement?: Element };
export type AnchorEl = HTMLElement | VirtualElement | null | (() => HTMLElement | VirtualElement | null);

export interface PopperChildProps {
  placement: Placement;
  /** Spread into a transition (Grow, Fade) so the Popper unmounts after it exits. */
  TransitionProps: { in: boolean; onExited: () => void; appear: boolean };
}

export interface PopperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  open: boolean;
  /** What to anchor to: an element, a virtual rect, or a function returning one. */
  anchorEl: AnchorEl;
  /** Preferred side and alignment. Default "bottom". Flips when it doesn't fit. */
  placement?: Placement;
  /** Gap to the anchor in px. Default 8. */
  offset?: number;
  /** At least as wide as the anchor. */
  matchWidth?: boolean;
  /** Children use a transition: the Popper stays mounted until TransitionProps.onExited. */
  transition?: boolean;
  keepMounted?: boolean;
  disablePortal?: boolean;
  container?: Element | (() => Element | null) | null;
  /** z-index; default the z-modal token. */
  zIndex?: string | number;
  children?: React.ReactNode | ((props: PopperChildProps) => React.ReactNode);
}

function resolveAnchor(anchorEl: AnchorEl): HTMLElement | VirtualElement | null {
  return typeof anchorEl === 'function' ? anchorEl() : anchorEl;
}

/**
 * Floats content next to an anchor with fixed positioning: flips to the other
 * side when there is no room, shifts to stay on screen, follows scroll and
 * resize, and exposes --gl-transform-origin so transitions grow from the anchor.
 */
export const Popper = React.forwardRef<HTMLDivElement, PopperProps>(function Popper(props, ref) {
  const {
    open, anchorEl, placement = 'bottom', offset = 8, matchWidth = false, transition = false, keepMounted = false,
    disablePortal = false, container, zIndex, className, style, children, ...rest
  } = props;
  const [exited, setExited] = React.useState(true);
  const [pos, setPos] = React.useState<PositionResult | null>(null);
  const floatingRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = useForkRef(floatingRef, ref);
  if (open && exited) setExited(false);
  const mounted = open || keepMounted || (transition && !exited);

  const update = React.useCallback(() => {
    const anchor = resolveAnchor(anchorEl);
    const floating = floatingRef.current;
    if (!anchor || !floating) return;
    const next = positionFixed(anchor.getBoundingClientRect(), floating, { placement, offset, matchWidth });
    setPos((prev) => {
      if (prev && prev.x === next.x && prev.y === next.y && prev.placement === next.placement && prev.maxHeight === next.maxHeight && prev.origin === next.origin) return prev;
      return next;
    });
  }, [anchorEl, placement, offset, matchWidth]);

  useIsoLayoutEffect(() => {
    if (!mounted) return;
    update();
  });

  React.useEffect(() => {
    if (!mounted) return;
    const anchor = resolveAnchor(anchorEl);
    const onChange = () => update();
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onChange);
      if (anchor instanceof Element) ro.observe(anchor);
      if (floatingRef.current) ro.observe(floatingRef.current);
    }
    return () => {
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
      ro?.disconnect();
    };
  }, [mounted, anchorEl, update]);

  if (!mounted) return null;
  const currentPlacement = pos?.placement ?? placement;
  const content = typeof children === 'function'
    ? children({ placement: currentPlacement, TransitionProps: { in: open, appear: true, onExited: () => setExited(true) } })
    : children;

  return (
    <Portal container={container} disablePortal={disablePortal}>
      <div
        ref={handleRef}
        className={cx('gl-popper', className as string | undefined)}
        data-placement={currentPlacement}
        style={{
          position: 'fixed',
          left: pos ? pos.x : 0,
          top: pos ? pos.y : 0,
          minWidth: pos?.minWidth,
          zIndex: zIndex ?? 'var(--z-modal, 1300)',
          visibility: pos ? undefined : 'hidden',
          display: !open && !transition && keepMounted ? 'none' : undefined,
          ['--gl-transform-origin' as string]: pos?.origin ?? 'center',
          ['--gl-available-height' as string]: pos ? `${Math.floor(pos.maxHeight)}px` : undefined,
          ...(style as React.CSSProperties | undefined),
        }}
        {...rest}
      >
        {content}
      </div>
    </Portal>
  );
});
