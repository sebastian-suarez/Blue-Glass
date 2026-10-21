# Tabs

A set of tabs and their panels in three of the site's looks: `underline` with a sliding ink mark, `pill` (the nav pill) and `side` (the client-work selector beside its panel).

**Source:** `underline` is the site's mobile tab mark (`.project-tab[aria-pressed=true]::after`: 16 × 2px, `color-ink`, 4px off the tab's foot), made into one element that slides with `transform` over `duration-tab` on `ease-folio`. `pill` is the nav pill (`.identity-strip nav`: `glass-faint`, a `#ffffffc9` edge, 5px padding, 3px gap, its links' 13px type and 23px radius), with the raised selected tab (`glass-raised`, a white edge, `shadow-raised`). `side` is the client-work folio (`.folio-layout`'s 176px column, `.project-selector`, `.project-tab`, the `.tab-orb` tints and the `.tab-mark`, here a check), down to its phone layout under 700px. The panel crossfade is `project-tabs.ts`'s: 280ms on `ease-folio`, only when switching. The tab semantics (`role="tab"`, roving focus) and the scrolling row are additions, following MUI and the APG tabs pattern. The site's selector uses toggle buttons.

## When to use

- Use tabs to switch between views of one thing, all at the same level: the sections of a project, three pieces of client work.
- Use `pill` for a short set of peers (up to five) in a toolbar or header. Use `side` when each tab opens a large panel and the labels are names. `underline` is the default.
- If the views need to be compared or read in order, show them on one page instead.

## What you provide

- `Tab` children (`label`, optional `icon`, `value`), then the `TabPanel`s (`value` matches a Tab). Everything that isn't a `Tab` goes in the panel area, so you can wrap the panels in a `Paper`.
- `aria-label` (or `aria-labelledby`) to name the tab list.
- `value`/`onChange(event, value)` to control it, or `defaultValue`. Without either, the first enabled tab is selected. A Tab's `value` defaults to its position.
- Ids are generated: each tab gets `aria-controls` pointing at its panel, and each panel gets `aria-labelledby` pointing back.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| Tabs | `variant` | `underline` · `pill` · `side` | `underline` |
| Tabs | `fullWidth` | tabs share the row equally (underline, pill) | `false` |
| Tabs | `value` / `defaultValue` | a Tab's value, or `false` for none | first enabled tab |
| Tab | `icon` | 16px icon before the label; in `side` it replaces the orb (`null` removes it) | — |
| Tab | `orb` | `0` · `1` · `2`, the site's orb tints in `side` | by position |
| Tab | `disabled` | not selectable, skipped by the arrows | `false` |
| TabPanel | `keepMounted` | keep hidden panels mounted (the site does) | `true` |

## Keyboard

- Tab moves into the tab list, to the selected tab, and Tab again moves into the panel.
- Left and Right (Up and Down in `side`) move to the previous or next tab and select it. They wrap at the ends.
- Home and End select the first and last tab. Disabled tabs are skipped.
- In a scrolling row the selected tab is scrolled into view. With a pointer, chevrons appear at a faded edge.

## Do and don't

- Do keep labels to one or two words, in sentence case.
- Do keep the tab list as one tab stop. Don't add `tabIndex` to tabs.
- Don't use tabs for steps in a sequence. That's a `Stepper`.
- Don't put a `danger` action in a tab, and don't nest tabs inside tabs.
