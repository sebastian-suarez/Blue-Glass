/**
The transition state machine that Fade, Grow, Zoom, Slide and Collapse (phase 1) and the
overlays that animate through them are built on, with the motion of each one. Ported from
design-system/components/Transitions/reference.tsx, whose README describes the motion.

The machine:
- A status runs exited → entering → entered → exiting → exited. "unmounted" means the
  child isn't rendered at all: before the first enter with `mountOnEnter`, and after an exit
  with `unmountOnExit`.
- `in` turns the child on (exited → entering → entered) and off (entered → exiting → exited).
  Turning it around midway takes the shortest path: `in` while exiting goes back to entering.
- `timeout` is in milliseconds, one number or `{ enter, exit }`. Each direction falls back to
  the component's default (`durations` holds the reference's). It's how long entering and
  exiting last; the CSS transition is expected to run for the same time.
- Callbacks, as in the reference: onEnter just before entering, after a forced reflow so the
  CSS transition starts from the exited style; onEntered once entered; onExit just before
  exiting; onExited once exited. A child that starts entered gets onEntered on mount, and one
  that starts exited (not unmounted) gets onExited on mount.
- Overlays wait for onExited before they unmount, as the reference's Modal does. One on
  Base UI can end its closing phase there: call details.preventUnmountOnClose() when it
  closes, then actionsRef.current.unmount() in onExited (Base UI's handbook, animation.md).
- `appear` (default true; Collapse passes false) makes a child that is `in` when it mounts
  enter from exited instead of starting entered.

The one change from the reference, for server rendering and islands: a child that is `in`
when React renders it on the server, or hydrates it, starts entered. Its server HTML is
visible, and hydrating it changes nothing and animates nothing: it behaves as if `appear`
were false (onEntered on mount, no onEnter). The reference started `<Fade in>` at exited, so
its server HTML held the child at opacity 0 and visibility hidden until the script ran.
`appear` still applies to client-side mounts: createRoot, a portal (which renders nothing on
the server), a Suspense boundary that renders on the client, and anything mounted after
hydration. Exits and later changes of `in` animate as before.

Reduced motion (useShouldReduceMotion): nothing moves, but a change of state still fades.
The machine runs the same way, with the same timings, because the fades need them; the
styles below drop the movement. Grow, Zoom and Slide become opacity fades, Fade is
unchanged, and Collapse snaps open or shut (no transition) while its statuses still run.

The styles are the reference's, per status. They go on the child inline, so position the
child with a wrapper, never with a transform of its own (the transition owns transform,
opacity and visibility).
*/
import * as React from "react";
import { reflow } from "./dom.js";
import { useEventCallback, useIsoLayoutEffect } from "./hooks.js";

export type TransitionStatus =
	"unmounted" | "exited" | "entering" | "entered" | "exiting";

export type Timeout = number | { enter?: number; exit?: number };

/**
The documented TransitionProps without `children`: the props useTransition reads.
*/
export type TransitionOptions = {
	/**
	Show (true) or hide (false) the child.
	*/
	in?: boolean;
	/**
	Run the enter transition on a client-side mount when `in` starts true. Default true.
	*/
	appear?: boolean;
	/**
	Mount the child only on first enter.
	*/
	mountOnEnter?: boolean;
	/**
	Unmount the child after it exits.
	*/
	unmountOnExit?: boolean;
	/**
	Duration in ms, or {enter, exit}.
	*/
	timeout?: Timeout;
	onEnter?: (node: HTMLElement) => void;
	onEntered?: (node: HTMLElement) => void;
	onExit?: (node: HTMLElement) => void;
	onExited?: (node: HTMLElement) => void;
};

export type Durations = { enter: number; exit: number };

/**
Each transition's default timing from the Transitions README. Exits are faster than entrances.
The base Transition uses Fade's.
*/
export const durations = {
	fade: { enter: 200, exit: 150 },
	grow: { enter: 200, exit: 140 },
	zoom: { enter: 220, exit: 160 },
	slide: { enter: 280, exit: 220 },
	collapse: { enter: 450, exit: 300 },
} as const satisfies Record<string, Durations>;

/**
The duration of one direction: the `timeout` prop's, else the fallback.
*/
export function getTimeout(
	timeout: Timeout | undefined,
	direction: keyof Durations,
	fallback: number,
): number {
	return typeof timeout === "number"
		? timeout
		: (timeout?.[direction] ?? fallback);
}

/**
Whether the child is showing or on its way to showing.
*/
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

/**
True while React renders on the server or hydrates server HTML, false for every render on the
client after that and for client-side mounts. React reads the server snapshot in both of the
first cases and re-renders once hydration is done, so the value is never out of step with the
HTML being adopted.
*/
export function useIsHydrating(): boolean {
	return React.useSyncExternalStore(
		subscribeToNothing,
		isHydratingClientSnapshot,
		isHydratingServerSnapshot,
	);
}

/**
The status machine behind every transition: exited -> entering -> entered -> exiting -> exited.
It has the documented useTransition signature, so the Transitions module can export it as is.
*/
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
			// Server HTML and the hydration that adopts it start entered: visible, nothing to animate.
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

	// A layout effect, so a step to entering renders before the browser paints the exited
	// style: the reflow has already fixed that style as the transition's start.
	useIsoLayoutEffect(() => {
		const node = nodeRef.current;
		let timer: ReturnType<typeof setTimeout> | undefined;
		if (inProp) {
			switch (status) {
				case "unmounted": {
					// Mount at exited first, so the next pass has a node to animate.
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

/**
What every motion style reads: the two durations, and whether the reader asked for reduced
motion (useShouldReduceMotion).
*/
export type MotionContext = Durations & { reduced: boolean };

/**
The site's ease-out-quint, for entrances and state changes.
*/
const easeOut = "var(--ease-out-quint, cubic-bezier(0.23, 1, 0.32, 1))";

const hiddenWhenExited = (status: TransitionStatus) =>
	status === "exited" ? "hidden" : undefined;

/**
Fade: opacity only, the reduced-motion fallback for every other transition.
*/
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
		// Never from nothing: the scale starts close to 1, always with opacity.
		transform: reduced || isShowing ? "none" : `scale(${from})`,
		transformOrigin: origin,
		visibility: hiddenWhenExited(status),
		transition: isShowing
			? `opacity ${enter}ms ${easeOut}, transform ${enter}ms ${easeOut}`
			: `opacity ${exit}ms ease, transform ${exit}ms ease`,
	};
}

/**
Grow: scale from 0.96 plus opacity, from the anchor's side. The origin defaults to
--gl-transform-origin, which the anchored popups set.
*/
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

/**
Zoom: scale from 0.85 plus opacity, centred. For floating action buttons.
*/
export function zoomStyle(
	status: TransitionStatus,
	context: MotionContext,
): React.CSSProperties {
	return scaleStyle(status, context, 0.85);
}

export type SlideDirection = "up" | "down" | "left" | "right";

/**
Where the child starts for each direction it enters in.
*/
const slideFrom: Record<SlideDirection, string> = {
	up: "translate3d(0, 100%, 0)",
	down: "translate3d(0, -100%, 0)",
	left: "translate3d(100%, 0, 0)",
	right: "translate3d(-100%, 0, 0)",
};

/**
Slide: in and out along the same path. For drawers and snackbars.
*/
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

/**
Collapse: the site's grid-rows reveal (.pane .more), rows from 0fr to 1fr, so nothing is
measured. `root` goes on the outer grid and `inner` on its only child; `hidden` says whether
the root is aria-hidden. Instant under reduced motion. Collapse defaults `appear` to false.
*/
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
