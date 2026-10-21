# Plan reviews

## Round 1: Codex (GPT-6 Astra) adversarial review, 21 Oct 2026

Target: `docs/package-plan.md`, revision 1. The review ran in a scratch clone where `design-system/` was committed, because the first try inlined all 362 uncommitted reference files and went past Codex's 1 MB input limit.

**Verdict:** needs attention. "Revise before implementation. The acceptance gates can miss broken APIs and unusable server HTML, while the Menu mapping and Tailwind layering need concrete corrections."

| # | Severity | Finding | Check | Disposition |
| --- | --- | --- | --- | --- |
| 1 | high | Props assignability misses removed optional props. | TS 7: `{variant?, href?, loading?}` is assignable to the same type without `href`. A key-coverage type reports `"href"`. | Accepted. The gate adds key coverage, per-prop compatibility, compiled call sites and negative tests. |
| 2 | high | Standalone MenuList can't hold a Base UI MenuItem. | `menu/root/MenuRootContext.js` throws "MenuRootContext is missing. Menu parts must be placed within <Menu.Root>". `Menu/api.d.ts` documents a standalone MenuList. | Accepted. MenuItem has two modes, and both get tests. |
| 3 | high | Hydration passing doesn't make server HTML usable. | The reference renders `<Fade in>` as `opacity:0;visibility:hidden` with `renderToString`. | Accepted. A JavaScript-off visibility gate, delayed-hydration tests for the section islands, and declared exceptions. |
| 4 | medium | The reference isn't a clean oracle. | README lines 41–42 list the ref and key issues. The production React 18 and 19 runs of the 71 previews logged no console errors. | Accepted. Phase 0 qualifies the reference (production mode, fixture-only repairs, `docs/reference-defects.md`). |
| 5 | medium | React 18 is promised but never run. | React 18's react-dom requires React 18, so it can't share the root install with React 19. | Accepted. Peer `^19` for now, and the user decides on React 18. |
| 6 | medium | Unlayered `.text-*` classes beat Tailwind utilities. | `tools/build-tokens.mjs` lines 136–162 emit plain blocks, and `tokens.css` has `.text-body {…}` at the top level. | Accepted. The package's token build layers the type classes, and the fixture checks computed styles. |
| 7 | medium | Screenshots aren't deterministic. | Two reference runs differed only in Diagram and Mermaid (SVG `animateMotion`). The Progress pulse runs under reduced motion. | Accepted. A deterministic capture policy, per-preview thresholds and a gate mutation test. |

Rejected: none.

## Round 2: Codex (GPT-6 Astra) adversarial review, 21 Oct 2026

Target: `docs/package-plan.md`, revision 2, in the same scratch clone.

**Verdict:** needs attention. "Revise before implementation. Phase gates remain inconsistent, and the adapter and SSR proofs miss concrete compatibility failures."

| # | Severity | Finding | Check | Disposition |
| --- | --- | --- | --- | --- |
| 1 | high | Checkbox, Radio and Switch promise native-input refs, attributes and events, which event-shape adapters don't cover. | `Checkbox/api.d.ts`: "The ref and every other attribute go to the native input", with `ChangeEvent<HTMLInputElement>`. `RadioGroup` and `Switch` say the same. Base UI's `CheckboxRoot.d.ts`: "Renders a `<span>` element and a hidden `<input>` beside", and the input is `aria-hidden`. | Proposed: keep the native ports. The user chose instead to keep Base UI and record the deviations (21 Oct). Contract tests pin the new behaviour, and Rating and TransferList stay on Base UI. |
| 2 | medium | Only parity is phase-scoped. The export, SSR and type gates would fail phase 1 by design. | Revision 2 lines 84 and 93 require every preview and all 133 exports. | Accepted. A cumulative phase manifest drives every gate, with full coverage at phase 5 and no placeholder exports. |
| 3 | medium | Modal's independent flags don't map onto Base UI's coupled `modal` modes. | `Modal/api.d.ts` has separate `disableEnforceFocus` and `disableScrollLock`. `DialogRoot.d.ts` offers only `true`, `'trap-focus'` and `false`, and none of them frees focus while locking scroll. | Accepted. A modal-flags adapter combines Base UI's modes with the reference's scroll lock, and it's proven across every combination in phase 0. |
| 4 | medium | The section previews pick their layout with `useMediaQuery`, so server HTML has one layout for every viewport. | Hero, ContactSlab and ProjectCard call `useMediaQuery` and set `gridTemplateColumns` inline. The hook's server value is `defaultMatches` (false). The same pattern is in components: Tabs switches its side selector on `media.phone`, and Accordion opens every pane on compact screens. | Accepted, and extended to Tabs, Accordion and PaneAccordion. Viewport-dependent layout and default state come from CSS. Pre-hydration checks run at 390px and 1280px. |

Rejected: none. Two rounds are done, so the plan goes to the user.
