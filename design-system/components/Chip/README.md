# Chip

A compact tag: the site's stack chip, the employer plate, a filter you toggle or a value you remove.

**Source:** the default is the site's `.chip` exactly: 12px, padding `5px 11px`, `radius-pill`, `glass-control` fill, a `1px rgba(88, 108, 143, 0.16)` border and `ink-soft` text. `size="sm"` is `.chip-sm` (11.5px, `4px 9px`). `variant="plate"` is `.plate` exactly: 13px, `7px 15px`, `glass-inset`, a `glass-edge` border, `shadow-plate`, `#33405a` text, and its hover to `rgba(255,255,255,0.8)`. The clickable, selected (the ink fill of `.btn-primary`), deletable and toned states are additions, matching MUI. The accent tone is the accent pane's wash (`.pane-accent`).

## When to use

- `chip` for stack lists and tags on cards. On the site: "Rust", "hidapi", "Wine".
- `plate` for the employer strip and for jump links at the top of a page ("From an edit to production").
- Clickable and `selected` for filters you toggle. Deletable for values someone added and can take away.
- A tone for a status ("Merged", "In review", "Checks failed"), always with the word and usually an icon.

## What you provide

- `label`: one or two words.
- `component="li"` when chips form a list (wrap them in a `ul` with a gap of `space-2xs`).
- `onClick` (a button) or `href` (a link) to make it interactive. `selected` sets `aria-pressed`, or `aria-current` on a link.
- `onDelete` adds a close button named "Remove {label}" (or `deleteLabel`). Backspace and Delete on the chip call it too. Move focus to the next chip when one goes.
- `icon` or `avatar` before the label. Leave the avatar's `alt` off when the label already names the person.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `chip` (.chip) · `plate` (.plate) | `chip` |
| `size` | `md` · `sm` (.chip-sm) | `md` |
| `tone` | `default` · `accent` · `danger` · `warning` · `success` · `info` | `default` |
| `selected` | ink fill, `on-ink` text; `aria-pressed` | — |
| `onClick` / `href` | renders a `button` / `a`, with hover and the 0.98 press | — |
| `onDelete` | adds the close button (18px, 30px hit area) | — |
| `disabled` | 50% opacity, no hover or press | `false` |
| `component` | element for a static chip | `span` |

## Keyboard

- Tab reaches a clickable chip and its close button separately. Enter or Space activates either.
- Backspace or Delete on a deletable chip removes it. Escape lets go of focus.

## Do and don't

- Do keep a row of chips on one line on desktop. If it wraps more than twice, it's a list, not a tag set.
- Do give filter chips a group label ("Filter my projects by stack").
- Don't nest a button in a chip by hand: a clickable, deletable chip already renders two sibling buttons.
- Don't use colour alone to mean a status. "Checks failed" with the error icon, not a red chip saying "CI".
