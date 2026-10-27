import * as React from "react";

export const useIsoLayoutEffect: typeof React.useLayoutEffect =
	typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

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

function attach<T>(ref: React.Ref<T> | undefined, instance: T): () => void {
	if (typeof ref === "function") {
		const cleanup = ref(instance);
		return () => {
			if (typeof cleanup === "function") {
				cleanup();
			} else {
				ref(null);
			}
		};
	}

	if (ref) {
		ref.current = instance;
		return () => {
			ref.current = null;
		};
	}

	return () => undefined;
}

export function useForkRef<T>(
	...refs: Array<React.Ref<T> | undefined>
): React.RefCallback<T> | undefined {
	return React.useMemo(
		() => {
			if (refs.every((ref) => ref === undefined || ref === null)) {
				return undefined;
			}

			return (instance: T) => {
				const detachers = refs.map((ref) => attach(ref, instance));
				return () => {
					for (const detach of detachers) {
						detach();
					}
				};
			};
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
		refs,
	);
}

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

export function useShouldReduceMotion(): boolean {
	return React.useSyncExternalStore(
		subscribeToReducedMotion,
		isReducedMotionPreferred,
		() => false,
	);
}

export function usePrevious<T>(value: T): T | undefined {
	const previousRef = React.useRef<T | undefined>(undefined);
	React.useEffect(() => {
		previousRef.current = value;
	});
	// eslint-disable-next-line react-hooks/refs
	return previousRef.current;
}
