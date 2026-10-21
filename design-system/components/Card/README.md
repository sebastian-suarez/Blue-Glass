# Card

The site's project card: a glass panel that stacks a title block, an optional figure, and a footer of chips and links, 26px apart.

**Source:** `.card.glass-panel` (padding `space-2xl`, a 26px gap, `shadow-panel` lifting to `shadow-panel-hover` over `duration-surface` under a fine pointer; `26px 22px` and `radius-panel-sm` under 700px), `.card-head` (the 30px title at weight 400 and -0.04em, 26px under 700px; the 15px description in `color-muted`), `.card-foot`, `.chips` / `.chip` and `.card-links` / `.replink` in `global.css`. `CardMedia` is the inset well of `.project-figure`. The `outlined` and `inset` variants, `CardContent` and `CardActionArea` are additions.

## When to use

- `glass` for cards on the light field: projects, case studies, anything people scan in a stack (the site stacks them 28px apart).
- `inset` for a card inside another glass panel; never glass on glass.
- `outlined` for grouping in dense layouts where depth would be noise.
- `CardActionArea` when the whole card leads to one place. Keep secondary links in `CardActions`; they stay separate targets.

## What you provide

- `CardHeader`: `title` and `subheader` (one or two sentences), optional `avatar` and `action`, `headingLevel` (3 by default).
- `CardMedia`: a diagram or SVG as children, or `image` plus `alt`. The well pads 22px (16px under 700px); `disablePadding` lets an image bleed.
- `CardContent`: body copy, 15px in `color-muted`.
- `CardActions`: `chips` (strings become the site's chips; pass `chipsLabel`, e.g. "Stack") and the links as children: `Button variant="text"` with an `arrow-ne` end icon and an `aria-label` that names the card ("VSebCode: repository on GitHub").
- `CardActionArea`: wrap the title text in it (`title={<CardActionArea href="…">VSebCode</CardActionArea>}`) so the heading keeps its role; its hit area and focus ring stretch over the card.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| Card | `variant` | `glass` · `outlined` · `inset` | `glass` |
| Card | `component` | element (the site uses `article`) | `div` |
| CardHeader | `title`, `subheader`, `avatar`, `action` | node | — |
| CardHeader | `headingLevel` | `2`–`6` | `3` |
| CardMedia | `image`, `alt`, `height`, `disablePadding` | string · string · length · boolean | — |
| CardActions | `chips` · `chipsLabel` | node[] · string | — · `Tags` |
| CardActionArea | `href` (else a button with `onClick`) · `disabled` | string · boolean | — |

## Keyboard

- `CardActionArea` is one Tab stop; its focus ring draws around the whole card (3px `focus`, 5px out). Links in `CardActions` follow it.

## Do and don't

- Do keep one title, one or two sentences, one figure and one row of chips. That is the site's card.
- Do name repeated links with `aria-label` so "Repository" is unique per card.
- Don't put a coloured stripe on the card's side or an icon grid inside it.
- Don't wrap the whole card in `CardActionArea` when it also holds links: wrap the title and let the hit area stretch.
