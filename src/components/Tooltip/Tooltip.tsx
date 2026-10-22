"use client";
/**
Tooltip, ported from design-system/components/Tooltip/reference.tsx onto Base UI's Tooltip. Its
Root (held by `open`), Portal, Positioner, Popup and Arrow place the ink label by anchor.ts's
rules, render it into body or in place, and keep it mounted while it leaves.

What opens and closes it stays the reference's, on the child's own handlers, because Base UI's
triggers differ from the README:
- They open on hover only for a mouse at rest, and never on touch. Here a pen hovers too, a long
  press opens it, and the click Chromium sends after the finger lifts closes nothing.
- Their hand-off needs a Tooltip.Provider around the tooltips, which the documented API has no
  place for. Here every tooltip on the page hands off to the next, as in the reference.
- Escape is heard in the capture phase, so inside a Dialog it stops at the tooltip.
So every change Base UI asks for is cancelled. Its Popup has no role and nothing sets
aria-describedby: both are added here.
*/
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import * as React from "react";
import {
	anchorWidthStyle,
	type Placement,
	positionerVariables,
	toPositionerProps,
} from "../../internal/anchor.js";
import { cx } from "../../internal/cx.js";
import { ownerDocument } from "../../internal/dom.js";
import {
	useControlled,
	useEventCallback,
	useForkRef,
	useId,
	useIsoLayoutEffect,
	useShouldReduceMotion,
} from "../../internal/hooks.js";
import { containingBlock, positionFixed } from "../../internal/position.js";
import {
	durations,
	growStyle,
	type MotionContext,
	type TransitionStatus,
} from "../../internal/transition.js";
import type { PopperProps } from "../Popper/index.js";

export type TooltipProps = Omit<
	React.HTMLAttributes<HTMLElement>,
	"title" | "children"
> & {
	/**
	The hint: a few words. Empty ('' or null) shows no tooltip.
	*/
	title: React.ReactNode;
	/**
	One element that can hold a ref and takes pointer and focus handlers (a button, a link, an Avatar…).
	*/
	children: React.ReactElement;
	/**
	Side and alignment. Default top. Flips when there is no room.
	*/
	placement?: Placement;
	/**
	A small arrow pointing at the child.
	*/
	arrow?: boolean;
	/**
	Wait before showing on hover, ms. Default 500.
	*/
	enterDelay?: number;
	/**
	Wait before hiding once the pointer leaves, ms. Default 0.
	*/
	leaveDelay?: number;
	/**
	Long-press time on touch, ms. Default 700.
	*/
	enterTouchDelay?: number;
	/**
	How long it stays after the finger lifts, ms. Default 1500.
	*/
	leaveTouchDelay?: number;
	/**
	true (default): the title describes the child (aria-describedby while open).
	false: the title names the child (aria-label), for icon-only buttons.
	*/
	describeChild?: boolean;
	/**
	Controlled open state.
	*/
	open?: boolean;
	/**
	Asked to open (hover after the delay, keyboard focus, long press).
	*/
	onOpen?: (event: React.SyntheticEvent | Event) => void;
	/**
	Asked to close (pointer left, blur, Escape, press).
	*/
	onClose?: (event: React.SyntheticEvent | Event) => void;
	disableHoverListener?: boolean;
	disableFocusListener?: boolean;
	disableTouchListener?: boolean;
	/**
	The tooltip ignores the pointer and closes as soon as it leaves the child.
	*/
	disableInteractive?: boolean;
	/**
	Render in place instead of in document.body (inside a showcase stage).
	*/
	disablePortal?: boolean;
	/**
	Props for the inner parts: the Popper layer and the role="tooltip" surface.
	*/
	slotProps?: {
		popper?: Partial<PopperProps>;
		tooltip?: React.HTMLAttributes<HTMLDivElement>;
	};
};

/**
Shared by every tooltip on the page: while one is open, or for 300ms after it closes, the next
one opens at once and without animation (moving along a toolbar).
*/
const handOff = { open: 0, lastClose: Number.NEGATIVE_INFINITY };
const handOffMs = 300;

function isHandOff(): boolean {
	return handOff.open > 0 || Date.now() - handOff.lastClose < handOffMs;
}

type TimerName = "enter" | "leave" | "touch";

const timerNames: readonly TimerName[] = ["enter", "leave", "touch"];

type ChildProps = React.HTMLAttributes<HTMLElement> & {
	readonly ref?: React.Ref<HTMLElement>;
};

// A hand-off opens and closes at once.
const instant = { enter: 0, exit: 0 };

// Untyped callers may pass null where the types say undefined.
const isUnset = (value: unknown) => value === undefined || value === null;

// The arrow's centre stays 12px from the surface's ends, clear of its rounded corners.
const arrowInset = 12;

type OffsetData = {
	side: string;
	align: string;
	positioner: { width: number; height: number };
};

/**
The gap to the anchor, as the reference places the layer: it takes the layer's whole-pixel size
(offsetWidth, offsetHeight), where Base UI takes the fractional one, so above and to the left the
layer would land up to a pixel off. Rounding a size gives the whole-pixel one (floating-ui reads
it the same way).
*/
function sideOffsetOf(offset: number) {
	return ({ side, positioner }: OffsetData): number => {
		if (side === "top") {
			return offset + Math.round(positioner.height) - positioner.height;
		}

		return side === "left"
			? offset + Math.round(positioner.width) - positioner.width
			: offset;
	};
}

/**
The same along the anchor: centred and end-aligned layers move by the size's fractional part as
the reference's would. Base UI turns the offset round for end alignment.
*/
function alignOffsetOf({ side, align, positioner }: OffsetData): number {
	const size =
		side === "top" || side === "bottom" ? positioner.width : positioner.height;
	const error = size - Math.round(size);
	if (align === "center") {
		return error / 2;
	}

	return align === "end" ? -error : 0;
}

type ArrowProps = React.HTMLAttributes<HTMLElement> & {
	readonly ref?: React.Ref<HTMLElement>;
};

/**
The arrow, centred on the anchor as the reference measures it: from the layer's box, rounded to
a whole pixel, at least 12px from the surface's ends. Base UI's Tooltip.Arrow renders it, so it
runs again whenever the tooltip moves, but its own offset is fractional and is left out.
*/
function ArrowAtAnchor({
	anchor,
	side,
	style: _baseUiOffset,
	ref,
	...props
}: ArrowProps & { readonly anchor: HTMLElement | null; readonly side: string }) {
	const arrowRef = React.useRef<HTMLElement | null>(null);
	const handleRef = useForkRef(arrowRef, ref);
	const [centre, setCentre] = React.useState<number | undefined>(undefined);
	const isVertical = side === "top" || side === "bottom";
	useIsoLayoutEffect(() => {
		const surface = arrowRef.current?.parentElement;
		const layer = surface?.parentElement;
		if (!surface || !layer || !anchor) {
			return;
		}

		const a = anchor.getBoundingClientRect();
		// The layer is never scaled (the Grow is on the surface), so its box is the true position.
		const b = layer.getBoundingClientRect();
		const length = isVertical ? surface.offsetWidth : surface.offsetHeight;
		const raw = isVertical
			? a.left + a.width / 2 - b.left
			: a.top + a.height / 2 - b.top;
		const next = Math.round(
			Math.min(Math.max(raw, arrowInset), Math.max(arrowInset, length - arrowInset)),
		);
		setCentre((previous) => (previous === next ? previous : next));
	});
	let offset: React.CSSProperties | undefined;
	if (centre !== undefined) {
		offset = isVertical ? { left: centre } : { top: centre };
	}

	return <span ref={handleRef} {...props} style={offset} />;
}

/**
The transition status of the surface, from Base UI's: its starting and ending styles are the
exited look, which the Grow runs from and back to.
*/
function statusOf({
	open,
	transitionStatus,
}: BaseTooltip.Popup.State): TransitionStatus {
	return open && transitionStatus !== "starting" ? "entered" : "exiting";
}

type Container = HTMLElement | React.RefObject<HTMLElement>;

/**
Body, the documented mount point. Base UI's own default is the Base UI popup the tooltip sits in
(a Dialog's portal), so it's passed explicitly, as a ref: Base UI reads it only once mounted, so
body is never read while rendering.
*/
const body: React.RefObject<HTMLElement> = {
	get current() {
		return document.body;
	},
};

/**
The portal's container for the popper slot's `container`: an element as it is, a function's
element once mounted (Base UI waits on null until then), and body for none.
*/
function usePortalContainer(
	container: PopperProps["container"],
): Container | null {
	const [resolved, setResolved] = React.useState<Container | null>(null);
	useIsoLayoutEffect(() => {
		if (typeof container === "function") {
			setResolved((container() as HTMLElement | null) ?? body);
		}
	}, [container]);
	if (typeof container === "function") {
		return resolved;
	}

	return (container as HTMLElement | null | undefined) ?? body;
}

/**
Every open and close comes from this component's own handlers, so what Base UI asks for (an
outside press, its own Escape, the pointer leaving the popup) is cancelled, and its event goes on.
*/
function cancelBaseUiChange(
	_open: boolean,
	details: BaseTooltip.Root.ChangeEventDetails,
): void {
	details.cancel();
	details.allowPropagation();
}

/**
A short ink label for its child. It opens on hover after 500ms (at once when moving from another
tooltip), on keyboard focus and on a long press; Escape, blur and leaving close it.
*/
export function Tooltip({
	title,
	children,
	placement = "top",
	arrow = false,
	enterDelay = 500,
	leaveDelay = 0,
	enterTouchDelay = 700,
	leaveTouchDelay = 1500,
	describeChild = true,
	open: openProp,
	onOpen,
	onClose,
	disableHoverListener = false,
	disableFocusListener = false,
	disableTouchListener = false,
	disableInteractive = false,
	disablePortal = false,
	slotProps,
	id: idProp,
	ref,
	...other
}: TooltipProps & { readonly ref?: React.Ref<HTMLElement> }) {
	// eslint-disable-next-line @eslint-react/no-children-only -- The documented one child.
	const child = React.Children.only(children) as React.ReactElement<ChildProps>;
	const base: ChildProps = { ...other, ...child.props };
	const id = useId(idProp);
	const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
	const [slot, setSlot] = React.useState<HTMLElement | null>(null);
	const [openState, setOpenState] = useControlled(openProp, false);
	const hasTitle =
		title !== undefined && title !== null && title !== false && title !== "";
	const isOpen = hasTitle && openState;
	const [isInstant, setIsInstant] = React.useState(false);
	const shouldReduceMotion = useShouldReduceMotion();

	const openRef = React.useRef(isOpen);
	useIsoLayoutEffect(() => {
		openRef.current = isOpen;
	});
	const timersRef = React.useRef<
		Record<TimerName, ReturnType<typeof setTimeout> | undefined>
	>({ enter: undefined, leave: undefined, touch: undefined });
	const reasonsRef = React.useRef({ hover: false, focus: false });
	// A press means acting, not reading: it hides the tooltip until the pointer leaves.
	const isSuppressedRef = React.useRef(false);
	const isOpenedByPersonRef = React.useRef(false);

	const clear = React.useCallback(
		(names: readonly TimerName[] = timerNames) => {
			for (const name of names) {
				clearTimeout(timersRef.current[name]);
				timersRef.current[name] = undefined;
			}
		},
		[],
	);
	React.useEffect(
		() => () => {
			clear();
		},
		[clear],
	);

	// Count the tooltips the person opened, for the hand-off. Ones held open by a parent don't.
	React.useEffect(() => {
		if (!isOpen || !isOpenedByPersonRef.current) {
			return undefined;
		}

		handOff.open += 1;
		return () => {
			handOff.open -= 1;
			handOff.lastClose = Date.now();
		};
	}, [isOpen]);

	const show = useEventCallback(
		(event: React.SyntheticEvent | Event, isQuick: boolean) => {
			clear();
			if (openRef.current) {
				return;
			}

			isOpenedByPersonRef.current = true;
			setIsInstant(isQuick);
			setOpenState(true);
			onOpen?.(event);
		},
	);
	const hide = useEventCallback((event: React.SyntheticEvent | Event) => {
		clear();
		if (!openRef.current) {
			return;
		}

		setOpenState(false);
		onClose?.(event);
	});
	const hideLater = (event: React.SyntheticEvent, delay: number) => {
		clear(["enter", "leave"]);
		timersRef.current.leave = setTimeout(() => {
			hide(event);
		}, delay);
	};

	// Escape closes it before anything else on the page hears the key, so a Dialog under it stays
	// open. A tooltip held open with no onClose lets the key through.
	const isEscapeHeard = openProp === undefined || onClose !== undefined;
	React.useEffect(() => {
		if (!isOpen || !isEscapeHeard) {
			return undefined;
		}

		const document_ = ownerDocument(anchor);
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape") {
				return;
			}

			event.stopPropagation();
			if (reasonsRef.current.hover) {
				isSuppressedRef.current = true;
			}

			hide(event);
		}

		document_.addEventListener("keydown", handleKeyDown, true);
		return () => {
			document_.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [isOpen, isEscapeHeard, anchor, hide]);

	const handlePointerEnter = (event: React.PointerEvent<HTMLElement>) => {
		base.onPointerEnter?.(event);
		if (event.pointerType === "touch" || disableHoverListener || !hasTitle) {
			return;
		}

		reasonsRef.current.hover = true;
		if (isSuppressedRef.current) {
			return;
		}

		clear(["leave"]);
		if (openRef.current) {
			return;
		}

		const isQuick = isHandOff();
		if (isQuick || enterDelay <= 0) {
			show(event, isQuick);
		} else {
			clear(["enter"]);
			timersRef.current.enter = setTimeout(() => {
				show(event, false);
			}, enterDelay);
		}
	};
	const handlePointerLeave = (event: React.PointerEvent<HTMLElement>) => {
		base.onPointerLeave?.(event);
		if (event.pointerType === "touch") {
			return;
		}

		reasonsRef.current.hover = false;
		isSuppressedRef.current = false;
		clear(["enter"]);
		if (!reasonsRef.current.focus) {
			hideLater(event, disableInteractive ? 0 : leaveDelay);
		}
	};
	const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
		base.onPointerDown?.(event);
		if (event.pointerType === "touch") {
			if (disableTouchListener || !hasTitle) {
				return;
			}

			clear();
			timersRef.current.touch = setTimeout(() => {
				show(event, false);
			}, enterTouchDelay);
			return;
		}

		isSuppressedRef.current = true;
		reasonsRef.current.focus = false;
		hide(event);
	};
	// The finger lifted, or the browser took the touch over: it stays leaveTouchDelay more.
	const handleTouchEnd = (event: React.PointerEvent<HTMLElement>) => {
		if (event.pointerType !== "touch") {
			return;
		}

		clear(["touch"]);
		timersRef.current.leave = setTimeout(() => {
			hide(event);
		}, leaveTouchDelay);
	};
	const handlePointerUp = (event: React.PointerEvent<HTMLElement>) => {
		base.onPointerUp?.(event);
		handleTouchEnd(event);
	};
	const handlePointerCancel = (event: React.PointerEvent<HTMLElement>) => {
		base.onPointerCancel?.(event);
		handleTouchEnd(event);
	};
	const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
		base.onFocus?.(event);
		// Keyboard focus only: the focus a press gives isn't :focus-visible.
		if (
			disableFocusListener ||
			!hasTitle ||
			!event.target.matches(":focus-visible")
		) {
			return;
		}

		reasonsRef.current.focus = true;
		show(event, isHandOff());
	};
	const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
		base.onBlur?.(event);
		reasonsRef.current.focus = false;
		if (!reasonsRef.current.hover) {
			hide(event);
		}
	};

	const handleRef = useForkRef<HTMLElement>(setAnchor, child.props.ref, ref);
	const isLabel = !describeChild && typeof title === "string";
	const merged: ChildProps & Record<string, unknown> = {
		...base,
		className: cx(other.className, child.props.className) || undefined,
		style:
			other.style === undefined && child.props.style === undefined
				? undefined
				: { ...other.style, ...child.props.style },
		ref: handleRef,
		onPointerEnter: handlePointerEnter,
		onPointerLeave: handlePointerLeave,
		onPointerDown: handlePointerDown,
		onPointerUp: handlePointerUp,
		onPointerCancel: handlePointerCancel,
		onFocus: handleFocus,
		onBlur: handleBlur,
	};
	if (describeChild) {
		if (isOpen) {
			merged["aria-describedby"] = cx(base["aria-describedby"], id);
		}
	} else if (isLabel) {
		// A name the child already has wins.
		if (isUnset(base["aria-label"]) && isUnset(base["aria-labelledby"])) {
			merged["aria-label"] = title;
		}
	} else if (isOpen) {
		merged["aria-labelledby"] = cx(base["aria-labelledby"], id);
	}

	const {
		// The tooltip decides these, as in the reference.
		open: _open,
		anchorEl: _anchorEl,
		children: _children,
		transition: _transition,
		placement: popperPlacement = placement,
		offset = arrow ? 12 : 8,
		disablePortal: isInPlace = disablePortal,
		container,
		keepMounted = false,
		matchWidth = false,
		zIndex = "var(--z-tooltip, 1500)",
		className: popperClassName,
		style: popperStyle,
		...popperRest
	} = slotProps?.popper ?? {};
	const {
		className: surfaceClassName,
		style: surfaceStyle,
		onPointerEnter: onSurfacePointerEnter,
		onPointerLeave: onSurfacePointerLeave,
		...surfaceRest
	} = slotProps?.tooltip ?? {};
	const portalContainer = usePortalContainer(container);
	const [layer, setLayer] = React.useState<HTMLElement | null>(null);
	// Inside a containing block (a transformed showcase stage) the reference flips against that
	// block alone, where Base UI keeps the layer in the viewport too, so a page scrolled past the
	// stage would turn the tooltip over. There the reference's own math picks the side.
	const [blockPlacement, setBlockPlacement] = React.useState<Placement>();
	useIsoLayoutEffect(() => {
		if (layer === null || anchor === null) {
			return;
		}

		const next =
			containingBlock(layer) === null
				? undefined
				: positionFixed(anchor.getBoundingClientRect(), layer, {
						placement: popperPlacement,
						offset,
					}).placement;
		setBlockPlacement((previous) => (previous === next ? previous : next));
	});
	const positionerProps = toPositionerProps({
		placement: blockPlacement ?? popperPlacement,
		offset,
	});
	const motion: MotionContext = {
		...(isInstant ? instant : durations.grow),
		reduced: shouldReduceMotion,
	};

	return (
		<>
			{/* eslint-disable-next-line @eslint-react/no-clone-element -- The reference's contract: the child gets the handlers. */}
			{React.cloneElement(child, merged)}
			{hasTitle && isInPlace ? (
				// In place, Base UI portals into this: it lays out nothing itself.
				<span ref={setSlot} style={{ display: "contents" }} />
			) : null}
			{hasTitle ? (
				<BaseTooltip.Root
					open={isOpen && anchor !== null}
					disableHoverablePopup={disableInteractive}
					onOpenChange={cancelBaseUiChange}
				>
					<BaseTooltip.Portal
						container={isInPlace ? slot : portalContainer}
						keepMounted={keepMounted}
						style={{ display: "contents" }}
					>
						<BaseTooltip.Positioner
							{...positionerProps}
							collisionAvoidance={
								blockPlacement === undefined
									? positionerProps.collisionAvoidance
									: { ...positionerProps.collisionAvoidance, side: "none" }
							}
							{...popperRest}
							ref={setLayer}
							anchor={anchor}
							sideOffset={sideOffsetOf(offset)}
							alignOffset={alignOffsetOf}
							className={cx(
								"gl-tooltip-popper",
								disableInteractive && "gl-tooltip-popper-static",
								popperClassName,
							)}
							style={{
								zIndex,
								...positionerVariables,
								...(matchWidth ? anchorWidthStyle : undefined),
								...popperStyle,
							}}
						>
							<BaseTooltip.Popup
								{...surfaceRest}
								id={id}
								role="tooltip"
								// The reference's surface takes no focus; Base UI's Popup would.
								tabIndex={undefined}
								// When the title is the child's name, the popup would only repeat it.
								aria-hidden={isLabel ? true : undefined}
								className={cx(
									"gl-tooltip",
									arrow && "gl-tooltip-arrowed",
									surfaceClassName,
								)}
								style={(state) => ({
									...surfaceStyle,
									...growStyle(statusOf(state), motion),
								})}
								onPointerEnter={(event) => {
									onSurfacePointerEnter?.(event);
									if (disableInteractive || event.pointerType === "touch") {
										return;
									}

									reasonsRef.current.hover = true;
									clear(["leave"]);
								}}
								onPointerLeave={(event) => {
									onSurfacePointerLeave?.(event);
									if (disableInteractive || event.pointerType === "touch") {
										return;
									}

									reasonsRef.current.hover = false;
									if (!reasonsRef.current.focus) {
										hideLater(event, leaveDelay);
									}
								}}
							>
								{title}
								{arrow ? (
									<BaseTooltip.Arrow
										className="gl-tooltip-arrow"
										render={(props, state) => (
											<ArrowAtAnchor {...props} anchor={anchor} side={state.side} />
										)}
									/>
								) : null}
							</BaseTooltip.Popup>
						</BaseTooltip.Positioner>
					</BaseTooltip.Portal>
				</BaseTooltip.Root>
			) : null}
		</>
	);
}
