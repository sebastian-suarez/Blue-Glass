# Gates

Every gate reads its scope from `tests/phases.json`: the modules ported up to the current phase, their exports, and the previews whose components all exist by then. `BLUE_GLASS_PHASE=N` or `--phase N` overrides it. Reports go to `reports/`, which git ignores.

The gates, Storybook and the behaviour specs render in Satoshi, so run `npm run fonts` once per checkout first (Fonts, below).

| Gate              | Command                                      | Fails when                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parity            | `npm run parity`                             | A preview's package page logs an error, has a different size, or has a section with more differing pixels than its budget, at rest or in an opened state                                                                                                                                                                                                                                 |
| Parity self-test  | `npm run parity:self`                        | The reference doesn't match itself, or a planted defect (radius, colour, 2px shift, tracking) passes                                                                                                                                                                                                                                                                                     |
| Server HTML       | `npm run check:ssr`                          | A preview can't render on the server, logs an error, hydrates with an error, hides text in its server HTML, or leaves out text the reference showed before JavaScript                                                                                                                                                                                                                    |
| Story layout      | `npm run check:layout`                       | A listed story's server HTML lays out differently from its hydrated page at 390px or 1280px (the self-test proves a layout chosen in JavaScript fails)                                                                                                                                                                                                                                   |
| Delayed hydration | `npm run check:islands`                      | An island, not yet hydrated, shows the wrong tab or rows, lacks its ARIA wiring or tab stop; or it hydrates with an error, a moved text or lost focus; or it then ignores its documented keys and clicks (the self-test plants each kind of defect on the reference, but the wiring, which the reference already lacks)                                                                  |
| Reference sync    | `npm run check:sync`                         | A reference file changed since the module built from it was ported                                                                                                                                                                                                                                                                                                                       |
| Storybook         | `npm run check:storybook`                    | A story or docs page in the built Storybook logs an error, a Default's panel lists other controls than it includes, a value the panel offers changes nothing, or a stateful Default's steps (`tests/storybook/interactions.ts`) leave the panel and the story apart or don't work on its docs page (the self-test plants six defects, and replays each entry on the reference's preview) |
| Unit              | `npx vitest run --project unit`              | Node tests, including the gates' own rules and the stories guard (below)                                                                                                                                                                                                                                                                                                                 |
| Browser           | `npx vitest run --project browser`           | Package-only tests in Chromium: internals and adapters                                                                                                                                                                                                                                                                                                                                   |
| Behaviour         | `npx vitest run --project behaviour:package` | Each phase's specs, written against `#ui`; `behaviour:reference` runs the same specs on the reference                                                                                                                                                                                                                                                                                    |

## Parity

- Both runtimes run the unchanged `preview.html` on the same React 19 production build (`scripts/runtimes.ts`), so only the component code differs.
- Captures are deterministic (`scripts/lib/capture.ts`): a fixed viewport, clock and locale, finite animations jumped to their end, and infinite and SVG animations paused at 0. The reference matches itself with 0 differing pixels.
- Budgets live in `tests/parity/thresholds.json`. The default, 16 px per section, sits far below the smallest planted defect (243 px). A preview gets its own budget only with a reason a reviewer can check.
- Opened states live in `tests/parity/states.ts`. Overlays and inputs add theirs in their phase.

## Server HTML

- `scripts/lib/server-render.ts` runs each preview's script in Node with stand-ins for `window` and `document`, and renders its tree with `renderToString`.
- The rules are in `scripts/lib/ssr-rules.ts` and have tests of their own.
- Text shown only after JavaScript is hidden (in the server HTML, but invisible: hidden, transparent or cut away by a `clip-path`) or absent (not there at all). Hidden always fails. Absent fails unless the reference's server HTML lacked it too: what the reference held, even hidden, the package must show. Texts count by occurrence, so a visible caption doesn't stand in for a hidden copy of the same words.
- `tests/ssr/reference-baseline.json` records the reference's hidden and absent texts. Re-record it only after `design-system/` is regenerated: `node scripts/ssr/run.ts --reference --record`.
- `tests/ssr/exceptions.json` excuses named texts, or a whole preview, with a reason.

## Story layout

- `tests/ssr/layout.json` lists the stories files checked from each phase: the sections and the components whose layout changes with the viewport.
- `scripts/ssr/layout.ts` composes each story with the preview's decorators, renders it in Node, then compares where every text sits with JavaScript off and after hydration, at 390px and 1280px.

## Stories

- `tests/unit/stories.test.ts` composes every stories file with `.storybook/preview.tsx` and renders it in Node. A component's Default must take its args (Storybook's arity rule) and list them in `controls.include`. Each listed arg needs a value, can't be a mount-only `default*` prop, and must change the server HTML with every other value it can take. Every other story, and every docs or section story, must keep Controls off.
- An arg's other values are its argTypes' options, or else its prop's union type, read with TypeScript as docgen reads it; without options, a flipped boolean, a moved number or a longer string. A listed arg that isn't a prop of the component needs argTypes. The meta's component is found by identity among the component modules' exports, so a `memo` or an anonymous function works too.
- Each file `tests/ssr/layout.json` lists by the current phase needs a story pinned to the phone viewport and kept off the docs page, and the toolbar's phone and desktop sizes must be the capture sizes.
- `tests/unit/fixtures/stories.tsx` proves the guard. These fail: an ignored, overridden, dropped or group-owned arg; a render with a defaulted parameter; a mount-only, unset or one-option arg; an option that renders like the default or like another option; a story with Controls on elsewhere; a twin missing or on the docs page. Inherited renders, the component's own render, wrappers, `memo`, an anonymous component and `useArgs` pass.
- Each of an arg's values must render unlike the default and unlike each other.
- What it can't see: it proves an arg reaches the server HTML, not that the change is one a reader sees (an arg routed only into a hidden element passes), and it renders once, so it can't see a story that breaks after a click or on its docs page. The Storybook gate (below) checks those in the browser.
- `tests/unit/stories.json` exempts, with a reason, a component file with nothing to control, or an arg that acts only after hydration.

## Storybook in the browser

- `scripts/storybook/run.ts` serves `storybook-static` (so `npm run build-storybook` runs first) and drives the manager in Chromium, four pages at a time. Its plan, and Codex's attack on it, are in `docs/storybook-gate-plan.md`.
- It observes a story through a snapshot: the markup of body (the story and what it portals), the values of form controls and every element's box, with infinite and SVG animations paused at 0. A story is ready on Storybook's `storyRendered` or `docsRendered`, a panel change has landed on the matching `storyArgsUpdated`, and either counts as settled once the snapshot holds for 300ms. Expectations are polled for 5s, never slept.
- Every story and docs page in scope must open with no page or console error. Each in-scope module needs a stories file with a Default.
- A Default's Controls tab must list exactly its `controls.include`; every other story, none. Each value the panel offers (each other option, the flipped checkbox, a number plus one, a text with a suffix), set through the panel on a fresh story, must change the snapshot. This is where an `afterHydration` arg proves itself.
- `tests/storybook/interactions.ts` holds a stateful Default's steps, each an action and the arg, shown and hidden selectors that follow it. The gate runs them on the canvas (the panel must follow), after setting the first step's value in the panel (the story must follow, then the rest still sync), and on the docs page, whose Default must respond; a canvas then opened from the sidebar, without reloading the preview, must still show the initial value.
- The toolbar must offer Phone, Tablet and Desktop; each phone twin must open 390px wide with the toolbar locked to Phone, and stay off its docs page.
- `--self` replays each interaction entry on the reference's preview page, inside its "Default" section with the other sections open beside it, as they are on a docs page. Then it plants six defects through init scripts and requires each to fail its own check on its own story, with its script reporting that it acted and a control story staying clean: dropped panel updates, dropped `updateArgs`, a click that throws, a docs page that swallows clicks, a docs page that writes the args, and a control hidden from the panel.
- The preview's iframe starts at `about:blank`, whose window the browser keeps for `iframe.html`, so anything injected listens on the window and checks the URL when it acts.

## Delayed hydration

- The portfolio hydrates its interactive sections late, as islands. `tests/ssr/fixtures/islands.tsx` holds them: the client-work Tabs, a project's Tabs, the career Accordion and the capabilities PaneAccordion.
- `scripts/ssr/islands.ts` renders each in Node, loads the HTML with JavaScript on but not hydrated, and checks what the READMEs promise: the chosen tab or open rows show and the rest don't, tabs and panels name each other, and Tab reaches the selected tab and then its panel, or the first summary. Only then does the island hydrate, and it must do so with no error, no text moving more than 2px and focus kept, then answer End, Enter, the arrows and clicks as documented. At 390px and 1280px.
- `--target reference` runs the same checks on the reference, and `--self` plants 15 defects there that each must add its problem: at least one of every kind above but the ARIA wiring, which the reference's own defect shows failing (`docs/reference-defects.md`).

## Fonts

- The system's typeface is Satoshi, from Fontshare: `--font-sans` names it first, with the system stack as fallback. Its licence (ITF Free Font License) allows self-hosting but not passing the files on, through a repository or a package among other ways, so neither the repository nor the package holds them. `check:package` fails a tarball with a font file in it.
- `npm run fonts` (`scripts/fonts.ts`) downloads the official variable file from Fontshare into `fonts/`, which git ignores, and checks it against the release the baselines were made with (`satoshiSha256` in `scripts/lib/fonts.ts`). A new release fails it: take one on purpose, then run the self-tests again.
- Every gate page declares the face (`fontStyle` in `scripts/lib/pages.ts`, served from `/fonts/`), and `openPage` waits until the page has loaded it, so nothing is measured or captured in a fallback face. A preview page also holds its first render until the font has loaded (`fontShim`): some references measure text once, at mount (an open Popover places itself from its anchor's size and moves only on a window resize), and a render before the font arrived made the parity self-test depend on load timing. Storybook copies `fonts/` next to `iframe.html` and declares the face in its preview head; the behaviour specs load it in `tests/behaviour/setup-fonts.ts`.
- So `npm run build-storybook` puts the file in `storybook-static/fonts/`, which git ignores. Publishing that folder as it stands would pass the file on: a hosted Storybook has to load the font another way first.

## After porting a module

Record the reference files it came from: `node scripts/check-sync.ts --record <Name>`. Then `npm run check:sync` tells you when a regeneration changes them.
