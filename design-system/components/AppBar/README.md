# AppBar

The bar across the top of a page: static, it is the site's header over the light field; sticky or fixed, it rides on glass above the content.

**Source:** the site's header, `.identity-strip` (the `Toolbar`: `size-header` cap, `38px 5%` padding, 25px gaps, the 1000px, 700px and 360px rules), `.personal-name`, `.signature`, the nav pill (`glass-faint` with a 16px blur, 23px links, `#fff7` under a pointer) and `.resume-action` in `global.css`, copied exactly. The `sticky` and `fixed` positions, `elevateOnScroll`, the `dense` toolbar and the current-link state are additions in the same language: `glass` with `blur-control`, a `glass-edge` lower border, `shadow-control` (or `shadow-pane` once lifted), `z-app-bar`.

## When to use

- `static` for the page header, as on the site: it scrolls away with the page.
- `sticky` when people need the links while reading a long page. Add `elevateOnScroll` so the bar is flat at the top and lifts once content passes under it.
- `fixed` only for app-like screens; leave room under it.

## What you provide

- A `Toolbar` with your content. For the site's identity strip, compose these parts (classes on your own elements):
  - `gl-app-bar-brand` on the home link, holding `gl-app-bar-monogram` (the "ss" tile, `aria-hidden`) and `gl-app-bar-text` with `gl-app-bar-title` and `gl-app-bar-subtitle`.
  - `gl-app-bar-nav` on a `<nav aria-label="Main navigation">`, with `gl-app-bar-link` on each `<a>`. Mark the current page with `aria-current="page"`. These are links, not tabs.
  - `gl-app-bar-action` on the closing link ("Read résumé" with an `arrow-ne` icon).
- Under 700px the nav drops to its own full-width row and the action moves to the right of the brand; under 360px the monogram hides.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| AppBar | `position` | `static` · `sticky` · `fixed` | `static` |
| AppBar | `elevateOnScroll` | boolean (sticky and fixed) | `false` |
| AppBar | `component` | element | `header` |
| Toolbar | `variant` | `regular` (38px 5%) · `dense` (12px 5%) | `regular` |
| Toolbar | `disableGutters` | boolean: no 5% sides | `false` |

`elevateOnScroll` watches a 1px sentinel just above the bar, so it works inside any scroll container. Keep the bar a block-level child (not a grid cell) so the sentinel sits right above it.

## Keyboard

- Tab moves brand, links, then the action, in reading order. The links keep a 2px focus offset inside the pill.

## Do and don't

- Do keep four or five links; past that, move the rest into a menu.
- Do use `dense` for sticky bars; the 38px identity-strip padding is for the top of the page.
- Don't put the bar on glass when it is static: the site's header is transparent over the light field.
- Don't style the links as tabs or add icons to them.
