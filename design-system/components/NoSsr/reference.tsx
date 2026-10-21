import * as React from 'react';
import { useIsoLayoutEffect } from '../internal/hooks';

export interface NoSsrProps {
  children?: React.ReactNode;
  /** Wait one more frame after mount before rendering (heavy children). */
  defer?: boolean;
  /** Rendered until the children mount. */
  fallback?: React.ReactNode;
}

/** Renders its children only in the browser, after mount: for anything that reads window or the DOM. */
export function NoSsr({ children, defer = false, fallback = null }: NoSsrProps): React.ReactElement {
  const [mounted, setMounted] = React.useState(false);
  useIsoLayoutEffect(() => {
    if (!defer) setMounted(true);
  }, [defer]);
  React.useEffect(() => {
    if (!defer) return;
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, [defer]);
  return <>{mounted ? children : fallback}</>;
}
