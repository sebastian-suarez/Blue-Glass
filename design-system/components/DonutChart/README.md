# DonutChart

Part-to-whole at a glance: up to five segments with 2px gaps, the total in the centre, a legend with every value, and hover or focus to read one part.

**Source:** An addition, matching MUI X's PieChart with an inner radius (`data` of `{ label, value }`, `highlighted` / `onHighlightChange`). It follows the site's language: segments take the validated palette `chart-1` … `chart-4`, and a fifth part (or the folded tail) takes the recessive `dg-edge`. The hovered legend row lifts the way the site's selected `.project-tab` does (`glass-raised`, a white edge, `shadow-raised`). The centre figure is ink at 26px and its caption is `color-muted`.

## When to use

- Use it when the shape of the whole is the point and there are five parts or fewer, such as months by role title.
- Use `BarChart` to compare close values. Angles are hard to compare, and bars are not.
- With two parts, use a sentence or a stat instead ("54 of 106 months remote").

## What you provide

- `data`: `[{ label, value }]` in the order the segments should run clockwise from 12 o'clock. Largest first reads best. Colour follows position, so keep the order stable.
- More than five parts are allowed: the first four keep their slots and the rest fold into one `Other` segment (`otherLabel`).
- `title` (the accessible name and table caption) and `centerLabel` (the words under the total, such as "months").
- Room for the legend. It sits beside the ring and wraps under it on narrow screens.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `size` | diameter in px | `200` |
| `thickness` | ring width in px | 13% of `size` |
| `centerLabel` | node under the centre figure | none |
| `total` | node to replace the centre figure | the formatted sum |
| `highlighted` / `defaultHighlighted` | index of the part to read, controlled or initial | `null` |
| `onHighlightChange` | `(index \| null) => void` | — |
| `valueFormatter` | `(v) => string` | thousands separators |
| `otherLabel` | name of the folded tail | `Other` |
| `table` | `hidden` · `visible` · `none` | `hidden` |

## Keyboard

- Tab: focuses the ring (`role="img"` with a title and a description listing every part). The first part is highlighted.
- Arrow keys: move to the next or previous part. Home and End jump to the first and last.
- Escape: clears the highlight.

## Do and don't

- Do keep the 2px gaps. They are cut into the geometry, so the glass shows through. Don't draw borders instead.
- Do show the values in the legend (it always does). Never ask readers to judge shares from angles alone.
- Don't use it past five parts. Fold the tail, or switch to bars.
- The ring closes on itself, so the last segment touches the first. With three to five segments that pair measures 9.1–9.6 ΔE under normal vision, below the 15 that neighbouring palette slots clear. No brand-family palette can close the ring above 15. The 2px gap and the legend carry identity there, so read the values from the legend, not the colours.
