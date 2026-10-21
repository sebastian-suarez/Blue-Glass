# Snackbar

A brief message at the edge of the screen about something that just happened, with at most one action, closing itself after a pause-aware timeout.

**Source:** an addition, matching MUI's Snackbar. The surface is the primary button's ground (`.btn-primary`: `color-ink` with `on-ink` text and `shadow-primary`), cut to the monogram tile's radius (`radius-tile`, `.signature`), with 12px 16px padding and a 560px maximum width. It slides in from its edge with `Slide` (280ms `ease-out-quint`) and leaves along the same path; under reduced motion it fades.

## When to use

- Use it to confirm something the person just did, or to report a background result: "Published to S3. CloudFront picks it up in about a minute."
- Offer one action at most ("Undo", "View site", "Retry"). Anything more belongs in an `Alert` or a `Dialog`.
- Show one at a time. To replace a message, change its content, or close one and open the next with a new `key`.
- Don't use it for errors that block work: an error that needs a decision belongs inline, next to the thing that failed.

## What you provide

- `open` and `onClose(event, reason)`. Reasons: `timeout`, `clickaway`, `escapeKeyDown`, `closeButton`. Most screens ignore `clickaway`.
- `message`: one short sentence. `action`: a text `Button` at `size="sm"`; it turns `on-ink` on the dark ground.
- `closable` for a close button, named by `closeText` (default "Close").
- Or `children`: your own surface, such as an `Alert`. It takes the same width limits and a lift, and drops its own role so the snackbar announces it once.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `anchorOrigin` | `{ vertical: top · bottom, horizontal: left · center · right }` | bottom, center |
| `autoHideDuration` | ms, or `null` to stay | `null` |
| `resumeHideDuration` | ms left after a pause ends | half of `autoHideDuration` |
| `closable` | boolean | `false` |
| `transitionDuration` | ms or `{ enter, exit }` | 280 in, 220 out |
| `disableWindowBlurListener` | boolean: keep timing while the window is in the background | `false` |
| `role` | `status` · `alert` | `status` (`aria-live="polite"`) |
| `disablePortal`, `container` | render in place, or into another element | — |

The timer pauses while the snackbar is pointed at, while focus is inside it, and while the window is in the background. It sits on `z-snackbar`, 24px from its edge (16px and full width at 700px and below). Its root stays mounted while closed, so the live region exists before the message arrives, and carries `data-gl-live`, so it stays usable while a `Modal` makes the page inert.

## Keyboard

- Escape closes an open snackbar (`escapeKeyDown`), unless focus is inside an open dialog: then that Escape closes the dialog, and the next one the snackbar.
- The action and the close button are in the tab order. Tabbing into the snackbar pauses its timer.

## Do and don't

- Do give anything with an action at least 6 seconds (`autoHideDuration={6000}`), and leave errors open until they're dealt with.
- Do keep the message to one line on desktop. If it needs two sentences, it's an `Alert`.
- Don't put the only way to do something in a snackbar: it disappears.
- Don't host an `outlined` Alert in a snackbar. Its fill is translucent and the page shows through; use `standard` or `filled`.
