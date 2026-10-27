import type { Align, Placement, Side } from "./anchor.js";
import { ownerWindow } from "./dom.js";

export type { Align, Placement, Side } from "./anchor.js";

export type PositionOptions = {
	placement?: Placement;
	offset?: number;
	flip?: boolean;
	shift?: boolean;
	padding?: number;
	matchWidth?: boolean;
	viewport?: { width: number; height: number };
};

export type PositionResult = {
	x: number;
	y: number;
	placement: Placement;
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

function isFixedContainingBlock(style: CSSStyleDeclaration): boolean {
	const standardBackdropFilter = style.getPropertyValue("backdrop-filter");
	const backdropFilter =
		standardBackdropFilter === ""
			? style.getPropertyValue("-webkit-backdrop-filter")
			: standardBackdropFilter;
	return (
		style.transform !== "none" ||
		style.perspective !== "none" ||
		style.filter !== "none" ||
		(backdropFilter !== "" && backdropFilter !== "none") ||
		/transform|filter|perspective/u.test(style.willChange) ||
		/paint|layout|strict|content/u.test(style.contain)
	);
}

export function containingBlock(
	element: Element | null,
): { x: number; y: number; width: number; height: number } | null {
	const block = containingBlockElement(element);
	if (!block) {
		return null;
	}

	const rect = block.getBoundingClientRect();
	return {
		x: rect.left + block.clientLeft,
		y: rect.top + block.clientTop,
		width: block.clientWidth,
		height: block.clientHeight,
	};
}

export function containingBlockElement(
	element: Element | null,
): Element | null {
	const root = element?.ownerDocument.documentElement;
	let node = element?.parentElement ?? null;
	while (node !== null && node !== root) {
		if (isFixedContainingBlock(ownerWindow(node).getComputedStyle(node))) {
			return node;
		}

		node = node.parentElement;
	}

	return null;
}

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

export function splitPlacement(placement: Placement): [Side, Align] {
	const [side, align] = placement.split("-") as [Side, Align | undefined];
	return [side, align ?? "center"];
}

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

	const halfLength = length / 2;
	const halfSize = size / 2;
	return align === "end" ? end - size : start + halfLength - halfSize;
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

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), Math.max(min, max));
}

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

	const bothPaddings = 2 * padding;
	const maxHeight = Math.max(
		80,
		isVertical(side) ? space[side] : viewportHeight - bothPaddings,
	);

	let origin: string;
	if (isVertical(side)) {
		const halfWidth = anchor.width / 2;
		const originX = clamp(anchor.left + halfWidth - x, 0, box.width);
		origin = `${Math.round(originX)}px ${side === "top" ? "100%" : "0"}`;
	} else {
		const halfHeight = anchor.height / 2;
		const originY = clamp(anchor.top + halfHeight - y, 0, box.height);
		origin = `${side === "left" ? "100%" : "0"} ${Math.round(originY)}px`;
	}

	return {
		x: Math.round(x),
		y: Math.round(y),
		placement: align === "center" ? side : `${side}-${align}`,
		origin,
		maxHeight,
		minWidth: matchWidth ? anchor.width : undefined,
	};
}
