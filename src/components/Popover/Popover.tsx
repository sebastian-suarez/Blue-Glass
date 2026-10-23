"use client";
import { Popover as BasePopover } from "@base-ui/react/popover";
import * as React from "react";
import type { AnchorEl, Placement } from "../../internal/anchor.js";
import { cx } from "../../internal/cx.js";
import { getFocusable } from "../../internal/dom.js";
import {
	documentedEvent,
	type ModalCloseReason,
	modalCloseReason,
} from "../../internal/events.js";
import { useEventCallback, useForkRef } from "../../internal/hooks.js";
import { usePopupLayer } from "../../internal/popup-layer.js";
import { Grow } from "../Transitions/Transitions.js";

export type PopoverProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"children"
> & {
	open: boolean;
	anchorEl: AnchorEl;
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: ModalCloseReason,
	) => void;
	placement?: Placement;
	offset?: number;
	matchWidth?: boolean;
	padding?: "none" | "sm" | "md";
	keepMounted?: boolean;
	disableAutoFocus?: boolean;
	disableRestoreFocus?: boolean;
	disableEnforceFocus?: boolean;
	disableScrollLock?: boolean;
	disablePortal?: boolean;
	container?: Element | (() => Element | null) | null;
	transitionDuration?: number | { enter?: number; exit?: number };
	children?: React.ReactNode;
};

function initialFocusTarget(surface: HTMLDivElement): HTMLElement {
	return (
		surface.querySelector<HTMLElement>("[data-autofocus], [autofocus]") ??
		surface
	);
}

function stayPut(): undefined {
	return undefined;
}

function returnTarget(surface: HTMLDivElement): HTMLElement {
	return getFocusable(surface)[0] ?? surface;
}

export function Popover({
	open,
	anchorEl,
	onClose,
	placement = "bottom-start",
	offset = 8,
	matchWidth = false,
	padding = "md",
	keepMounted = false,
	disableAutoFocus,
	disableRestoreFocus,
	disableEnforceFocus,
	disableScrollLock,
	disablePortal = false,
	container,
	transitionDuration,
	className,
	style,
	role,
	onFocus,
	onKeyDown,
	children,
	ref,
	...rest
}: PopoverProps & { ref?: React.Ref<HTMLDivElement> }) {
	const layer = usePopupLayer({
		open,
		anchorEl,
		placement,
		offset,
		matchWidth,
		keepMounted,
		disablePortal,
		container,
		disableAutoFocus,
		disableRestoreFocus,
		disableEnforceFocus,
		disableScrollLock,
		onBackdropClick(event) {
			onClose?.(event, "backdropClick");
		},
		getInitialFocusTarget:
			disableAutoFocus === true ? stayPut : initialFocusTarget,
		getReturnTarget: returnTarget,
	});
	const handleRef = useForkRef(layer.surfaceRef, ref);

	const handleOpenChange = useEventCallback(
		(isOpen: boolean, details: BasePopover.Root.ChangeEventDetails) => {
			details.cancel();
			const reason = isOpen ? undefined : modalCloseReason(details.reason);
			if (reason === "escapeKeyDown" && layer.isReporting()) {
				details.event.preventDefault();
				onClose?.(
					documentedEvent(details.event, layer.surfaceRef.current ?? undefined),
					reason,
				);
				return;
			}

			details.allowPropagation();
		},
	);

	return (
		<>
			{layer.host}
			<BasePopover.Root open={layer.isPresent} onOpenChange={handleOpenChange}>
				<BasePopover.Portal {...layer.portalProps}>
					<BasePopover.Backdrop {...layer.backdropProps} />
					<BasePopover.Positioner {...layer.positionerProps}>
						<Grow {...layer.transitionProps} timeout={transitionDuration}>
							<BasePopover.Popup
								ref={handleRef}
								role={role}
								className={cx(
									"gl-popover",
									`gl-popover-pad-${padding}`,
									className,
								)}
								style={{ ...layer.surfaceStyle, ...style }}
								initialFocus={false}
								finalFocus={false}
								onFocus={(event) => {
									onFocus?.(event);
									layer.markInside(event);
								}}
								onKeyDown={(event) => {
									onKeyDown?.(event);
									layer.trapTab(event);
								}}
								{...rest}
							>
								{children}
							</BasePopover.Popup>
						</Grow>
					</BasePopover.Positioner>
				</BasePopover.Portal>
			</BasePopover.Root>
		</>
	);
}
