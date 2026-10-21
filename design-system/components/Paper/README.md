# Paper

The surface every Blue Glass panel is cut from: translucent white over the light field, blurred, with a 1px top highlight and a soft drop.

**Source:** `.glass-panel` (the `glass` variant: `glass` fill, `blur-panel` with `saturate(115%)`, a `rgba(255,255,255,0.95)` border, `radius-panel`, `shadow-panel`, the diagonal sheen) and the inset wells `.project-figure` / `.notfound-figure` (the `inset` variant). The `solid` and `outlined` variants are additions.

## When to use

- `glass` for any panel that sits on the light field or the canvas: hero figures, cards, the contact slab, dialogs.
- `inset` for a well inside a glass panel, such as a diagram figure. Never nest glass in glass: frosted on frosted reads as mud.
- `solid` for a surface that has to sit on glass (a menu over a card). Blue Glass falls back to it on its own when the browser has no `backdrop-filter` or the reader prefers reduced transparency.
- `outlined` for grouping without depth.

## What you provide

- `children`, plus your own padding: the site uses `space-xl` (28px) on figures and `space-2xl` (40px) on cards.
- `component`: the element, for example `"section"`, `"figure"` or `"article"`.
- Something behind it to frost. Glass over flat canvas reads as plain white, so put a `LightField` behind the page or the section.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `glass` · `inset` · `solid` · `outlined` | `glass` |
| `elevation` | `0` · `1` (shadow-pane) · `2` (shadow-panel) | 2 for glass, 1 for solid, 0 for the others |
| `radius` | `panel` · `pane` · `well` · `control` · `none` | `panel`; `well` for inset; `pane` for outlined |

Under 700px, `radius-panel` drops to `radius-panel-sm` (23px), as the site does.
