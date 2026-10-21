# ClickAwayListener

Calls `onClickAway` when a press lands outside its one child. Non-modal menus, inline editors and custom dropdowns use it to close.

**Source:** an addition, matching MUI's utility. The site has no click-away surface.

## What you provide

- One `children` element that can hold a ref (any DOM element or a ref-forwarding component).
- `onClickAway(event)`.
- `mouseEvent`: `onPointerDown` (default) responds on press, which feels instant. `onClick` waits for release. `false` ignores the mouse.
- `touchEvent`: `onTouchEnd` (default), `onTouchStart` or `false`.

## Notes

- The press that mounted the listener never closes it: listening starts a tick later.
- Presses inside a portal that the child renders are outside it as far as the DOM is concerned. For anchored layers, use `Popover` (modal, closes itself) instead.
