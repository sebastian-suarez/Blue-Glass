import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import {
	type ControlChangeHandler,
	type SwitchControlProps,
	CheckboxControl,
	RadioControl,
	RadioGroupControl,
	SwitchControl,
} from "./form-control.js";

afterEach(() => {
	cleanup();
});

// The ports' CSS draws the control; without it the span has no size, and Playwright won't press
// an element it can't see.
const box: React.CSSProperties = {
	display: "inline-block",
	width: 20,
	height: 20,
};

type ChangeCall<Value> = {
	target: EventTarget;
	currentTarget: EventTarget;
	type: string;
	isNative: boolean;
	inputChecked: boolean;
	value: Value;
};

/**
Records what onChange saw at call time: the input's state then, not after.
*/
function recorder<Value>() {
	const calls: Array<ChangeCall<Value>> = [];
	const onChange = vi.fn<ControlChangeHandler<Value>>((event, value) => {
		calls.push({
			target: event.target,
			currentTarget: event.currentTarget,
			type: event.type,
			isNative: event.nativeEvent instanceof Event,
			inputChecked: event.target.checked,
			value,
		});
	});
	return { calls, onChange };
}

function entries(form: HTMLFormElement): Array<[string, string]> {
	return [...new FormData(form)].map(([key, value]) => [
		key,
		typeof value === "string" ? value : value.name,
	]);
}

function getForm(): HTMLFormElement {
	const form = document.querySelector("form");
	if (!form) {
		throw new Error("the form is missing");
	}

	return form;
}

function preventSubmit(event: React.SyntheticEvent) {
	event.preventDefault();
}

const checkedControls = [
	{ kind: "Checkbox", role: "checkbox", Control: CheckboxControl },
	{ kind: "Switch", role: "switch", Control: SwitchControl },
] satisfies Array<{
	kind: string;
	role: string;
	Control: (props: SwitchControlProps) => React.ReactNode;
}>;

describe.each(checkedControls)("$kind", ({ role, Control }) => {
	test("the ref is Base UI's hidden input, and focusing it focuses the control", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Control ref={ref} name="news" aria-label="News" style={box} />);
		const input = ref.current;
		expect(input).toBeInstanceOf(HTMLInputElement);
		expect(input?.type).toBe("checkbox");
		expect(input?.getAttribute("aria-hidden")).toBe("true");
		expect(input?.tabIndex).toBe(-1);
		const control = screen.getByRole(role);
		expect(control.tagName).toBe("SPAN");
		input?.focus();
		expect(document.activeElement).toBe(control);
	});

	test("FormData has name=value when checked and nothing when not", async () => {
		render(
			<form>
				<Control name="terms" value="yes" aria-label="Terms" style={box} />
				<Control name="news" aria-label="News" style={box} />
			</form>,
		);
		const form = getForm();
		expect(entries(form)).toEqual([]);
		await userEvent.click(screen.getByRole(role, { name: "Terms" }));
		await userEvent.click(screen.getByRole(role, { name: "News" }));
		expect(entries(form)).toEqual([
			["terms", "yes"],
			["news", "on"],
		]);
		await userEvent.click(screen.getByRole(role, { name: "Terms" }));
		expect(entries(form)).toEqual([["news", "on"]]);
	});

	test("required blocks submission and reports validity", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const onSubmit = vi.fn(preventSubmit);
		render(
			<form onSubmit={onSubmit}>
				<Control
					ref={ref}
					required
					name="terms"
					aria-label="Terms"
					style={box}
				/>
				<button type="submit">Send</button>
			</form>,
		);
		expect(ref.current?.required).toBe(true);
		expect(ref.current?.validity.valueMissing).toBe(true);
		expect(getForm().checkValidity()).toBe(false);
		await userEvent.click(screen.getByRole("button", { name: "Send" }));
		expect(onSubmit).not.toHaveBeenCalled();
		await userEvent.click(screen.getByRole(role, { name: "Terms" }));
		expect(ref.current?.validity.valid).toBe(true);
		await userEvent.click(screen.getByRole("button", { name: "Send" }));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	test("onChange gets a ChangeEvent-shaped wrapper on the input, with the new checked value", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const { calls, onChange } = recorder<boolean>();
		render(
			<Control
				ref={ref}
				name="news"
				aria-label="News"
				style={box}
				onChange={onChange}
			/>,
		);
		await userEvent.click(screen.getByRole(role));
		await userEvent.click(screen.getByRole(role));
		expect(calls).toEqual([
			{
				target: ref.current,
				currentTarget: ref.current,
				type: "change",
				isNative: true,
				inputChecked: true,
				value: true,
			},
			{
				target: ref.current,
				currentTarget: ref.current,
				type: "change",
				isNative: true,
				inputChecked: false,
				value: false,
			},
		]);
	});

	test("preventDefault in onChange cancels the change", async () => {
		const ref = React.createRef<HTMLInputElement>();
		render(
			<Control
				ref={ref}
				name="news"
				aria-label="News"
				style={box}
				onChange={(event) => {
					event.preventDefault();
				}}
			/>,
		);
		await userEvent.click(screen.getByRole(role));
		expect(screen.getByRole(role).getAttribute("aria-checked")).toBe("false");
		expect(ref.current?.checked).toBe(false);
	});

	test("Space toggles", async () => {
		const { calls, onChange } = recorder<boolean>();
		render(
			<Control name="news" aria-label="News" style={box} onChange={onChange} />,
		);
		await userEvent.tab();
		expect(document.activeElement).toBe(screen.getByRole(role));
		await userEvent.keyboard("[Space]");
		expect(screen.getByRole(role).getAttribute("aria-checked")).toBe("true");
		await userEvent.keyboard("[Space]");
		expect(screen.getByRole(role).getAttribute("aria-checked")).toBe("false");
		expect(calls.map((call) => call.value)).toEqual([true, false]);
	});

	test("a wrapping label and an htmlFor label toggle it", async () => {
		render(
			<>
				{/* The rule can't tell that Control is a form control. */}
				{/* eslint-disable-next-line jsx-a11y-x/label-has-associated-control */}
				<label>
					<Control name="wrapped" style={box} />
					Wrapped
				</label>
				<label htmlFor="sibling-control">Sibling</label>
				<Control id="sibling-control" name="sibling" style={box} />
			</>,
		);
		await userEvent.click(screen.getByText("Wrapped"));
		await userEvent.click(screen.getByText("Sibling"));
		expect(screen.getByRole(role, { name: "Wrapped" }).ariaChecked).toBe(
			"true",
		);
		expect(screen.getByRole(role, { name: "Sibling" }).ariaChecked).toBe(
			"true",
		);
	});

	test("focus and blur fire on the span", async () => {
		const targets: string[] = [];
		render(
			<>
				<Control
					name="news"
					aria-label="News"
					style={box}
					onFocus={(event) => {
						targets.push(`focus:${event.target.tagName}`);
					}}
					onBlur={(event) => {
						targets.push(`blur:${event.target.tagName}`);
					}}
				/>
				<button type="button">After</button>
			</>,
		);
		await userEvent.tab();
		await userEvent.tab();
		expect(targets).toEqual(["focus:SPAN", "blur:SPAN"]);
	});

	test("attributes go to the input where Base UI takes them, and to the span otherwise", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(
			<>
				<form id="outer-form" />
				<Control
					ref={ref}
					required
					name="terms"
					value="yes"
					form="outer-form"
					id="terms-input"
					aria-describedby="terms-help"
					aria-label="Terms"
					aria-invalid="true"
					data-test="control"
					title="Terms title"
					className="extra"
					style={box}
				/>
				<span id="terms-help">Help</span>
			</>,
		);
		const input = ref.current;
		const control = screen.getByRole(role);
		expect(input?.name).toBe("terms");
		expect(input?.value).toBe("yes");
		expect(input?.required).toBe(true);
		expect(input?.form).toBe(document.querySelector("#outer-form"));
		expect(input?.id).toBe("terms-input");
		expect(control.getAttribute("aria-describedby")).toBe("terms-help");
		expect(control.getAttribute("aria-invalid")).toBe("true");
		expect(control.dataset.test).toBe("control");
		expect(control.title).toBe("Terms title");
		expect(control.classList.contains("extra")).toBe(true);
		expect(input?.hasAttribute("aria-describedby")).toBe(false);
		expect(input?.hasAttribute("data-test")).toBe(false);
	});

	test("disabled reaches the input and stops changes", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const { onChange } = recorder<boolean>();
		render(
			<Control
				ref={ref}
				disabled
				name="news"
				aria-label="News"
				style={box}
				onChange={onChange}
			/>,
		);
		expect(ref.current?.disabled).toBe(true);
		await userEvent.click(screen.getByRole(role), { force: true });
		expect(onChange).not.toHaveBeenCalled();
	});

	test("autoFocus focuses the span on mount", () => {
		render(
			// The documented autoFocus is what's under test.
			// eslint-disable-next-line jsx-a11y-x/no-autofocus
			<Control autoFocus name="news" aria-label="News" style={box} />,
		);
		expect(document.activeElement).toBe(screen.getByRole(role));
	});
});

test("Checkbox: indeterminate sets the input's property and aria-checked=mixed", () => {
	const ref = React.createRef<HTMLInputElement>();
	render(
		<CheckboxControl ref={ref} indeterminate aria-label="All" style={box} />,
	);
	expect(ref.current?.indeterminate).toBe(true);
	expect(screen.getByRole("checkbox").getAttribute("aria-checked")).toBe(
		"mixed",
	);
});

describe("Radio group", () => {
	function Group({
		onGroupChange,
		onFirstChange,
		firstRef,
		required,
	}: {
		readonly onGroupChange?: ControlChangeHandler<string>;
		readonly onFirstChange?: ControlChangeHandler<boolean>;
		readonly firstRef?: React.Ref<HTMLInputElement>;
		readonly required?: boolean;
	}) {
		return (
			<form onSubmit={preventSubmit}>
				<RadioGroupControl
					name="stack"
					aria-label="Stack"
					required={required}
					onChange={onGroupChange}
				>
					<RadioControl
						ref={firstRef}
						value="react"
						aria-label="React"
						style={box}
						onChange={onFirstChange}
					/>
					<RadioControl
						value="vue"
						name="own-name"
						id="vue-input"
						style={box}
					/>
					<label htmlFor="vue-input">Vue</label>
					<RadioControl
						disabled
						value="svelte"
						aria-label="Svelte"
						style={box}
					/>
				</RadioGroupControl>
				<button type="submit">Send</button>
			</form>
		);
	}

	test("each radio's ref is its hidden input, named by the group", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Group firstRef={ref} />);
		expect(ref.current).toBeInstanceOf(HTMLInputElement);
		expect(ref.current?.type).toBe("radio");
		expect(ref.current?.name).toBe("stack");
		expect(ref.current?.value).toBe("react");
		expect(screen.getByRole("radio", { name: "React" }).tagName).toBe("SPAN");
	});

	test("a Radio's own name inside a group gives way to the group's", () => {
		render(<Group />);
		const inputs = [
			...document.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
		];
		expect(inputs.map((input) => input.name)).toEqual([
			"stack",
			"stack",
			"stack",
		]);
	});

	test("FormData has name=value for the chosen radio, and nothing before", async () => {
		render(<Group />);
		expect(entries(getForm())).toEqual([]);
		await userEvent.click(screen.getByRole("radio", { name: "Vue" }));
		expect(entries(getForm())).toEqual([["stack", "vue"]]);
	});

	test("required blocks submission until a radio is chosen", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const onSubmit = vi.fn<(event: Event) => void>();
		render(<Group required firstRef={ref} />);
		getForm().addEventListener("submit", onSubmit);
		expect(ref.current?.required).toBe(true);
		expect(ref.current?.validity.valueMissing).toBe(true);
		await userEvent.click(screen.getByRole("button", { name: "Send" }));
		expect(onSubmit).not.toHaveBeenCalled();
		await userEvent.click(screen.getByRole("radio", { name: "Vue" }));
		expect(ref.current?.validity.valid).toBe(true);
		await userEvent.click(screen.getByRole("button", { name: "Send" }));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	test("onChange: the radio's (event, true), then the group's (event, value), on the chosen input", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const group = recorder<string>();
		const first = recorder<boolean>();
		render(
			<Group
				firstRef={ref}
				onGroupChange={group.onChange}
				onFirstChange={first.onChange}
			/>,
		);
		await userEvent.click(screen.getByRole("radio", { name: "React" }));
		const expected = {
			target: ref.current,
			currentTarget: ref.current,
			type: "change",
			isNative: true,
			inputChecked: true,
		};
		expect(first.calls).toEqual([{ ...expected, value: true }]);
		expect(group.calls).toEqual([{ ...expected, value: "react" }]);
		const [firstOrder] = first.onChange.mock.invocationCallOrder;
		const [groupOrder] = group.onChange.mock.invocationCallOrder;
		expect(firstOrder).toBeLessThan(groupOrder ?? 0);
	});

	test("Space chooses the focused radio, and the arrow keys move the choice", async () => {
		const group = recorder<string>();
		render(<Group onGroupChange={group.onChange} />);
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("radio", { name: "React" }),
		);
		await userEvent.keyboard("[Space]");
		await userEvent.keyboard("{ArrowDown}");
		expect(group.calls.map((call) => call.value)).toEqual(["react", "vue"]);
		expect(screen.getByRole("radio", { name: "Vue" }).ariaChecked).toBe("true");
	});

	test("a label click chooses its radio", async () => {
		render(<Group />);
		await userEvent.click(screen.getByText("Vue"));
		expect(screen.getByRole("radio", { name: "Vue" }).ariaChecked).toBe("true");
	});
});

describe("Radio outside a group", () => {
	test("checked and defaultChecked work, with onChange(event, true)", async () => {
		const { calls, onChange } = recorder<boolean>();
		function Controlled() {
			const [isChecked, setIsChecked] = React.useState(false);
			return (
				<RadioControl
					value="alone"
					name="alone"
					aria-label="Alone"
					style={box}
					checked={isChecked}
					onChange={(event, checked) => {
						onChange(event, checked);
						setIsChecked(checked);
					}}
				/>
			);
		}

		render(
			<form>
				<Controlled />
				<RadioControl
					defaultChecked
					value="preset"
					name="preset"
					aria-label="Preset"
					style={box}
				/>
			</form>,
		);
		expect(entries(getForm())).toEqual([["preset", "preset"]]);
		await userEvent.click(screen.getByRole("radio", { name: "Alone" }));
		expect(calls.map((call) => [call.value, call.inputChecked])).toEqual([
			[true, true],
		]);
		expect(entries(getForm())).toEqual([
			["alone", "alone"],
			["preset", "preset"],
		]);
		expect(screen.queryByRole("radiogroup")).toBeNull();
	});

	test("pins the known gap: radios sharing a name don't uncheck one another", async () => {
		render(
			<>
				<RadioControl
					defaultChecked
					value="a"
					name="shared"
					aria-label="A"
					style={box}
				/>
				<RadioControl value="b" name="shared" aria-label="B" style={box} />
			</>,
		);
		await userEvent.click(screen.getByRole("radio", { name: "B" }));
		expect(screen.getByRole("radio", { name: "B" }).ariaChecked).toBe("true");
		expect(screen.getByRole("radio", { name: "A" }).ariaChecked).toBe("true");
	});
});
