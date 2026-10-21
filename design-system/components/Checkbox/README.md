# Checkbox

A native checkbox drawn as a Blue Glass box: a 1.5px `dg-edge` outline on `glass-control`, filled with `color-ink` and an `on-ink` check or minus when checked or mixed.

**Source:** an addition, matching MUI's Checkbox. The site has no checkbox. The ink fill and `on-ink` mark follow `.btn-primary`, the `radius-code` corner follows `.hiw-section code`, and the border is `dg-edge` (the diagram edge, 3:1 on glass) because control borders must reach 3:1.

## When to use

- Choose any number of options from a set, or one yes/no that is sent with a form ("Email me when a new release ships").
- Give a parent checkbox `indeterminate` when some, not all, of its children are checked.
- For a setting that applies at once, use `Switch`. For one choice of many, use `RadioGroup`.

## What you provide

- `label`: the visible text. The whole row is the `<label>`, so it is the tap target (32px tall at `md`). Without a label, pass `aria-label`.
- `checked` with `onChange(event, checked)`, or `defaultChecked`.
- `helperText` for a hint; with `error` it becomes the message, in `danger` with an error icon, linked by `aria-describedby`.
- `name`, `value`, `required` and any other input attribute: they go to the native input, and so does `ref`. `className` and `style` go to the root.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `checked` / `defaultChecked` | boolean | uncontrolled, `false` |
| `indeterminate` | boolean: the mixed state; sets the input's `indeterminate` property | `false` |
| `size` | `sm` (16px box) · `md` (20px box) | `md` |
| `label` | node | none |
| `helperText` | node | none |
| `error` | boolean: `danger` border, `aria-invalid` | `false` |
| `required` | boolean: native `required` and an asterisk | `false` |
| `disabled` | boolean | `false` |

## Keyboard

- Tab reaches the checkbox and Space toggles it. A mixed checkbox becomes checked; decide in `onChange` what that means for its children (usually: all of them).

## Do and don't

- Do write labels that are true when checked: "Remote only", not "Not on site".
- Do pair `error` with `helperText` that says how to fix it: "Pick at least one, or there is nothing to send."
- Don't use a checkbox for something that happens immediately; that's a `Switch`.
- Don't drop the label in a form; placeholders and icons are not labels.
