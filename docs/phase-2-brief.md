# Phase 2 brief: the overlays and feedback

Both attempts at phase 2 work from this brief, `docs/porting.md` and the frozen suite. Each continues from its own draft: the attempts first started on 22 Oct 2026, stopped when the type switched to Satoshi, and kept their work as `p2-draft1-*` branches. Your prompt names your branch, your draft and your base commit.

## Read first, in this order

1. `docs/porting.md`: how a module is ported, the rules, what's off limits, and "Done means". It is the brief; follow it exactly.
2. `docs/package-plan.md`: the decisions and the Base UI mapping, with "Modal flags" and "MenuItem has two modes".
3. `docs/deviations.md` (entries 7 to 9 concern this phase) and `docs/reference-defects.md` (don't port the reference's faults; its phase 2 rows name tests the package must pass).
4. `tests/README.md`: every gate and what fails it, with the Storybook gate and the fonts, both new this phase. Then `stories/README.md`: how stories are written, with the Controls rules.
5. The traps and the phase 2 notes in `docs/phase-runbook.md`.
6. The doc comments and tests of the adapters in `src/internal/` (`modal.tsx`, `anchor.ts`, `events.ts`, `menu-item.tsx`, `transition.ts`, `hooks.ts`) before you write your own versions of anything they already do, and the modules already in your base. Base UI's docs are in `node_modules/@base-ui/react/docs/react/`; for iOS 26 Safari backdrops read "iOS 26+ Safari" in `overview/quick-start.md`.

## Scope

Modules (folders in `design-system/components/`): Portal, Popper, Popover, Modal, Backdrop, ClickAwayListener, NoSsr, TextareaAutosize, Dialog, Drawer, Menu, Tooltip, Snackbar, Alert, Progress, Skeleton and Badge. Also Avatar's Example story, which phase 1 left out for want of Tooltip.

Some previews use other phase 2 modules, so port those first: Dialog's uses TextareaAutosize, Snackbar's uses Alert and CircularProgress, and Avatar's uses Tooltip. Whoever ports Tooltip also owns Avatar's parity and server-HTML rows, and adds Avatar's Example story to `src/components/Avatar/Avatar.stories.tsx` (its section and note are in `design-system/components/Avatar/preview.html`).

The frozen suite for this phase: `tests/behaviour/*.test.tsx` (one file per module), the opened states in `tests/parity/states.ts`, `tests/storybook/interactions.ts`, the layout stories in `tests/ssr/layout.json` (Dialog's and Snackbar's stories files join this phase, so each needs a phone twin), and `tests/phases.json` at `"current": 2`.

## Rules that matter most

- `docs/porting.md`'s rules, all of them. Base UI where the plan maps a module to it (Modal and Dialog through the modal-flags adapter, Drawer, Popover with `anchorEl` mapped to `anchor`, Menu with the two-mode MenuItem, Tooltip, Progress, and Snackbar if Toast fits its controlled API); a faithful port of `reference.tsx` everywhere else.
- **Stylesheets.** Nine modules have a section in the reference bundle, so each gets `<Name>.css` and its import: Dialog, Drawer, Menu, Tooltip, Snackbar, Alert, Progress, Skeleton and Badge. The other eight (Portal, Popper, Popover, Modal, Backdrop, ClickAwayListener, NoSsr, TextareaAutosize) have none: their `styles.css` is only a note, and their look is the shared overlay rules in `foundation.css` (`.gl-modal`, `.gl-backdrop`, `.gl-popover`). Give them no stylesheet and no import, since the build rejects both; if Base UI's DOM needs a selector moved, change it in `src/styles/foundation.css`.
- Server HTML is usable before hydration: open content renders visible (the Modal, Dialog, Drawer, Backdrop and Snackbar examples the reference renders in place, hidden behind its `<Fade in>` defect, must show), viewport-dependent layout comes from CSS, ids from `useId` in `src/internal/hooks.ts`.
- **Type.** The system's typeface is Satoshi, named first in `--font-sans`. Use the tokens and the `text-*` classes; add no font files and no `@font-face` to `src/`, since its licence forbids shipping them. The gates, Storybook and the specs load it from `fonts/`, which `npm run fonts` fills.
- **Escape's event.** Modal's, Dialog's and Drawer's specs require Escape's native KeyboardEvent itself (`tests/behaviour/drawer.test.tsx`, line 348). `ModalLayer` passes it (`src/internal/modal.tsx`); a Drawer on Base UI's own root must pass Base UI's `details.event` for `escape-key` rather than wrap it. Menu's, Popover's, Tooltip's and Snackbar's specs accept the native event or a SyntheticEvent around it, which `src/internal/events.ts` makes, as their documented types allow.
- **Stories.** Every Default renders its preview's "Default" section and follows `stories/README.md`'s Controls rules. An overlay's Default lists `open` through `LiveArg` and logs its callbacks: Modal, Dialog, Drawer, Popover, Menu, Tooltip and Snackbar set it back to false from `onClose`, and Backdrop from its `onClick`. Portal's Default lists `disablePortal`, and Popper's `placement`, through `LiveArg`, set by their sections' toggles and placement buttons. If a portalled overlay's `open` changes nothing in the server HTML, list it under `afterHydration` in `tests/unit/stories.json` with that reason. Read `tests/storybook/interactions.ts` before writing a Default: the Storybook gate replays those steps and looks for the copy and roles they name.
- The adapters in `src/internal/` may change, but their own tests there are part of the suite: keep them unchanged and green (`npx vitest run --project unit` and `--project browser`).
- Never edit the frozen suite, the gates in `scripts/`, `design-system/`, or the dependencies. If a spec, a budget, an interaction entry or a gate looks wrong, say so in your report with the evidence instead of working around it.
- Check your work with the commands below and "Done means"; don't add review rounds, planted defects or throwaway prototypes of your own. The session reviews the result.
- No AI attribution anywhere: commit messages, comments, docs. Reference copy that names tools, such as a preview's text, is the site owner's content: keep it word for word.
- Commit as you go, in small commits whose messages say what changed and why, in sentence case.

## How to check your work

- `npx vitest run --project behaviour:package tests/behaviour/<name>.test.tsx` (the same spec on the reference: `--project behaviour:reference`, after `npm run reference`).
- `npm run reference && node scripts/parity/run.ts --only components/<Name>`: the report is in `reports/parity/index.html`, with reference, candidate and diff images per preview and state.
- `npm run build && npm run reference && node scripts/ssr/run.ts --only components/<Name>`.
- `npm run check:api`, then read the lines for your modules.
- `node scripts/ssr/layout.ts` (the stories in `tests/ssr/layout.json`). It stops at the first missing listed file, so it can only run once Dialog's and Snackbar's stories files both exist; until then `npx vitest run --project unit tests/unit/stories.test.ts` checks each phone twin.
- `npx vitest run --project storybook` renders every story and fails on any axe violation.
- `npm run build-storybook && node scripts/storybook/run.ts --only <story ids>` drives the built Storybook for those stories and their docs pages. Story ids are the title's group and name, lower case: `feedback-dialog--default`.

## Report (your final message)

- Your branch and its last commit hash.
- What you ran and the result, pass or fail, with the failing lines.
- Every deviation you added to `docs/deviations.md`, and any spec, budget, interaction entry or gate you believe is wrong, with evidence.
- What's left undone, if anything.
