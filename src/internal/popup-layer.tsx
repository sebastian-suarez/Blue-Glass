"use client";
import * as React from "react";
import { Backdrop } from "../components/Backdrop/Backdrop.js";
import {
	type AnchorEl,
	anchorWidthStyle,
	type Placement,
	positionerVariables,
	toPositionerProps,
	toWholePixelOffsets,
	useBaseAnchor,
} from "./anchor.js";
import { cx } from "./cx.js";
import { getFocusable, isInside } from "./dom.js";
import { useEventCallback, useForkRef } from "./hooks.js";
import {
	isTopLayer,
	type Layer,
	type ModalBehaviour,
	resolveModalBehaviour,
	useBackdropPress,
	useHidePage,
	usePortalContainer,
	useRestoreFocus,
	useScrollLock,
	useStackEntry,
} from "./modal.js";

export type PopupLayerOptions = {
	open: boolean;
	anchorEl: AnchorEl;
	placement: Placement;
	offset: number;
	matchWidth: boolean;
	keepMounted: boolean;
	disablePortal: boolean;
	container: Element | (() => Element | null) | null | undefined;
	disableAutoFocus: boolean | undefined;
	disableRestoreFocus: boolean | undefined;
	disableEnforceFocus: boolean | undefined;
	disableScrollLock: boolean | undefined;
	pageIsolation?: "aria-hidden" | "inert";
	onBackdropClick: (event: React.MouseEvent<HTMLDivElement>) => void;
	getInitialFocusTarget: (surface: HTMLDivElement) => HTMLElement | undefined;
	getReturnTarget: (surface: HTMLDivElement) => HTMLElement;
};

export type PopupLayer = {
	behaviour: ModalBehaviour;
	isPresent: boolean;
	isReporting: () => boolean;
	host: React.ReactNode;
	portalProps: {
		keepMounted: boolean;
		container: HTMLElement | null | undefined;
		ref: React.Ref<HTMLDivElement> | undefined;
		role: "presentation";
		className: string;
		style: React.CSSProperties;
		"data-open": "" | undefined;
	};
	backdropProps: {
		style: React.CSSProperties;
		onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
		onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
		render: (props: React.ComponentProps<"div">) => React.ReactElement;
	};
	positionerProps: Omit<
		ReturnType<typeof toPositionerProps>,
		"sideOffset" | "alignOffset"
	> &
		ReturnType<typeof toWholePixelOffsets> & {
			anchor: ReturnType<typeof useBaseAnchor>;
			style: React.CSSProperties;
		};
	transitionProps: {
		in: boolean;
		appear: boolean;
		onEnter: () => void;
		onExited: () => void;
	};
	surfaceRef: React.RefObject<HTMLDivElement | null>;
	surfaceStyle: React.CSSProperties;
	markInside: (event: React.FocusEvent) => void;
	restoreFocus: (element: HTMLElement) => void;
	trapTab: (event: React.KeyboardEvent<HTMLElement>) => void;
};

function keepTabInside(
	event: React.KeyboardEvent<HTMLElement>,
	surface: HTMLElement,
): void {
	if (
		event.key !== "Tab" ||
		event.defaultPrevented ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey
	) {
		return;
	}

	const items = getFocusable(surface);
	const first = items[0];
	const last = items.at(-1);
	if (first === undefined || last === undefined) {
		event.preventDefault();
		return;
	}

	const index = items.indexOf(
		surface.ownerDocument.activeElement as HTMLElement,
	);
	const isAtEdge = event.shiftKey
		? index <= 0
		: index === -1 || index === items.length - 1;
	if (!isAtEdge) {
		return;
	}

	event.preventDefault();
	(event.shiftKey ? last : first).focus();
}

function useFocusGuard(
	isActive: boolean,
	layer: Layer,
	surfaceRef: React.RefObject<HTMLDivElement | null>,
	getReturnTarget: (surface: HTMLDivElement) => HTMLElement,
): {
	markInside: (event: React.FocusEvent) => void;
	restoreFocus: (element: HTMLElement) => void;
} {
	const [insideEvents] = React.useState(() => new WeakSet<Event>());
	const restoringRef = React.useRef(false);
	const restoreFocus = useEventCallback((element: HTMLElement) => {
		restoringRef.current = true;
		try {
			element.focus({ preventScroll: true });
		} finally {
			restoringRef.current = false;
		}
	});
	const returnFocus = useEventCallback((surface: HTMLDivElement) => {
		getReturnTarget(surface).focus({ preventScroll: true });
	});
	React.useEffect(() => {
		if (!isActive) {
			return undefined;
		}

		function handleFocusIn(event: FocusEvent) {
			const root = layer.rootRef.current;
			const surface = surfaceRef.current;
			if (
				!root ||
				!surface ||
				restoringRef.current ||
				!isTopLayer(layer) ||
				insideEvents.has(event) ||
				isInside(root, event.target)
			) {
				return;
			}

			returnFocus(surface);
		}

		document.addEventListener("focusin", handleFocusIn);
		return () => {
			document.removeEventListener("focusin", handleFocusIn);
		};
	}, [isActive, layer, surfaceRef, insideEvents, returnFocus]);
	return {
		markInside(event) {
			insideEvents.add(event.nativeEvent);
		},
		restoreFocus,
	};
}

const surfaceBase: React.CSSProperties = {
	pointerEvents: "auto",
	maxHeight: "min(max(var(--available-height), 80px), 480px)",
};

const rootStyle: React.CSSProperties = {
	zIndex: "var(--z-modal, 1300)",
	pointerEvents: "none",
};

const hostStyle: React.CSSProperties = { display: "contents" };

export function usePopupLayer(options: PopupLayerOptions): PopupLayer {
	const {
		open,
		anchorEl,
		placement,
		offset,
		matchWidth,
		keepMounted,
		disablePortal,
		container,
		onBackdropClick,
		getInitialFocusTarget,
		getReturnTarget,
	} = options;
	const behaviour = resolveModalBehaviour(options);

	const [hasExited, setHasExited] = React.useState(!open);
	if (open && hasExited) {
		setHasExited(false);
	}

	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
	const handleRootRef = useForkRef(rootRef, setRoot);
	const [layer] = React.useState<Layer>(() => ({ rootRef }));
	const surfaceRef = React.useRef<HTMLDivElement | null>(null);

	const openerRef = useStackEntry(open, layer);
	useScrollLock(open && behaviour.shouldLockScroll);
	useRestoreFocus(open, behaviour.shouldRestoreFocus, openerRef);
	useHidePage(
		open && behaviour.shouldEnforceFocus && root !== null,
		layer,
		options.pageIsolation,
	);
	const { markInside, restoreFocus } = useFocusGuard(
		open && behaviour.shouldEnforceFocus,
		layer,
		surfaceRef,
		getReturnTarget,
	);

	const [enterCount, setEnterCount] = React.useState(0);
	const focusIn = useEventCallback(() => {
		const surface = surfaceRef.current;
		if (open && surface && !isInside(surface, document.activeElement)) {
			getInitialFocusTarget(surface)?.focus({ preventScroll: true });
		}
	});
	React.useEffect(() => {
		if (enterCount > 0) {
			focusIn();
		}
	}, [enterCount, focusIn]);

	const isReporting = useEventCallback(() => open && isTopLayer(layer));
	const trapTab = useEventCallback(
		(event: React.KeyboardEvent<HTMLElement>) => {
			const surface = surfaceRef.current;
			if (
				surface &&
				behaviour.shouldEnforceFocus &&
				isReporting() &&
				isInside(surface, event.target)
			) {
				keepTabInside(event, surface);
			}
		},
	);

	const press = useBackdropPress(behaviour.shouldEnforceFocus, (event) => {
		if (isReporting()) {
			onBackdropClick(event);
		}
	});

	const [hostElement, setHostElement] = React.useState<HTMLElement | null>(
		null,
	);
	const portalContainer = usePortalContainer(container);
	const anchor = useBaseAnchor(anchorEl);

	return {
		behaviour,
		isPresent: open || !hasExited,
		isReporting,
		host: disablePortal ? (
			<span ref={setHostElement} style={hostStyle} />
		) : null,
		portalProps: {
			keepMounted,
			container: disablePortal ? hostElement : portalContainer,
			ref: handleRootRef,
			role: "presentation",
			className: cx("gl-modal", !open && hasExited && "gl-modal-hidden"),
			style: rootStyle,
			"data-open": open ? "" : undefined,
		},
		backdropProps: {
			style: { pointerEvents: "auto" },
			onMouseDown: press.onMouseDown,
			onClick: press.onClick,
			render: (props) => <Backdrop {...props} invisible open={open} />,
		},
		positionerProps: {
			anchor,
			...toPositionerProps({ placement, offset }),
			...toWholePixelOffsets(offset),
			style: positionerVariables,
		},
		transitionProps: {
			in: open,
			appear: true,
			onEnter() {
				setEnterCount((count) => count + 1);
			},
			onExited() {
				setHasExited(true);
			},
		},
		surfaceRef,
		surfaceStyle: matchWidth
			? { ...anchorWidthStyle, ...surfaceBase }
			: surfaceBase,
		markInside,
		restoreFocus,
		trapTab,
	};
}
