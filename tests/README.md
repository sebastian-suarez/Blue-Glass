# Gates

Every gate reads its scope from `tests/phases.json`: the modules ported up to the current phase, their exports, and the previews whose components all exist by then. `BLUE_GLASS_PHASE=N` or `--phase N` overrides it. Reports go to `reports/`, which git ignores.

| Gate              | Command                                      | Fails when                                                                                                                                                                                                                                                                                                              |
| ----------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parity            | `npm run parity`                             | A preview's package page logs an error, has a different size, or has a section with more differing pixels than its budget, at rest or in an opened state                                                                                                                                                                |
| Parity self-test  | `npm run parity:self`                        | The reference doesn't match itself, or a planted defect (radius, colour, 2px shift, tracking) passes                                                                                                                                                                                                                    |
| Server HTML       | `npm run check:ssr`                          | A preview can't render on the server, logs an error, hydrates with an error, hides text in its server HTML, or leaves out text the reference showed before JavaScript                                                                                                                                                   |
| Story layout      | `npm run check:layout`                       | A listed story's server HTML lays out differently from its hydrated page at 390px or 1280px (the self-test proves a layout chosen in JavaScript fails)                                                                                                                                                                  |
| Delayed hydration | `npm run check:islands`                      | An island, not yet hydrated, shows the wrong tab or rows, lacks its ARIA wiring or tab stop; or it hydrates with an error, a moved text or lost focus; or it then ignores its documented keys and clicks (the self-test plants each kind of defect on the reference, but the wiring, which the reference already lacks) |
| Reference sync    | `npm run check:sync`                         | A reference file changed since the module built from it was ported                                                                                                                                                                                                                                                      |
| Unit              | `npx vitest run --project unit`              | Node tests, including the gates' own rules                                                                                                                                                                                                                                                                              |
| Browser           | `npx vitest run --project browser`           | Package-only tests in Chromium: internals and adapters                                                                                                                                                                                                                                                                  |
| Behaviour         | `npx vitest run --project behaviour:package` | Each phase's specs, written against `#ui`; `behaviour:reference` runs the same specs on the reference                                                                                                                                                                                                                   |

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

## Delayed hydration

- The portfolio hydrates its interactive sections late, as islands. `tests/ssr/fixtures/islands.tsx` holds them: the client-work Tabs, a project's Tabs, the career Accordion and the capabilities PaneAccordion.
- `scripts/ssr/islands.ts` renders each in Node, loads the HTML with JavaScript on but not hydrated, and checks what the READMEs promise: the chosen tab or open rows show and the rest don't, tabs and panels name each other, and Tab reaches the selected tab and then its panel, or the first summary. Only then does the island hydrate, and it must do so with no error, no text moving more than 2px and focus kept, then answer End, Enter, the arrows and clicks as documented. At 390px and 1280px.
- `--target reference` runs the same checks on the reference, and `--self` plants 15 defects there that each must add its problem: at least one of every kind above but the ARIA wiring, which the reference's own defect shows failing (`docs/reference-defects.md`).

## After porting a module

Record the reference files it came from: `node scripts/check-sync.ts --record <Name>`. Then `npm run check:sync` tells you when a regeneration changes them.
