# Modal

The layer under Dialog, Drawer, Popover and Menu. It portals into `document.body` with a `Backdrop`, moves focus in and keeps it there, closes on Escape, locks page scroll, and makes the rest of the page inert. When the child is a transition, it waits for the exit before unmounting.

**Source:** an addition, matching MUI's utility. The site has no modal.

## When to use

- Build a new overlay on it, or reach for `Dialog`, `Drawer` or `Popover` first. Use a modal only for a task that must finish or be dismissed before anything else: a confirmation, a short form. Try inline first.
- The top modal owns Escape and focus, so nested modals work.

## What you provide

- `open` and `onClose(event, reason)`. The reason is `backdropClick` or `escapeKeyDown`. You decide whether to close.
- One child, usually a transition (`Fade`, `Grow`, `Slide`) wrapping the surface. Give the surface `role="dialog"`, `aria-modal="true"` and a name (`aria-labelledby`).
- Optional: mark the element that should take focus with `data-autofocus`. Otherwise the surface itself is focused.

## Props

| Prop | What it does |
| --- | --- |
| `hideBackdrop` | No backdrop at all |
| `invisibleBackdrop` | A transparent backdrop that still catches outside presses (used by Popover) |
| `keepMounted` | Stay in the DOM while closed |
| `disableEscapeKeyDown`, `disableAutoFocus`, `disableEnforceFocus`, `disableRestoreFocus`, `disableScrollLock` | Opt out of each behaviour |
| `disablePortal`, `container` | Render in place, or into another element |

## Keyboard

- Tab and Shift+Tab cycle through the content. Escape closes the top modal. When it closes, focus returns to the element that opened it.
