# Select

A select-only combobox in the field's pill that opens a glass popover listbox, with the APG keyboard and typeahead, the site's chips for `multiple`, and a styled `<select>` for `native`.

**Source:** an addition, matching MUI's Select. The trigger is the TextField pill (`gl-field`) with a `chevron-down`. The list sits in `Popover` (the `.project-selector` material: `glass`, `blur-selector`, `radius-well`) and its rows are `gl-option`, the side selector's `.project-tab` made denser: the chosen row is raised (`glass-raised`, `shadow-raised`) and carries a check. Chips in the trigger are the site's `.chip`.

## When to use

- Use it to pick from a fixed list of up to about fifteen choices: a stack, an employer, a slot. For a longer list, or when typing helps, use `Autocomplete`. For two to five choices that should all stay visible, use a radio group or toggle buttons.
- Use `multiple` to pick several. The list stays open while you pick.
- Use `native` on forms that mostly run on phones, where the platform's own picker is better.

## What you provide

- `label` (always), plus `helperText`, `error`, `required`, `disabled`, `readOnly` as on `TextField`.
- The rows: `<Option value="…">Label</Option>` children (with optional `secondary`, `icon`, `disabled`, `textValue`), or an `options` array of values or `{ value, label, secondary, icon, disabled }`.
- `value` with `onChange(event, value)`, or `defaultValue`. Use `null` or `''` for no value, and an array with `multiple`.
- `placeholder` for the empty state, in `color-muted`.
- `PopoverProps` to pass `disablePortal`, `disableScrollLock` or `container` to the popover. `open` / `defaultOpen` / `onOpen` / `onClose` control the list.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `multiple` | boolean: chips in the trigger, rows toggle | `false` |
| `native` | boolean: a styled `<select>` | `false` |
| `variant` · `size` | as `TextField` | `outlined` · `md` |
| `renderValue` | `(value) => node` for a custom trigger | — |
| `name` | form name; hidden inputs carry the value | — |

A single Select's trigger is as wide as its longest option, so it doesn't jump as the value changes. With `multiple`, the chips wrap and the pill becomes a 23px-corner box. `fullWidth` fills the container.

## Keyboard

- On the trigger: Enter, Space, Down or Up open the list on the chosen row. Home and End open it on the first or last row. Typing a letter opens it on the first match.
- In the list: Up and Down move, Home and End jump, Page Up and Page Down move ten rows, and typing jumps to a match (repeat a letter to cycle). Enter or Space chooses (toggles with `multiple`). Alt+Up chooses and closes.
- Escape or Tab closes the list, and focus returns to the trigger. Disabled rows are skipped.

## Do and don't

- Do write options in sentence case, short, and in a sensible order: alphabetical, by size or by time.
- Do give a disabled option a reason in `secondary` ("Booked").
- Don't use a Select for yes or no. Use a switch or a checkbox.
- Don't hide the label behind the placeholder: the label stays above.
