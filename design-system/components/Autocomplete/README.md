# Autocomplete

A text field with suggestions: the field's pill as an editable combobox over a non-modal glass listbox that filters as you type and sets the match in weight 600, with groups, free text, removable chips, and loading and empty states.

**Source:** an addition, matching MUI's Autocomplete. The input is the TextField pill (`gl-field`). The list floats in `Popper` on the shared popover material (`gl-popover`: `glass`, `blur-selector`, `radius-well`), with `gl-option` rows and `gl-option-group` headings. Chips are the site's `.chip` (12px, `glass-control`, the 16% hairline, `ink-soft`) with a remove button.

## When to use

- Use it when the list is long or typing is faster than scrolling: employers, technologies, projects.
- Use `freeSolo` when any text is a valid answer and the options are only suggestions (a job title).
- Use `multiple` to collect several values as chips. Use `Select` instead for a short fixed list.

## What you provide

- `label` (always) and `options`: strings, or objects with a `label` (plus `value`, `secondary`, `disabled`, or anything you read in `getOptionLabel`, `groupBy` and `renderOption`).
- `value` with `onChange(event, value, reason)`, or `defaultValue`. `inputValue` with `onInputChange` if you need the text, for example to fetch options; set `loading` while they arrive.
- `groupBy(option)` for headings. Sort the options by group first.
- `getOptionDisabled`, `isOptionEqualToValue` or `filterOptions` to change the defaults. The default filter is "contains", ignoring case and accents.
- `disablePortal` inside a dialog or a showcase stage.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `multiple` | boolean: chips before the input | `false` |
| `freeSolo` | boolean: Enter commits any text | `false` |
| `loading` · `loadingText` · `noOptionsText` | states shown in the popup | `false` · "Loading…" · "No options" |
| `autoHighlight` · `openOnFocus` · `disableCloseOnSelect` · `clearOnEscape` · `disableClearable` | boolean | `false` |
| `variant` · `size` | as `TextField` | `outlined` · `md` |

## Keyboard

- Typing opens and filters the list. Down and Up open it and move through the rows (wrapping); Page Up and Page Down move five. Home and End jump to the first or last row (except with `freeSolo`, where they move the caret).
- Enter chooses the highlighted row; with `freeSolo` and no highlight, Enter commits the text. Escape closes the list; with `clearOnEscape`, a second Escape clears.
- With `multiple`: Backspace in an empty input removes the last chip. Left Arrow at the start of the input moves to the chips; Left and Right move between them; Backspace or Delete removes one.
- Focus stays in the input; the highlighted row is announced through `aria-activedescendant`. Disabled rows are skipped.

## Do and don't

- Do keep the label above and use the placeholder for an example ("Type a company").
- Do give a disabled option its reason in `secondary` ("No working-hours overlap").
- Don't fetch on every keystroke without a debounce. Show `loading`, and keep the previous options until new ones arrive.
- Don't use `freeSolo` when only listed values are valid: validation then has to catch what the list would have prevented.
