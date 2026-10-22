import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	ToggleButton,
	ToggleButtonGroup,
	type ToggleButtonGroupProps,
	type ToggleButtonProps,
} from "#ui";

afterEach(() => {
	cleanup();
});

type Press = {
	type: string;
	isMouseEvent: boolean;
	currentTarget: EventTarget;
	value: unknown;
};

/**
Records what onChange saw at call time, while the event's currentTarget is still set.
*/
function recorder() {
	const calls: Press[] = [];
	const onChange = vi.fn(
		(event: React.MouseEvent<HTMLButtonElement>, value: unknown) => {
			calls.push({
				type: event.type,
				isMouseEvent: event.nativeEvent instanceof MouseEvent,
				currentTarget: event.currentTarget,
				value,
			});
		},
	);
	return { calls, onChange };
}

/**
Disabled natively, or through aria-disabled, which keeps the element focusable.
*/
function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function group(name: string): HTMLElement {
	return screen.getByRole("group", { name });
}

/**
The names of the pressed buttons, in document order.
*/
function pressed(container: HTMLElement = document.body): string[] {
	return within(container)
		.getAllByRole("button")
		.filter((element) => element.getAttribute("aria-pressed") === "true")
		.map((element) => element.textContent ?? "");
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function height(element: Element): number {
	return Math.round(box(element).height);
}

/**
The border radius a token resolves to, read from a probe element styled with it.
*/
function resolvedRadius(token: string): string {
	const probe = document.createElement("div");
	probe.style.borderRadius = `var(${token})`;
	document.body.append(probe);
	const radius = getComputedStyle(probe).borderTopLeftRadius;
	probe.remove();
	return radius;
}

/**
Starts keyboard navigation from a plain button rendered before the component.
*/
function focusBefore() {
	button("Before").focus();
}

async function expectFocus(name: string) {
	await expect.element(button(name)).toHaveFocus();
}

function Views(props: React.ComponentProps<typeof ToggleButtonGroup>) {
	return (
		<ToggleButtonGroup aria-label="View" {...props}>
			<ToggleButton value="diagram">Diagram</ToggleButton>
			<ToggleButton value="code">Code</ToggleButton>
			<ToggleButton value="notes">Notes</ToggleButton>
		</ToggleButtonGroup>
	);
}

function Around({ children }: { readonly children: React.ReactNode }) {
	return (
		<>
			<button type="button">Before</button>
			{children}
			<button type="button">After</button>
		</>
	);
}

describe("ToggleButton alone", () => {
	test("renders a button that isn't pressed by default, and className and the ref land on it", () => {
		const ref = React.createRef<HTMLButtonElement>();
		render(
			<ToggleButton ref={ref} value="watch" className="custom">
				Watch releases
			</ToggleButton>,
		);
		const watch = button("Watch releases");
		expect(watch).toBeInstanceOf(HTMLButtonElement);
		expect(ref.current).toBe(watch);
		expect(watch).toHaveAttribute("aria-pressed", "false");
		expect(watch).toHaveClass("custom");
	});

	test("each press toggles it, starting from defaultSelected (uncontrolled)", async () => {
		render(
			<>
				<ToggleButton value="watch">Watch</ToggleButton>
				<ToggleButton defaultSelected value="star">
					Star
				</ToggleButton>
			</>,
		);
		expect(button("Star")).toHaveAttribute("aria-pressed", "true");
		await userEvent.click(button("Watch"));
		await expect
			.element(button("Watch"))
			.toHaveAttribute("aria-pressed", "true");
		await userEvent.click(button("Watch"));
		await expect
			.element(button("Watch"))
			.toHaveAttribute("aria-pressed", "false");
		await userEvent.click(button("Star"));
		await expect
			.element(button("Star"))
			.toHaveAttribute("aria-pressed", "false");
	});

	test("onChange gets the click event and the button's value on every press", async () => {
		const { calls, onChange } = recorder();
		render(
			<ToggleButton value="watch" onChange={onChange}>
				Watch
			</ToggleButton>,
		);
		const watch = button("Watch");
		await userEvent.click(watch);
		await userEvent.click(watch);
		const press = {
			type: "click",
			isMouseEvent: true,
			currentTarget: watch,
			value: "watch",
		};
		expect(calls).toEqual([press, press]);
	});

	test("selected controls it: a press calls onChange, and only the prop moves the state", async () => {
		const onChange = vi.fn<() => void>();
		function Controlled() {
			const [selected, setSelected] = React.useState(false);
			return (
				<>
					<ToggleButton value="fixed" selected={false} onChange={onChange}>
						Fixed
					</ToggleButton>
					<ToggleButton
						value="live"
						selected={selected}
						onChange={() => {
							setSelected((current) => !current);
						}}
					>
						Live
					</ToggleButton>
				</>
			);
		}

		render(<Controlled />);
		await userEvent.click(button("Fixed"));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(button("Fixed")).toHaveAttribute("aria-pressed", "false");
		await userEvent.click(button("Live"));
		await expect
			.element(button("Live"))
			.toHaveAttribute("aria-pressed", "true");
		await userEvent.click(button("Live"));
		await expect
			.element(button("Live"))
			.toHaveAttribute("aria-pressed", "false");
	});

	test("Space and Enter press it", async () => {
		render(
			<Around>
				<ToggleButton value="watch">Watch</ToggleButton>
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await expectFocus("Watch");
		await userEvent.keyboard(" ");
		await expect
			.element(button("Watch"))
			.toHaveAttribute("aria-pressed", "true");
		await userEvent.keyboard("{Enter}");
		await expect
			.element(button("Watch"))
			.toHaveAttribute("aria-pressed", "false");
	});

	test("onClick runs first, and event.preventDefault() in it stops the toggle", async () => {
		const order: string[] = [];
		const onChange = vi.fn<() => void>();
		render(
			<>
				<ToggleButton
					value="first"
					onClick={() => {
						order.push("click");
					}}
					onChange={() => {
						order.push("change");
					}}
				>
					First
				</ToggleButton>
				<ToggleButton
					value="blocked"
					onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
						event.preventDefault();
					}}
					onChange={onChange}
				>
					Blocked
				</ToggleButton>
			</>,
		);
		await userEvent.click(button("First"));
		expect(order).toEqual(["click", "change"]);
		await userEvent.click(button("Blocked"));
		expect(onChange).not.toHaveBeenCalled();
		expect(button("Blocked")).toHaveAttribute("aria-pressed", "false");
	});

	test("disabled disables it, and a press does nothing", async () => {
		const onChange = vi.fn<() => void>();
		render(
			<ToggleButton disabled value="watch" onChange={onChange}>
				Watch
			</ToggleButton>,
		);
		expect(isDisabled(button("Watch"))).toBe(true);
		await userEvent.click(button("Watch"), { force: true });
		expect(onChange).not.toHaveBeenCalled();
		expect(button("Watch")).toHaveAttribute("aria-pressed", "false");
	});

	test("size: sm is 36px, md (the default) 46px and lg 54px tall", () => {
		const sizes = ["sm", "md", "lg"] as const satisfies ReadonlyArray<
			ToggleButtonProps["size"]
		>;
		const heights = { sm: 36, md: 46, lg: 54 };
		render(
			<>
				<ToggleButton value="default">Default</ToggleButton>
				{sizes.map((size) => (
					<ToggleButton key={size} value={size} size={size}>
						{size}
					</ToggleButton>
				))}
			</>,
		);
		expect(height(button("Default"))).toBe(46);
		for (const size of sizes) {
			expect(height(button(size))).toBe(heights[size]);
			expect(button(size)).toHaveClass(`gl-toggle-button-${size}`);
		}
	});

	test("fullWidth stretches it to the container width", () => {
		render(
			<div style={{ width: 300 }}>
				<ToggleButton fullWidth value="watch">
					Watch
				</ToggleButton>
			</div>,
		);
		const { width } = box(button("Watch"));
		expect(Math.round(width)).toBe(300);
	});

	test("onFocus is called when it takes focus", async () => {
		const types: string[] = [];
		render(
			<Around>
				<ToggleButton
					value="watch"
					onFocus={(event: React.FocusEvent<HTMLButtonElement>) => {
						types.push(event.type);
					}}
				>
					Watch
				</ToggleButton>
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		expect(types).toEqual(["focus"]);
	});

	test("tabIndex sets its place in the tab order", async () => {
		render(
			<Around>
				<ToggleButton value="watch" tabIndex={-1}>
					Watch
				</ToggleButton>
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await expectFocus("After");
	});
});

describe("ToggleButtonGroup", () => {
	test("renders role group named by aria-label, and className and the ref land on its div", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Views ref={ref} className="custom" />);
		const element = group("View");
		expect(element).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(element);
		expect(element).toHaveClass("custom");
		expect(within(element).getAllByRole("button")).toHaveLength(3);
	});

	test("aria-labelledby names the group", () => {
		render(
			<>
				<h3 id="view-title">Show the project as</h3>
				<Views aria-label={undefined} aria-labelledby="view-title" />
			</>,
		);
		expect(group("Show the project as")).toBeInTheDocument();
	});

	test("uncontrolled, nothing is pressed until a press, exclusive or not", () => {
		render(
			<>
				<Views exclusive />
				<Views />
			</>,
		);
		expect(pressed()).toEqual([]);
	});

	test("exclusive: a press presses only that button, and onChange gets the click event and its value", async () => {
		const { calls, onChange } = recorder();
		render(<Views exclusive onChange={onChange} />);
		await userEvent.click(button("Code"));
		await expect.poll(() => pressed()).toEqual(["Code"]);
		await userEvent.click(button("Notes"));
		await expect.poll(() => pressed()).toEqual(["Notes"]);
		expect(calls).toEqual([
			{
				type: "click",
				isMouseEvent: true,
				currentTarget: button("Code"),
				value: "code",
			},
			{
				type: "click",
				isMouseEvent: true,
				currentTarget: button("Notes"),
				value: "notes",
			},
		]);
	});

	test("exclusive: pressing the pressed button again unpresses it, and onChange gets null", async () => {
		const { calls, onChange } = recorder();
		render(<Views exclusive defaultValue="code" onChange={onChange} />);
		await userEvent.click(button("Code"));
		await expect.poll(() => pressed()).toEqual([]);
		expect(calls.map((call) => call.value)).toEqual([null]);
	});

	test("exclusive and controlled: ignoring null in onChange keeps one always pressed", async () => {
		function AlwaysOne() {
			const [view, setView] = React.useState<string>("diagram");
			return (
				<Views
					exclusive
					value={view}
					onChange={(_event, next: string | null) => {
						if (next !== null) {
							setView(next);
						}
					}}
				/>
			);
		}

		render(<AlwaysOne />);
		await userEvent.click(button("Diagram"));
		expect(pressed()).toEqual(["Diagram"]);
		await userEvent.click(button("Notes"));
		await expect.poll(() => pressed()).toEqual(["Notes"]);
	});

	test("not exclusive: presses add and remove values, and onChange gets the new array", async () => {
		const { calls, onChange } = recorder();
		render(<Views onChange={onChange} />);
		await userEvent.click(button("Diagram"));
		await userEvent.click(button("Code"));
		await expect.poll(() => pressed()).toEqual(["Diagram", "Code"]);
		await userEvent.click(button("Diagram"));
		await expect.poll(() => pressed()).toEqual(["Code"]);
		expect(calls.map((call) => call.value)).toEqual([
			["diagram"],
			["diagram", "code"],
			["code"],
		]);
		expect(calls.map((call) => call.type)).toEqual(["click", "click", "click"]);
	});

	test("defaultValue sets what starts pressed: a string when exclusive, an array otherwise", () => {
		render(
			<>
				<Views exclusive defaultValue="code" aria-label="One view" />
				<Views defaultValue={["diagram", "notes"]} aria-label="Several views" />
			</>,
		);
		expect(pressed(group("One view"))).toEqual(["Code"]);
		expect(pressed(group("Several views"))).toEqual(["Diagram", "Notes"]);
	});

	test("value controls the group: a press calls onChange, and only a new value moves the state", async () => {
		const { calls, onChange } = recorder();
		const { rerender } = render(
			<Views exclusive value="diagram" onChange={onChange} />,
		);
		await userEvent.click(button("Code"));
		expect(calls.map((call) => call.value)).toEqual(["code"]);
		expect(pressed()).toEqual(["Diagram"]);
		rerender(<Views exclusive value="code" onChange={onChange} />);
		expect(pressed()).toEqual(["Code"]);
		rerender(<Views value={["diagram"]} onChange={onChange} />);
		await userEvent.click(button("Notes"));
		expect(calls.map((call) => call.value)).toEqual([
			"code",
			["diagram", "notes"],
		]);
		expect(pressed()).toEqual(["Diagram"]);
	});

	// The README lists a ToggleButton's onChange under standalone use; api.d.ts says "every press",
	// and the reference calls it inside a group too.
	test("a ToggleButton's own onChange gets its value on every press inside a group too", async () => {
		const { calls, onChange } = recorder();
		render(
			<ToggleButtonGroup exclusive aria-label="View">
				<ToggleButton value="diagram" onChange={onChange}>
					Diagram
				</ToggleButton>
				<ToggleButton value="code">Code</ToggleButton>
			</ToggleButtonGroup>,
		);
		await userEvent.click(button("Diagram"));
		await userEvent.click(button("Diagram"));
		expect(calls.map((call) => [call.type, call.value])).toEqual([
			["click", "diagram"],
			["click", "diagram"],
		]);
	});

	test("event.preventDefault() in a ToggleButton's onClick stops the toggle inside a group", async () => {
		const onChange = vi.fn<() => void>();
		render(
			<ToggleButtonGroup exclusive aria-label="View" onChange={onChange}>
				<ToggleButton
					value="diagram"
					onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
						event.preventDefault();
					}}
				>
					Diagram
				</ToggleButton>
				<ToggleButton value="code">Code</ToggleButton>
			</ToggleButtonGroup>,
		);
		await userEvent.click(button("Diagram"));
		expect(onChange).not.toHaveBeenCalled();
		expect(pressed()).toEqual([]);
	});

	test("inside a group the group's value decides, not a ToggleButton's selected", () => {
		render(
			<ToggleButtonGroup exclusive value="code" aria-label="View">
				<ToggleButton selected value="diagram">
					Diagram
				</ToggleButton>
				<ToggleButton selected={false} value="code">
					Code
				</ToggleButton>
			</ToggleButtonGroup>,
		);
		expect(pressed()).toEqual(["Code"]);
	});

	test("size sets every button's size: the track is 36px, 46px (the default) or 54px tall", () => {
		const sizes = ["sm", "md", "lg"] as const satisfies ReadonlyArray<
			ToggleButtonGroupProps["size"]
		>;
		const heights = { sm: 36, md: 46, lg: 54 };
		render(
			<>
				<ToggleButtonGroup aria-label="Default">
					<ToggleButton value="week">Week</ToggleButton>
				</ToggleButtonGroup>
				{sizes.map((size) => (
					<ToggleButtonGroup key={size} size={size} aria-label={size}>
						<ToggleButton value="week">Week</ToggleButton>
						<ToggleButton value="month">Month</ToggleButton>
					</ToggleButtonGroup>
				))}
			</>,
		);
		expect(height(group("Default"))).toBe(46);
		for (const size of sizes) {
			expect(height(group(size))).toBe(heights[size]);
			for (const item of within(group(size)).getAllByRole("button")) {
				expect(item).toHaveClass(`gl-toggle-button-${size}`);
			}
		}
	});

	test("the buttons sit in a row by default, and in a column with the track's radius-well when vertical", () => {
		render(
			<>
				<Views aria-label="Row" />
				<Views aria-label="Column" orientation="vertical" />
			</>,
		);
		const [rowFirst, rowSecond] = within(group("Row")).getAllByRole("button");
		expect(box(rowSecond).left).toBeGreaterThanOrEqual(box(rowFirst).right);
		expect(Math.round(box(rowSecond).top)).toBe(Math.round(box(rowFirst).top));

		const [first, second] = within(group("Column")).getAllByRole("button");
		expect(box(second).top).toBeGreaterThanOrEqual(box(first).bottom);
		expect(Math.round(box(second).left)).toBe(Math.round(box(first).left));
		expect(getComputedStyle(group("Column")).borderTopLeftRadius).toBe(
			resolvedRadius("--radius-well"),
		);
	});

	test("fullWidth fills the container, and the buttons share it equally", () => {
		render(
			<div style={{ width: 360 }}>
				<ToggleButtonGroup fullWidth exclusive aria-label="Period">
					<ToggleButton value="week">Week</ToggleButton>
					<ToggleButton value="month">Month</ToggleButton>
					<ToggleButton value="year">This year, so far</ToggleButton>
				</ToggleButtonGroup>
			</div>,
		);
		const { width: trackWidth } = box(group("Period"));
		expect(Math.round(trackWidth)).toBe(360);
		const widths = within(group("Period"))
			.getAllByRole("button")
			.map((item) => box(item).width);
		for (const width of widths) {
			expect(width).toBeCloseTo(widths[0], 0);
		}
	});

	test("disabled disables every button, and the track dims once rather than each button", async () => {
		const onChange = vi.fn<() => void>();
		render(<Views disabled exclusive onChange={onChange} />);
		for (const item of within(group("View")).getAllByRole("button")) {
			expect(isDisabled(item)).toBe(true);
			expect(getComputedStyle(item).opacity).toBe("1");
		}

		expect(getComputedStyle(group("View")).opacity).toBe("0.5");
		await userEvent.click(button("Code"), { force: true });
		expect(onChange).not.toHaveBeenCalled();
		expect(pressed()).toEqual([]);
	});

	test("a disabled ToggleButton can't be pressed, and the others still can", async () => {
		const onChange = vi.fn<() => void>();
		render(
			<ToggleButtonGroup exclusive aria-label="Language" onChange={onChange}>
				<ToggleButton value="ts">TypeScript</ToggleButton>
				<ToggleButton disabled value="go">
					Go
				</ToggleButton>
			</ToggleButtonGroup>,
		);
		expect(isDisabled(button("Go"))).toBe(true);
		expect(isDisabled(button("TypeScript"))).toBe(false);
		await userEvent.click(button("Go"), { force: true });
		expect(onChange).not.toHaveBeenCalled();
		await userEvent.click(button("TypeScript"));
		await expect.poll(() => pressed()).toEqual(["TypeScript"]);
	});
});

describe("ToggleButtonGroup keyboard", () => {
	test("the group is one tab stop: Tab enters on the first button and the next Tab leaves it", async () => {
		render(
			<Around>
				<Views exclusive />
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await expectFocus("Diagram");
		await userEvent.tab();
		await expectFocus("After");
		await userEvent.tab({ shift: true });
		await expectFocus("Diagram");
		await userEvent.tab({ shift: true });
		await expectFocus("Before");
	});

	test("Tab enters on the pressed button when none was focused yet", async () => {
		render(
			<Around>
				<Views exclusive defaultValue="notes" />
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await expectFocus("Notes");
	});

	test("Tab comes back to the last focused button, over the pressed one", async () => {
		render(
			<Around>
				<Views exclusive defaultValue="diagram" />
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await expectFocus("Diagram");
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("Code");
		await userEvent.tab();
		await expectFocus("After");
		await userEvent.tab({ shift: true });
		await expectFocus("Code");
	});

	test("Right and Left move focus and wrap", async () => {
		render(
			<Around>
				<Views exclusive />
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("Code");
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("Notes");
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("Diagram");
		await userEvent.keyboard("{ArrowLeft}");
		await expectFocus("Notes");
		await userEvent.keyboard("{ArrowLeft}");
		await expectFocus("Code");
	});

	test("Home and End jump to the first and last buttons", async () => {
		render(
			<Around>
				<Views exclusive />
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("{End}");
		await expectFocus("Notes");
		await userEvent.keyboard("{Home}");
		await expectFocus("Diagram");
	});

	test("when vertical, Down and Up move focus and wrap", async () => {
		render(
			<Around>
				<Views exclusive orientation="vertical" />
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("{ArrowDown}");
		await expectFocus("Code");
		await userEvent.keyboard("{ArrowDown}");
		await expectFocus("Notes");
		await userEvent.keyboard("{ArrowDown}");
		await expectFocus("Diagram");
		await userEvent.keyboard("{ArrowUp}");
		await expectFocus("Notes");
	});

	test("arrow keys, Home and End skip disabled buttons, and Tab enters on the first enabled one", async () => {
		render(
			<Around>
				<ToggleButtonGroup exclusive aria-label="Language">
					<ToggleButton disabled value="c">
						C
					</ToggleButton>
					<ToggleButton value="ts">TypeScript</ToggleButton>
					<ToggleButton disabled value="go">
						Go
					</ToggleButton>
					<ToggleButton value="rust">Rust</ToggleButton>
					<ToggleButton disabled value="zig">
						Zig
					</ToggleButton>
				</ToggleButtonGroup>
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await expectFocus("TypeScript");
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("Rust");
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("TypeScript");
		await userEvent.keyboard("{ArrowLeft}");
		await expectFocus("Rust");
		await userEvent.keyboard("{Home}");
		await expectFocus("TypeScript");
		await userEvent.keyboard("{End}");
		await expectFocus("Rust");
	});

	test("Space or Enter presses the focused button, and arrow keys never change what is pressed", async () => {
		const { calls, onChange } = recorder();
		render(
			<Around>
				<Views exclusive onChange={onChange} />
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("Code");
		expect(pressed()).toEqual([]);
		await userEvent.keyboard(" ");
		await expect.poll(() => pressed()).toEqual(["Code"]);
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("Notes");
		await userEvent.keyboard("{Home}");
		await expectFocus("Diagram");
		expect(pressed()).toEqual(["Code"]);
		await userEvent.keyboard("{Enter}");
		await expect.poll(() => pressed()).toEqual(["Diagram"]);
		expect(calls.map((call) => [call.type, call.value])).toEqual([
			["click", "code"],
			["click", "diagram"],
		]);
	});

	test("onKeyDown runs before the group's arrow keys, and preventDefault takes over", async () => {
		const keys: string[] = [];
		render(
			<Around>
				<Views
					exclusive
					onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
						keys.push(event.key);
						if (event.key === "ArrowRight") {
							event.preventDefault();
						}
					}}
				/>
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("{ArrowRight}");
		await expectFocus("Diagram");
		await userEvent.keyboard("{ArrowLeft}");
		await expectFocus("Notes");
		expect(keys).toEqual(["ArrowRight", "ArrowLeft"]);
	});
});
