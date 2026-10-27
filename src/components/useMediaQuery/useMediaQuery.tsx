/* eslint-disable unicorn/filename-case -- The module and its folder carry the documented hook's name, useMediaQuery. */
"use client";
import * as React from "react";

export const media = {
	tiny: "(max-width: 360px)",
	phone: "(max-width: 700px)",
	tablet: "(max-width: 899px)",
	desktop: "(min-width: 900px)",
	compact: "(max-width: 1000px)",
	hover: "(hover: hover) and (pointer: fine)",
	reducedMotion: "(prefers-reduced-motion: reduce)",
	reducedTransparency: "(prefers-reduced-transparency: reduce)",
} as const;

export type UseMediaQueryOptions = {
	defaultMatches?: boolean;
};

const mediaPrefix = /^@media\s*/iu;

function mediaQueryList(query: string): MediaQueryList | undefined {
	return typeof window !== "undefined" && "matchMedia" in window
		? window.matchMedia(query)
		: undefined;
}

// eslint-disable-next-line unicorn/consistent-boolean-name -- The documented name.
export function useMediaQuery(
	query: string,
	options: UseMediaQueryOptions = {},
): boolean {
	const { defaultMatches = false } = options;
	const mediaQuery = query.replace(mediaPrefix, "");
	const subscribe = React.useCallback(
		(onChange: () => void) => {
			const list = mediaQueryList(mediaQuery);
			list?.addEventListener("change", onChange);
			return () => {
				list?.removeEventListener("change", onChange);
			};
		},
		[mediaQuery],
	);
	const getSnapshot = React.useCallback(
		() => mediaQueryList(mediaQuery)?.matches ?? defaultMatches,
		[mediaQuery, defaultMatches],
	);
	const getServerSnapshot = React.useCallback(
		() => defaultMatches,
		[defaultMatches],
	);
	return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
