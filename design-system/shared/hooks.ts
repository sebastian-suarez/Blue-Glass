import * as React from 'react';

/** useLayoutEffect in the browser, useEffect where there is no DOM. */
export const useIsoLayoutEffect: typeof React.useLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect;

/** Assign a value to any kind of ref. */
export function setRef<T>(ref: React.Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

/** Merge several refs into one callback ref (stable while the refs are). */
export function useForkRef<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> | null {
  return React.useMemo(() => {
    if (refs.every((r) => r == null)) return null;
    return (instance: T | null) => {
      for (const r of refs) setRef(r, instance);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, refs);
}

/** A callback whose identity never changes but always calls the latest function. */
export function useEventCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = React.useRef(fn);
  useIsoLayoutEffect(() => {
    ref.current = fn;
  });
  return React.useCallback((...args: A) => ref.current(...args), []);
}

/**
 * Controlled-or-uncontrolled state, MUI style: when `controlled` is not undefined
 * the prop wins and setValue only calls through to your onChange.
 */
export function useControlled<T>(controlled: T | undefined, defaultValue: T): [T, (next: T) => void] {
  const isControlled = React.useRef(controlled !== undefined).current;
  const [inner, setInner] = React.useState<T>(defaultValue);
  const value = isControlled ? (controlled as T) : inner;
  const setValue = React.useCallback((next: T) => {
    if (!isControlled) setInner(next);
  }, [isControlled]);
  return [value, setValue];
}

/** A stable id: the caller's, or React's useId. */
export function useId(idOverride?: string): string {
  const reactId = React.useId();
  return idOverride ?? 'gl' + reactId.replace(/:/g, '');
}

const REDUCED = '(prefers-reduced-motion: reduce)';
const subscribeReduced = (cb: () => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(REDUCED);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};
const getReduced = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(REDUCED).matches : false);
const getReducedServer = () => false;

/** True when the reader asks for reduced motion; updates live. */
export function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(subscribeReduced, getReduced, getReducedServer);
}

/** The previous render's value. */
export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T | undefined>(undefined);
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}
