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

test("usePrevious returns the value before the last change", () => {
	const { result, rerender } = renderHook(
		({ value }: { value: number }) => usePrevious(value),
		{ initialProps: { value: 1 } },
	);
	expect(result.current).toBeUndefined();
	rerender({ value: 2 });
	expect(result.current).toBe(1);
	rerender({ value: 2 });
	expect(result.current).toBe(1);
});
