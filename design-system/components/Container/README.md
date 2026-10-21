# Container

The page column: centred, `min(1180px, 90%)` wide, and 88% wide under 700px, so content never touches the screen edge.

**Source:** `.wrap` in `global.css` (`width: min(1180px, 90%)`, `margin-inline: auto`, `width: 88%` under 700px), on the `size-wrap` token. The `header` cap is `.identity-strip`'s `size-header` (1380px) and `prose` the site's longest reading measure (62ch, `.card-head p`). `maxWidth={false}` and `disableGutters` are additions matching MUI.

## When to use

- Once per page section, around everything that should line up with the site's column: headings, grids, cards.
- `prose` around long copy, so lines stay readable.
- `header` for full-width bars that align with the header rather than the content.

## What you provide

- Children, and `component` for the element (`section`, `main`).
- Nothing for the gutters: they come from the width (90% or 88%), not padding, so full-bleed children can still break out with negative margins.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `maxWidth` | `wrap` (1180px) · `header` (1380px) · `prose` (62ch) · `false` | `wrap` |
| `disableGutters` | boolean: 100% wide up to the cap | `false` |
| `component` | element | `div` |

## Do and don't

- Do nest a `prose` container inside a `wrap` one for copy that sits under a wide heading row.
- Don't add side padding inside a Container: the 5% gutters are already there.
- Don't put a Container inside a card; cards size themselves to their column.
