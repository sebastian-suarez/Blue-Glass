/* eslint-disable unicorn/filename-case -- The module and its folder carry the documented hook's name, useMediaQuery. */
"use client";
/**
The useMediaQuery hook and the site's media queries, ported from
design-system/components/useMediaQuery/reference.tsx.

It refines behaviour after hydration only: the server HTML and the hydration that adopts it read
`defaultMatches`, so layout that depends on the viewport belongs in CSS media queries.
*/
import * as React from "react";

/**
The site's own breakpoints (global.css): phones at 700px and below, the one-column layout at
899px and below, desktop from 900px, compact desktop at 1000px and below, tiny phones at 360px
and below; plus the input and preference queries the site gates behaviour on.
*/
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
	/**
	Value before the first browser read (server render). Default false.
	*/
	defaultMatches?: boolean;
};

const mediaPrefix = /^@media\s*/iu;

/**
The query's live list, or undefined with no browser to ask: on the server, or in a DOM stand-in
without matchMedia, such as jsdom.
*/
function mediaQueryList(query: string): MediaQueryList | undefined {
	return typeof window !== "undefined" && "matchMedia" in window
		? window.matchMedia(query)
		: undefined;
}

/**
Live boolean for a CSS media query, e.g. useMediaQuery(media.phone). A leading "@media" is
dropped. A client render reads the browser from its first render; server rendering and hydration
start from `defaultMatches`, then hydration moves to the live value.
*/
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
