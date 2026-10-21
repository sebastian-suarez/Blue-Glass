# Button

The site's pill button: `primary` is the ink pill for the one thing a view is for, `glass` the frosted pill beside it, `text` a link-weight action.

**Source:** `.btn`, `.btn-primary`, `.btn-glass`, `.replink` and `.figure-link` in `global.css`. The `md` size, both pill fills, the press scale and the hover colours are the site's. The `sm` and `lg` sizes, `tone="danger"` and `loading` are additions.

## When to use

- Use `primary` at most once per view, for the thing the view is for. On the site that's "Email me".
- Use `glass` for every other action in a row. It's the default.
- Use `text` for "go" links at the end of a caption or card ("Repository ↗", "See every service ↗"). Put an `arrow-ne` end icon on anything outbound.
- Write labels verb first, in sentence case, two or three words: "See the work", "Read résumé".

## What you provide

- `children`: the label.
- `href`: renders an `<a>` with the same look. Use it for navigation, and keep `<button>` for actions.
- `startIcon` / `endIcon`: an `Icon` (16px inside the pill).
- `onClick`, `type`, `disabled`, plus any other button attribute.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `primary` · `glass` · `text` | `glass` |
| `tone` | `default` · `danger` | `default` |
| `size` | `sm` (36px) · `md` (46px) · `lg` (54px) | `md` |
| `loading` | boolean: spinner, `aria-busy`, clicks blocked | `false` |
| `fullWidth` | boolean | `false` |

## Do and don't

- Do keep the tap target. `md` is 46px tall and `text` keeps 32px, the site's `size-control` and `size-control-sm`.
- Do pair `tone="danger"` with a word that names the loss ("Delete project"), never just "OK".
- Don't put two `primary` buttons side by side. The second one is `glass`.
- Don't change the pill radius: every Blue Glass control is `radius-pill`.
