"use client";
/**
Dialog and its parts, ported from design-system/components/Dialog/reference.tsx onto the
modal-flags adapter, `ModalLayer` in src/internal/modal.tsx, as Modal is: Base UI's Dialog through
the portal, and in place (`disablePortal`) the layer's own elements, so an open dialog shows in the
server HTML. Deviations 7 and 8 (docs/deviations.md) apply, as for Modal.

As in the reference, a Transition keeps the layer mounted through the exit while Grow runs on the
surface itself (opacity on an ancestor would cut the glass off from what it blurs), and the
centring layer around the surface takes every press outside it: one that starts and ends there
reports `backdropClick`, with or without a scrim. While focus is kept in, that press leaves focus
where it was, as a press on Modal's backdrop does.

DialogTitle and DialogContentText register their ids with the dialog once mounted, and the
surface's aria-labelledby and aria-describedby point at them.
*/
import * as React from "react";
import { cx } from "../../internal/cx.js";
import type { ModalCloseReason } from "../../internal/events.js";
import {
	useEventCallback,
	useForkRef,
	useId,
	useIsoLayoutEffect,
} from "../../internal/hooks.js";
import { ModalLayer } from "../../internal/modal.js";
import { durations, getTimeout } from "../../internal/transition.js";
import type { BackdropProps } from "../Backdrop/Backdrop.js";
import { Paper, type PaperProps } from "../Paper/Paper.js";
import { Grow, Transition } from "../Transitions/Transitions.js";

export type DialogScroll = "paper" | "body";

export type DialogProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children" | "onClose"
> & {
	/**
	Show the dialog.
	*/
	open: boolean;
	/**
	Called with the reason (backdropClick or escapeKeyDown); you decide whether to close.
	*/
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: ModalCloseReason,
	) => void;
	/**
	Width cap: xs 444px, sm 600px, md 900px, or false for none. Default sm.
	*/
	maxWidth?: "xs" | "sm" | "md" | false;
	/**
	Take the whole maxWidth (less the side margins) instead of fitting the content.
	*/
	fullWidth?: boolean;
	/**
	Fill the viewport with square corners. "phone" does it only at 700px and below.
	*/
	fullScreen?: boolean | "phone";
	/**
	paper: the content scrolls between a fixed title and actions, fading at its edges (default). body: the whole dialog scrolls in its layer.
	*/
	scroll?: DialogScroll;
	/**
	Grow timing in ms, or { enter, exit }. Default 200 in, 140 out.
	*/
	transitionDuration?: number | { enter?: number; exit?: number };
	/**
	Extra props for the glass surface, the element with role="dialog".
	*/
	PaperProps?: Partial<PaperProps>;
	/**
	Stay in the DOM while closed.
	*/
	keepMounted?: boolean;
	/**
	No scrim: the page stays undimmed (a press outside still closes).
	*/
	hideBackdrop?: boolean;
	/**
	Props for the scrim (Backdrop).
	*/
	BackdropProps?: Partial<BackdropProps>;
	/**
	Escape does nothing. Keep it on unless leaving would lose work.
	*/
	disableEscapeKeyDown?: boolean;
	/**
	Don't move focus into the dialog on open.
	*/
	disableAutoFocus?: boolean;
	/**
	Let focus leave the dialog while it's open.
	*/
	disableEnforceFocus?: boolean;
	/**
	Don't return focus to the opener on close.
	*/
	disableRestoreFocus?: boolean;
	/**
	Leave the page scrollable underneath.
	*/
	disableScrollLock?: boolean;
	/**
	Render in place (inside a showcase Stage) instead of in document.body.
	*/
	disablePortal?: boolean;
	/**
	Where the portal mounts. Default document.body.
	*/
	container?: Element | (() => Element | null) | null;
	/**
	DialogTitle, DialogContent and DialogActions.
	*/
	children?: React.ReactNode;
};

export type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
	/**
	The dialog's name: a question or a verb phrase ("Delete the RS50 bridge draft?").
	*/
	children?: React.ReactNode;
};

export type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	Hairlines (color-line) above and below, for long content between the title and the actions.
	*/
	dividers?: boolean;
	/**
	Body copy (DialogContentText), fields, lists.
	*/
	children?: React.ReactNode;
};

export type DialogContentTextProps =
	React.HTMLAttributes<HTMLParagraphElement> & {
		/**
		One or two sentences: what happens, and what stays as it is.
		*/
		children?: React.ReactNode;
	};

export type DialogActionsProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	Buttons, the primary one last.
	*/
	children?: React.ReactNode;
};

type Ids = readonly string[];

type DialogContextValue = {
	scroll: DialogScroll;
	registerTitle: (id: string) => () => void;
	registerDescription: (id: string) => () => void;
};

const DialogContext = React.createContext<DialogContextValue | undefined>(
	undefined,
);

/**
Adds an id to a list while its part is mounted, and removes it after.
*/
function register(setIds: React.Dispatch<React.SetStateAction<Ids>>) {
	return (id: string) => {
		setIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
		return () => {
			setIds((ids) => ids.filter((other) => other !== id));
		};
	};
}

const screens = {
	full: "fullscreen",
	phone: "fullscreen-phone",
} as const;

/**
A modal task on a glass panel: Modal underneath (scrim, focus kept in, Escape, scroll lock, the
rest of the page hidden from assistive tech), Grow from the centre, title and description wired
to the surface's aria-labelledby and aria-describedby.
*/
export function Dialog({
	ref,
	...props
}: DialogProps & { ref?: React.Ref<HTMLDivElement> }) {
	const {
		open,
		onClose,
		maxWidth = "sm",
		fullWidth = false,
		fullScreen = false,
		scroll = "paper",
		transitionDuration,
		PaperProps: paperProps,
		keepMounted,
		hideBackdrop,
		BackdropProps: backdropProps,
		disableEscapeKeyDown,
		disableAutoFocus,
		disableEnforceFocus,
		disableRestoreFocus,
		disableScrollLock,
		disablePortal,
		container,
		className,
		style,
		role = "dialog",
		children,
		"aria-labelledby": labelledBy,
		"aria-describedby": describedBy,
		...rest
	} = props;

	const [titleIds, setTitleIds] = React.useState<Ids>([]);
	const [descriptionIds, setDescriptionIds] = React.useState<Ids>([]);
	const context = React.useMemo<DialogContextValue>(
		() => ({
			scroll,
			registerTitle: register(setTitleIds),
			registerDescription: register(setDescriptionIds),
		}),
		[scroll],
	);

	// A press that starts and ends on the layer around the surface is a press on the scrim.
	const pressedRef = React.useRef(false);
	const timeout = {
		enter: getTimeout(transitionDuration, "enter", durations.grow.enter),
		exit: getTimeout(transitionDuration, "exit", durations.grow.exit),
	};
	const screen =
		fullScreen === true
			? screens.full
			: fullScreen === "phone"
				? screens.phone
				: undefined;
	const isNamed =
		labelledBy !== undefined || rest["aria-label"] !== undefined;

	return (
		<ModalLayer
			ref={ref}
			open={open}
			keepMounted={keepMounted}
			hideBackdrop={hideBackdrop}
			BackdropProps={backdropProps}
			disableEscapeKeyDown={disableEscapeKeyDown}
			disableAutoFocus={disableAutoFocus}
			disableEnforceFocus={disableEnforceFocus}
			disableRestoreFocus={disableRestoreFocus}
			disableScrollLock={disableScrollLock}
			disablePortal={disablePortal}
			container={container}
			className={cx("gl-dialog", className)}
			style={style}
			onClose={onClose}
		>
			<Transition timeout={timeout}>
				{(status, surfaceRef) => (
					<div
						role="presentation"
						className={cx(
							"gl-dialog-container",
							`gl-dialog-scroll-${scroll}`,
							screen && `gl-dialog-container-${screen}`,
						)}
						data-transition={status}
						onMouseDown={(event) => {
							pressedRef.current = event.target === event.currentTarget;
							if (pressedRef.current && disableEnforceFocus !== true) {
								event.preventDefault();
							}
						}}
						onClick={(event) => {
							if (pressedRef.current && event.target === event.currentTarget) {
								onClose?.(event, "backdropClick");
							}

							pressedRef.current = false;
						}}
					>
						<Grow in={open} origin="center" timeout={timeout}>
							<Paper
								ref={surfaceRef}
								role={role}
								aria-modal="true"
								aria-labelledby={labelledBy ?? (isNamed ? undefined : titleIds[0])}
								aria-describedby={
									describedBy ??
									(descriptionIds.length > 0
										? descriptionIds.join(" ")
										: undefined)
								}
								tabIndex={-1}
								{...paperProps}
								{...rest}
								radius={
									screen === screens.full ? "none" : (paperProps?.radius ?? "panel")
								}
								className={cx(
									"gl-dialog-paper",
									maxWidth !== false && `gl-dialog-paper-${maxWidth}`,
									fullWidth && "gl-dialog-paper-full-width",
									screen && `gl-dialog-paper-${screen}`,
									paperProps?.className,
								)}
							>
								<DialogContext value={context}>{children}</DialogContext>
							</Paper>
						</Grow>
					</div>
				)}
			</Transition>
		</ModalLayer>
	);
}

/**
The dialog's name in text-title-sm, wired to the surface's aria-labelledby.
*/
export function DialogTitle({
	id: idProp,
	className,
	children,
	ref,
	...rest
}: DialogTitleProps & { ref?: React.Ref<HTMLHeadingElement> }) {
	const id = useId(idProp);
	const context = React.useContext(DialogContext);
	useIsoLayoutEffect(() => context?.registerTitle(id), [context, id]);
	return (
		<h2
			ref={ref}
			id={id}
			className={cx("gl-dialog-title", className)}
			{...rest}
		>
			{children}
		</h2>
	);
}

type Edges = { top: boolean; bottom: boolean };

/**
The dialog's body, which with scroll="paper" scrolls on its own and fades at whichever edge has
more.
*/
export function DialogContent({
	dividers = false,
	className,
	children,
	onScroll,
	ref,
	...rest
}: DialogContentProps & { ref?: React.Ref<HTMLDivElement> }) {
	const context = React.useContext(DialogContext);
	const isScrolling = (context?.scroll ?? "paper") === "paper";
	const nodeRef = React.useRef<HTMLDivElement | null>(null);
	const handleRef = useForkRef(nodeRef, ref);
	const [edges, setEdges] = React.useState<Edges>({
		top: false,
		bottom: false,
	});

	const measure = useEventCallback(() => {
		const element = nodeRef.current;
		const top = element !== null && isScrolling && element.scrollTop > 1;
		const bottom =
			element !== null &&
			isScrolling &&
			element.scrollTop + element.clientHeight < element.scrollHeight - 1;
		setEdges((previous) =>
			previous.top === top && previous.bottom === bottom
				? previous
				: { top, bottom },
		);
	});

	useIsoLayoutEffect(() => {
		measure();
	});
	// Measure again when the box or anything in it changes size: a textarea growing, an image
	// loading. It runs after every render, so children added since are observed too.
	React.useEffect(() => {
		const element = nodeRef.current;
		if (!element || !isScrolling || typeof ResizeObserver === "undefined") {
			return undefined;
		}

		const observer = new ResizeObserver(() => {
			measure();
		});
		observer.observe(element);
		for (const child of element.children) {
			observer.observe(child);
		}

		return () => {
			observer.disconnect();
		};
	});

	const isOverflowing = edges.top || edges.bottom;
	return (
		<div
			ref={handleRef}
			className={cx(
				"gl-dialog-content",
				dividers && "gl-dialog-content-dividers",
				className,
			)}
			data-fade-top={edges.top ? "" : undefined}
			data-fade-bottom={edges.bottom ? "" : undefined}
			// A scrolling region with nothing focusable in it still has to be reachable by keyboard.
			// eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
			tabIndex={isOverflowing ? 0 : undefined}
			onScroll={(event) => {
				measure();
				onScroll?.(event);
			}}
			{...rest}
		>
			{children}
		</div>
	);
}

/**
Body copy in color-muted (text-body-sm), wired to the surface's aria-describedby.
*/
export function DialogContentText({
	id: idProp,
	className,
	children,
	ref,
	...rest
}: DialogContentTextProps & { ref?: React.Ref<HTMLParagraphElement> }) {
	const id = useId(idProp);
	const context = React.useContext(DialogContext);
	useIsoLayoutEffect(() => context?.registerDescription(id), [context, id]);
	return (
		<p
			ref={ref}
			id={id}
			className={cx("gl-dialog-content-text", className)}
			{...rest}
		>
			{children}
		</p>
	);
}

/**
The button row: right-aligned, space-sm apart, the primary action last.
*/
export function DialogActions({
	className,
	children,
	ref,
	...rest
}: DialogActionsProps & { ref?: React.Ref<HTMLDivElement> }) {
	return (
		<div ref={ref} className={cx("gl-dialog-actions", className)} {...rest}>
			{children}
		</div>
	);
}
