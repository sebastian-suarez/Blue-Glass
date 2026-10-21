# LineChart

Lines for change over time: 2px strokes on one y axis, an optional 10% area wash, a crosshair that snaps to the nearest point with one tooltip for every series, and direct end labels.

**Source:** An addition, matching MUI X's LineChart (`series`, `area`, `valueFormatter`; MUI's `xAxis.data` is `x` here). It follows the site's chart language: `.dg-axis-line` for the baseline and crosshair, `color-line` gridlines, 13px ticks in `color-muted`, the ink tooltip, and the validated palette `chart-1` … `chart-4` in fixed order. Markers and end dots are 8px with a 2px white ring, as the site's diagram pulse is ringed.

## When to use

- Use it for a trend across an ordered x: years, months, releases.
- Use one series with `area` when the total is the story ("months in a listed role"). Use two to four series when the comparison is the story.
- Keep one y axis. For two measures of different scale, draw two charts, or index both to 100 at the start.
- For a trend beside a number in a table or a stat, use `Sparkline`.

## What you provide

- `x`: the positions. Strings are evenly spaced categories, numbers make a linear axis, and `Date`s make a time axis with calendar ticks (years, months or days, chosen from the span).
- `series`: `[{ label, data }]` with one value per `x` (`null` breaks the line). Colour follows position: keep a series in the same slot everywhere.
- `title` (the accessible name and table caption) and `description` (the takeaway). Put a visible heading beside the chart.
- A container: a glass `Paper` with 28px padding. The chart takes its full width; `height` includes the axis band.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `area` | boolean: a 10% wash under every series (or `area` per series) | `false` |
| `endLabels` | boolean: the last value at each line's end, after the name when there are two or more series, spread 16px apart, with leader lines when they had to move; on a narrow chart where they'd take over 38% of the width, the legend and tooltip carry them | `true` |
| `height` | px, axis included | `260` |
| `yDomain` | `[min, max]` | 0 (or the data's minimum) to a round maximum |
| `valueFormatter` | `(v) => string` for tooltip, end labels and table | thousands separators |
| `tickFormatter` | `(v) => string` for the y axis | compact from 1,000 (1K) |
| `xFormatter` | `(x, 'tick' \| 'tooltip') => string` | dates by their spacing |
| `table` | `hidden` (read by screen readers) · `visible` · `none` | `hidden` |

## Keyboard

- Tab: focuses the chart (`role="img"` with a title and description). The crosshair opens on the last point.
- Left and Right arrows: move the crosshair point by point. Home and End jump to the ends.
- Escape: closes the tooltip.

## Do and don't

- Do let the legend and the end labels carry identity together. Never rely on colour alone.
- Do stop at four series. Past that, draw small multiples or a table.
- Don't put a marker on every point. Markers appear under the crosshair, and the end dot marks the last value.
- Don't use dashed lines for ordinary series. Dashes read as a projection or a threshold.
