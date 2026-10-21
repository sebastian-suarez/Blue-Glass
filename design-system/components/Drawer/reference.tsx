import * as React from 'react';
import { cx } from '../internal/cx';
import { useId, useIsoLayoutEffect, usePrefersReducedMotion } from '../internal/hooks';
import { Modal } from '../utils/Modal';
import { Slide, SlideDirection } from '../utils/Transitions';
import { Paper } from '../surfaces/Paper';
import { Icon } from '../data-display/Icon';

export type DrawerCloseReason = 'backdropClick' | 'escapeKeyDown' | 'closeButton' | 'swipe';
export type DrawerAnchor = 'left' | 'right' | 'top' | 'bottom';

/** Slide moves the panel in the direction it travels while entering: away from its edge. */
const SLIDE_FROM: Record<DrawerAnchor, SlideDirection> = { left: 'right', right: 'left', top: 'down', bottom: 'up' };

export interface DrawerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Shown (temporary, persistent). A permanent drawer is always shown. */
  open?: boolean;
  /** Called with the reason: backdropClick, escapeKeyDown, closeButton or swipe. Set open to false to close. Shows the close button. */
  onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: DrawerCloseReason) => void;
  /** The edge it comes from. Default left. */
  anchor?: DrawerAnchor;
  /** temporary: a modal panel over a scrim (default). persistent: slides in and pushes the content beside it. permanent: a static panel. */
  variant?: 'temporary' | 'persistent' | 'permanent';
  /** true: floats 12px in from the edges on radius-panel (default). false: flush to the edge, only the inner corners rounded. */
  inset?: boolean;
  /** Panel width for left and right, a number in px or a CSS length. Default 320. Top and bottom size to their content. */
  width?: number | string;
  /** The heading in the header slot; it also names the drawer. */
  title?: React.ReactNode;
  /** Accessible name of the close button. Default "Close". */
  closeLabel?: string;
  /** temporary: no scrim; the page behind stays visible. */
  hideBackdrop?: boolean;
  /** temporary: keep the panel mounted while closed. */
  keepMounted?: boolean;
  /** temporary: render in place instead of in document.body. */
  disablePortal?: boolean;
  /** temporary: don't lock the page's scroll. */
  disableScrollLock?: boolean;
  /** temporary: don't move focus into the panel on open. */
  disableAutoFocus?: boolean;
  /** temporary: let focus leave the panel while open. */
  disableEnforceFocus?: boolean;
  /** temporary: don't return focus to the opener on close. */
  disableRestoreFocus?: boolean;
  /** temporary: Escape doesn't close it. */
  disableEscapeKeyDown?: boolean;
  /** temporary: where to portal, default document.body. */
  container?: Element | (() => Element | null) | null;
  /** temporary: slide timing in ms (default 280 in, 220 out). */
  transitionDuration?: number | { enter?: number; exit?: number };
  /** Props for the glass surface (a Paper). */
  PaperProps?: React.HTMLAttributes<HTMLElement>;
  /** The drawer's content, in a scrolling body under the header. */
  children?: React.ReactNode;
}

/** A glass panel from an edge of the screen: temporary over a scrim, persistent beside the content it pushes, or permanent. */
export const Drawer = React.forwardRef<HTMLDivElement, DrawerProps>(function Drawer(props, ref) {
  const {
    open = false, onClose, anchor = 'left', variant = 'temporary', inset = true, width = 320, title, closeLabel = 'Close',
    hideBackdrop, keepMounted, disablePortal, disableScrollLock, disableAutoFocus, disableEnforceFocus, disableRestoreFocus,
    disableEscapeKeyDown, container, transitionDuration, PaperProps, className, style, role, children, ...rest
  } = props;
  const titleId = useId();
  const reduced = usePrefersReducedMotion();
  const paperRef = React.useRef<HTMLDivElement | null>(null);
  const shown = variant === 'permanent' || open;
  const canClose = variant !== 'permanent' && !!onClose;
  const draggable = canClose && anchor === 'bottom';

  // Bottom sheets follow a drag on the grab handle; far or fast enough down closes them.
  const drag = React.useRef<{ id: number; y0: number; dy: number; prevDy: number; prevT: number; t: number } | null>(null);
  const offset = (dy: number, settle: boolean) => {
    const el = paperRef.current;
    if (!el) return;
    el.style.transition = settle && !reduced ? 'transform var(--duration-surface) var(--ease-out-quint)' : 'none';
    el.style.transform = dy ? `translate3d(0, ${dy}px, 0)` : '';
  };
  useIsoLayoutEffect(() => {
    if (open) offset(0, false);
  }, [open]);
  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0, prevDy: 0, prevT: e.timeStamp, t: e.timeStamp };
  };
  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const raw = e.clientY - d.y0;
    d.prevDy = d.dy;
    d.prevT = d.t;
    d.dy = raw > 0 ? raw : raw / 4; // pulling up meets resistance
    d.t = e.timeStamp;
    offset(d.dy, false);
  };
  const onHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const height = paperRef.current?.offsetHeight ?? 1;
    const velocity = (d.dy - d.prevDy) / Math.max(1, d.t - d.prevT); // px per ms at release
    if (e.type === 'pointerup' && d.dy > 0 && (d.dy > Math.min(120, height * 0.3) || velocity > 0.5)) onClose?.(e, 'swipe');
    else offset(0, true);
  };

  const named = title && !props['aria-labelledby'] && !props['aria-label'] ? titleId : props['aria-labelledby'];
  const header = title || canClose ? (
    <div className="gl-drawer-header">
      {title ? <h2 id={titleId} className="gl-drawer-title">{title}</h2> : null}
      {canClose ? (
        <button type="button" className="gl-drawer-close" aria-label={closeLabel} onClick={(e: React.MouseEvent<HTMLButtonElement>) => onClose?.(e, 'closeButton')}>
          <Icon name="close" size={18} />
        </button>
      ) : null}
    </div>
  ) : null;

  const paper = (
    <Paper {...PaperProps} ref={paperRef} radius="panel" className={cx('gl-drawer-paper', PaperProps?.className)}>
      {draggable ? (
        <div
          className="gl-drawer-handle"
          aria-hidden="true"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className="gl-drawer-handle-bar" />
        </div>
      ) : null}
      {header}
      <div className="gl-drawer-body">{children}</div>
    </Paper>
  );

  const rootClass = cx('gl-drawer', `gl-drawer-${variant}`, `gl-drawer-${anchor}`, inset ? 'gl-drawer-inset' : 'gl-drawer-flush', className);
  const rootStyle = { ['--gl-drawer-width' as string]: typeof width === 'number' ? `${width}px` : width, ...style } as React.CSSProperties;

  if (variant === 'temporary') {
    return (
      <Modal
        open={open}
        onClose={onClose}
        hideBackdrop={hideBackdrop}
        keepMounted={keepMounted}
        disablePortal={disablePortal}
        disableScrollLock={disableScrollLock}
        disableAutoFocus={disableAutoFocus}
        disableEnforceFocus={disableEnforceFocus}
        disableRestoreFocus={disableRestoreFocus}
        disableEscapeKeyDown={disableEscapeKeyDown}
        container={container}
        zIndex="var(--z-drawer, 1200)"
      >
        <Slide direction={SLIDE_FROM[anchor]} timeout={transitionDuration}>
          <div ref={ref} role={role ?? 'dialog'} aria-modal="true" aria-labelledby={named} className={rootClass} style={rootStyle} {...rest}>
            {paper}
          </div>
        </Slide>
      </Modal>
    );
  }
  return (
    <div
      ref={ref}
      role={role}
      aria-labelledby={role ? named : props['aria-labelledby']}
      className={rootClass}
      style={rootStyle}
      data-open={shown ? '' : undefined}
      {...rest}
    >
      {paper}
    </div>
  );
});
