# Phase 2 reviews

Phase 2 is overlays and feedback: 17 modules (Portal, Popper, Popover, Modal, Backdrop, ClickAwayListener, NoSsr, TextareaAutosize, Dialog, Drawer, Menu, Tooltip, Snackbar, Alert, Progress, Skeleton and Badge), and Avatar's Example. Its suite was opened at `66c16c0`, and its diff runs from `89fae46`.

## Before the phase, 22 Oct 2026

- **Preflight.** The tree held an uncommitted `@vitest/coverage-v8` in `package.json` and the lockfile, from the Storybook step's session, which nothing used. You chose to revert it. The phase 0 worktree and the merged `phase-0-harness` and `phase-1-opus` branches were removed. Then all 12 "Done means" commands passed at phase 1 (1,702 tests).
- **A new gate.** You chose to turn the Storybook step's scratch browser check into a gate before the suite froze. Its plan, `docs/storybook-gate-plan.md`, drew five findings from Codex (GPT-6 Astra), all accepted; they're in the plan's own table.

## Opening the suite, 22 Oct 2026

- **Behaviour specs:** five Opus agents (max), one per group, from each README's props and keyboard sections, with phase 1's brief less lint: 572 tests in 17 files. On the reference 556 pass and 16 fail on listed defects. Writers planted defects in the reference to show the specs bite: the feedback group caught 34 of 34, the menus group 29 of 29, the floating group about 55 of 60 (the misses: two redundant reference flags and one untested combination). The modal group ran its specs on a throwaway port built on phase 0's modal adapter, and all 102 passed.
- **The Storybook gate** (`npm run check:storybook`, `scripts/storybook/`): every story and docs page renders without errors; a Default's panel lists exactly its `controls.include`; every value the panel offers changes the mounted story; the entries in `tests/storybook/interactions.ts` keep the panel and the story in step on the canvas and on the docs page; the toolbar and phone twins. At phase 1 it passes 480 of 480 checks in about 140s. Its self-test catches all six planted defects, each on its own check, and replays every entry on the reference's preview.
- **Opened states** for 15 previews, Avatar's tooltip among them. `npm run parity:self` matches each at 0 px, so no preview needs its own budget.
- **Server HTML:** no new exceptions. Every text the reference hides in the Modal, Backdrop, Dialog, Drawer and Snackbar previews shows once its scripts run, so it's open content the package must show. Portal's and the closed popups' texts are absent from the reference too, which the rules already accept.
- **Layout:** Dialog's and Snackbar's stories files join `tests/ssr/layout.json`; both change layout at 700px. Drawer's phone rule only rounds corners.
- **API:** no waivers. Deviations 7 and 8 change behaviour, not types.

Found while opening:

- **The gate found a phase 1 defect.** useMediaQuery's Default threw in the built Storybook, on its canvas and its docs page: Storybook's docgen attaches `__docgenInfo` to exported objects, and the story passed that one to the hook. The unit guard and the Vitest project build without that plugin. Fixed in `d6e11fd`, and `stories/README.md` warns about it.
- **The preview's iframe starts at `about:blank`,** whose window the browser keeps for `iframe.html`, so the gate's planted defects first ran before the preview's URL existed and did nothing. They now act on the window and check the URL when they act.
- **On the canvas a key went to the manager,** not the story; the gate focuses the preview's window before a key press.
- **Qualifying entries on the reference caught two wrong ones.** On Modal's preview, Escape at load reaches the Variants example, which opened last, so the entry now closes the Default with its button and reopens it before Escape. Popover's Default can't be dismissed at all beside its Variants, which take Escape and every outside press, so it has no entry; nor has Tooltip, whose preview holds it open with no handlers. The Controls check still proves both `open` args act.
- **Escape's event.** The brief asked for the native KeyboardEvent everywhere, from the runbook's note on the modal adapter. But `src/internal/events.ts` wraps Escape for the other Base UI popups, and `events.browser.test.tsx` pins that for Popover. Every overlay documents `React.SyntheticEvent | KeyboardEvent`, so Menu's and Popover's specs now accept either, as long as the event behind it is the Escape keydown. Modal, Dialog and Drawer keep the native event, as the modal adapter passes it.
- **New reference defects,** listed in `docs/reference-defects.md` with their tests: a press on Modal's backdrop drops focus to body; `keepMounted` hides closed content only behind a transition; an in-place Modal leaves the page around it exposed; and the `inert` row gained the root that takes every outside press, the Tab sentinels that ignore `disableEnforceFocus`, and the opener that goes `inert` under `disableAutoFocus`.
- **Hover states on a tall preview are fragile.** A full-page capture of Tooltip's preview moves the pointer off the page, which can close a hovered tooltip, so its states open on focus.

## The switch to Satoshi, 22 Oct 2026

- **The call.** You set the system's typeface to Satoshi (Fontshare) while the first attempts ran, and chose to switch at once, pausing phase 2. The brand book had made the system stack a rule ("There are no web fonts").
- **Your choices:** the variable font, since the type scale uses weight 600 and Satoshi has no static 600; the reference changed here with its own tools; and a download script rather than Fontshare's hosted CSS.
- **The licence** (ITF Free Font License 2.0, read from the file Fontshare ships) allows self-hosting on your own sites, and forbids passing the files on through a repository, a package or a public server, and subsetting or converting them. The repository is public on GitHub, so the files are in neither it nor the package.
- **What changed:**
  - `tokens.json` names Satoshi first in the sans stack, and both `tokens.css` files were regenerated by their own tools; the brand book's type rules say so. No `@font-face` is in the system's CSS: each host loads the font.
  - `npm run fonts` downloads the official file into `fonts/`, which git ignores, and checks it against a pinned SHA-256.
  - The gate pages, Storybook and the behaviour specs declare the face and wait for it; `check:package` fails a tarball holding a font file; CI fetches the font after `npm ci`.
- **Verification.** At phase 1 every gate passed on Satoshi, self-tests included, and the specs on the reference gave the same counts as before (1,182 pass, 22 listed defects). The 17 phase 2 spec files still fail on the package, as they should with nothing ported. One race showed up: under the full run's load, Popover's "opened" state differed from itself by 1,421 px, because an open Popover places itself once, at mount, and the font could arrive after. Gate pages now hold their first render until the font has loaded. Two full self-test runs followed: one passed 116 of 116, the other 115, with a harness timeout (Chip at rest, waiting for the network to settle) that four more runs never repeated.
- **The attempts.** Both stopped for the switch. Their drafts, made against the same suite, became `p2-draft1-*` branches, and you chose to continue from them: each attempt picks up its own draft on top of the switch, and Codex resumes its own conversation.
- **Before that,** a network outage cut every agent off about an hour into the first attempts. Codex resumed its conversation; the three Opus agents, which had written nothing yet, started again.

## The brief, 22 Oct 2026

`docs/phase-2-brief.md` collects the rules both attempts work from. Per your rule it had one review before dispatch, and the code gets one when it comes back: Codex (GPT-6 Astra) attacked it with the task, and Fable (xhigh) reviewed it on its own. All 11 findings were checked against the files they cite and accepted:

| From           | Finding                                                                                                                                            | Change                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Fable (high)   | Modal's, Dialog's and Drawer's specs require Escape's native KeyboardEvent, but the brief said the specs accept either, and `events.ts` wraps it   | The brief says which specs require the native event, and how a Drawer on Base UI's root passes it         |
| Codex (medium) | Eight modules have no bundle section, and the build rejects a stylesheet or an import for them, though the porting brief asks every module for one | The brief names the nine modules with a stylesheet, and sends the others' styles to `foundation.css`      |
| Codex (medium) | "`onClose` sets `open` back" doesn't fit Backdrop (`onClick`) or Popper (no `onClose`, and its entry needs `placement`)                            | The story wiring is spelled out per component                                                             |
| Fable (medium) | Dialog's preview needs TextareaAutosize, Snackbar's needs Alert and CircularProgress, and Avatar's preview, which joins parity now, had no owner   | The brief names the dependencies, and gives Avatar's rows and Example story to whoever ports Tooltip      |
| Fable (medium) | The layout gate stops at the first missing listed stories file                                                                                     | The brief says when it can run, and what checks the twins meanwhile                                       |
| Fable (medium) | The Codex note named no branch or worktree                                                                                                         | It does now                                                                                               |
| Fable (medium) | Codex's draft records all 17 modules in `tests/sync.json`, so `check:sync` won't show what's unported                                              | The note says so, and points to the specs and `check:api` instead                                         |
| Fable (medium) | `npm run fonts` needs Fontshare                                                                                                                    | The Opus prompt says to copy the main checkout's file if it's unreachable; Codex's worktree gets it first |
| Fable (low)    | "Keep both sides" was the wrong advice for a `tests/sync.json` conflict                                                                            | Dropped: no draft touches that file                                                                       |
| Fable (low)    | XO was both required ("Done means") and forbidden (the Opus prompt)                                                                                | The Opus prompt says the `npx xo` in "Done means" is the session's                                        |
| Fable (low)    | Nothing said whether the adapters' own tests may change                                                                                            | The adapters may change, but their tests are frozen; `docs/porting.md` lists them as off limits           |
