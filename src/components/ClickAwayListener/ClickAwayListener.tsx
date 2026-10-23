"use client";
import * as React from "react";
import { isInside, ownerDocument } from "../../internal/dom.js";
import { useEventCallback, useForkRef } from "../../internal/hooks.js";

export type ClickAwayListenerProps = {
	children: React.ReactElement;
	onClickAway: (event: MouseEvent | TouchEvent | PointerEvent) => void;
	mouseEvent?:
		| "onClick"
		| "onPointerDown"
		| "onPointerUp"
		| "onMouseDown"
		| "onMouseUp"
		| false;
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
			if (node === null || !isActiveRef.current) {
				return;
			}

			const isFromInside =
				event.composedPath().includes(node) || isInside(node, event.target);
			if (!isFromInside) {
				onClickAway(event);
			}
		},
	);

	React.useEffect(() => {
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

	const childRef = React.isValidElement<ChildProps>(children)
		? children.props.ref
		: undefined;
	const ref = useForkRef(nodeRef, childRef);
	// eslint-disable-next-line @eslint-react/no-clone-element -- The listener adds its ref to the one child it wraps, as the reference does.
	return React.cloneElement(children as React.ReactElement<ChildProps>, {
		ref,
	});
}
