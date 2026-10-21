# Box

A plain element whose padding, margin and gap take spacing token names, so one-off layout stays on the scale.

**Source:** an addition, matching MUI's Box. The scale is the site's spacing, derived from `global.css`: `space-3xs` 4px through `space-section` 105px.

## When to use

- For the small layout glue around components: a padded wrapper, a centred column, a flex row with a gap.
- Reach for `Stack` for a column or row of siblings, `Grid` for columns, `Container` for the page width, and `Paper` or `Card` for a surface. Box has no look of its own.

## What you provide

- `component`: the element (`section`, `ul`, `figure`…). Default `div`.
- Spacing by token name: `"3xs"`, `"2xs"`, `"xs"`, `"sm"`, `"md"`, `"lg"`, `"xl"`, `"2xl"`, `"3xl"`, `"4xl"`, `"section-sm"`, `"section"`, or `0`. Margins also take `"auto"`.
- `display`, plus anything else through `style` and `className`. Your `style` wins over the shorthands.

## Props

| Prop | Values | Notes |
| --- | --- | --- |
| `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl` | token name · `0` | a side beats an axis beats `p` |
| `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml` | token name · `0` · `auto` | `mx="auto"` centres a sized box |
| `gap`, `rowGap`, `columnGap` | token name · `0` | with `display="flex"` or `"grid"` |
| `display` | `block` · `flex` · `grid` · `inline-flex` · … | — |
| `component` | element | `div` |

## Do and don't

- Do use token names, not pixel values, so spacing changes with the scale.
- Do use `component` for semantics (`ul`, `section`) instead of an extra wrapper.
- Don't build a surface from Box with inline glass: use `Paper` or `Card`, which carry the fallbacks.
