/**
Positioning for a floating layer, ported from design-system/shared/position.ts: the
internal/position section of design-system/source/index.d.ts, which Popper exports as its own.
Base UI's positioners place Popover, Menu and Tooltip instead, with the same rules (anchor.ts).
Nothing here runs during render.
*/
import type { Align, Placement, Side } from "./anchor.js";
import { ownerWindow } from "./dom.js";

export type { Align, Placement, Side } from "./anchor.js";

export type PositionOptions = {
	placement?: Placement;
	/**
	Gap between the anchor and the floating element, px.
	*/
	offset?: number;
	/**
	Flip to the opposite side when the preferred side overflows.
	*/
	flip?: boolean;
	/**
	Keep the floating element inside the viewport on the cross axis.
	*/
	shift?: boolean;
	/**
	Viewport padding kept clear, px.
	*/
	padding?: number;
	/**
	Make the floating element at least as wide as the anchor (menus under a field).
	*/
	matchWidth?: boolean;
	/**
	The box to stay inside; default the window.
	*/
	viewport?: { width: number; height: number };
};

export type PositionResult = {
	x: number;
	y: number;
	placement: Placement;
	/**
	transform-origin for origin-aware scale-in, relative to the floating box.
	*/
	origin: string;
	maxHeight: number;
	minWidth?: number;
};

type Size = { width: number; height: number };

const opposite: Record<Side, Side> = {
	top: "bottom",
	bottom: "top",
	left: "right",
	right: "left",
};

function isVertical(side: Side): boolean {
	return side === "top" || side === "bottom";
}

/**
Whether a computed style makes its element the containing block of fixed descendants.
*/
function containsFixed(style: CSSStyleDeclaration): boolean {
	// Safari before 18 has only the prefixed property.
	const backdropFilter =
		style.backdropFilter || style.getPropertyValue("-webkit-backdrop-filter");
	return (
		style.transform !== "none" ||
		style.perspective !== "none" ||
		style.filter !== "none" ||
		(backdropFilter !== "" && backdropFilter !== "none") ||
		/transform|filter|perspective/u.test(style.willChange) ||
		/paint|layout|strict|content/u.test(style.contain)
	);
}

/**
position: fixed is relative to the viewport unless an ancestor creates a containing block
(transform, filter, backdrop-filter, contain, will-change). Returns that block's box in viewport
coordinates, or null for the viewport.
*/
export function containingBlock(
	element: Element | null,
): { x: number; y: number; width: number; height: number } | null {
	const root = element?.ownerDocument.documentElement;
	let node = element?.parentElement ?? null;
	while (node !== null && node !== root) {
		if (containsFixed(ownerWindow(node).getComputedStyle(node))) {
			// The padding box, which fixed descendants are placed in.
			const rect = node.getBoundingClientRect();
			return {
				x: rect.left + node.clientLeft,
				y: rect.top + node.clientTop,
				width: node.clientWidth,
				height: node.clientHeight,
			};
		}

		node = node.parentElement;
	}

	return null;
}

/**
computePosition for an element that is (or will be) position: fixed, in its own containing
block's coordinates.
*/
export function positionFixed(
	anchor: DOMRect,
	floatingElement: HTMLElement,
	options: PositionOptions = {},
): PositionResult {
	const floating = {
		width: floatingElement.offsetWidth,
		height: floatingElement.offsetHeight,
	};
	const block = containingBlock(floatingElement);
	if (block === null) {
		return computePosition(anchor, floating, options);
	}

	return computePosition(
		new DOMRect(
			anchor.left - block.x,
			anchor.top - block.y,
			anchor.width,
			anchor.height,
		),
		floating,
		{ ...options, viewport: { width: block.width, height: block.height } },
	);
}

/**
The side and alignment a placement names: "top-start" is top and start, "left" is left and
center.
*/
export function splitPlacement(placement: Placement): [Side, Align] {
	const [side, align] = placement.split("-") as [Side, Align | undefined];
	return [side, align ?? "center"];
}

/**
Where a box of `size` starts along the cross axis: at the anchor's start edge, against its end
edge, or centred on it.
*/
function alignAlong(
	start: number,
	end: number,
	length: number,
	size: number,
	align: Align,
): number {
	if (align === "start") {
		return start;
	}

	return align === "end" ? end - size : start + length / 2 - size / 2;
}

function place(
	anchor: DOMRect,
	floating: Size,
	side: Side,
	align: Align,
	offset: number,
): { x: number; y: number } {
	if (isVertical(side)) {
		return {
			x: alignAlong(
				anchor.left,
				anchor.right,
				anchor.width,
				floating.width,
				align,
			),
			y:
				side === "top"
					? anchor.top - floating.height - offset
					: anchor.bottom + offset,
		};
	}

	return {
		x:
			side === "left"
				? anchor.left - floating.width - offset
				: anchor.right + offset,
		y: alignAlong(
			anchor.top,
			anchor.bottom,
			anchor.height,
			floating.height,
			align,
		),
	};
}

/**
`value` kept between `min` and `max`, and at `min` when there's no room between them.
*/
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
Position a fixed floating box against an anchor rect, viewport coordinates.
Flip on the main axis, shift on the cross axis, cap height to the space left.
*/
export function computePosition(
	anchor: DOMRect,
	floating: { width: number; height: number },
	options: PositionOptions = {},
): PositionResult {
	const {
		placement = "bottom",
		offset = 8,
		flip = true,
		shift = true,
		padding = 8,
		matchWidth = false,
		viewport,
	} = options;
	const hasWindow = typeof window !== "undefined";
	const viewportWidth =
		viewport?.width ?? (hasWindow ? window.innerWidth : 1024);
	const viewportHeight =
		viewport?.height ?? (hasWindow ? window.innerHeight : 768);
	const [preferred, align] = splitPlacement(placement);
	const box = {
		width: matchWidth ? Math.max(floating.width, anchor.width) : floating.width,
		height: floating.height,
	};

	const space: Record<Side, number> = {
		top: anchor.top - padding - offset,
		bottom: viewportHeight - anchor.bottom - padding - offset,
		left: anchor.left - padding - offset,
		right: viewportWidth - anchor.right - padding - offset,
	};
	const need = isVertical(preferred) ? box.height : box.width;
	const side =
		flip &&
		space[preferred] < need &&
		space[opposite[preferred]] > space[preferred]
			? opposite[preferred]
			: preferred;

	let { x, y } = place(anchor, box, side, align, offset);
	if (shift && isVertical(side)) {
		x = clamp(x, padding, viewportWidth - box.width - padding);
	} else if (shift) {
		y = clamp(y, padding, viewportHeight - box.height - padding);
	}

	const maxHeight = Math.max(
		80,
		isVertical(side) ? space[side] : viewportHeight - 2 * padding,
	);

	// Origin: the edge facing the anchor, at the anchor's centre on the cross axis.
	let origin: string;
	if (isVertical(side)) {
		const originX = clamp(anchor.left + anchor.width / 2 - x, 0, box.width);
		origin = `${Math.round(originX)}px ${side === "top" ? "100%" : "0"}`;
	} else {
		const originY = clamp(anchor.top + anchor.height / 2 - y, 0, box.height);
		origin = `${side === "left" ? "100%" : "0"} ${Math.round(originY)}px`;
	}

	return {
		x: Math.round(x),
		y: Math.round(y),
		placement: (align === "center" ? side : `${side}-${align}`) as Placement,
		origin,
		maxHeight,
		minWidth: matchWidth ? anchor.width : undefined,
	};
}
