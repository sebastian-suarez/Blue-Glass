import * as React from "react";
import { reflow } from "./dom.js";
import { useEventCallback, useIsoLayoutEffect } from "./hooks.js";

export type TransitionStatus =
	"unmounted" | "exited" | "entering" | "entered" | "exiting";

export type Timeout = number | { enter?: number; exit?: number };

export type TransitionOptions = {
	in?: boolean;
	appear?: boolean;
	mountOnEnter?: boolean;
	unmountOnExit?: boolean;
	timeout?: Timeout;
	onEnter?: (node: HTMLElement) => void;
	onEntered?: (node: HTMLElement) => void;
	onExit?: (node: HTMLElement) => void;
	onExited?: (node: HTMLElement) => void;
};

export type Durations = { enter: number; exit: number };

export const durations = {
	fade: { enter: 200, exit: 150 },
	grow: { enter: 200, exit: 140 },
	zoom: { enter: 220, exit: 160 },
	slide: { enter: 280, exit: 220 },
	collapse: { enter: 450, exit: 300 },
} as const satisfies Record<string, Durations>;

export function getTimeout(
	timeout: Timeout | undefined,
	direction: keyof Durations,
	fallback: number,
): number {
	return typeof timeout === "number"
		? timeout
		: (timeout?.[direction] ?? fallback);
}

export function isShown(status: TransitionStatus): boolean {
	return status === "entering" || status === "entered";
}

function subscribeToNothing(): () => void {
	return () => undefined;
}

function isHydratingClientSnapshot(): boolean {
	return false;
}

function isHydratingServerSnapshot(): boolean {
	return true;
}

export function useIsHydrating(): boolean {
	return React.useSyncExternalStore(
		subscribeToNothing,
		isHydratingClientSnapshot,
		isHydratingServerSnapshot,
	);
}

export function useTransition(
	props: TransitionOptions,
	nodeRef: React.RefObject<HTMLElement | null>,
	defaults: Durations,
): TransitionStatus {
	const {
		in: inProp = false,
		appear = true,
		mountOnEnter = false,
		unmountOnExit = false,
		timeout,
	} = props;
	const isHydrating = useIsHydrating();
	const [status, setStatus] = React.useState<TransitionStatus>(() => {
		if (inProp) {
			return appear && !isHydrating ? "exited" : "entered";
		}

		return mountOnEnter || unmountOnExit ? "unmounted" : "exited";
	});
	const onEnter = useEventCallback((node: HTMLElement) =>
		props.onEnter?.(node),
	);
	const onEntered = useEventCallback((node: HTMLElement) =>
		props.onEntered?.(node),
	);
	const onExit = useEventCallback((node: HTMLElement) => props.onExit?.(node));
	const onExited = useEventCallback((node: HTMLElement) =>
		props.onExited?.(node),
	);
	const enterMs = getTimeout(timeout, "enter", defaults.enter);
	const exitMs = getTimeout(timeout, "exit", defaults.exit);

	useIsoLayoutEffect(() => {
		const node = nodeRef.current;
		let timer: ReturnType<typeof setTimeout> | undefined;
		if (inProp) {
			switch (status) {
				case "unmounted": {
					setStatus("exited");
					break;
				}

				case "exited":
				case "exiting": {
					if (node) {
						reflow(node);
						onEnter(node);
					}

					setStatus("entering");
					break;
				}

				case "entering": {
					timer = setTimeout(() => {
						setStatus("entered");
					}, enterMs);
					break;
				}

				case "entered": {
					if (node) {
						onEntered(node);
					}

					break;
				}
			}
		} else {
			switch (status) {
				case "entering":
				case "entered": {
					if (node) {
						onExit(node);
					}

					setStatus("exiting");
					break;
				}

				case "exiting": {
					timer = setTimeout(() => {
						setStatus("exited");
					}, exitMs);
					break;
				}

				case "exited": {
					if (node) {
						onExited(node);
					}

					if (unmountOnExit) {
						setStatus("unmounted");
					}

					break;
				}

				case "unmounted": {
					break;
				}
			}
		}

		return () => {
			clearTimeout(timer);
		};
	}, [
		inProp,
		status,
		enterMs,
		exitMs,
		unmountOnExit,
		nodeRef,
		onEnter,
		onEntered,
		onExit,
		onExited,
	]);

	return status;
}

export type MotionContext = Durations & { reduced: boolean };

const easeOut = "var(--ease-out-quint, cubic-bezier(0.23, 1, 0.32, 1))";

const hiddenWhenExited = (status: TransitionStatus) =>
	status === "exited" ? "hidden" : undefined;

export function fadeStyle(
	status: TransitionStatus,
	{ enter, exit }: MotionContext,
	easing?: string,
): React.CSSProperties {
	const isShowing = isShown(status);
	return {
		opacity: isShowing ? 1 : 0,
		visibility: hiddenWhenExited(status),
		transition: `opacity ${isShowing ? enter : exit}ms ${easing ?? (isShowing ? easeOut : "ease")}`,
	};
}

function scaleStyle(
	status: TransitionStatus,
	{ enter, exit, reduced }: MotionContext,
	from: number,
	origin?: string,
): React.CSSProperties {
	const isShowing = isShown(status);
	return {
		opacity: isShowing ? 1 : 0,
		transform: reduced || isShowing ? "none" : `scale(${from})`,
		transformOrigin: origin,
		visibility: hiddenWhenExited(status),
		transition: isShowing
			? `opacity ${enter}ms ${easeOut}, transform ${enter}ms ${easeOut}`
			: `opacity ${exit}ms ease, transform ${exit}ms ease`,
	};
}

export function growStyle(
	status: TransitionStatus,
	context: MotionContext,
	origin?: string,
): React.CSSProperties {
	return scaleStyle(
		status,
		context,
		0.96,
		origin ?? "var(--gl-transform-origin, center)",
	);
}

export function zoomStyle(
	status: TransitionStatus,
	context: MotionContext,
): React.CSSProperties {
	return scaleStyle(status, context, 0.85);
}

export type SlideDirection = "up" | "down" | "left" | "right";

const slideFrom: Record<SlideDirection, string> = {
	up: "translate3d(0, 100%, 0)",
	down: "translate3d(0, -100%, 0)",
	left: "translate3d(100%, 0, 0)",
	right: "translate3d(-100%, 0, 0)",
};

export function slideStyle(
	status: TransitionStatus,
	{ enter, exit, reduced }: MotionContext,
	direction: SlideDirection = "up",
): React.CSSProperties {
	const isShowing = isShown(status);
	const duration = isShowing ? enter : exit;
	if (reduced) {
		return {
			transform: "none",
			opacity: isShowing ? 1 : 0,
			visibility: hiddenWhenExited(status),
			transition: `opacity ${duration}ms ease`,
		};
	}

	return {
		transform: isShowing ? "none" : slideFrom[direction],
		visibility: hiddenWhenExited(status),
		transition: `transform ${duration}ms ${easeOut}`,
	};
}

export function collapseStyle(
	status: TransitionStatus,
	{ enter, exit, reduced }: MotionContext,
	{
		in: inProp = false,
		collapsedSize = "0px",
	}: { in?: boolean; collapsedSize?: string },
): { root: React.CSSProperties; inner: React.CSSProperties; hidden: boolean } {
	const isShowing = isShown(status);
	const isGone = status === "exited" && collapsedSize === "0px";
	return {
		root: {
			display: "grid",
			gridTemplateRows: `minmax(${collapsedSize}, ${isShowing ? "1fr" : "0fr"})`,
			transition: reduced
				? "none"
				: `grid-template-rows ${isShowing ? enter : exit}ms ${easeOut}`,
			visibility: isGone ? "hidden" : undefined,
		},
		inner: {
			minHeight: 0,
			overflow: status === "entered" ? "visible" : "hidden",
		},
		hidden: !inProp && isGone,
	};
}
