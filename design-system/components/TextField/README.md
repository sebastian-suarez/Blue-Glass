# TextField

A labelled text field in the site's language: the 46px glass pill with a 3:1 edge, the label above, helper or error text below, and a `multiline` mode that grows on `radius-well`.

**Source:** an addition, matching MUI's TextField. The site has no form fields, so the field takes its parts from the site's language: the `.btn` pill (`size-control`, `radius-pill`), the `.chip` fill (`glass-control`, `glass-raised` under a pointer), the `.education h3` label (13px, weight 600, `color-ink`), the `.project-figure` well for `filled` and read-only, and `radius-well` for multiline. The edge is `dg-edge` (3:1), never the decorative `color-line`.

## When to use

- Use it for short free text: a name, an email, a search, a number with a unit. For a fixed list, use `Select`. For a long list you type into, use `Autocomplete`.
- Use `multiline` for a message or a summary. Set `minRows` (3–4 reads as "write a few lines") and a `maxRows` past which it scrolls.
- Use `filled` where many fields sit together on a glass panel and outlines would get busy. Use `outlined` everywhere else.

## What you provide

- `label`, always. The placeholder is a hint (`you@company.com`), never the label.
- `helperText`: one line in sentence case. Under `error`, say what to fix ("Enter an email like name@company.com.").
- `value` with `onChange(event, value)`, or `defaultValue`.
- `startAdornment` / `endAdornment`: an `Icon` (shown at 16px in `color-muted`), a unit as `<InputAdornment position="end">ms</InputAdornment>` (text units join `aria-describedby`), or a small `Button variant="text"`.
- `inputProps` for `inputMode`, `pattern`, `min`, `max` and `step`; `inputRef` for the element. `aria-label` and `aria-describedby` go to the input.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `outlined` · `filled` | `outlined` |
| `size` | `sm` (36px) · `md` (46px) | `md` |
| `type` | `text` · `email` · `password` · `number` · `search` · `tel` · `url` | `text` |
| `error` · `required` · `readOnly` · `disabled` · `fullWidth` | boolean | `false` |
| `multiline` with `minRows` · `maxRows` · `rows` | boolean, rows | `false`, 1 row |
| `maxLength` with `showCount` | number, boolean: "42/280" under the field | — |

`InputAdornment` takes `position` (`start` · `end`) and children. `readOnly` shows the inset well with a dashed `dg-edge`, so it reads as not editable while staying at 3:1.

## Keyboard

- Tab moves in and out. The focus ring is the site's (`focus`, 3px) at a 2px offset around the whole pill. Number fields step with Up and Down.

## Do and don't

- Do keep the label visible above the field. It is a real `<label for>`.
- Do pair `error` with `helperText`. The danger edge alone is colour only; the helper adds the word and the error icon.
- Do mark required fields with `required` (asterisk plus `required`), and say so once near the submit button.
- Don't style the placeholder like a value: it stays `color-muted`.
- Don't put a field on a translucent glass control. On a glass panel, the field's own `glass-control` fill is the control layer.
