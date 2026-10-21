# TransferList

Two inset wells of selectable rows with a column of glass buttons between them: select rows on one side, then move them, or all of them, to the other.

**Source:** an addition, matching MUI's transfer list demo. The wells are `Paper variant="inset"` (the `.project-figure` well: `glass-inset`, `glass-edge`, `radius-well`), and the rows are `gl-option` in a multi-select `gl-listbox`, the side selector's tabs (`.project-tab`): selected rows are raised with a check. The buttons are the glass pill (`.btn-glass`) at `sm`.

## When to use

- Use it to split a known set in two when people need to see both sides at once: skills on a résumé, projects to feature.
- For picking a few values from a long list, use `Autocomplete multiple`. For a short list, use checkboxes.

## What you provide

- `value` (or `defaultValue`): `{ left, right }`, each an array of strings or `{ value, label, secondary, disabled }`. `onChange(event, value)` gets both sides after every move.
- `leftTitle` and `rightTitle` (default "Choices" and "Chosen"). They name the listboxes and the move buttons ("Move selected to Highlights").
- Optional `selected` / `defaultSelected` / `onSelectionChange` for the selection, `listHeight` (default 232px, five rows), `emptyText`, `showMoveAll` and `disabled`.
- Width: it fills its container. When the container is narrower than 480px, it stacks the wells and the arrows turn down and up.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` · `defaultValue` | `{ left: Item[], right: Item[] }` | empty |
| `leftTitle` · `rightTitle` | node | "Choices" · "Chosen" |
| `showMoveAll` | boolean | `true` |
| `listHeight` | px | 232 |
| `disabled` | boolean | `false` |

## Keyboard

- Each well is one tab stop (a multi-select listbox). Up and Down move; Home and End jump; typing jumps to a match.
- Space toggles the row. Shift+Up and Shift+Down move and toggle. Ctrl+A or Cmd+A selects all, or none if all are selected.
- Tab reaches the move buttons; each has a spoken name. After a move, a status message says how many items went where.

## Do and don't

- Do show the count ("2/5 selected") so a selection outside the visible rows isn't lost.
- Do lock rows that must stay with `disabled`, and say why in `secondary`.
- Don't use it for more than about fifty items per side. Add a filter field above it first.
- Don't rely on the arrows alone: their names come from the titles, so give the lists real titles.
