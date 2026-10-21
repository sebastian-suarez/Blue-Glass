# Fab

A floating action button: the site's ink or glass pill cut as a circle, for the one action a screen is for, with an `extended` pill that adds a label.

**Source:** an addition, matching MUI's Fab, cut from `.btn-primary` and `.btn-glass` in `global.css`. The `primary` fill (`color-ink`, `on-ink`, `shadow-primary`, `ink-hover` under a pointer), the `glass` fill (white at 0.5, a `#fffc` edge, `shadow-control`, `blur-control`, white at 0.75 under a pointer), the press scale and the `extended` pill (the `.btn` padding and gap) are the site's. The circle, the `sm` and `lg` sizes and pinning are additions.

## When to use

- Use one `primary` Fab per screen, for the action the screen is for ("Email me"). A second floating action, such as "Back to top", is `glass`.
- Use `extended` when the icon alone is ambiguous or the screen is wide enough for a label.
- Don't use a Fab for actions that belong in the page flow. Inline actions are `Button`s.

## What you provide

- `children`: an `Icon` (18px at `md`, 16px at `sm`, 20px at `lg`), or an `Icon` then the label when `extended`.
- `aria-label`: required when the Fab shows only an icon. Name the action, not the glyph ("Back to top", not "Arrow up").
- `href` renders an `<a>` with the same look; keep `<button>` for actions.
- Placement. A Fab doesn't position itself. To pin it to the viewport:

```css
position: fixed;
right: calc(var(--space-md) + env(safe-area-inset-right, 0px));
bottom: calc(var(--space-md) + env(safe-area-inset-bottom, 0px));
z-index: var(--z-fab);
```

  The insets keep it clear of the home indicator and the notch. They need `viewport-fit=cover` in the viewport meta tag. Stack a second Fab 12px above the first.
- Enter and exit: wrap it in `Zoom` (`<Zoom in={show}><Fab …/></Zoom>`). The press uses the `scale` property, so it composes with Zoom's transform. The Fab keeps its own hover and press transitions when Zoom sets `transition` inline.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `variant` | `primary` · `glass` | `primary` |
| `size` | `sm` (36px) · `md` (46px) · `lg` (56px) | `md` |
| `extended` | boolean: a pill with icon and label | `false` |
| `disabled` | boolean | `false` |
| `href` | renders an `<a>` | — |

## Keyboard

- Tab reaches it; Enter and Space activate it, as any button.

## Do and don't

- Do keep it out of the reading path. Pin it to a corner, over content, never over the content's own controls.
- Do hide it with `Zoom` when its action doesn't apply (no "Back to top" at the top). Under reduced motion Zoom only fades.
- Don't put two `primary` Fabs on one screen, and don't use one for a destructive action.
- Don't drop the `aria-label` on an icon-only Fab. Colour and glyph never name an action.
