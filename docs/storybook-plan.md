# Storybook controls and viewports

A step between phases 1 and 2. Phase 1's stories render fixed JSX with `render: () => …`, so the Controls panel lists every prop and changing one does nothing. No viewports are configured, and the toolbar's defaults miss the 390px phone the gates use. The brief (`stories/README.md`) produces the same thing, so phase 2 would copy it.

Revision 2, after Codex's attack (end of file).

## Controls

- **Default drives the args.** Each component's `Default` story sets `args` to the props its preview gives one chosen instance, and `parameters.controls.include` lists exactly those that act. Everything else stays out of the panel. The docs page's ArgTypes table still shows every prop.
  - The chosen instance is the one the README documents: the `meta.component` instance, or the root of a compound component (Tabs, Accordion, ToggleButtonGroup, List, Table, Card). A prop its parent owns, like a grouped ToggleButton's `selected`, is never listed.
  - The instance renders with the preview's copy and layout. The other instances keep the preview's props, and a helper that renders Default (`SiteSections`, `Outcomes`, `CareerRow`) takes the args and passes them on.
- **State goes through `useArgs`.** A stateful prop is listed in its controlled form (`value`, `expanded`, `selected`, and in phase 2 `open`), with its preview's default as the arg. The handler logs through `fn()` and calls `updateArgs`, so a click and the panel stay in sync. `default*` props are never listed, since `useControlled` reads them only at mount. `useArgs` works in a composed story rendered in Node (probed with `renderToString`), so the layout gate and the Vitest project are unaffected.
- **Handlers** are `fn()` args, so the Actions panel logs them, and they stay out of `include`.
- **Every other story** sets `parameters.controls.disable: true`, whatever its `render` looks like.
- **No Controls** for the sections, Foundations, and components whose Default has nothing to control (useMediaQuery, a hook). Controls are off at the meta, and each is listed with its reason in the guard's allowlist.

## Viewports

- `scripts/lib/viewports.ts` holds phone 390×844 and desktop 1280×900. `scripts/lib/capture.ts` re-exports it, and `.storybook/preview.tsx` turns it into `parameters.viewport.options`, adding a tablet at 834×1112. The toolbar's default stays responsive.
- **Phone twins.** Each file in `tests/ssr/layout.json` gets a twin of its viewport-dependent story: the 5 sections' Default, Tabs' Example and Accordion's Variants. The twin spreads the story, pins `globals.viewport` to `phone`, keeps the preview's Controls off, and is tagged `!autodocs`, which keeps it off the docs page because the Stories block shows only autodocs-tagged stories. addon-vitest resizes the browser to the twin, so axe also runs at 390px.

## Guard

The guard is `tests/unit/stories.test.ts`, in the unit project, Node. It composes every stories file with the preview's annotations, as `scripts/ssr/layout.ts` does, and checks behaviour, not code shape:

- **Default:** `controls.include` is non-empty. For each listed arg, rendering with a changed value changes the server HTML. A boolean flips, an option takes another value, a string gets a suffix, a number moves.
- **Other stories:** Controls are disabled on every story except Default, inherited annotations included.
- **Viewports:** each `layout.json` file has a story pinned to `phone`, and the preview's viewport options equal the capture sizes.
- **Allowlist:** a no-Controls file, or an arg whose effect shows only after hydration, needs a row with its reason. Rows must name files and args that exist.
- **Fixtures** in `tests/unit/fixtures/stories.tsx`:
  - must fail: an ignored arg, an arg overridden after the spread, a destructured-and-dropped arg, a group-owned prop, a non-Default story with Controls on;
  - must pass: an inherited meta `render`, a wrapping helper. (`(args = {}) =>` moved to must-fail in round 1: Storybook gives it no Controls.)
- It must fail on phase 1's stories before the retrofit.

## Brief

- `stories/README.md`: these rules, and a template whose Default lists its args, bridges state with `useArgs`, and turns Controls off on the rest.
- `tests/README.md`: a row for the guard.
- Runbook, a note for phase 2: an overlay's Default lists `open`, and its own dismissal (Escape, backdrop, close button) sets the arg back to false through `updateArgs`. Check once by hand that a control change, a click and a dismissal each update the panel.

## Process

1. Branch `storybook-controls` from `feat/blue-glass`, in the main checkout, since nothing else is working in this repo.
2. Viewports, the guard and its fixtures first. See the guard fail on phase 1, then retrofit the 31 stories files myself, as a single attempt.
3. Verify:
   - the whole "Done means" list at phase 1;
   - then by hand in `npm run storybook`: Controls on Button, Tabs and ToggleButton, in both directions (a control change and a click), and the phone toolbar size on Hero and Tabs.
4. Reviews: Fable at xhigh sees only the diff, and `/codex:adversarial-review` sees the task too. Two rounds at most, logged in `docs/reviews/storybook.md`.
5. Fast-forward `feat/blue-glass` and add a runbook row. Nothing is pushed, and phase 2 waits for your go.

## Codex's attack on revision 1 (GPT-6 Astra)

| Severity | Finding                                                                                                                 | Checked against                                                                                    | Change                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| high     | `default*` controls go dead after mount, and controlled props with only `fn()` freeze interactions.                     | `useControlled` (`src/internal/hooks.ts:102`) fixes the mode and reads the default once. Accepted. | State goes through `useArgs`; `default*` is never listed.                                  |
| medium   | The arity check passes `(_args) => fixed` and rejects `(args = {}) => …`, and an omitted `render` skips inherited ones. | JavaScript's `Function.length`. Accepted.                                                          | A behavioural guard: each listed arg must change the server HTML. Fixtures for both sides. |
| medium   | In a group, the first ToggleButton's `selected` is the group's, so its control is dead.                                 | `ToggleButton.tsx:197`: in a group, the group's value decides. Accepted.                           | Args go to the compound root; `controls.include` never lists a parent-owned prop.          |
