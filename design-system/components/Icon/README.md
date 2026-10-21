# Icon

Line glyphs on a 24-unit grid with a 1.5 stroke and round caps and joins, painted in `currentColor`. `Icon` takes a glyph name and `SvgIcon` is the shell for your own paths.

**Source:** the site has exactly one icon, the north-east arrow in `src/components/Icons.tsx`. It's `arrow-ne` here, path for path. Blue Glass **adds** the other 51 glyphs (close, check, chevrons, status marks, star and the rest), drawn to the arrow's spec so the components have what they need. They are not the site's assets. This card covers MUI's "Icons" and "Material Icons" entries: Blue Glass ships no Material icon font.

## When to use

- `arrow-ne` on every outbound or "go" link, after the label, as the site does ("Repository ↗").
- The status glyphs (`success`, `warning`, `error`, `info`) always beside a word. Colour alone never carries a state.
- Give a meaningful standalone icon a `title`, which makes it `role="img"` with that name. Without a title it's decorative and `aria-hidden`.

## What you provide

- `name`: one of `iconNames`.
- `size`: 18 by default (the site's `size-icon`); 14–16 inside small links and buttons.
- Colour through CSS `color`. Glyphs inherit it.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `name` | any of `iconNames` | — |
| `size` | number or CSS length | `18` |
| `filled` | fill closed shapes (a selected star) | `false` |
| `title` | accessible name | — |
| `strokeWidth` | on the 24 grid | `1.5` |
