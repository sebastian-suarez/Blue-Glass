# Rating

Stars for a score: visually hidden native radios under `star` glyphs, filled in `color-blue`, empty as a `dg-edge` outline, with half stars and a read-only image.

**Source:** an addition, matching MUI's Rating, including its hidden radio inputs. The star is the Blue Glass `star` glyph; filled stars use `color-blue`, the site's mark colour (3.7:1 on the canvas), and empty stars `dg-edge` (3:1).

## When to use

- Collect a quick score: how useful a write-up was.
- Show a score with `readOnly` and the value beside it as `label`.
- Keep `max` at 5 unless the scale has a reason to differ.

## What you provide

- `value` with `onChange(event, value)`, or `defaultValue`. `null` is no rating.
- A name for the stars: `aria-label` or `aria-labelledby` (default "Rating").
- Optional `label` beside the stars; update it from `onChangeActive` to describe the value the mouse previews ("Very useful").
- `getLabelText(value)` for each step's accessible text (default "4 out of 5 stars") and `emptyLabelText` ("No rating").

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` / `defaultValue` | number · `null` | uncontrolled, `null` |
| `max` | number of stars | `5` |
| `precision` | `1` · `0.5` | `1` |
| `size` | `sm` (18px) · `md` (24px) · `lg` (32px) | `md` |
| `readOnly` | boolean: no inputs; one `role="img"` named by the value | `false` |
| `disabled` | boolean | `false` |
| `label` | node beside the stars | none |
| `onChangeActive` | `(event, value)`: the hovered value, `-1` on leave | none |

## Keyboard

- Tab reaches the current rating, or "No rating" when there is none.
- Arrow keys move the rating one step and wrap through "No rating": the browser's own radio behaviour.
- With a mouse, hover previews, a press commits, and pressing the current star clears it.

## Do and don't

- Do show a number or a word beside a read-only rating; stars alone are hard to read exactly.
- Do keep stars in `color-blue`: it is a mark colour, never text.
- Prefer whole stars for input; half stars suit read-only averages.
- Don't use a rating as a single like; that's a `ToggleButton`.
