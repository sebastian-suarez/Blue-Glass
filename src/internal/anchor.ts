/**
Anchoring as the reference documents it (anchorEl, placement, offset, matchWidth on Popover,
Menu, Popper and Tooltip), mapped onto a Base UI positioner: Popover.Positioner,
Menu.Positioner, Tooltip.Positioner, and Select's and Combobox's.

Rules:
- `anchorEl` → `anchor` through toBaseAnchor. Base UI takes the same shapes: an element, a
  virtual element ({ getBoundingClientRect(), contextElement? }), a function returning either,
  or null. Two differences from the reference: Base UI calls a function when the popup opens,
  not on every update, so pass an element or a virtual element if the anchor changes while the
  popup is open; and with no anchor it keeps the popup at opacity 0 rather than at -9999px.
- `placement` → `side` and `align` ("bottom-start" is side "bottom", align "start"), and
  `offset` → `sideOffset`, the gap. alignOffset stays 0: the reference has no cross-axis offset.
- Collisions as the reference's computePosition (design-system/shared/position.ts): flip to the
  opposite side when the preferred side is too small and the other has more room, never to
  the other axis; shift along the alignment axis to stay 8px inside the viewport. The popup is
  position: fixed, as the reference's is. toPositionerProps sets all of this.
- `matchWidth` → anchorWidthStyle on the popup: min-width is the anchor's width.
- CSS variables: put positionerVariables on the positioner (or the same two declarations in
  CSS), so styles that read the reference's --gl-transform-origin and --gl-available-height
  get Base UI's --transform-origin and --available-height.
- After a flip, the positioner's state and its data-side and data-align attributes hold the
  side it landed on; toPlacement turns them back into a placement for data-placement or
  Popper's render prop.
- Select's positioner lines the selected item up with the trigger by default; pass
  alignItemWithTrigger={false} to anchor it like the reference's Popover.

Where Base UI differs from the reference math, all at the edges:
- It flips a pixel earlier: with exactly the room the popup needs, the reference stays and
  Base UI flips. Its flip check pads each edge by one more pixel, and the edge behind the
  preferred side by two, so it also wants that much more room on the side it flips to.
- Its shift stops where the popup would lose contact with the anchor (limitShift), which only
  matters once the anchor is off screen.
- Its transform origin sits on the anchor's edge, sideOffset away, and on the popup's aligned
  edge for start and end; the reference's sits on the popup's own edge at the anchor's centre.
  A 0.96 grow starts 4% of the distance between the two away: a few pixels.
- --available-height has no floor; the reference's never drops below 80px.
anchor.browser.test.tsx proves the position matches the reference math within 1px for every
placement at offsets 0, 8 and 12, for flips and shifts, for virtual and function anchors and
for matchWidth, and pins the earlier flip.

There's no anchorOrigin or transformOrigin to map: Popover, Menu, Popper and Tooltip document
`placement` instead. The reference's only anchorOrigin is Snackbar's screen corner, which is
layout, not anchoring.
*/
import type * as React from "react";
import type { Popover } from "@base-ui/react/popover";

export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";
export type Placement = Side | `${Side}-start` | `${Side}-end`;

export type VirtualElement = {
	getBoundingClientRect(): DOMRect;
	contextElement?: Element;
};

/**
What the documented `anchorEl` props take.
*/
// eslint-disable-next-line unicorn/name-replacements -- The documented name (Popper's AnchorEl).
export type AnchorEl =
	| HTMLElement
	| VirtualElement
	| null
	| (() => HTMLElement | VirtualElement | null);

type PositionerProps = Popover.Positioner.Props;

/**
Base UI's `anchor` for a documented `anchorEl`: the same value, which Base UI accepts in every
shape the docs allow.
*/
export function toBaseAnchor(anchor: AnchorEl): PositionerProps["anchor"] {
	return anchor;
}

/**
The side and alignment a placement names: "bottom-start" is bottom and start, "top" is top and
center.
*/
export function splitPlacement(placement: Placement): {
	side: Side;
	align: Align;
} {
	const [side, align = "center"] = placement.split("-") as [Side, Align?];
	return { side, align };
}

const placementOf = new Map<string, Placement>(
	(["top", "bottom", "left", "right"] as const).flatMap((side) => [
		[`${side} center`, side],
		[`${side} start`, `${side}-start`],
		[`${side} end`, `${side}-end`],
	]),
);

/**
The placement for a side and alignment from Base UI, or undefined for anything that isn't a
physical side and an alignment (the logical inline-start and inline-end, which these
components never ask for): fall back to the requested placement then.
*/
export function toPlacement(
	side: string,
	align: string,
): Placement | undefined {
	return placementOf.get(`${side} ${align}`);
}

export type PositionOptions = {
	/**
	Preferred side and alignment: each component's documented default.
	*/
	placement: Placement;
	/**
	Gap to the anchor in px. Default 8, as everywhere in the reference.
	*/
	offset?: number;
};

/**
Viewport padding the reference keeps clear when it flips and shifts.
*/
const padding = 8;

/**
The positioner props that place a popup where the reference's computePosition does.
*/
export function toPositionerProps({ placement, offset = 8 }: PositionOptions) {
	const { side, align } = splitPlacement(placement);
	return {
		side,
		align,
		sideOffset: offset,
		alignOffset: 0,
		collisionPadding: padding,
		collisionAvoidance: {
			side: "flip",
			align: "shift",
			fallbackAxisSide: "none",
		},
		positionMethod: "fixed",
	} as const satisfies Partial<PositionerProps>;
}

/**
`matchWidth`: at least as wide as the anchor. Base UI keeps --anchor-width on the positioner.
*/
export const anchorWidthStyle: React.CSSProperties = {
	minWidth: "var(--anchor-width)",
};

/**
The reference's positioning variables, fed from Base UI's: put them on the positioner.
*/
export const positionerVariables: React.CSSProperties &
	Record<`--${string}`, string> = {
	"--gl-transform-origin": "var(--transform-origin)",
	"--gl-available-height": "var(--available-height)",
};
