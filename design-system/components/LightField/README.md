# LightField

The blurred rings and fold that the glass sits on: without them, glass over flat canvas reads as plain white.

**Source:** `src/components/LightField.tsx` and `.light-field`, `.light-ring`, `.light-fold` in `global.css`, with the placements copied exactly. The `compact` variant is an addition for boxes smaller than a page section.

## When to use

- One field per page region, behind the glass, never in front of content. The site uses `top` behind the hero, `middle` behind the projects and `bottom` behind the contact slab.
- `compact` inside a bounded box such as a dialog backdrop, a showcase card or a preview.
- It's decorative. It carries no meaning and is `aria-hidden`.

## What you provide

- A container with `position: relative`, `isolation: isolate` and `overflow: clip`. The site's `.page` uses `clip` so sticky children still work. The field paints behind that container's content at `z-index: -1`.
- Nothing else: the colours come from `color-ring`, `color-secondary` and `color-wash`.

## Do and don't

- Do let it bleed off the container's edges. The rings are cropped on purpose.
- Don't animate it. It stays still behind moving glass.
- Under reduced transparency it drops to 40% opacity, and it's hidden in print.
