# Sparkline

A word-sized trend, 24–32px tall: the shape in the recessive grey, the latest value in the accent, sized to sit beside a number or in a table cell.

**Source:** An addition, matching MUI X's SparkLineChart (`data`, `plotType`, `area`, `showTooltip`). It follows the stat-tile spec on the site's tokens: marks in `dg-edge` (3.1:1 on `color-canvas`, 3.4:1 on glass), the last point in `chart-1` (`color-blue`) as an 8px dot with a 2px white ring, 2px lines, bars with 2px gaps and rounded tops, and the hover readout as the ink pill.

## When to use

- Use it next to a figure or in a table, to show where the number came from ("89 months in listed roles", plus its years).
- Use bars for counts per period and a line for a running value.
- When the trend is the point, use `LineChart`, which has axes, a tooltip and a table.

## What you provide

- `data`: the values, oldest first. Ten to twenty points read best.
- `label`: what the values are, such as "Months using React per year, 2017 to 2026". It starts the accessible name.
- The number itself, beside the sparkline. A sparkline has no axis, so the exact value lives in your text.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `plotType` | `line` · `bar` | `line` |
| `width` | px | `96` |
| `height` | px, clamped to 24–32 | `28` |
| `area` | boolean: 10% wash under the line | `false` |
| `color` | the accent for the last point | `var(--chart-1)` |
| `summary` | replaces the generated "first, last, low, high" | generated |
| `valueFormatter` | `(v) => string` | thousands separators |
| `showTooltip` | boolean: the value under the pointer in a small ink pill | `false` |

The element is `role="img"` named "label: summary", for example "Months using React per year, 2017 to 2026: 10 values: first 0, last 0, low 0, high 12."

## Do and don't

- Do keep the marks grey and let the last point carry the accent. A row of fully blue sparklines in a table reads as noise.
- Do give every sparkline its own label. In a table, name the row's subject in it.
- Don't rely on hover. `showTooltip` is off by default: the summary and the number beside the sparkline carry the values for everyone.
- Don't stretch it past 32px. A taller trend needs a `LineChart`.
