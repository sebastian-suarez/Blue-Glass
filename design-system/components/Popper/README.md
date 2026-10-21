# Popper

A non-modal floating layer positioned next to an anchor with `position: fixed`. It flips to the opposite side when there's no room, shifts to stay on screen, follows scroll and resize, and exposes `--gl-transform-origin` so a transition grows from the anchor. `Tooltip` and `Autocomplete` are built on it.

**Source:** an addition, matching MUI's utility with no popper.js dependency. The positioning lives in `computePosition`, which is also exported.

## When to use

- Hints, listboxes and anything that floats without taking focus or blocking the page. For a surface that should close on an outside press and hold focus, use `Popover`.

## What you provide

- `open` and `anchorEl`: an element, a function that returns one, or a virtual `{ getBoundingClientRect() }`.
- `placement` (default `bottom`), `offset` (default 8px), `matchWidth`.
- `children`: content, or with `transition`, a function `({ placement, TransitionProps }) => <Grow {...TransitionProps}>…</Grow>`. The popper unmounts after the exit.
- The surface: Popper adds no styling of its own.

## Notes

- Inside an ancestor that creates a containing block (transform, filter, backdrop-filter), fixed coordinates are corrected automatically. Glass panels have `backdrop-filter`, so this matters when you use `disablePortal`.
- `--gl-available-height` holds the space left on the chosen side, for capping list heights.
