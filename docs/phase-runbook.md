# Phase runbook

How to run one phase of `docs/package-plan.md` in a fresh session. One phase per session. Each ends with a hand-off, and the next starts only when you say go.

## Status

| Phase                                                  | State                               | Tip on `feat/blue-glass` | Review log                |
| ------------------------------------------------------ | ----------------------------------- | ------------------------ | ------------------------- |
| 0. Foundation                                          | Done 21 Oct 2026, two review rounds | `f07c0d9`                | `docs/reviews/phase-0.md` |
| 1. Site set (26)                                       | Done 22 Oct 2026, two review rounds | `432ca83`                | `docs/reviews/phase-1.md` |
| 2. Overlays and feedback (17)                          | Next, waiting for your go           |                          |                           |
| 3. Inputs (11)                                         |                                     |                          |                           |
| 4. Navigation and layout (7)                           |                                     |                          |                           |
| 5. Charts (5), then README, CHANGELOG, release dry run |                                     |                          |                           |

Each session updates its row as its last commit.

## Starting a session

Say "Run phase N, following docs/phase-runbook.md". The session reads, in order:

1. This file.
2. `docs/package-plan.md` (revision 3): the decisions, the Base UI mapping, the suite and the phases.
3. `docs/porting.md`: the brief both attempts get.
4. `docs/deviations.md`, `docs/reference-defects.md` and `tests/README.md`.
5. The previous phase's review log, and the notes for this phase below.

## Steps

1. **Preflight.**
   - Main checkout, on `feat/blue-glass`, clean. If `git status`, `git worktree list` or another session shows someone else working, use a worktree on its own branch and say why.
   - `npm ci`, then every command under "Done means" in `docs/porting.md`, at phase N−1. All green before anything changes.
2. **Open the phase** on branch `phase-N`, from `feat/blue-glass`. This writes the phase's part of the suite, which freezes when the step is committed.
   - `tests/phases.json`: `current` becomes N.
   - Behaviour specs in `tests/behaviour/`, from each in-scope README's Keyboard and props sections. Run them on the reference (`npx vitest run --project behaviour:reference`). A spec that fails there is wrong, or its defect gets a row in `docs/reference-defects.md`.
   - Parity: opened states for overlays and inputs in `tests/parity/states.ts`. Per-preview budgets in `tests/parity/thresholds.json` come only from `npm run parity:self` runs.
   - Server HTML: exceptions in `tests/ssr/exceptions.json` only for the plan's declared ones (NoSsr, Portal and closed popups).
   - Layout: stories whose layout changes with the viewport go in `tests/ssr/layout.json`.
   - API: waivers in `tests/api/allowlist.json` only for deviations already in `docs/deviations.md`.
   - With nothing ported yet, the behaviour, parity, server-HTML, layout and API gates must fail on the phase's modules. Check that, then commit "Open phase N".
3. **Two attempts** from that commit, with the same brief: `docs/porting.md` and the phase's modules. Neither may touch the suite or add dependencies.
   - `phase-N-opus`: Opus subagents at max, each in its own worktree, merged by the session.
   - `phase-N-codex`: Codex (GPT-6 Astra), through the codex plugin.
4. **Choose.** Run the "Done means" list on each attempt yourself; an attempt's own "done" doesn't count.
   - Keep the one that passes. If both pass, keep Opus's, since phases 1–5 are migrations.
   - If neither passes, each gets one more attempt. If both fail again, stop and ask.
   - Never splice the two. Record the outcome in the review log.
5. **Review**, logged in `docs/reviews/phase-N.md` in phase 0's format.
   - Verify first: the whole "Done means" list.
   - Fable at xhigh sees only the phase's diff, specs included. `/codex:adversarial-review` sees the task too.
   - Stand-ins follow your routing rules (Gemini 4 Argon through `argon-review`). Say which model served each review.
   - Check every finding against a failing test or the docs before acting, and log the rejected ones. Two rounds at most.
6. **Hand off.**
   - Fast-forward `feat/blue-glass`, then remove the phase's worktrees and merged branches.
   - Keep the reports the final gate run writes: `reports/parity/index.html` (side by side) and `reports/ssr/index.html`.
   - Update the status table and commit. No AI attribution in commits. Nothing is pushed.
   - Report: the parity report, Storybook (`npm run storybook`), the review log, the model behind each review, and the notes for later phases.

## Traps found in phase 0

- **XO's `--fix` changes meaning:** `null` becomes `undefined`, `window` becomes `globalThis`, and ternaries get folded. Run `npx xo` without `--fix` and fix by hand. The pre-commit hook's `--fix` is harmless once the files are clean.
- **`.gitignore` holds a literal `Icon\r\r` line,** and most editors strip the `\r`. Edit that file byte for byte.
- **Codex's review inlines untracked files** and stops at 1 MB of input. Commit or ignore large files first. Argon stops at 700 KB, so leave the lockfiles out.
- **Reports are overwritten by the last run:** `parity:self` and `parity` both write `reports/parity`.
- **Base UI supports Baseline Widely Available browsers,** so regexes in `src/` use the `u` flag, not `v`.

## Traps found in phase 1

- **Base UI's composite items act on keydown** and check only their own flag. A keydown your handler prevents has to call `preventBaseUIHandler()`, or Space and Enter still press. Base UI's Toggle also swaps an empty `value` for a generated id, and its arrow keys follow its DirectionProvider, not the page's direction.
- **The React Compiler lint skips a component** whose memo depends on a helper's return value. Build memo keys with built-ins such as `.join()`.
- **Don't plant a defect in a worktree while a gate run uses it.** A run that overlaps it can't be trusted, so run it again.
- **A headless session on an API key stops when the credits run out.** Phase 1's stopped mid-review. A lead reviewer that delegates can also end before writing up its own part, so brief reviewers to do the review themselves, and copy their reports out of `/private/tmp`.

## Notes for each phase

- **Phase 1:**
  - Avatar's preview joins the parity gate only in phase 2, since it uses Tooltip.
  - The plan's layout checks name PaneAccordion: its story belongs in `src/components/Accordion/Accordion.stories.tsx`, which `tests/ssr/layout.json` lists.
  - The plan's delayed-hydration tests for the Tabs and Accordion section islands are due.
- **Phase 2:**
  - Open content the reference renders in place (the Modal, Dialog, Drawer and Snackbar examples) must be visible in the server HTML. The gate no longer accepts leaving it out.
  - iOS 26 Safari backdrops: see "iOS 26+ Safari" in Base UI's quick start (`node_modules/@base-ui/react/docs/react/overview/quick-start.md`).
  - `ModalLayer` listens on the page's `document`, so a layer inside an iframe isn't supported. Escape's `onClose` gets the native KeyboardEvent.
  - A non-modal popup already open in body when an in-place modal opens gets hidden with the rest of the page.
  - Stories follow the Controls rules in `stories/README.md`, which the guard in the unit project (`tests/unit/stories.test.ts`) checks. An overlay's Default lists `open`, held in `LiveArg` and passed to `useArgs`: its own dismissal (Escape, the backdrop, a close button) calls `onClose`, which logs and sets it back to false. Check the docs page too, where Storybook drops `updateArgs`. Check once in `npm run storybook` that a control change, a click and a dismissal each update the panel.
- **Phase 3:** Checkbox, Radio and Switch follow deviations 1 to 6. Deviation 6 (a Radio outside a RadioGroup) is the gap to watch.
- **Phase 5 and release:**
  - The packed `package.json` still carries `"prepare": "husky"`. Strip it before publishing.
  - The `dist` source maps point to `src`, which isn't shipped. Ship it or drop the maps.
  - The package stays `private: true` until you pick a registry. The CI workflow isn't pushed.
