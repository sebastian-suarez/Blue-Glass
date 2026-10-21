# API gate

Checks that the package keeps the documented API in `design-system/source/index.d.ts`, for everything in scope: the modules of every phase up to `current` in `tests/phases.json` (`BLUE_GLASS_PHASE=N` overrides it).

`npm run check:api` builds the package, then:

1. `scripts/api/generate.ts` writes one line per check to `generated/`, a file per component folder. Each line compiles only while its check holds.
2. `scripts/api/compile.ts` compiles them with TypeScript 7 (`tsconfig.json` here) against `dist/index.d.ts`, the built declarations, and names each failing check.
3. `exports.test.ts` imports `src/index.ts` and checks the export names.

What it checks:

- **Exports:** every documented value in scope is exported and defined, and every documented type is exported. Anything else needs an entry in `allowlist.json` under `exports`, with the reason.
- **Types**, by check id: `#keys` (no documented key missing: assignability alone misses removed optional props), `.<key>` and `#inherited` (each documented prop type is assignable to the package's, callbacks compared strictly), `#required` (no new required keys), `#assignable` for unions, and `#any`, `#any-props` (nothing turned into `any`).
- **Components:** `#jsx` (the documented props compile in JSX), `#keys`, `#props`, `#ref` (the documented ref is accepted), `#ref-element` (the ref still points at the documented element) and the `any` checks. Autocomplete and other generics are checked with their defaults and with `Probe`, a type nothing else matches.
- **Functions and constants:** `#signature` (the package's function can stand in for the documented one), `#call/N` (each documented call compiles and returns the documented type), `#value` and `#any`.

`generated/` is gitignored: it's derived from the phase and the reference, and every run writes it again, so a committed copy could only drift or be hand-edited without effect.

A phase sets `current`, ports its modules, and runs `npm run check:api` until it passes. A documented prop the package must change or drop gets its reason in `docs/deviations.md`, and its check id in `allowlist.json` under `checks`. A waiver whose check passes again fails the gate, so the list stays true.

`gate.test.ts` proves the gate in the unit project: the phase 5 checks pass on the documented types themselves, and each fixture in `fixtures/` (the documented API with planted breaks) fails exactly the checks that cover its break, with a message that names it.
