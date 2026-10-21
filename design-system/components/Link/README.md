# Link

The site's two link styles: the underlined prose link in `color-link`, and the "go" link in `color-ink` that underlines only under a pointer.

**Source:** `.hiw-asof a` and `.resume-page a` (the `always` underline: `color-link`, underline, `text-underline-offset: 3px`), and `.replink`, `.figure-link` and `.contact-links a` (the `hover` underline: 13px, an 8px icon gap, a `size-control-sm` 32px tap target, underlined 5px below only under a fine pointer, the 14px `arrow-ne`). The `external` treatment, `color`, the thicker underline when hovering a prose link and `component` are additions, matching MUI's Link.

## When to use

- `always` for links inside sentences: as-of lines, captions, the résumé. In running text the underline is the only cue, so keep it.
- `hover` for "go" links that end a caption, card or slab: "See every service ↗", "Repository ↗", the contact links. Give them the `arrow-ne` icon with `endIcon`.
- `none` only when the link wraps something that already reads as a link, such as a whole card.
- `external` for anything that opens in a new tab. It sets `target="_blank"` and `rel="noopener noreferrer"`, adds `arrow-ne` and a hidden "(opens in a new tab)". Passing `target="_blank"` alone does the same.
- Use Button for actions. `component="button"` is only for a link-weight action in a row of go links ("Copy page link").

## What you provide

- `children`: link text that makes sense out of context ("Repository", never "here").
- `href`, or `component` for a router link: `<Link component={RouterLink} to="/work">Work</Link>`.
- `endIcon`: usually `<Icon name="arrow-ne" />` on a same-tab go link.
- `aria-label` when several links share a text; the site writes "VSebCode: repository on GitHub". On an external link the label replaces the new-tab note, so say it in the label.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `underline` | `always` · `hover` · `none` | `always` |
| `color` | `link` · `ink` · `muted` · `inherit` | `link` for `always`, `ink` otherwise |
| `external` | boolean | `true` when `target="_blank"` |
| `endIcon` | node | `arrow-ne` when external |
| `newTabLabel` | string | "(opens in a new tab)" |
| `component` | element type | `a` |

## Keyboard

- Tab focuses the link and Enter follows it. With `component="button"`, Space activates it too.
- The ring is the base 3px `focus` outline. Prose links pull its offset in to 2px so it doesn't cover the next line; go links keep the site's 5px.

## Do and don't

- Do keep the underline on prose links. `color-link` next to `color-muted` text is too close to tell apart by colour alone.
- Do keep go links at 13px with their 32px target. Don't pad them into buttons.
- Don't make the only link in a block `color="muted"`.
- Don't drop the arrow from a link that leaves the page or the site.
