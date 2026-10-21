# Menu

A list of actions on a glass popover, anchored to the button that opens it: focus moves to the first item, and a choice, an outside press, Escape or Tab closes it and returns focus to the button.

**Source:** an addition, matching MUI's Menu, MenuItem and MenuList. The surface is the shared Popover (the site's side selector, `.project-selector`: `glass` with `blur-selector`, a `glass-edge` border, `radius-well` and the selector's 7px padding). The rows are the shared `.gl-option`, the `.project-tab` made denser: a 40px row on `radius-control`, white at 0.82 (`glass-raised`) under the pointer, and the raised selected tab (`glass-raised`, a white edge, `shadow-raised`) for the current choice. Separators are the site's `color-line` hairline.

## When to use

- Use a menu for actions on one thing: a project's "Open repository", "Copy link", "Share", "Delete".
- Choosing a value for a form field is a `Select`. Moving between pages is navigation (`Tabs`, links).
- Use `MenuList` alone for a menu that stays on screen, such as a sidebar of actions in a glass well.

## What you provide

- A trigger button with `aria-haspopup="menu"`, `aria-expanded` and `aria-controls` (the Menu's `id`, while open). Give it an `id`: the menu takes its name from it (`aria-labelledby`).
- `open`, `anchorEl` (the button) and `onClose(event, reason)`. Reasons: `backdropClick`, `escapeKeyDown`, `itemClick`, `tabKeyDown`.
- `MenuItem` children. Each takes `icon`, `secondary` (a second line), `end` (a shortcut such as "⌘C", with `aria-keyshortcuts`, or `arrow-ne` on a link), `tone="danger"` for destructive items, `disabled`, `selected` and `divider`.
- `href` on a MenuItem renders a link (`<a role="menuitem">` in `<li role="none">`). Put `arrow-ne` in `end` when it opens another site.
- Separators: `divider` on the item before the break, or `<li role="separator" />` in the list.

## Props

| Component | Prop | Values | Default |
| --- | --- | --- | --- |
| Menu | `placement` | any Popover placement | `bottom-start` |
| Menu | `autoFocus` | focus the selected item, else the first enabled one, on open | `true` |
| Menu | `dense` | 32px rows (`size-control-sm`) | `false` |
| Menu | `MenuListProps` | props for the `role="menu"` list | — |
| MenuItem | `tone` | `default` · `danger` | `default` |
| MenuItem | `selected` | boolean: raised row, check, `menuitemradio` with `aria-checked` | — |
| MenuItem | `onClick` | runs, then the Menu closes, unless you call `event.preventDefault()` | — |
| MenuList | `disableListWrap` | stop at the ends instead of wrapping | `false` |

## Keyboard

- Down and Up move between items and wrap. Home and End go to the first and last item.
- Typing a letter moves to the next item that starts with it. Type quickly to match a word.
- Enter and Space choose the focused item. Disabled items are reachable but do nothing.
- Escape closes the menu. Tab closes it too. Either way focus returns to the button.

## Do and don't

- Do start each label with a verb, in sentence case: "Copy link", not "Link".
- Do put a separator before a `danger` item, and name the loss ("Delete", "Close pull request").
- Don't nest menus more than one level, and don't put form fields in a menu. Use a `Popover` for that.
- Don't rely on the shortcut text alone. Set `aria-keyshortcuts` so screen readers announce it.
