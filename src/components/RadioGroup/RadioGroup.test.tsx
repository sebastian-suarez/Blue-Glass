import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import "../../styles/index.css";
import { Radio, RadioGroup } from "./RadioGroup.js";

afterEach(() => {
	cleanup();
});
test("a Radio's ref and form attributes are the hidden input; the group's name and form win", () => {
	const ref = React.createRef<HTMLInputElement>();
	render(
		<>
			<form id="group-form" />
			<form id="own-form" />
			<RadioGroup name="stack" {...{ form: "group-form" }}>
				<Radio
					ref={ref}
					required
					readOnly
					value="rust"
					label="Rust"
					name="own"
					form="own-form"
					id="rust-input"
					title="Systems"
					data-contract="rust"
					aria-describedby="rust-help"
				/>
			</RadioGroup>
			<span id="rust-help">A daemon.</span>
		</>,
	);
	const control = screen.getByRole("radio");
	expect(control.tagName).toBe("SPAN");
	expect(ref.current).toHaveAttribute("aria-hidden", "true");
	expect(ref.current?.tabIndex).toBe(-1);
	expect(ref.current?.name).toBe("stack");
	expect(ref.current?.value).toBe("rust");
	expect(ref.current?.form?.id).toBe("group-form");
	expect(ref.current?.id).toBe("rust-input");
	expect(ref.current?.required).toBe(true);
	expect(ref.current?.readOnly).toBe(true);
	expect(control).toHaveAttribute("title", "Systems");
	expect(control).toHaveAttribute("data-contract", "rust");
	expect(control).toHaveAccessibleDescription("A daemon.");
	expect(ref.current).not.toHaveAttribute("data-contract");
});
test("focus and blur target the span, and focusing the input forwards focus", async () => {
	const ref = React.createRef<HTMLInputElement>();
	const seen: Array<[string, EventTarget]> = [];
	render(
		<>
			<Radio
				ref={ref}
				value="rust"
				label="Rust"
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
	const radio = screen.getByRole("radio");
	ref.current?.focus();
	expect(radio).toHaveFocus();
	await userEvent.tab();
	expect(seen).toEqual([
		["focus", radio],
		["blur", radio],
	]);
});
test("the Radio and group receive the same change wrapper in order, with the checked input as its targets", async () => {
	const ref = React.createRef<HTMLInputElement>();
	const events: Array<React.ChangeEvent<HTMLInputElement>> = [];
	const order: string[] = [];
	const capture = (event: React.ChangeEvent<HTMLInputElement>) => {
		events.push(event);
		expect(event.type).toBe("change");
		expect(event.target).toBe(ref.current);
		expect(event.currentTarget).toBe(ref.current);
		expect(event.target.checked).toBe(true);
		expect(event.nativeEvent).toBeInstanceOf(Event);
	};

	render(
		<RadioGroup
			name="stack"
			onChange={(event, value) => {
				capture(event);
				order.push(value);
			}}
		>
			<Radio
				ref={ref}
				value="rust"
				label="Rust"
				onChange={(event, checked) => {
					capture(event);
					order.push(String(checked));
				}}
			/>
		</RadioGroup>,
	);
	await userEvent.click(screen.getByRole("radio"));
	expect(order).toEqual(["true", "rust"]);
	expect(events[0]).toBe(events[1]);
});
test("a lone Radio supports controlled and initial checked state, callbacks and form submission", async () => {
	const form = React.createRef<HTMLFormElement>();
	const ref = React.createRef<HTMLInputElement>();
	const changes: boolean[] = [];
	const view = render(
		<form ref={form}>
			<Radio
				ref={ref}
				required
				checked={false}
				name="channel"
				value="email"
				label="Email"
				onChange={(_event, checked) => {
					changes.push(checked);
				}}
			/>
			<Radio defaultChecked name="preset" value="yes" label="Preset" />
		</form>,
	);
	expect(form.current?.checkValidity()).toBe(false);
	await userEvent.click(screen.getByRole("radio", { name: "Email" }));
	expect(changes).toEqual([true]);
	expect(ref.current?.checked).toBe(false);
	view.rerender(
		<form ref={form}>
			<Radio
				ref={ref}
				checked
				required
				name="channel"
				value="email"
				label="Email"
			/>
			<Radio defaultChecked name="preset" value="yes" label="Preset" />
		</form>,
	);
	expect(form.current?.checkValidity()).toBe(true);
	expect([...new FormData(form.current!)]).toEqual([
		["channel", "email"],
		["preset", "yes"],
	]);
	expect(screen.queryByRole("radiogroup")).toBeNull();
});
test("lone radios that share a name stay independent, the recorded one-radio group gap", async () => {
	render(
		<>
			<Radio defaultChecked name="shared" value="a" label="A" />
			<Radio name="shared" value="b" label="B" />
		</>,
	);
	await userEvent.click(screen.getByRole("radio", { name: "B" }));
	expect(screen.getByRole("radio", { name: "A" })).toBeChecked();
	expect(screen.getByRole("radio", { name: "B" })).toBeChecked();
});
