# Dialog

A modal task on a glass panel: a confirmation or a short form that must be finished or dismissed before anything else.

**Source:** an addition, matching MUI's Dialog; the site has no modal. The surface is a `.glass-panel` (`Paper` glass: `glass` fill, `blur-panel`, `radius-panel`, `shadow-panel`), the title is `.pane-title` (`text-title-sm`), and the description is `.card-head p` (`text-body-sm` in `color-muted`). Under 700px it takes the card's phone padding (26px 22px) and `radius-panel-sm`. It sits on `Modal` and `Backdrop` (the `scrim`), and grows from its centre with `Grow`.

## When to use

- Use it for a decision that blocks the page: a destructive confirmation, or a form of two or three fields. Try inline first.
- Use `role="alertdialog"` when it interrupts to ask about something urgent, such as deleting work.
- Use `scroll="paper"` (the default) for long content between a fixed title and actions, and `scroll="body"` when the whole dialog is long and should scroll as one.
- Use `fullScreen="phone"` for forms that need the whole screen on a phone.

## What you provide

- `open` and `onClose(event, reason)`. The reason is `backdropClick` or `escapeKeyDown`. You decide whether to close.
- `DialogTitle` first. It's an `h2` and names the dialog through `aria-labelledby`.
- `DialogContent` with a `DialogContentText` (wired to `aria-describedby`), fields or lists.
- `DialogActions` last: right-aligned, `space-sm` apart, with the primary action last and the safe action before it.
- Optional: `data-autofocus` on the element that should take focus. Otherwise the surface itself takes it, so its name is read. In a destructive confirm, put it on the safe action.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `maxWidth` | `xs` (444px) · `sm` (600px) · `md` (900px) · `false` | `sm` |
| `fullWidth` | boolean: take the whole `maxWidth` | `false` |
| `fullScreen` | `true` · `"phone"` (700px and below) · `false` | `false` |
| `scroll` | `paper` (content scrolls, edges fade) · `body` (the dialog scrolls in its layer) | `paper` |
| `role` | `dialog` · `alertdialog` | `dialog` |
| `transitionDuration` | ms or `{ enter, exit }` | 200 in, 140 out |
| `PaperProps` | props for the surface | — |
| `hideBackdrop`, `keepMounted`, `disablePortal`, `disableEscapeKeyDown`, `disableAutoFocus`, `disableEnforceFocus`, `disableRestoreFocus`, `disableScrollLock` | passed to `Modal` | — |
| `DialogContent` `dividers` | boolean: `color-line` hairlines above and below | `false` |

`className` and `style` go to the modal layer; every other attribute goes to the surface (the element with the role).

## Keyboard

- Focus moves into the dialog when it opens and stays there: Tab and Shift+Tab cycle through its controls.
- Escape closes it (`escapeKeyDown`). When it closes, focus returns to the element that opened it.
- When the content scrolls and holds nothing focusable, the content itself takes focus so the arrow keys scroll it.

## Do and don't

- Do write the title as the question or the task ("Delete the RS50 bridge draft?"), and the buttons as verbs that answer it ("Keep draft", "Delete draft"), never "OK" and "Cancel".
- Do use `tone="danger"` on the primary button of a destructive confirm, and keep it last.
- Don't open a dialog from a dialog unless the second one is a confirmation of the first.
- Don't put a translucent glass surface inside the dialog. Fields and wells use `glass-control`, `glass-inset` or `glass-solid`.
