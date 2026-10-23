# Phase 3 brief: the inputs

The attempt at phase 3 works from this brief, `docs/porting.md` and the frozen suite, in its own worktree on branch `phase-3-codex`, from the "Open phase 3" commit. Your prompt names the worktree.

## Read first, in this order

1. `docs/porting.md`: how a module is ported, the rules, what's off limits, and "Done means". It is the brief; follow it exactly.
2. `docs/package-plan.md`: the decisions and the Base UI mapping, with "Form controls run on Base UI, with recorded deviations" and "Events".
3. `docs/deviations.md` (entries 1 to 6 concern this phase: the form-control adapter's) and `docs/reference-defects.md` (don't port the reference's faults; its phase 3 rows name tests the package must pass).
4. `tests/README.md`: every gate and what fails it. Then `stories/README.md`: how stories are written, with the Controls rules.
5. The traps and the phase 3 notes in `docs/phase-runbook.md`.
6. The doc comments and tests of the adapters in `src/internal/` before you write your own versions of anything they already do: `form-control.tsx` (Checkbox, Radio and Switch on Base UI, behind the documented input API), `popup-layer.tsx` and `anchor.ts` (the transparent modal layer and the pixel placement Popover and Menu use), `modal.tsx` (its in-place host, which puts an open layer in the server HTML), `events.ts`, `transition.ts`, `hooks.ts`. Then the phase 2 ports a phase 3 module builds on: `src/components/Popover`, `Popper`, `TextareaAutosize`, `Transitions` (Zoom and Grow), and `Button`, `Icon`, `Paper`, `Chip` from phase 1. Base UI's docs are in `node_modules/@base-ui/react/docs/react/components/`: `field.md`, `input.md`, `select.md`, `combobox.md`, `autocomplete.md`, `slider.md`, `checkbox.md`, `radio-group.md`, `switch.md`, `checkbox-group.md`.

## Scope

Modules (folders in `design-system/components/`): TextField, Select, Autocomplete, Checkbox, RadioGroup, Switch, Slider, Rating, TransferList, Fab and SpeedDial. Each has a section in the reference bundle, so each gets `<Name>.css` and its import in `src/styles/index.css`, in the bundle's order (the build checks it).

Some modules build on others, so port those first: TextField's field shell (`FieldBaseProps`, the label, helper and error wiring, `InputAdornment`) serves Select and Autocomplete; Fab serves SpeedDial. The reference shares `design-system/shared/_inputs-b-field.tsx` and `_inputs-b-list.ts` between the fields and TransferList: port what the plan's Base UI mapping doesn't cover into `src/internal/`, once.

The Base UI mapping for this phase (`docs/package-plan.md`): TextField and InputAdornment on Field and Input; Select and Option on Select (`native` stays a `<select>`); Autocomplete on Combobox and Autocomplete; Slider on Slider; Checkbox, Radio and Switch on the form-control adapter; Rating on RadioGroup; TransferList on CheckboxGroup. Fab and SpeedDial are plain React ports. A deviation from the mapping needs its reason in your report.

The frozen suite for this phase: `tests/behaviour/*.test.tsx` (one file per module: `text-field`, `select`, `autocomplete`, `checkbox`, `radio-group`, `switch`, `slider`, `rating`, `transfer-list`, `fab`, `speed-dial`), the opened states in `tests/parity/states.ts`, `tests/storybook/interactions.ts`, the layout stories in `tests/ssr/layout.json` (TransferList's stories file joins this phase, so it needs a phone twin), and `tests/phases.json` at `"current": 3`.

## Rules that matter most

- `docs/porting.md`'s rules, all of them. Base UI where the plan maps a module to it; a faithful port of `reference.tsx` everywhere else, including the parts of a Base UI-backed module that Base UI doesn't cover (Select's chips, Autocomplete's match highlight and groups, Rating's hover preview and half stars, TransferList's move buttons and status).
- **Server HTML is usable before hydration.** Select's Default opens its list in place at load (`defaultOpen` with `PopoverProps={{ disablePortal: true }}`), and the reference's server HTML holds that list, hidden behind its `<Fade in>` defect; the gate requires the package to show it (`tests/README.md`, "Server HTML": what the reference held, even hidden, the package must show). Base UI's portal renders nothing on the server (deviation 10), so an open Select in place needs its own server path, as `ModalLayer` has for an in-place modal (`src/internal/modal.tsx`). SpeedDial's open dial at load (the Default and the four Variants) must show its actions and label pills: Zoom through `src/internal/transition.ts` renders `in` content visible on the server (deviation 9). Autocomplete's lists are absent from the reference's server HTML too, so they may be absent from the package's. Everything else in this phase is static markup.
- **The form controls** run on `src/internal/form-control.tsx`. Keep its tests green and unchanged. Add contract tests on the components, in `src/components/<Name>/<Name>.test.tsx` (the `browser` project), that pin deviations 1 to 6 on Checkbox, Radio and Switch as `docs/package-plan.md` asks: the ref's element, event targets, attribute forwarding, focus and blur, and that validation and `FormData` still work. Deviation 6 (a Radio outside a RadioGroup) is the gap to watch: a lone Radio is a one-radio group, and its `checked`, `defaultChecked`, `onChange(event, true)` and form value must work.
- **Events.** Where the documented callback takes a React event and one exists, pass it (TextField's `onChange` gets the input's ChangeEvent). Where Base UI reports a change with no React event behind it, use the adapters in `src/internal/events.ts` and the ChangeEvent-shaped wrapper of `form-control.tsx`. The behaviour specs say what each callback must receive; read them before you choose.
- **Placement.** Select's list and Autocomplete's popup sit on the shared popover material (`gl-popover`). To land on the reference's pixels, place through `src/internal/anchor.ts` (`toPositionerProps`, `toWholePixelOffsets`) as Popover and Menu do; Select's `PopoverProps` (`disablePortal`, `disableScrollLock`, `container`) go to the layer `src/internal/popup-layer.tsx` gives.
- **Type.** The system's typeface is Satoshi, named first in `--font-sans`. Use the tokens and the `text-*` classes; add no font files and no `@font-face` to `src/`. The gates, Storybook and the specs load it from `fonts/`, which `npm run fonts` fills (done in your worktree).
- **Stories.** Every Default renders its preview's "Default" section and follows `stories/README.md`'s Controls rules. Read `tests/storybook/interactions.ts` before writing a Default: the Storybook gate replays those steps and looks for the roles and names they name. A stateful Default lists its controlled prop through `LiveArg` with the preview's default as its arg, and logs its callbacks: Checkbox's and Switch's `checked` (true), RadioGroup's `value` ("node"), Rating's `value` (4), Select's and Autocomplete's `open` (true, the list open in place as the preview opens it) and SpeedDial's `open` (true); `onClose`, a choice and the other dismissals set `open` back to false. Select's and Autocomplete's Defaults may list `value` and `inputValue` as well. TextField's and Slider's Defaults list `value` through `LiveArg` too. TextField, Slider and Rating have no interaction entry (the comment in `interactions.ts` says why), so the Controls check alone proves their `value`. TransferList's `value` is an object, so its Default lists its other props (the titles, `showMoveAll`, `listHeight`, `disabled`). Fab's lists `variant`, `size`, `extended`, `disabled` and its `aria-label` as a text control. If an arg changes nothing in the server HTML, list it under `afterHydration` in `tests/unit/stories.json` with that reason. TransferList's stories file needs a phone twin (`tests/ssr/layout.json`).
- The adapters in `src/internal/` may change, but their own tests there are part of the suite: keep them unchanged and green (`npx vitest run --project unit` and `--project browser`).
- Never edit the frozen suite, the gates in `scripts/`, `design-system/`, or the dependencies. If a spec, a budget, an interaction entry or a gate looks wrong, say so in your report with the evidence instead of working around it.
- Record each module once it's ported: `node scripts/check-sync.ts --record <Name>`.
- Check your work with the commands below and "Done means"; don't add review rounds, planted defects or throwaway prototypes of your own, and don't run any review script: the session reviews the result.
- Don't commit and don't stage: the session commits your worktree when you report.
- No AI attribution anywhere: comments, docs. Reference copy that names tools, such as a preview's text, is the site owner's content: keep it word for word.

## How to check your work

- `npx vitest run --project behaviour:package tests/behaviour/<name>.test.tsx` (the same spec on the reference: `--project behaviour:reference`, after `npm run reference`).
- `npm run reference && node scripts/parity/run.ts --only components/<Name>`: the report is in `reports/parity/index.html`, with reference, candidate and diff images per preview and state.
- `npm run build && npm run reference && node scripts/ssr/run.ts --only components/<Name>`.
- `npm run check:api`, then read the lines for your modules.
- `node scripts/ssr/layout.ts` (the stories in `tests/ssr/layout.json`). It stops at the first missing listed file, so it runs once TransferList's stories file exists; until then `npx vitest run --project unit tests/unit/stories.test.ts` checks the twin.
- `npx vitest run --project storybook` renders every story and fails on any axe violation.
- `npm run build-storybook && node scripts/storybook/run.ts --only <story ids>` drives the built Storybook for those stories and their docs pages. Story ids are the title's group and name, lower case: `inputs-select--default`, `navigation-speeddial--default`.
- Run the gates one at a time: they time out on harness steps when they share the machine.

## Report (your final message)

- What you ran and the result, pass or fail, with the failing lines.
- Every deviation you added to `docs/deviations.md`, and any spec, budget, interaction entry or gate you believe is wrong, with evidence.
- Where you departed from the Base UI mapping, and why.
- What's left undone, if anything.
