"use client";
import type * as React from "react";
import type { ModalCloseReason } from "../../internal/events.js";
import { ModalLayer } from "../../internal/modal.js";
import type { BackdropProps } from "../Backdrop/Backdrop.js";

export type { ModalCloseReason } from "../../internal/events.js";

export type ModalProps = {
	open: boolean;
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: ModalCloseReason,
	) => void;
	children: React.ReactElement;
	keepMounted?: boolean;
	hideBackdrop?: boolean;
	invisibleBackdrop?: boolean;
	disableEscapeKeyDown?: boolean;
	disableAutoFocus?: boolean;
	disableEnforceFocus?: boolean;
	disableRestoreFocus?: boolean;
	disableScrollLock?: boolean;
	disablePortal?: boolean;
	container?: Element | (() => Element | null) | null;
	BackdropProps?: Partial<BackdropProps>;
	className?: string;
	style?: React.CSSProperties;
	zIndex?: string | number;
};

export function Modal(props: ModalProps & { ref?: React.Ref<HTMLDivElement> }) {
	return <ModalLayer {...props} />;
}
