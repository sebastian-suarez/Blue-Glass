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
	ariaLabel: string;
	open?: boolean;
	defaultOpen?: boolean;
	onOpen?: (event: React.SyntheticEvent, reason: SpeedDialOpenReason) => void;
	onClose?: (
		event: React.SyntheticEvent | Event,
		reason: SpeedDialCloseReason,
	) => void;
	direction?: SpeedDialDirection;
	hidden?: boolean;
	icon?: React.ReactNode;
	openOnHover?: boolean;
	FabProps?: Partial<FabProps>;
	children?: React.ReactNode;
};
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
			}
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
	const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
		onPointerEnter?.(event);
		if (
			!openOnHover ||
			hidden ||
			event.pointerType !== "mouse" ||
			!isHoverable()
		) {
			return;
		}

		clearTimeout(closeTimerRef.current);
		if (!isOpen) {
			doOpen(event, "mouseEnter");
		}
	};

	const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
		onPointerLeave?.(event);
		if (
			event.pointerType !== "mouse" ||
			openedByRef.current?.reason !== "mouseEnter"
		) {
			return;
		}

		const native = event.nativeEvent;
		closeTimerRef.current = setTimeout(() => {
			doClose(native, "mouseLeave");
		}, HOVER_CLOSE_DELAY);
	};

	const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
		onBlur?.(event);
		const to = event.relatedTarget as Node | null;
		if (
			!isOpen ||
			pressingRef.current ||
			openedByRef.current?.reason === "mouseEnter" ||
			(to && rootRef.current?.contains(to) === true)
		) {
			return;
		}

		doClose(event, "blur");
	};

	const handleFabClick = (event: React.MouseEvent<HTMLButtonElement>) => {
		FabProps?.onClick?.(event);
		if (event.defaultPrevented) {
			return;
		}

		if (!isOpen) {
			doOpen(event, "toggle");
			return;
		}

		const by = openedByRef.current;
		if (by?.reason === "mouseEnter" && event.timeStamp - by.at < PIN_WINDOW) {
			openedByRef.current = { reason: "toggle", at: event.timeStamp };
			return;
		}

		doClose(event, "toggle");
	};

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
				onPointerDownCapture={(event: React.PointerEvent<HTMLDivElement>) => {
					onPointerDownCapture?.(event);
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
	icon: React.ReactNode;
	tooltipTitle: React.ReactNode;
	tooltipOpen?: boolean;
	tooltipPlacement?: "left" | "right" | "top" | "bottom";
	disabled?: boolean;
	onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
	delay?: number;
	FabProps?: Partial<FabProps>;
};
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
					onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
						onClick?.(event);
						FabProps?.onClick?.(event);
						if (!event.defaultPrevented) {
							ctx?.close(event, "actionClick");
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
	icon?: React.ReactNode;
	openIcon?: React.ReactNode;
	open?: boolean;
};
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
