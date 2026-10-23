import { act, render, renderHook } from "@testing-library/react";
import * as React from "react";
import { expect, test } from "vitest";
import { useControlled, useForkRef, useId, usePrevious } from "./hooks.js";

test("useId gives ids that work as CSS selectors", () => {
	function Labelled() {
		const id = useId();
		return <span id={id}>Hello</span>;
	}

	const { container } = render(<Labelled />);
	const span = container.querySelector("span");
	expect(span?.id).toMatch(/^gl[\w-]+$/u);
	expect(document.querySelector(`#${span?.id ?? ""}`)).toBe(span);
});

test("useId keeps the caller's id", () => {
	const { result } = renderHook(() => useId("contact-email"));
	expect(result.current).toBe("contact-email");
});

test("useControlled: the prop wins when controlled", () => {
	const { result, rerender } = renderHook(
		({ value }: { value: string | undefined }) => useControlled(value, "a"),
		{ initialProps: { value: "b" } },
	);
	act(() => {
		result.current[1]("c");
	});
	expect(result.current[0]).toBe("b");
	rerender({ value: "d" });
	expect(result.current[0]).toBe("d");
});

test("useControlled: the inner state moves when uncontrolled", () => {
	const { result } = renderHook(() => useControlled<string>(undefined, "a"));
	act(() => {
		result.current[1]("c");
	});
	expect(result.current[0]).toBe("c");
});

test("useForkRef sets every ref", () => {
	const objectRef = React.createRef<HTMLDivElement>();
	let fromCallback: HTMLDivElement | null = null;
	function Forked() {
		const ref = useForkRef<HTMLDivElement>(objectRef, (node) => {
			fromCallback = node;
		});
		return <div ref={ref} />;
	}

	render(<Forked />);
	expect(objectRef.current).toBeInstanceOf(HTMLDivElement);
	expect(fromCallback).toBe(objectRef.current);
});

test("usePrevious returns the previous render's value, as the reference's does", () => {
	const { result, rerender } = renderHook(
		({ value }: { value: number }) => usePrevious(value),
		{ initialProps: { value: 1 } },
	);
	expect(result.current).toBeUndefined();
	rerender({ value: 2 });
	expect(result.current).toBe(1);
	rerender({ value: 2 });
	expect(result.current).toBe(2);
});

function loggingRef(log: string[]) {
	return (node: HTMLDivElement | null) => {
		log.push(node === null ? "null" : "attach");
		return () => {
			log.push("cleanup");
		};
	};
}

test("useForkRef runs a callback ref's cleanup on unmount, and nulls object refs", () => {
	const log: string[] = [];
	const callbackRef = loggingRef(log);
	const objectRef = React.createRef<HTMLDivElement>();
	function Forked() {
		const ref = useForkRef<HTMLDivElement>(objectRef, callbackRef);
		return <div ref={ref} />;
	}

	const { unmount } = render(<Forked />);
	expect(log).toEqual(["attach"]);
	expect(objectRef.current).toBeInstanceOf(HTMLDivElement);
	unmount();
	expect(log).toEqual(["attach", "cleanup"]);
	expect(objectRef.current).toBeNull();
});

test("useForkRef detaches the old ref with its cleanup when a ref changes", () => {
	const first: string[] = [];
	const second: string[] = [];
	const firstRef = loggingRef(first);
	const secondRef = loggingRef(second);
	function Forked({ which }: { which: "first" | "second" }) {
		const ref = useForkRef<HTMLDivElement>(
			which === "first" ? firstRef : secondRef,
		);
		return <div ref={ref} />;
	}

	const { rerender } = render(<Forked which="first" />);
	rerender(<Forked which="second" />);
	expect(first).toEqual(["attach", "cleanup"]);
	expect(second).toEqual(["attach"]);
});

test("useForkRef calls a callback ref without a cleanup with null on detach", () => {
	const log: string[] = [];
	const legacyRef = (node: HTMLDivElement | null) => {
		log.push(node === null ? "null" : "attach");
	};

	function Forked() {
		const ref = useForkRef<HTMLDivElement>(legacyRef);
		return <div ref={ref} />;
	}

	const { unmount } = render(<Forked />);
	unmount();
	expect(log).toEqual(["attach", "null"]);
});
