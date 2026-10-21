# Switch

An on/off setting that applies at once: a native checkbox with `role="switch"`, drawn as a pill track with a white thumb that slides.

**Source:** an addition, matching MUI's Switch. The track is a `radius-pill` control, off on `glass-control` with a 1px `dg-edge` border (3:1), on in `color-ink` (as `.btn-primary`). The thumb is white on `shadow-raised` (the raised tab's shadow, `.project-tab[aria-pressed=true]`) with a `color-line` hairline, and moves over `duration-state` with `ease-out-quint`; under reduced motion it jumps.

## When to use

- A setting that takes effect immediately: "Remote only", "Weekly digest".
- For a choice that is submitted with a form, use a `Checkbox`.

## What you provide

- `label` (visible), or `aria-label`.
- `checked` with `onChange(event, checked)`, or `defaultChecked`. Apply the setting in `onChange`.
- `labelPlacement="start"` with `style={{ width: '100%' }}` for a settings row: label first, switch at the far end.
- `helperText` for a hint, linked by `aria-describedby`. `ref` and other input attributes go to the native input.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `checked` / `defaultChecked` | boolean | uncontrolled, `false` |
| `size` | `sm` (32 × 20) · `md` (40 × 24) | `md` |
| `label` | node | none |
| `labelPlacement` | `end` · `start` | `end` |
| `helperText` | node | none |
| `disabled` | boolean | `false` |

## Keyboard

- Tab reaches the switch and Space toggles it. Screen readers announce "switch, on" or "off".

## Do and don't

- Do name the setting, not the action: "Remote only", not "Turn on remote".
- Do apply the change at once. If it waits for a Save button, use a Checkbox.
- Don't swap the label with the state ("On" / "Off"); the thumb and the track already say it.
