"use client";
/**
Popover, ported from design-system/components/Popover/reference.tsx onto Base UI's Popover, with
`anchorEl` mapped to Base UI's `anchor` (src/internal/anchor.ts).

The reference puts a Grow-wrapped surface on its Modal with an invisible backdrop. Here Base UI's
Popover places the surface (flip and shift as the reference's computePosition, matchWidth,
--transform-origin for Grow) and reports Escape, and src/internal/popup-layer.tsx gives it the
reference's transparent modal layer, which Base UI's Popover has only with a Close part inside
the popup: the backdrop that takes every outside press (backdropClick), Tab kept in the surface,
focus pulled back when it leaves, the page hidden from assistive tech and its scroll locked, focus
returned to where it was. Modal's flags turn each off, as they do on Modal; docs/deviations.md's
entry 7 applies: the rest of the page is `aria-hidden`, not `inert`.

Focus moves in to the `[data-autofocus]` or `[autofocus]` element, else the surface. The surface
takes `role` only from the caller (Base UI's default `dialog` would leave an unnamed dialog).
*/
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
	/**
	The element the surface grows from.
	*/
	anchorEl: AnchorEl;
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: ModalCloseReason,
	) => void;
	/**
	Preferred side and alignment. Default "bottom-start".
	*/
	placement?: Placement;
	/**
	Gap to the anchor in px. Default 8.
	*/
	offset?: number;
	/**
	At least as wide as the anchor (selects).
	*/
	matchWidth?: boolean;
	/**
	Surface padding: "none" for lists that pad themselves. Default "md".
	*/
	padding?: "none" | "sm" | "md";
	keepMounted?: boolean;
	disableAutoFocus?: boolean;
	disableRestoreFocus?: boolean;
	disableEnforceFocus?: boolean;
	disableScrollLock?: boolean;
	/**
	Render in place (inside a showcase stage) instead of in document.body.
	*/
	disablePortal?: boolean;
	container?: Element | (() => Element | null) | null;
	/**
	Transition timing in ms.
	*/
	transitionDuration?: number | { enter?: number; exit?: number };
	children?: React.ReactNode;
};

/**
Where focus goes as it opens: the marked element, else the surface.
*/
function initialFocusTarget(surface: HTMLElement | null): HTMLElement | true {
	return (
		surface?.querySelector<HTMLElement>("[data-autofocus], [autofocus]") ??
		surface ??
		true
	);
}

/**
Where focus that left comes back to: the first item, else the surface, as in the reference.
*/
function returnTarget(surface: HTMLDivElement): HTMLElement {
	return getFocusable(surface)[0] ?? surface;
}

/**
A glass surface anchored to an element, on a transparent modal layer: click
outside or Escape closes it, focus moves in and returns to the anchor. The
base of Menu and Select.
*/
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
		getReturnTarget: returnTarget,
	});
	const handleRef = useForkRef(layer.surfaceRef, ref);

	// `open` stays controlled: every change Base UI asks for is cancelled, and Escape is reported
	// here. Its outside press is the backdrop's to report.
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
								// The caller's role only: Base UI's default dialog would be unnamed.
								role={role}
								className={cx(
									"gl-popover",
									`gl-popover-pad-${padding}`,
									className,
								)}
								style={{ ...layer.surfaceStyle, ...style }}
								initialFocus={
									layer.behaviour.shouldAutoFocus
										? () => initialFocusTarget(layer.surfaceRef.current)
										: false
								}
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
