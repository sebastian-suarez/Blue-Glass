# Storybook controls and viewports reviews

A step between phases 1 and 2, planned in `docs/storybook-plan.md`. Phase 1's stories rendered fixed JSX, so the Controls panel offered props that did nothing, and no viewport matched the gates' phone. The diff runs from `d88ed08`, on branch `storybook-controls`.

## The plan, 22 Oct 2026

Codex (GPT-6 Astra) attacked revision 1 of the plan: three findings, all accepted. They're in the plan's own table, and revision 2 answers them: state through `useArgs`, a guard that renders instead of reading arity, and args on a compound component's root. You chose a single attempt.

This step overturns a rejection in phase 1's log: "Chip's, ToggleButton's and Icon's stories hold args their renders ignore … no gate reads controls." A gate reads them now.

## Round 1, 22 Oct 2026

- **Verification first.** All 12 "Done means" commands passed on `5b7a3f5`. Every one of the 81 existing stories rendered the same server HTML as before (a before-and-after snapshot), and each of the 7 phone twins matched its source. A scripted pass through the built Storybook passed 13 of 13 checks: the panel, clicks, the toolbar and the docs page.
- **Code-only review: Fable** (xhigh). It saw only `d88ed08..5b7a3f5`, and ran the guard, the typecheck and Tabs' stories.
- **Task-aware review: Codex** (GPT-6 Astra), `/codex:adversarial-review` against `d88ed08`.
- Both returned findings, each checked against Storybook's installed code, a run, or the repo's docs before acting.

| #   | From           | Finding                                                                                                            | Check                                                                                                              | Disposition                                                                                                                                                                            |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Codex (high)   | Tabs', Accordion's, ToggleButton's and Transitions' Defaults freeze on their docs pages, which ignore `updateArgs` | Clicked in the built Storybook: Tabs stayed on Work, Code stayed unpressed, the row stayed open, "Hide all" stayed | Fixed (`15dd571`): `LiveArg` (`stories/blocks/live-arg.tsx`) holds the value and passes changes to `updateArgs`. All four now respond on their docs pages                              |
| 2   | Codex (medium) | The guard passes a mount-only `default*` arg, and invents a value for a one-option enum                            | Read in `controlProblems`                                                                                          | Fixed: both fail, with fixtures                                                                                                                                                        |
| 3   | Codex (medium) | The guard can't find a `memo` or `forwardRef` component's props                                                    | `docs/porting.md` bans `forwardRef`; `memo` isn't banned                                                           | Fixed for both at little cost: the guard reads the wrapped function's name. A `memo` fixture passes                                                                                    |
| 4   | Fable (medium) | The guard passes `(args = {}) =>`, which Storybook gives no Controls (`__isArgsStory = render.length > 0`)         | Read in Storybook 10.6.3's `preparePartialAnnotations`; `((p = {}) => 0).length` is 0                              | Fixed: Default's render must take args. The fixture moved to must-fail, and the plan's must-pass line says why. Revision 1's arity check was right on this point, and so was Storybook |
| 5   | Fable (low)    | ToggleButton's group-level controls carry the button's descriptions                                                | Read: `meta.component` is ToggleButton                                                                             | Fixed: `value`, `orientation`, `size`, `disabled` and `fullWidth` describe the group                                                                                                   |
| 6   | Fable (low)    | Icon's `size` gets a JSON editor, not a number input                                                               | Listed every Default's control types in the built panel: `size` and `strokeWidth` were textareas                   | Fixed for both: `control: "number"`. Every other control was already a radio, select, checkbox, text or number input                                                                   |
| 7   | Fable (low)    | The guard tries only one other option; an unset listed arg passes; a twin on the docs page passes                  | Read                                                                                                               | Fixed: every option must change the render, a listed arg needs a value, and a twin tagged for docs fails. Fixtures for each                                                            |
| 8   | Fable (low)    | The plan said the fixtures are a folder and the twins disable Controls                                             | Read                                                                                                               | Fixed in the plan                                                                                                                                                                      |

Found while fixing:

- **Storybook's hooks and React's can't share one render function.** The first fix for #1 put React's `useState` in the render beside `useArgs`. It threw "Storybook preview hooks can only be called inside decorators and story functions" on the first click. The guard, the HTML snapshot and the axe run all render once, so none of them saw it. The scripted pass through Storybook did, so it now fails on any console error, clicks again after each control change, and checks the docs pages. `LiveArg` keeps React's state in a child component instead.

### Rejected

- **An arg routed only into a hidden element passes the guard** (Codex, medium). The guard proves an arg reaches the server HTML. Proving that a reader sees the change would mean a browser oracle for each story. `tests/README.md` now states the limit, and `stories/README.md` asks for a check in Storybook.
- **The layout gate renders each twin again at both widths** (Fable, low). The twins render byte for byte like their sources, so the result can't differ. The cost is 23 seconds of `check:layout`, and leaving the gate unchanged keeps its self-test as it was.
