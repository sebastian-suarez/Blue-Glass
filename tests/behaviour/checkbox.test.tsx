import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { Checkbox, Icon, type CheckboxProps } from "#ui";

afterEach(() => {
	cleanup();
});

function px(value: string): number {
	return Number(value.replace(/px$/v, ""));
}

function byId(id: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

type OnChange = NonNullable<CheckboxProps["onChange"]>;

type Change = {
	type: string;
	target: EventTarget;
	inputChecked: boolean | undefined;
	checked: boolean;
};

function recorder() {
	const calls: Change[] = [];
	const onChange = vi.fn<OnChange>((event, checked) => {
		const { target } = event;
		calls.push({
			type: event.type,
			target,
			inputChecked:
				target instanceof HTMLInputElement ? target.checked : undefined,
			checked,
		});
	});
	return { calls, onChange };
}

function checkbox(name: string): HTMLElement {
	return screen.getByRole("checkbox", { name });
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

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

function drawnBox(control: HTMLElement): HTMLElement {
	const target = control.getBoundingClientRect();
	const drawn = [
		control,
		...document.querySelectorAll<HTMLElement>("body *"),
	].find((element) => {
		const box = element.getBoundingClientRect();
		const style = getComputedStyle(element);
		return (
			style.borderTopStyle !== "none" &&
			px(style.borderTopWidth) > 0 &&
			Math.abs(box.left - target.left) < 0.5 &&
			Math.abs(box.top - target.top) < 0.5 &&
			Math.abs(box.width - target.width) < 0.5 &&
			Math.abs(box.height - target.height) < 0.5
		);
	});
	if (drawn === undefined) {
		throw new Error("no bordered box covers the checkbox");
	}

	return drawn;
}

function shownMarks(control: HTMLElement): string[] {
	return [...drawnBox(control).querySelectorAll("svg")]
		.filter(
			(svg) =>
				svg.checkVisibility({ visibilityProperty: true }) &&
				opacityOf(svg) > 0.99,
		)
		.map((svg) => svg.getHTML());
}

function glyph(name: string): string {
	const { container, unmount } = render(<Icon name={name} />);
	const markup = container.querySelector("svg")?.getHTML() ?? "";
	unmount();
	return markup;
}

function resolved(property: string, value: string): string {
	const probe = document.createElement("div");
	probe.style.borderStyle = "solid";
	probe.style.setProperty(property, value);
	document.body.append(probe);
	const result = getComputedStyle(probe).getPropertyValue(property);
	probe.remove();
	return result;
}

function describer(control: HTMLElement, text: string): HTMLElement {
	const ids = (control.getAttribute("aria-describedby") ?? "")
		.split(/\s+/v)
		.filter(Boolean);
	const element = ids
		.map((id) => byId(id))
		.find((candidate) => candidate?.textContent?.includes(text));
	if (!element) {
		throw new Error(`nothing aria-describedby points at holds "${text}"`);
	}

	return element;
}

function entries(form: HTMLElement): Array<[string, string]> {
	if (!(form instanceof HTMLFormElement)) {
		throw new TypeError("not a form");
	}

	return [...new FormData(form)].map(([key, value]) => [
		key,
		typeof value === "string" ? value : value.name,
	]);
}

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

const projects = [
	{ id: "rs50", label: "RS50 force-feedback bridge" },
	{ id: "vsebcode", label: "VSebCode" },
	{ id: "template", label: "Clean Architecture template" },
];

function Projects({ onParentChange }: { readonly onParentChange?: OnChange }) {
	const [checked, setChecked] = React.useState<string[]>(["rs50"]);
	const isAll = checked.length === projects.length;
	const isSome = checked.length > 0 && !isAll;
	return (
		<div role="group" aria-label="Notify me about">
			<Checkbox
				label="All projects"
				checked={isAll}
				indeterminate={isSome}
				onChange={(event, isChecked) => {
					onParentChange?.(event, isChecked);
					setChecked(isChecked ? projects.map((project) => project.id) : []);
				}}
			/>
			<div
				role="group"
				aria-label="Projects"
				style={{ display: "grid", paddingInlineStart: 30 }}
			>
				{projects.map((project) => (
					<Checkbox
						key={project.id}
						label={project.label}
						checked={checked.includes(project.id)}
						onChange={(_event, isChecked) => {
							setChecked((current) =>
								isChecked
									? [...current, project.id]
									: current.filter((id) => id !== project.id),
							);
						}}
					/>
				))}
			</div>
		</div>
	);
}

function checkedProjects(): string[] {
	const checked = screen.queryAllByRole("checkbox", { checked: true });
	return projects
		.filter((project) => checked.includes(checkbox(project.label)))
		.map((project) => project.id);
}

describe("Checkbox: what it shows", () => {
	test("label names the checkbox, which is unchecked and not mixed by default", () => {
		render(
			<Checkbox
				label={
					<>
						Email me when a new <strong>release</strong> ships
					</>
				}
			/>,
		);
		const control = checkbox("Email me when a new release ships");
		expect(control).not.toBeChecked();
		expect(control).not.toBePartiallyChecked();
	});

	test("aria-label names it when there's no label", () => {
		render(<Checkbox defaultChecked aria-label="Select VSebCode" />);
		expect(checkbox("Select VSebCode")).toBeChecked();
	});

	test("the whole row is the <label>, 32px tall at md: a click on its text or anywhere else on it toggles the checkbox", async () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Checkbox ref={ref} label="Remote" />);
		const control = checkbox("Remote");
		const text = screen.getByText("Remote");
		const row = text.closest("label");
		if (!row) {
			throw new Error("the label text isn't in a <label>");
		}

		expect(row.contains(control)).toBe(true);
		expect(size(row)[1]).toBe(32);
		await userEvent.click(text);
		expect(ref.current?.checked).toBe(true);
		const rowBox = row.getBoundingClientRect();
		const drawn = drawnBox(control).getBoundingClientRect();
		const textBox = text.getBoundingClientRect();
		const gap = (drawn.right + textBox.left) / 2;
		await userEvent.click(row, {
			position: { x: gap - rowBox.left, y: rowBox.height / 2 },
		});
		expect(ref.current?.checked).toBe(false);
		await userEvent.click(row, {
			position: { x: textBox.left - rowBox.left + 4, y: 1 },
		});
		expect(ref.current?.checked).toBe(true);
		expect(control).toBeChecked();
	});

	test("size: md (the default) draws a 20px box, sm a 16px one", () => {
		render(
			<>
				<Checkbox label="Default" />
				<Checkbox size="md" label="Medium" />
				<Checkbox size="sm" label="Small" />
			</>,
		);
		const defaultBox = checkbox("Default");
		const smallBox = checkbox("Small");
		expect(size(defaultBox)).toEqual([20, 20]);
		expect(size(drawnBox(defaultBox))).toEqual([20, 20]);
		expect(size(checkbox("Medium"))).toEqual([20, 20]);
		expect(size(smallBox)).toEqual([16, 16]);
		expect(size(drawnBox(smallBox))).toEqual([16, 16]);
	});

	test("it's drawn as a 1.5px dg-edge outline on glass-control in a radius-code box, filled with color-ink and an on-ink check or minus when checked or mixed", async () => {
		await parkPointer();
		render(
			<>
				<Checkbox label="Remote" />
				<Checkbox defaultChecked label="Remote, checked" />
				<Checkbox indeterminate label="All projects" />
			</>,
		);
		const ink = resolved("color", "var(--color-ink)");
		const off = getComputedStyle(drawnBox(checkbox("Remote")));
		expect(off.borderTopWidth).toBe(resolved("border-top-width", "1.5px"));
		expect(off.borderTopColor).toBe(resolved("color", "var(--dg-edge)"));
		expect(off.backgroundColor).toBe(resolved("color", "var(--glass-control)"));
		expect(off.borderTopLeftRadius).toBe(
			resolved("border-top-left-radius", "var(--radius-code)"),
		);
		expect(shownMarks(checkbox("Remote"))).toEqual([]);

		for (const [name, mark] of [
			["Remote, checked", "check"],
			["All projects", "minus"],
		] as const) {
			const filled = drawnBox(checkbox(name));
			expect(getComputedStyle(filled).borderTopColor).toBe(ink);
			expect(getComputedStyle(filled).backgroundColor).toBe(ink);
			expect(shownMarks(checkbox(name))).toEqual([glyph(mark)]);
			const shown = [...filled.querySelectorAll("svg")].find(
				(svg) => opacityOf(svg) > 0.99,
			);
			expect(shown && getComputedStyle(shown).color).toBe(
				resolved("color", "var(--on-ink)"),
			);
		}
	});

	test("helperText describes the checkbox through aria-describedby, on a line under the label", () => {
		render(
			<Checkbox
				label="US-hours overlap"
				helperText="At least four hours with US Eastern"
			/>,
		);
		const control = checkbox("US-hours overlap");
		expect(control).toHaveAccessibleDescription(
			"At least four hours with US Eastern",
		);
		const label = screen.getByText("US-hours overlap").getBoundingClientRect();
		const helper = screen
			.getByText("At least four hours with US Eastern")
			.getBoundingClientRect();
		expect(helper.top).toBeGreaterThanOrEqual(label.bottom - 0.5);
	});

	test("aria-describedby adds descriptions, and the helper text's id joins them", () => {
		render(
			<>
				<p id="digest-note">Sent on Mondays.</p>
				<Checkbox
					aria-describedby="digest-note"
					label="Weekly digest"
					helperText="One email instead of one per role."
				/>
			</>,
		);
		expect(checkbox("Weekly digest")).toHaveAccessibleDescription(
			"Sent on Mondays. One email instead of one per role.",
		);
	});

	test("error sets aria-invalid and a danger border, and turns helperText into a danger message with the error icon", async () => {
		await parkPointer();
		render(
			<>
				<Checkbox
					error
					label="You can email me about this role"
					helperText="Tick this so I can reply."
				/>
				<Checkbox
					label="Write-ups"
					helperText="Long-form notes on what I built and why."
				/>
			</>,
		);
		const danger = resolved("color", "var(--danger)");
		const invalid = checkbox("You can email me about this role");
		expect(invalid).toHaveAttribute("aria-invalid", "true");
		expect(invalid).toHaveAccessibleDescription("Tick this so I can reply.");
		expect(getComputedStyle(drawnBox(invalid)).borderTopColor).toBe(danger);
		expect(
			getComputedStyle(screen.getByText("Tick this so I can reply.")).color,
		).toBe(danger);
		const message = describer(invalid, "Tick this so I can reply.");
		expect(message.querySelector("svg")?.getHTML()).toBe(glyph("error"));

		const valid = checkbox("Write-ups");
		expect(valid).not.toHaveAttribute("aria-invalid", "true");
		expect(getComputedStyle(drawnBox(valid)).borderTopColor).not.toBe(danger);
		expect(
			getComputedStyle(
				screen.getByText("Long-form notes on what I built and why."),
			).color,
		).not.toBe(danger);
		expect(describer(valid, "Long-form notes").querySelector("svg")).toBeNull();
	});

	test("required sets required on the input and marks the label with an asterisk that isn't part of the name", () => {
		const required = React.createRef<HTMLInputElement>();
		const optional = React.createRef<HTMLInputElement>();
		render(
			<>
				<Checkbox
					ref={required}
					required
					label="You can email me about this role"
				/>
				<Checkbox ref={optional} label="Write-ups" />
			</>,
		);
		const control = checkbox("You can email me about this role");
		expect(required.current?.required).toBe(true);
		expect(control.closest("label")?.textContent?.trim()).toMatch(
			/^You can email me about this role\s*\*$/v,
		);
		expect(optional.current?.required).toBe(false);
		expect(checkbox("Write-ups").closest("label")?.textContent).not.toContain(
			"*",
		);
	});

	test("disabled disables the input and dims the row, and neither a press nor Tab reaches it", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const onChange = vi.fn<OnChange>();
		render(
			<Around>
				<Checkbox
					ref={ref}
					disabled
					label="Contract roles"
					onChange={onChange}
				/>
			</Around>,
		);
		const control = checkbox("Contract roles");
		expect(ref.current?.disabled).toBe(true);
		expect(isDisabled(control)).toBe(true);
		expect(opacityOf(screen.getByText("Contract roles"))).toBeCloseTo(0.5, 2);
		expect(opacityOf(drawnBox(control))).toBeCloseTo(0.5, 2);
		await userEvent.click(control, { force: true });
		await userEvent.click(screen.getByText("Contract roles"), { force: true });
		expect(onChange).not.toHaveBeenCalled();
		expect(ref.current?.checked).toBe(false);
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
	});

	test("className and style go to the root wrapper, around the checkbox and its label", () => {
		const { container } = render(
			<Checkbox className="custom" style={{ width: 300 }} label="Remote" />,
		);
		const root = container.firstElementChild;
		if (!(root instanceof HTMLElement)) {
			throw new TypeError("nothing rendered");
		}

		expect(root).toHaveClass("custom");
		expect(root.style.width).toBe("300px");
		expect(Math.round(root.getBoundingClientRect().width)).toBe(300);
		expect(root.contains(checkbox("Remote"))).toBe(true);
		expect(root.contains(screen.getByText("Remote"))).toBe(true);
		expect(checkbox("Remote")).not.toHaveClass("custom");
	});
});

describe("Checkbox: the input and its attributes", () => {
	test("the ref is the input, and name, value, required, readOnly, id and form reach it; aria-*, data-* and title reach the checkbox", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(
			<>
				<form id="hiring" aria-label="Hiring" />
				<Checkbox
					ref={ref}
					required
					readOnly
					name="consent"
					value="yes"
					id="consent-input"
					form="hiring"
					aria-controls="consent-terms"
					data-testid="consent"
					title="Consent to be contacted"
					label="You can email me about this role"
				/>
				<p id="consent-terms">I reply within two working days.</p>
			</>,
		);
		const input = ref.current;
		expect(input).toBeInstanceOf(HTMLInputElement);
		expect(input?.name).toBe("consent");
		expect(input?.value).toBe("yes");
		expect(input?.required).toBe(true);
		expect(input?.readOnly).toBe(true);
		expect(input?.id).toBe("consent-input");
		expect(input?.form).toBe(screen.getByRole("form", { name: "Hiring" }));
		const control = checkbox("You can email me about this role");
		expect(control).toHaveAttribute("aria-controls", "consent-terms");
		expect(screen.getByTestId("consent")).toBe(control);
		expect(control).toHaveAttribute("title", "Consent to be contacted");
	});

	test("id is the input's, generated and unique when omitted, and a label elsewhere can point at it", async () => {
		const first = React.createRef<HTMLInputElement>();
		const second = React.createRef<HTMLInputElement>();
		const own = React.createRef<HTMLInputElement>();
		render(
			<>
				<Checkbox ref={first} label="Remote" />
				<Checkbox ref={second} label="Contract roles" />
				<label htmlFor="digest-input">Weekly digest</label>
				<Checkbox ref={own} id="digest-input" />
			</>,
		);
		expect(first.current?.id).toMatch(/\S/v);
		expect(second.current?.id).toMatch(/\S/v);
		expect(second.current?.id).not.toBe(first.current?.id);
		expect(own.current?.id).toBe("digest-input");
		await userEvent.click(screen.getByText("Weekly digest"));
		expect(own.current?.checked).toBe(true);
	});

	test("ref.current.focus() moves focus into the checkbox", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Checkbox ref={ref} label="Remote" />);
		ref.current?.focus();
		expect(hasFocus(checkbox("Remote"))).toBe(true);
	});

	test("onFocus and onBlur are called as focus arrives and leaves", async () => {
		const onFocus = vi.fn<() => void>();
		const onBlur = vi.fn<() => void>();
		render(
			<Around>
				<Checkbox label="Remote" onFocus={onFocus} onBlur={onBlur} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onBlur).not.toHaveBeenCalled();
		await userEvent.tab();
		expect(onBlur).toHaveBeenCalledTimes(1);
	});
});

describe("Checkbox: checked and onChange", () => {
	test("uncontrolled: defaultChecked sets where it starts, and each press toggles it", async () => {
		render(
			<>
				<Checkbox label="Remote" />
				<Checkbox defaultChecked label="Email me when a new release ships" />
			</>,
		);
		const remote = checkbox("Remote");
		const releases = checkbox("Email me when a new release ships");
		expect(remote).not.toBeChecked();
		expect(releases).toBeChecked();
		await userEvent.click(remote);
		await expect.element(remote).toBeChecked();
		await userEvent.click(remote);
		await expect.element(remote).not.toBeChecked();
		await userEvent.click(releases);
		await expect.element(releases).not.toBeChecked();
	});

	test("onChange gets a change event on the input, which already holds the new state, and the new checked state", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const { calls, onChange } = recorder();
		render(<Checkbox ref={ref} label="Remote" onChange={onChange} />);
		await userEvent.click(checkbox("Remote"));
		await userEvent.click(checkbox("Remote"));
		expect(
			calls.map((call) => [call.type, call.inputChecked, call.checked]),
		).toEqual([
			["change", true, true],
			["change", false, false],
		]);
		for (const call of calls) {
			expect(call.target).toBe(ref.current);
		}
	});

	test("controlled: checked decides, a press only calls onChange, and a new checked moves it", async () => {
		const { calls, onChange } = recorder();
		function Controlled() {
			const [checked, setChecked] = React.useState(false);
			return (
				<>
					<Checkbox checked={false} label="Fixed" onChange={onChange} />
					<Checkbox
						checked={checked}
						label="Live"
						onChange={(_event, isChecked) => {
							setChecked(isChecked);
						}}
					/>
				</>
			);
		}

		render(<Controlled />);
		await userEvent.click(checkbox("Fixed"));
		expect(calls.map((call) => call.checked)).toEqual([true]);
		expect(checkbox("Fixed")).not.toBeChecked();
		await userEvent.click(checkbox("Live"));
		await expect.element(checkbox("Live")).toBeChecked();
		await userEvent.click(checkbox("Live"));
		await expect.element(checkbox("Live")).not.toBeChecked();
	});

	test("preventDefault() in onChange cancels the change", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const onChange = vi.fn<OnChange>((event) => {
			event.preventDefault();
		});
		render(<Checkbox ref={ref} label="Remote" onChange={onChange} />);
		await userEvent.click(checkbox("Remote"));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0]?.[1]).toBe(true);
		expect(checkbox("Remote")).not.toBeChecked();
		expect(ref.current?.checked).toBe(false);
	});

	referenceDefectTest(
		"after a cancelled press, the next press is reported to onChange and can be cancelled too",
		async () => {
			const ref = React.createRef<HTMLInputElement>();
			const onChange = vi.fn<OnChange>((event) => {
				event.preventDefault();
			});
			render(<Checkbox ref={ref} label="Remote" onChange={onChange} />);
			await userEvent.click(checkbox("Remote"));
			await userEvent.click(checkbox("Remote"));
			expect(onChange.mock.calls.map((call) => call[1])).toEqual([true, true]);
			expect(checkbox("Remote")).not.toBeChecked();
			expect(ref.current?.checked).toBe(false);
		},
	);
});

describe("Checkbox: indeterminate", () => {
	test("indeterminate sets the input's indeterminate property, the checkbox reads as partially checked, and stays so through presses", async () => {
		const mixed = React.createRef<HTMLInputElement>();
		const plain = React.createRef<HTMLInputElement>();
		render(
			<>
				<Checkbox ref={mixed} indeterminate label="All projects" />
				<Checkbox ref={plain} label="Remote" />
			</>,
		);
		expect(mixed.current?.indeterminate).toBe(true);
		expect(checkbox("All projects")).toBePartiallyChecked();
		expect(plain.current?.indeterminate).toBe(false);
		expect(checkbox("Remote")).not.toBePartiallyChecked();
		await userEvent.click(checkbox("All projects"));
		expect(mixed.current?.checked).toBe(true);
		expect(mixed.current?.indeterminate).toBe(true);
		expect(checkbox("All projects")).toBePartiallyChecked();
	});

	referenceDefectTest(
		"controlled and mixed, it stays mixed after a press its parent ignores",
		async () => {
			const ref = React.createRef<HTMLInputElement>();
			const onChange = vi.fn<OnChange>();
			render(
				<Checkbox
					ref={ref}
					indeterminate
					checked={false}
					label="All projects"
					onChange={onChange}
				/>,
			);
			await userEvent.click(checkbox("All projects"));
			expect(onChange).toHaveBeenCalledTimes(1);
			expect(checkbox("All projects")).toBePartiallyChecked();
			expect(ref.current?.indeterminate).toBe(true);
			expect(ref.current?.checked).toBe(false);
		},
	);

	test("a parent goes mixed while some of its children are checked, and a press on it checks or clears them all", async () => {
		render(<Projects />);
		const parent = checkbox("All projects");
		expect(parent).toBePartiallyChecked();
		expect(checkedProjects()).toEqual(["rs50"]);
		await userEvent.click(parent);
		await expect
			.poll(() => checkedProjects())
			.toEqual(["rs50", "vsebcode", "template"]);
		expect(parent).toBeChecked();
		expect(parent).not.toBePartiallyChecked();
		await userEvent.click(parent);
		await expect.poll(() => checkedProjects()).toEqual([]);
		expect(parent).not.toBeChecked();
		expect(parent).not.toBePartiallyChecked();
		await userEvent.click(checkbox("VSebCode"));
		await expect.element(parent).toBePartiallyChecked();
		await userEvent.click(checkbox("RS50 force-feedback bridge"));
		await userEvent.click(checkbox("Clean Architecture template"));
		await expect.element(parent).toBeChecked();
	});
});

describe("Checkbox: keyboard", () => {
	test("Tab reaches the checkbox, and the next Tab leaves it", async () => {
		render(
			<Around>
				<Checkbox label="Remote" />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(hasFocus(checkbox("Remote"))).toBe(true);
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		expect(hasFocus(checkbox("Remote"))).toBe(true);
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
	});

	test("Space toggles it, with a change event each time", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const { calls, onChange } = recorder();
		render(
			<Around>
				<Checkbox ref={ref} label="Remote" onChange={onChange} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await userEvent.keyboard(" ");
		await expect.element(checkbox("Remote")).toBeChecked();
		await userEvent.keyboard(" ");
		await expect.element(checkbox("Remote")).not.toBeChecked();
		expect(
			calls.map((call) => [call.type, call.inputChecked, call.checked]),
		).toEqual([
			["change", true, true],
			["change", false, false],
		]);
		expect(calls[0]?.target).toBe(ref.current);
	});

	test("Space on a mixed checkbox checks it: onChange gets true, and the parent checks all its children", async () => {
		const { calls, onChange } = recorder();
		render(
			<Around>
				<Projects onParentChange={onChange} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(hasFocus(checkbox("All projects"))).toBe(true);
		await userEvent.keyboard(" ");
		expect(calls.map((call) => [call.type, call.checked])).toEqual([
			["change", true],
		]);
		await expect.element(checkbox("All projects")).toBeChecked();
		expect(checkedProjects()).toEqual(["rs50", "vsebcode", "template"]);
	});
});

describe("Checkbox: forms", () => {
	test("a checked checkbox sends name=value with its form, on without a value, and an unchecked one sends nothing", async () => {
		render(
			<form aria-label="Alerts">
				<Checkbox defaultChecked name="releases" value="yes" label="Releases" />
				<Checkbox name="digest" label="Weekly digest" />
			</form>,
		);
		const form = screen.getByRole("form", { name: "Alerts" });
		expect(entries(form)).toEqual([["releases", "yes"]]);
		await userEvent.click(checkbox("Weekly digest"));
		expect(entries(form)).toEqual([
			["releases", "yes"],
			["digest", "on"],
		]);
		await userEvent.click(checkbox("Releases"));
		expect(entries(form)).toEqual([["digest", "on"]]);
	});

	test("required blocks the form's submission until it's checked, and the input's validity says why", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const onSubmit = vi.fn((event: React.SubmitEvent) => {
			event.preventDefault();
		});
		render(
			<form aria-label="Contact" onSubmit={onSubmit}>
				<Checkbox
					ref={ref}
					required
					name="consent"
					label="You can email me about this role"
				/>
				<button type="submit">Send</button>
			</form>,
		);
		expect(ref.current?.validity.valueMissing).toBe(true);
		await userEvent.click(button("Send"));
		expect(onSubmit).not.toHaveBeenCalled();
		await userEvent.click(checkbox("You can email me about this role"));
		expect(ref.current?.validity.valid).toBe(true);
		await userEvent.click(button("Send"));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	test("form joins it to a form it sits outside of", async () => {
		const ref = React.createRef<HTMLInputElement>();
		render(
			<>
				<form id="alerts" aria-label="Alerts" />
				<Checkbox ref={ref} form="alerts" name="digest" label="Weekly digest" />
			</>,
		);
		const form = screen.getByRole("form", { name: "Alerts" });
		expect(ref.current?.form).toBe(form);
		expect(entries(form)).toEqual([]);
		await userEvent.click(checkbox("Weekly digest"));
		expect(entries(form)).toEqual([["digest", "on"]]);
	});
});

describe("Checkbox: readOnly", () => {
	test("readOnly reaches the input and, as on a native checkbox, doesn't stop a press: it toggles and onChange reports it", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Checkbox readOnly label="Ping me" onChange={onChange} />);
		await userEvent.click(checkbox("Ping me"));
		await expect.element(checkbox("Ping me")).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});
