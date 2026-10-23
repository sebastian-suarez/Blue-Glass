import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "../../styles/index.css";
import { Switch } from "./Switch.js";

afterEach(() => {
	cleanup();
});
test("the ref is the hidden input, whose focus goes to the span; focus and blur report the span", async () => {
	const ref = React.createRef<HTMLInputElement>();
	const seen: Array<[string, EventTarget]> = [];
	render(
		<>
			<Switch
				ref={ref}
				label="News"
				onFocus={(event) => {
					seen.push([event.type, event.target]);
				}}
				onBlur={(event) => {
					seen.push([event.type, event.target]);
				}}
			/>
			<button type="button">After</button>
		</>,
	);
	const control = screen.getByRole("switch", { name: "News" });
	expect(control.tagName).toBe("SPAN");
	expect(ref.current).toBeInstanceOf(HTMLInputElement);
	expect(ref.current).toHaveAttribute("aria-hidden", "true");
	expect(ref.current?.tabIndex).toBe(-1);
	ref.current?.focus();
	expect(control).toHaveFocus();
	await userEvent.tab();
	expect(seen).toEqual([
		["focus", control],
		["blur", control],
	]);
});
test("change wrappers carry the new checked state and the hidden input as both targets, and can cancel consecutive presses", async () => {
	const ref = React.createRef<HTMLInputElement>();
	const seen: Array<[string, EventTarget, EventTarget, boolean, boolean]> = [];
	const onChange = vi.fn(
		(event: React.ChangeEvent<HTMLInputElement>, isChecked: boolean) => {
			seen.push([
				event.type,
				event.target,
				event.currentTarget,
				event.target.checked,
				isChecked,
			]);
			expect(event.nativeEvent).toBeInstanceOf(MouseEvent);
			event.preventDefault();
		},
	);
	render(<Switch ref={ref} label="News" onChange={onChange} />);
	await userEvent.click(screen.getByRole("switch"));
	await userEvent.click(screen.getByRole("switch"));
	expect(seen).toEqual([
		["change", ref.current, ref.current, true, true],
		["change", ref.current, ref.current, true, true],
	]);
	expect(ref.current?.checked).toBe(false);
});
test("input attributes stay on the input, while ARIA, data, title and handlers go to the span", () => {
	const ref = React.createRef<HTMLInputElement>();
	render(
		<>
			<form id="contract-form" />
			<Switch
				ref={ref}
				required
				readOnly
				label="Terms"
				id="terms-input"
				name="terms"
				value="yes"
				form="contract-form"
				aria-describedby="contract-help"
				aria-invalid="true"
				data-contract="terms"
				title="Terms title"
			/>
			<span id="contract-help">Please read.</span>
		</>,
	);
	const control = screen.getByRole("switch");
	expect(ref.current?.name).toBe("terms");
	expect(ref.current?.value).toBe("yes");
	expect(ref.current?.required).toBe(true);
	expect(ref.current?.readOnly).toBe(true);
	expect(ref.current?.id).toBe("terms-input");
	expect(ref.current?.form?.id).toBe("contract-form");
	expect(ref.current).not.toHaveAttribute("data-contract");
	expect(control).toHaveAttribute("data-contract", "terms");
	expect(control).toHaveAttribute("title", "Terms title");
	expect(control).toHaveAccessibleDescription("Please read.");
	expect(control).toHaveAttribute("aria-invalid", "true");
});
test("required still validates and FormData contains a checked control's value", async () => {
	const ref = React.createRef<HTMLInputElement>();
	const form = React.createRef<HTMLFormElement>();
	render(
		<form ref={form}>
			<Switch ref={ref} required name="terms" value="yes" label="Terms" />
		</form>,
	);
	expect(ref.current?.validity.valueMissing).toBe(true);
	expect(form.current?.checkValidity()).toBe(false);
	expect([...new FormData(form.current!)]).toEqual([]);
	await userEvent.click(screen.getByRole("switch"));
	expect(form.current?.checkValidity()).toBe(true);
	expect([...new FormData(form.current!)]).toEqual([["terms", "yes"]]);
});
