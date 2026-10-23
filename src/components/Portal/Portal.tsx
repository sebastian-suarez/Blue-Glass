"use client";
import type * as React from "react";
import { createPortal } from "react-dom";
import { useIsHydrating } from "../../internal/transition.js";

export type PortalProps = {
	children?: React.ReactNode;
	container?: Element | (() => Element | null) | null;
	disablePortal?: boolean;
};

function resolveContainer(container: PortalProps["container"]): Element {
	const node = typeof container === "function" ? container() : container;
	return node ?? document.body;
}

export function Portal({
	children,
	container,
	disablePortal = false,
}: PortalProps): React.ReactElement | null {
	const isHydrating = useIsHydrating();
	if (disablePortal) {
		return <>{children}</>;
	}

	return isHydrating
		? null
		: createPortal(children, resolveContainer(container));
}
