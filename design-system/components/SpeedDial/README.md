# SpeedDial

A floating action button that fans out up to five related actions: the ink trigger's plus turns into a close, and small glass actions zoom in one after another, each with an ink label pill.

**Source:** an addition, matching MUI's SpeedDial, SpeedDialAction and SpeedDialIcon, built from `Fab`. The trigger is the `primary` Fab (`.btn-primary` cut as a circle: `color-ink`, `on-ink`, `shadow-primary`). The actions are `sm` `glass` Fabs (`.btn-glass`), revealed with `Zoom` (0.85 to 1 with opacity, 220ms `ease-out-quint`), 40ms apart going out and 25ms apart coming back, farthest first. The label pill uses the site's chip measurements (12px, `5px 11px`, `radius-pill`) on `color-ink`.

## When to use

- Use it when one floating button has to lead to three to five related actions, such as "Email me", "Copy link", "Share" and "Download résumé".
- With only one action, use a `Fab`. For more than five, or for actions that need words to be understood, use a `Menu`.
- Set `tooltipOpen` on touch screens, where there's no hover to reveal a label.

## What you provide

- `ariaLabel`: the trigger's name ("Contact and share"). It's required because the trigger shows only an icon. The action list is named by it.
- `SpeedDialAction` children, nearest the trigger first: `icon`, `tooltipTitle` (the label and the button's name), `onClick`, optional `tooltipOpen` and `tooltipPlacement`.
- Placement. Like `Fab`, it doesn't position itself:

```css
position: fixed;
right: calc(var(--space-md) + env(safe-area-inset-right, 0px));
bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
```

  It stacks at `z-fab`. With direction `up` it grows upward from that corner.
- `open`/`defaultOpen` with `onOpen(event, reason)` and `onClose(event, reason)`. Open reasons: `toggle`, `mouseEnter`, `keyboard`. Close reasons: `toggle`, `blur`, `mouseLeave`, `escapeKeyDown`, `actionClick`.
- `icon`: `<SpeedDialIcon />` by default. `<SpeedDialIcon openIcon={<Icon name="edit" />} />` cross-fades to a second icon instead of turning the plus.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| SpeedDial | `direction` | `up` · `down` · `left` · `right` | `up` |
| SpeedDial | `hidden` | boolean: zooms the dial out and closes it | `false` |
| SpeedDial | `openOnHover` | also open on hover with a fine pointer | `true` |
| SpeedDial | `FabProps` | trigger props, e.g. `size` | — |
| SpeedDialAction | `tooltipOpen` | label pill always shown while open | `false` |
| SpeedDialAction | `tooltipPlacement` | `left` · `right` · `top` · `bottom` | `left` (up, down) · `top` (left, right) |
| SpeedDialAction | `onClick` | runs, then the dial closes, unless you call `event.preventDefault()` | — |

## Keyboard

- Enter or Space on the trigger opens and closes it (`aria-expanded`, `aria-controls`).
- The arrow key that points along the dial (Up for an `up` dial) opens it and walks out through the actions. The opposite arrow walks back to the trigger.
- Escape closes it and returns focus to the trigger. Choosing an action also returns focus to the trigger.
- Tab leaves the dial. Actions take focus only through the arrows (they're `menuitem`s with `tabindex="-1"`), and leaving closes the dial.

## Motion

- The plus turns 45° over `duration-surface`, the actions stagger in 40ms apart and out 25ms apart.
- With a fine pointer, hovering opens it and leaving closes it after 160ms. A click right after a hover-open keeps it open.
- Under reduced motion there's no stagger and no turn: the close appears and the actions only fade.

## Do and don't

- Do keep it to five actions with clear icons, and give every action a label.
- Do hide it (`hidden`) while it would cover what the reader is doing, such as scrolling down through text.
- Don't put a destructive action in a speed dial.
- Don't use `tooltipOpen` on a `left` or `right` dial with long labels. The pills above the actions would collide.
