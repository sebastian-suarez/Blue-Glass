"use client";
/**
Modal, ported from design-system/components/Modal/reference.tsx onto the modal-flags adapter,
`ModalLayer` in src/internal/modal.tsx, which runs it on Base UI's Dialog. Its module comment maps
each documented flag to what does it; in short:

- Through the portal (the default), Base UI's Dialog portals the layer into body, traps Tab and
  hides the rest of the page from assistive tech. With `disablePortal` the layer renders in place,
  so its server HTML holds an open modal, and hydration adopts it.
- Focus moves in (to `[data-autofocus]`, else the surface) and is kept in, Escape and a press on
  the backdrop report through `onClose`, the page's scroll is locked, and focus goes back to the
  opener on close. Each flag turns one of these off on its own.
- Open modals stack: only the top one reports Escape and backdrop presses.
- A transition child (Fade, Grow, Slide) gets `in` and `appear`, and the layer stays until its exit
  has run. The backdrop is the Backdrop component, which fades with the layer.

Two entries of docs/deviations.md apply: while focus is kept in, the rest of the page is
`aria-hidden`, never `inert` (7), and a Modal opened inside another renders inside that one's
portal (8).
*/
import type * as React from "react";
import type { ModalCloseReason } from "../../internal/events.js";
import { ModalLayer } from "../../internal/modal.js";
import type { BackdropProps } from "../Backdrop/Backdrop.js";

export type { ModalCloseReason } from "../../internal/events.js";

export type ModalProps = {
	open: boolean;
	/**
	Called with the reason; the parent decides whether to close.
	*/
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: ModalCloseReason,
	) => void;
	/**
	One element: usually a transition (Fade, Grow, Slide) wrapping the surface.
	*/
	children: React.ReactElement;
	/**
	Keep the content mounted while closed.
	*/
	keepMounted?: boolean;
	/**
	No backdrop at all (the page behind stays visible and clickable outside the content).
	*/
	hideBackdrop?: boolean;
	/**
	A transparent backdrop that still catches outside clicks (popovers, menus).
	*/
	invisibleBackdrop?: boolean;
	disableEscapeKeyDown?: boolean;
	/**
	Don't move focus into the content on open.
	*/
	disableAutoFocus?: boolean;
	/**
	Let focus leave the content while open.
	*/
	disableEnforceFocus?: boolean;
	/**
	Don't return focus to the opener on close.
	*/
	disableRestoreFocus?: boolean;
	disableScrollLock?: boolean;
	disablePortal?: boolean;
	container?: Element | (() => Element | null) | null;
	BackdropProps?: Partial<BackdropProps>;
	className?: string;
	style?: React.CSSProperties;
	/**
	z-index; default the z-modal token.
	*/
	zIndex?: string | number;
};

/**
The base of Dialog, Drawer, Popover and Menu: a portal layer with a backdrop, focus moved in and
kept in, Escape to close, page scroll locked and the rest of the page hidden from assistive tech.
Waits for the child's exit transition before unmounting.
*/
export function Modal(props: ModalProps & { ref?: React.Ref<HTMLDivElement> }) {
	return <ModalLayer {...props} />;
}
