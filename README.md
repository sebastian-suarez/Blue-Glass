# Blue Glass

The design system of [sebastiansuarez.dev](https://sebastiansuarez.dev) as a React package, `@sebastian-suarez/blue-glass`. Every component keeps the documented Blue Glass API, runs on [Base UI](https://base-ui.com) where Base UI has the primitive, ships in one plain stylesheet, and renders server HTML that works before hydration. Storybook documents it.

It's a port in progress. `design-system/` holds the reference: the brand book, the tokens, and every component's spec, preview and current implementation. The package is built from it in phases, each judged by an acceptance suite that compares the port with the reference pixel for pixel. Phases 0 to 2 are done, 43 of 66 components; phase 3, the inputs, is under way. The package stays `private: true` until the port is complete and a registry is chosen.

## What's in the repository

| Path                      | What                                                                                                                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `design-system/`          | The reference, committed as data: `brand-book.md`, `tokens/`, `foundation.css`, and for each component its README, `api.d.ts`, `styles.css`, `preview.html` and `reference.tsx`. Nothing here is imported or built.                                     |
| `src/components/<Name>/`  | A ported component: `<Name>.tsx`, its stylesheet, its stories and `index.ts`.                                                                                                                                                                           |
| `src/internal/`           | The adapters between the documented API and Base UI: events and close reasons, anchors, transitions that render visible on the server, the modal flags, the form controls, the popup layer. Each has its tests beside it.                               |
| `src/styles/`             | The stylesheet: the tokens, the foundation, then each component's section in the reference bundle's order, which the build checks.                                                                                                                      |
| `stories/`, `.storybook/` | Storybook: the brand book, the tokens, the foundations, the site's five sections, and each component's stories (`stories/README.md`).                                                                                                                   |
| `tests/`                  | The acceptance suite: behaviour specs that run on the reference and on the package, the parity, server-HTML, layout, island, API, Storybook and package gates (`tests/README.md`), and the Astro consumer fixture.                                      |
| `scripts/`                | The builds and the gates.                                                                                                                                                                                                                               |
| `docs/`                   | `package-plan.md` (the decisions and the Base UI mapping), `phase-runbook.md` (how a phase runs, and where things stand), `porting.md` (how a module is ported), `deviations.md`, `reference-defects.md`, and each phase's review log under `reviews/`. |

## Using the package

Until it's published, install it from a packed tarball:

```sh
npm run build && npm pack                                # in this repository
npm install ../Blue-Glass/sebastian-suarez-blue-glass-0.1.0.tgz   # in yours
```

Peers: `react` and `react-dom` at 19. `mermaid` is an optional peer, for the Mermaid component. The package is ESM only and needs Node 22.12 or later.

```tsx
import { Button, Dialog, TextField } from "@sebastian-suarez/blue-glass";
```

```css
@import "@sebastian-suarez/blue-glass/styles.css";
```

It also exports `tokens.css` (the custom properties and the `text-*` classes alone), `baseline.css` (CssBaseline's resets as a file, for static HTML) and `tokens.json`.

The styles sit in three cascade layers, `gl-fallback`, `gl-base` and `gl-components`, so they compose with Tailwind 4 once the layer order is declared before any import:

```css
@layer theme, base, gl-fallback, gl-base, components, gl-components, utilities;

@import "tailwindcss";
@import "@sebastian-suarez/blue-glass/styles.css";
```

Tailwind's preflight then sits under Blue Glass's base layer, and its utilities win over everything, the type classes included. `tests/consumer/astro` is this set-up in Astro 7 with React islands, and the package gate checks it.

### Type

The system's typeface is Satoshi, named first in `--font-sans` over the system stack. Its licence, the ITF Free Font License, allows self-hosting but not passing the files on, so neither this repository nor the package holds them. Get the variable font from [Fontshare](https://www.fontshare.com/fonts/satoshi), serve it from your site and declare it; without it, the system stack shows.

```css
@font-face {
	font-family: "Satoshi";
	src: url("/fonts/Satoshi-Variable.woff2") format("woff2");
	font-weight: 300 900;
	font-style: normal;
	font-display: swap;
}
```

## Developing

Node 24, which CI runs, and npm.

```sh
npm ci
npm run fonts          # downloads Satoshi into fonts/ (git-ignored) for the gates, Storybook and the specs
npx playwright install chromium
npm run storybook      # http://localhost:6006
npm run build          # dist/: JS and types per file, styles.css, tokens.css, baseline.css, tokens.json
npx vitest run         # the unit, browser, behaviour (reference and package) and Storybook projects
```

The gates, each with what fails it in `tests/README.md`:

```sh
npm run typecheck && npx xo && npm run build
npx vitest run
npm run check:api && npm run parity && npm run check:ssr && npm run check:sync
npm run check:layout && npm run check:islands
npm run check:package && npm run build-storybook && npm run check:storybook
```

Every command has to pass before a phase is handed off (`docs/porting.md`, "Done means"). The parity and server-HTML reports land in `reports/`.

- **TypeScript 7.** `tsc` is TypeScript 7, installed as `@typescript/native`. XO lints through typescript-eslint, which needs the TypeScript 6 API, so the `typescript` name is aliased to `@typescript/typescript6` ([Microsoft's side-by-side set-up](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)). Drop the alias once typescript-eslint supports TypeScript 7.
- **Lint and format.** XO and Prettier run on commit through husky and lint-staged. Run `npx xo` without `--fix`: `--fix` changes meaning in places (`docs/phase-runbook.md`, the traps).
- **The reference** is reassembled from `design-system/` by `npm run reference` into `.cache/reference`, so the same specs run on it and on the package.

## How it's built

`docs/package-plan.md` sets the decisions: each component's `api.d.ts` is the contract; Base UI for behaviour where it has the primitive, with each departure from the documented API recorded in `docs/deviations.md`; plain React ports elsewhere; server HTML usable before hydration; React 19 only. The work runs in phases (`docs/phase-runbook.md`). Each phase opens its part of the suite first (behaviour specs written from the READMEs and run on the reference, opened states for the parity gate, Storybook interaction entries), freezes it, ports the modules against it, and logs its reviews under `docs/reviews/`. The reference's own faults are listed in `docs/reference-defects.md` and aren't ported.

## Licence

MIT (`LICENSE`) for the code in this repository. The brand, copy and imagery in `design-system/` are the site owner's. Satoshi isn't included; see Type.
