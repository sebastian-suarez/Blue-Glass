import * as React from 'react';
import { cx } from '../internal/cx';
import { positionFixed, Placement, PositionResult } from '../internal/position';
import { useForkRef, useIsoLayoutEffect } from '../internal/hooks';
import { Modal, ModalCloseReason } from './Modal';
import { Grow } from './Transitions';
import type { AnchorEl } from './Popper';

export interface PopoverProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  open: boolean;
  /** The element the surface grows from. */
  anchorEl: AnchorEl;
  onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => void;
  /** Preferred side and alignment. Default "bottom-start". */
  placement?: Placement;
  /** Gap to the anchor in px. Default 8. */
  offset?: number;
  /** At least as wide as the anchor (selects). */
  matchWidth?: boolean;
  /** Surface padding: "none" for lists that pad themselves. Default "md". */
  padding?: 'none' | 'sm' | 'md';
  keepMounted?: boolean;
  disableAutoFocus?: boolean;
  disableRestoreFocus?: boolean;
  disableEnforceFocus?: boolean;
  disableScrollLock?: boolean;
  /** Render in place (inside a showcase stage) instead of in document.body. */
  disablePortal?: boolean;
  container?: Element | (() => Element | null) | null;
  /** Transition timing in ms. */
  transitionDuration?: number | { enter?: number; exit?: number };
  children?: React.ReactNode;
}

function resolveAnchor(anchorEl: AnchorEl) {
  return typeof anchorEl === 'function' ? anchorEl() : anchorEl;
}

/**
 * A glass surface anchored to an element, on a transparent modal layer: click
 * outside or Escape closes it, focus moves in and returns to the anchor. The
 * base of Menu and Select.
 */
export const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(function Popover(props, ref) {
  const {
    open, anchorEl, onClose, placement = 'bottom-start', offset = 8, matchWidth = false, padding = 'md',
    keepMounted = false, disableAutoFocus, disableRestoreFocus, disableEnforceFocus, disableScrollLock, disablePortal, container,
    transitionDuration, className, style, children, ...rest
  } = props;
  const paperRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = useForkRef(paperRef, ref);
  const [pos, setPos] = React.useState<PositionResult | null>(null);

  const update = React.useCallback(() => {
    const anchor = resolveAnchor(anchorEl);
    const paper = paperRef.current;
    if (!anchor || !paper) return;
    const next = positionFixed(anchor.getBoundingClientRect(), paper, { placement, offset, matchWidth });
    setPos((prev) => (prev && prev.x === next.x && prev.y === next.y && prev.maxHeight === next.maxHeight && prev.placement === next.placement ? prev : next));
  }, [anchorEl, placement, offset, matchWidth]);

  useIsoLayoutEffect(() => {
    if (open) update();
  });
  React.useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, update]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      keepMounted={keepMounted}
      invisibleBackdrop
      disableAutoFocus={disableAutoFocus}
      disableRestoreFocus={disableRestoreFocus}
      disableEnforceFocus={disableEnforceFocus}
      disableScrollLock={disableScrollLock}
      disablePortal={disablePortal}
      container={container}
    >
      <Grow timeout={transitionDuration}>
        <div
          ref={handleRef}
          className={cx('gl-popover', `gl-popover-pad-${padding}`, className)}
          data-placement={pos?.placement ?? placement}
          style={{
            position: 'fixed',
            left: pos ? pos.x : -9999,
            top: pos ? pos.y : -9999,
            minWidth: pos?.minWidth,
            maxHeight: pos ? Math.min(pos.maxHeight, 480) : undefined,
            ['--gl-transform-origin' as string]: pos?.origin ?? 'top left',
            ...style,
          }}
          {...rest}
        >
          {children}
        </div>
      </Grow>
    </Modal>
  );
});
