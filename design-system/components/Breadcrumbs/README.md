# Breadcrumbs

The path from the home page to the current one: links separated by chevrons, ending on the current page, with long paths folded into a "…" button.

**Source:** An addition, matching MUI's Breadcrumbs. The crumbs are the site's prose link (`.hiw-asof a`: `color-link`, underlined 3px below, here only under a pointer), the current page is `color-ink`, the separator is the `chevron-right` glyph in `color-muted`, and the "…" button is the site's chip (`.chip`: `glass-control`, the `rgba(88, 108, 143, 0.16)` hairline, `ink-soft`, `radius-pill`).

## When to use

- On pages two or more levels deep: a case study under Work, a section of How it works.
- Not on the home page, and never as the page's only navigation.
- Not for the steps of a process; use Stepper.

## What you provide

- `children`, in order: a `Link` per ancestor page, then the current page last as plain text (or a `Link` to itself). Breadcrumbs wraps each crumb in an `<li>`, gives it the crumb style and puts `aria-current="page"` on the last one.
- Router links as `Link` with `component`, so they pick up the crumb style.
- `aria-label` when "Breadcrumb" doesn't fit, for example in another language.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `separator` | node | `chevron-right` Icon, 14px (12px at `sm`) |
| `maxItems` | number: fold the middle past this many crumbs | `8` |
| `itemsBeforeCollapse` | number | `1` |
| `itemsAfterCollapse` | number | `1` |
| `expandText` | string: the "…" button's accessible name | "Show path" |
| `lastIsCurrent` | boolean | `true` |
| `size` | `sm` (12px) · `md` (13px) | `md` |

## Keyboard

- Tab moves through the crumb links and the "…" button; Enter follows a link.
- Enter or Space on "…" shows the whole path and moves focus to the first crumb it revealed.
- Every crumb link keeps a 32px tap target (28px at `sm`) without changing how the row looks.

## Do and don't

- Do end the trail on the page's own title, so the trail and the heading agree.
- Do keep crumbs short: section names, not full headlines.
- Don't give the separator text or a link of its own; it's decoration and hidden from screen readers.
- Don't colour the current page as a link. It's where you are, not where you can go.
