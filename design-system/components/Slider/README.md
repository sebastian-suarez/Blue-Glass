# Slider

A slider on a 4px pill track (a `color-line` rail, a `color-blue` fill, a white thumb with a 3:1 edge and an ink value pill) for one value or a range, with marks, steps and a vertical orientation.

**Source:** an addition, matching MUI's Slider. The parts follow the site: the fill is the diagram accent `color-blue` (marks only, never text), the thumb is white with the `dg-edge` edge and the raised tab's `shadow-raised` (`.project-tab[aria-pressed=true]`), and the value label is an ink pill like `.btn-primary` (`color-ink`, `on-ink` 12px, `shadow-primary`).

## When to use

- Use it for a value where the position matters more than the exact number: a budget, a strength, a window. Show the number next to the label.
- Use a range (`value={[low, high]}`) for a window. Use `marks` with `step={null}` when only a few values are valid (900°).
- For an exact number someone will type, use `TextField type="number"`.

## What you provide

- A name: `aria-labelledby` pointing at your visible label, or `aria-label`. For a range, `getAriaLabel(index)` names each thumb.
- `value` with `onChange(event, value, thumb)`, or `defaultValue`. Use `onChangeCommitted` to save once a drag ends.
- `min`, `max`, `step` (`null` snaps to marks) and `shiftStep` for Page Up and Page Down.
- `valueLabelFormat` for units (`v => \`${v} ms\``). A string result also becomes `aria-valuetext`; or set `getAriaValueText`.
- Vertical sliders fill their parent's height, so give the parent one.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `orientation` | `horizontal` · `vertical` | `horizontal` |
| `marks` | `true` (a dot per step) · `[{ value, label }]` | `false` |
| `track` | `normal` · `inverted` · `false` | `normal` |
| `valueLabelDisplay` | `auto` (drag, hover, keyboard focus) · `on` · `off` | `auto` |
| `min` · `max` · `step` | numbers; `step={null}` for marks only | 0 · 100 · 1 |
| `disabled` | boolean | `false` |

## Keyboard

- Each thumb is one tab stop with `role="slider"`. Right and Up step up; Left and Down step down; Shift+arrow, Page Up and Page Down take the bigger step; Home and End go to the minimum and maximum. In a range, a thumb stops at the other thumb.
- Pointer: press anywhere on the track to jump the nearest thumb there, then drag. The pointer is captured, so the drag keeps working outside the track.

## Do and don't

- Do show the current value as text beside the label. The value pill alone disappears.
- Do keep the hit area: the track sits in a 32px band for a mouse and a 44px band on touch screens, so don't squeeze it with negative margins.
- Don't use `color-blue` for the value text: it is for the fill only. Text stays `color-ink` or `color-muted`.
- Don't use a slider for fewer than four choices. Use toggle buttons.
