# Drawer

A glass panel from an edge of the screen: `temporary` sits over a scrim and holds focus until it closes, `persistent` slides in and pushes the content beside it, and `permanent` is a static panel.

**Source:** an addition, matching MUI's Drawer. The surface is the site's `.glass-panel` (through `Paper`: `glass`, `blur-panel` with `saturate(115%)`, the white 0.95 edge, `shadow-panel`, `radius-panel`, the diagonal sheen). By default it floats 12px in from the edges, like every panel on the site, which never touches the viewport. `inset={false}` sets it flush with only its inner corners rounded. The header title is `text-title-sm`. The scrim is the `scrim` token. The slide is the shared `Slide`: 280ms in, 220ms out, on `ease-out-quint`.

## When to use

- `temporary` for navigation or details on small screens, or anything secondary that can cover the page for a moment. It's the default.
- `persistent` for a panel people open and close while working, such as a table of contents or filters. The content beside it reflows, and nothing is covered.
- `permanent` for a side panel that is always there on wide screens. Swap it for `temporary` on phones (`useMediaQuery(media.phone)`).
- Use `bottom` as a sheet on phones: it gets a grab handle, and dragging it down closes it.

## What you provide

- `open` and `onClose(event, reason)`. Reasons: `backdropClick`, `escapeKeyDown`, `closeButton`, `swipe`. Passing `onClose` shows the close button.
- `title`: the header slot's heading. It names the drawer (`aria-labelledby`). Without a title, pass `aria-label`.
- `children`: the content. It sits in a scrolling body with `space-lg` side padding. Pull a list of `.gl-option` rows out by 12px so its labels line up with the title.
- `anchor`, `variant`, `inset`, `width`.
- For `persistent` and `permanent`, a flex row to sit in, the drawer first (or last for `right`). For navigation, add `role="navigation"`. A temporary drawer is `role="dialog"` with `aria-modal`.
- The opening button gets `aria-expanded`. A persistent drawer also needs `aria-controls` pointing at its `id`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `temporary` · `persistent` · `permanent` | `temporary` |
| `anchor` | `left` · `right` · `top` · `bottom` | `left` |
| `inset` | `true`: 12px from the edges (and the safe areas), `radius-panel` · `false`: flush, inner corners only | `true` |
| `width` | left and right: px number or CSS length. Top and bottom size to their content. | `320` |
| `title` | header heading | — |
| `closeLabel` | close button name | `Close` |
| `hideBackdrop`, `keepMounted`, `disablePortal`, `disableScrollLock`, `disableAutoFocus`, `disableEnforceFocus`, `disableRestoreFocus`, `disableEscapeKeyDown` | temporary: as `Modal` | `false` |
| `PaperProps` | props for the glass surface | — |

The temporary layer stacks at `z-drawer`, under modals, menus and snackbars.

## Keyboard

- Temporary: focus moves into the drawer when it opens, and Tab and Shift+Tab stay inside. Escape closes it, and focus returns to the button that opened it.
- The close button is a regular button. The grab handle is for pointers only: keyboard users close with Escape or the button.
- Persistent and permanent drawers are part of the page's tab order.

## Do and don't

- Do keep one drawer per edge, and don't stack a temporary drawer over a dialog.
- Do keep 40px of scrim visible beside a temporary drawer so it can be dismissed by a press. The drawer caps its width to leave room.
- Don't put the page's primary task in a drawer. Drawers hold secondary content and navigation.
- Don't animate a persistent drawer on every route change. Open it once and let it stay.
