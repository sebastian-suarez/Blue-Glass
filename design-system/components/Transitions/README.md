# Transitions

`Fade`, `Grow`, `Slide`, `Zoom` and `Collapse`, plus the `Transition` state machine they share (exited → entering → entered → exiting). Each one takes `in` and a single child that can hold a ref, and waits for its exit before unmounting when you ask it to.

**Source:** the motion is the site's. `ease-out-quint` drives entrances and state changes. `Collapse` is the `.pane .more` grid-rows reveal (`grid-template-rows: 0fr → 1fr`). Reduced motion follows the site's rule that nothing moves, softened to opacity fades where a state change needs one. The components themselves are additions, matching MUI.

## Which one

| Transition | Use for | Timing |
| --- | --- | --- |
| `Fade` | backdrops, crossfades | 200ms in, 150ms out |
| `Grow` | menus, popovers, tooltips: scales from 0.96, from the anchor | 200ms in, 140ms out |
| `Zoom` | floating action buttons: scales from 0.85, centred | 220ms in, 160ms out |
| `Slide` | drawers and snackbars: in and out along the same path | 280ms in, 220ms out |
| `Collapse` | expanding rows and "read more" | 450ms in, 300ms out |

## What you provide

- `in`, plus `appear`, `mountOnEnter`, `unmountOnExit` and `timeout` (ms, or `{ enter, exit }`).
- One child element. The transition sets `opacity`, `transform` and `visibility` on it inline, so position the child with a wrapper, never with a transform of its own.
- `Grow`: `origin` (default `var(--gl-transform-origin)`, which `Popper` and `Popover` set). `Slide`: `direction`. `Collapse`: `collapsedSize`.

## Rules

- Never animate from nothing: Grow starts at 0.96 and Zoom at 0.85, always with opacity.
- Exits are faster than entrances.
- Don't animate what the keyboard triggers hundreds of times a day.
