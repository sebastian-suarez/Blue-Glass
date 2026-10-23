"use client";
import * as React from "react";
import { useIsHydrating } from "../../internal/transition.js";
import { cx } from "../../internal/cx.js";
import {
	useControlled,
	useEventCallback,
	useForkRef,
	useId,
	useShouldReduceMotion,
} from "../../internal/hooks.js";
import { Zoom } from "../Transitions/index.js";
import { Fab, type FabProps } from "../Fab/index.js";
import { Icon } from "../Icon/index.js";

export type SpeedDialDirection = "up" | "down" | "left" | "right";
export type SpeedDialOpenReason = "toggle" | "mouseEnter" | "keyboard";
export type SpeedDialCloseReason =
	"toggle" | "blur" | "mouseLeave" | "escapeKeyDown" | "actionClick";
type SpeedDialContextValue = {
	open: boolean;
	direction: SpeedDialDirection;
	close: (
		event: React.SyntheticEvent | Event,
		reason: SpeedDialCloseReason,
	) => void;
};
const SpeedDialContext = React.createContext<SpeedDialContextValue | null>(
	null,
);
const NEXT_KEY: Record<SpeedDialDirection, string> = {
	up: "ArrowUp",
	down: "ArrowDown",
	left: "ArrowLeft",
	right: "ArrowRight",
};
const PREV_KEY: Record<SpeedDialDirection, string> = {
	up: "ArrowDown",
	down: "ArrowUp",
	left: "ArrowRight",
	right: "ArrowLeft",
};
const OPEN_STAGGER = 40;
const CLOSE_STAGGER = 25;
const HOVER_CLOSE_DELAY = 160;
const PIN_WINDOW = 400;
/**
`on`, switched after `delay` ms (immediately when delay is 0).
*/
function useIsStaggered(isOn: boolean, delay: number): boolean {
	const isHydrating = useIsHydrating();
	const [shown, setShown] = React.useState(
		isHydrating ? isOn : delay > 0 ? false : isOn,
	);
	React.useEffect(() => {
		if (shown === isOn || delay <= 0) {
			return;
		}

		const t = setTimeout(() => {
			setShown(isOn);
		}, delay);
		return () => {
			clearTimeout(t);
		};
	}, [isOn, delay, shown]);
	if (shown !== isOn && delay <= 0) {
		setShown(isOn);
	}

	return delay <= 0 ? isOn : shown;
}

export type SpeedDialProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"hidden" | "children"
> & {
	/**
Accessible name of the trigger, such as "Contact and share". Required: the trigger is icon-only.
*/
	ariaLabel: string;
	/**
Open (controlled).
*/
	open?: boolean;
	/**
Open at first (uncontrolled).
*/
	defaultOpen?: boolean;
	/**
Called when it asks to open, with the reason: toggle, mouseEnter or keyboard.
*/
	onOpen?: (event: React.SyntheticEvent, reason: SpeedDialOpenReason) => void;
	/**
Called when it asks to close, with the reason: toggle, blur, mouseLeave, escapeKeyDown or actionClick.
*/
	onClose?: (
		event: React.SyntheticEvent | Event,
		reason: SpeedDialCloseReason,
	) => void;
	/**
The way the actions fan out from the trigger. Default up.
*/
	direction?: SpeedDialDirection;
	/**
Zoom the whole dial out, closing it; for example while the reader scrolls down.
*/
	hidden?: boolean;
	/**
The trigger's icon. Default a SpeedDialIcon: a plus that turns 45° into a close.
*/
	icon?: React.ReactNode;
	/**
Also open on hover with a fine pointer, not only on click. Default true.
*/
	openOnHover?: boolean;
	/**
Props for the trigger Fab, e.g. size. It stays the ink circle.
*/
	FabProps?: Partial<FabProps>;
	/**
SpeedDialActions, the one nearest the trigger first.
*/
	children?: React.ReactNode;
};
/**
A floating action button that fans out up to five related actions, each a small glass Fab with a label pill.
*/
export function SpeedDial({
	ref,
	...props
}: SpeedDialProps & {
	ref?: React.Ref<HTMLDivElement>;
}) {
	const {
		ariaLabel,
		open: openProp,
		defaultOpen = false,
		onOpen,
		onClose,
		direction = "up",
		hidden = false,
		icon,
		openOnHover = true,
		FabProps,
		id,
		className,
		onKeyDown,
		onPointerEnter,
		onPointerLeave,
		onBlur,
		onPointerDownCapture,
		onPointerUpCapture,
		onPointerCancelCapture,
		children,
		...rest
	} = props;
	const baseId = useId(id);
	const fabId = `${baseId}-trigger`;
	const actionsId = `${baseId}-actions`;
	const isReduced = useShouldReduceMotion();
	const [openState, setOpenState] = useControlled(openProp, defaultOpen);
	const isOpen = openState && !hidden;
	React.useEffect(() => {
		if (hidden) {
			setOpenState(false);
		}
	}, [hidden, setOpenState]);
	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const handleRef = useForkRef(rootRef, ref);
	const fabRef = React.useRef<HTMLButtonElement | null>(null);
	const actionsRef = React.useRef<HTMLDivElement | null>(null);
	const openedByRef = React.useRef<{
		reason: SpeedDialOpenReason;
		at: number;
	} | null>(null);
	const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const pressingRef = React.useRef(false);
	const [focusIndex, setFocusIndex] = React.useState<number | null>(null);
	const getActions = () =>
		actionsRef.current
			? [
					...actionsRef.current.querySelectorAll<HTMLElement>(
						'[role="menuitem"]:not(:disabled)',
					),
				]
			: [];
	const doOpen = useEventCallback(
		(event: React.SyntheticEvent, reason: SpeedDialOpenReason) => {
			clearTimeout(closeTimerRef.current);
			if (isOpen || hidden) {
				return;
			}

			openedByRef.current = { reason, at: event.timeStamp };
			setOpenState(true);
			onOpen?.(event, reason);
		},
	);
	const doClose = useEventCallback(
		(event: React.SyntheticEvent | Event, reason: SpeedDialCloseReason) => {
			clearTimeout(closeTimerRef.current);
			if (!isOpen) {
				return;
			}

			openedByRef.current = null;
			// Focus on an action would be lost as it hides: hand it back to the trigger.
			if (actionsRef.current?.contains(document.activeElement) === true) {
				fabRef.current?.focus({ preventScroll: true });
			}

			setOpenState(false);
			onClose?.(event, reason);
		},
	);
	React.useEffect(
		() => () => {
			clearTimeout(closeTimerRef.current);
		},
		[],
	);
	// A press outside closes it (Safari never focuses buttons, so blur alone isn't enough).
	React.useEffect(() => {
		if (!isOpen) {
			return;
		}

		const onDown = (ev: PointerEvent) => {
			if (rootRef.current && !rootRef.current.contains(ev.target as Node)) {
				doClose(ev, "blur");
			}
		};

		const onUp = () => {
			pressingRef.current = false;
		};

		document.addEventListener("pointerdown", onDown);
		document.addEventListener("pointerup", onUp);
		return () => {
			document.removeEventListener("pointerdown", onDown);
			document.removeEventListener("pointerup", onUp);
		};
	}, [isOpen, doClose]);
	// Keyboard opening focuses the first action as soon as it is visible.
	React.useEffect(() => {
		if (!isOpen || focusIndex === null) {
			return;
		}

		let raf = 0;
		let tries = 0;
		const attempt = () => {
			const element_ = getActions().at(focusIndex);
			if (element_) {
				element_.focus({ preventScroll: true });
				if (document.activeElement === element_) {
					setFocusIndex(null);
					return;
				}
			}

			tries += 1;
			if (tries < 30) {
				raf = requestAnimationFrame(attempt);
			} else {
				setFocusIndex(null);
			}
		};

		raf = requestAnimationFrame(attempt);
		return () => {
			cancelAnimationFrame(raf);
		};
	}, [isOpen, focusIndex]);
	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		onKeyDown?.(event);
		if (event.defaultPrevented) {
			return;
		}

		if (event.key === "Escape") {
			if (!isOpen) {
				return;
			}

			event.stopPropagation();
			doClose(event, "escapeKeyDown");
			fabRef.current?.focus({ preventScroll: true });
			return;
		}

		const isNext = event.key === NEXT_KEY[direction];
		if (!isNext && event.key !== PREV_KEY[direction]) {
			return;
		}

		const actions = getActions();
		const i = actions.indexOf(document.activeElement as HTMLElement);
		if (i === -1 && document.activeElement !== fabRef.current) {
			return;
		}

		event.preventDefault();
		if (isNext) {
			if (!isOpen) {
				doOpen(event, "keyboard");
				setFocusIndex(0);
				return;
			}

			const target = Math.min(i + 1, actions.length - 1);
			if (target < 0) {
				return;
			}

			actions[target].focus();
			if (document.activeElement !== actions[target]) {
				setFocusIndex(target);
			} // Still zooming in
		} else if (i > 0) {
			actions[i - 1].focus();
		} else if (i === 0) {
			fabRef.current?.focus();
		}
	};

	const isHoverable = () =>
		typeof window !== "undefined" &&
		Boolean(window.matchMedia) &&
		window.matchMedia("(hover: hover) and (pointer: fine)").matches;
	const handlePointerEnter = (event2: React.PointerEvent<HTMLDivElement>) => {
		onPointerEnter?.(event2);
		if (
			!openOnHover ||
			hidden ||
			event2.pointerType !== "mouse" ||
			!isHoverable()
		) {
			return;
		}

		clearTimeout(closeTimerRef.current);
		if (!isOpen) {
			doOpen(event2, "mouseEnter");
		}
	};

	const handlePointerLeave = (event3: React.PointerEvent<HTMLDivElement>) => {
		onPointerLeave?.(event3);
		if (
			event3.pointerType !== "mouse" ||
			openedByRef.current?.reason !== "mouseEnter"
		) {
			return;
		}

		const native = event3.nativeEvent;
		closeTimerRef.current = setTimeout(() => {
			doClose(native, "mouseLeave");
		}, HOVER_CLOSE_DELAY);
	};

	const handleBlur = (event4: React.FocusEvent<HTMLDivElement>) => {
		onBlur?.(event4);
		const to = event4.relatedTarget as Node | null;
		if (
			!isOpen ||
			pressingRef.current ||
			openedByRef.current?.reason === "mouseEnter" ||
			(to && rootRef.current?.contains(to) === true)
		) {
			return;
		}

		doClose(event4, "blur");
	};

	const handleFabClick = (event5: React.MouseEvent<HTMLButtonElement>) => {
		FabProps?.onClick?.(event5);
		if (event5.defaultPrevented) {
			return;
		}

		if (!isOpen) {
			doOpen(event5, "toggle");
			return;
		}

		const by = openedByRef.current;
		if (by?.reason === "mouseEnter" && event5.timeStamp - by.at < PIN_WINDOW) {
			openedByRef.current = { reason: "toggle", at: event5.timeStamp }; // The click that met a hover-open: keep it open
			return;
		}

		doClose(event5, "toggle");
	};

	// Preserve child order and keys when assigning the reference's stagger delays.
	// eslint-disable-next-line @eslint-react/no-children-to-array
	const items = React.Children.toArray(children).filter((child) =>
		React.isValidElement<SpeedDialActionProps>(child),
	);
	const count = items.length;
	const actions = items.map((child, i) =>
		// eslint-disable-next-line @eslint-react/no-clone-element -- Delay augments each supplied action without replacing its props.
		React.cloneElement(child, {
			delay:
				child.props.delay ??
				(isReduced
					? 0
					: isOpen
						? i * OPEN_STAGGER
						: (count - 1 - i) * CLOSE_STAGGER),
		}),
	);
	const ctx = React.useMemo<SpeedDialContextValue>(
		() => ({ open: isOpen, direction, close: doClose }),
		[isOpen, direction, doClose],
	);
	return (
		<SpeedDialContext value={ctx}>
			<div
				ref={handleRef}
				id={id}
				className={cx("gl-speed-dial", `gl-speed-dial-${direction}`, className)}
				data-open={isOpen ? "" : undefined}
				onKeyDown={handleKeyDown}
				onPointerEnter={handlePointerEnter}
				onPointerLeave={handlePointerLeave}
				onBlur={handleBlur}
				onPointerDownCapture={(event6: React.PointerEvent<HTMLDivElement>) => {
					onPointerDownCapture?.(event6);
					pressingRef.current = true;
				}}
				onPointerUpCapture={(event) => {
					onPointerUpCapture?.(event);
					pressingRef.current = false;
				}}
				onPointerCancelCapture={(event) => {
					onPointerCancelCapture?.(event);
					pressingRef.current = false;
				}}
				{...rest}
			>
				<Zoom in={!hidden} appear={false}>
					<Fab
						ref={fabRef}
						id={fabId}
						aria-label={ariaLabel}
						aria-haspopup="menu"
						aria-expanded={isOpen}
						aria-controls={actionsId}
						{...FabProps}
						variant="primary"
						className={cx("gl-speed-dial-fab", FabProps?.className)}
						onClick={handleFabClick}
					>
						{icon ?? <SpeedDialIcon />}
					</Fab>
				</Zoom>
				<div
					ref={actionsRef}
					id={actionsId}
					role="menu"
					aria-orientation={
						direction === "up" || direction === "down"
							? "vertical"
							: "horizontal"
					}
					aria-labelledby={fabId}
					className="gl-speed-dial-actions"
				>
					{actions}
				</div>
			</div>
		</SpeedDialContext>
	);
}

export type SpeedDialActionProps = Omit<
	React.HTMLAttributes<HTMLSpanElement>,
	"onClick"
> & {
	/**
The action's icon.
*/
	icon: React.ReactNode;
	/**
The action's name: shown in its label pill, and the button's accessible name.
*/
	tooltipTitle: React.ReactNode;
	/**
Keep the label pill shown while the dial is open (touch screens have no hover). Otherwise it shows on hover and focus.
*/
	tooltipOpen?: boolean;
	/**
Side the label sits on. Default left for up and down dials, top for left and right ones.
*/
	tooltipPlacement?: "left" | "right" | "top" | "bottom";
	/**
Can't be chosen; skipped by the arrow keys.
*/
	disabled?: boolean;
	/**
Called on click, Enter or Space. The dial then closes, unless you call event.preventDefault().
*/
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	/**
Entry delay in ms. SpeedDial sets it to stagger the actions; leave it unset.
*/
	delay?: number;
	/**
Props for the action's glass Fab.
*/
	FabProps?: Partial<FabProps>;
};
/**
One action of a SpeedDial: a small glass Fab with an ink label pill.
*/
export function SpeedDialAction({
	ref,
	...props
}: SpeedDialActionProps & {
	ref?: React.Ref<HTMLSpanElement>;
}) {
	const {
		icon,
		tooltipTitle,
		tooltipOpen = false,
		tooltipPlacement,
		disabled = false,
		onClick,
		delay = 0,
		FabProps,
		id,
		className,
		...rest
	} = props;
	const ctx = React.use(SpeedDialContext);
	const isOpen = ctx?.open ?? false;
	const direction = ctx?.direction ?? "up";
	const placement =
		tooltipPlacement ??
		(direction === "up" || direction === "down" ? "left" : "top");
	const labelId = `${useId(id)}-label`;
	const isShown = useIsStaggered(isOpen, delay);
	return (
		<Zoom in={isShown}>
			<span
				ref={ref}
				id={id}
				role="none"
				className={cx("gl-speed-dial-action", className)}
				data-placement={placement}
				data-tooltip-open={tooltipOpen ? "" : undefined}
				{...rest}
			>
				<span id={labelId} className="gl-speed-dial-label" aria-hidden="true">
					{tooltipTitle}
				</span>
				<Fab
					variant="glass"
					size="sm"
					role="menuitem"
					tabIndex={-1}
					aria-labelledby={labelId}
					disabled={disabled}
					{...FabProps}
					onClick={(event7: React.MouseEvent<HTMLButtonElement>) => {
						onClick?.(event7);
						FabProps?.onClick?.(event7);
						if (!event7.defaultPrevented) {
							ctx?.close(event7, "actionClick");
						}
					}}
				>
					{icon}
				</Fab>
			</span>
		</Zoom>
	);
}

export type SpeedDialIconProps = React.HTMLAttributes<HTMLSpanElement> & {
	/**
The closed icon. Default a plus, which turns 45° into a close as the dial opens.
*/
	icon?: React.ReactNode;
	/**
An icon to cross-fade to when open, instead of turning the plus.
*/
	openIcon?: React.ReactNode;
	/**
Override the dial's open state.
*/
	open?: boolean;
};
/**
The trigger's icon: a plus that turns 45° into a close, or a cross-fade to openIcon.
*/
export function SpeedDialIcon({
	ref,
	icon,
	openIcon,
	open: openProp,
	className,
	...rest
}: SpeedDialIconProps & {
	ref?: React.Ref<HTMLSpanElement>;
}) {
	const ctx = React.use(SpeedDialContext);
	const isOpen = openProp ?? ctx?.open ?? false;
	const hasOpenIcon = Boolean(openIcon);
	return (
		<span
			ref={ref}
			aria-hidden="true"
			className={cx(
				"gl-speed-dial-icon",
				isOpen && "gl-speed-dial-icon-open",
				hasOpenIcon && "gl-speed-dial-icon-swap",
				className,
			)}
			{...rest}
		>
			<span className="gl-speed-dial-icon-closed">
				{icon ?? <Icon name="plus" />}
			</span>
			{hasOpenIcon ? (
				<span className="gl-speed-dial-icon-opened">{openIcon}</span>
			) : null}
		</span>
	);
}
