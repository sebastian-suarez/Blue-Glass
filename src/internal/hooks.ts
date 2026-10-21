/**
React helpers shared by the components, ported from design-system/shared/hooks.ts.
*/
import * as React from "react";

/**
The layout effect in the browser and a plain effect where there's no DOM, so server
rendering stays quiet.
*/
export const useIsoLayoutEffect: typeof React.useLayoutEffect =
	typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/**
Assigns a value to any kind of ref.
*/
export function setRef<T>(
	ref: React.Ref<T> | undefined,
	value: T | null,
): void {
	if (typeof ref === "function") {
		ref(value);
	} else if (ref) {
		ref.current = value;
	}
}

/**
Merges several refs into one callback ref. Its identity changes when a ref does, so React
detaches the old ref and attaches the new one, as with MUI's useForkRef.
*/
export function useForkRef<T>(
	...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> | undefined {
	return React.useMemo(
		() => {
			if (refs.every((ref) => ref === undefined || ref === null)) {
				return undefined;
			}

			return (instance: T | null) => {
				for (const ref of refs) {
					setRef(ref, instance);
				}
			};
		},
		// The refs are the dependencies, however many there are.
		// eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
		refs,
	);
}

/**
A callback whose identity never changes but always calls the latest function.
*/
export function useEventCallback<Arguments extends unknown[], Result>(
	callback: (...arguments_: Arguments) => Result,
): (...arguments_: Arguments) => Result {
	const latestRef = React.useRef(callback);
	useIsoLayoutEffect(() => {
		latestRef.current = callback;
	});
	return React.useCallback(
		(...arguments_: Arguments) => latestRef.current(...arguments_),
		[],
	);
}

/**
Controlled-or-uncontrolled state, MUI style: the mode is fixed at mount. When controlled,
the prop wins and the setter does nothing; the caller's onChange carries the new value.
*/
export function useControlled<T>(
	controlled: T | undefined,
	defaultValue: T,
): [T, (next: T) => void] {
	const [isControlled] = React.useState(controlled !== undefined);
	const [inner, setInner] = React.useState<T>(defaultValue);
	const value = isControlled ? (controlled as T) : inner;
	const setValue = React.useCallback(
		(next: T) => {
			if (!isControlled) {
				setInner(next);
			}
		},
		[isControlled],
	);
	return [value, setValue];
}

/**
A stable id: the caller's, or React's id prefixed "gl" and stripped to characters that need
no escaping in a CSS selector. The reference stripped only ":", which React 19 ids don't use.
*/
export function useId(idOverride?: string): string {
	const reactId = React.useId();
	return idOverride ?? `gl${reactId.replaceAll(/[^\w-]/gu, "")}`;
}

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void): () => void {
	if (typeof window === "undefined") {
		return () => undefined;
	}

	const query = window.matchMedia(reducedMotionQuery);
	query.addEventListener("change", callback);
	return () => {
		query.removeEventListener("change", callback);
	};
}

function isReducedMotionPreferred(): boolean {
	return (
		typeof window !== "undefined" &&
		window.matchMedia(reducedMotionQuery).matches
	);
}

/**
Whether to cut motion because the reader asks for reduced motion (the reference's
usePrefersReducedMotion). It updates live, and is false on the server.
*/
export function useShouldReduceMotion(): boolean {
	return React.useSyncExternalStore(
		subscribeToReducedMotion,
		isReducedMotionPreferred,
		() => false,
	);
}

/**
The value from the previous render where it differed, React's documented way to store
information from previous renders.
*/
export function usePrevious<T>(value: T): T | undefined {
	const [state, setState] = React.useState<{
		current: T;
		previous: T | undefined;
	}>({ current: value, previous: undefined });
	if (!Object.is(state.current, value)) {
		setState({ current: value, previous: state.current });
	}

	return state.previous;
}
