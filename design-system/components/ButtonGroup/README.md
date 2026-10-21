# ButtonGroup

Related Buttons in one track: the site's pill nav, an ink pill split into segments, or link-weight actions split by short rules.

**Source:** `.identity-strip nav` in `global.css` for the `glass` track (`glass-faint` fill, `1px solid #ffffffc9`, `padding: 5px`, `gap: 3px`, `radius-pill`, `shadow-control`, `blur-control`) and its items (`.identity-strip nav a`: 13px, `padding: 7px 17px`, `border-radius: 23px`, hover `#fff7`), 46px tall in all. The `primary` split pill (the `.btn-primary` ink and `shadow-primary`, divided by 1px `on-ink` at 20%) and the `text` group (`.replink` actions split by `color-line-strong` rules) are additions, matching MUI's contained and text ButtonGroup.

## When to use

- Group two to four actions on the same object: zoom out, reset, zoom in; save draft, publish.
- Use `primary` for a split button: the main action plus a chevron for its options. It counts as the view's one ink element.
- Use `text` for "go" links at the foot of a card or figure.
- For a choice that stays pressed (a view, a filter), use `ToggleButtonGroup` instead.

## What you provide

- `Button` children. The group sets `variant`, `size` and `disabled` on each, so leave those off the children (a child's own `disabled` still disables it).
- A name: `aria-label` or `aria-labelledby`. The group renders `role="group"`.
- An `aria-label` on every icon-only Button.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `glass` · `primary` · `text` | `glass` |
| `size` | `sm` (36px) · `md` (46px) · `lg` (54px) | `md` |
| `orientation` | `horizontal` · `vertical` (the track takes `radius-well`) | `horizontal` |
| `fullWidth` | boolean: fill the container, equal widths | `false` |
| `disabled` | boolean: every button; the track dims once | `false` |

## Keyboard

- Tab moves through the buttons one by one, as in MUI: each is a native `<button>` (or `<a>` with `href`). Enter and Space press.

## Do and don't

- Do keep labels short and parallel: verbs for actions, nouns for places.
- Do keep the track at `md` next to other 46px controls; `sm` is for toolbars inside a panel.
- Don't mix variants in one group, and don't put two `primary` groups in a view.
- Don't group a single action: that's a `Button`.
