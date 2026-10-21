# Popover

A glass surface anchored to an element, on a transparent modal layer. Pressing outside it or pressing Escape closes it. Focus moves in when it opens and returns to the anchor when it closes. `Menu` and `Select` are built on it.

**Source:** an addition. Its material is the site's side selector (`.project-selector`), raised for floating use: `glass` with `blur-selector`, a `glass-edge` border, `radius-well` and `shadow-panel`. It falls back to `glass-solid` without backdrop blur or under reduced transparency.

## When to use

- Small anchored tasks such as share, quick settings or a filter, where the rest of the page should wait.
- For a hint that shouldn't take focus, use `Tooltip`. For a list of actions, use `Menu`.

## What you provide

- `open`, `anchorEl` (the trigger element) and `onClose(event, reason)`.
- `children`: the content. Name the surface with `role` and `aria-label` when it holds a task.
- `placement`: `bottom-start` by default. Any side with `-start` or `-end` works. It flips when there's no room.
- `padding`: `md` by default; `sm` (7px, the selector's) or `none` for lists.

## Motion

It grows from 0.96 with opacity over 200ms `ease-out-quint` and exits over 140ms. The origin is the anchor's side. Under reduced motion it only fades.
