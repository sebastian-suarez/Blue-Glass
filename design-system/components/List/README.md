# List

A vertical list of rows: static rows like the site's career list, or interactive rows (buttons or links) on the shared option row, with icons, two lines of text, an end slot, subheaders and a dense size.

**Source:** static rows with `divided` are the career list (`.career-row`: a `color-line` hairline under every row but the last). Interactive rows are `.gl-option`, the side selector's tab (`.project-tab`) made denser: 40px, `radius-control`, a `glass-raised` hover, the focus ring inside the row, and the selected state of `.project-tab[aria-pressed="true"]` (`glass-raised`, a white border, `shadow-raised`). Subheaders are `.gl-option-group` (12px, weight 600, `color-muted`). `dense`, `inset` and the end slots are additions, matching MUI.

## When to use

- Static rows for read-only sets: roles, services, contact details.
- `ListItemButton` for rows that do something or go somewhere: a side navigation, a project picker.
- `divided` when rows carry several lines and need the hairline to read as separate, as the career list does.
- For a list of choices inside a popup, use `Menu`; for a field's options, `Select` or `Autocomplete`.

## What you provide

- `ListItem` for a static row, `ListItemButton` for an interactive one (a `button`, or an `a` with `href`). Inside a `List`, a `ListItemButton` brings its own `li`.
- `ListItemIcon` (an 18px `Icon` or an `xs` Avatar) and `ListItemText` with `primary` and `secondary`.
- `secondaryAction` on a `ListItem`: meta text, a chip or an action. On a row that holds a `ListItemButton` it's laid over the row's end, outside the button, so the two never nest.
- `end` on a `ListItemButton`: a count or a mark inside the row.
- A name for the list when it isn't obvious: `aria-label`, or wrap it in `<nav aria-label>` for navigation.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| `List` | `dense` | 32px rows, 13px text | `false` |
| `List` | `divided` | hairline between rows | `false` |
| `List` | `subheader` | node rendered first | — |
| `ListItem` | `secondaryAction` | end slot | — |
| `ListItem` | `divider` · `disableGutters` · `disablePadding` | one hairline · no side padding · no padding | `false` |
| `ListItem`, `ListItemButton` | `alignItems` | `center` · `flex-start` | `center` |
| `ListItemButton` | `selected` | raised state; `aria-pressed` on a button, `aria-current="page"` on a link | — |
| `ListItemButton` | `href`, `disabled`, `end`, `autoFocus` | link · disabled · end slot · focus on mount | — |
| `ListItemText` | `primary`, `secondary`, `inset`, `noWrap` | `inset` adds 29px to line up with icon rows | — |
| `ListSubheader` | `inset`, `sticky` | sticky sits on `glass-solid` | `false` |

## Keyboard

- Tab moves between interactive rows and any secondary actions. Enter activates a row (Space too, on a button row).
- A list is not a composite widget: there's no arrow-key navigation. Use `Menu` when you need it.

## Do and don't

- Do give every interactive row a visible label. An icon alone isn't enough.
- Do pair a selected row with a mark or a word when selection matters (the site shows ↗ on the pressed tab).
- Don't put a button inside a `ListItemButton`. Use `secondaryAction`.
- Don't mix `dense` and regular rows in one list.
