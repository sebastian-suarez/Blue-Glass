# Blue Glass package plan

Turn `design-system/` into `@sebastian-suarez/blue-glass`: React components with the documented Blue Glass API, Base UI for behaviour, one stylesheet and Storybook docs. It installs from a packed tarball now and from a registry later. The portfolio adopts it afterwards, with Astro islands.

Revision 3. It answers Codex's two attacks, which are logged in `docs/reviews/plan.md`.

## Decisions (21 Oct 2026)

- **API:** each component's `api.d.ts` is the contract. Extra props are fine. A removed or changed prop needs an entry with its reason in `docs/deviations.md`.
- **Behaviour:** Base UI 1.9 wherever it has the primitive and the documented API survives it (mapping below). Everything else ports the reference code.
- **Portfolio:** islands. Server HTML must be usable before hydration, not just hydration-safe. No vanilla-script path.
- **Name:** `@sebastian-suarez/blue-glass`. Stays `private: true` until you pick a registry.
- **Scope:** all 66 components. The 5 sections become Storybook examples, not exports.
- **React:** peer `^19` only. Widening it later means adding a React 18 runtime test matrix first.

## Package shape

- One package at the repo root. It keeps the template's TypeScript 7, XO, Prettier, Vitest 5 and husky. XO gains React rules, and lint-staged gains `.tsx`.
- One folder per reference module: `src/components/<Name>/` holds `<Name>.tsx`, `<Name>.css`, `<Name>.stories.tsx` and `index.ts`.
- ESM only, built per file with `tsc` (JS plus `.d.ts`), with `'use client'` on every module that runs hooks. TS 7 emit was checked.
- Dependencies:
  - Peers: `react` and `react-dom` at `^19`.
  - Runtime: `@base-ui/react@^1.9`.
  - Optional peer: `mermaid@^11.16.1`, imported dynamically. The `src` prop still loads it from a URL.
- CSS: the reference's plain CSS.
  - It keeps the `gl-` and `text-` classes and `@layer gl-fallback, gl-base, gl-components`. Selectors move to Base UI's DOM and data attributes.
  - It ships three files, unminified:
    - `styles.css`: everything.
    - `tokens.css`.
    - `baseline.css`: CssBaseline's resets as a file. The component's runtime injection never reaches static HTML.
  - The package's token build keeps the custom properties unlayered, but puts the generated `.text-*` classes in `gl-base`. Unlayered type classes would beat every Tailwind utility.
  - The README gives the layer order to declare next to Tailwind 4.
- Viewport-dependent layout and default state come from CSS media queries in the server HTML. `useMediaQuery` only refines behaviour after hydration, such as Tabs' orientation keys.
- `design-system/` is committed unchanged as the reference and kept out of Prettier, XO and lint-staged.
  - A manifest records the reference hash each component was ported from.
  - `npm run check:sync` lists the components whose reference changed after a regeneration.

## Base UI mapping

This is the default. A deviation needs a reason in the phase's notes.

| Base UI                         | Components                                         |
| ------------------------------- | -------------------------------------------------- |
| Accordion                       | Accordion, PaneAccordion                           |
| Tabs                            | Tabs, Tab, TabPanel                                |
| Toggle, ToggleGroup             | ToggleButton, ToggleButtonGroup                    |
| Separator                       | Divider                                            |
| Avatar                          | Avatar, AvatarGroup                                |
| Button                          | Button, Fab                                        |
| Dialog                          | Dialog, Modal                                      |
| Drawer                          | Drawer                                             |
| Popover (`anchor` ← `anchorEl`) | Popover                                            |
| Menu                            | Menu, and MenuItem inside a Menu                   |
| Tooltip                         | Tooltip                                            |
| Toast                           | Snackbar, if it fits the controlled API; else port |
| Progress                        | LinearProgress, CircularProgress                   |
| Field, Input                    | TextField, InputAdornment                          |
| Select                          | Select, Option (`native` stays a `<select>`)       |
| Combobox, Autocomplete          | Autocomplete                                       |
| Slider                          | Slider                                             |
| Checkbox · Radio · Switch       | Checkbox · RadioGroup, Radio · Switch (deviations) |
| RadioGroup                      | Rating                                             |
| CheckboxGroup                   | TransferList                                       |

That's 24 of the 66 modules.

- **Form controls run on Base UI, with recorded deviations** (your call, 21 Oct). Checkbox, Radio and Switch document "the ref and every other attribute go to the native input", with `ChangeEvent<HTMLInputElement>`. Base UI renders a `<span>` beside a hidden, `aria-hidden` input instead.
  - So the ref points at the hidden input, focus and blur fire on the span, and change events are wrapped.
  - Each break goes in `docs/deviations.md`. Contract tests pin the new behaviour, and check that validation and `FormData` still work.
- **Events.** Where the documented callback takes a React event (ToggleButton's `onChange(MouseEvent, value)`, TextField's `ChangeEvent`), it gets the real React event from our own handler on the native element. A SyntheticEvent-shaped wrapper is used only where Base UI changes state with no React event behind it, such as list navigation or an outside press.
- **Modal flags.**
  - Modal's flags are independent (`disableEnforceFocus`, `disableScrollLock`, `hideBackdrop`, `disableAutoFocus`, `disableRestoreFocus`), but Base UI's `modal` couples focus trap, scroll lock and outside clicks (`true`, `'trap-focus'`, `false`).
  - An adapter combines those modes with the reference's scroll lock and backdrop, so every combination works. A free focus with a locked scroll is the one Base UI can't do alone.
- **MenuItem has two modes.** Base UI's `Menu.Item` throws outside `Menu.Root`, but the documented MenuList also stands alone. So a MenuItem inside a standalone MenuList uses the ported roving-focus item.
- **Plain React ports cover the rest:**
  - Layout, Typography, Icon, the surfaces, Table, List, Link and MenuList.
  - Diagram, TimingChart, the charts and Mermaid.
  - BottomNavigation, Breadcrumbs, Pagination, Stepper, SpeedDial, Timeline, ImageList, Masonry, Backdrop, Alert, Badge and Skeleton.
  - The utilities: Portal, Popper with `computePosition`, ClickAwayListener, NoSsr, TextareaAutosize, Transitions, useMediaQuery and CssBaseline.

## Acceptance suite

It's built in phase 0. It freezes only after the reference is qualified and the shared adapters are proven.

Every gate reads a cumulative phase manifest, `tests/phases.json`. It lists the modules, exports, types, previews, server-render fixtures and tests in scope up to each phase. Phase 5 requires full coverage, and placeholder exports aren't allowed.

1. **Parity.** Every in-scope `preview.html` runs unchanged against two runtimes in Chromium, on the same React 19 production build: the reference (rebuilt from `reference.tsx` and `shared/`, test fixture only) and the package.
   - Deterministic capture:
     - Fixed viewport and fonts.
     - CSS and Web Animations paused at a fixed time, SVG `animate*` paused at 0, and Mermaid served locally.
   - Thresholds are set per preview and per section region, starting from reference-against-itself runs.
   - A mutation test must show the gate fails on planted defects (a radius, a colour, a 2px shift).
   - Overlays and inputs also compare their opened states.
   - The side-by-side report goes with each phase.
2. **Usable server HTML.** Every in-scope preview tree renders with `renderToString` without `window` or `document`, with preview scripts run in the same realm.
   - The HTML then loads with JavaScript off. Content that is open or `in` must be visible, which rules out the reference's `<Fade in>` (rendered at `opacity:0`).
   - It then hydrates with no recoverable errors.
   - Pre-hydration layout checks at 390px and 1280px cover the 5 section stories, Tabs, Accordion and PaneAccordion.
   - Delayed-hydration tests cover the Tabs and Accordion section islands.
   - The section stories use CSS layout. The unchanged `preview.html` files, whose layouts use `useMediaQuery`, serve only as parity fixtures.
   - Declared exceptions: NoSsr, Portal and closed popups.
3. **Behaviour.** Vitest browser tests from each README's Keyboard and props sections, written per phase and run on the reference first.
   - They include contract tests for Checkbox, Radio and Switch that pin the recorded deviations: the ref's element, event targets, attribute forwarding, and focus and blur. They also check that validation and `FormData` still work.
   - A test may fail on the reference only if it's listed in `docs/reference-defects.md`.
   - Every test is mandatory for the package.
4. **API.**
   - Export names match `source/index.d.ts` (133 values and 194 types at phase 5).
   - For every documented props type:
     - Key coverage, so no documented prop goes missing. Assignability alone misses removed optional props; checked with TS 7.
     - Per-prop compatibility.
     - Compiled JSX, ref, generic and function call sites against the built `.d.ts`.
     - Negative tests that catch `any`.
5. **Package.** `npm pack`, publint, and attw (ESM only).
   - An Astro 7 + React 19 + Tailwind 4 fixture installs the tarball, renders static components and hydrates islands.
   - It checks computed styles to prove Tailwind utilities override the type classes under the documented layer order.
6. **Quality.** TypeScript 7 typecheck, XO, and a Storybook build. Stories plus axe run in Vitest browser mode with zero violations.

## Phases

A preview joins the parity gate in the phase where everything it uses exists. For example, Avatar's preview waits for Tooltip in phase 2.

0. **Foundation:**
   - The branch, a commit of the reference, and package config with every dependency for all phases locked (the full set resolves with the template's tooling).
   - Token and CSS builds, and both runtimes.
   - Reference qualification: production mode, fixture-only repairs, and allowed failures listed.
   - The suite above, with the phase manifest and the gate mutation test.
   - The shared adapters, proven before the suite freezes:
     - SyntheticEvent-shaped events and close reasons, for when no React event exists.
     - `anchorEl` mapped to Base UI's `anchor`.
     - Transitions that render visible on the server and animate only on client mounts.
     - The modal-flags adapter, across every flag combination.
     - The two-mode MenuItem.
     - The form-control adapter: the ref on the hidden input, and wrapped change events.
   - The Storybook scaffold (brand book, tokens, and the canvas and LightField frame) and a CI workflow, not pushed.
1. **Site set (26):** Icon, Typography, Button, ButtonGroup, ToggleButton, Chip, Avatar, Paper, LightField, Card, AppBar, Container, Box, Grid, Stack, Divider, List, Link, Table, Tabs, Accordion, Diagram, TimingChart, Transitions, useMediaQuery and CssBaseline. Plus the 5 section stories.
2. **Overlays and feedback (17):** Portal, Popper, Popover, Modal, Backdrop, ClickAwayListener, NoSsr, TextareaAutosize, Dialog, Drawer, Menu, Tooltip, Snackbar, Alert, Progress, Skeleton and Badge.
3. **Inputs (11):** TextField, Select, Autocomplete, Checkbox, RadioGroup, Switch, Slider, Rating, TransferList, Fab and SpeedDial.
4. **Navigation and layout (7):** BottomNavigation, Breadcrumbs, Pagination, Stepper, ImageList, Masonry and Timeline.
5. **Charts (5):** BarChart, LineChart, DonutChart, Sparkline and Mermaid. Then the package README, a CHANGELOG and a release dry run.

## How each phase runs

This follows your routing rules. Each phase runs in its own session, step by step in `docs/phase-runbook.md`.

- **Two attempts.** Phases 1–5 port an existing implementation onto Base UI, which I count as a migration (and the whole run is well over 10 hours). So each phase gets two attempts from the same base commit:
  - Mine, in worktree `phase-N-opus`: Opus subagents at max, each in its own worktree, merged by me.
  - Codex's (GPT-6 Astra), in `phase-N-codex`.
  - Both get the same spec and the same frozen suite. Neither may edit the suite or add dependencies.
- **Choosing.**
  - Keep the attempt that passes the suite.
  - If both pass, keep mine, since Opus wins ties on migrations.
  - If neither passes, each gets one more attempt; if both fail again, I stop and ask you. No splicing.
- **Reviews.**
  - A Fable subagent at xhigh sees only the diff. `/codex:adversarial-review` also sees the task.
  - I check each finding against the docs or a failing test, and log the ones I reject in `docs/reviews/phase-N.md`.
  - Two rounds at most.
- **Phase 0** is tooling, so it gets a single attempt (mine) and the same reviews.
- **Git.** Commits go to local branches with no AI attribution. Nothing is pushed and no PR is opened without asking.
- **Hand-offs.** After each phase you get the parity report, Storybook and the review log. The next phase starts when you say go.

## Already checked (scratch copies, repo untouched)

- **Reference runtime:** the reference reassembles from the `api.d.ts` categories and bundles (133 exports). All 71 previews render in Chromium with no errors, on both React 18 and React 19.
- **Repeatability:**
  - Two reference runs: 68 of 71 previews pixel-identical, the worst 0.001% apart.
  - React 18 against React 19: 69 of 71 identical. Both remaining differences are animation phase.
- **Server rendering:** all 71 preview trees render with `renderToString` and no DOM globals, once preview scripts run in the same realm. A separate VM realm breaks `instanceof Date`.
- **Visual check:** a screenshot of the Button preview on the reference shows the expected glass and ink pills on the LightField.

## Risks

- **Base UI's DOM differs from the reference's,** so most selectors change. The parity gate and its opened-state captures catch the drift.
- **The adapters are the riskiest code** (events, reasons, `anchorEl`, transitions, modal flags). That's why phase 0 proves them before any port.
- **Rival attempts double the cost** of phases 1–5.
