# NoSsr

Renders its children only in the browser, after mount. Use it for anything that reads `window`, measures the DOM, or would differ between a static build and the client.

**Source:** an addition, matching MUI's utility. The site is a static Astro build that renders React at build time with no client React. A component like this is how a client-only island renders.

## What you provide

- `children`: the browser-only content.
- `fallback`: what renders until then (default nothing). Size it like the real content so nothing jumps.
- `defer`: wait one more animation frame, for heavy children.
