# Stack

Children in one column or one row with a token gap between them, an optional divider, and a direction that can change per breakpoint.

**Source:** an addition, matching MUI's Stack. Gaps are the site's spacing tokens; the built-in divider is its hairline (`color-line`, as between `.career-row`s and around `.employer-strip`). Breakpoints are the site's: `sm` 361px, `md` 701px, `lg` 900px, `xl` 1001px.

## When to use

- For one-dimensional runs: a list of plates, a button row, a heading beside a note, a column of fields.
- For columns that line up across rows use `Grid`.

## What you provide

- Children; `null` and `false` are skipped, so dividers never double up.
- `direction`: `column` (default), `row` or the reversed forms, or one per breakpoint: `{ xs: 'column', md: 'row' }`.
- `spacing` as a token name (`gap` is an alias).
- `divider`: `true` for the hairline, which turns from horizontal to vertical with the direction, or any element to place between children.
- `alignItems`, `justifyContent`, `wrap`, and `component` (`ul`, `nav`, `section`).

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `direction` | `column` · `row` · `column-reverse` · `row-reverse`, or per breakpoint | `column` |
| `spacing` (`gap`) | token name · `0` | `0` |
| `divider` | `true` · element | — |
| `alignItems` | `flex-start` · `center` · `flex-end` · `stretch` · `baseline` | `stretch` |
| `justifyContent` | `flex-start` · `center` · `flex-end` · `space-between` · … | `flex-start` |
| `wrap` | boolean | `false` |
| `component` | element | `div` |

## Do and don't

- Do use `component="ul"` with `<li>` children for lists, so the semantics survive the layout.
- Do prefer `divider` over borders on children; it adapts when the direction flips.
- Don't use `-reverse` directions to reorder meaning: screen readers and Tab follow the DOM.
