// Behaviour specs for RadioGroup and Radio, from design-system/components/RadioGroup/README.md and
// api.d.ts. The reference draws circles under transparent native radios; the package renders Base
// UI's radios, spans with the role beside hidden inputs (docs/deviations.md, 1 to 6). So the specs
// find radios by role and name, read each input through its ref, and find a drawn circle by its
// place. A Radio outside a RadioGroup is specced as far as deviation 6 keeps it: checked,
// defaultChecked, onChange(event, true) and its form value.
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { Icon, Radio, RadioGroup, type RadioGroupProps } from "#ui";

afterEach(() => {
	cleanup();
});

/**
A computed length without its px unit.
*/
function px(value: string): number {
	return Number(value.replace(/px$/v, ""));
}

/**
The element with an id, through a selector, as the lint rules prefer.
*/
function byId(id: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

type OnGroupChange = NonNullable<RadioGroupProps["onChange"]>;

type Change<Value> = {
	event: unknown;
	type: string;
	target: EventTarget;
	inputChecked: boolean | undefined;
	inputValue: string | undefined;
	value: Value;
};

/**
Records what an onChange saw at call time: the event, its type and target, the input's checked
state and value then, and the second argument.
*/
function recorder<Value>() {
	const calls: Array<Change<Value>> = [];
	const onChange = vi.fn(
		(event: React.ChangeEvent<HTMLInputElement>, value: Value) => {
			const { target } = event;
			const input = target instanceof HTMLInputElement ? target : undefined;
			calls.push({
				event,
				type: event.type,
				target,
				inputChecked: input?.checked,
				inputValue: input?.value,
				value,
			});
		},
	);
	return { calls, onChange };
}

function radio(name: string): HTMLElement {
	return screen.getByRole("radio", { name });
}

function group(name: string): HTMLElement {
	return screen.getByRole("radiogroup", { name });
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

/**
The names among these whose radios are chosen, in order.
*/
function chosen(...names: string[]): string[] {
	const checked = screen.queryAllByRole("radio", { checked: true });
	return names.filter((name) => checked.includes(radio(name)));
}

/**
Disabled natively, or through aria-disabled.
*/
function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

/**
Whether focus is on the control or inside it.
*/
function hasFocus(control: HTMLElement): boolean {
	return (
		control === document.activeElement ||
		control.contains(document.activeElement)
	);
}

function size(element: Element): [number, number] {
	const { width, height } = element.getBoundingClientRect();
	return [Math.round(width), Math.round(height)];
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

/**
The opacity the element is drawn with: its own times every ancestor's.
*/
function opacityOf(element: Element): number {
	let opacity = 1;
	for (
		let node: Element | null = element;
		node !== null;
		node = node.parentElement
	) {
		opacity *= Number(getComputedStyle(node).opacity);
	}

	return opacity;
}

/**
The circle drawn for the radio: the element with a border that covers it exactly. The package's
radio draws itself; the reference's transparent input lies over a drawn circle.
*/
function drawnCircle(control: HTMLElement): HTMLElement {
	const target = box(control);
	const drawn = [
		control,
		...document.querySelectorAll<HTMLElement>("body *"),
	].find((element) => {
		const { left, top, width, height } = box(element);
		const style = getComputedStyle(element);
		return (
			style.borderTopStyle !== "none" &&
			px(style.borderTopWidth) > 0 &&
			Math.abs(left - target.left) < 0.5 &&
			Math.abs(top - target.top) < 0.5 &&
			Math.abs(width - target.width) < 0.5 &&
			Math.abs(height - target.height) < 0.5
		);
	});
	if (drawn === undefined) {
		throw new Error("no bordered circle covers the radio");
	}

	return drawn;
}

/**
The dot shown inside a drawn circle: an element or a pseudo-element in it, filled and visible,
with its width and colour. Null when the circle shows none.
*/
function shownDot(
	circle: HTMLElement,
): { width: number; color: string } | null {
	const parts: Array<[Element, string | null]> = [];
	for (const element of [circle, ...circle.querySelectorAll("*")]) {
		if (element !== circle) {
			parts.push([element, null]);
		}

		parts.push([element, "::before"], [element, "::after"]);
	}

	for (const [element, pseudo] of parts) {
		const style = getComputedStyle(element, pseudo);
		const isDrawn =
			(pseudo === null || style.content !== "none") &&
			style.display !== "none" &&
			style.visibility !== "hidden" &&
			(pseudo === null ? 1 : Number(style.opacity)) * opacityOf(element) >
				0.99 &&
			style.backgroundColor !== "rgba(0, 0, 0, 0)";
		let { width } = box(element);
		if (pseudo !== null) {
			const pseudoWidth = px(style.width);
			width = Number.isNaN(pseudoWidth) ? 0 : pseudoWidth;
		}

		if (isDrawn && width > 0) {
			return { width: Math.round(width), color: style.backgroundColor };
		}
	}

	return null;
}

/**
The markup of a glyph as Icon draws it.
*/
function glyph(name: string): string {
	const { container, unmount } = render(<Icon name={name} />);
	const markup = container.querySelector("svg")?.getHTML() ?? "";
	unmount();
	return markup;
}

/**
What a CSS value, a token or a literal, resolves to for one property, read from a probe element.
*/
function resolved(property: string, value: string): string {
	const probe = document.createElement("div");
	probe.style.borderStyle = "solid";
	probe.style.setProperty(property, value);
	document.body.append(probe);
	const result = getComputedStyle(probe).getPropertyValue(property);
	probe.remove();
	return result;
}

/**
The ids an aria-labelledby or aria-describedby holds.
*/
function idsIn(element: HTMLElement, attribute: string): string[] {
	return (element.getAttribute(attribute) ?? "").split(/\s+/v).filter(Boolean);
}

/**
The element aria-describedby points at that holds the text.
*/
function describer(control: HTMLElement, text: string): HTMLElement {
	const element = idsIn(control, "aria-describedby")
		.map((id) => byId(id))
		.find((candidate) => candidate?.textContent?.includes(text));
	if (!element) {
		throw new Error(`nothing aria-describedby points at holds "${text}"`);
	}

	return element;
}

/**
The form's entries, as FormData has them.
*/
function entries(form: HTMLElement): Array<[string, string]> {
	if (!(form instanceof HTMLFormElement)) {
		throw new TypeError("not a form");
	}

	return [...new FormData(form)].map(([key, value]) => [
		key,
		typeof value === "string" ? value : value.name,
	]);
}

/**
Moves the pointer to the page's bottom-left corner, clear of everything the specs render, so no
hover style lingers on a control from an earlier click.
*/
async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; left: 0; bottom: 0; width: 40px; height: 40px";
	document.body.append(spot);
	try {
		await userEvent.hover(spot);
	} finally {
		spot.remove();
	}
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

const stack = ["Node.js and TypeScript", "Rust", "React and Next.js"];

/**
The preview's Default: three stacks, labelled "Preferred stack".
*/
function Stack(props: React.ComponentProps<typeof RadioGroup>) {
	return (
		<RadioGroup label="Preferred stack" {...props}>
			<Radio value="node" label="Node.js and TypeScript" />
			<Radio value="rust" label="Rust" />
			<Radio value="react" label="React and Next.js" />
		</RadioGroup>
	);
}

describe("RadioGroup: the group", () => {
	test("label names the radiogroup and sits above the options", () => {
		render(<Stack />);
		const element = group("Preferred stack");
		expect(within(element).getAllByRole("radio")).toHaveLength(3);
		expect(box(screen.getByText("Preferred stack")).bottom).toBeLessThanOrEqual(
			box(radio("Node.js and TypeScript")).top + 0.5,
		);
	});

	test("aria-labelledby names the group, and with a label the visible label's id joins it", () => {
		render(
			<>
				<h3 id="stack-title">Show me your work in</h3>
				<Stack label={undefined} aria-labelledby="stack-title" />
				<h3 id="hiring-title">What are you hiring for?</h3>
				<RadioGroup aria-labelledby="hiring-title" label="Role">
					<Radio value="lead" label="Backend lead" />
				</RadioGroup>
			</>,
		);
		expect(
			within(group("Show me your work in")).getAllByRole("radio"),
		).toHaveLength(3);
		expect(group("What are you hiring for? Role")).toBeInTheDocument();
	});

	// The README says the label and helper ids derive from the group's; the reference says how:
	// the group's id with -label and -helper (reference.tsx, lines 150 to 153).
	test("id is the group's, generated when omitted, and the label's and helper's ids derive from it", () => {
		render(
			<>
				<Stack id="stack" helperText="Pick the one you'd hire me for." />
				<RadioGroup label="Engagement" helperText="Full-time or contract.">
					<Radio value="full" label="Full-time" />
				</RadioGroup>
			</>,
		);
		const own = group("Preferred stack");
		expect(own.id).toBe("stack");
		expect(idsIn(own, "aria-labelledby")).toContain("stack-label");
		expect(byId("stack-label")).toHaveTextContent("Preferred stack");
		expect(idsIn(own, "aria-describedby")).toContain("stack-helper");
		expect(byId("stack-helper")).toHaveTextContent(
			"Pick the one you'd hire me for.",
		);

		const generated = group("Engagement");
		expect(generated.id).toMatch(/\S/v);
		expect(generated.id).not.toBe("stack");
		expect(byId(`${generated.id}-label`)).toHaveTextContent("Engagement");
		expect(byId(`${generated.id}-helper`)).toHaveTextContent(
			"Full-time or contract.",
		);
	});

	test("className, style and other attributes go to the radiogroup div, and so does the ref", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Stack
				ref={ref}
				className="custom"
				style={{ maxWidth: 320 }}
				data-testid="stack"
				title="What I'd build with"
			/>,
		);
		const element = group("Preferred stack");
		expect(element).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(element);
		expect(element).toHaveClass("custom");
		expect(element.style.maxWidth).toBe("320px");
		expect(screen.getByTestId("stack")).toBe(element);
		expect(element).toHaveAttribute("title", "What I'd build with");
	});

	test("name is shared by every radio; omitted, it's generated, and differs from group to group", () => {
		const refs = Array.from({ length: 6 }, () =>
			React.createRef<HTMLInputElement>(),
		);
		render(
			<>
				<RadioGroup label="Database" name="database">
					<Radio ref={refs[0]} value="postgres" label="PostgreSQL" />
					<Radio ref={refs[1]} value="mongo" label="MongoDB" />
				</RadioGroup>
				<RadioGroup label="Cloud">
					<Radio ref={refs[2]} value="aws" label="AWS" />
					<Radio ref={refs[3]} value="cloudflare" label="Cloudflare" />
				</RadioGroup>
				<RadioGroup label="Engagement">
					<Radio ref={refs[4]} value="full" label="Full-time" />
					<Radio ref={refs[5]} value="contract" label="Contract" />
				</RadioGroup>
			</>,
		);
		const names = refs.map((ref) => ref.current?.name);
		expect(names.slice(0, 2)).toEqual(["database", "database"]);
		expect(names[2]).toMatch(/\S/v);
		expect(names[3]).toBe(names[2]);
		expect(names[4]).toMatch(/\S/v);
		expect(names[5]).toBe(names[4]);
		expect(names[4]).not.toBe(names[2]);
		expect(names[2]).not.toBe("database");
	});

	test("helperText describes the group from under the options, and aria-describedby adds descriptions", () => {
		render(
			<>
				<p id="stack-note">I reply within two working days.</p>
				<Stack
					aria-describedby="stack-note"
					helperText="Pick the one you'd hire me for."
				/>
			</>,
		);
		expect(group("Preferred stack")).toHaveAccessibleDescription(
			"I reply within two working days. Pick the one you'd hire me for.",
		);
		expect(
			box(screen.getByText("Pick the one you'd hire me for.")).top,
		).toBeGreaterThanOrEqual(
			box(screen.getByText("React and Next.js")).bottom - 0.5,
		);
	});

	test("error marks the group and every radio invalid, rings each circle in danger, and turns helperText into a danger message with the error icon", async () => {
		await parkPointer();
		render(
			<>
				<RadioGroup
					error
					label="Time zone overlap"
					helperText="Pick one to continue."
				>
					<Radio value="full" label="Full US hours" />
					<Radio value="half" label="Half a day" />
				</RadioGroup>
				<RadioGroup label="Engagement" helperText="Full-time or contract.">
					<Radio value="full-time" label="Full-time" />
				</RadioGroup>
			</>,
		);
		const danger = resolved("color", "var(--danger)");
		const invalid = group("Time zone overlap");
		expect(invalid).toHaveAttribute("aria-invalid", "true");
		for (const name of ["Full US hours", "Half a day"]) {
			expect(radio(name)).toHaveAttribute("aria-invalid", "true");
			const circle = drawnCircle(radio(name));
			expect(getComputedStyle(circle).borderTopColor).toBe(danger);
		}

		expect(
			getComputedStyle(screen.getByText("Pick one to continue.")).color,
		).toBe(danger);
		expect(
			describer(invalid, "Pick one to continue.")
				.querySelector("svg")
				?.getHTML(),
		).toBe(glyph("error"));

		const valid = group("Engagement");
		expect(valid).not.toHaveAttribute("aria-invalid", "true");
		expect(radio("Full-time")).not.toHaveAttribute("aria-invalid", "true");
		const fullTimeCircle = drawnCircle(radio("Full-time"));
		expect(getComputedStyle(fullTimeCircle).borderTopColor).not.toBe(danger);
		expect(
			getComputedStyle(screen.getByText("Full-time or contract.")).color,
		).not.toBe(danger);
		expect(
			describer(valid, "Full-time or contract.").querySelector("svg"),
		).toBeNull();
	});

	// The docs don't say whether the asterisk is read; the reference hides it from assistive tech
	// (reference.tsx, line 187), which hears aria-required from the group.
	test("required puts an asterisk on the label that isn't part of the name, aria-required on the group, and required on every radio", () => {
		const lead = React.createRef<HTMLInputElement>();
		const architect = React.createRef<HTMLInputElement>();
		const full = React.createRef<HTMLInputElement>();
		render(
			<>
				<RadioGroup required label="Role">
					<Radio ref={lead} value="lead" label="Backend lead" />
					<Radio ref={architect} value="architect" label="Software architect" />
				</RadioGroup>
				<RadioGroup label="Engagement">
					<Radio ref={full} value="full" label="Full-time" />
				</RadioGroup>
			</>,
		);
		const required = group("Role");
		expect(required).toHaveAttribute("aria-required", "true");
		const label = idsIn(required, "aria-labelledby")
			.map((id) => byId(id))
			.find((element) => element?.textContent?.includes("Role"));
		expect(label?.textContent?.trim()).toMatch(/^Role\s*\*$/v);
		expect(lead.current?.required).toBe(true);
		expect(architect.current?.required).toBe(true);

		const optional = group("Engagement");
		expect(optional).not.toHaveAttribute("aria-required", "true");
		expect(optional.textContent).not.toContain("*");
		expect(full.current?.required).toBe(false);
	});

	// The docs don't say whether disabled options take focus; the reference's options are native
	// radios, which the browser leaves out of the tab order when disabled.
	test("disabled disables every option: a press chooses nothing, and Tab passes the group by", async () => {
		const remote = React.createRef<HTMLInputElement>();
		const medellin = React.createRef<HTMLInputElement>();
		const onChange = vi.fn<OnGroupChange>();
		render(
			<Around>
				<RadioGroup
					disabled
					label="Office"
					defaultValue="remote"
					onChange={onChange}
				>
					<Radio ref={remote} value="remote" label="Remote" />
					<Radio ref={medellin} value="medellin" label="Medellín" />
				</RadioGroup>
			</Around>,
		);
		for (const name of ["Remote", "Medellín"]) {
			expect(isDisabled(radio(name))).toBe(true);
		}

		expect(remote.current?.disabled).toBe(true);
		expect(medellin.current?.disabled).toBe(true);
		await userEvent.click(radio("Medellín"), { force: true });
		await userEvent.click(screen.getByText("Medellín"), { force: true });
		expect(onChange).not.toHaveBeenCalled();
		expect(chosen("Remote", "Medellín")).toEqual(["Remote"]);
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
	});

	test("the options stack in a column by default, and row lays them out in a row that wraps", () => {
		render(
			<>
				<div style={{ width: 360 }}>
					<RadioGroup label="Database">
						<Radio value="postgres" label="PostgreSQL" />
						<Radio value="mongo" label="MongoDB" />
					</RadioGroup>
				</div>
				<div data-testid="row" style={{ width: 360 }}>
					<RadioGroup row label="Engagement">
						<Radio value="full" label="Full-time" />
						<Radio value="contract" label="Contract" />
					</RadioGroup>
				</div>
			</>,
		);
		const postgres = box(radio("PostgreSQL"));
		const mongo = box(radio("MongoDB"));
		expect(mongo.top).toBeGreaterThanOrEqual(postgres.bottom);
		expect(mongo.left).toBeCloseTo(postgres.left, 0);

		const full = box(radio("Full-time"));
		expect(box(radio("Contract")).top).toBeCloseTo(full.top, 0);
		expect(box(radio("Contract")).left).toBeGreaterThanOrEqual(
			box(screen.getByText("Full-time")).right,
		);

		// Narrower than both options side by side, wide enough for each: the second wraps.
		const container = screen.getByTestId("row");
		const option = box(screen.getByText("Full-time")).right - full.left;
		container.style.width = `${Math.ceil(option) + 10}px`;
		const contract = box(radio("Contract"));
		expect(contract.top).toBeGreaterThanOrEqual(box(radio("Full-time")).bottom);
		expect(contract.left).toBeCloseTo(box(radio("Full-time")).left, 0);
		expect(contract.right).toBeLessThanOrEqual(box(container).right);
	});

	test("size sets every circle: md (the default) 20px, sm 16px, and a Radio's own size overrides the group's", () => {
		render(
			<>
				<RadioGroup label="Default">
					<Radio value="node" label="Node.js" />
				</RadioGroup>
				<RadioGroup size="md" label="Medium">
					<Radio value="rust" label="Rust" />
				</RadioGroup>
				<RadioGroup size="sm" label="Cloud">
					<Radio value="aws" label="AWS" />
					<Radio size="md" value="cloudflare" label="Cloudflare" />
				</RadioGroup>
			</>,
		);
		const node = radio("Node.js");
		const aws = radio("AWS");
		expect(size(node)).toEqual([20, 20]);
		expect(size(drawnCircle(node))).toEqual([20, 20]);
		expect(size(radio("Rust"))).toEqual([20, 20]);
		expect(size(aws)).toEqual([16, 16]);
		expect(size(drawnCircle(aws))).toEqual([16, 16]);
		expect(size(radio("Cloudflare"))).toEqual([20, 20]);
	});

	test("each circle has a dg-edge outline, and the chosen one takes a color-ink ring and an 8px color-ink dot", async () => {
		await parkPointer();
		render(<Stack defaultValue="rust" />);
		const ink = resolved("color", "var(--color-ink)");
		const circle = drawnCircle(radio("Node.js and TypeScript"));
		expect(getComputedStyle(circle).borderTopColor).toBe(
			resolved("color", "var(--dg-edge)"),
		);
		expect(getComputedStyle(circle).borderTopLeftRadius).toBe(
			resolved("border-top-left-radius", "50%"),
		);
		expect(shownDot(circle)).toBeNull();
		const chosenCircle = drawnCircle(radio("Rust"));
		expect(getComputedStyle(chosenCircle).borderTopColor).toBe(ink);
		expect(shownDot(chosenCircle)).toEqual({ width: 8, color: ink });
	});
});

describe("RadioGroup: choosing", () => {
	test("nothing is chosen by default; defaultValue sets the first choice, and a press on a radio or its label moves it", async () => {
		render(
			<>
				<Stack />
				<RadioGroup label="Engagement" defaultValue="full">
					<Radio value="full" label="Full-time" />
					<Radio value="contract" label="Contract" />
				</RadioGroup>
			</>,
		);
		expect(chosen(...stack)).toEqual([]);
		expect(chosen("Full-time", "Contract")).toEqual(["Full-time"]);
		await userEvent.click(radio("Contract"));
		await expect
			.poll(() => chosen("Full-time", "Contract"))
			.toEqual(["Contract"]);
		await userEvent.click(screen.getByText("Full-time"));
		await expect
			.poll(() => chosen("Full-time", "Contract"))
			.toEqual(["Full-time"]);
		await userEvent.click(radio("Rust"));
		await expect.poll(() => chosen(...stack)).toEqual(["Rust"]);
	});

	test("value controls the group: null chooses nothing, a press only calls onChange, and a new value moves the choice", async () => {
		const { calls, onChange } = recorder<string>();
		const { rerender } = render(<Stack value={null} onChange={onChange} />);
		expect(chosen(...stack)).toEqual([]);
		await userEvent.click(radio("Rust"));
		expect(calls.map((call) => call.value)).toEqual(["rust"]);
		expect(chosen(...stack)).toEqual([]);
		rerender(<Stack value="react" onChange={onChange} />);
		expect(chosen(...stack)).toEqual(["React and Next.js"]);
		rerender(<Stack value={null} onChange={onChange} />);
		expect(chosen(...stack)).toEqual([]);
	});

	// The order and the shared event aren't in the README; the reference passes the radio's change
	// event on to the group after the Radio's own onChange (reference.tsx, lines 67 to 70).
	test("onChange gets a change event on the chosen radio's input, already checked, and its value; the Radio's own onChange(event, true) runs first, with the same event", async () => {
		const node = React.createRef<HTMLInputElement>();
		const rust = React.createRef<HTMLInputElement>();
		const forGroup = recorder<string>();
		const forRust = recorder<boolean>();
		render(
			<RadioGroup label="Preferred stack" onChange={forGroup.onChange}>
				<Radio ref={node} value="node" label="Node.js and TypeScript" />
				<Radio
					ref={rust}
					value="rust"
					label="Rust"
					onChange={forRust.onChange}
				/>
			</RadioGroup>,
		);
		await userEvent.click(radio("Rust"));
		await userEvent.click(radio("Node.js and TypeScript"));
		expect(
			forGroup.calls.map((call) => [
				call.type,
				call.inputChecked,
				call.inputValue,
				call.value,
			]),
		).toEqual([
			["change", true, "rust", "rust"],
			["change", true, "node", "node"],
		]);
		expect(forGroup.calls[0]?.target).toBe(rust.current);
		expect(forGroup.calls[1]?.target).toBe(node.current);
		expect(
			forRust.calls.map((call) => [call.type, call.inputChecked, call.value]),
		).toEqual([["change", true, true]]);
		expect(forRust.calls[0]?.target).toBe(rust.current);
		expect(forRust.calls[0]?.event).toBe(forGroup.calls[0]?.event);
		expect(forRust.onChange.mock.invocationCallOrder[0]).toBeLessThan(
			forGroup.onChange.mock.invocationCallOrder[0] ?? 0,
		);
	});

	test("preventDefault() in onChange cancels the choice", async () => {
		const onChange = vi.fn<OnGroupChange>((event) => {
			event.preventDefault();
		});
		render(<Stack defaultValue="node" onChange={onChange} />);
		await userEvent.click(radio("Rust"));
		expect(onChange.mock.calls.map((call) => call[1])).toEqual(["rust"]);
		expect(chosen(...stack)).toEqual(["Node.js and TypeScript"]);
	});

	// The reference moves its state before onChange runs (reference.tsx, lines 156 to 159): the
	// browser puts the old choice back, but React already holds the new one, and the next press
	// goes unreported.
	referenceDefectTest(
		"after a cancelled press, the next press is reported to onChange and can be cancelled too",
		async () => {
			const onChange = vi.fn<OnGroupChange>((event) => {
				event.preventDefault();
			});
			render(<Stack defaultValue="node" onChange={onChange} />);
			await userEvent.click(radio("Rust"));
			await userEvent.click(radio("Rust"));
			expect(onChange.mock.calls.map((call) => call[1])).toEqual([
				"rust",
				"rust",
			]);
			expect(chosen(...stack)).toEqual(["Node.js and TypeScript"]);
		},
	);

	// The reference calls the group's onChange whatever the Radio's onChange did (reference.tsx,
	// lines 67 to 70), so it reports a choice the browser has just undone.
	referenceDefectTest(
		"preventDefault() in a Radio's onChange cancels the choice, and the group's onChange isn't called",
		async () => {
			const onChange = vi.fn<OnGroupChange>();
			render(
				<RadioGroup
					label="Preferred stack"
					defaultValue="node"
					onChange={onChange}
				>
					<Radio value="node" label="Node.js and TypeScript" />
					<Radio
						value="rust"
						label="Rust"
						onChange={(event) => {
							event.preventDefault();
						}}
					/>
				</RadioGroup>,
			);
			await userEvent.click(radio("Rust"));
			expect(onChange).not.toHaveBeenCalled();
			expect(chosen("Node.js and TypeScript", "Rust")).toEqual([
				"Node.js and TypeScript",
			]);
		},
	);

	test("inside a group the group's value decides, not a Radio's checked or defaultChecked", () => {
		render(
			<RadioGroup label="Preferred stack" value="rust">
				<Radio checked value="node" label="Node.js and TypeScript" />
				<Radio checked={false} value="rust" label="Rust" />
				<Radio defaultChecked value="react" label="React and Next.js" />
			</RadioGroup>,
		);
		expect(chosen(...stack)).toEqual(["Rust"]);
	});
});

describe("RadioGroup: keyboard", () => {
	test("Tab enters the group on the chosen radio, and the next Tab leaves it", async () => {
		render(
			<Around>
				<Stack defaultValue="rust" />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(hasFocus(radio("Rust"))).toBe(true);
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		expect(hasFocus(radio("Rust"))).toBe(true);
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
	});

	test("with nothing chosen, Tab enters on the first radio, and Space chooses it", async () => {
		const { calls, onChange } = recorder<string>();
		render(
			<Around>
				<Stack onChange={onChange} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(hasFocus(radio("Node.js and TypeScript"))).toBe(true);
		expect(chosen(...stack)).toEqual([]);
		await userEvent.keyboard(" ");
		await expect
			.poll(() => chosen(...stack))
			.toEqual(["Node.js and TypeScript"]);
		expect(calls.map((call) => [call.type, call.value])).toEqual([
			["change", "node"],
		]);
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
	});

	test("Down and Right choose the next option, Up and Left the previous one, wrapping at either end", async () => {
		const { calls, onChange } = recorder<string>();
		render(
			<Around>
				<Stack defaultValue="node" onChange={onChange} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		const steps = [
			["{ArrowDown}", "Rust"],
			["{ArrowRight}", "React and Next.js"],
			["{ArrowDown}", "Node.js and TypeScript"],
			["{ArrowUp}", "React and Next.js"],
			["{ArrowLeft}", "Rust"],
		] as const;
		for (const [key, name] of steps) {
			// eslint-disable-next-line no-await-in-loop -- each key starts where the last one left
			await userEvent.keyboard(key);
			expect(hasFocus(radio(name))).toBe(true);
			// eslint-disable-next-line no-await-in-loop
			await expect.poll(() => chosen(...stack)).toEqual([name]);
		}

		expect(calls.map((call) => [call.type, call.value])).toEqual([
			["change", "rust"],
			["change", "react"],
			["change", "node"],
			["change", "react"],
			["change", "rust"],
		]);
	});

	test("the arrow keys skip disabled options, and Tab enters on the first enabled one", async () => {
		const names = ["Pulumi", "Terraform", "AWS CDK", "SST", "Ansible"];
		render(
			<Around>
				<RadioGroup label="Infrastructure as code">
					<Radio disabled value="pulumi" label="Pulumi" />
					<Radio value="terraform" label="Terraform" />
					<Radio disabled value="cdk" label="AWS CDK" />
					<Radio value="sst" label="SST" />
					<Radio disabled value="ansible" label="Ansible" />
				</RadioGroup>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(hasFocus(radio("Terraform"))).toBe(true);
		const steps = [
			["{ArrowDown}", "SST"],
			["{ArrowDown}", "Terraform"],
			["{ArrowUp}", "SST"],
			["{ArrowUp}", "Terraform"],
		] as const;
		for (const [key, name] of steps) {
			// eslint-disable-next-line no-await-in-loop -- each key starts where the last one left
			await userEvent.keyboard(key);
			expect(hasFocus(radio(name))).toBe(true);
			// eslint-disable-next-line no-await-in-loop
			await expect.poll(() => chosen(...names)).toEqual([name]);
		}
	});
});

describe("RadioGroup: forms", () => {
	test("the chosen radio sends name=value with its form, and nothing goes before a choice", async () => {
		render(
			<form aria-label="Hiring">
				<Stack name="stack" />
			</form>,
		);
		const form = screen.getByRole("form", { name: "Hiring" });
		expect(entries(form)).toEqual([]);
		await userEvent.click(radio("Rust"));
		expect(entries(form)).toEqual([["stack", "rust"]]);
		await userEvent.click(radio("React and Next.js"));
		expect(entries(form)).toEqual([["stack", "react"]]);
	});

	test("required blocks the form's submission until an option is chosen, and each input's validity says why", async () => {
		const lead = React.createRef<HTMLInputElement>();
		const onSubmit = vi.fn((event: React.SubmitEvent) => {
			event.preventDefault();
		});
		render(
			<form aria-label="Hiring" onSubmit={onSubmit}>
				<RadioGroup required name="role" label="Role">
					<Radio ref={lead} value="lead" label="Backend lead" />
					<Radio value="architect" label="Software architect" />
				</RadioGroup>
				<button type="submit">Continue</button>
			</form>,
		);
		expect(lead.current?.validity.valueMissing).toBe(true);
		await userEvent.click(button("Continue"));
		expect(onSubmit).not.toHaveBeenCalled();
		await userEvent.click(radio("Software architect"));
		expect(lead.current?.validity.valid).toBe(true);
		await userEvent.click(button("Continue"));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});
});

describe("Radio", () => {
	test("helperText describes the radio through aria-describedby, on a line under its label, and aria-describedby adds descriptions", () => {
		render(
			<>
				<p id="lead-note">Remote from Medellín.</p>
				<RadioGroup label="Role">
					<Radio
						aria-describedby="lead-note"
						value="lead"
						label="Backend lead"
						helperText="Own the architecture and grow the team"
					/>
					<Radio
						value="senior"
						label="Senior backend engineer"
						helperText="Ship services inside an existing team"
					/>
				</RadioGroup>
			</>,
		);
		expect(radio("Backend lead")).toHaveAccessibleDescription(
			"Remote from Medellín. Own the architecture and grow the team",
		);
		expect(radio("Senior backend engineer")).toHaveAccessibleDescription(
			"Ship services inside an existing team",
		);
		expect(
			box(screen.getByText("Ship services inside an existing team")).top,
		).toBeGreaterThanOrEqual(
			box(screen.getByText("Senior backend engineer")).bottom - 0.5,
		);
	});

	test("the ref is the radio's input, holding its value; id is the input's, generated and unique when omitted", () => {
		const node = React.createRef<HTMLInputElement>();
		const rust = React.createRef<HTMLInputElement>();
		const react = React.createRef<HTMLInputElement>();
		render(
			<RadioGroup label="Preferred stack">
				<Radio ref={node} id="node-input" value="node" label="Node.js" />
				<Radio ref={rust} value="rust" label="Rust" />
				<Radio ref={react} value="react" label="React" />
			</RadioGroup>,
		);
		expect(node.current).toBeInstanceOf(HTMLInputElement);
		expect(node.current?.value).toBe("node");
		expect(node.current?.id).toBe("node-input");
		expect(rust.current?.value).toBe("rust");
		expect(rust.current?.id).toMatch(/\S/v);
		expect(react.current?.id).toMatch(/\S/v);
		expect(react.current?.id).not.toBe(rust.current?.id);
	});

	test("readOnly reaches the input; aria-*, data-* and title reach the radio", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(
			<>
				<RadioGroup label="Preferred stack">
					<Radio
						ref={ref}
						readOnly
						aria-controls="rust-note"
						data-testid="rust"
						title="Systems work"
						value="rust"
						label="Rust"
					/>
				</RadioGroup>
				<p id="rust-note">A daemon for my wheel.</p>
			</>,
		);
		expect(ref.current?.readOnly).toBe(true);
		const control = radio("Rust");
		expect(control).toHaveAttribute("aria-controls", "rust-note");
		expect(screen.getByTestId("rust")).toBe(control);
		expect(control).toHaveAttribute("title", "Systems work");
	});

	test("className and style go to the Radio's root wrapper, around the radio, its label and its helper text", () => {
		render(
			<RadioGroup label="Role">
				<Radio
					className="custom"
					style={{ marginInlineStart: 12 }}
					value="lead"
					label="Backend lead"
					helperText="Own the architecture"
				/>
			</RadioGroup>,
		);
		const root = document.querySelector<HTMLElement>(".custom");
		if (!root) {
			throw new Error("className landed nowhere");
		}

		expect(root.style.marginInlineStart).toBe("12px");
		expect(root.contains(radio("Backend lead"))).toBe(true);
		expect(root.contains(screen.getByText("Backend lead"))).toBe(true);
		expect(root.contains(screen.getByText("Own the architecture"))).toBe(true);
		expect(radio("Backend lead")).not.toHaveClass("custom");
		expect(group("Role")).not.toHaveClass("custom");
	});

	test("disabled disables only that option: a press can't choose it, and the others still can", async () => {
		const cdk = React.createRef<HTMLInputElement>();
		const onChange = vi.fn<OnGroupChange>();
		render(
			<RadioGroup
				label="Infrastructure as code"
				defaultValue="terraform"
				onChange={onChange}
			>
				<Radio value="terraform" label="Terraform" />
				<Radio ref={cdk} disabled value="cdk" label="AWS CDK" />
				<Radio value="pulumi" label="Pulumi" />
			</RadioGroup>,
		);
		expect(isDisabled(radio("AWS CDK"))).toBe(true);
		expect(cdk.current?.disabled).toBe(true);
		expect(isDisabled(radio("Terraform"))).toBe(false);
		await userEvent.click(radio("AWS CDK"), { force: true });
		expect(onChange).not.toHaveBeenCalled();
		expect(chosen("Terraform", "AWS CDK", "Pulumi")).toEqual(["Terraform"]);
		await userEvent.click(radio("Pulumi"));
		await expect
			.poll(() => chosen("Terraform", "AWS CDK", "Pulumi"))
			.toEqual(["Pulumi"]);
	});

	test("a Radio's error marks only that option, and error={false} keeps one out of its group's error", async () => {
		await parkPointer();
		render(
			<>
				<RadioGroup label="Role">
					<Radio error value="lead" label="Backend lead" />
					<Radio value="senior" label="Senior backend engineer" />
				</RadioGroup>
				<RadioGroup error label="Time zone overlap">
					<Radio value="full" label="Full US hours" />
					<Radio error={false} value="half" label="Half a day" />
				</RadioGroup>
			</>,
		);
		const danger = resolved("color", "var(--danger)");
		const ring = (name: string) =>
			getComputedStyle(drawnCircle(radio(name))).borderTopColor;
		expect(radio("Backend lead")).toHaveAttribute("aria-invalid", "true");
		expect(ring("Backend lead")).toBe(danger);
		expect(radio("Senior backend engineer")).not.toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(ring("Senior backend engineer")).not.toBe(danger);
		expect(radio("Full US hours")).toHaveAttribute("aria-invalid", "true");
		expect(ring("Full US hours")).toBe(danger);
		expect(radio("Half a day")).not.toHaveAttribute("aria-invalid", "true");
		expect(ring("Half a day")).not.toBe(danger);
	});

	test("ref.current.focus() moves focus into the radio, and onFocus and onBlur are called as focus arrives and leaves", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const onFocus = vi.fn<() => void>();
		const onBlur = vi.fn<() => void>();
		render(
			<Around>
				<RadioGroup label="Preferred stack">
					<Radio
						ref={ref}
						value="node"
						label="Node.js"
						onFocus={onFocus}
						onBlur={onBlur}
					/>
				</RadioGroup>
			</Around>,
		);
		ref.current?.focus();
		expect(hasFocus(radio("Node.js"))).toBe(true);
		expect(onFocus).toHaveBeenCalledTimes(1);
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		expect(onBlur).toHaveBeenCalledTimes(1);
		await userEvent.tab({ shift: true });
		expect(onFocus).toHaveBeenCalledTimes(2);
	});
});

describe("Radio outside a RadioGroup", () => {
	test("checked controls it: a press calls onChange(event, true) with its input checked, and only the prop checks it", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const { calls, onChange } = recorder<boolean>();
		const { rerender } = render(
			<Radio
				ref={ref}
				checked={false}
				value="email"
				label="Email me"
				onChange={onChange}
			/>,
		);
		await userEvent.click(radio("Email me"));
		expect(
			calls.map((call) => [call.type, call.inputChecked, call.value]),
		).toEqual([["change", true, true]]);
		expect(calls[0]?.target).toBe(ref.current);
		expect(radio("Email me")).not.toBeChecked();
		rerender(
			<Radio
				ref={ref}
				checked
				value="email"
				label="Email me"
				onChange={onChange}
			/>,
		);
		expect(radio("Email me")).toBeChecked();
		expect(ref.current?.checked).toBe(true);
	});

	test("defaultChecked checks it at first; a press checks an unchecked one with onChange(event, true), and a checked one stays checked", async () => {
		const { calls, onChange } = recorder<boolean>();
		render(
			<>
				<Radio defaultChecked value="email" label="Email" />
				<Radio value="phone" label="Phone" onChange={onChange} />
			</>,
		);
		expect(radio("Email")).toBeChecked();
		expect(radio("Phone")).not.toBeChecked();
		await userEvent.click(radio("Phone"));
		await expect.element(radio("Phone")).toBeChecked();
		await userEvent.click(radio("Phone"));
		expect(radio("Phone")).toBeChecked();
		expect(calls.map((call) => [call.type, call.value])).toEqual([
			["change", true],
		]);
	});

	test("checked, it sends name=value with its form; name, form and required reach its input", async () => {
		const email = React.createRef<HTMLInputElement>();
		const phone = React.createRef<HTMLInputElement>();
		render(
			<>
				<form id="contact" aria-label="Contact" />
				<Radio
					ref={email}
					defaultChecked
					required
					form="contact"
					name="channel"
					value="email"
					label="Email"
				/>
				<Radio
					ref={phone}
					form="contact"
					name="callback"
					value="phone"
					label="Phone"
				/>
			</>,
		);
		const form = screen.getByRole("form", { name: "Contact" });
		expect(email.current?.name).toBe("channel");
		expect(email.current?.form).toBe(form);
		expect(email.current?.required).toBe(true);
		expect(phone.current?.required).toBe(false);
		expect(entries(form)).toEqual([["channel", "email"]]);
		await userEvent.click(radio("Phone"));
		expect(entries(form)).toEqual([
			["channel", "email"],
			["callback", "phone"],
		]);
	});
});

describe("RadioGroup: readOnly", () => {
	test("readOnly reaches the input and, as on a native radio, doesn't stop a press: it checks and onChange reports it", async () => {
		const onChange = vi.fn<OnGroupChange>();
		render(
			<RadioGroup label="Preferred stack" onChange={onChange}>
				<Radio readOnly value="rust" label="Rust" />
				<Radio readOnly value="node" label="Node.js" />
			</RadioGroup>,
		);
		await userEvent.click(radio("Rust"));
		await expect.element(radio("Rust")).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});
