# Timeline

A vertical sequence of events: dots on a hairline, the event on one side and its date on the other.

**Source:** an addition, matching MUI Lab's Timeline (`position`; `TimelineItem`, `TimelineSeparator`, `TimelineDot`, `TimelineConnector`, `TimelineContent`, `TimelineOppositeContent`). It is drawn with the site's marks: filled dots in `color-ink`, outlined dots in `dg-edge`, the glass orb of `.tab-orb` (and the bluer `.orb-1` for `accent`), `color-line` connectors, and dates like `.career-date` (12px, `color-muted`).

## When to use

- Careers, release histories, milestone gates: anything where order and dates matter more than detail.
- For long histories with detail behind each entry, use `Accordion` (the site's career list); the timeline is the overview.

## What you provide

- `TimelineItem`s, each with an optional `TimelineOppositeContent` (the date), a `TimelineSeparator` holding a `TimelineDot` and a `TimelineConnector` (leave the connector off the last item), and `TimelineContent`.
- Your own markup inside the content: the site's pattern is the employer at 17px, the role at 13px in `color-muted`.
- A word for every state: a `success` dot says "Passed" in the content too.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| Timeline | `position` | `right` · `left` · `alternate` · `alternate-reverse` | `right` |
| Timeline | `oppositeWidth` | px or a length: a fixed date column | half the row |
| TimelineDot | `variant` | `filled` · `outlined` · `orb` | `filled` |
| TimelineDot | `tone` | `default` · `accent` · `danger` · `warning` · `success` · `info` | `default` |
| TimelineDot | children | a 16px `Icon`; the dot grows to fit | — |

Under 700px, `alternate` folds to `right` so phones get one reading column, and a fixed `oppositeWidth` gives way to at most 32% of the row.

## Do and don't

- Do keep dates in the opposite content and give them a fixed column (`oppositeWidth`) when they vary in length.
- Do use the orb for the one current or highlighted entry, not for all of them.
- Don't rely on dot colour alone; say the state in words.
