import * as React from 'react';
import { cx } from '../internal/cx';
import { getFocusable, getScrollbarSize, contains } from '../internal/dom';
import { useEventCallback, useForkRef, useIsoLayoutEffect } from '../internal/hooks';
import { Portal } from './Portal';
import { Backdrop, BackdropProps } from '../feedback/Backdrop';

export type ModalCloseReason = 'backdropClick' | 'escapeKeyDown';

export interface ModalProps {
  open: boolean;
  /** Called with the reason; the parent decides whether to close. */
  onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => void;
  /** One element: usually a transition (Fade, Grow, Slide) wrapping the surface. */
  children: React.ReactElement;
  /** Keep the content mounted while closed. */
  keepMounted?: boolean;
  /** No backdrop at all (the page behind stays visible and clickable outside the content). */
  hideBackdrop?: boolean;
  /** A transparent backdrop that still catches outside clicks (popovers, menus). */
  invisibleBackdrop?: boolean;
  disableEscapeKeyDown?: boolean;
  /** Don't move focus into the content on open. */
  disableAutoFocus?: boolean;
  /** Let focus leave the content while open. */
  disableEnforceFocus?: boolean;
  /** Don't return focus to the opener on close. */
  disableRestoreFocus?: boolean;
  disableScrollLock?: boolean;
  disablePortal?: boolean;
  container?: Element | (() => Element | null) | null;
  BackdropProps?: Partial<BackdropProps>;
  className?: string;
  style?: React.CSSProperties;
  /** z-index; default the z-modal token. */
  zIndex?: string | number;
}

// --- stack: only the top modal traps focus, handles Escape and owns inertness
const stack: Array<{ root: HTMLElement; lockScroll: boolean }> = [];
let scrollRestore: (() => void) | null = null;

function syncStack() {
  const top = stack[stack.length - 1];
  const body = document.body;
  Array.from(body.children).forEach((el) => {
    const marked = el.getAttribute('data-gl-inert') === '1';
    const shouldBeInert = !!top && el !== top.root && !el.contains(top.root) && !(el instanceof HTMLScriptElement) && !(el instanceof HTMLStyleElement) && !el.hasAttribute('data-gl-live');
    if (shouldBeInert && !el.hasAttribute('inert')) {
      el.setAttribute('inert', '');
      el.setAttribute('data-gl-inert', '1');
    } else if (!shouldBeInert && marked) {
      el.removeAttribute('inert');
      el.removeAttribute('data-gl-inert');
    }
  });
  const wantLock = stack.some((m) => m.lockScroll);
  if (wantLock && !scrollRestore) {
    const prev = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const bar = getScrollbarSize(document);
    if (bar > 0) body.style.paddingRight = `${(parseFloat(getComputedStyle(body).paddingRight) || 0) + bar}px`;
    body.style.overflow = 'hidden';
    scrollRestore = () => {
      body.style.overflow = prev.overflow;
      body.style.paddingRight = prev.paddingRight;
    };
  } else if (!wantLock && scrollRestore) {
    scrollRestore();
    scrollRestore = null;
  }
}

function isTransition(el: React.ReactElement): boolean {
  return !!(el.type as { __glTransition?: boolean }).__glTransition;
}

/**
 * The base of Dialog, Drawer, Popover and Menu: a portal layer with a backdrop,
 * focus moved in and kept in, Escape to close, page scroll locked and the rest
 * of the page made inert. Waits for the child's exit transition before unmounting.
 */
export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(function Modal(props, ref) {
  const {
    open, onClose, children, keepMounted = false, hideBackdrop = false, invisibleBackdrop = false,
    disableEscapeKeyDown = false, disableAutoFocus = false, disableEnforceFocus = false,
    disableRestoreFocus = false, disableScrollLock = false, disablePortal = false, container,
    BackdropProps: backdropProps, className, style, zIndex,
  } = props;
  const [exited, setExited] = React.useState(!open);
  const hasTransition = isTransition(children);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [rootNode, setRootNode] = React.useState<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLElement | null>(null);
  const openerRef = React.useRef<Element | null>(null);
  const entryRef = React.useRef<{ root: HTMLElement; lockScroll: boolean } | null>(null);
  const handleRootRef = useForkRef(rootRef, ref, setRootNode as React.RefCallback<HTMLDivElement>);

  if (open && exited) setExited(false);
  const mounted = open || keepMounted || (hasTransition && !exited);

  // Register in the stack while open. The opener is read before focus moves.
  useIsoLayoutEffect(() => {
    if (!open || !rootNode) return;
    if (!openerRef.current) openerRef.current = document.activeElement;
    const entry = { root: rootNode, lockScroll: !disableScrollLock };
    entryRef.current = entry;
    stack.push(entry);
    syncStack();
    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      if (entryRef.current === entry) entryRef.current = null;
      syncStack();
    };
  }, [open, rootNode, disableScrollLock]);

  // Move focus in.
  React.useEffect(() => {
    if (!open || disableAutoFocus || !rootNode) return;
    const content = contentRef.current;
    if (!content || contains(content, document.activeElement)) return;
    const auto = content.querySelector<HTMLElement>('[data-autofocus], [autofocus]');
    const target = auto || content;
    if (target === content && !content.hasAttribute('tabindex')) content.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }, [open, rootNode, disableAutoFocus]);

  // Restore focus when closing.
  React.useEffect(() => {
    if (open) return;
    const opener = openerRef.current as HTMLElement | null;
    openerRef.current = null;
    if (opener && !disableRestoreFocus && typeof opener.focus === 'function' && document.contains(opener)) opener.focus({ preventScroll: true });
  }, [open, disableRestoreFocus]);

  // Keep focus inside while we are the top modal.
  React.useEffect(() => {
    if (!open || disableEnforceFocus) return;
    const onFocusIn = (e: FocusEvent) => {
      const entry = entryRef.current;
      if (!entry || stack[stack.length - 1] !== entry) return;
      const content = contentRef.current;
      if (content && !contains(rootRef.current, e.target)) {
        const items = getFocusable(content);
        (items[0] || content).focus({ preventScroll: true });
      }
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [open, disableEnforceFocus]);

  // Escape closes the top modal.
  const onKeyDownDoc = useEventCallback((e: KeyboardEvent) => {
    if (e.key !== 'Escape' || disableEscapeKeyDown) return;
    const entry = entryRef.current;
    if (!entry || stack[stack.length - 1] !== entry) return;
    e.stopPropagation();
    onClose?.(e, 'escapeKeyDown');
  });
  React.useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKeyDownDoc);
    return () => document.removeEventListener('keydown', onKeyDownDoc);
  }, [open, onKeyDownDoc]);

  // Tab wraps between the first and last focusable items.
  const trap = (where: 'start' | 'end') => () => {
    const content = contentRef.current;
    if (!content) return;
    const items = getFocusable(content);
    const el = where === 'start' ? items[items.length - 1] : items[0];
    (el || content).focus({ preventScroll: true });
  };

  const downOnBackdrop = React.useRef(false);
  if (!mounted) return null;

  const childRef = (children.props as { ref?: React.Ref<HTMLElement> }).ref ?? (children as unknown as { ref?: React.Ref<HTMLElement> }).ref;
  const childProps: Record<string, unknown> = { ref: forkRef(contentRef, childRef) };
  if (hasTransition) {
    const prevOnExited = (children.props as { onExited?: (n: HTMLElement) => void }).onExited;
    childProps.in = open;
    childProps.appear = true;
    childProps.onExited = (n: HTMLElement) => {
      setExited(true);
      prevOnExited?.(n);
    };
  }

  return (
    <Portal container={container} disablePortal={disablePortal}>
      <div
        ref={handleRootRef}
        role="presentation"
        className={cx('gl-modal', !open && exited && 'gl-modal-hidden', className)}
        style={{ zIndex: zIndex ?? 'var(--z-modal, 1300)', ...style }}
        data-open={open ? '' : undefined}
      >
        {hideBackdrop ? null : (
          <Backdrop
            open={open}
            invisible={invisibleBackdrop}
            {...backdropProps}
            onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
              downOnBackdrop.current = e.target === e.currentTarget;
              (backdropProps?.onMouseDown as ((e: React.MouseEvent<HTMLDivElement>) => void) | undefined)?.(e);
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              if (downOnBackdrop.current && e.target === e.currentTarget) onClose?.(e, 'backdropClick');
              downOnBackdrop.current = false;
            }}
          />
        )}
        <div tabIndex={open ? 0 : -1} data-gl-sentinel="start" onFocus={trap('start')} />
        {React.cloneElement(children, childProps)}
        <div tabIndex={open ? 0 : -1} data-gl-sentinel="end" onFocus={trap('end')} />
      </div>
    </Portal>
  );
});

/** Ref merge usable after an early return (plain function, no hook). */
function forkRef<T>(a: React.MutableRefObject<T | null>, b: React.Ref<T> | undefined): React.RefCallback<T> {
  return (node: T | null) => {
    a.current = node;
    if (typeof b === 'function') b(node);
    else if (b) (b as React.MutableRefObject<T | null>).current = node;
  };
}
