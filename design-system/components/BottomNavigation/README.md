# BottomNavigation

Three to five top-level destinations in a floating glass pill at the bottom of a phone screen, the current one raised out of the track.

**Source:** An addition, matching MUI's BottomNavigation. The bar is the header's nav pill (`.identity-strip nav`: `glass-faint`, a `#ffffffc9` border, `blur-control`, `radius-pill`, 5px padding, a 3px gap, `shadow-control`). The selected action is the raised tab (`.project-tab[aria-pressed=true]`: `glass-raised`, a white border, `shadow-raised`, `#fff` under a pointer), hover is the nav link's `#fff7`, and under 700px the actions take the nav link's 8px side padding. With `fixed`, the bar takes the panel's glass (`glass`, `blur-panel`) so labels stay legible over page content, and the selected pill goes to the tab's `#fff` to stay distinct from it.

## When to use

- Phone-width layouts with three to five destinations of equal weight: Work, Projects, Experience, Contact.
- Not for actions: use Button. Not for six or more places: use Drawer or Tabs.
- On wide screens, show the header's nav instead.

## What you provide

- `children`: BottomNavigationAction elements, each with a `label` and an `icon` (an `Icon`, drawn at 20px). A hidden label is still the action's accessible name, so always pass one.
- `value` with `onChange(event, value)`, or `defaultValue`. An action's `value` defaults to its index.
- `href` on each action to make it a link between pages; without it, actions are buttons that switch views. Either way the selected one gets `aria-current="page"`.
- `aria-label` on the bar when the page has another nav, such as "Sections".
- With `fixed`, bottom padding on the page (about 90px) so the last content clears the bar.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` · `defaultValue` | the selected action's value | none |
| `onChange` | `(event, value) => void` | none |
| `showLabels` | boolean: every label, not only the selected one | `false` |
| `fixed` | boolean: bottom-centre above the safe-area inset, `z-app-bar` | `false` |
| Action `label` · `icon` | nodes | none |
| Action `value` | any | its index |
| Action `href` · `component` | renders a link or a router link | `button` |
| Action `showLabel` | boolean | from `showLabels` |

## Keyboard

- Every action is a link or a button in the tab order. Tab moves between them; Enter (and Space on buttons) picks one.
- It's a nav landmark of links, not a tab list, so there are no arrow keys.

## Do and don't

- Do use three to five actions with one-word labels.
- Do pair every icon with a label; an icon alone doesn't name a place.
- Don't put the bar on a glass panel. It's glass itself, and it belongs over the page.
- Don't use it for steps or filters. Each action goes somewhere.
