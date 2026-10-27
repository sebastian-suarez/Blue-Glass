"use client";
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
	vertical: "top" | "bottom";
	horizontal: "left" | "center" | "right";
};

export type SnackbarProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children" | "onClose"
> & {
	open: boolean;
	onClose?: (
		event: React.SyntheticEvent | Event | null,
		reason: SnackbarCloseReason,
	) => void;
	message?: React.ReactNode;
	action?: React.ReactNode;
	closable?: boolean;
	closeText?: string;
	anchorOrigin?: SnackbarOrigin;
	autoHideDuration?: number | null;
	resumeHideDuration?: number;
	disableWindowBlurListener?: boolean;
	transitionDuration?: number | { enter?: number; exit?: number };
	disablePortal?: boolean;
	container?: Element | (() => Element | null) | null;
	children?: React.ReactElement;
};

const defaultOrigin: SnackbarOrigin = {
	vertical: "bottom",
	horizontal: "center",
};

type Hold = "pointer" | "focus" | "window";

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
		(
			event: React.SyntheticEvent | Event | null,
			reason: SnackbarCloseReason,
		) => {
			onClose?.(event, reason);
		},
	);

	const [hasExited, setHasExited] = React.useState(!open);
	if (open && hasExited) {
		setHasExited(false);
	}

	const isMounted = open || !hasExited;

	const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const holdsRef = React.useRef(new Set<Hold>());
	const hasTimeout =
		autoHideDuration !== null && autoHideDuration !== undefined;
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
		const wasHeld = holdsRef.current.delete(why);
		if (!wasHeld || !open || !hasTimeout || holdsRef.current.size > 0) {
			return;
		}

		const halfDuration = autoHideDuration / 2;
		arm(resumeHideDuration ?? halfDuration);
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
				aria-live={role === "alert" ? "assertive" : "polite"}
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
