# Alert

A short status message with its icon and word: success, info, warning or error, on a soft tint, an outline or a full status fill.

**Source:** an addition, matching MUI's Alert. The colours are Blue Glass's status set (`danger`, `warning`, `success`, `info` and their `-soft` grounds). The plate takes the site's well radius (`radius-well`, from `.project-figure` and `.project-selector`), and the outlined fill is the chip's `glass-control` (`.chip`). Every border is a full 1px line, never a side stripe.

## When to use

- Use it for a message about the state of something on the page: a failed upload, a finished deploy, a limit coming up. Put it next to the thing it's about.
- Use `standard` (the default) for most messages. Use `outlined` inside a glass panel when the tint is too loud, and `filled` for the one message that must not be missed.
- For a passing confirmation that needs no action, use `Snackbar`. For a decision that blocks everything else, use `Dialog`.
- Write it as a sentence: what happened, then what to do. "Couldn't reach the bucket. Try again."

## What you provide

- `children`: the message. Start it with an `AlertTitle` for a two-part message ("Upload failed" over the sentence).
- `severity`: sets the glyph, the status colour, the role and the word screen readers hear first ("Error:").
- `action`: one text `Button` at `size="sm"` ("Retry", "Renew now"). It takes the status colour.
- `onClose`: shows a 32px close button after the action. `closeText` names it (default "Close").

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `severity` | `success` · `info` · `warning` · `error` | `info` |
| `variant` | `standard` (`-soft` tint, status hairline) · `outlined` (`glass-control`, 1px status border) · `filled` (status fill, `on-ink`) | `standard` |
| `icon` | a node, or `false` to hide the glyph | the severity's glyph |
| `action` | a node, after the message | — |
| `onClose` | `(event) => void`; shows the close button | — |
| `closeText` | string | `Close` |
| `severityText` | the word read before the message | `Success` · `Info` · `Warning` · `Error` |
| `role` | any role | `alert` for warning and error, `status` otherwise; none inside a `Snackbar` |

## Keyboard

- The action and the close button are ordinary buttons in the tab order. Enter or Space presses them. Their focus ring turns `on-ink` on the `filled` variant.

## Do and don't

- Do let the glyph or the title name the state. Hide the icon only when the title says it ("Upload failed"): colour alone never carries a status.
- Do expect `role="alert"` to announce only when the alert appears after something the person did. An alert already on the page at load is read in order, not announced.
- Don't add a coloured side stripe. The border runs all the way round or not at all.
- Don't stack more than two alerts. Merge them, or move the rest into a list.
