"use client";
/**
ClickAwayListener, ported from design-system/components/ClickAwayListener/reference.tsx: it
listens on its child's document for the press events chosen, and calls onClickAway with the DOM
event when one lands outside the child. Outside follows the DOM, so a press in a portal the child
renders is outside it.

The press that mounts it never counts: listening starts a tick after mount. The press's own
event can still be on its way up to the document when React mounts the listener (a click that
opens a panel with mouseEvent="onClick" reaches the new listener), so until then every event is
ignored.
*/
import * as React from "react";
import { isInside, ownerDocument } from "../../internal/dom.js";
import { useEventCallback, useForkRef } from "../../internal/hooks.js";

export type ClickAwayListenerProps = {
	/**
	One element that can hold a ref.
	*/
	children: React.ReactElement;
	onClickAway: (event: MouseEvent | TouchEvent | PointerEvent) => void;
	/**
	Event that counts as a click. Default "onPointerDown". false to ignore mouse.
	*/
	mouseEvent?:
		| "onClick"
		| "onPointerDown"
		| "onPointerUp"
		| "onMouseDown"
		| "onMouseUp"
		| false;
	/**
	Default "onTouchEnd". false to ignore touch.
	*/
	touchEvent?: "onTouchStart" | "onTouchEnd" | false;
};

const domEvents = {
	onClick: "click",
	onPointerDown: "pointerdown",
	onPointerUp: "pointerup",
	onMouseDown: "mousedown",
	onMouseUp: "mouseup",
	onTouchStart: "touchstart",
	onTouchEnd: "touchend",
} as const;

type ChildProps = { ref?: React.Ref<Element> };

/**
Calls onClickAway when a press lands outside its child. Ignores the press that mounted it.
*/
export function ClickAwayListener({
	children,
	onClickAway,
	mouseEvent = "onPointerDown",
	touchEvent = "onTouchEnd",
}: ClickAwayListenerProps): React.ReactElement {
	const nodeRef = React.useRef<Element | null>(null);
	const isActiveRef = React.useRef(false);
	const handleEvent = useEventCallback(
		(event: MouseEvent | TouchEvent | PointerEvent) => {
			const node = nodeRef.current;
			if (!isActiveRef.current || node === null) {
				return;
			}

			// The composed path also sees through shadow roots.
			const isFromInside =
				event.composedPath().includes(node) || isInside(node, event.target);
			if (!isFromInside) {
				onClickAway(event);
			}
		},
	);

	React.useEffect(() => {
		// Wait a tick, so the event that mounted it has passed.
		const timer = setTimeout(() => {
			isActiveRef.current = true;
		}, 0);
		const types = [
			mouseEvent === false ? undefined : domEvents[mouseEvent],
			touchEvent === false ? undefined : domEvents[touchEvent],
		].filter((type) => type !== undefined);
		const document_ = ownerDocument(nodeRef.current);
		for (const type of types) {
			document_.addEventListener(type, handleEvent);
		}

		return () => {
			clearTimeout(timer);
			isActiveRef.current = false;
			for (const type of types) {
				document_.removeEventListener(type, handleEvent);
			}
		};
	}, [mouseEvent, touchEvent, handleEvent]);

	// React 19 keeps an element's ref in its props; the child keeps its own.
	const childRef = React.isValidElement<ChildProps>(children)
		? children.props.ref
		: undefined;
	const ref = useForkRef(nodeRef, childRef);
	// eslint-disable-next-line @eslint-react/no-clone-element -- The listener adds its ref to the one child it wraps, as the reference does.
	return React.cloneElement(children as React.ReactElement<ChildProps>, {
		ref,
	});
}
