# Tooltip

A short ink label for its child that opens on hover after 500ms, at once on keyboard focus or a long press, and moves along a row of triggers without waiting again.

**Source:** an addition, matching MUI's Tooltip. The surface is the site's ink: `color-ink` with `on-ink` text, 12px weight 500, padding `6px 10px`, `radius-control` and the lift of `.btn-primary` (`shadow-primary`). It floats on `Popper` at `z-tooltip` and grows from its anchor with `Grow` (0.96 to 1, 200ms `ease-out-quint`; out in 140ms). Under reduced motion it only fades.

## When to use

- The name of an icon-only button ("Copy email"), with `describeChild={false}`.
- A short description of a control that already has a name ("contact@sebastiansuarez.dev" on "Email me").
- Never for anything someone must read to finish a task, and never for interactive content. Use a `Popover` for that.

## What you provide

- `title`: a few words, sentence case, no full stop for a name.
- One child that can hold a ref and takes pointer and focus events: a `Button`, a link, an `Avatar`.
- A disabled child gets no pointer events. Wrap it in a `span` so hover still works, or keep it focusable with `aria-disabled` instead of `disabled`.
- For showcases, `open` and `disablePortal` (it renders in `document.body` otherwise).

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `placement` | `top` · `bottom` · `left` · `right`, each with `-start` or `-end` | `top` |
| `arrow` | an 8px arrow at the anchor's centre (12px gap instead of 8px) | `false` |
| `describeChild` | `true`: `aria-describedby` while open. `false`: the title becomes the child's `aria-label` | `true` |
| `enterDelay` · `leaveDelay` | ms on hover | `500` · `0` |
| `enterTouchDelay` · `leaveTouchDelay` | long press to open · time it stays after lifting | `700` · `1500` |
| `open`, `onOpen`, `onClose` | controlled use | — |
| `disableHoverListener` · `disableFocusListener` · `disableTouchListener` | turn a trigger off | `false` |
| `disableInteractive` | the pointer can't rest on the tooltip | `false` |
| `disablePortal`, `slotProps` | render in place; props for `popper` and `tooltip` | — |

## Behaviour

- Hover only on a fine pointer. Within 300ms of another tooltip closing, or while one is open, the next opens immediately and without animation.
- Keyboard focus (`:focus-visible`) opens it at once; a mouse click doesn't, and a press hides it until the pointer leaves.
- The gap to the anchor is bridged, so the pointer can move onto the tooltip without it closing (WCAG 1.4.13).
- Escape, blur, a press and the pointer leaving close it; after a long press it stays 1.5s once the finger lifts.

## Keyboard

- Tab to the child shows it. Escape hides it and stops there, so a dialog underneath stays open. Moving focus away hides it.

## Do and don't

- Do keep it to one line where you can. It wraps at 280px.
- Do give every icon-only button a tooltip, and its name through `describeChild={false}`.
- Don't repeat the visible label in the tooltip.
- Don't put links or buttons in a tooltip. Nobody can reach them reliably.
