"use client";
/**
The modal-flags adapter: Blue Glass's documented Modal flags (design-system/components/Modal)
on Base UI's Dialog. Modal and Dialog build on `ModalLayer`, and so does Drawer's temporary
variant, on Base UI's Drawer (`root="drawer"`, below). The stack's hooks are exported too
(`useStackEntry`, `isTopLayer`, `useHidePage`, `useRestoreFocus`, `useBackdropPress`,
`usePortalContainer`), so a layer on another Base UI root shares the stack with this one:
popup-layer.tsx builds Popover's and Menu's on them, with `resolveModalBehaviour` and
`useScrollLock`.

Why an adapter: the documented flags are independent, but Base UI's `modal` couples them. `true`
traps focus, locks scroll and blocks outside clicks at once; `'trap-focus'` only traps focus;
`false` does none of it. Base UI can't free focus while it locks scroll, so it never gets `true`.
Each flag maps on its own instead:

| Flag                  | How it's done                                                              |
| --------------------- | -------------------------------------------------------------------------- |
| (default)             | `modal: 'trap-focus'`: Tab cycles in the content, and Base UI marks the    |
|                       | rest of the page `aria-hidden`. A `focusin` guard also pulls focus back    |
|                       | when a click or a script puts it outside the layer's React tree.           |
| `disableEnforceFocus` | `modal: false`: Tab leaves the content, and the page stays exposed.        |
| (default)             | `useScrollLock`, the reference's lock: `overflow: hidden` on body, with    |
|                       | `padding-right` grown by the scrollbar's width so the page doesn't shift.  |
| `disableScrollLock`   | No lock.                                                                   |
| (default)             | The Backdrop component covers the page and catches outside presses. It     |
|                       | fades with the layer's `open`, and takes `BackdropProps` but `open`.       |
| `invisibleBackdrop`   | The same backdrop, transparent (`gl-backdrop-invisible`).                  |
| `hideBackdrop`        | No backdrop. The root ignores the pointer, so outside presses reach the    |
|                       | page (focus still comes back in unless `disableEnforceFocus`).             |
| `disableAutoFocus`    | Focus stays put. Otherwise it goes to `[data-autofocus]` or `[autofocus]`  |
|                       | in the content, else the surface with `tabindex="-1"`.                     |
| `disableRestoreFocus` | Focus stays put. Otherwise it returns, as the layer closes or unmounts     |
|                       | open, to the element that had it when the layer opened, even if it moved   |
|                       | since.                                                                     |
| `keepMounted`         | The layer stays in the DOM while closed, its root with `gl-modal-hidden`.  |
| `disablePortal`       | The layer renders in place, without Base UI (see below).                   |
| `container`           | The portal's container; `null` or a function returning `null` means body.  |

Two ways to render. Through a portal, the layer is Base UI's `Dialog.Portal`, with the content in
`Dialog.Popup` and Base UI trapping Tab and hiding the rest of the page; like any portal it
renders nothing on the server. In place (`disablePortal`), it renders its own elements where it
stands, so the server HTML holds an open layer and hydration adopts it: `Dialog.Popup` only
renders inside `Dialog.Portal`, so this path ports the reference instead (Tab sentinels and an
Escape listener) and hides the rest of the page itself. Both paths share everything else here.

The surface is the content's `[role="dialog"]` or `[role="alertdialog"]` (the README asks callers
to mark it), else the child's element. The child renders inside a `role="presentation"` wrapper
(`gl-modal-content`), so the surface keeps the only dialog role. Focus anywhere in the layer's
React tree is inside it, even in a popup the content portals elsewhere (Popper, Menu).

Transitions. A child whose type carries the reference's `__glTransition` mark (Fade, Grow,
Slide) gets `in` (the layer's `open`) and `appear`, and the layer stays until it calls
`onExited`, whatever closed it. Meanwhile the layer no longer traps focus, locks scroll, hides
the page or reports anything. Any other child goes as soon as the layer closes (through the
portal, once Base UI has run the popup's own exit animations).

Close reasons. `onClose(event, reason)` only reports, and the parent decides (`open` stays
controlled). Base UI's own pointer and focus-out dismissal is off (`disablePointerDismissal`):
- `'escapeKeyDown'`, with the native KeyboardEvent: Base UI's `escape-key` through the portal,
  our listener in place. With `disableEscapeKeyDown` nothing happens and the key propagates.
- `'backdropClick'`: our own `onClick` on the backdrop, with the React MouseEvent, when the press
  also started on it.
Base UI's other close reasons aren't documented ones: they're cancelled.

Stacking. Open modals form a stack, as in the reference: only the top one reports Escape and
backdrop clicks and pulls focus back. Scroll stays locked while any open modal locks it. In
place, the page is hidden for the top layer that hides it, and layers opened above that one stay
exposed, wherever they render.

The backdrop is the Blue Glass Backdrop, as in the reference: through the portal it's what
`Dialog.Backdrop` renders, in place it stands where the reference's did. It fades in as the layer
opens and out as it closes, alongside a transition child's exit, and goes with the layer.

Drawer. With `root="drawer"` the portal path runs on Base UI's Drawer parts instead of its
Dialog's, everything else as above. Base UI's swipe to dismiss is off (`data-base-ui-swipe-ignore`
on the popup): it starts on any press in the popup and drags it, while the documented drawer
drags only its bottom sheet's grab handle, which the Drawer does itself with the reference's
thresholds. Android's back gesture (Base UI's `close-watcher`) reports `escapeKeyDown` as Escape
does (src/internal/events.ts), wrapped, since it isn't a KeyboardEvent.
*/
import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import * as React from "react";
import {
	Backdrop,
	type BackdropProps,
} from "../components/Backdrop/Backdrop.js";
import { cx } from "./cx.js";
import { getFocusable, getScrollbarSize, isInside } from "./dom.js";
import { type ModalCloseReason, toSyntheticEvent } from "./events.js";
import { useEventCallback, useForkRef, useIsoLayoutEffect } from "./hooks.js";
import type { TransitionOptions } from "./transition.js";

export type { ModalCloseReason } from "./events.js";

/**
The documented flags that change behaviour, all off by default.
*/
export type ModalFlags = {
	disableEnforceFocus?: boolean;
	disableScrollLock?: boolean;
	hideBackdrop?: boolean;
	invisibleBackdrop?: boolean;
	disableEscapeKeyDown?: boolean;
	disableAutoFocus?: boolean;
	disableRestoreFocus?: boolean;
};

export type ModalBehaviour = {
	/**
	Base UI Dialog.Root `modal`. Never `true`: see the module comment.
	*/
	modal: "trap-focus" | false;
	/**
	Pull focus back in when it lands outside the layer.
	*/
	shouldEnforceFocus: boolean;
	shouldLockScroll: boolean;
	backdrop: "visible" | "invisible" | "none";
	shouldCloseOnEscape: boolean;
	shouldAutoFocus: boolean;
	shouldRestoreFocus: boolean;
};

/**
Maps the documented flags to what each part of the layer does.
*/
export function resolveModalBehaviour(flags: ModalFlags): ModalBehaviour {
	const isFocusEnforced = flags.disableEnforceFocus !== true;
	let backdrop: ModalBehaviour["backdrop"] = "visible";
	if (flags.hideBackdrop === true) {
		backdrop = "none";
	} else if (flags.invisibleBackdrop === true) {
		backdrop = "invisible";
	}

	return {
		modal: isFocusEnforced ? "trap-focus" : false,
		shouldEnforceFocus: isFocusEnforced,
		shouldLockScroll: flags.disableScrollLock !== true,
		backdrop,
		shouldCloseOnEscape: flags.disableEscapeKeyDown !== true,
		shouldAutoFocus: flags.disableAutoFocus !== true,
		shouldRestoreFocus: flags.disableRestoreFocus !== true,
	};
}

type ScrollLock = { count: number; restore: () => void };

const scrollLocks = new WeakMap<Document, ScrollLock>();

function lockScroll(document_: Document): () => void {
	const { body } = document_;
	const previous = {
		overflow: body.style.overflow,
		paddingRight: body.style.paddingRight,
	};
	const scrollbar = getScrollbarSize(document_);
	if (scrollbar > 0) {
		const view = document_.defaultView ?? window;
		// A computed padding is always in px ("16px").
		const padding = Number(
			view.getComputedStyle(body).paddingRight.replace(/px$/u, ""),
		);
		body.style.paddingRight = `${(Number.isFinite(padding) ? padding : 0) + scrollbar}px`;
	}

	body.style.overflow = "hidden";
	return () => {
		body.style.overflow = previous.overflow;
		body.style.paddingRight = previous.paddingRight;
	};
}

/**
Locks the page's scroll while `isActive`, ported from the reference Modal: `overflow: hidden` on
body, and `padding-right` grown by the scrollbar's width so the content doesn't shift. Locks are
counted per document, so nested layers keep it locked until the last one lets go.
*/
export function useScrollLock(isActive: boolean): void {
	useIsoLayoutEffect(() => {
		if (!isActive) {
			return undefined;
		}

		const document_ = document;
		const lock = scrollLocks.get(document_);
		if (lock) {
			lock.count += 1;
		} else {
			scrollLocks.set(document_, { count: 1, restore: lockScroll(document_) });
		}

		return () => {
			const current = scrollLocks.get(document_);
			if (!current) {
				return;
			}

			current.count -= 1;
			if (current.count > 0) {
				return;
			}

			scrollLocks.delete(document_);
			current.restore();
		};
	}, [isActive]);
}

export type Layer = {
	/**
	The layer's root element, once mounted.
	*/
	rootRef: React.RefObject<HTMLElement | null>;
};

// Open layers in opening order. Only the last one reports Escape and backdrop clicks and
// enforces focus, as in the reference.
const openLayers: Layer[] = [];

// The open layers that hide the rest of the page themselves: in place, with focus enforced.
const pageHiders = new WeakSet<Layer>();

export function isTopLayer(layer: Layer): boolean {
	return openLayers.at(-1) === layer;
}

function findSurface(content: HTMLElement | null): HTMLElement | undefined {
	const surface =
		content?.querySelector('[role="dialog"], [role="alertdialog"]') ??
		content?.firstElementChild;
	return surface instanceof HTMLElement ? surface : undefined;
}

function ensureFocusable(element: HTMLElement): HTMLElement {
	if (!element.hasAttribute("tabindex")) {
		element.setAttribute("tabindex", "-1");
	}

	return element;
}

/**
Where focus goes as the layer opens: the marked element, else the surface.
*/
function initialFocusTarget(
	content: HTMLElement | null,
): HTMLElement | undefined {
	const marked = content?.querySelector<HTMLElement>(
		"[data-autofocus], [autofocus]",
	);
	if (marked) {
		return marked;
	}

	const surface = findSurface(content);
	return surface ? ensureFocusable(surface) : undefined;
}

/**
Where focus comes back to: the first focusable item, else the surface, else the content.
*/
function fallbackFocusTarget(
	content: HTMLElement,
	edge: "first" | "last",
): HTMLElement {
	const items = getFocusable(content);
	const item = edge === "first" ? items[0] : items.at(-1);
	const surface = findSurface(content);
	return item ?? (surface ? ensureFocusable(surface) : content);
}

// The sentinels hand focus to the content's last item (start) or its first (end).
function focusEdge(content: HTMLElement | null, edge: "first" | "last"): void {
	if (content) {
		fallbackFocusTarget(content, edge).focus({ preventScroll: true });
	}
}

// The elements this module hid, so it only ever un-hides its own.
const hiddenHere = new Set<Element>();

function shouldStayExposed(element: Element): boolean {
	return (
		element.localName === "script" ||
		element.localName === "style" ||
		element.hasAttribute("aria-live")
	);
}

/**
Every sibling along the path from body down to `root`: what Base UI hides for its own popups.
*/
function siblingsAlongPath(root: Element): Element[] {
	const siblings: Element[] = [];
	let node = root;
	while (node.parentElement && node !== node.ownerDocument.body) {
		const keep = node;
		siblings.push(
			...[...node.parentElement.children].filter(
				(sibling) => sibling !== keep && !shouldStayExposed(sibling),
			),
		);
		node = node.parentElement;
	}

	return siblings;
}

/**
Hides the rest of the page from assistive tech for the top layer that hides it, and exposes
again what no layer wants hidden any more. Layers opened above that one stay exposed, along with
everything that contains them: an in-place sibling, or a portal kept mounted in body before the
page was hidden. Runs whenever a layer opens, closes, or starts or stops hiding the page.
*/
function syncHiddenPage(): void {
	const index = openLayers.findLastIndex(
		(layer) => pageHiders.has(layer) && layer.rootRef.current !== null,
	);
	const root = index === -1 ? undefined : openLayers[index]?.rootRef.current;
	const wanted = new Set<Element>();
	if (root) {
		const above = openLayers
			.slice(index + 1)
			.map((layer) => layer.rootRef.current)
			.filter((element) => element !== null);
		for (const element of siblingsAlongPath(root)) {
			if (
				above.every((other) => element !== other && !element.contains(other))
			) {
				wanted.add(element);
			}
		}
	}

	for (const element of hiddenHere) {
		if (wanted.has(element)) {
			continue;
		}

		hiddenHere.delete(element);
		element.removeAttribute("aria-hidden");
	}

	for (const element of wanted) {
		if (
			hiddenHere.has(element) ||
			element.getAttribute("aria-hidden") === "true"
		) {
			continue;
		}

		element.setAttribute("aria-hidden", "true");
		hiddenHere.add(element);
	}
}

/**
One of the reference's Tab sentinels around the content, in place: focusing it hands focus on
to the content's last or first item, so Tab cycles inside.
*/
function TabSentinel({
	edge,
	onFocus,
}: {
	readonly edge: "start" | "end";
	readonly onFocus: () => void;
}) {
	// Focusable on purpose: it exists only to catch Tab and hand focus on at once.
	// eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
	return <div tabIndex={0} data-gl-sentinel={edge} onFocus={onFocus} />;
}

/**
Whether the child is one of the transitions (they carry the reference's `__glTransition`).
*/
function isTransitionElement(
	node: React.ReactNode,
): node is React.ReactElement<TransitionOptions> {
	return (
		React.isValidElement(node) &&
		typeof node.type !== "string" &&
		(node.type as { __glTransition?: unknown }).__glTransition === true
	);
}

/**
The Backdrop's props, as Modal's `BackdropProps` takes them. All of them apply but `open`, which
the layer drives.
*/
export type ModalBackdropProps = Partial<BackdropProps>;

export type ModalLayerProps = ModalFlags & {
	open: boolean;
	/**
	Called with the reason; the parent decides whether to close.
	*/
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: ModalCloseReason,
	) => void;
	/**
	One element: the surface, or a transition wrapping it.
	*/
	children: React.ReactElement;
	keepMounted?: boolean;
	disablePortal?: boolean;
	container?: Element | (() => Element | null) | null;
	BackdropProps?: Partial<ModalBackdropProps>;
	className?: string;
	style?: React.CSSProperties;
	/**
	The z-index; default the z-modal token.
	*/
	zIndex?: string | number;
	/**
	The layer's root element.
	*/
	ref?: React.Ref<HTMLDivElement>;
	/**
	The Base UI root the layer runs on through the portal: Dialog's (default), or Drawer's for
	Drawer's temporary variant. In place it runs on neither.
	*/
	root?: "dialog" | "drawer";
};

type ChangeEventDetails =
	Dialog.Root.ChangeEventDetails | Drawer.Root.ChangeEventDetails;

/**
A transition child runs its exit before the layer goes: it gets `in` and `appear`, and its
onExited ends the layer's presence. Through the portal, Base UI reports the end of its own exit
(`markExited`); in place, any other child has nothing to wait for.
*/
function useExit(
	isOpen: boolean,
	children: React.ReactElement,
	isInPlace: boolean,
) {
	const isTransition = isTransitionElement(children);
	const [hasExited, setHasExited] = React.useState(!isOpen);
	if (isOpen && hasExited) {
		setHasExited(false);
	} else if (isInPlace && !isOpen && !isTransition && !hasExited) {
		setHasExited(true);
	}

	const content = isTransition
		? // The reference's contract: the layer drives the transition's `in` and hears its exit.
			// eslint-disable-next-line @eslint-react/no-clone-element
			React.cloneElement(children, {
				in: isOpen,
				appear: true,
				onExited(node: HTMLElement) {
					setHasExited(true);
					children.props.onExited?.(node);
				},
			})
		: children;

	return {
		content,
		hasExited,
		isPresent: isOpen || (isTransition && !hasExited),
		markExited() {
			setHasExited(true);
		},
	};
}

/**
Joins the stack while open, and keeps the element that had focus when the layer opened. It's
read before focus moves in: Base UI moves it a frame after its own layout effects, and in place
an effect after this one does.
*/
export function useStackEntry(
	isOpen: boolean,
	layer: Layer,
): React.RefObject<Element | null> {
	const openerRef = React.useRef<Element | null>(null);
	useIsoLayoutEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		// StrictMode replays this after focus has moved in (in place): the opener stays then.
		const active = document.activeElement;
		if (!isInside(layer.rootRef.current, active)) {
			openerRef.current = active;
		}

		openLayers.push(layer);
		syncHiddenPage();
		return () => {
			const index = openLayers.indexOf(layer);
			if (index !== -1) {
				openLayers.splice(index, 1);
			}

			syncHiddenPage();
		};
	}, [isOpen, layer]);
	return openerRef;
}

/**
Sends focus back to the opener as the layer closes, before any exit transition, as in the
reference, and as an open layer unmounts (`{isShown && <Modal open />}`). Base UI's finalFocus
is off, so both paths do it here.
*/
export function useRestoreFocus(
	isOpen: boolean,
	shouldRestore: boolean,
	openerRef: React.RefObject<Element | null>,
): void {
	const wasOpenRef = React.useRef(false);
	const restore = useEventCallback(() => {
		const opener = openerRef.current;
		if (
			shouldRestore &&
			opener instanceof HTMLElement &&
			opener.isConnected &&
			opener !== opener.ownerDocument.body
		) {
			opener.focus({ preventScroll: true });
		}
	});
	React.useEffect(() => {
		if (isOpen) {
			wasOpenRef.current = true;
			return;
		}

		if (!wasOpenRef.current) {
			return;
		}

		wasOpenRef.current = false;
		restore();
	}, [isOpen, restore]);

	// StrictMode replays effects by unmounting and remounting at once, so an unmount waits a
	// microtask and restores only if the layer didn't come back.
	const isMountedRef = React.useRef(false);
	React.useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			if (!wasOpenRef.current) {
				return;
			}

			queueMicrotask(() => {
				if (!isMountedRef.current) {
					restore();
				}
			});
		};
	}, [restore]);
}

/**
While active, focus put outside the layer by a click or a script comes back to the content.
Base UI's 'trap-focus' only keeps Tab inside. Focus in the layer's React tree is inside, even
through a portal elsewhere: React runs the content's onFocus (the returned handler, which
records the event) before the event reaches the document.
*/
function useFocusGuard(
	isActive: boolean,
	layer: Layer,
	rootRef: React.RefObject<HTMLElement | null>,
	contentRef: React.RefObject<HTMLElement | null>,
): (event: React.FocusEvent) => void {
	const [insideEvents] = React.useState(() => new WeakSet<Event>());
	React.useEffect(() => {
		if (!isActive) {
			return undefined;
		}

		function handleFocusIn(event: FocusEvent) {
			const root = rootRef.current;
			const content = contentRef.current;
			if (
				!root ||
				!content ||
				!isTopLayer(layer) ||
				insideEvents.has(event) ||
				isInside(root, event.target)
			) {
				return;
			}

			fallbackFocusTarget(content, "first").focus({ preventScroll: true });
		}

		document.addEventListener("focusin", handleFocusIn);
		return () => {
			document.removeEventListener("focusin", handleFocusIn);
		};
	}, [isActive, layer, rootRef, contentRef, insideEvents]);
	return (event) => {
		insideEvents.add(event.nativeEvent);
	};
}

/**
In place, focus moves into the content as the layer opens (Base UI's initialFocus does it on the
portal path).
*/
function useInitialFocus(
	isActive: boolean,
	contentRef: React.RefObject<HTMLElement | null>,
): void {
	React.useEffect(() => {
		const content = contentRef.current;
		if (isActive && content && !isInside(content, document.activeElement)) {
			initialFocusTarget(content)?.focus({ preventScroll: true });
		}
	}, [isActive, contentRef]);
}

/**
Through the portal, Base UI's dialog stays open while a transition child exits, so a re-open in
that time is no open to Base UI and its initialFocus doesn't run: focus goes in here instead.
*/
function useFocusOnReopen(
	isOpen: boolean,
	isPresent: boolean,
	isActive: boolean,
	contentRef: React.RefObject<HTMLElement | null>,
): void {
	const isExitingRef = React.useRef(false);
	React.useEffect(() => {
		if (!isOpen) {
			isExitingRef.current = isPresent;
			return;
		}

		if (!isExitingRef.current) {
			return;
		}

		isExitingRef.current = false;
		const content = contentRef.current;
		if (isActive && content && !isInside(content, document.activeElement)) {
			initialFocusTarget(content)?.focus({ preventScroll: true });
		}
	}, [isOpen, isPresent, isActive, contentRef]);
}

/**
In place, the rest of the page is hidden from assistive tech while focus is enforced (Base UI
does it on the portal path). The stack decides what that hides (syncHiddenPage). Popover's and
Menu's layers use it through the portal too, where their Base UI roots don't hide the page; their
root mounts after they open, so they pass `isActive` again once it has.
*/
export function useHidePage(isActive: boolean, layer: Layer): void {
	useIsoLayoutEffect(() => {
		if (!isActive) {
			return undefined;
		}

		pageHiders.add(layer);
		syncHiddenPage();
		return () => {
			pageHiders.delete(layer);
			syncHiddenPage();
		};
	}, [isActive, layer]);
}

// Escape events a layer has handled. With the React root on document itself (hydrateRoot on the
// whole document), the content's handler and the in-place listener both see one event, and
// stopPropagation doesn't stop other listeners on the same node.
const handledEscapes = new WeakSet<KeyboardEvent>();

/**
In place, Escape with focus outside the content. With focus inside, the content's onKeyDown
handles it first and stops it.
*/
function useEscapeListener(
	isActive: boolean,
	didHandleEscape: (event: KeyboardEvent) => boolean,
): void {
	React.useEffect(() => {
		if (!isActive) {
			return undefined;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (didHandleEscape(event)) {
				event.stopPropagation();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [isActive, didHandleEscape]);
}

/**
The portal's container: the given element, a function's result once mounted (body for null), or
undefined for Base UI's default (body, or the enclosing Base UI portal). Nothing here reads the
DOM while rendering, so the layer renders on the server.
*/
export function usePortalContainer(
	container: ModalLayerProps["container"],
): HTMLElement | null | undefined {
	const [resolved, setResolved] = React.useState<HTMLElement | null>(null);
	useIsoLayoutEffect(() => {
		if (typeof container !== "function") {
			return;
		}

		const element = container();
		setResolved(element instanceof HTMLElement ? element : document.body);
	}, [container]);
	// Null and undefined both mean Base UI's default.
	return typeof container === "function"
		? resolved
		: ((container ?? undefined) as HTMLElement | undefined);
}

export type BackdropPress = {
	onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
	onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
};

/**
Reports a press on the backdrop that both starts and ends there, so a drag out of the content
doesn't count. While focus is enforced the press doesn't take focus off the content.
*/
export function useBackdropPress(
	shouldKeepFocus: boolean,
	onPress: (event: React.MouseEvent<HTMLDivElement>) => void,
): BackdropPress {
	const pressedRef = React.useRef(false);
	return {
		onMouseDown(event) {
			pressedRef.current = event.target === event.currentTarget;
			if (shouldKeepFocus) {
				event.preventDefault();
			}
		},
		onClick(event) {
			const wasPressedHere = pressedRef.current;
			pressedRef.current = false;
			if (wasPressedHere && event.target === event.currentTarget) {
				onPress(event);
			}
		},
	};
}

type BackdropOptions = Pick<
	BackdropProps,
	"invisible" | "transitionDuration" | "keepMounted" | "children"
>;

/**
What the layer gives the Backdrop: its options, with `invisible` from the flag unless
BackdropProps sets it, and its HTML attributes with the press. Through the portal the attributes
go to `Dialog.Backdrop`, which merges its own in before the Backdrop renders them all.
*/
function getBackdropProps(
	backdropProps: ModalBackdropProps | undefined,
	isInvisibleByDefault: boolean,
	press: BackdropPress,
): {
	options: BackdropOptions;
	attributes: React.HTMLAttributes<HTMLDivElement>;
} {
	const {
		open: _open,
		invisible = isInvisibleByDefault,
		transitionDuration,
		keepMounted,
		children,
		style,
		onMouseDown,
		onClick,
		...rest
	} = backdropProps ?? {};
	const backdropStyle: React.CSSProperties = {
		pointerEvents: "auto",
		...style,
	};
	return {
		options: { invisible, transitionDuration, keepMounted, children },
		attributes: {
			...rest,
			style: backdropStyle,
			onMouseDown(event) {
				press.onMouseDown(event);
				onMouseDown?.(event);
			},
			onClick(event) {
				onClick?.(event);
				press.onClick(event);
			},
		},
	};
}

/**
The root's props on both paths.
*/
function getRootProps(
	props: Pick<ModalLayerProps, "open" | "className" | "style" | "zIndex">,
	hasExited: boolean,
) {
	const rootStyle: React.CSSProperties = {
		zIndex: props.zIndex ?? "var(--z-modal, 1300)",
		// The root never takes the pointer: the backdrop and the content do, so without a
		// backdrop the page around the content stays clickable.
		pointerEvents: "none",
		...props.style,
	};
	return {
		role: "presentation",
		className: cx(
			"gl-modal",
			!props.open && hasExited && "gl-modal-hidden",
			props.className,
		),
		style: rootStyle,
		"data-open": props.open ? "" : undefined,
	};
}

/**
A modal layer with the documented Modal flags, on Base UI's Dialog (see the module comment).
*/
export function ModalLayer(props: ModalLayerProps) {
	const {
		open,
		onClose,
		children,
		keepMounted = false,
		disablePortal = false,
		container,
		BackdropProps: backdropProps,
		ref,
		root = "dialog",
	} = props;
	const behaviour = resolveModalBehaviour(props);
	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const [layer] = React.useState<Layer>(() => ({ rootRef }));
	const contentRef = React.useRef<HTMLDivElement | null>(null);
	const handleRootRef = useForkRef(rootRef, ref);

	const { content, hasExited, isPresent, markExited } = useExit(
		open,
		children,
		disablePortal,
	);
	const openerRef = useStackEntry(open, layer);
	useScrollLock(open && behaviour.shouldLockScroll);
	useRestoreFocus(open, behaviour.shouldRestoreFocus, openerRef);
	const markInside = useFocusGuard(
		open && behaviour.shouldEnforceFocus,
		layer,
		rootRef,
		contentRef,
	);
	const isOpenInPlace = open && disablePortal;
	useInitialFocus(isOpenInPlace && behaviour.shouldAutoFocus, contentRef);
	useFocusOnReopen(
		open,
		isPresent,
		!disablePortal && behaviour.shouldAutoFocus,
		contentRef,
	);
	useHidePage(isOpenInPlace && behaviour.shouldEnforceFocus, layer);

	const closeOnEscape = useEventCallback((event: KeyboardEvent): boolean => {
		if (handledEscapes.has(event)) {
			return true;
		}

		if (
			!open ||
			!behaviour.shouldCloseOnEscape ||
			event.key !== "Escape" ||
			event.isComposing ||
			!isTopLayer(layer)
		) {
			return false;
		}

		event.preventDefault();
		handledEscapes.add(event);
		onClose?.(event, "escapeKeyDown");
		return true;
	});
	useEscapeListener(isOpenInPlace, closeOnEscape);

	// Android's back gesture, which only Base UI's Drawer reports: Escape's reason, wrapped.
	const reportCloseRequest = useEventCallback((event: Event) => {
		if (!open || !behaviour.shouldCloseOnEscape || !isTopLayer(layer)) {
			return;
		}

		const content = contentRef.current;
		onClose?.(
			toSyntheticEvent(event, findSurface(content) ?? content ?? undefined),
			"escapeKeyDown",
		);
	});

	const handleOpenChange = useEventCallback(
		(isOpen: boolean, details: ChangeEventDetails) => {
			if (
				!isOpen &&
				details.reason === "escape-key" &&
				closeOnEscape(details.event)
			) {
				return;
			}

			if (!isOpen && details.reason === "close-watcher") {
				reportCloseRequest(details.event);
				// The parent decides. Cancelling keeps Base UI's watcher for the next back gesture
				// while the layer stays open.
				details.cancel();
				return;
			}

			// Not a documented reason, Escape is off, or the layer is closing: leave the event as
			// if no one had seen it.
			details.cancel();
			details.allowPropagation();
		},
	);

	const portalContainer = usePortalContainer(container);

	const press = useBackdropPress(behaviour.shouldEnforceFocus, (event) => {
		if (isTopLayer(layer)) {
			onClose?.(event, "backdropClick");
		}
	});
	const backdrop =
		behaviour.backdrop === "none"
			? undefined
			: getBackdropProps(
					backdropProps,
					behaviour.backdrop === "invisible",
					press,
				);
	const rootProps = getRootProps(props, hasExited);

	if (!disablePortal && root === "drawer") {
		return (
			<Drawer.Root
				disablePointerDismissal
				open={isPresent}
				modal={open ? behaviour.modal : false}
				onOpenChange={handleOpenChange}
				onOpenChangeComplete={(isOpen) => {
					if (!isOpen) {
						markExited();
					}
				}}
			>
				<Drawer.Portal
					ref={handleRootRef}
					keepMounted={keepMounted}
					container={portalContainer}
					{...rootProps}
				>
					{backdrop ? (
						<Drawer.Backdrop
							forceRender
							{...backdrop.attributes}
							render={(baseUiProps) => (
								<Backdrop {...baseUiProps} {...backdrop.options} open={open} />
							)}
						/>
					) : null}
					<Drawer.Viewport>
						<Drawer.Popup
							ref={contentRef}
							data-base-ui-swipe-ignore=""
							role="presentation"
							className="gl-modal-content"
							style={{ pointerEvents: "auto" }}
							initialFocus={
								behaviour.shouldAutoFocus
									? () => initialFocusTarget(contentRef.current) ?? true
									: false
							}
							finalFocus={false}
							onFocus={markInside}
						>
							{content}
						</Drawer.Popup>
					</Drawer.Viewport>
				</Drawer.Portal>
			</Drawer.Root>
		);
	}

	if (!disablePortal) {
		return (
			<Dialog.Root
				disablePointerDismissal
				open={isPresent}
				modal={open ? behaviour.modal : false}
				onOpenChange={handleOpenChange}
				onOpenChangeComplete={(isOpen) => {
					if (!isOpen) {
						markExited();
					}
				}}
			>
				<Dialog.Portal
					ref={handleRootRef}
					keepMounted={keepMounted}
					container={portalContainer}
					{...rootProps}
				>
					{backdrop ? (
						<Dialog.Backdrop
							forceRender
							{...backdrop.attributes}
							render={(baseUiProps) => (
								<Backdrop {...baseUiProps} {...backdrop.options} open={open} />
							)}
						/>
					) : null}
					<Dialog.Popup
						ref={contentRef}
						role="presentation"
						className="gl-modal-content"
						style={{ pointerEvents: "auto" }}
						initialFocus={
							behaviour.shouldAutoFocus
								? () => initialFocusTarget(contentRef.current) ?? true
								: false
						}
						finalFocus={false}
						onFocus={markInside}
					>
						{content}
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		);
	}

	if (!isPresent && !keepMounted) {
		return null;
	}

	const isTrapping = open && behaviour.shouldEnforceFocus;

	return (
		<div ref={handleRootRef} {...rootProps}>
			{backdrop ? (
				<Backdrop
					role="presentation"
					{...backdrop.attributes}
					{...backdrop.options}
					open={open}
				/>
			) : null}
			{isTrapping ? (
				<TabSentinel
					edge="start"
					onFocus={() => {
						focusEdge(contentRef.current, "last");
					}}
				/>
			) : null}
			<div
				ref={contentRef}
				role="presentation"
				className="gl-modal-content"
				style={{ pointerEvents: "auto" }}
				hidden={!isPresent}
				onFocus={markInside}
				onKeyDown={(event) => {
					if (closeOnEscape(event.nativeEvent)) {
						event.stopPropagation();
					}
				}}
			>
				{content}
			</div>
			{isTrapping ? (
				<TabSentinel
					edge="end"
					onFocus={() => {
						focusEdge(contentRef.current, "first");
					}}
				/>
			) : null}
		</div>
	);
}
