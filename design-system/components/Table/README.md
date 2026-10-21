# Table

A data table on the site's career list surface: 12px muted header cells, `color-line` hairlines between rows, right-aligned tabular figures, sortable columns, and hover and selected rows.

**Source:** `TableContainer` is the experience list's surface, `.career-surface` on `.glass-panel`: `rgba(255,255,255,0.42)` under `blur-surface` (15px), `radius-pane`, padding `8px 30px` (`3px 22px` under 700px), the panel's `rgba(255,255,255,0.95)` border, `shadow-panel` and its diagonal sheen. Rows are separated like `.career-row`, with no line under the last. Header cells use the `.project-story h4` label: 12px, weight 600, `color-muted`. Hover and selected rows are the side selector's tab states (`#ffffff66`, then `glass-raised`). The table parts, sizes, sticky header and sort labels are additions, matching MUI.

## When to use

- Records people compare across columns: roles and dates, outcomes and figures, services and their jobs.
- For a single column of items, use `List`. For two or three facts per item, a `List` with secondary text often reads better than a table.

## What you provide

- The structure: `TableContainer` › `Table` › `TableHead` / `TableBody` › `TableRow` › `TableCell`.
- A name: `caption` on the `Table` (12px `color-muted`, below by default), or `aria-label` on the container. A container that scrolls joins the tab order so the keyboard can scroll it, and becomes a named region when you name it.
- `component="th"` on the first cell of a body row when it names the row (rendered `scope="row"`, weight 500).
- `numeric` on number columns, on the header cell too.
- For sorting: the sort state, a `TableSortLabel` in each sortable header, and `sortDirection` on that header's `TableCell` so the `th` carries `aria-sort`.
- `maxHeight` on the container for a `stickyHeader` table.
- A `minWidth` on a wide table (the CV table uses 660px), so a phone scrolls it sideways inside the surface instead of crushing the columns.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| `TableContainer` | `variant` | `surface` (.career-surface) · `plain` | `surface` |
| `TableContainer` | `maxHeight` | px or CSS length | — |
| `Table` | `size` | `md` (14px, 14px cell padding) · `sm` (13px, 8px) | `md` |
| `Table` | `stickyHeader` | header on `glass-solid`, sticks while the body scrolls | `false` |
| `Table` | `caption`, `captionSide` | `bottom` · `top` | —, `bottom` |
| `TableRow` | `hover` · `selected` | highlight under a fine pointer · `glass-raised` and `aria-selected` | `false` |
| `TableCell` | `numeric` · `align` | right-aligned tabular figures that never wrap · `left` `center` `right` | — |
| `TableCell` | `sortDirection` · `padding` · `size` · `variant` | `asc` `desc` · `normal` `checkbox` `none` · `md` `sm` · `head` `body` | `false`, `normal`, from the table, from the section |
| `TableSortLabel` | `active` · `direction` · `hideSortIcon` | the sorted column · `asc` `desc` · no arrow on inactive columns | `false`, `asc`, `false` |

## Keyboard

- Sort labels are buttons: Tab to them, Enter or Space to sort. The sorted one also says "sorted ascending" or "sorted descending".
- A scrolling container is focusable: arrow keys scroll it.

## Do and don't

- Do align numbers right and text left, and keep units in the cell ("10–20 ms", "−10%").
- Do mark a selected row with a word or an icon in a cell, not only the band.
- Don't zebra-stripe. The hairlines are the system.
- Don't put a table on a glass panel: `TableContainer` is the surface. Use `variant="plain"` inside one.
