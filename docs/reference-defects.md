# Reference defects

The reference in `design-system/` is the spec, but it isn't flawless. Phase 0 qualified it as a test fixture: `npm run reference` reassembles it, and the gates run it on React 19 in production, render every preview on the server, view the result without JavaScript, hydrate it, and screenshot it twice.

## What the qualification found (21 Oct 2026)

- **Rendering:** all 71 previews render in Chromium with no page or console errors, on React 18.3.1 and 19.3.1. Once motion is frozen, two captures of each are pixel-identical.
- **Server rendering:** all 71 preview trees render in Node with no `window` or `document`.
- **Hydration:** two previews log a recoverable hydration error (React #418: the first client render doesn't match the server HTML). The package must hydrate both cleanly.
  - `components/Portal`: during hydration the portal's child renders into the page, where the server rendered nothing.
  - `components/Snackbar`: its open snackbar's markup differs between server and client.
- **Text visible only after JavaScript,** in 17 previews. `tests/ssr/reference-baseline.json` records them; the package may match them but not add to them.
  - Popups open on load render through portals, which need the DOM: Autocomplete, Backdrop, Dialog, Drawer, Menu, Modal, Popover, Portal, Select, Snackbar, SpeedDial and Tooltip.
  - Some content is measured on the client: the "Scroll sideways" hints on Diagram and TimingChart (shown when the figure overflows), Mermaid's diagrams (laid out in the browser), and useMediaQuery's live value.
  - NoSsr hides its content by design.
- **`<Fade in>` renders invisible on the server.** The same goes for the other transitions while `appear` is on, which is the default: they render at opacity 0 and visibility hidden until hydration. The previews don't show it, because their transitions start closed. `src/internal/transition.ts` fixes it, and its tests pin the fix.
- **Modal makes the rest of the page `inert` whatever its flags say.** `syncStack` in `Modal/reference.tsx` marks every other body child `inert`. So `hideBackdrop` ("the page behind stays visible and clickable") and `disableEnforceFocus` ("let focus leave the content") can't do what their docs promise. The package uses `aria-hidden` instead, while focus is enforced (`docs/deviations.md`, entry 7).
- **Known from the reference's README:**
  - Tooltip and the transitions read a child's ref from `props.ref`, which React 18 drops in development.
  - Select spreads a `key` into Option, which React 19 warns about in development.

## Tests allowed to fail on the reference

Each phase's behaviour tests run on the reference first. A test may fail there only if it's listed below with the defect it hits, and every test still has to pass on the package.

| Test                                 | Defect |
| ------------------------------------ | ------ |
| _None yet; each phase adds its own._ |        |
