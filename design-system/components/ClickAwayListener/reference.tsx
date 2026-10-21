import * as React from 'react';
import { useEventCallback, useForkRef } from '../internal/hooks';

export interface ClickAwayListenerProps {
  /** One element that can hold a ref. */
  children: React.ReactElement;
  onClickAway: (event: MouseEvent | TouchEvent | PointerEvent) => void;
  /** Event that counts as a click. Default "onPointerDown". false to ignore mouse. */
  mouseEvent?: 'onClick' | 'onPointerDown' | 'onPointerUp' | 'onMouseDown' | 'onMouseUp' | false;
  /** Default "onTouchEnd". false to ignore touch. */
  touchEvent?: 'onTouchStart' | 'onTouchEnd' | false;
}

const DOM_EVENT: Record<string, string> = {
  onClick: 'click', onPointerDown: 'pointerdown', onPointerUp: 'pointerup', onMouseDown: 'mousedown',
  onMouseUp: 'mouseup', onTouchStart: 'touchstart', onTouchEnd: 'touchend',
};

/** Calls onClickAway when a press lands outside its child. Ignores the press that mounted it. */
export function ClickAwayListener({ children, onClickAway, mouseEvent = 'onPointerDown', touchEvent = 'onTouchEnd' }: ClickAwayListenerProps): React.ReactElement {
  const nodeRef = React.useRef<HTMLElement | null>(null);
  const activated = React.useRef(false);
  const handler = useEventCallback((event: MouseEvent | TouchEvent | PointerEvent) => {
    if (!activated.current || !nodeRef.current) return;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const inside = path.includes(nodeRef.current) || nodeRef.current.contains(event.target as Node);
    if (!inside) onClickAway(event);
  });
  React.useEffect(() => {
    // Wait a tick so the event that opened us doesn't close us.
    const t = setTimeout(() => (activated.current = true), 0);
    const types: string[] = [];
    if (mouseEvent) types.push(DOM_EVENT[mouseEvent]);
    if (touchEvent) types.push(DOM_EVENT[touchEvent]);
    const doc = nodeRef.current?.ownerDocument || document;
    types.forEach((t) => doc.addEventListener(t, handler as EventListener));
    return () => {
      clearTimeout(t);
      activated.current = false;
      types.forEach((t) => doc.removeEventListener(t, handler as EventListener));
    };
  }, [mouseEvent, touchEvent, handler]);
  const childRef = (children.props as { ref?: React.Ref<HTMLElement> }).ref ?? (children as unknown as { ref?: React.Ref<HTMLElement> }).ref;
  const ref = useForkRef(nodeRef, childRef);
  return React.cloneElement(children, { ref } as Record<string, unknown>);
}
