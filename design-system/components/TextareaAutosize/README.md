# TextareaAutosize

A plain `<textarea>` that grows with its content between `minRows` and `maxRows` and scrolls past the cap. It has no styling of its own: `TextField` with `multiline` gives it the Blue Glass field look.

**Source:** an addition, matching MUI's utility.

## What you provide

- Any textarea attribute: `value` or `defaultValue`, `onChange`, `placeholder`, `aria-label` or an associated `<label>`.
- `minRows` (default 1) and `maxRows` (no cap by default).
- Styling, unless it sits inside `TextField`.
