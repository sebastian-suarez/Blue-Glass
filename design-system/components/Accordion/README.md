# Accordion

Rows that open in place to show more: the site's career list, with the horizontal pane accordion (`PaneAccordion`) beside it.

**Source:** the career list (`.career-surface` on `.glass-panel`, `.career-row`, `.toggle`, `.career-description`) and the capabilities accordion (`.acc`, `.pane`, `.pane-default` / `-alt` / `-accent`, `.more`, `scripts/accordion.ts`) in `global.css`. Values are the site's: a 79px summary on a `1fr 1.6fr 1fr 16px` grid, `color-line` hairlines, the 13px plus that turns into a minus over `duration-state`, `#3a518a` on the title under a fine pointer, panes growing to 2.6x over 500ms `ease-out-quint`, chips revealed with the grid-rows trick over `duration-expand`. The summary button inside a heading, `Collapse` for the reveal, `expandIcon`, `disabled`, `orientation`, the press states and the whole pane as its tap target (the site's is the title alone) are additions.

## When to use

- `Accordion` for long lists where each row has a short header and a few sentences behind it: roles, projects, FAQs. Put the rows inside one element with the class `gl-accordion-surface` (the career list's glass: 0.42 white, `blur-surface`, `radius-pane`). Without it the rows keep their hairlines and sit on whatever panel you give them.
- `PaneAccordion` for four to six peers you want to compare at a glance, each with a blurb and a set of tags. Mark one pane `accent`, at most.
- Keep the content short. If people need to compare open rows, use a table instead.

## What you provide

- `Accordion`: an `AccordionSummary` first, then `AccordionDetails`. State with `defaultExpanded`, or `expanded` plus `onChange(event, expanded)`. For one-open-at-a-time, control them from a parent.
- `AccordionSummary`: the title as children, plus `secondary` (the role column) and `meta` (the right-aligned date column). Leave either out and the grid closes up.
- `AccordionDetails`: paragraphs as children (they get 10px between them), `meta` for the 11px closing line (the location), `inset={false}` to run full width instead of under the second column.
- `PaneAccordion`: `items` of `{ id?, title, text, chips, tone }`, or `more` for custom revealed content. `defaultOpen` / `open` take pane ids; ids default to the slugified title.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| Accordion | `expanded` / `defaultExpanded` | boolean | `false` |
| Accordion | `onChange` | `(event, expanded) => void` | — |
| Accordion | `disabled` | boolean | `false` |
| Accordion | `headingLevel` | `2`–`6` | `3` |
| Accordion | `TransitionProps` | `timeout`, `unmountOnExit` | `{ enter: 300, exit: 200 }` |
| AccordionSummary | `secondary`, `meta`, `expandIcon` | node | — |
| AccordionDetails | `meta` · `inset` | node · boolean | — · `true` |
| PaneAccordion | `orientation` | `auto` (side by side, stacked at 899px and below) · `horizontal` (stacked only at 700px and below) · `vertical` | `auto` |
| PaneAccordion | `open` / `defaultOpen` · `onChange` | pane ids · `(event, open) => void` | — |

## Keyboard

- Tab reaches each summary or pane button; Enter and Space open and close it.
- Up and Down move between the summaries of one list (Left and Right too between panes); Home and End jump to the first and last.
- Focusing a pane widens it and shows its chips, as hovering does. A press anywhere on a pane toggles it.

## Do and don't

- Do keep summaries to one line per column; the date column is right-aligned for scanning.
- Do say why a row is `disabled` in its `meta` ("Not published yet").
- Don't nest accordions, and don't put glass panels inside the details: the surface is already glass.
- Don't add hover colours of your own: the title's `#3a518a` under a fine pointer is the only hover, as on the site.
