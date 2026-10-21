# Progress

`LinearProgress` and `CircularProgress`: a `color-blue` bar on a 4px `color-line` pill, and a ring with round caps, either for a known amount or turning while the length is unknown.

**Source:** an addition, matching MUI's LinearProgress and CircularProgress. The track is the site's hairline colour (`color-line`) on a pill (`radius-pill`), and the mark is the diagram accent (`color-blue`: marks only, 4.0:1 on glass). Value changes ease with `ease-out-quint` over `duration-expand`; the indeterminate sweep uses `ease-in-out-quart`, the site's easing for movement on screen.

## When to use

- Use `variant="determinate"` whenever you know the amount: an upload, a file count, a calibration step. Show the number too (`showValue` or `valueText`).
- Use the indeterminate default only while the length is unknown, and swap to determinate as soon as it's known.
- Use `buffer` when some of the work is ready ahead of the playhead: streamed telemetry, a buffered video.
- Use `CircularProgress` where a bar has no room: beside a step label, inside a snackbar, on a busy button. Sizes: `xs` 20, `sm` 28, `md` 40, `lg` 56.
- Under one second, show nothing. Past ten, show a determinate bar and say what's happening.

## What you provide

- A name: `label` (visible, above the track, wired to `aria-labelledby`), or `aria-label`. Without either it's announced as "Loading".
- `value` (0–100) for determinate and buffer, plus `valueBuffer` for buffer.
- `valueText` for a readable value ("3 of 5 files"). It shows at the end of the label row and is read as `aria-valuetext`.
- `color="inherit"` on a dark ground (an ink snackbar or button): the ring and bar take `currentColor`, the track 25% of it.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `LinearProgress` `variant` | `determinate` · `buffer` · `indeterminate` | `indeterminate` |
| `CircularProgress` `variant` | `determinate` · `indeterminate` | `indeterminate` |
| `value` | 0–100 | `0` |
| `valueBuffer` (linear) | 0–100, drawn in `color-ring` at 40% | `0` |
| `label` (linear) | node | — |
| `valueText` (linear) | string | — |
| `showValue` | boolean: the rounded percentage (circular: in the middle, 40px and up) | `false` |
| `size` (circular) | `xs` · `sm` · `md` · `lg` · px number | `md` (40) |
| `thickness` (circular) | px | 2.5 · 3 · 4 · 4.5 by size |
| `color` | `default` · `inherit` | `default` |

Both render `role="progressbar"` with `aria-valuemin` 0 and `aria-valuemax` 100. `aria-valuenow` is set only when the value is known.

## Do and don't

- Do say what is loading in the label ("Uploading build to S3"), not "Loading…".
- Do keep reduced motion in mind: nothing sweeps or turns there. Value changes jump and an unknown length becomes a slow opacity pulse, so the label has to carry the meaning.
- Don't use `color-blue` for the label text. It's for marks only; the label is `color-ink` and the value `color-muted`.
- Don't run two indeterminate indicators for the same task.
