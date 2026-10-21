# Badge

A count pill or a dot on a corner of its child: unread messages, pull requests waiting for review, someone's availability.

**Source:** an addition, matching MUI's Badge. Its fill is the site's ink (`color-ink`, as `.btn-primary`) with `on-ink` text at 11px weight 600 in tabular figures, on an 18px `radius-pill`. A 2px `glass-edge` ring cuts it out of the child. The status tones use the status fills.

## When to use

- A number that changes and wants attention: unread, waiting, failed.
- A dot for presence or "something new" when the number doesn't matter.
- Not for static labels or categories. Use a `Chip` for those.

## What you provide

- `children`: the element it sits on, such as a `Button`, an `Avatar` or an icon tile. Without children the pill renders inline.
- `badgeContent`: a number or one short word.
- A name for the count. The visible pill is always `aria-hidden`, so say it in words one of two ways:
  - `aria-label` for an interactive child: the Badge passes it through to the child ("Messages, 4 unread"), so focus on the button reads the count with its name. No hidden text is added.
  - `label` for a static child such as an Avatar: rendered as visually hidden text after it ("Available").
  - With neither, the bare count is read after the child.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `standard` (count pill) · `dot` (8px) | `standard` |
| `tone` | `default` (ink) · `accent` · `danger` · `warning` · `success` · `info` | `default` |
| `max` | numbers above it read "max+" | `99` |
| `showZero` | show a 0 | `false` |
| `invisible` | hide: fades and scales to 0.85 in 140ms; returns in 180ms `ease-out-quint` | `false` |
| `anchor` | `top-right` · `top-left` · `bottom-right` · `bottom-left` | `top-right` |
| `overlap` | `rectangular` · `circular` (moves in 14% onto a round child) | `rectangular` |
| `label` | visually hidden text after the child | the visible count |
| `aria-label` | the child's full name with the count, passed through to it | — |

Override the ring with `--gl-badge-ring` when the badge sits on a coloured surface.

## Do and don't

- Do let the count reach zero and disappear. A badge that never clears trains people to ignore it.
- Do say what a status dot means in `label`, and show it in words somewhere nearby.
- Don't put a badge on every item in a list. One or two per view.
- Don't write sentences in the pill. One number or one word.
