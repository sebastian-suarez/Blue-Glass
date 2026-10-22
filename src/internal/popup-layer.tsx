"use client";
/**
The transparent modal layer that Popover and Menu put their Base UI popup on
(design-system/components/Popover: "a glass surface anchored to an element, on a transparent
modal layer"). The reference builds both on its Modal with `invisibleBackdrop`; here each runs on
its own Base UI root (Popover.Root, Menu.Root), and this hook gives it the layer's parts.

Base UI's Popover traps focus and hides the page only with `modal` and a Close part inside the
popup, and its Menu never hides the page, so both roots run non-modal (`modal={false}`) and the
layer adds the rest, with the documented flags mapped by `resolveModalBehaviour`:

| Flag                  | How it's done                                                              |
| --------------------- | -------------------------------------------------------------------------- |
| (always)              | An invisible Backdrop under the popup takes every press outside it and     |
|                       | reports `backdropClick` with its React MouseEvent, so the press never      |
|                       | reaches the page. Base UI's own outside press is ignored: in place, the    |
|                       | backdrop covers only the stage, and a press beyond it closes nothing.      |
| (default)             | Tab and Shift+Tab cycle in the surface (`trapTab`), focus a click or a     |
|                       | script puts outside comes back (a focusin guard), and the rest of the page |
|                       | is `aria-hidden` (modal.tsx's `useHidePage`).                              |
| `disableEnforceFocus` | None of that: focus may leave and the page stays exposed.                  |
| (default)             | modal.tsx's `useScrollLock`.                                               |
| `disableScrollLock`   | No lock.                                                                   |
| `disableAutoFocus`    | The component's `initialFocus` is false (it picks its own target).         |
| `disableRestoreFocus` | Focus stays put. Otherwise it returns to the element that had it when the  |
|                       | layer opened (modal.tsx's `useRestoreFocus`); Base UI's finalFocus is off. |
| `keepMounted`         | The portal stays, Base UI hides the positioner, the root gets              |
|                       | `gl-modal-hidden`.                                                         |
| `disablePortal`       | Base UI's portal renders into a `display: contents` span in place.         |
| `container`           | The portal's container, as Modal's (`usePortalContainer`).                 |

The layer joins modal.tsx's stack, so a Popover, a Menu and a Modal stacked in any order agree on
the top layer: only it reports Escape and backdrop presses and pulls focus back. The component
reports Escape itself from Base UI's `escape-key`, through `isReporting`, and cancels every change
Base UI asks for: `open` stays controlled.

The root is Base UI's portal element with the reference's `.gl-modal` (fixed over its containing
block, z-modal), which ignores the pointer: the backdrop and the surface take it. The surface goes
through Grow, as the reference's does; the root stays open until Grow's exit has run.
*/
import * as React from "react";
import { Backdrop } from "../components/Backdrop/Backdrop.js";
import {
	type AnchorEl,
	anchorWidthStyle,
	type Placement,
	positionerVariables,
	toPositionerProps,
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
	/**
	Reports a press on the backdrop: the documented backdropClick.
	*/
	onBackdropClick: (event: React.MouseEvent<HTMLDivElement>) => void;
	/**
	Where the focus guard sends focus that left the layer: the surface's first item, say.
	*/
	getReturnTarget: (surface: HTMLDivElement) => HTMLElement;
};

export type PopupLayer = {
	behaviour: ModalBehaviour;
	/**
	The Base UI root's `open`: true until the surface's exit has run.
	*/
	isPresent: boolean;
	/**
	Whether the layer reports a close now: it's open and on top of the stack.
	*/
	isReporting: () => boolean;
	/**
	The span the portal renders into with `disablePortal`; render it where the component stands.
	*/
	host: React.ReactNode;
	/**
	For the Base UI Portal part.
	*/
	portalProps: {
		keepMounted: boolean;
		container: HTMLElement | null | undefined;
		ref: React.Ref<HTMLDivElement> | undefined;
		role: "presentation";
		className: string;
		style: React.CSSProperties;
		"data-open": "" | undefined;
	};
	/**
	For the Base UI Backdrop part.
	*/
	backdropProps: {
		style: React.CSSProperties;
		onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
		onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
		render: (props: React.ComponentProps<"div">) => React.ReactElement;
	};
	/**
	For the Base UI Positioner part.
	*/
	positionerProps: ReturnType<typeof toPositionerProps> & {
		anchor: ReturnType<typeof useBaseAnchor>;
		style: React.CSSProperties;
	};
	/**
	For the Grow around the surface.
	*/
	transitionProps: { in: boolean; appear: boolean; onExited: () => void };
	surfaceRef: React.RefObject<HTMLDivElement | null>;
	/**
	The surface's own style, before the caller's: the pointer, matchWidth and the reference's
	height cap.
	*/
	surfaceStyle: React.CSSProperties;
	/**
	The surface's onFocus: marks focus in its React tree as inside the layer.
	*/
	markInside: (event: React.FocusEvent) => void;
	/**
	The surface's onKeyDown: keeps Tab inside while focus is enforced.
	*/
	trapTab: (event: React.KeyboardEvent<HTMLElement>) => void;
};

/**
Moves Tab on at the surface's edges, as the reference's sentinels do: from the last item (or the
surface itself) to the first, and with Shift from the first (or the surface) to the last. With
nothing to tab to, focus stays.
*/
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

/**
While active, focus a click or a script puts outside the layer comes back to the surface, as the
reference Modal's focusin guard does. Focus anywhere in the surface's React tree is inside, even
in a popup the content portals elsewhere: React runs the surface's onFocus (the returned handler,
which records the event) before the event reaches the document.
*/
function useFocusGuard(
	isActive: boolean,
	layer: Layer,
	surfaceRef: React.RefObject<HTMLDivElement | null>,
	getReturnTarget: (surface: HTMLDivElement) => HTMLElement,
): (event: React.FocusEvent) => void {
	const [insideEvents] = React.useState(() => new WeakSet<Event>());
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
	return (event) => {
		insideEvents.add(event.nativeEvent);
	};
}

const surfaceBase: React.CSSProperties = {
	// The root ignores the pointer, and the surface takes it again.
	pointerEvents: "auto",
	// The reference caps the surface at 480px and never below 80px of the room it has.
	maxHeight: "min(max(var(--available-height), 80px), 480px)",
};

const rootStyle: React.CSSProperties = {
	zIndex: "var(--z-modal, 1300)",
	pointerEvents: "none",
};

const hostStyle: React.CSSProperties = { display: "contents" };

/**
The layer's parts for a Base UI popup root: see the module comment.
*/
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
		getReturnTarget,
	} = options;
	const behaviour = resolveModalBehaviour(options);

	// The surface's exit runs before the Base UI root closes, as the reference Modal waits for it.
	const [hasExited, setHasExited] = React.useState(!open);
	if (open && hasExited) {
		setHasExited(false);
	}

	const rootRef = React.useRef<HTMLDivElement | null>(null);
	// The portal's element mounts after the layer opens, so page hiding waits for it.
	const [root, setRoot] = React.useState<HTMLDivElement | null>(null);
	const handleRootRef = useForkRef(rootRef, setRoot);
	const [layer] = React.useState<Layer>(() => ({ rootRef }));
	const surfaceRef = React.useRef<HTMLDivElement | null>(null);

	const openerRef = useStackEntry(open, layer);
	useScrollLock(open && behaviour.shouldLockScroll);
	useRestoreFocus(open, behaviour.shouldRestoreFocus, openerRef);
	useHidePage(open && behaviour.shouldEnforceFocus && root !== null, layer);
	const markInside = useFocusGuard(
		open && behaviour.shouldEnforceFocus,
		layer,
		surfaceRef,
		getReturnTarget,
	);

	const isReporting = useEventCallback(() => open && isTopLayer(layer));
	const trapTab = useEventCallback((event: React.KeyboardEvent<HTMLElement>) => {
		const surface = surfaceRef.current;
		if (
			surface &&
			behaviour.shouldEnforceFocus &&
			isReporting() &&
			isInside(surface, event.target)
		) {
			keepTabInside(event, surface);
		}
	});

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
			// Null waits: in place, until the span has mounted.
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
			style: positionerVariables,
		},
		transitionProps: {
			in: open,
			appear: true,
			onExited() {
				setHasExited(true);
			},
		},
		surfaceRef,
		surfaceStyle: matchWidth
			? { ...anchorWidthStyle, ...surfaceBase }
			: surfaceBase,
		markInside,
		trapTab,
	};
}
