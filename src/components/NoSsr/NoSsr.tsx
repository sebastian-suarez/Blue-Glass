"use client";
import * as React from "react";
import { useIsoLayoutEffect } from "../../internal/hooks.js";

export type NoSsrProps = {
	children?: React.ReactNode;
	defer?: boolean;
	fallback?: React.ReactNode;
};

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
