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

// eslint-disable-next-line unicorn/name-replacements -- The documented name (Popper's AnchorEl).
export type AnchorEl =
	| HTMLElement
	| VirtualElement
	| null
	| (() => HTMLElement | VirtualElement | null);

type PositionerProps = Popover.Positioner.Props;

export type ResolvedAnchor = Element | VirtualElement | null;

function isVirtual(anchor: Element | VirtualElement): anchor is VirtualElement {
	return !("nodeType" in anchor);
}

function isSameBox(a: DOMRect, b: DOMRect): boolean {
	return (
		a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
	);
}

export function useBaseAnchor(anchor: AnchorEl): ResolvedAnchor {
	const isFunction = typeof anchor === "function";
	const [resolved, setResolved] = React.useState<ResolvedAnchor>(null);
	const boxRef = React.useRef<DOMRect | undefined>(undefined);

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
		setResolved({
			getBoundingClientRect: () => next.getBoundingClientRect(),
			contextElement: next.contextElement,
		});
	});

	return isFunction ? resolved : anchor;
}

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

export function toPlacement(
	side: string,
	align: string,
): Placement | undefined {
	return placementOf.get(`${side} ${align}`);
}

export type PositionOptions = {
	placement: Placement;
	offset?: number;
};

const padding = 8;

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

type OffsetData = {
	side: string;
	align: string;
	positioner: { width: number; height: number };
};

function toWholePixels(size: number): number {
	return Math.round(size) - size;
}

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

export const anchorWidthStyle: React.CSSProperties = {
	minWidth: "var(--anchor-width)",
};

export const positionerVariables: React.CSSProperties &
	Record<`--${string}`, string> = {
	"--gl-transform-origin": "var(--transform-origin)",
	"--gl-available-height": "var(--available-height)",
};
