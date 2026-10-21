# Backdrop

The scrim behind a modal task. It dims and frosts the page so the glass surface on top reads first. It also covers a region while that region is busy.

**Source:** an addition: the site has no modal. It uses the `scrim` token (`color-ink` at 32%) with a 6px backdrop blur. The blur drops under reduced transparency.

## When to use

- Behind `Dialog` and `Drawer`, where `Modal` renders it for you.
- On its own as a loading cover over a region that can't be used yet. Put a short status line in it ("Publishing…").
- `invisible` for layers that must catch an outside press without dimming, such as menus and popovers.

## What you provide

- `open`, plus `onClick` when a press should dismiss.
- `children`: centred content such as a spinner and a word. Never colour alone.
- `invisible`, `transitionDuration` (Fade: 200ms in, 150ms out), `keepMounted`.
