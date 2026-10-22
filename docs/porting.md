# Porting a module

How a phase ports a reference module into the package. Both attempts of a phase work from this guide and from the phase's spec, against the same frozen suite.

## The spec

For each module, `design-system/components/<Name>/` holds:

- `api.d.ts`: the public contract.
- `README.md`: behaviour, keyboard and do's and don'ts.
- `styles.css`: the look.
- `preview.html`: the states and copy.
- `reference.tsx`: how the reference does it.

Also read:

- `docs/package-plan.md`: the Base UI mapping and the rules.
- `docs/deviations.md`: the deviations already agreed. Add any new one there with its reason.
- `docs/reference-defects.md`: the reference's known faults. Don't port them.
- Base UI's own docs, in `node_modules/@base-ui/react/docs/react/components/<name>.md`.

## What a module adds

| File                                       | What                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/<Name>/<Name>.tsx`         | The implementation, with every value and type of the module's section in `design-system/source/index.d.ts`, under the same names |
| `src/components/<Name>/<Name>.css`         | The ported `styles.css`, inside `@layer gl-components`                                                                           |
| `src/components/<Name>/<Name>.stories.tsx` | The preview as stories (see `stories/README.md`)                                                                                 |
| `src/components/<Name>/index.ts`           | The module's public exports                                                                                                      |
| `src/index.ts`                             | Those exports, in `source/index.d.ts` order                                                                                      |
| `src/styles/index.css`                     | `@import "../components/<Name>/<Name>.css";`, in the reference bundle's order (the build checks it)                              |
| `tests/sync.json`                          | `node scripts/check-sync.ts --record <Name>`, once the port is done                                                              |

## Rules

- **Behaviour.** Use Base UI where the plan maps the module to it. Where they disagree, the documented API wins, unless `docs/deviations.md` records otherwise.
- **React 19 only.** Take `ref` as a prop and don't use `forwardRef`. Put `'use client'` at the top of every module that uses state, effects, context or Base UI.
- **Server HTML is usable before hydration:**
  - Nothing reads `window` or `document` during render.
  - Content that's open or `in` renders visible on the server.
  - Layout that depends on the viewport comes from CSS media queries. `useMediaQuery` may only refine behaviour after hydration.
  - Ids come from `useId` in `src/internal/hooks.ts`.
- **Events.**
  - When the documented callback takes a React event and one exists, pass it.
  - Otherwise use the adapters in `src/internal/` (see their doc comments): events and reasons, anchors, transitions, modal flags, the two-mode MenuItem, form controls.
- **CSS.**
  - Keep the reference's class names (`gl-*`) and its media queries for hover, reduced motion and reduced transparency.
  - Move selectors to Base UI's DOM and data attributes.
  - Use tokens, never new raw values.
  - Type comes from the tokens (`--font-sans` and the `text-*` classes). Add no font files or `@font-face`: Satoshi's licence forbids shipping them (`tests/README.md`, "Fonts").
  - Base UI positions popups with `--transform-origin`, `--anchor-width` and `--available-height`.
- **Renamed helpers:** the reference's `contains` is `isInside`, and its `usePrefersReducedMotion` is `useShouldReduceMotion`.
- **Style.**
  - XO and Prettier, as the pre-commit hook runs them.
  - Regexes in `src/` use the `u` flag.
  - Comments are short and say why.
- **Off limits:**
  - `design-system/` and the frozen suite: the phase's `tests/behaviour/` specs, `tests/parity/`, `tests/ssr/`, `tests/api/` (including `allowlist.json`), `tests/storybook/`, `tests/phases.json`, the adapters' own tests in `src/internal/`, and the gates and their helpers in `scripts/`.
  - New dependencies.
  - If a budget, a spec or a needed API waiver looks wrong or missing, say so in the report instead of changing it. Waivers for deviations agreed before the phase are already in `tests/api/allowlist.json`.

## Done means

Once per checkout: `npm ci && npm run fonts` (Satoshi, which the repository doesn't hold: `tests/README.md`, "Fonts"). Then run with the manifest at the phase:

```sh
npm run typecheck && npx xo && npm run build
npx vitest run
npm run check:api && npm run parity && npm run check:ssr && npm run check:sync
npm run check:layout && npm run check:islands
npm run check:package && npm run build-storybook && npm run check:storybook
```

Every command has to pass.
