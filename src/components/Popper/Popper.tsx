"use client";
/**
Popper, ported from design-system/components/Popper/reference.tsx: a position: fixed layer
placed next to its anchor by positionFixed (src/internal/position.ts, which this module
exports), through Portal. It flips and shifts, follows window scroll and resize and the anchor's
and the layer's own size, and sets --gl-transform-origin and --gl-available-height for its
content. It's non-modal: no backdrop, no focus move, nothing hidden from assistive tech.

As in the reference, the position is measured in a layout effect after every render, so a
function anchorEl is asked again each time, and the layer stays hidden until it has a position.
One change: the layer's element is also kept in state, so a layer that mounts after the Popper's
own render (the Portal adds its children only once hydration is over) is measured when it
arrives, not at the next scroll.
*/
import * as React from "react";
import type { AnchorEl, VirtualElement } from "../../internal/anchor.js";
import { cx } from "../../internal/cx.js";
import {
	useEventCallback,
	useForkRef,
	useIsoLayoutEffect,
} from "../../internal/hooks.js";
import {
	type Placement,
	type PositionResult,
	positionFixed,
} from "../../internal/position.js";
import { Portal, type PortalProps } from "../Portal/index.js";

export {
	type Side,
	type Align,
	type Placement,
	type PositionOptions,
	type PositionResult,
	containingBlock,
	positionFixed,
	splitPlacement,
	computePosition,
} from "../../internal/position.js";
export type { AnchorEl, VirtualElement } from "../../internal/anchor.js";

export type PopperChildProps = {
	placement: Placement;
	/**
	Spread into a transition (Grow, Fade) so the Popper unmounts after it exits.
	*/
	TransitionProps: {
		in: boolean;
		onExited: () => void;
		appear: boolean;
	};
};

export type PopperProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	open: boolean;
	/**
	What to anchor to: an element, a virtual rect, or a function returning one.
	*/
	anchorEl: AnchorEl;
	/**
	Preferred side and alignment. Default "bottom". Flips when it doesn't fit.
	*/
	placement?: Placement;
	/**
	Gap to the anchor in px. Default 8.
	*/
	offset?: number;
	/**
	At least as wide as the anchor.
	*/
	matchWidth?: boolean;
	/**
	Children use a transition: the Popper stays mounted until TransitionProps.onExited.
	*/
	transition?: boolean;
	keepMounted?: boolean;
	disablePortal?: boolean;
	container?: PortalProps["container"];
	/**
	z-index; default the z-modal token.
	*/
	zIndex?: string | number;
	children?: React.ReactNode | ((props: PopperChildProps) => React.ReactNode);
};

function resolveAnchor(
	anchorEl: AnchorEl,
): HTMLElement | VirtualElement | null {
	return typeof anchorEl === "function" ? anchorEl() : anchorEl;
}

function isSamePosition(a: PositionResult, b: PositionResult): boolean {
	return (
		a.x === b.x &&
		a.y === b.y &&
		a.placement === b.placement &&
		a.maxHeight === b.maxHeight &&
		a.origin === b.origin &&
		a.minWidth === b.minWidth
	);
}

/**
Floats content next to an anchor with fixed positioning: flips to the other
side when there is no room, shifts to stay on screen, follows scroll and
resize, and exposes --gl-transform-origin so transitions grow from the anchor.
*/
export function Popper({
	open,
	anchorEl,
	placement = "bottom",
	offset = 8,
	matchWidth = false,
	transition = false,
	keepMounted = false,
	disablePortal = false,
	container,
	zIndex,
	className,
	style,
	children,
	ref,
	...rest
}: PopperProps & { ref?: React.Ref<HTMLDivElement> }) {
	const [isExited, setIsExited] = React.useState(true);
	const [position, setPosition] = React.useState<PositionResult | null>(null);
	const floatingRef = React.useRef<HTMLDivElement | null>(null);
	const [floating, setFloating] = React.useState<HTMLDivElement | null>(null);
	const handleRef = useForkRef(floatingRef, setFloating, ref);
	// Opening ends any finished exit, in the same render, as the reference does.
	if (open && isExited) {
		setIsExited(false);
	}

	const isMounted = open || keepMounted || (transition && !isExited);

	const update = useEventCallback(() => {
		const anchor = resolveAnchor(anchorEl);
		const layer = floatingRef.current;
		if (anchor === null || layer === null) {
			return;
		}

		const next = positionFixed(anchor.getBoundingClientRect(), layer, {
			placement,
			offset,
			matchWidth,
		});
		setPosition((previous) =>
			previous !== null && isSamePosition(previous, next) ? previous : next,
		);
	});

	// After every render: the anchor, the placement or the content may have moved.
	useIsoLayoutEffect(() => {
		if (isMounted) {
			update();
		}
	});

	React.useEffect(() => {
		if (!isMounted) {
			return;
		}

		const anchor = resolveAnchor(anchorEl);
		const onChange = () => {
			update();
		};

		// Capture, so a scrolling ancestor's scroll reaches it too.
		window.addEventListener("scroll", onChange, true);
		window.addEventListener("resize", onChange);
		const observer =
			typeof ResizeObserver === "undefined"
				? undefined
				: new ResizeObserver(onChange);
		if (anchor instanceof Element) {
			observer?.observe(anchor);
		}

		if (floating !== null) {
			observer?.observe(floating);
		}

		return () => {
			window.removeEventListener("scroll", onChange, true);
			window.removeEventListener("resize", onChange);
			observer?.disconnect();
		};
	}, [isMounted, anchorEl, floating, update]);

	if (!isMounted) {
		return null;
	}

	const currentPlacement = position?.placement ?? placement;
	const content =
		typeof children === "function"
			? children({
					placement: currentPlacement,
					TransitionProps: {
						in: open,
						appear: true,
						onExited() {
							setIsExited(true);
						},
					},
				})
			: children;
	const layerStyle: React.CSSProperties &
		Record<`--${string}`, string | undefined> = {
		position: "fixed",
		left: position === null ? 0 : position.x,
		top: position === null ? 0 : position.y,
		minWidth: position?.minWidth,
		zIndex: zIndex ?? "var(--z-modal, 1300)",
		// Hidden until measured, so it never shows at the corner first.
		visibility: position === null ? "hidden" : undefined,
		display: !open && !transition && keepMounted ? "none" : undefined,
		"--gl-transform-origin": position?.origin ?? "center",
		"--gl-available-height":
			position === null ? undefined : `${Math.floor(position.maxHeight)}px`,
		...style,
	};

	return (
		<Portal container={container} disablePortal={disablePortal}>
			<div
				ref={handleRef}
				className={cx("gl-popper", className)}
				data-placement={currentPlacement}
				style={layerStyle}
				{...rest}
			>
				{content}
			</div>
		</Portal>
	);
}
