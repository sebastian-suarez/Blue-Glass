# TimingChart

The site's before/after bars on a linear axis: muted for the old number, accent for the new one, each bar labelled at its tip, revealed like the diagrams.

**Source:** `src/components/diagram/TimingChart.tsx` and `.dg-axis-line`, `.dg-bar-track`, `.dg-bar` in `global.css`, renamed `.gl-dg-*`. The geometry is the site's: 820 units wide, bars 36 tall and 600 long from x 110, a 2-unit minimum bar, tracks in `rgba(142,184,232,0.14)`, bars in `dg-bar`, the accent row in `color-blue`. The bars grow from the left on reveal (900ms, 250ms apart), then their values fade in. Built on `DiagramHost`. Rows beyond two stack with the same spacing, which is an addition.

## When to use

- Use it when the story is one number getting better: the Limber Health PDFs went from about 6 s to 10–20 ms.
- Keep the axis linear and starting at zero, so a 300× gain looks like one. Never use a log scale here.
- For more than one measure, or more than a few rows, use `BarChart`.

## What you provide

- `data`: a `TimingData` with `rows` (`name`, `value`, `text` shown at the bar's tip, `tone` `muted` | `accent`), `axisMax` in the rows' unit, `ticks` (`value` + `text`, such as "2 s"), plus `label` and `description` for screen readers. Spell the numbers out in the description.
- A container. Put it in an inset well with a caption that says what was measured and that the scale is linear.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `data` | `TimingData` | required |
| `minScale` | number: floor before the host scrolls sideways (the site uses 0.6) | `0` |
| `reveal` | boolean: bars grow in when the chart scrolls into view | `true` |

## Keyboard

- Tab: reaches the host only while it overflows its `minScale` floor. Arrow keys then scroll it.

## Do and don't

- Do write the value text the way you'd say it: "about 6 s", "10–20 ms". The text carries the number, because `dg-bar` sits at 2.7:1 on glass.
- Do accent exactly one row: the result.
- Don't round a tiny bar away. A real 20 ms on a 6 s axis is drawn 2 units wide, and the label says the rest.
- Don't mix units on one axis.
