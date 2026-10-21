# Diagram

The site's data-driven SVG diagram: glass nodes, edges that draw in with their own arrowheads, labels, tinted regions, and a pulse that travels every accent edge.

**Source:** `src/components/diagram/Diagram.tsx` and the `.dg-*` rules in `global.css`, renamed `.gl-dg-*` with every value kept: node boxes `rgba(255,255,255,0.92)` with a `radius-node` corner and a soft drop, edges `dg-edge` at 2px, accent edges and outlines `color-blue`, accent fill `dg-node-accent` with `on-ink` text, labels `color-muted` / `color-blue-deep`, region tints `rgba(142,184,232,0.12–0.22)`. The entrance is `diagram-reveal.ts` and the scroll floor is `scrollable-hosts.ts`, both moved into the component. `DiagramHost` is the shared shell, exported so you can put your own SVG in it.

## When to use

- Use it for a system or a flow: what talks to what, in which order, and which path matters. The site draws its deploy pipeline, the request path and every client project with it.
- Mark the one path the story is about with `tone: 'accent'`. Accent edges carry the travelling pulse, so keep it to one path, or a few hops of the same path.
- Use `TimingChart` for before/after numbers and `BarChart` or `LineChart` for data. A diagram shows how things connect, not how much.

## What you provide

- `data`: a `DiagramData` in its own coordinate space (`width` × `height`, 760 wide for a card, 600 for the hero). Place `nodes` (`lines` are explicit: SVG text doesn't wrap; `{ text, bold: true }` for the name line), `edges` (polylines, arrowhead on the last point unless `arrow: false`, `dashed` for "caps" or "returns"), `labels` (top-left placed, `align: 'middle'` inside `w`) and optional `regions` (`panel`, `ring`, `ring-inner`).
- `data.label` and `data.description`: the accessible name and one or two sentences that spell out what the arrows say. Write the description as prose that a reader could act on without the picture.
- A container. The SVG fills its width; put it in an inset well (`Paper variant="inset"`, 22px padding) with a `figcaption` in `text-micro` / `color-muted`, as the site does.
- `DiagramHost` takes `label`, `description`, `width`, `height` and SVG children. The children can use the `gl-dg-*` classes (`gl-dg-node`, `gl-dg-box`, `gl-dg-edge gl-dg-edge-draw` with `pathLength={1}`, `gl-dg-label`) and set `--i` for the stagger.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `data` | `DiagramData` | required |
| `minScale` | number: the SVG scales with its host down to `width × minScale` px, then the host scrolls sideways and shows "Scroll sideways for the whole diagram." The site uses 0.58 for the hero and 0.6 for cards. | `0` (always scale) |
| `reveal` | boolean: regions fade, nodes rise in order (90ms apart), edges draw in (160ms apart) with their arrowheads after, labels and pulses fade last | `true` |
| `pulses` | boolean: a dot runs each accent edge every 3.2s while the diagram is on screen | `true` |

The entrance plays once, when 30% of the diagram is in view. Under `prefers-reduced-motion: reduce` the diagram renders finished and the pulses are hidden and paused. Automated browsers (`navigator.webdriver`) also get the finished diagram, so screenshots never catch it half-way. Print always shows it finished. Without JavaScript the markup is fully visible. On a server-rendered page, add `gl-js` to `<html>` in a head script (the site's `.js`): diagrams then start hidden, and if the component never hydrates, a failsafe shows them after 2.5s.

## Keyboard

- Tab: reaches a host only while it overflows (below the `minScale` floor). The host is then a named `group`.
- Arrow keys: scroll the host sideways while it has focus.

## Do and don't

- Do give every diagram a real `description`. The SVG is `role="group"` with that `desc`, and screen readers read the text inside it.
- Do keep a `minScale` on anything wider than a phone. Below about 9px the node text stops being legible, so let the host scroll instead.
- Don't recolour nodes or edges outside the two tones. The accent is one story per diagram.
- Don't hide content behind the reveal. It only fades in what is already there, and every state ends fully drawn.
