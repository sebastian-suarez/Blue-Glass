# ImageList

A grid of figures: standard cells, quilted spans, woven heights or masonry columns, each tile an inset plate with an optional glass caption.

**Source:** an addition, matching MUI's ImageList (`variant`, `cols`, `gap`, `rowHeight`; items with `cols` and `rows`; `ImageListItemBar` with `position` and `actionIcon`). The tile is the site's inset well (`.project-figure`: `glass-inset`, `glass-edge`, `shadow-inset`) on `radius-control`; the caption strip is `glass-raised` over `blur-control` with a `glass-edge` rule. The brand's imagery is its diagrams, so tiles show the whole image by default (`fit="contain"`, 12px in).

## When to use

- A gallery of diagrams or screenshots that people browse: the site's architecture figures, a project's states.
- `quilted` to feature one or two figures among smaller ones; `masonry` when images keep their own proportions; `woven` for a looser rhythm.
- Not for a list of documents or links: use `List` or cards.

## What you provide

- `ImageListItem` children: an `<img>` with real `alt` text (it gets the fill styles), or any element such as an inline SVG, then an optional `ImageListItemBar`.
- `ImageListItemBar`: `title`, `subtitle`, an `actionIcon` (a link with an `arrow-ne` icon and its own `aria-label`), `position`.
- No photos: draw diagrams in the site's language (nodes on `radius-node`, `dg-edge` arrows, `color-blue` accents, rings in `color-ring`).

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| ImageList | `variant` | `standard` · `quilted` · `woven` · `masonry` | `standard` |
| ImageList | `cols` · `gap` | number · token name | `2` · `xs` |
| ImageList | `rowHeight` | px · `auto` | `auto` |
| ImageList | `fit` | `contain` · `cover` | `contain` |
| ImageListItem | `cols` · `rows` | number | `1` · `1` |
| ImageListItemBar | `position` | `bottom` · `top` (glass, over the image) · `below` | `bottom` |
| ImageListItemBar | `actionIcon` · `actionPosition` | node · `left` · `right` | — · `right` |

## Do and don't

- Do write alt text that says what the diagram shows, not "diagram".
- Do keep captions to a title and one short subtitle; they truncate with an ellipsis.
- Don't use `cover` for diagrams: it crops nodes.
- Don't lay a glass caption over a glass panel's content; the strip belongs over an image.
