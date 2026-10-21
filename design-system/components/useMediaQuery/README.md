# useMediaQuery

A hook that returns a live boolean for a CSS media query and re-renders when it changes. `media` holds the site's own breakpoints and the preference queries it gates behaviour on.

**Source:** the queries come from `global.css`: `tiny` (≤360px), `phone` (≤700px), `tablet` (≤899px, the one-column layout), `desktop` (≥900px), `compact` (≤1000px), `hover` (a fine pointer that can hover), `reducedMotion` and `reducedTransparency`. The hook is an addition, matching MUI's.

## When to use

- Behaviour that CSS can't express: changing a component's props or swapping a Drawer for inline navigation.
- Prefer CSS media queries for pure layout. They don't wait for JavaScript.

## Usage

```tsx
const { useMediaQuery, media } = window.BlueGlass;
const phone = useMediaQuery(media.phone);
const canHover = useMediaQuery(media.hover);
```

`defaultMatches` sets the value before the first browser read, for builds that render on a server.
