"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import type { DrawerCloseReason } from "../../internal/events.js";
import {
	useEventCallback,
	useId,
	useIsoLayoutEffect,
	useShouldReduceMotion,
} from "../../internal/hooks.js";
import { ModalLayer } from "../../internal/modal.js";
import { Icon } from "../Icon/Icon.js";
import { Paper } from "../Paper/Paper.js";
import { Slide, type SlideDirection } from "../Transitions/Transitions.js";

export type { DrawerCloseReason } from "../../internal/events.js";

export type DrawerAnchor = "left" | "right" | "top" | "bottom";

export type DrawerProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"title"
> & {
	open?: boolean;
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: DrawerCloseReason,
	) => void;
	anchor?: DrawerAnchor;
	variant?: "temporary" | "persistent" | "permanent";
	inset?: boolean;
	width?: number | string;
	title?: React.ReactNode;
	closeLabel?: string;
	hideBackdrop?: boolean;
	keepMounted?: boolean;
	disablePortal?: boolean;
	disableScrollLock?: boolean;
	disableAutoFocus?: boolean;
	disableEnforceFocus?: boolean;
	disableRestoreFocus?: boolean;
	disableEscapeKeyDown?: boolean;
	container?: Element | (() => Element | null) | null;
	transitionDuration?: number | { enter?: number; exit?: number };
	PaperProps?: React.HTMLAttributes<HTMLElement>;
	children?: React.ReactNode;
};

const slideFrom: Record<DrawerAnchor, SlideDirection> = {
	left: "right",
	right: "left",
	top: "down",
	bottom: "up",
};

type Drag = {
	id: number;
	y0: number;
	dy: number;
	previousDy: number;
	previousTime: number;
	time: number;
};

type HandleEvents = Pick<
	React.DOMAttributes<HTMLDivElement>,
	"onPointerDown" | "onPointerMove" | "onPointerUp" | "onPointerCancel"
>;

function useSheetDrag(
	paperRef: React.RefObject<HTMLElement | null>,
	{
		isOpen,
		isEnabled,
		onSwipe,
	}: {
		readonly isOpen: boolean;
		readonly isEnabled: boolean;
		readonly onSwipe: (event: React.PointerEvent<HTMLDivElement>) => void;
	},
): HandleEvents {
	const shouldReduceMotion = useShouldReduceMotion();
	const dragRef = React.useRef<Drag | null>(null);
	const isOpenNow = useEventCallback(() => isOpen);
	const offset = useEventCallback((dy: number, shouldSettle: boolean) => {
		const paper = paperRef.current;
		if (!paper) {
			return;
		}

		paper.style.transition =
			shouldSettle && !shouldReduceMotion
				? "transform var(--duration-surface) var(--ease-out-quint)"
				: "none";
		paper.style.transform = dy === 0 ? "" : `translate3d(0, ${dy}px, 0)`;
	});

	useIsoLayoutEffect(() => {
		if (isOpen) {
			offset(0, false);
		}
	}, [isOpen, offset]);

	const end = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		if (drag?.id !== event.pointerId) {
			return;
		}

		dragRef.current = null;
		const height = paperRef.current?.offsetHeight ?? 1;
		const velocity =
			(drag.dy - drag.previousDy) / Math.max(1, drag.time - drag.previousTime);
		if (
			event.type === "pointerup" &&
			drag.dy > 0 &&
			(drag.dy > Math.min(120, height * 0.3) || velocity > 0.5)
		) {
			onSwipe(event);
			requestAnimationFrame(() => {
				if (isOpenNow()) {
					offset(0, true);
				}
			});
		} else {
			offset(0, true);
		}
	};

	return {
		onPointerDown(event) {
			if (!isEnabled || (event.pointerType === "mouse" && event.button !== 0)) {
				return;
			}

			event.currentTarget.setPointerCapture(event.pointerId);
			dragRef.current = {
				id: event.pointerId,
				y0: event.clientY,
				dy: 0,
				previousDy: 0,
				previousTime: event.timeStamp,
				time: event.timeStamp,
			};
		},
		onPointerMove(event) {
			const drag = dragRef.current;
			if (drag?.id !== event.pointerId) {
				return;
			}

			const raw = event.clientY - drag.y0;
			drag.previousDy = drag.dy;
			drag.previousTime = drag.time;
			drag.dy = raw > 0 ? raw : raw / 4;
			drag.time = event.timeStamp;
			offset(drag.dy, false);
		},
		onPointerUp: end,
		onPointerCancel: end,
	};
}

export function Drawer({
	ref,
	...props
}: DrawerProps & { ref?: React.Ref<HTMLDivElement> }) {
	const {
		open = false,
		onClose,
		anchor = "left",
		variant = "temporary",
		inset = true,
		width = 320,
		title,
		closeLabel = "Close",
		hideBackdrop,
		keepMounted,
		disablePortal,
		disableScrollLock,
		disableAutoFocus,
		disableEnforceFocus,
		disableRestoreFocus,
		disableEscapeKeyDown,
		container,
		transitionDuration,
		PaperProps: paperProps,
		className,
		style,
		role,
		children,
		...rest
	} = props;
	const titleId = useId();
	const paperRef = React.useRef<HTMLElement | null>(null);
	const isShown = variant === "permanent" || open;
	const canClose = variant !== "permanent" && onClose !== undefined;
	const handle = useSheetDrag(paperRef, {
		isOpen: open,
		isEnabled: canClose && anchor === "bottom",
		onSwipe(event) {
			onClose?.(event, "swipe");
		},
	});

	const hasTitle = Boolean(title);
	const labelledBy = props["aria-labelledby"];
	const named =
		hasTitle && (labelledBy ?? "") === "" && (props["aria-label"] ?? "") === ""
			? titleId
			: labelledBy;
	const header =
		hasTitle || canClose ? (
			<div className="gl-drawer-header">
				{hasTitle ? (
					<h2 id={titleId} className="gl-drawer-title">
						{title}
					</h2>
				) : null}
				{canClose ? (
					<button
						type="button"
						className="gl-drawer-close"
						aria-label={closeLabel}
						onClick={(event) => {
							onClose?.(event, "closeButton");
						}}
					>
						<Icon name="close" size={18} />
					</button>
				) : null}
			</div>
		) : null;

	const paper = (
		<Paper
			{...paperProps}
			ref={paperRef}
			radius="panel"
			className={cx("gl-drawer-paper", paperProps?.className)}
		>
			{canClose && anchor === "bottom" ? (
				<div className="gl-drawer-handle" aria-hidden="true" {...handle}>
					<span className="gl-drawer-handle-bar" />
				</div>
			) : null}
			{header}
			<div className="gl-drawer-body">{children}</div>
		</Paper>
	);

	const rootClass = cx(
		"gl-drawer",
		`gl-drawer-${variant}`,
		`gl-drawer-${anchor}`,
		inset ? "gl-drawer-inset" : "gl-drawer-flush",
		className,
	);
	const rootStyle: React.CSSProperties & {
		"--gl-drawer-width": string | undefined;
	} = {
		"--gl-drawer-width": typeof width === "number" ? `${width}px` : width,
		...style,
	};

	if (variant === "temporary") {
		return (
			<ModalLayer
				root="drawer"
				open={open}
				hideBackdrop={hideBackdrop}
				keepMounted={keepMounted}
				disablePortal={disablePortal}
				disableScrollLock={disableScrollLock}
				disableAutoFocus={disableAutoFocus}
				disableEnforceFocus={disableEnforceFocus}
				disableRestoreFocus={disableRestoreFocus}
				disableEscapeKeyDown={disableEscapeKeyDown}
				container={container}
				zIndex="var(--z-drawer, 1200)"
				onClose={onClose}
			>
				<Slide direction={slideFrom[anchor]} timeout={transitionDuration}>
					<div
						ref={ref}
						role={role ?? "dialog"}
						aria-modal="true"
						aria-labelledby={named}
						className={rootClass}
						style={rootStyle}
						{...rest}
					>
						{paper}
					</div>
				</Slide>
			</ModalLayer>
		);
	}

	return (
		<div
			ref={ref}
			role={role}
			aria-labelledby={role === undefined || role === "" ? labelledBy : named}
			className={rootClass}
			style={rootStyle}
			data-open={isShown ? "" : undefined}
			{...rest}
		>
			{paper}
		</div>
	);
}
