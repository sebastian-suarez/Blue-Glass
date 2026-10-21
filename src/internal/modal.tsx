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
|                       | when a click or a script puts it outside (the reference's rule).           |
| `disableEnforceFocus` | `modal: false`: Tab leaves the content, and the page stays exposed.        |
| (default)             | `useScrollLock`, the reference's lock: `overflow: hidden` on body, with    |
|                       | `padding-right` grown by the scrollbar's width so the page doesn't shift.  |
| `disableScrollLock`   | No lock.                                                                   |
| (default)             | A `Dialog.Backdrop` covers the page and catches outside presses.           |
| `invisibleBackdrop`   | The same backdrop, transparent (`gl-backdrop-invisible`).                  |
| `hideBackdrop`        | No backdrop. The root ignores the pointer, so outside presses reach the    |
|                       | page (focus still comes back in unless `disableEnforceFocus`).             |
| `disableAutoFocus`    | `initialFocus: false`. Otherwise focus goes to `[data-autofocus]` or       |
|                       | `[autofocus]` in the content, else the surface with `tabindex="-1"`.       |
| `disableRestoreFocus` | `finalFocus: false`. Otherwise focus returns to the element that had it    |
|                       | when the modal opened, even if it moved since.                             |
| `keepMounted`         | `Dialog.Portal keepMounted`; while closed the root gets `gl-modal-hidden`. |
| `disablePortal`       | The portal renders into an in-place `display: contents` element.           |
| `container`           | The portal's container; `null` or a function returning `null` means body.  |

The surface is the content's `[role="dialog"]` or `[role="alertdialog"]` (the README asks callers
to mark it), else the child's element. The child renders inside `Dialog.Popup`, a
`role="presentation"` wrapper (`gl-modal-content`), so the surface keeps the only dialog role.

Close reasons. `onClose(event, reason)` only reports, and the parent decides (`open` stays
controlled). Base UI's own pointer and focus-out dismissal is off (`disablePointerDismissal`):
- `'escapeKeyDown'`: Base UI's `escape-key`, with its native KeyboardEvent. With
  `disableEscapeKeyDown` the change is cancelled and the key keeps propagating.
- `'backdropClick'`: our own `onClick` on the backdrop, with the React MouseEvent, when the press
  also started on it.
Base UI's other close reasons aren't documented ones: they're cancelled.

Stacking. Open modals form a stack, as in the reference: only the top one reports Escape and
backdrop clicks and pulls focus back. Scroll stays locked while any open modal locks it.

Left to the Modal port: waiting for a child's exit transition (Base UI only waits for the popup's
own animations), and the Blue Glass Backdrop component (`BackdropProps` takes its props, but the
backdrop here is a plain `Dialog.Backdrop` with the `gl-backdrop` classes).
*/
import { Dialog } from "@base-ui/react/dialog";
import * as React from "react";
import { cx } from "./cx.js";
import { getFocusable, getScrollbarSize, isInside } from "./dom.js";
import { useEventCallback, useForkRef, useIsoLayoutEffect } from "./hooks.js";

export type ModalCloseReason = "backdropClick" | "escapeKeyDown";

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

function findSurface(popup: HTMLElement | null): HTMLElement | undefined {
	const surface =
		popup?.querySelector('[role="dialog"], [role="alertdialog"]') ??
		popup?.firstElementChild;
	return surface instanceof HTMLElement ? surface : undefined;
}

function ensureFocusable(element: HTMLElement): HTMLElement {
	if (!element.hasAttribute("tabindex")) {
		element.setAttribute("tabindex", "-1");
	}

	return element;
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
A portal layer on Base UI's Dialog with the documented Modal flags (see the module comment).
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
		className,
		style,
		zIndex,
		ref,
	} = props;
	const behaviour = resolveModalBehaviour(props);
	const [layer] = React.useState(() => ({}));
	const rootRef = React.useRef<HTMLDivElement | null>(null);
	const popupRef = React.useRef<HTMLDivElement | null>(null);
	const openerRef = React.useRef<Element | null>(null);
	const pressedBackdropRef = React.useRef(false);
	const handleRootRef = useForkRef(rootRef, ref);

	// The root keeps `gl-modal-hidden` from the end of the exit until the next open.
	const [hasExited, setHasExited] = React.useState(!open);
	if (open && hasExited) {
		setHasExited(false);
	}

	// Join the stack while open. The opener is read here, before Base UI moves focus in (it
	// does so in a frame after its own layout effects).
	useIsoLayoutEffect(() => {
		if (!open) {
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
	}, [open, layer]);

	useScrollLock(open && behaviour.shouldLockScroll);

	// Base UI's 'trap-focus' only keeps Tab inside; focus put outside by a click or a script
	// comes back to the first focusable item, else the surface.
	const { shouldEnforceFocus } = behaviour;
	React.useEffect(() => {
		if (!open || !shouldEnforceFocus) {
			return undefined;
		}

		function handleFocusIn(event: FocusEvent) {
			const root = rootRef.current;
			if (!root || !isTopLayer(layer) || isInside(root, event.target)) {
				return;
			}

			const popup = popupRef.current;
			const surface = findSurface(popup);
			const target =
				(popup ? getFocusable(popup)[0] : undefined) ??
				(surface ? ensureFocusable(surface) : popup);
			target?.focus({ preventScroll: true });
		}

		document.addEventListener("focusin", handleFocusIn);
		return () => {
			document.removeEventListener("focusin", handleFocusIn);
		};
	}, [open, shouldEnforceFocus, layer]);

	const handleOpenChange = useEventCallback(
		(isOpen: boolean, details: Dialog.Root.ChangeEventDetails) => {
			if (isOpen) {
				return;
			}

			if (
				details.reason === "escape-key" &&
				behaviour.shouldCloseOnEscape &&
				isTopLayer(layer)
			) {
				onClose?.(details.event, "escapeKeyDown");
				return;
			}

			// Not a documented reason, or Escape is off: leave the event as if no one had seen it.
			details.cancel();
			details.allowPropagation();
		},
	);

	const initialFocus = behaviour.shouldAutoFocus
		? () => {
				const marked = popupRef.current?.querySelector<HTMLElement>(
					"[data-autofocus], [autofocus]",
				);
				if (marked) {
					return marked;
				}

				const surface = findSurface(popupRef.current);
				return surface ? ensureFocusable(surface) : true;
			}
		: false;

	const finalFocus = behaviour.shouldRestoreFocus
		? () => {
				const opener = openerRef.current;
				return opener instanceof HTMLElement &&
					opener.isConnected &&
					opener !== opener.ownerDocument.body
					? opener
					: false;
			}
		: false;

	// The portal's container: in place, the given element, or Base UI's default (body, or the
	// enclosing Base UI portal) for none or null.
	const [inPlace, setInPlace] = React.useState<HTMLDivElement | null>(null);
	const [resolved, setResolved] = React.useState<HTMLElement | null>(null);
	useIsoLayoutEffect(() => {
		if (typeof container !== "function") {
			return;
		}

		const element = container();
		setResolved(element instanceof HTMLElement ? element : document.body);
	}, [container]);
	let portalContainer: HTMLElement | null | undefined;
	if (disablePortal) {
		portalContainer = inPlace;
	} else if (typeof container === "function") {
		portalContainer = resolved;
	} else if (container instanceof HTMLElement) {
		portalContainer = container;
	}

	const {
		open: _open,
		invisible: isInvisible = behaviour.backdrop === "invisible",
		transitionDuration: _transitionDuration,
		keepMounted: _keepMounted,
		className: backdropClassName,
		style: backdropStyle,
		onMouseDown: onBackdropMouseDown,
		onClick: onBackdropClick,
		...backdropRest
	} = backdropProps ?? {};

	return (
		<>
			{disablePortal ? (
				<div ref={setInPlace} style={{ display: "contents" }} />
			) : null}
			<Dialog.Root
				disablePointerDismissal
				open={open}
				modal={behaviour.modal}
				onOpenChange={handleOpenChange}
				onOpenChangeComplete={(isOpen) => {
					if (!isOpen) {
						setHasExited(true);
					}
				}}
			>
				<Dialog.Portal
					ref={handleRootRef}
					keepMounted={keepMounted}
					container={portalContainer}
					role="presentation"
					className={cx(
						"gl-modal",
						!open && hasExited && "gl-modal-hidden",
						className,
					)}
					style={{
						zIndex: zIndex ?? "var(--z-modal, 1300)",
						// The root never takes the pointer: the backdrop and the content do, so
						// without a backdrop the page around the content stays clickable.
						pointerEvents: "none",
						...style,
					}}
					data-open={open ? "" : undefined}
				>
					{behaviour.backdrop === "none" ? null : (
						<Dialog.Backdrop
							forceRender
							aria-hidden="true"
							className={cx(
								"gl-backdrop",
								isInvisible && "gl-backdrop-invisible",
								backdropClassName,
							)}
							style={{ pointerEvents: "auto", ...backdropStyle }}
							{...backdropRest}
							onMouseDown={(event: React.MouseEvent<HTMLDivElement>) => {
								pressedBackdropRef.current =
									event.target === event.currentTarget;
								// Keep focus in the content rather than dropping it on body.
								if (behaviour.shouldEnforceFocus) {
									event.preventDefault();
								}

								onBackdropMouseDown?.(event);
							}}
							onClick={(event: React.MouseEvent<HTMLDivElement>) => {
								onBackdropClick?.(event);
								const wasPressedHere = pressedBackdropRef.current;
								pressedBackdropRef.current = false;
								if (
									wasPressedHere &&
									event.target === event.currentTarget &&
									isTopLayer(layer)
								) {
									onClose?.(event, "backdropClick");
								}
							}}
						/>
					)}
					<Dialog.Popup
						ref={popupRef}
						role="presentation"
						className="gl-modal-content"
						style={{ pointerEvents: "auto" }}
						initialFocus={initialFocus}
						finalFocus={finalFocus}
					>
						{children}
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
