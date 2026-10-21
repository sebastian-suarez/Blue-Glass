# SiteHeader

The top of sebastiansuarez.dev, rebuilt from the library: the identity strip in an `AppBar`, then the "Shipped for" strip of employer plates.

**Composed from:** `AppBar` + `Toolbar` with the AppBar part classes (`gl-app-bar-brand`, `-monogram`, `-title`, `-subtitle`, `-nav`, `-link`, `-action`), `Stack`, `Chip variant="plate"`. Copy and order come from `src/components/Header.tsx` and `src/data/employers.ts`.

## How to reuse it

- Keep the order: monogram and name, then the pill nav, then "Read résumé ↗". Nav labels are single words in sentence case.
- The strip sits between two `color-line` hairlines with `space-xs` between plates.
