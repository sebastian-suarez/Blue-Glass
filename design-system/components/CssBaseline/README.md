# CssBaseline

Adds the element resets the site gets from Tailwind's preflight, once per document while mounted, and renders its children unchanged.

**Source:** the site's `@layer base` in `global.css`: canvas background, ink text, the system stack at 16px/1.6, balanced headings, pretty paragraphs, the `focus` ring (3px solid, 5px offset) and the `selection` colours. `bundle.css` always applies the body part. `CssBaseline` adds the margin, list and form-control resets.

## When to use

- Once, at the root of a page that has no reset of its own.
- Skip it inside a page that already ships a reset. The components don't depend on it.

## Notes

- The resets go in the `gl-base` cascade layer, so any unlayered CSS of yours wins.
- Smooth scrolling is on only when the reader allows motion.
