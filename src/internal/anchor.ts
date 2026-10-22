/**
Anchoring as the reference documents it (anchorEl, placement, offset, matchWidth on Popover,
Menu, Popper and Tooltip), mapped onto a Base UI positioner: Popover.Positioner,
Menu.Positioner, Tooltip.Positioner, and Select's and Combobox's.

Rules:
- `anchorEl` → `anchor` through the useBaseAnchor hook, never directly. The docs allow an
  element, a virtual element ({ getBoundingClientRect(), contextElement? }), a function
  returning either, or null. Base UI takes the same shapes, but it calls a function once, when
  the popup opens, while the reference calls it again on every update. So the hook calls a
  function anchor itself after each commit of the component that calls the hook, in a layout
  effect, and hands Base UI what it returned: a popup open on `() => selected` follows
  `selected`. (The reference also asks again on scroll and resize; here those only move the
  popup with the anchor it already has.) Nothing is called during render, so server rendering
  never reaches the function or the DOM. A virtual element a function returns is compared by
  its box (a function may build a new one on every call), and a box that moved reaches Base UI
  as a new anchor, so the popup follows it.
- With no anchor, Base UI keeps the popup at opacity 0 rather than at the reference's -9999px.
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
- It places the popup from its exact size, the reference from whole pixels (offsetWidth and
  offsetHeight), so a popup of fractional size above, left of, end-aligned or centred on its
  anchor lands a pixel apart. toWholePixelOffsets corrects that, for the ports that compare
  pixel for pixel.
anchor.browser.test.tsx proves the position matches the reference math within 1px for every
placement at offsets 0, 8 and 12, for flips and shifts, for virtual and function anchors
(including a function whose answer changes while the popup is open) and for matchWidth, and
pins the earlier flip.

There's no anchorOrigin or transformOrigin to map: Popover, Menu, Popper and Tooltip document
`placement` instead. The reference's only anchorOrigin is Snackbar's screen corner, which is
layout, not anchoring.
*/
import type { Popover } from "@base-ui/react/popover";
import * as React from "react";
import { useIsoLayoutEffect } from "./hooks.js";

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
What an `anchorEl` resolves to: what Base UI's `anchor` gets.
*/
export type ResolvedAnchor = Element | VirtualElement | null;

function isVirtual(anchor: Element | VirtualElement): anchor is VirtualElement {
	return !("nodeType" in anchor);
}

function isSameBox(a: DOMRect, b: DOMRect): boolean {
	return (
		a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
	);
}

/**
Base UI's `anchor` for a documented `anchorEl`. An element, a virtual element or null passes
through as it is. A function is called after each commit, as the reference calls it on every
update, and Base UI gets its answer.
*/
export function useBaseAnchor(anchor: AnchorEl): ResolvedAnchor {
	const isFunction = typeof anchor === "function";
	const [resolved, setResolved] = React.useState<ResolvedAnchor>(null);
	// The box of the virtual element last handed to Base UI, to see when it moves.
	const boxRef = React.useRef<DOMRect | undefined>(undefined);

	// No dependencies: the answer can change whenever anything renders, so ask after every
	// commit. A layout effect, so Base UI positions against the new anchor before paint.
	useIsoLayoutEffect(() => {
		if (typeof anchor !== "function") {
			return;
		}

		const next = anchor();
		if (next === null || !isVirtual(next)) {
			boxRef.current = undefined;
			if (next !== resolved) {
				setResolved(next);
			}

			return;
		}

		const box = next.getBoundingClientRect();
		const isUnmoved =
			resolved !== null &&
			isVirtual(resolved) &&
			resolved.contextElement === next.contextElement &&
			boxRef.current !== undefined &&
			isSameBox(boxRef.current, box);
		if (isUnmoved) {
			return;
		}

		boxRef.current = box;
		// A new object, so Base UI takes it as a new anchor and measures it again.
		setResolved({
			getBoundingClientRect: () => next.getBoundingClientRect(),
			contextElement: next.contextElement,
		});
	});

	return isFunction ? resolved : anchor;
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
What a Base UI offset function gets: the side and alignment the popup is placed on, and its
size.
*/
type OffsetData = {
	side: string;
	align: string;
	positioner: { width: number; height: number };
};

/**
How far a size is from the whole pixels the reference measured it in.
*/
function toWholePixels(size: number): number {
	return Math.round(size) - size;
}

/**
The sideOffset and alignOffset of toPositionerProps, corrected to land where the reference's
computePosition does, to the pixel. The reference places a popup from its offsetWidth and
offsetHeight, whole pixels, and Base UI from its exact size, so where the size moves the popup
(the top and left sides, end and center alignments) a fractional size lands a pixel apart, and
every glyph inside redraws. Each offset adds the rounding back. Shifts still clamp the exact
size. Base UI takes an offset function's result when it next places the popup (a scroll, a
resize, a change of size), so a new `offset` on an open popup waits for that.
*/
export function toWholePixelOffsets(offset = 8) {
	return {
		sideOffset({ side, positioner }: OffsetData): number {
			if (side === "top") {
				return offset + toWholePixels(positioner.height);
			}

			return side === "left"
				? offset + toWholePixels(positioner.width)
				: offset;
		},
		alignOffset({ side, align, positioner }: OffsetData): number {
			const size =
				side === "top" || side === "bottom"
					? positioner.width
					: positioner.height;
			if (align === "end") {
				return toWholePixels(size);
			}

			return align === "center" ? -toWholePixels(size) / 2 : 0;
		},
	};
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
