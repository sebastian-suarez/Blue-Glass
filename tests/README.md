# Gates

Every gate reads its scope from `tests/phases.json`: the modules ported up to the current phase, their exports, and the previews whose components all exist by then. `BLUE_GLASS_PHASE=N` or `--phase N` overrides it. Reports go to `reports/`, which git ignores.

| Gate             | Command                                      | Fails when                                                                                                                                                            |
| ---------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parity           | `npm run parity`                             | A preview's package page logs an error, has a different size, or has a section with more differing pixels than its budget, at rest or in an opened state              |
| Parity self-test | `npm run parity:self`                        | The reference doesn't match itself, or a planted defect (radius, colour, 2px shift, tracking) passes                                                                  |
| Server HTML      | `npm run check:ssr`                          | A preview can't render on the server, logs an error, hydrates with an error, hides text in its server HTML, or leaves out text the reference showed before JavaScript |
| Story layout     | `npm run check:layout`                       | A listed story's server HTML lays out differently from its hydrated page at 390px or 1280px (the self-test proves a layout chosen in JavaScript fails)                |
| Reference sync   | `npm run check:sync`                         | A reference file changed since the module built from it was ported                                                                                                    |
| Unit             | `npx vitest run --project unit`              | Node tests, including the gates' own rules                                                                                                                            |
| Browser          | `npx vitest run --project browser`           | Package-only tests in Chromium: internals and adapters                                                                                                                |
| Behaviour        | `npx vitest run --project behaviour:package` | Each phase's specs, written against `#ui`; `behaviour:reference` runs the same specs on the reference                                                                 |

## Parity

- Both runtimes run the unchanged `preview.html` on the same React 19 production build (`scripts/runtimes.ts`), so only the component code differs.
- Captures are deterministic (`scripts/lib/capture.ts`): a fixed viewport, clock and locale, finite animations jumped to their end, and infinite and SVG animations paused at 0. The reference matches itself with 0 differing pixels.
- Budgets live in `tests/parity/thresholds.json`. The default, 16 px per section, sits far below the smallest planted defect (243 px). A preview gets its own budget only with a reason a reviewer can check.
- Opened states live in `tests/parity/states.ts`. Overlays and inputs add theirs in their phase.

## Server HTML

- `scripts/lib/server-render.ts` runs each preview's script in Node with stand-ins for `window` and `document`, and renders its tree with `renderToString`.
- The rules are in `scripts/lib/ssr-rules.ts` and have tests of their own.
- Text shown only after JavaScript is hidden (in the server HTML, invisible) or absent (not there at all). Hidden always fails. Absent fails unless the reference didn't show it before JavaScript either.
- `tests/ssr/reference-baseline.json` records the reference's hidden and absent texts. Re-record it only after `design-system/` is regenerated: `node scripts/ssr/run.ts --reference --record`.
- `tests/ssr/exceptions.json` excuses named texts, or a whole preview, with a reason.

## Story layout

- `tests/ssr/layout.json` lists the stories files checked from each phase: the sections and the components whose layout changes with the viewport.
- `scripts/ssr/layout.ts` composes each story with the preview's decorators, renders it in Node, then compares where every text sits with JavaScript off and after hydration, at 390px and 1280px.

## After porting a module

Record the reference files it came from: `node scripts/check-sync.ts --record <Name>`. Then `npm run check:sync` tells you when a regeneration changes them.
