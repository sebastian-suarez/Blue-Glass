"use client";
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
	modal: "trap-focus" | false;
	shouldEnforceFocus: boolean;
	shouldLockScroll: boolean;
	backdrop: "visible" | "invisible" | "none";
	shouldCloseOnEscape: boolean;
	shouldAutoFocus: boolean;
	shouldRestoreFocus: boolean;
};

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
	rootRef: React.RefObject<HTMLElement | null>;
};

const openLayers: Layer[] = [];

const pageHiders = new WeakSet<Layer>();

export function isTopLayer(layer: Layer): boolean {
	return openLayers.at(-1) === layer;
}

export function isInTopLayer(element: Element): boolean {
	return isInside(openLayers.at(-1)?.rootRef.current, element);
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

function fallbackFocusTarget(
	content: HTMLElement,
	edge: "first" | "last",
): HTMLElement {
	const items = getFocusable(content);
	const item = edge === "first" ? items[0] : items.at(-1);
	const surface = findSurface(content);
	return item ?? (surface ? ensureFocusable(surface) : content);
}

function focusEdge(content: HTMLElement | null, edge: "first" | "last"): void {
	if (content) {
		fallbackFocusTarget(content, edge).focus({ preventScroll: true });
	}
}

const hiddenHere = new Set<Element>();

function shouldStayExposed(element: Element): boolean {
	return (
		element.localName === "script" ||
		element.localName === "style" ||
		element.hasAttribute("aria-live")
	);
}

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

function TabSentinel({
	edge,
	onFocus,
}: {
	readonly edge: "start" | "end";
	readonly onFocus: () => void;
}) {
	// eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
	return <div tabIndex={0} data-gl-sentinel={edge} onFocus={onFocus} />;
}

function isTransitionElement(
	node: React.ReactNode,
): node is React.ReactElement<TransitionOptions> {
	return (
		React.isValidElement(node) &&
		typeof node.type !== "string" &&
		(node.type as { __glTransition?: unknown }).__glTransition === true
	);
}

export type ModalBackdropProps = Partial<BackdropProps>;

export type ModalLayerProps = ModalFlags & {
	open: boolean;
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: ModalCloseReason,
	) => void;
	children: React.ReactElement;
	keepMounted?: boolean;
	disablePortal?: boolean;
	container?: Element | (() => Element | null) | null;
	BackdropProps?: Partial<ModalBackdropProps>;
	className?: string;
	style?: React.CSSProperties;
	zIndex?: string | number;
	ref?: React.Ref<HTMLDivElement>;
	root?: "dialog" | "drawer";
};

type ChangeEventDetails =
	Dialog.Root.ChangeEventDetails | Drawer.Root.ChangeEventDetails;

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
		? // eslint-disable-next-line @eslint-react/no-clone-element
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

export function useStackEntry(
	isOpen: boolean,
	layer: Layer,
): React.RefObject<Element | null> {
	const openerRef = React.useRef<Element | null>(null);
	useIsoLayoutEffect(() => {
		if (!isOpen) {
			return undefined;
		}

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

const handledEscapes = new WeakSet<KeyboardEvent>();

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
	return typeof container === "function"
		? resolved
		: ((container ?? undefined) as HTMLElement | undefined);
}

export type BackdropPress = {
	onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
	onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
};

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

function getRootProps(
	props: Pick<ModalLayerProps, "open" | "className" | "style" | "zIndex">,
	hasExited: boolean,
) {
	const rootStyle: React.CSSProperties = {
		zIndex: props.zIndex ?? "var(--z-modal, 1300)",
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

	const reportCloseRequest = useEventCallback((event: Event) => {
		if (!open || !behaviour.shouldCloseOnEscape || !isTopLayer(layer)) {
			return;
		}

		const contentElement = contentRef.current;
		onClose?.(
			toSyntheticEvent(
				event,
				findSurface(contentElement) ?? contentElement ?? undefined,
			),
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
				details.cancel();
				return;
			}

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
