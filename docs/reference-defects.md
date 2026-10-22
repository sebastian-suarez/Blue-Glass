# Reference defects

The reference in `design-system/` is the spec, but it isn't flawless. Phase 0 qualified it as a test fixture: `npm run reference` reassembles it, and the gates run it on React 19 in production, render every preview on the server, view the result without JavaScript, hydrate it, and screenshot it twice.

## What the qualification found (21 Oct 2026)

- **Rendering:** all 71 previews render in Chromium with no page or console errors, on React 18.3.1 and 19.3.1. Once motion is frozen, two captures of each are pixel-identical.
- **Server rendering:** all 71 preview trees render in Node with no `window` or `document`.
- **Hydration:** two previews log a recoverable hydration error (React #418: the first client render doesn't match the server HTML). The package must hydrate both cleanly.
  - `components/Portal`: during hydration the portal's child renders into the page, where the server rendered nothing.
  - `components/Snackbar`: its open snackbar's markup differs between server and client.
- **Text visible only after JavaScript,** in 21 previews, counted by occurrence. `tests/ssr/reference-baseline.json` records it in two kinds.
  - **Hidden** (in the server HTML, but invisible): Backdrop, Dialog, Drawer, Modal, Select's open list, Snackbar, SpeedDial and the Transitions demos. Their content is rendered at load inside a transition that starts at opacity 0 (the `<Fade in>` defect below). The "Scroll sideways" hints on Diagram and TimingChart are hidden by design, until the client measures an overflow.
  - **Absent** (not in the server HTML at all): Autocomplete, Menu, Popover, Portal and Tooltip, whose popups render through portals that need the DOM; Mermaid, which lays its diagrams out in the browser; LineChart's axis labels and Popper's placement, which the client measures; Avatar's initials, which replace an image only once the browser reports it broken; NoSsr, by design; and useMediaQuery's live value.
  - **The package must render hidden text visibly.** It may leave out only what the reference's server HTML lacked too, copy for copy (`scripts/lib/ssr-rules.ts`). Hidden open content is the reference's defect, and leaving it out is no fix.
- **`<Fade in>` renders invisible on the server.** The same goes for the other transitions while `appear` is on, which is the default: they render at opacity 0 and visibility hidden until hydration. That's what hides the overlays above. `src/internal/transition.ts` fixes it, and its tests pin the fix.
- **Modal makes the rest of the page `inert` whatever its flags say.** `syncStack` in `Modal/reference.tsx` marks every other body child `inert`. So `hideBackdrop` ("the page behind stays visible and clickable") and `disableEnforceFocus` ("let focus leave the content") can't do what their docs promise. The package uses `aria-hidden` instead, while focus is enforced (`docs/deviations.md`, entry 7).
- **Tabs name their panels only after hydration** (phase 1). A Tab sets `aria-controls` once its panel has registered in an effect (`Tabs/reference.tsx`, line 264), so in the server HTML no tab names its panel, though the README says "each tab gets `aria-controls` pointing at its panel". `node scripts/ssr/islands.ts --target reference` reports it for both Tabs islands. The package must wire them in the server HTML.
- **Known from the reference's README:**
  - Tooltip and the transitions read a child's ref from `props.ref`, which React 18 drops in development.
  - Select spreads a `key` into Option, which React 19 warns about in development.

## Tests allowed to fail on the reference

Each phase's behaviour tests run on the reference first. A test may fail there only if it's listed below with the defect it hits, and every test still has to pass on the package. A listed test is declared with `referenceDefectTest` from `tests/behaviour/reference-defect.ts`: it must fail on the reference, so a fixed reference shows up, and pass on the package.

| Test                                                                                                          | Defect                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chip: "clickable gives the clickable styling without making the chip a button, so it can sit inside your own" | `api.d.ts` documents `clickable` as "hover and press styling without onClick, e.g. inside your own button", and the README makes a chip interactive only through `onClick` or `href`. The reference renders `clickable` alone as a `<button>` (`Chip/reference.tsx`, line 49), so inside your own button it nests a button in a button, which React reports as a hydration error. |
