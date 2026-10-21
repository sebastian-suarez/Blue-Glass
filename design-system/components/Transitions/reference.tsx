import * as React from 'react';
import { reflow } from '../internal/dom';
import { useForkRef, useIsoLayoutEffect, usePrefersReducedMotion, useEventCallback } from '../internal/hooks';

export type TransitionStatus = 'unmounted' | 'exited' | 'entering' | 'entered' | 'exiting';
export type Timeout = number | { enter?: number; exit?: number };

export interface TransitionProps {
  /** Show (true) or hide (false) the child. */
  in?: boolean;
  /** Run the enter transition on first mount when `in` starts true. Default true. */
  appear?: boolean;
  /** Mount the child only on first enter. */
  mountOnEnter?: boolean;
  /** Unmount the child after it exits. */
  unmountOnExit?: boolean;
  /** Duration in ms, or {enter, exit}. */
  timeout?: Timeout;
  onEnter?: (node: HTMLElement) => void;
  onEntered?: (node: HTMLElement) => void;
  onExit?: (node: HTMLElement) => void;
  onExited?: (node: HTMLElement) => void;
  /** One element that can hold a ref, or a render function of the status. */
  children: React.ReactElement | ((status: TransitionStatus, ref: React.Ref<HTMLElement>) => React.ReactNode);
}

function ms(timeout: Timeout | undefined, which: 'enter' | 'exit', fallback: number): number {
  if (typeof timeout === 'number') return timeout;
  return timeout?.[which] ?? fallback;
}

/** Status machine behind every transition: exited -> entering -> entered -> exiting -> exited. */
export function useTransition(props: Omit<TransitionProps, 'children'>, nodeRef: React.MutableRefObject<HTMLElement | null>, defaults: { enter: number; exit: number }) {
  const { in: inProp = false, appear = true, mountOnEnter = false, unmountOnExit = false, timeout } = props;
  const [status, setStatus] = React.useState<TransitionStatus>(() => {
    if (inProp) return appear ? 'exited' : 'entered';
    return mountOnEnter || unmountOnExit ? 'unmounted' : 'exited';
  });
  const onEnter = useEventCallback((n: HTMLElement) => props.onEnter?.(n));
  const onEntered = useEventCallback((n: HTMLElement) => props.onEntered?.(n));
  const onExit = useEventCallback((n: HTMLElement) => props.onExit?.(n));
  const onExited = useEventCallback((n: HTMLElement) => props.onExited?.(n));
  const enterMs = ms(timeout, 'enter', defaults.enter);
  const exitMs = ms(timeout, 'exit', defaults.exit);

  useIsoLayoutEffect(() => {
    const node = nodeRef.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (inProp) {
      if (status === 'unmounted') setStatus('exited');
      else if (status === 'exited' || status === 'exiting') {
        if (node) {
          reflow(node);
          onEnter(node);
        }
        setStatus('entering');
      } else if (status === 'entering') {
        timer = setTimeout(() => setStatus('entered'), enterMs);
      } else if (status === 'entered' && node) onEntered(node);
    } else {
      if (status === 'entering' || status === 'entered') {
        if (node) onExit(node);
        setStatus('exiting');
      } else if (status === 'exiting') {
        timer = setTimeout(() => setStatus('exited'), exitMs);
      } else if (status === 'exited') {
        if (node) onExited(node);
        if (unmountOnExit) setStatus('unmounted');
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [inProp, status, enterMs, exitMs, unmountOnExit]);

  return status;
}

function getChildRef(child: React.ReactElement): React.Ref<any> | undefined {
  const props = child.props as { ref?: React.Ref<any> };
  if (props && 'ref' in props) return props.ref;
  return (child as unknown as { ref?: React.Ref<any> }).ref;
}

type StyleFor = (status: TransitionStatus, ctx: { enterMs: number; exitMs: number; reduced: boolean; node: HTMLElement | null }) => React.CSSProperties;

/** Build a transition component from a style-per-status function. */
function makeTransition<P extends object>(name: string, defaults: { enter: number; exit: number }, styleFor: (p: P) => StyleFor) {
  const Comp = React.forwardRef<HTMLElement, TransitionProps & P>(function GlTransition(props, ref) {
    const { children, in: _in, appear: _a, mountOnEnter: _m, unmountOnExit: _u, timeout, onEnter: _1, onEntered: _2, onExit: _3, onExited: _4, ...rest } = props as TransitionProps & Record<string, unknown>;
    const nodeRef = React.useRef<HTMLElement | null>(null);
    const status = useTransition(props, nodeRef, defaults);
    const reduced = usePrefersReducedMotion();
    const childRef = React.isValidElement(children) ? getChildRef(children) : undefined;
    const handleRef = useForkRef(nodeRef as React.Ref<HTMLElement>, childRef, ref);
    if (status === 'unmounted') return null;
    const enterMs = ms(timeout, 'enter', defaults.enter);
    const exitMs = ms(timeout, 'exit', defaults.exit);
    if (typeof children === 'function') return <>{children(status, handleRef as React.Ref<HTMLElement>)}</>;
    const child = React.Children.only(children) as React.ReactElement<{ style?: React.CSSProperties }>;
    const style = styleFor(rest as P)(status, { enterMs, exitMs, reduced, node: nodeRef.current });
    return React.cloneElement(child, {
      ref: handleRef,
      'data-transition': status,
      style: { ...(child.props.style || {}), ...style },
    } as Record<string, unknown>);
  });
  (Comp as unknown as { displayName: string }).displayName = name;
  (Comp as unknown as { __glTransition: boolean }).__glTransition = true;
  return Comp;
}

const EASE_OUT = 'var(--ease-out-quint, cubic-bezier(0.23, 1, 0.32, 1))';
const shown = (s: TransitionStatus) => s === 'entering' || s === 'entered';

/** Base transition: no styles of its own; use the render function for custom states. */
export const Transition = makeTransition<{}>('Transition', { enter: 200, exit: 150 }, () => () => ({}));

export interface FadeProps extends TransitionProps { easing?: string }
/** Opacity only. The reduced-motion fallback for every other transition. */
export const Fade = makeTransition<{ easing?: string }>('Fade', { enter: 200, exit: 150 }, ({ easing }) => (s, { enterMs, exitMs }) => ({
  opacity: shown(s) ? 1 : 0,
  visibility: s === 'exited' ? 'hidden' : undefined,
  transition: `opacity ${shown(s) ? enterMs : exitMs}ms ${easing ?? (shown(s) ? EASE_OUT : 'ease')}`,
}));

export interface GrowProps extends TransitionProps { /** transform-origin; default the anchored popper's origin. */ origin?: string }
/** Scale from 0.96 plus opacity, from the trigger's side (origin-aware). For menus, popovers, tooltips. */
export const Grow = makeTransition<{ origin?: string }>('Grow', { enter: 200, exit: 140 }, ({ origin }) => (s, { enterMs, exitMs, reduced }) => ({
  opacity: shown(s) ? 1 : 0,
  transform: reduced || shown(s) ? 'none' : 'scale(0.96)',
  transformOrigin: origin ?? 'var(--gl-transform-origin, center)',
  visibility: s === 'exited' ? 'hidden' : undefined,
  transition: shown(s)
    ? `opacity ${enterMs}ms ${EASE_OUT}, transform ${enterMs}ms ${EASE_OUT}`
    : `opacity ${exitMs}ms ease, transform ${exitMs}ms ease`,
}));

export interface ZoomProps extends TransitionProps {}
/** Scale from 0.85 plus opacity, centred. For floating action buttons. */
export const Zoom = makeTransition<{}>('Zoom', { enter: 220, exit: 160 }, () => (s, { enterMs, exitMs, reduced }) => ({
  opacity: shown(s) ? 1 : 0,
  transform: reduced || shown(s) ? 'none' : 'scale(0.85)',
  visibility: s === 'exited' ? 'hidden' : undefined,
  transition: shown(s)
    ? `opacity ${enterMs}ms ${EASE_OUT}, transform ${enterMs}ms ${EASE_OUT}`
    : `opacity ${exitMs}ms ease, transform ${exitMs}ms ease`,
}));

export type SlideDirection = 'up' | 'down' | 'left' | 'right';
export interface SlideProps extends TransitionProps { /** The direction the child moves in when entering. */ direction?: SlideDirection }
const SLIDE_FROM: Record<SlideDirection, string> = {
  up: 'translate3d(0, 100%, 0)',
  down: 'translate3d(0, -100%, 0)',
  left: 'translate3d(100%, 0, 0)',
  right: 'translate3d(-100%, 0, 0)',
};
/** Enter and leave along the same path. For drawers and snackbars. */
export const Slide = makeTransition<{ direction?: SlideDirection }>('Slide', { enter: 280, exit: 220 }, ({ direction = 'up' }) => (s, { enterMs, exitMs, reduced }) => ({
  transform: shown(s) ? 'none' : reduced ? 'none' : SLIDE_FROM[direction],
  opacity: reduced ? (shown(s) ? 1 : 0) : undefined,
  visibility: s === 'exited' ? 'hidden' : undefined,
  transition: reduced
    ? `opacity ${shown(s) ? enterMs : exitMs}ms ease`
    : `transform ${shown(s) ? enterMs : exitMs}ms ${EASE_OUT}`,
}));

export interface CollapseProps extends Omit<TransitionProps, 'children'> {
  /** Height kept visible when collapsed, e.g. "48px". Default 0. */
  collapsedSize?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
/**
 * Height reveal with the site's grid-rows technique (.pane .more): rows go from
 * 0fr to 1fr, so no measuring. Instant under reduced motion.
 */
export const Collapse = React.forwardRef<HTMLDivElement, CollapseProps>(function Collapse(props, ref) {
  const { children, collapsedSize = '0px', className, style, timeout, in: inProp = false } = props;
  const nodeRef = React.useRef<HTMLElement | null>(null);
  const status = useTransition({ ...props, appear: props.appear ?? false }, nodeRef, { enter: 450, exit: 300 });
  const reduced = usePrefersReducedMotion();
  const handleRef = useForkRef(nodeRef as React.Ref<HTMLDivElement>, ref);
  if (status === 'unmounted') return null;
  const open = shown(status);
  const enterMs = ms(timeout, 'enter', 450);
  const exitMs = ms(timeout, 'exit', 300);
  return (
    <div
      ref={handleRef}
      className={['gl-collapse', className].filter(Boolean).join(' ')}
      data-transition={status}
      aria-hidden={!inProp && status === 'exited' && collapsedSize === '0px' ? true : undefined}
      style={{
        display: 'grid',
        gridTemplateRows: `minmax(${collapsedSize}, ${open ? '1fr' : '0fr'})`,
        transition: reduced ? 'none' : `grid-template-rows ${open ? enterMs : exitMs}ms ${EASE_OUT}`,
        visibility: status === 'exited' && collapsedSize === '0px' ? 'hidden' : undefined,
        ...style,
      }}
    >
      <div style={{ minHeight: 0, overflow: status === 'entered' ? 'visible' : 'hidden' }}>{children}</div>
    </div>
  );
});
(Collapse as unknown as { __glTransition: boolean }).__glTransition = true;
