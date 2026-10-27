# Phase runbook

How to run one phase of `docs/package-plan.md` in a fresh session. One phase per session. Each ends with a hand-off, and the next starts only when you say go.

## Status

| Phase                                                  | State                               | Tip on `feat/blue-glass` | Review log                  |
| ------------------------------------------------------ | ----------------------------------- | ------------------------ | --------------------------- |
| 0. Foundation                                          | Done 21 Oct 2026, two review rounds | `f07c0d9`                | `docs/reviews/phase-0.md`   |
| 1. Site set (26)                                       | Done 22 Oct 2026, two review rounds | `432ca83`                | `docs/reviews/phase-1.md`   |
| Storybook controls and viewports (between 1 and 2)     | Done 22 Oct 2026, two review rounds | `b11d4fd`                | `docs/reviews/storybook.md` |
| 2. Overlays and feedback (17)                          | Done 22 Oct 2026, one review round  | `1879bb1`                | `docs/reviews/phase-2.md`   |
| 3. Inputs (11)                                         | Done 26 Oct 2026, two review rounds | `994392d`                | `docs/reviews/phase-3.md`   |
| 4. Navigation and layout (7)                           | Next, waiting for your go           |                          |                             |
| 5. Charts (5), then README, CHANGELOG, release dry run |                                     |                          |                             |

Each session updates its row as its last commit.

## Starting a session

Say "Run phase N, following docs/phase-runbook.md". The session reads, in order:

1. This file.
2. `docs/package-plan.md` (revision 3): the decisions, the Base UI mapping, the suite and the phases.
3. `docs/porting.md`: the brief the attempt gets, with the phase's own `docs/phase-N-brief.md`.
4. `docs/deviations.md`, `docs/reference-defects.md` and `tests/README.md`.
5. The previous phase's review log, and the notes for this phase below.

## Steps

1. **Preflight.**
   - Main checkout, on `feat/blue-glass`, clean. If `git status`, `git worktree list` or another session shows someone else working, use a worktree on its own branch and say why.
   - `npm ci && npm run fonts`, then every command under "Done means" in `docs/porting.md`, at phase N−1. All green before anything changes.
2. **Open the phase** on branch `phase-N`, from `feat/blue-glass`. This writes the phase's part of the suite, which freezes when the step is committed.
   - `tests/phases.json`: `current` becomes N.
   - Behaviour specs in `tests/behaviour/`, from each in-scope README's Keyboard and props sections. Run them on the reference (`npx vitest run --project behaviour:reference`). A spec that fails there is wrong, or its defect gets a row in `docs/reference-defects.md`.
   - Parity: opened states for overlays and inputs in `tests/parity/states.ts`. Per-preview budgets in `tests/parity/thresholds.json` come only from `npm run parity:self` runs.
   - Server HTML: exceptions in `tests/ssr/exceptions.json` only for the plan's declared ones (NoSsr, Portal and closed popups).
   - Layout: stories whose layout changes with the viewport go in `tests/ssr/layout.json`.
   - API: waivers in `tests/api/allowlist.json` only for deviations already in `docs/deviations.md`.
   - With nothing ported yet, the behaviour, parity, server-HTML, layout and API gates must fail on the phase's modules. Check that, then commit "Open phase N".
3. **One attempt** from that commit (your call, 23 Oct 2026, under your routing rules: code goes to Codex once; phases 1 and 2 ran two rival attempts, Opus's and Codex's): Codex, GPT-6.1 Sol at max through `codex exec`, in worktree `phase-N-codex` on its own branch, with the brief `docs/phase-N-brief.md` and `docs/porting.md`. Before dispatch the brief gets one review: Astra attacks it with the task and Fable reviews it alone. The attempt may not touch the suite or add dependencies, and doesn't commit: the session commits its worktree.
   - The worktree needs `npm ci`, `npm run fonts` and `npm run reference` before Codex starts, since its sandbox has no network.
4. **Judge.** Run the "Done means" list on the attempt yourself; its own "done" doesn't count.
   - If it fails, Codex gets one more attempt, resuming from its draft with the failing lines. If that fails too, stop and ask.
   - Never write a rival port in the session. Record the outcome in the review log.
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

## Traps found in phase 2

- **Vitest caches modules across runs** (`fsModuleCache`), which let new stories files skip the stories guard. It's off in `vitest.config.ts`: if a new file seems ignored, look there first.
- **Every checkout needs `npm run fonts`,** agent worktrees included. Where Fontshare is unreachable, copy `fonts/` from the main checkout: the gates check the file's hash.
- **Prettier drops the parentheses XO's `no-mixed-operators` asks for** (`a + b / 2`). Name the part instead (`const half = b / 2`).
- **A gate step must survive its element unmounting.** An overlay that closed while the Storybook gate read it stalled the step for 30 seconds.
- **`check:sync` doesn't track `design-system/shared/position.ts`:** `sharedFiles` lacks it, and `sharedHelpersOf` only follows underscored imports. A regenerated position helper (Popper's, Tooltip's) goes unnoticed. Fix it when phase 3 opens.
- **Merging parallel agents:** a `tests/sync.json` conflict resolves by taking every component record from both sides and one `shared` block. `src/index.ts` and `src/styles/index.css` follow the reference's order (`index.d.ts`).
- **Run the gates in a quiet window.** While agents also run gates, the parity self-test and the Storybook gate time out on harness steps, not on the port.
- **Base UI's portals render nothing on the server.** A popup that must be in the server HTML needs its own in-place path, as `ModalLayer` has. Popover and Menu have none (deviation 10).

## Traps found in phase 3

- **The second vendor's workspace-write sandbox can't bind a localhost port or start Chromium on macOS,** so an attempt inside it can only report on the static checks. Its run with the failing lines went without a sandbox, and the session judges outside one either way.
- **A commit interrupted inside the pre-commit hook leaves lint-staged's backup in the shared stash.** Compare its tree with the index before committing again; nothing was lost on 23 Oct 2026.
- **The push guard (routing v3, 24 Oct 2026) blocks a push when any unpushed commit adds a `.md` line that names a model.** Review logs name routes, roles and wrapper paths; the named logs live under `~/.cache/routing/`.
- **The reference places its popups after every render.** A positioner that subscribes to resize and scroll still needs a layout effect with no dependency list, or a render that moves the trigger leaves the popup behind (round 2's #2).
- **Browser specs swallow `console.log`.** A throwaway probe reports through a failing assertion instead.

## Notes for each phase

- **Phase 1:**
  - Avatar's preview joins the parity gate only in phase 2, since it uses Tooltip.
  - The plan's layout checks name PaneAccordion: its story belongs in `src/components/Accordion/Accordion.stories.tsx`, which `tests/ssr/layout.json` lists.
  - The plan's delayed-hydration tests for the Tabs and Accordion section islands are due.
- **Phase 2:**
  - Open content the reference renders in place (the Modal, Dialog, Drawer and Snackbar examples) must be visible in the server HTML. The gate no longer accepts leaving it out.
  - iOS 26 Safari backdrops: see "iOS 26+ Safari" in Base UI's quick start (`node_modules/@base-ui/react/docs/react/overview/quick-start.md`).
  - `ModalLayer` listens on the page's `document`, so a layer inside an iframe isn't supported. Its Escape gives `onClose` the native KeyboardEvent; the other Base UI popups wrap it (`src/internal/events.ts`), which the documented union allows.
  - The type switched to Satoshi on 22 Oct 2026, after the suite first opened and before any attempt finished. The tokens name it, so a port reads it like any other token. Every checkout needs `npm run fonts` (`tests/README.md`, "Fonts"), and the Codex worktree needs it before Codex starts, since its sandbox has no network.
  - A non-modal popup already open in body when an in-place modal opens gets hidden with the rest of the page.
  - Stories follow the Controls rules in `stories/README.md`, which the guard in the unit project (`tests/unit/stories.test.ts`) checks. An overlay's Default lists `open` through `LiveArg`: its own dismissal (Escape, the backdrop, a close button) calls `onClose`, which logs and sets it back to false. If a portalled overlay's `open` changes nothing in the server HTML, list it under `afterHydration` in `tests/unit/stories.json` with that reason. `npm run check:storybook` checks that a control change, each step in `tests/storybook/interactions.ts` (an opening click, a dismissal) and the docs page all keep the story and the panel in step.
- **Phase 3:**
  - Checkbox, Radio and Switch follow deviations 1 to 6. Deviation 6 (a Radio outside a RadioGroup) is the gap to watch.
  - Select can build on Popover's and Menu's layer (`src/internal/popup-layer.tsx`) and place with `toWholePixelOffsets` (`src/internal/anchor.ts`) to land on the reference's pixels.
  - Open from phase 2's review (`docs/reviews/phase-2.md`): the iOS 26 Safari backdrops (your call), an open Dialog's name in the server HTML, the Storybook gate's toolbar and scope checks, and `check:sync`'s `position.ts`.
  - TransferList departs from the plan's mapping: its two listboxes keep their selection in React state, since Base UI's CheckboxGroup has no listbox and no public setter (the attempt's report, 23 Oct 2026). The API is unchanged, so `docs/deviations.md` has no entry.
- **Phase 4:**
  - Routing v3 (24 Oct 2026) names what steps 3 and 5 name by model. The attempt is the `coding.feature` writer through `~/.claude/scripts/codex-run.sh` (prepare its worktree first: no network). The reviewers come from `~/.claude/scripts/route.sh reviewers coding.feature 2`: the task reviewer is a subagent with the task, and the artifact reviewer runs through `~/.claude/scripts/astra-review.sh --route coding.feature --base A --head B` with the diff and the test output only. Whether the `/spec` skill's flow replaces step 2 for a phase whose suite the runbook already opens is yours to decide when phase 4 starts.
  - `check:sync` now records `../layout/_name` imports again (Masonry's), and `../internal/name` ones.
  - Left from phase 3's reviews (`docs/reviews/phase-3.md`): the read-only specs don't assert `readOnly` on the input; Slider's `interactionRef` never clears; Select skips its zoom for a controlled open on a hydrated page; after a Tab from a Select open at mount, focus rests on `body`, not on a sentinel as in the reference.
  - Storybook's interface and the docs pages' prose use Storybook's own font, Nunito Sans; the stories render in Satoshi. A manager and docs theme would change that, if you want it.
- **Phase 5 and release:**
  - The packed `package.json` still carries `"prepare": "husky"`. Strip it before publishing.
  - The `dist` source maps point to `src`, which isn't shipped. Ship it or drop the maps.
  - The package stays `private: true` until you pick a registry. The CI workflow isn't pushed.
  - The README tells consumers to get Satoshi from Fontshare and self-host it, with its `@font-face` (the variable file, weights 300 to 900). Its licence forbids shipping the files, and `check:package` fails a tarball that holds one.
  - Mermaid's reference sets its diagrams in a hardcoded system stack (`Mermaid/reference.tsx`, line 8). Decide whether the port follows `--font-sans` and Satoshi.
  - `check:sync` still misses a shared helper's own imports and the CSS helpers (phase 3's round 1).
