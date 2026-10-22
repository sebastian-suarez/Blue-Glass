# Deviations

Where the package departs from the documented API (`design-system/components/*/api.d.ts` and the READMEs), and why. Each entry names the test that pins it. The tests live next to the adapters in `src/internal/`; the phase ports add contract tests on the components.

## Form controls

The user chose Base UI for Checkbox, Radio and Switch on 21 Oct 2026, with these deviations recorded (`docs/reviews/plan.md`, round 2, finding 1). Base UI renders each control as a `<span>` with the role (`checkbox`, `radio` or `switch`), which takes focus, the pointer and the keys, beside a hidden input that carries the form value. Adapter: `src/internal/form-control.tsx`. Tests: `src/internal/form-control.test.tsx`.

### 1. The ref is Base UI's hidden input

- **Components:** Checkbox, Radio, Switch.
- **Documented:** "The ref and every other attribute go to the native input", the visible control.
- **Actual:** the ref is Base UI's hidden input (`aria-hidden`, `tabindex="-1"`, visually hidden). `checked`, `indeterminate`, `form` and `validity` read as before, and `ref.current.focus()` moves focus to the span.
- **Reason:** Base UI's controls are spans; the input only carries the form value.
- **Tests:** "the ref is Base UI's hidden input, and focusing it focuses the control" (Checkbox, Switch); "each radio's ref is its hidden input, named by the group".

### 2. `onChange` gets a ChangeEvent-shaped wrapper

- **Components:** Checkbox, Radio, RadioGroup, Switch.
- **Documented:** `onChange(event, checked)` (RadioGroup: `onChange(event, value)`) with React's `ChangeEvent<HTMLInputElement>` from the input.
- **Actual:** a wrapper with the ChangeEvent's fields. `type` is `"change"`, `target` and `currentTarget` are the hidden input, already holding the new state, and `nativeEvent` is the click Base UI dispatched on it. `preventDefault()` cancels the change, as on a native checkbox. It isn't a React SyntheticEvent, so it takes no part in React's propagation. A Radio's `onChange(event, true)` runs before its group's `onChange(event, value)`, with the same event.
- **Reason:** Base UI reports changes through `onCheckedChange` and `onValueChange`, with a native event and no React one.
- **Tests:** "onChange gets a ChangeEvent-shaped wrapper on the input, with the new checked value"; "preventDefault in onChange cancels the change"; "onChange: the radio's (event, true), then the group's (event, value), on the chosen input".

### 3. Focus and blur fire on the span

- **Components:** Checkbox, Radio, Switch.
- **Documented:** `onFocus` and `onBlur` go to the native input, so `event.target` is the input.
- **Actual:** they go to the span, so `event.target` is the span.
- **Reason:** the span is what takes focus; the hidden input hands focus on to it.
- **Test:** "focus and blur fire on the span".

### 4. The other attributes go where Base UI takes them

- **Components:** Checkbox, Radio, Switch.
- **Documented:** every attribute but `className` and `style` goes to the native input.
- **Actual:** `name`, `value`, `required`, `form`, `id`, `disabled` and `readOnly` go to the hidden input. ARIA attributes (`aria-describedby`, `aria-label`, `aria-invalid`), `data-*`, `title`, `tabIndex` and the event handlers go to the span. `autoFocus` focuses the span on mount. Input-only attributes Base UI has no prop for, such as `onInvalid`, land on the span and do nothing.
- **Reason:** Base UI owns the hidden input's attributes, and ARIA belongs on the element with the role, which assistive tech reads (the input is `aria-hidden`).
- **Tests:** "attributes go to the input where Base UI takes them, and to the span otherwise"; "autoFocus focuses the span on mount"; "disabled reaches the input and stops changes".

### 5. Inside a RadioGroup, the group's `name` and `form` win

- **Component:** Radio.
- **Documented:** a Radio's attributes go to its input, so its own `name` would win over the group's, as in the reference (`name ?? group.name`).
- **Actual:** Base UI sets `name` and `form` on every radio from the group, and a Radio's own are ignored.
- **Reason:** Base UI's Radio has no `name` or `form` of its own.
- **Test:** "a Radio's own name inside a group gives way to the group's".

### 6. A Radio outside a RadioGroup is a one-radio group

- **Component:** Radio.
- **Documented:** a native radio. `checked` controls it; with `defaultChecked` the browser unchecks it when another radio of the same name is chosen, and the arrow keys move between radios of a name.
- **Actual:** each lone Radio is its own Base UI group, without the `radiogroup` role. `checked`, `defaultChecked`, `onChange(event, true)` and the form value work, but lone radios that share a name don't uncheck one another, and the arrow keys don't move between them.
- **Reason:** Base UI's Radio takes its state only from a group. Grouping lone radios by name needs a shared registry, which the RadioGroup port can add if lone radios matter.
- **Tests:** "checked and defaultChecked work, with onChange(event, true)"; "pins the known gap: radios sharing a name don't uncheck one another".

## Modal

Adapter: `src/internal/modal.tsx`. Tests: `src/internal/modal.test.tsx`.

### 7. The rest of the page is `aria-hidden`, not inert

- **Component:** Modal (Dialog and Drawer take the same flags).
- **Documented:** Modal makes "the rest of the page inert", while `hideBackdrop` keeps the page behind "clickable outside the content" and `disableEnforceFocus` lets "focus leave the content".
- **Actual:** while focus is enforced, the rest of the page is `aria-hidden` (Base UI marks it through the portal; the adapter does in place, with `disablePortal`), and the page is never `inert`. With stacked layers, the page is hidden for the top one, and a layer opened above an in-place one stays exposed, whether it renders in place or through a portal. With `hideBackdrop` an outside press reaches the page, and focus comes back to the content unless `disableEnforceFocus` is set. With `disableEnforceFocus` Tab reaches the page, which stays exposed to assistive tech.
- **Reason:** `inert` would break both documented flags. The reference sets it and breaks them, a reference defect.
- **Tests:** the eight `disableEnforceFocus` × `disableScrollLock` × `hideBackdrop` cases, each through the portal and in place, "focus, Tab, scroll, outside clicks, Escape and focus return follow the flags"; "a layer opened over an in-place one is exposed, and closing it hands back".

### 8. A nested Modal renders inside the outer one's portal

- **Component:** Modal (Dialog and Drawer take the same flags).
- **Documented:** Modal "portals into `document.body`" (Portal: "Default document.body").
- **Actual:** a Modal rendered inside another Modal, or inside any Base UI popup, goes into that layer's portal element, Base UI's default. One outside every portal goes into body, and `container` still picks the mount point.
- **Reason:** Base UI's focus trap and `aria-hidden` marking treat a nested popup as part of its parent when it sits inside the parent's portal.
- **Test:** "only the top layer reports Escape and backdrop clicks; the lock lasts until the last locking layer closes".

## Transitions

Adapter: `src/internal/transition.ts`. Tests: `src/internal/transition.test.ts` and `transition.browser.test.tsx`, and on the components `src/components/Transitions/Transitions.server.test.ts` and `Transitions.test.tsx`.

### 9. `appear` runs on client-side mounts only

- **Components:** Transition, Fade, Grow, Zoom, Slide, Collapse and `useTransition`, and the overlays that animate through them.
- **Documented:** `appear` (default true; Collapse's false) runs "the enter transition on first mount when `in` starts true".
- **Actual:** a child that is `in` when React renders it on the server, or hydrates it, starts entered whatever `appear` says: its server HTML is visible, and hydrating it reports `onEntered` and animates nothing, as `appear={false}` would. `appear` still runs the enter transition on client-side mounts: `createRoot`, a portal, a Suspense boundary that renders on the client, and anything mounted after hydration.
- **Reason:** server HTML must be usable before hydration (`docs/package-plan.md`). The reference starts an appearing child at exited, so its server HTML holds `<Fade in>` and the other transitions at opacity 0 and visibility hidden until the script runs, a reference defect (`docs/reference-defects.md`).
- **Tests:** "content that is in renders entered and visible, even with appear" (the adapter's and the components'); "hydrating the server HTML raises no error and animates nothing" (the adapter's) and "… changes nothing and animates nothing" (the components'); the behaviour specs' client mounts with `appear`.
