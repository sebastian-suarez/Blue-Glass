import * as React from 'react';
import { useIsoLayoutEffect } from '../internal/hooks';

/**
 * The element resets the site gets from Tailwind's preflight, scoped to what the
 * components assume. bundle.css already sets the body (canvas, ink, system font,
 * focus ring, selection); this adds the rest when a page has no reset of its own.
 */
const CSS = `
@layer gl-base {
  html { -webkit-text-size-adjust: 100%; tab-size: 4; color-scheme: light; }
  @media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
  h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd, pre { margin: 0; }
  h1, h2, h3, h4 { font-weight: 500; line-height: 1.15; text-wrap: balance; }
  p { text-wrap: pretty; }
  ul, ol, menu { margin: 0; padding: 0; list-style: none; }
  img, svg, video, canvas { display: block; vertical-align: middle; }
  img, video { max-width: 100%; height: auto; }
  button, input, select, textarea { font: inherit; color: inherit; letter-spacing: inherit; }
  button { background: none; border: 0; padding: 0; cursor: pointer; }
  a { color: inherit; text-decoration: none; -webkit-tap-highlight-color: transparent; }
  table { border-collapse: collapse; }
  [hidden]:where(:not([hidden="until-found"])) { display: none !important; }
}`;

let users = 0;
let styleEl: HTMLStyleElement | null = null;

export interface CssBaselineProps {
  children?: React.ReactNode;
}

/** Adds the element resets once per document while mounted; renders its children unchanged. */
export function CssBaseline({ children }: CssBaselineProps): React.ReactElement {
  useIsoLayoutEffect(() => {
    users += 1;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.setAttribute('data-gl', 'css-baseline');
      styleEl.textContent = CSS;
      document.head.prepend(styleEl);
    }
    return () => {
      users -= 1;
      if (users === 0 && styleEl) {
        styleEl.remove();
        styleEl = null;
      }
    };
  }, []);
  return <>{children}</>;
}
