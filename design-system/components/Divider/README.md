# Divider

A 1px `color-line` hairline that separates content: rows in a list, columns in a panel, a footer from the page.

**Source:** the site's hairline, `1px solid var(--color-line)` (`rgba(88, 108, 143, 0.17)`), as in `.employer-strip`, `.career-row`, `.project-outcome` and `.site-footer`. The `inset` and `middle` variants, vertical dividers and the label are additions, matching MUI. The label uses the site's caption style: 12px `color-muted`.

## When to use

- Between groups that need a pause but not a new panel: a summary and its details, two columns, a list's sections.
- `inset` in a list with icons, so the line starts where the text does.
- `vertical` between inline links or toolbar groups. Add `flexItem` to run it the full height of a flex row.
- A label when the break has a name ("Earlier roles"). If the label is a heading for what follows, use a heading instead.

## What you provide

- Spacing around it. The divider has no margin of its own.
- `component="li"` inside a `List` (an `hr` can't be a child of `ul`).
- A flex row with `align-items: stretch` for a `flexItem` divider.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `orientation` | `horizontal` · `vertical` | `horizontal` |
| `variant` | `full` · `inset` (42px, or `--gl-divider-inset`) · `middle` (16px each end; 8px top and bottom when vertical) | `full` |
| `flexItem` | stretch a vertical divider to the row's height | `false` |
| `textAlign` | label `center` · `left` (the line follows it) | `center` |
| `component` | element | `hr`; `div` with a label |

## Semantics

- An `hr` is a separator on its own. Any other element gets `role="separator"`, and a vertical one `aria-orientation="vertical"`.
- A labelled divider is named by its label (`aria-labelledby`).
- A purely decorative rule inside a toolbar can take `aria-hidden`.

## Do and don't

- Do use a divider or a gap, not both: 24px of space often separates enough.
- Do keep it a hairline. `color-line` is decorative (below 3:1) by design, so never use it for a control's edge.
- Don't stack dividers to make a frame. Use `Paper` with `variant="outlined"`.
