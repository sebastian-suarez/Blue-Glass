"use client";
/**
Snackbar, ported from design-system/components/Snackbar/reference.tsx, on Portal,
ClickAwayListener and Slide. Base UI's Toast doesn't fit the documented API: it queues toasts
through a manager and closes them on its own timer, where a Snackbar is one controlled `open`
whose onClose only asks, with a reason (timeout, clickaway, escapeKeyDown, closeButton).

The root is the live region, role="status" (aria-live="polite") or "alert", with the ref. It
stays mounted while closed, so it exists before a message lands in it, and it provides
FeedbackLiveContext, so a hosted Alert drops its own role and is announced once. While a modal
hides the rest of the page from assistive tech it leaves aria-live regions exposed, so a status
snackbar stays usable over a Dialog.

Open content renders visible in the server HTML: Slide is the transition adapter's, which starts
entered on the server and while hydrating (docs/deviations.md, entry 9). In place, an open
snackbar is in the page before its script runs; through the portal, the root arrives once the
page has hydrated, as Portal's children do.
*/
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { ownerDocument, ownerWindow } from "../../internal/dom.js";
import { FeedbackLiveContext } from "../../internal/feedback-live.js";
import { useEventCallback, useForkRef } from "../../internal/hooks.js";
import { ClickAwayListener } from "../ClickAwayListener/index.js";
import { Icon } from "../Icon/index.js";
import { Portal } from "../Portal/index.js";
import { Slide } from "../Transitions/index.js";

export type SnackbarCloseReason =
	"timeout" | "clickaway" | "escapeKeyDown" | "closeButton";

export type SnackbarOrigin = {
	/**
	The edge it sits on and slides in from.
	*/
	vertical: "top" | "bottom";
	/**
	Where along that edge.
	*/
	horizontal: "left" | "center" | "right";
};

export type SnackbarProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children" | "onClose"
> & {
	/**
	Show the snackbar.
	*/
	open: boolean;
	/**
	Called with the reason: timeout, clickaway, escapeKeyDown or closeButton. You decide whether to close.
	*/
	onClose?: (
		event: React.SyntheticEvent | Event | null,
		reason: SnackbarCloseReason,
	) => void;
	/**
	The message: one short sentence.
	*/
	message?: React.ReactNode;
	/**
	One action after the message, usually a text Button at size sm ("Undo", "View").
	*/
	action?: React.ReactNode;
	/**
	Add a close icon button after the action; it calls onClose with "closeButton".
	*/
	closable?: boolean;
	/**
	Accessible name (and tooltip) of the close button. Default "Close".
	*/
	closeText?: string;
	/**
	The edge and position. Default bottom center.
	*/
	anchorOrigin?: SnackbarOrigin;
	/**
	Close after this many ms (reason "timeout"); null keeps it open. Paused while pointed at, focused, or the window is in the background.
	*/
	autoHideDuration?: number | null;
	/**
	Time left after a pause ends. Default half of autoHideDuration.
	*/
	resumeHideDuration?: number;
	/**
	Keep the timer running while the window is in the background.
	*/
	disableWindowBlurListener?: boolean;
	/**
	Slide timing in ms, or { enter, exit }. Default 280 in, 220 out.
	*/
	transitionDuration?: number | { enter?: number; exit?: number };
	/**
	Render in place (inside a showcase Stage) instead of in document.body.
	*/
	disablePortal?: boolean;
	/**
	Where the portal mounts. Default document.body.
	*/
	container?: Element | (() => Element | null) | null;
	/**
	Replace the ink surface with your own element, e.g. an Alert. message, action and closable are then ignored.
	*/
	children?: React.ReactElement;
};

const defaultOrigin: SnackbarOrigin = {
	vertical: "bottom",
	horizontal: "center",
};

/**
What pauses the timer: the pointer on it, focus in it, the window in the background.
*/
type Hold = "pointer" | "focus" | "window";

/**
A brief message at the edge of the screen: the ink pill's ground and lift, sliding
in from its edge, read politely, closing itself after a pause-aware timeout.
*/
export function Snackbar({
	open,
	onClose,
	message,
	action,
	closable = false,
	closeText = "Close",
	anchorOrigin = defaultOrigin,
	autoHideDuration = null,
	resumeHideDuration,
	disableWindowBlurListener = false,
	transitionDuration,
	disablePortal = false,
	container,
	role = "status",
	className,
	children,
	ref,
	...rest
}: SnackbarProps & { readonly ref?: React.Ref<HTMLDivElement> }) {
	const vertical = anchorOrigin.vertical === "top" ? "top" : "bottom";
	const horizontal = anchorOrigin.horizontal ?? "center";
	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const handleRef = useForkRef(rootRef, ref);
	const close = useEventCallback(
		(event: React.SyntheticEvent | Event | null, reason: SnackbarCloseReason) => {
			onClose?.(event, reason);
		},
	);

	// The content stays until the slide out has finished.
	const [hasExited, setHasExited] = React.useState(!open);
	if (open && hasExited) {
		setHasExited(false);
	}

	const isMounted = open || !hasExited;

	// Auto-hide. Each hold stops the clock; the last release restarts it with the time left.
	const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const holdsRef = React.useRef(new Set<Hold>());
	const hasTimeout = autoHideDuration !== null && autoHideDuration !== undefined;
	const clear = useEventCallback(() => {
		clearTimeout(timerRef.current);
		timerRef.current = undefined;
	});
	const arm = useEventCallback((delay: number) => {
		clear();
		if (!open || !hasTimeout || holdsRef.current.size > 0) {
			return;
		}

		timerRef.current = setTimeout(() => {
			timerRef.current = undefined;
			close(null, "timeout");
		}, delay);
	});
	const hold = useEventCallback((why: Hold) => {
		holdsRef.current.add(why);
		clear();
	});
	const release = useEventCallback((why: Hold) => {
		if (!holdsRef.current.delete(why) || holdsRef.current.size > 0) {
			return;
		}

		if (open && hasTimeout) {
			arm(resumeHideDuration ?? autoHideDuration / 2);
		}
	});

	React.useEffect(() => {
		if (!open) {
			holdsRef.current.clear();
			return undefined;
		}

		if (autoHideDuration !== null && autoHideDuration !== undefined) {
			arm(autoHideDuration);
		}

		return clear;
	}, [open, autoHideDuration, arm, clear]);

	React.useEffect(() => {
		if (!open || disableWindowBlurListener) {
			return undefined;
		}

		const view = ownerWindow(rootRef.current);
		const handleBlur = () => {
			hold("window");
		};

		const handleFocus = () => {
			release("window");
		};

		view.addEventListener("blur", handleBlur);
		view.addEventListener("focus", handleFocus);
		return () => {
			view.removeEventListener("blur", handleBlur);
			view.removeEventListener("focus", handleFocus);
		};
	}, [open, disableWindowBlurListener, hold, release]);

	React.useEffect(() => {
		if (!open) {
			return undefined;
		}

		const document_ = ownerDocument(rootRef.current);
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape" || event.defaultPrevented) {
				return;
			}

			// One Escape closes one layer: while focus is in an open modal, that modal takes it.
			const modal = document_.activeElement?.closest(".gl-modal[data-open]");
			if (modal && !modal.contains(rootRef.current)) {
				return;
			}

			close(event, "escapeKeyDown");
		}

		document_.addEventListener("keydown", handleKeyDown);
		return () => {
			document_.removeEventListener("keydown", handleKeyDown);
		};
	}, [open, close]);

	const hasAction = action !== undefined && action !== null && action !== false;
	const surface = children ?? (
		<div className="gl-snackbar-surface">
			<div className="gl-snackbar-message">{message}</div>
			{hasAction || closable ? (
				<div className="gl-snackbar-action">
					{action}
					{closable ? (
						<button
							type="button"
							className="gl-snackbar-close"
							aria-label={closeText}
							title={closeText}
							onClick={(event) => {
								close(event, "closeButton");
							}}
						>
							<Icon name="close" size={16} />
						</button>
					) : null}
				</div>
			) : null}
		</div>
	);

	return (
		<Portal container={container} disablePortal={disablePortal}>
			<div
				ref={handleRef}
				role={role}
				aria-live={role === "alert" ? undefined : "polite"}
				data-gl-live=""
				className={cx(
					"gl-snackbar",
					`gl-snackbar-${vertical}`,
					`gl-snackbar-${horizontal}`,
					className,
				)}
				{...rest}
			>
				<FeedbackLiveContext value>
					{isMounted ? (
						<ClickAwayListener
							onClickAway={(event) => {
								if (open) {
									close(event, "clickaway");
								}
							}}
						>
							<Slide
								appear
								in={open}
								direction={vertical === "top" ? "down" : "up"}
								timeout={transitionDuration}
								onExited={() => {
									setHasExited(true);
								}}
							>
								<div
									className="gl-snackbar-slot"
									onMouseEnter={() => {
										hold("pointer");
									}}
									onMouseLeave={() => {
										release("pointer");
									}}
									onFocus={() => {
										hold("focus");
									}}
									onBlur={(event) => {
										if (!event.currentTarget.contains(event.relatedTarget)) {
											release("focus");
										}
									}}
								>
									{surface}
								</div>
							</Slide>
						</ClickAwayListener>
					) : null}
				</FeedbackLiveContext>
			</div>
		</Portal>
	);
}
