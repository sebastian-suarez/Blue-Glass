import * as React from 'react';

/**
 * The site's own breakpoints (global.css): phones at 700px and below, the
 * one-column layout at 899px and below, desktop from 900px, compact desktop at
 * 1000px and below, tiny phones at 360px and below; plus the input and
 * preference queries the site gates behaviour on.
 */
export const media = {
  tiny: '(max-width: 360px)',
  phone: '(max-width: 700px)',
  tablet: '(max-width: 899px)',
  desktop: '(min-width: 900px)',
  compact: '(max-width: 1000px)',
  hover: '(hover: hover) and (pointer: fine)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
} as const;

export interface UseMediaQueryOptions {
  /** Value before the first browser read (server render). Default false. */
  defaultMatches?: boolean;
}

/** Live boolean for a CSS media query, e.g. useMediaQuery(media.phone). */
export function useMediaQuery(query: string, options: UseMediaQueryOptions = {}): boolean {
  const { defaultMatches = false } = options;
  const q = query.replace(/^@media\s*/i, '');
  const subscribe = React.useCallback((cb: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {};
    const mql = window.matchMedia(q);
    mql.addEventListener('change', cb);
    return () => mql.removeEventListener('change', cb);
  }, [q]);
  const get = React.useCallback(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : defaultMatches), [q, defaultMatches]);
  const getServer = React.useCallback(() => defaultMatches, [defaultMatches]);
  return React.useSyncExternalStore(subscribe, get, getServer);
}
