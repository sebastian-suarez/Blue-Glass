# Mermaid

Mermaid diagrams drawn exactly like `Diagram`. Mermaid lays the diagram out; `MermaidDiagram` reads the layout back and redraws flowcharts, state diagrams and sequence diagrams with `Diagram`'s own marks: the same glass boxes, type, edges, arrowheads, labels, regions, entrance and pulses. Other diagram types keep Mermaid's drawing, dressed by `mermaidTheme`.

**Source:** An addition (the site draws its diagrams with `Diagram`). The marks are `Diagram`'s, rendered by the same code: `.dg-box` nodes on `radius-node` (10) with the drop shadow, 15px node text on 20px lines, `dg-edge` lines 2px wide with the 4-unit arrowhead stopping 1 unit short of the box, the accent path in `color-blue` with the travelling pulse, 13px labels in `color-muted` (`color-blue-deep` on the accent path), `.dg-region-panel` regions on radius 16 with the title at the top left. Sequence diagrams add three marks in the same materials: dashed `.dg-box`-hairline lifelines, `color-ink` number badges, and frames as panels. The fallback code block is the site's inline code (`.hiw-section code`) as a block.

## When to use

- Use it for diagrams written as text: flowcharts, state machines and sequence diagrams in docs, READMEs and case studies, where placing every box by hand would be overkill.
- Use `Diagram` when the placement is the point: the hero, or a figure that must line up with the copy around it. It needs no script and renders on the server.
- Mark the one path the story is about with `==>`, as `Diagram` does with `tone: 'accent'`.

## What you provide

- `chart`: the Mermaid source. Start it with `accTitle:` and `accDescr:`. They become the figure's name and description. Without `accDescr`, the description lists the arrows in words ("Arrows: Pull request to GitHub Actions (merge); …").
- Two-line nodes, as the site's: `id["<b>Name</b><br>what it does"]`. Node text breaks only where you write `<br>`, as in `Diagram`. Edge labels wrap at 200px.
- A container: an inset well (`Paper variant="inset"`, 22px padding). The drawing is never larger than drawn, so the type stays 15px. In a narrower column it scales down to `minScale`, then scrolls.

## Syntax mapping

| Mermaid | Drawn as |
| --- | --- |
| `A --> B` | an edge with the arrowhead, right-angled, leaving and entering the boxes square |
| `A ==> B` | the accent edge (`color-blue`) with its pulse |
| `A -.-> B` | the dashed edge (6 6) |
| `A --- B` | an edge without a head, touching both boxes |
| `A <--> B`, `A --o B`, `A --x B` | heads at both ends, a dot end, a cross end |
| `A -->\|text\| B` | a label 12 units above the line (or right of a vertical one), never on it |
| `id[...]:::accent`, `class id accent` | the accent box: `color-blue` outline at 1.5 |
| `id[...]:::accentFill` | the filled box: `dg-node-accent` with `on-ink` text |
| `subgraph x [Title] … end` | a region panel, the title at its top left |
| `{…}`, `[(…)]`, `((…))`, `([…])`, `{{…}}` | Mermaid's outline (decision, database, circle, stadium, hexagon) in the box material |
| `stateDiagram-v2` `[*]` | the start dot and the end ring, in `dg-edge` |
| `sequenceDiagram` participants | boxes, the first line bold; `actor` takes the accent outline |
| `autonumber`, `activate`, `Note`, `alt`/`loop`/`opt`/`par`/`critical`/`break`, `rect`, `box` | ink number badges, glass activation bars, notes as small boxes, frames and groups as panels titled "alt · cached", dashed dividers for `else`/`and`/`option` |

Every rectangular box in a flowchart or state diagram takes one width (the widest label plus 20 a side, 120–240), as the site's do. Mermaid lays the diagram out a second time at that width, so the spacing stays right. Edges that leave or enter one side of a box in the same style share a trunk; edges in different styles get their own ports, 24 apart; runs that would overlap in one gap get their own tracks, so two unrelated edges never merge into one line. `classDef` colours and `style` lines are ignored: the tones above are the only ones.

## Props

| Prop | Values | Default |
| --- | --- | --- |
| `chart` | Mermaid source | required |
| `title` | accessible name for the figure, when the source has no `accTitle` (a front-matter `title` also counts) | none |
| `config` | Mermaid config over `mermaidTheme`: objects merge one level deep, `themeCSS` appends | none |
| `src` | where Mermaid loads from, once per page | `https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.min.js` |
| `minScale` | number: the figure scales with its container down to this share of its drawn width, then scrolls sideways with "Scroll sideways for the whole diagram." (Tab reaches it while it overflows) | `0.6` |
| `restyle` | `false` keeps Mermaid's own drawing, themed, for any diagram | `true` |
| `reveal` | play `Diagram`'s entrance when the figure scrolls into view | `true` |
| `pulses` | run a pulse along every accent edge while on screen; never under reduced motion | `true` |

Mermaid loads through a single script tag the first time a diagram mounts. Diagrams render one at a time, with `securityLevel: 'strict'`. While loading, the source shows with "Drawing the diagram…" in a `role="status"` line. If the script fails to load or the source doesn't parse, the source stays with a line that says why. When `chart` changes, the last drawing stays until the new one is ready. If a diagram uses something the redraw can't read (an image or icon node, a sequence element it doesn't know), Mermaid's own drawing shows instead.

`mermaidTheme` works on its own too: `mermaid.initialize({ ...mermaidTheme, startOnLoad: false })` gives Mermaid's drawing in the Blue Glass colours, the type sizes, and pies in `chart-1` to `chart-4`.

## Keyboard

- Tab: reaches a figure only while it overflows its `minScale` floor. Arrow keys then scroll it.

## Do and don't

- Do write `accTitle` and `accDescr`. The description should say in words what the arrows say.
- Do keep one accent path per diagram (`==>`), plus at most one accent box.
- Do write `direction LR` inside a subgraph that has no edges leaving it. Mermaid lays such a subgraph out top to bottom otherwise.
- Don't depend on the CDN for anything critical. The source is the fallback, so write it to read well as text too.
- Don't restyle with `classDef` or `!important`. The drawing uses `Diagram`'s tones only.
