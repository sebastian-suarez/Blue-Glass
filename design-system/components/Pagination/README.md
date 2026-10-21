# Pagination

A row of page pills with previous and next chevrons, the current page in ink; long ranges fold into ellipses around the current page.

**Source:** An addition, matching MUI's Pagination and its usePagination algorithm (`siblingCount`, `boundaryCount`). The pills are the site's chip (`.chip`: `glass-control`, the `rgba(88, 108, 143, 0.16)` hairline, `ink-soft`, `radius-pill`), hover is `.plate:hover`, and the current page is the primary button's ink fill (`.btn-primary`: `color-ink`, `on-ink`, `shadow-primary`, `ink-hover` under a pointer).

## When to use

- Long lists split into pages a person moves between: services, posts, search results.
- Not for a handful of items; show them all. Not for steps in a process; use Stepper.
- Prefer it to infinite scroll when people need to come back to the same place.

## What you provide

- `count` and either `page` with `onChange(event, page)` or `defaultPage`. Pages are 1-based.
- A visible summary next to it ("6–10 of 30"), in an `aria-live` region if it changes.
- `renderItem` for links: `renderItem={(item) => <PaginationItem {...item} href={…} />}`, or `component` for a router link.
- `aria-label` when the page has more than one Pagination.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `count` | number of pages | `1` |
| `page` · `defaultPage` | 1-based page | `1` |
| `siblingCount` | pages each side of the current one | `1` |
| `boundaryCount` | pages kept at each end | `1` |
| `variant` | `glass` (chip pills) · `text` (no fill until hover) | `glass` |
| `size` | `sm` (28px) · `md` (36px) | `md` |
| `showFirstButton` · `showLastButton` | boolean | `false` |
| `hidePrevButton` · `hideNextButton` | boolean | `false` |
| `disabled` | boolean | `false` |
| `getItemAriaLabel` | `(type, page, selected) => string` | "Go to page 4", "Page 3", "Go to next page" |

## Keyboard

- Every pill is a button (or a link) in the tab order; Enter or Space picks it. Ellipses aren't focusable.
- The current page has `aria-current="page"`. Previous and next are disabled at the ends and drop out of the tab order.

## Do and don't

- Do keep the summary text: the pills alone don't say how many items there are.
- Do use `size="sm"` or `siblingCount={0}` where a row must fit a phone.
- Don't change pages on hover or on a timer.
- Don't show it for a single page.
