# Storybook gate, and opening phase 2

You chose on 22 Oct 2026 to turn the Storybook step's scratch browser check (`.cache/ui-check.ts`) into a gate before phase 2's suite freezes. The unit guard (`tests/unit/stories.test.ts`) renders each story once in Node, so it can't see a story break after a click, a portalled overlay's `open` (empty in server HTML), or a Default frozen on its docs page. The Storybook step's round 1 shipped exactly such a crash, which only the scratch check caught.

Revision 2, after Codex's attack (end of file).

## The gate: `npm run check:storybook`

`scripts/storybook/run.ts` serves `storybook-static` (built by `npm run build-storybook`, the step before it in "Done means") with a small `node:http` server, and drives it in Chromium through Playwright, which the repo already has. No new dependency.

**Scope.** From `storybook-static/index.json`: the stories files of the modules in scope by `tests/phases.json`, plus `stories/` (sections, foundations). Each in-scope module must have a stories file with a Default, or a `noControls` row in `tests/unit/stories.json`. A missing one fails.

**Observing a story.** A snapshot is the markup of the story root and of every node portalled into `body`, the live `value` and `checked` of its form controls, and every element's box rounded to the pixel. So inline styles, SVG attributes, positions and textarea heights count, not only text.

- **Ready:** the gate subscribes to the preview's channel before it acts. A story is ready after its `storyRendered` event; a panel edit has landed after the `storyArgsUpdated` that matches the story and the args.
- **Settled:** then the snapshot must stay the same for 300ms, within 5s. A story that never settles fails, with the last two snapshots' difference.
- **Expectations poll** until they hold or 5s pass, so hover delays and transitions are waited for, never slept. A `wait` step is allowed only for a timer the README documents (Snackbar's auto-hide).
- Pages run four at a time, each in its own browser context.

**Checks, every story in scope:**

1. **Renders.** The canvas and the docs page open with no page error and no console error. Every check below also fails on any error it causes.
2. **Panel.** Default's Controls tab lists exactly its `controls.include`, read from the preview's story store. Every other story lists none.
3. **Controls act.** For each listed control, every value the panel offers besides the current one (each radio or select option, the flipped checkbox, a text with a suffix, a number plus one) is set through the panel, and the settled snapshot must differ from the settled initial one. The story reloads with its initial args between values. This is where an `afterHydration` arg proves itself.
4. **Interactions,** declared in `tests/storybook/interactions.ts` for each stateful Default (one listing `value`, `expanded`, `in` or `open`). Each entry names the story, its arg and steps. A step is an action (`click`, `hover`, `focus`, `press` or `wait`, in the Playwright selector syntax of `tests/parity/states.ts`, by role and name) and what follows it: the arg's value, and the selectors shown or gone. The gate runs the steps:
   - on the canvas: after each step the panel's control shows the expected value;
   - on the canvas after a panel change: the story follows the panel, and the next step still syncs (the race round 2 of the Storybook step found);
   - on the docs page: the Default's block shows and hides the same things, with selectors resolved inside the block first, then in `body` for portals. Then the gate moves to the Default's canvas through the manager's sidebar, without reloading the preview, and the panel must show the initial value: a docs page must not write the args.
5. **Toolbar.** It offers Phone, Tablet and Desktop; each phone twin opens 390px wide with the toolbar locked to Phone; no twin is on a docs page.

**Qualifying the entries before they freeze.** A component's docs page shows its stories in the preview's order, as the preview page shows its sections, and the Default story renders the preview's "Default" section. So `--self` also runs every entry's actions and shown or gone selectors on the reference's preview page, scoped to its "Default" section, with the other sections open beside it as they are on the docs page. An entry that fails there is wrong, which catches a dismissal that reaches another section's layer. Only the arg half can't run before the stories exist; if an attempt finds an entry wrong, it says so in its report, as with a wrong spec.

**Self-test, `--self`.** Defects are planted at runtime through Playwright init scripts, so nothing is rebuilt. Each names its target story, its frame (canvas or docs) and the check it must fail. It counts only if the injection reports that it ran, the named check fails on the target story and nowhere it didn't in the clean run, and an untouched control story stays clean:

- the preview drops the panel's arg updates (a control that does nothing: check 3, Button);
- the story's `updateArgs` never reaches the panel (a click the panel doesn't follow: check 4, Tabs);
- the first click inside a story throws (check 4, Accordion);
- clicks inside a docs page's story blocks are swallowed (a frozen docs Default: check 4, ToggleButton);
- a docs page writes its change to the args (check 4, Tabs);
- one listed control is hidden from the panel (check 2, Button).

**Output.** One PASS or FAIL line per check, `reports/storybook/results.json`, exit code 1 on any failure. Phase 1's 88 stories should take under five minutes.

**Phase 1's entries:** Tabs, ToggleButton, Accordion and Transitions, carried over from the scratch check.

## Where it lands

All in the "Open phase 2" commit, so it freezes with the suite:

- `scripts/storybook/run.ts` and its server in `scripts/lib/`, off limits like the other gates.
- `tests/storybook/interactions.ts` with the phase 1 and phase 2 entries.
- `docs/porting.md`: "Done means" gains `npm run check:storybook` after `build-storybook`. `tests/README.md` gets a row. `stories/README.md`'s "open both in `npm run storybook` once" becomes "the gate checks it", and the runbook's phase 2 note drops the manual check. The CI workflow gains the step.
- Proof before the commit: at phase 1 on `feat/blue-glass` it passes, Icon's `size` and `strokeWidth`, Box's padding and Stack's `spacing` included, and the self-test catches all six defects and qualifies every entry on the reference; at phase 2 with nothing ported it fails on the 17 missing stories files.

## Opening phase 2, the rest

As `docs/phase-runbook.md` step 2 says, with these specifics:

- **Spec writers:** five Opus agents at max, each in its own worktree and branch from the phase-2 tip, with phase 1's brief minus lint (one XO and Prettier pass at the merge):
  1. Modal, Backdrop and Portal (the modal-flags adapter's eight cases, nested layers, Escape's native event);
  2. Dialog and Drawer;
  3. Menu, Popover and ClickAwayListener (the two-mode MenuItem, `anchorEl`);
  4. Tooltip, Popper and Snackbar;
  5. Alert, Progress, Skeleton, Badge, NoSsr and TextareaAutosize.
- Each writer also hands back, for its modules, the parity opened states (the overlay opened, a Menu item highlighted, a Tooltip on focus) and the gate's interaction entries, which the session merges into `tests/parity/states.ts` and `tests/storybook/interactions.ts`.
- **Parity budgets** come only from `npm run parity:self` runs. Avatar's preview joins now, since Tooltip exists.
- **Server HTML:** `tests/ssr/exceptions.json` gains only the plan's declared ones: Portal, and closed popups. Open in-place content (the Modal, Dialog, Drawer and Snackbar examples) must show.
- **Layout:** a phase 2 stories file joins `tests/ssr/layout.json` only if its preview's layout changes with the viewport (Dialog's full screen and Drawer's bottom sheet are the candidates to check).
- **API waivers:** none expected; deviations 7 and 8 change behaviour, not types.
- Then the runbook's check: with nothing ported, the behaviour, parity, server-HTML, layout, API and Storybook gates fail on the phase's modules. Commit "Open phase 2".

## Not in scope

The gate doesn't judge looks (parity does), accessibility (the Vitest storybook project runs axe), or server HTML (the unit guard and `check:ssr`). It runs the built Storybook, not `storybook dev`.

## Codex's attack on revision 1 (GPT-6 Astra)

Verdict: needs attention. All five findings were checked and accepted.

| Severity | Finding                                                                                                                                          | Checked against                                                                        | Change                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| high     | Comparing text, ARIA and classes rejects working controls: Icon's `size` and `strokeWidth`, Box's padding, Stack's `spacing`.                    | `Box.tsx:164` sets an inline style; `Icon.tsx:224` sets SVG `width`. Accepted.         | The snapshot is the full markup, form values and boxes. Those four controls are in the phase 1 proof.                                    |
| high     | On a docs page every story renders, so Modal's Default and Variants are both open, and only the top layer hears Escape or a backdrop click.      | `componentDocs` renders `<Stories>`; `modal.tsx` reports only the top layer. Accepted. | Every entry is qualified on the reference's preview page, where the other sections are open too.                                         |
| medium   | No defined moment to observe: fixed sleeps, a rerender still queued after `storyArgsUpdated`, transition timers, Tooltip's 500ms delay.          | The scratch check sleeps 300 to 1500ms. Accepted.                                      | Ready on `storyRendered` and the matching `storyArgsUpdated`, settled for 300ms, expectations polled, `wait` only for documented timers. |
| medium   | "Any new failure" doesn't prove a planted defect was caught: an unrelated error, or a hook that breaks both directions, would count.             | `islands.ts` requires each mutation's own problem. Accepted.                           | Each defect names its story, frame and check, must report that it ran, and a control story must stay clean.                              |
| medium   | Opening a fresh canvas after the docs page reloads the preview, which hides a docs page writing its args (the Storybook step's round 2 finding). | The scratch check's `open()` calls `page.goto`. Accepted.                              | The gate moves to the canvas through the sidebar, without a reload, and a sixth planted defect writes the args from the docs page.       |
