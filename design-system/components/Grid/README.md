# Grid

A 12-column CSS grid on the site's breakpoints: a container sets the columns and a gap token, and each item spans columns per breakpoint.

**Source:** an addition, matching MUI's Grid (v2 API: `container`, `size`, `offset`, `columns`, `spacing`). The breakpoints are the site's, turned around: `global.css` steps down at 360px, 700px, 899px and 1000px, so Grid steps up at `sm` 361px, `md` 701px, `lg` 900px and `xl` 1001px. Gaps are spacing tokens.

## When to use

- For two-dimensional page layout: a 7/5 split, a row of three cards that stacks on phones.
- For a single row or column of siblings use `Stack`; for uneven-height tiles use `Masonry`.

## What you provide

- A `Grid container` with `spacing` (or `rowSpacing` and `columnSpacing`) as a token name.
- `Grid` items with `size`, a number or `{ xs, sm, md, lg, xl }`. A breakpoint without a value takes the one below it; an item with no size fills its row, so `size={{ md: 6 }}` is full width on phones and half from 701px.
- `offset` to leave columns empty before an item. It pushes from where the item would sit, as in MUI.
- `columns` for another count. A Grid can be a container and an item at once (nesting).

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `container` | boolean | `false` |
| `columns` | 1–12 per breakpoint, or any whole number | `12` |
| `spacing`, `rowSpacing`, `columnSpacing` | token name · `0` | `0` |
| `size` | 1–12 per breakpoint, or any whole number | the full row |
| `offset` | 0–11 per breakpoint | `0` |
| `component` | element | `div` |

The breakpoint classes are generated for 1–12; a single non-responsive number beyond that is set inline. `size="auto"` and `"grow"` are flexbox ideas and aren't supported on the CSS grid.

## Do and don't

- Do write mobile first: give `xs` the stacked layout and add columns at `md` or `lg`.
- Do use the same `spacing` token across a page; `lg` (24px) matches the site's pane gaps.
- Don't nest grids to fake gaps; use `rowSpacing` and `columnSpacing`.
- Don't go above `lg` for the column gap on a 12-column grid that reaches phones: eleven 40px gaps are wider than a 360px screen. Use fewer `columns` at `xs`, or a smaller gap.
