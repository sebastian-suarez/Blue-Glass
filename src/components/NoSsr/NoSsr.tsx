"use client";
/**
NoSsr, ported from design-system/components/NoSsr/reference.tsx: its children render only in the
browser, after it has mounted, and the fallback until then. On the server, and while hydrating,
it renders the fallback, so the server HTML and the first client render agree; a layout effect
then swaps in the children before the browser paints, or a frame later with `defer`.
*/
import * as React from "react";
import { useIsoLayoutEffect } from "../../internal/hooks.js";

export type NoSsrProps = {
	children?: React.ReactNode;
	/**
	Wait one more frame after mount before rendering (heavy children).
	*/
	defer?: boolean;
	/**
	Rendered until the children mount.
	*/
	fallback?: React.ReactNode;
};

/**
Renders its children only in the browser, after mount: for anything that reads window or the DOM.
*/
export function NoSsr({
	children,
	defer = false,
	fallback = null,
}: NoSsrProps): React.ReactElement {
	const [isMounted, setIsMounted] = React.useState(false);
	useIsoLayoutEffect(() => {
		if (!defer) {
			setIsMounted(true);
		}
	}, [defer]);
	React.useEffect(() => {
		if (!defer) {
			return undefined;
		}

		const frame = requestAnimationFrame(() => {
			setIsMounted(true);
		});
		return () => {
			cancelAnimationFrame(frame);
		};
	}, [defer]);
	return <>{isMounted ? children : fallback}</>;
}
