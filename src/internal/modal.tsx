"use client";
/**
The modal-flags adapter: Blue Glass's documented Modal flags (design-system/components/Modal)
on Base UI's Dialog. Modal and Dialog build on `ModalLayer`; Drawer, Popover and Menu can reuse
`resolveModalBehaviour` and `useScrollLock` with their own Base UI roots.

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
| (default)             | A backdrop covers the page and catches outside presses.                    |
| `invisibleBackdrop`   | The same backdrop, transparent (`gl-backdrop-invisible`).                  |
| `hideBackdrop`        | No backdrop. The root ignores the pointer, so outside presses reach the    |
|                       | page (focus still comes back in unless `disableEnforceFocus`).             |
| `disableAutoFocus`    | Focus stays put. Otherwise it goes to `[data-autofocus]` or `[autofocus]`  |
|                       | in the content, else the surface with `tabindex="-1"`.                     |
| `disableRestoreFocus` | Focus stays put. Otherwise it returns, as the layer closes, to the element |
|                       | that had it when the layer opened, even if it moved since.                 |
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
backdrop clicks and pulls focus back. Scroll stays locked while any open modal locks it.

Left to the Modal port: the Blue Glass Backdrop component (`BackdropProps` takes its props, but
the backdrop here is a plain element with the `gl-backdrop` classes).
*/
import { Dialog } from "@base-ui/react/dialog";
import * as React from "react";
import { cx } from "./cx.js";
import { getFocusable, getScrollbarSize, isInside } from "./dom.js";
import type { ModalCloseReason } from "./events.js";
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

// Open layers in opening order. Only the last one reports Escape and backdrop clicks and
// enforces focus, as in the reference.
const openLayers: object[] = [];

function isTopLayer(layer: object): boolean {
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

// How many in-place layers want each element hidden, and which ones this module hid.
const hiddenCounts = new WeakMap<Element, number>();
const hiddenHere = new WeakSet<Element>();

function shouldStayExposed(element: Element): boolean {
	return (
		element.localName === "script" ||
		element.localName === "style" ||
		element.hasAttribute("aria-live")
	);
}

/**
Hides the rest of the page from assistive tech, as Base UI does for its own popups: every
sibling along the path from body down to `root`. Returns the undo.
*/
function hideOthers(root: Element): () => void {
	const hidden: Element[] = [];
	let node = root;
	while (node.parentElement && node !== node.ownerDocument.body) {
		const keep = node;
		hidden.push(
			...[...node.parentElement.children].filter(
				(sibling) => sibling !== keep && !shouldStayExposed(sibling),
			),
		);
		node = node.parentElement;
	}

	for (const element of hidden) {
		const count = hiddenCounts.get(element) ?? 0;
		hiddenCounts.set(element, count + 1);
		if (count > 0 || element.getAttribute("aria-hidden") === "true") {
			continue;
		}

		element.setAttribute("aria-hidden", "true");
		hiddenHere.add(element);
	}

	return () => {
		for (const element of hidden) {
			const count = (hiddenCounts.get(element) ?? 1) - 1;
			hiddenCounts.set(element, count);
			if (count > 0 || !hiddenHere.has(element)) {
				continue;
			}

			hiddenHere.delete(element);
			element.removeAttribute("aria-hidden");
		}
	};
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
The Blue Glass Backdrop's props, as Modal's `BackdropProps` takes them. Only `invisible` and the
HTML attributes apply here; the rest belong to the Backdrop component.
*/
export type ModalBackdropProps = React.HTMLAttributes<HTMLDivElement> & {
	open?: boolean;
	invisible?: boolean;
	transitionDuration?: number | { enter?: number; exit?: number };
	keepMounted?: boolean;
};

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
};

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
function useStackEntry(
	isOpen: boolean,
	layer: object,
): React.RefObject<Element | null> {
	const openerRef = React.useRef<Element | null>(null);
	useIsoLayoutEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		openerRef.current = document.activeElement;
		openLayers.push(layer);
		return () => {
			const index = openLayers.indexOf(layer);
			if (index !== -1) {
				openLayers.splice(index, 1);
			}
		};
	}, [isOpen, layer]);
	return openerRef;
}

/**
Sends focus back to the opener as the layer closes, before any exit transition, as in the
reference. Base UI's finalFocus is off, so both paths do it here.
*/
function useRestoreFocus(
	isOpen: boolean,
	shouldRestore: boolean,
	openerRef: React.RefObject<Element | null>,
): void {
	const wasOpenRef = React.useRef(false);
	React.useEffect(() => {
		if (isOpen) {
			wasOpenRef.current = true;
			return;
		}

		if (!wasOpenRef.current) {
			return;
		}

		wasOpenRef.current = false;
		const opener = openerRef.current;
		if (
			shouldRestore &&
			opener instanceof HTMLElement &&
			opener.isConnected &&
			opener !== opener.ownerDocument.body
		) {
			opener.focus({ preventScroll: true });
		}
	}, [isOpen, shouldRestore, openerRef]);
}

/**
While active, focus put outside the layer by a click or a script comes back to the content.
Base UI's 'trap-focus' only keeps Tab inside. Focus in the layer's React tree is inside, even
through a portal elsewhere: React runs the content's onFocus (the returned handler, which
records the event) before the event reaches the document.
*/
function useFocusGuard(
	isActive: boolean,
	layer: object,
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
In place, the rest of the page is hidden from assistive tech while focus is enforced (Base UI
does it on the portal path).
*/
function useHideOthers(
	isActive: boolean,
	rootRef: React.RefObject<HTMLElement | null>,
): void {
	React.useEffect(() => {
		const root = rootRef.current;
		return isActive && root ? hideOthers(root) : undefined;
	}, [isActive, rootRef]);
}

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
function usePortalContainer(
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

type BackdropPress = {
	onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
	onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
};

/**
Reports a press on the backdrop that both starts and ends there, so a drag out of the content
doesn't count. While focus is enforced the press doesn't take focus off the content.
*/
function useBackdropPress(
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

/**
The backdrop's props: the `gl-backdrop` classes, BackdropProps' HTML attributes and the press.
*/
function getBackdropProps(
	backdropProps: Partial<ModalBackdropProps> | undefined,
	isInvisibleByDefault: boolean,
	press: BackdropPress,
) {
	const {
		open: _open,
		invisible: isInvisible = isInvisibleByDefault,
		transitionDuration: _transitionDuration,
		keepMounted: _keepMounted,
		className,
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
		"aria-hidden": true,
		className: cx(
			"gl-backdrop",
			isInvisible && "gl-backdrop-invisible",
			className,
		),
		style: backdropStyle,
		...rest,
		onMouseDown(event: React.MouseEvent<HTMLDivElement>) {
			press.onMouseDown(event);
			onMouseDown?.(event);
		},
		onClick(event: React.MouseEvent<HTMLDivElement>) {
			onClick?.(event);
			press.onClick(event);
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
	} = props;
	const behaviour = resolveModalBehaviour(props);
	const [layer] = React.useState(() => ({}));
	const rootRef = React.useRef<HTMLDivElement | null>(null);
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
	useHideOthers(isOpenInPlace && behaviour.shouldEnforceFocus, rootRef);

	const closeOnEscape = useEventCallback((event: KeyboardEvent): boolean => {
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
		onClose?.(event, "escapeKeyDown");
		return true;
	});
	useEscapeListener(isOpenInPlace, closeOnEscape);

	const handleOpenChange = useEventCallback(
		(isOpen: boolean, details: Dialog.Root.ChangeEventDetails) => {
			if (
				!isOpen &&
				details.reason === "escape-key" &&
				closeOnEscape(details.event)
			) {
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
					{backdrop ? <Dialog.Backdrop forceRender {...backdrop} /> : null}
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
				<div role="presentation" hidden={!isPresent} {...backdrop} />
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
