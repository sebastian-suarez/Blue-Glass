# Typography

Text set in one of the Blue Glass type tokens, on the element that token means: `display` is the page's `h1`, `heading` an `h2`, `body` a `p`, `micro` a `span`, `code` a `code`.

**Source:** the type tokens in `tokens.json`, measured from `global.css` (`.hero h1`, `.section-heading h2`, `.card-head h3`, `.hero-lede`, `.chip`, `.hiw-section code` and the rest). The variant applies the token's own class (`text-display`, `text-heading`…), so size, line height, weight and tracking are exactly the site's. Balanced headings and pretty paragraphs follow the site's base layer. The fluid sizes are the site's `clamp()` values. `color`, `align`, `noWrap` and `gutterBottom` are additions, matching MUI.

## When to use

- Use it for any text that should land on a token: headings, ledes, captions, dates, fine print.
- Pick the variant for its job, not its size: `heading` for a section title, `card-title` inside a card, `micro` for dates and figure captions, `nano` for a stack line.
- Pair `lede`, `body-sm`, `micro` and `kicker` with `color="muted"`, as the site does. Keep `color-ink` for headings and body.
- Use `fluid` on a hero or page title so it scales with the viewport, from `clamp(44px, 5.6vw, 80px)` for `display` down to `clamp(26px, 3vw, 42px)` for `statement`.

## What you provide

- `children`: the text.
- `variant`: the token without `text-`.
- `component`: when the element should differ from the variant's default, for example a `title-md` that is an `h3` under an `h2`. The look stays.
- Spacing around it. The root has no margin; `gutterBottom` adds half a line below.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `display` · `title-xl` · `title-lg` · `title-md` · `statement` · `heading` · `card-title` · `title-sm` · `subtitle` · `lede` · `lede-sm` · `body-lg` · `body` · `body-sm` · `small` · `caption` · `micro` · `nano` · `button` · `kicker` · `label` · `name` · `code` · `diagram-node` · `diagram-label` | `body` |
| `component` | any element or component | from the variant: `h1` (display, title-xl), `h2` (title-lg, title-md, heading), `h3` (card-title, title-sm), `h4` (subtitle), `p` (statement, lede to small), `code` (code), `span` (the rest) |
| `color` | `inherit` · `ink` · `muted` · `ink-soft` · `accent` · `link` · `blue-deep` · `danger` · `warning` · `success` · `info` | `inherit` |
| `align` | `inherit` · `left` · `center` · `right` · `justify` | `inherit` |
| `textWrap` | `balance` · `pretty` · `wrap` | `balance` on h1–h6, `pretty` on p |
| `noWrap` | one line with an ellipsis | `false` |
| `gutterBottom` | `margin-bottom: 0.5em` | `false` |
| `fluid` | the site's `clamp()` for the display group | `false` |

## Do and don't

- Do keep one `display` per page, as the hero does.
- Do write in sentence case. The kicker is the only tracked style and stays sentence case too.
- Don't use `color-blue` for text: it misses 4.5:1. Use `blue-deep` for accent text and `link` for links.
- Don't stack muted text on muted text. A caption under a muted lede is enough contrast change.
- Don't reach for a weight the tokens don't use. Headings are 400–500, labels 600.
