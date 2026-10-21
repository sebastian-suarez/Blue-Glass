# Skeleton

A `color-line` placeholder in the shape of the content that's loading, so the layout doesn't jump when it arrives.

**Source:** an addition, matching MUI's Skeleton. The fill is the site's hairline colour (`color-line`), text lines are pills (the `.chip` shape), rounded blocks take `radius-well` (`.project-figure`), and the `wave` sheen is a white-alpha gradient like the glass panel's own (`.glass-panel::before`).

## When to use

- Use it where the layout is known but the data isn't yet: a project card, a list row, an avatar.
- Mirror the real content: the same font size for text lines, the same box for figures and chips. A skeleton that doesn't match causes the jump it's meant to prevent.
- For a wait with no known layout, or one over a few seconds, use `Progress` instead.

## What you provide

- `variant` and a size. `text` takes its height from the current font size, so wrap it in the element whose type it stands in for. The others take `width` and `height` (px numbers or CSS lengths).
- Or `children`: the real element, kept invisible, to size the skeleton by.
- On the region it stands in for: `aria-busy="true"` while loading, and a visually hidden status line (`gl-sr-only`, "Loading project…"). Skeletons are always `aria-hidden`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `text` (a pill line at 60% of the line box) · `rectangular` · `rounded` (`radius-well`) · `circular` | `text` |
| `width` | px number or CSS length | the full line, or the children's width |
| `height` | px number or CSS length | the line height (text), `1.2em` otherwise |
| `animation` | `pulse` (opacity) · `wave` (a sheen moving across) · `false` | `pulse` |

## Do and don't

- Do keep it to one animation style per view, and keep it slow. Under reduced motion every skeleton is still.
- Do set `aria-busy="false"` (or remove it) on the region once the content is in.
- Don't put a skeleton inside a skeleton, or show one for less than about 300ms: a flash is worse than a short wait.
- Don't tint it. Placeholders stay `color-line`; status colours are for real states.
