# ToggleButton

A button that stays pressed (`aria-pressed`). In a `ToggleButtonGroup` it is a segment of the site's pill track: the pressed one rises and carries a short ink bar.

**Source:** the track is `.identity-strip nav` (`glass-faint`, `1px solid #ffffffc9`, `padding: 5px`, `gap: 3px`, `radius-pill`, `shadow-control`, `blur-control`). Items are `.identity-strip nav a` (13px, `padding: 7px 17px`, `border-radius: 23px`, hover `#fff7`). Pressed is `.project-tab[aria-pressed=true]` (`glass-raised`, a `#fff` border, `shadow-raised`, hover `#fff`) with the site's mobile ink bar under the pressed tab (16 × 2px, 4px from the bottom), so the state never rests on the fill alone. The standalone button is `.btn-glass`. Roving focus and the `sm` and `lg` sizes are additions, matching MUI's ToggleButtonGroup.

## When to use

- Switch a view (Diagram / Code / Notes) with `exclusive`, or filter a list with several pressed at once.
- Formatting toggles, such as text alignment, as icon-only buttons.
- A standalone toggle for one on/off action ("Watch releases").
- For actions that don't stay pressed, use `ButtonGroup`. For a choice sent with a form, `RadioGroup`.

## What you provide

- `ToggleButton` children, each with a unique `value`, and an `aria-label` when it shows only an icon.
- `value` with `onChange(event, value)`, or `defaultValue`: a string or `null` when `exclusive`, an array otherwise. To keep one always pressed, ignore `null` in `onChange`.
- A name for the group: `aria-label` or `aria-labelledby`. It renders `role="group"`.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `exclusive` | boolean: one pressed at a time | `false` |
| `value` / `defaultValue` | string · `null` · string[] | uncontrolled: `null` or `[]` |
| `size` | `sm` (36px) · `md` (46px) · `lg` (54px) | `md` |
| `orientation` | `horizontal` · `vertical` (the track takes `radius-well`) | `horizontal` |
| `fullWidth` | boolean | `false` |
| `disabled` | boolean: every button; the track dims once | `false` |

`ToggleButton` takes `value` (required), `disabled` and `size`; standalone, also `selected` or `defaultSelected`, `onChange(event, value)` and `fullWidth`.

## Keyboard

- The group is one tab stop: Tab lands on the last focused button, else the pressed one, else the first.
- Left and Right (Up and Down when vertical) move focus and wrap; Home and End jump to the ends. Disabled buttons are skipped.
- Space or Enter presses the focused button. Arrow keys never change what is pressed.

## Do and don't

- Do keep segments to one or two words, and to five at most.
- Do use `exclusive` with a guard against `null` for a view switch, so one view always shows.
- Don't switch panels that need their own URL or focus handling with it; that's Tabs.
- Don't colour the pressed segment; the raised fill and the ink bar carry the state.
