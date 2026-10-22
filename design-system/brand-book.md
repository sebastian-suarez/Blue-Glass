Blue Glass is the look of sebastiansuarez.dev. Frosted white panels sit on a pale blue canvas over blurred rings of light. Copy is plain and first-person, and the imagery is the system's own diagrams. Build every surface from the tokens and the `window.BlueGlass` components. Every value below is the site's unless it's marked as an addition.

## Content

- Write in the first person, plainly and specifically: "I draw the boundaries first." "I led two frontend developers and one backend developer."
- Make headlines claims, often two short sentences: "Backend lead. Builds the whole machine." "Training PDFs. A shorter wait." "A fitness app. Built together."
- Back a claim with a number and its unit: "Cut PDF generation from about 6 seconds to 10–20 milliseconds." "Reduced response payload size by 10%." Use an en dash for ranges and "·" as the separator.
- Use sentence case for every heading, label and button. Labels start with a verb and run two or three words: "Email me", "See the work", "Read résumé".
- Keep accents: Medellín, résumé.
- No emoji, no exclamation marks, no superlatives. Outbound links end with the `arrow-ne` glyph, not the word "external".
- Use at most one kicker per page (`text-kicker`, for example "How it works"), never above every section.

## Colour

One light theme. The site has no dark mode by design, and neither does this system.

| Token | Use | Reads on |
| --- | --- | --- |
| `color-canvas` | The page itself | — |
| `color-ink` | Primary text, the primary button's fill | canvas 11.6:1, glass 12.7:1 |
| `color-muted` | Ledes, captions, dates, metadata | canvas 6.7:1, glass 7.3:1 |
| `ink-soft` | Chips and dense lists | canvas 8.0:1, glass 8.8:1 |
| `color-link` | Inline prose links, always underlined 3px below | canvas 5.5:1 |
| `color-accent` | One highlighted item in a set (the accent pane's title) | canvas 7.5:1 |
| `color-blue-deep` | Accent text in diagrams and charts; the `info` status | canvas 5.9:1 |
| `color-blue` | Marks only: diagram strokes, pulses, progress, the selected star. Never text | canvas 3.7:1 |
| `on-ink` | Text on `color-ink` or any status fill | ink 13.3:1 |

- Glass comes in levels. `glass` (0.66 white) for panels, `glass-raised` (0.82) for the selected item, `glass-control` (0.55) for chips and small controls, `glass-inset` (0.45) for wells and plates, and `glass-faint` (0.35) for pill tracks. Edge every glass surface with `glass-edge`. Fall back to `glass-solid` when blur is missing or the reader asks for reduced transparency.
- The light field's `color-ring`, `color-secondary` and `color-wash` are decorative. Never use them for text or control edges.
- Hairlines are `color-line`, and they're decorative. A control's border must reach 3:1, so inputs, checkboxes and radios use `dg-edge`.
- **Additions** (the site has no states): `danger`, `warning`, `success` (a teal, so it never relies on hue against `danger`) and `info`, each with a `-soft` ground. Every status carries its icon and a word. `scrim` dims the page behind a modal.
- **Additions (charts):** `chart-1` to `chart-4` are marks only, in fixed order and never cycled. Text in a chart stays in `color-ink` or `color-muted`.

## Type

- Set everything in Satoshi (`--font-sans`): the variable font from Fontshare, weights 300 to 900, with the system stack as its fallback. Each site loads it itself: its licence (ITF Free Font License) allows self-hosting but not passing the files on, so they aren't part of this system or its package. Code uses `--font-mono`.
- Use the style classes the tokens generate (`.text-display`, `.text-heading`, `.text-body`…) or the components that wrap them (`Typography`).
- Display through heading styles are weight 400–500 with negative tracking: `text-display` is 80px at -0.05em, `text-heading` 32px at -0.035em. That's tighter than common guidance, and it's the brand. Keep it. Body text has no tracking.
- On the site the display sizes are fluid. Each token holds the desktop size, and its note has the `clamp()` (`text-display`: `clamp(44px, 5.6vw, 80px)`).
- Use only weights 400, 500 and 600. Balance headings and wrap paragraphs pretty. Prose stays under 62ch, a lede under 42ch.

| Style | Size | Use |
| --- | --- | --- |
| `text-display` | 80 / 1.02 | The hero headline, once per page |
| `text-title-xl` · `-lg` · `-md` | 72 · 60 · 50 | Secondary-page title · closing call to action · featured item |
| `text-statement` | 42 / 1.3 | One-sentence statement (the manifesto) |
| `text-heading` | 32 / 1.15, 500 | Section headings |
| `text-card-title` · `text-title-sm` · `text-subtitle` | 30 · 22 · 19 | Card, pane and dialog, small panel |
| `text-lede` · `text-lede-sm` | 19 · 18 | The paragraph under a headline, in `color-muted` |
| `text-body-lg` · `text-body` · `text-body-sm` | 17 · 16 · 15 | Copy |
| `text-small` · `text-caption` · `text-micro` · `text-nano` | 14 · 13 · 12 · 11 | Lists, links and plates, captions and chips, fine print |
| `text-button` · `text-label` · `text-kicker` | 14/500 · 13/600 · 13/600 +0.04em | Controls and labels |

## Glass, depth and shape

- **A glass panel** is `Paper`: `glass` fill with `blur-panel` and `saturate(115%)`, a 1px white edge, `shadow-panel` and a 120° sheen. Put it over a `LightField`, because glass on flat canvas reads as plain white.
- **Never stack glass on glass.** A surface inside a panel is `inset` (`glass-inset`, `shadow-inset`) or `solid`.
- **Radii carry meaning.**
  - Pills: `radius-pill` for every control, chip and plate.
  - Panels: `radius-panel` (28px; `radius-panel-sm`, 23px, under 700px).
  - Panes and lists: `radius-pane` (24px).
  - Wells and selectors: `radius-well` (22px).
  - Tabs: `radius-tab` (15px).
  - Small floating controls: `radius-control` (12px).
  - Diagram boxes: `radius-node` (10px).
  - Inline code: `radius-code` (6px).
- **Shadows by role.**
  - Panels: `shadow-panel`, lifting to `shadow-panel-hover` on a card under a fine pointer.
  - Panes: `shadow-pane`.
  - The ink button: `shadow-primary`.
  - Glass controls and tracks: `shadow-control`.
  - The selected item: `shadow-raised`.
  - Plates: `shadow-plate`.
- **Blur by size.** `blur-panel` 28, `blur-selector` 20, `blur-pane` 18, `blur-control` 16, `blur-surface` 15. Bigger surfaces are thicker.
- **Layers** (addition): `z-app-bar`, `z-drawer`, `z-modal`, `z-snackbar`, `z-tooltip`, `z-fab`. Don't use any other z-index.

## Space and layout

- Content sits in `Container`, the site's `.wrap`: `min(size-wrap, 90%)` (1180px), and 88% under 700px.
- Sections open with `space-section` (105px; 65px on phones) or `space-section-sm` (88px) after a strip.
- Pad panels with `space-2xl` (40px) or `space-3xl` (48px) and figures with `space-xl` (28px). Gaps in a row are `space-sm` between buttons, `space-xs` between plates or links, and `space-2xs` between chips.
- Breakpoints are the site's, in `media`: `phone` ≤700px, `tablet` ≤899px (one column), `desktop` ≥900px, `compact` ≤1000px, `tiny` ≤360px.
- Use the site's two-column patterns: the hero (0.95fr / 1.05fr), and projects (1fr / 2fr, with a sticky intro column from 900px).
- Tap targets: `size-control` (46px) for controls, `size-control-sm` (32px) for text links.

## Motion

- Use `ease-out-quint` for entrances, presses and expansions; `ease-in-out-quart` for things moving on screen (an edge drawing from source to arrowhead); `ease-folio` for the tab crossfade.
- Anything a person triggers stays under 300ms: `duration-press` 120, `duration-hover` 160, `duration-state` 180, `duration-surface` 220, `duration-tab` 280. Exits run faster than entrances. Only first-paint entrances use `duration-enter` (600ms).
- Never scale from nothing: menus grow from 0.96 and from their anchor; dialogs grow from the centre.
- The manifesto scrub animates colour from `scrub-from` to `color-ink`, never opacity, so every frame stays at 3:1 or better.
- Gate hover behind a fine pointer (`media.hover`). Under reduced motion nothing moves, and fades stay where a state change needs one. Under reduced transparency, glass turns solid.

## States

- **Focus:** a `focus` ring, 3px solid with a 5px offset (2px on dense controls). Never remove it.
- **Press:** `scale(0.98)` over `duration-press`.
- **Selected:** raised, with `glass-raised`, a white edge and `shadow-raised`, plus a mark: the check (`tab-mark`) or the short ink bar. Never fill alone.
- **Disabled:** 50% opacity with a not-allowed cursor.
- **Error:** `danger` with the `error` glyph and a sentence that says what to do: "Pick one so I can plan the start."

## Imagery

- Diagrams are the imagery. There are no photos and no illustrations.
  - Use `Diagram` for systems: white boxes on `radius-node`, `dg-edge` arrows, the accent path in `color-blue` with a travelling pulse, and labels in `text-diagram-label`.
  - Use `TimingChart` for a before/after number.
  - Use `MermaidDiagram` for diagrams written as text. Mermaid lays them out and `Diagram`'s marks draw them, so a flowchart, state or sequence diagram looks like the site's figures: `==>` is the accent path, `subgraph` a region, `:::accent` the accent box.
- Every figure gets a caption that says what it shows, in `text-micro` and `color-muted`.
- Charts are additions in the same marks: thin lines, 4px rounded bar ends, recessive axes. A legend appears from two series up, and there's only ever one y axis.

## Iconography

- The site has one icon: the north-east arrow (`arrow-ne`). It goes after the label on every outbound or "go" link.
- **Addition, flagged:** the other glyphs in `Icon` (close, check, chevrons, the status marks, star and the rest) are drawn to the arrow's spec. They're on a 24-unit grid with a 1.5 stroke and round caps and joins, in `currentColor`, at 18px by default. They aren't the site's assets.
- The monogram "ss" is set in type (the `AppBar` monogram, the `Avatar` tile). No logo file is part of this system.

## Components

React 18 components on `window.BlueGlass`, styled by `components/bundle.css` with `gl-` class names. Their values all come from the tokens above.

- **These mirror the site's code, with exact values:**
  - `Button` (`.btn`, `.btn-primary`, `.btn-glass`, `.replink`), `Paper` (`.glass-panel` and its wells), `LightField`
  - `Chip` (`.chip`, `.plate`), `ToggleButton` and `ButtonGroup` (the nav pill)
  - `Tabs` (`pill` is the nav, `side` the project selector), `Accordion` (career rows) and `PaneAccordion` (`.acc`)
  - `AppBar` (the identity strip), `Card` (`.card`), `Table` (the career surface), `Link`, `Container`, `Diagram` and `TimingChart`
- **Intentional additions:** the rest of MUI's catalogue, by request, so any product screen can be built in this language. Inputs, data display, feedback, navigation, layout, lab, utils and charts are all designed from the foundations above. Each component's README opens with its source: a site class, or "an addition".
- **Sections** are the site's own sections rebuilt from these components: header, hero, client work, own projects, contact. Use them as the reference for composition.

## Not synced

- **Fonts:** none synced. Satoshi was chosen for this system after the sync (22 Oct 2026); the site still uses the system stack until it adopts the system. Its font files aren't part of the system (see Type).
- **Logos and icons:** not brought in. The site's `favicon.svg` mark wasn't selected; the arrow is in `Icon` as a glyph.
- **Components:** the repository is a static Astro site with build-time React sections, not a component library. Its components were rebuilt by hand from `src/components/*.tsx` and `global.css`, never built or run from the repo (the read-only route). Each README names the class it comes from.
- **Not carried:** the résumé page's own styles (`resume.css`) beyond `color-line-strong` and `color-link`; the print styles.
- **Derived values:** the spacing, radius, shadow, blur, duration, size and some colour tokens were literals in the site's classes. Each one's note names its class.
