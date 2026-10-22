"use client";
/**
Portal, ported from design-system/components/Portal/reference.tsx: ReactDOM's createPortal into
document.body or a container, or the children in place with disablePortal.

The change is for server HTML and islands. The reference renders nothing on the server, but
portals as soon as it hydrates, so React finds the child where the server HTML has nothing and
reports a hydration error (docs/reference-defects.md). Here the server render and the hydration
that adopts it both render nothing, and the children portal on the render after: useIsHydrating
reads true for both, then React renders again with false. A client-side mount portals on its
first render, as the reference does.
*/
import type * as React from "react";
import { createPortal } from "react-dom";
import { useIsHydrating } from "../../internal/transition.js";

export type PortalProps = {
	children?: React.ReactNode;
	/**
	Mount point. Default document.body.
	*/
	container?: Element | (() => Element | null) | null;
	/**
	Render in place instead.
	*/
	disablePortal?: boolean;
};

/**
The mount point: the container, or what its function returns, else body. A function is asked on
every render, as the reference asks it, so one that reads a ref finds the element once it exists.
*/
function resolveContainer(container: PortalProps["container"]): Element {
	const node = typeof container === "function" ? container() : container;
	return node ?? document.body;
}

/**
Render children into another part of the DOM (default document.body). Renders nothing without a DOM.
*/
export function Portal({
	children,
	container,
	disablePortal = false,
}: PortalProps): React.ReactElement | null {
	const isHydrating = useIsHydrating();
	if (disablePortal) {
		return <>{children}</>;
	}

	// Neither the server render nor hydration gets past here, so neither touches the DOM.
	if (isHydrating) {
		return null;
	}

	return createPortal(children, resolveContainer(container));
}
