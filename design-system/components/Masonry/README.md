# Masonry

Items of uneven height in balanced columns: each one goes to the currently shortest column, while the DOM keeps reading order.

**Source:** an addition, matching MUI Lab's Masonry (`columns`, `spacing`). Gaps are spacing tokens and responsive columns follow the site's breakpoints (`sm` 361px, `md` 701px, `lg` 900px, `xl` 1001px). Items bring their own surface: `Paper` or `Card`.

## When to use

- Notes, quotes and cards whose lengths vary a lot, where a grid would leave holes.
- Not for ordered content people compare row by row: use `Grid`. Not for images alone: `ImageList variant="masonry"` is lighter.

## What you provide

- Children: one element per item, in the order they should be read. Each is wrapped and measured for you.
- `columns`: a number or `{ xs, sm, md, lg, xl }` (1–12). The default steps from one column on the smallest phones to three from 701px.
- `spacing`: a token name; it is both the column gap and the space between items.
- Nothing else. On first paint (and without script) CSS columns lay the items out at their final width; then a ResizeObserver measures every item, each goes to the shortest column, and the columns become flex lines ordered with `order`. Resizes, font loads and images re-run it. Reading order and Tab order stay the DOM order.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `columns` | 1–12, or per breakpoint | `{ xs: 1, sm: 2, md: 3 }` |
| `spacing` | token name · `0` | `md` |
| `component` | element | `div` |

## Do and don't

- Do keep items self-contained: a title and a few lines each.
- Do give images fixed dimensions so the first measure is right.
- Don't rely on visual position for meaning: the order people hear is the DOM order.
