"use client";
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
	title: React.ReactNode;
	children: React.ReactElement;
	placement?: Placement;
	arrow?: boolean;
	enterDelay?: number;
	leaveDelay?: number;
	enterTouchDelay?: number;
	leaveTouchDelay?: number;
	describeChild?: boolean;
	open?: boolean;
	onOpen?: (event: React.SyntheticEvent | Event) => void;
	onClose?: (event: React.SyntheticEvent | Event) => void;
	disableHoverListener?: boolean;
	disableFocusListener?: boolean;
	disableTouchListener?: boolean;
	disableInteractive?: boolean;
	disablePortal?: boolean;
	slotProps?: {
		popper?: Partial<PopperProps>;
		tooltip?: React.HTMLAttributes<HTMLDivElement>;
	};
};

const handOff = { open: 0, lastClose: -Infinity };
const handOffMs = 300;

function isHandOff(): boolean {
	return handOff.open > 0 || Date.now() - handOff.lastClose < handOffMs;
}

type TimerName = "enter" | "leave" | "touch";

const timerNames: readonly TimerName[] = ["enter", "leave", "touch"];

type ChildProps = React.HTMLAttributes<HTMLElement> & {
	readonly ref?: React.Ref<HTMLElement>;
};

const instant = { enter: 0, exit: 0 };

const isUnset = (value: unknown) => value === undefined || value === null;

const arrowInset = 12;

type OffsetData = {
	side: string;
	align: string;
	positioner: { width: number; height: number };
};

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

function ArrowAtAnchor({
	anchor,
	side,
	style: _baseUiOffset,
	ref,
	...props
}: ArrowProps & {
	readonly anchor: HTMLElement | null;
	readonly side: string;
}) {
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
		const b = layer.getBoundingClientRect();
		const length = isVertical ? surface.offsetWidth : surface.offsetHeight;
		const halfAnchor = (isVertical ? a.width : a.height) / 2;
		const raw = isVertical
			? a.left + halfAnchor - b.left
			: a.top + halfAnchor - b.top;
		const next = Math.round(
			Math.min(
				Math.max(raw, arrowInset),
				Math.max(arrowInset, length - arrowInset),
			),
		);
		setCentre((previous) => (previous === next ? previous : next));
	});
	let offset: React.CSSProperties | undefined;
	if (centre !== undefined) {
		offset = isVertical ? { left: centre } : { top: centre };
	}

	return <span ref={handleRef} {...props} style={offset} />;
}

function statusOf({
	open,
	transitionStatus,
}: BaseTooltip.Popup.State): TransitionStatus {
	return open && transitionStatus !== "starting" ? "entered" : "exiting";
}

type Container = HTMLElement | React.RefObject<HTMLElement>;

const bodyRef: React.RefObject<HTMLElement> = {
	get current() {
		return document.body;
	},
};

function usePortalContainer(
	container: PopperProps["container"],
): Container | null {
	const [resolved, setResolved] = React.useState<Container | null>(null);
	useIsoLayoutEffect(() => {
		if (typeof container === "function") {
			setResolved((container() as HTMLElement | null) ?? bodyRef);
		}
	}, [container]);
	return typeof container === "function"
		? resolved
		: ((container as HTMLElement | null | undefined) ?? bodyRef);
}

function cancelBaseUiChange(
	_isOpen: boolean,
	details: BaseTooltip.Root.ChangeEventDetails,
): void {
	details.cancel();
	details.allowPropagation();
}

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

		document_.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			document_.removeEventListener("keydown", handleKeyDown, {
				capture: true,
			});
		};
	}, [isOpen, isEscapeHeard, anchor, hide]);

	const handlePointerEnter = (event: React.PointerEvent<HTMLElement>) => {
		base.onPointerEnter?.(event);
		if (disableHoverListener || !hasTitle || event.pointerType === "touch") {
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
	const childClassName = cx(other.className, child.props.className);
	const merged: ChildProps & Record<string, unknown> = {
		...base,
		className: childClassName === "" ? undefined : childClassName,
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
		if (isUnset(base["aria-label"]) && isUnset(base["aria-labelledby"])) {
			merged["aria-label"] = title;
		}
	} else if (isOpen) {
		merged["aria-labelledby"] = cx(base["aria-labelledby"], id);
	}

	const {
		open: _open,
		anchorEl: _anchorElement,
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
			{/* eslint-disable-next-line @eslint-react/no-clone-element, react-hooks/refs -- The reference's contract: the child gets the handlers and the forked ref, which nothing reads while rendering. */}
			{React.cloneElement(child, merged)}
			{hasTitle && isInPlace ? (
				<span ref={setSlot} style={{ display: "contents" }} />
			) : null}
			{hasTitle ? (
				<BaseTooltip.Root
					open={isOpen && anchor !== null}
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
								...(matchWidth && anchorWidthStyle),
								...popperStyle,
							}}
						>
							<BaseTooltip.Popup
								{...surfaceRest}
								id={id}
								role="tooltip"
								tabIndex={undefined}
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
											<ArrowAtAnchor
												{...props}
												anchor={anchor}
												side={state.side}
											/>
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
