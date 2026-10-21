# RadioGroup

A labelled set of native radios sharing one name: circles with a `dg-edge` outline that take a `color-ink` ring and dot when chosen.

**Source:** an addition, matching MUI's RadioGroup and Radio. The site has no radio. The ink follows `.btn-primary`, the 3:1 outline is `dg-edge`, and the group label is `text-label` (13px, 600, as `.education h3`).

## When to use

- One choice from two to seven visible options: "Preferred stack", "Engagement".
- `row` for two or three short options; a column otherwise, and always when options carry `helperText`.
- More than seven options: a Select. A choice of view that applies at once: `ToggleButtonGroup`.

## What you provide

- `label`: the visible group label, which names the `role="radiogroup"`. Or `aria-labelledby`.
- `Radio` children, each with a `value` and a `label`, plus an optional `helperText` line.
- `value` with `onChange(event, value)`, or `defaultValue`. `null` means nothing chosen yet.
- `name` for forms (generated when omitted). A Radio's `ref` and other input attributes go to its native input.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `value` / `defaultValue` | string · `null` | uncontrolled, `null` |
| `row` | boolean: a wrapping row | `false` |
| `size` | `sm` (16px circles) · `md` (20px) | `md` |
| `helperText` | node: under the options; the message with `error` | none |
| `error` | boolean: `danger` rings, `aria-invalid` | `false` |
| `required` | boolean: asterisk, `aria-required`, native `required` | `false` |
| `disabled` | boolean: every option | `false` |

`Radio` takes `value` (required), `label`, `helperText`, `disabled` and, outside a group, `checked` or `defaultChecked`.

## Keyboard

- Tab enters the group on the chosen radio (or the first), and the next Tab leaves it.
- Arrow keys move the choice to the next or previous option, wrapping and skipping disabled ones. This is the browser's own radio behaviour, kept intact.
- Space chooses the focused radio when nothing is chosen yet.

## Do and don't

- Do preselect a sensible default when there is one; leave it `null` when the choice matters, and show `error` only after the person tries to continue.
- Do keep option labels short and parallel; put detail in `helperText`.
- Don't use radios for on/off; that's a `Switch` or a `Checkbox`.
- Don't put links or buttons inside an option's label.
