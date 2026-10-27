"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import type { ModalCloseReason } from "../../internal/events.js";
import {
	useEventCallback,
	useForkRef,
	useId,
	useIsoLayoutEffect,
} from "../../internal/hooks.js";
import { isInTopLayer, ModalLayer } from "../../internal/modal.js";
import { durations, getTimeout } from "../../internal/transition.js";
import type { BackdropProps } from "../Backdrop/Backdrop.js";
import { Paper, type PaperProps } from "../Paper/Paper.js";
import { Grow, Transition } from "../Transitions/Transitions.js";

export type DialogScroll = "paper" | "body";

export type DialogProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children" | "onClose"
> & {
	open: boolean;
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: ModalCloseReason,
	) => void;
	maxWidth?: "xs" | "sm" | "md" | false;
	fullWidth?: boolean;
	fullScreen?: boolean | "phone";
	scroll?: DialogScroll;
	transitionDuration?: number | { enter?: number; exit?: number };
	PaperProps?: Partial<PaperProps>;
	keepMounted?: boolean;
	hideBackdrop?: boolean;
	BackdropProps?: Partial<BackdropProps>;
	disableEscapeKeyDown?: boolean;
	disableAutoFocus?: boolean;
	disableEnforceFocus?: boolean;
	disableRestoreFocus?: boolean;
	disableScrollLock?: boolean;
	disablePortal?: boolean;
	container?: Element | (() => Element | null) | null;
	children?: React.ReactNode;
};

export type DialogTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
	children?: React.ReactNode;
};

export type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
	dividers?: boolean;
	children?: React.ReactNode;
};

export type DialogContentTextProps =
	React.HTMLAttributes<HTMLParagraphElement> & {
		children?: React.ReactNode;
	};

export type DialogActionsProps = React.HTMLAttributes<HTMLDivElement> & {
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

function isOnScrollbar(element: HTMLElement, event: React.MouseEvent): boolean {
	const box = element.getBoundingClientRect();
	const x = event.clientX - box.left - element.clientLeft;
	const y = event.clientY - box.top - element.clientTop;
	return (
		x < 0 || y < 0 || x >= element.clientWidth || y >= element.clientHeight
	);
}

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
	const isNamed = labelledBy !== undefined || rest["aria-label"] !== undefined;

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
							screen !== undefined && `gl-dialog-container-${screen}`,
						)}
						data-transition={status}
						onMouseDown={(event) => {
							const layer = event.currentTarget;
							pressedRef.current =
								event.target === layer && !isOnScrollbar(layer, event);
							if (disableEnforceFocus !== true && pressedRef.current) {
								event.preventDefault();
							}
						}}
						onClick={(event) => {
							if (
								pressedRef.current &&
								event.target === event.currentTarget &&
								isInTopLayer(event.currentTarget)
							) {
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
								aria-labelledby={
									labelledBy ?? (isNamed ? undefined : titleIds[0])
								}
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
									screen === screens.full
										? "none"
										: (paperProps?.radius ?? "panel")
								}
								className={cx(
									"gl-dialog-paper",
									maxWidth !== false && `gl-dialog-paper-${maxWidth}`,
									fullWidth && "gl-dialog-paper-full-width",
									screen !== undefined && `gl-dialog-paper-${screen}`,
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

export function DialogTitle({
	id: idProp,
	className,
	children,
	ref,
	...rest
}: DialogTitleProps & { ref?: React.Ref<HTMLHeadingElement> }) {
	const id = useId(idProp);
	const context = React.use(DialogContext);
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

export function DialogContent({
	dividers = false,
	className,
	children,
	onScroll,
	ref,
	...rest
}: DialogContentProps & { ref?: React.Ref<HTMLDivElement> }) {
	const context = React.use(DialogContext);
	const isScrolling = (context?.scroll ?? "paper") === "paper";
	const nodeRef = React.useRef<HTMLDivElement | null>(null);
	const handleRef = useForkRef(nodeRef, ref);
	const [edges, setEdges] = React.useState<Edges>({
		top: false,
		bottom: false,
	});

	const measure = useEventCallback(() => {
		const element = nodeRef.current;
		const hasMoreAbove =
			element !== null && isScrolling && element.scrollTop > 1;
		const hasMoreBelow =
			element !== null &&
			isScrolling &&
			element.scrollTop + element.clientHeight < element.scrollHeight - 1;
		setEdges((previous) =>
			previous.top === hasMoreAbove && previous.bottom === hasMoreBelow
				? previous
				: { top: hasMoreAbove, bottom: hasMoreBelow },
		);
	});

	useIsoLayoutEffect(() => {
		measure();
	});
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
			// eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- A scrolling region with nothing focusable in it still has to be reachable by keyboard.
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

export function DialogContentText({
	id: idProp,
	className,
	children,
	ref,
	...rest
}: DialogContentTextProps & { ref?: React.Ref<HTMLParagraphElement> }) {
	const id = useId(idProp);
	const context = React.use(DialogContext);
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
