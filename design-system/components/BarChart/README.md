# BarChart

Bars and columns for comparing magnitude: baseline-anchored marks with 4px rounded data ends, a recessive axis, a per-bar ink tooltip, and a data table for screen readers.

**Source:** An addition, matching MUI X's BarChart (`series`, `layout`, `barLabel`, `valueFormatter`). It follows the site's chart language: the axis is `.dg-axis-line` (`rgba(88,108,143,0.35)`), gridlines are `color-line` hairlines, ticks and values are `text-diagram-label` (13px) in `color-muted` / `color-ink`, and the tooltip is the ink of `.btn-primary` (`color-ink` with `on-ink` text). Series take the validated chart palette in fixed order: `chart-1` (the site's `color-blue`), `chart-2`, `chart-3`, `chart-4`.

## When to use

- Use columns (`layout="vertical"`) for a short ordered axis such as years. Use bars (`layout="horizontal"`) for names, especially long ones.
- Use one series for one measure across categories. It wears `chart-1` on every bar: colour carries identity, not value.
- Use two to four series when the series are the subject (React against Node.js). Past four, use small multiples or a table. Never a fifth colour.
- Index unlike measures to a common base (before = 100) so one axis fits them. Never add a second axis.
- For one number improving, use `TimingChart`. For one number alone, use a stat, not a one-bar chart.

## What you provide

- `categories`: the names, in the order you want them read.
- `series`: `[{ label, data }]` with one value per category (`null` for none). Colour follows position: keep a series in the same slot across charts and filters.
- `title`: the accessible name and the table caption. Also put a visible heading beside the chart.
- `description`: the takeaway in a sentence. If you leave it out, a range summary is generated.
- A container: a glass `Paper` with 28px padding. The chart takes the container's full width.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `layout` | `vertical` (columns) · `horizontal` (bars) | `vertical` |
| `barLabel` | `none` · `value` (every bar; on horizontal bars the value axis then steps aside) · `max` (each series' largest) | `none` |
| `height` | px | 260 for columns; bars size to 34px rows |
| `valueFormatter` | `(v) => string` for labels, tooltip and table | thousands separators |
| `tickFormatter` | `(v) => string` for the axis | compact from 1,000 (1K) |
| `table` | `hidden` (read by screen readers) · `visible` (under the chart) · `none` | `hidden` |
| `categoryLabel` | header of the table's first column | `Category` |

Bars are 24px thick at most and never fill their slot. Grouped bars sit 2px apart, and every bar grows from one baseline. A legend appears for two or more series. The chart scales to its container's width, and text stays at 13px.

## Keyboard

- Tab: focuses the chart (the SVG is `role="img"` with a title and description). The first bar's tooltip opens.
- Arrow keys: move bar by bar, category first, then series. Home and End jump to the ends.
- Escape: closes the tooltip. Leaving the chart closes it too.

## Do and don't

- Do label selectively. `value` suits up to about ten bars. With grouped columns, prefer `max` and let the tooltip and table carry the rest.
- Do keep the baseline at zero. The domain always includes it, so lengths stay honest.
- Don't colour bars by value, or one series in several colours.
- Don't give text a series colour. Values and labels stay in `color-ink` and `color-muted`.
