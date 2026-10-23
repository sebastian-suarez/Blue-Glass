"use client";
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
	anchorEl: AnchorEl;
	placement?: Placement;
	offset?: number;
	matchWidth?: boolean;
	transition?: boolean;
	keepMounted?: boolean;
	disablePortal?: boolean;
	container?: PortalProps["container"];
	zIndex?: string | number;
	children?: React.ReactNode | ((props: PopperChildProps) => React.ReactNode);
};

function resolveAnchor(anchor: AnchorEl): HTMLElement | VirtualElement | null {
	return typeof anchor === "function" ? anchor() : anchor;
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

		window.addEventListener("scroll", onChange, { capture: true });
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
			window.removeEventListener("scroll", onChange, { capture: true });
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
