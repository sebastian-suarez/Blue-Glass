import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	Button,
	type FieldBaseProps,
	Icon,
	InputAdornment,
	type InputAdornmentProps,
	TextField,
	type TextFieldProps,
} from "#ui";

async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; right: 0; bottom: 0; width: 40px; height: 40px";
	document.body.append(spot);
	try {
		await userEvent.hover(spot);
	} finally {
		spot.remove();
	}
}

beforeEach(async () => {
	await parkPointer();
});

afterEach(() => {
	cleanup();
});

type Control = HTMLInputElement | HTMLTextAreaElement;

function asControl(element: HTMLElement): Control {
	if (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement
	) {
		return element;
	}

	throw new Error(
		`expected an input or a textarea, got <${element.tagName.toLowerCase()}>`,
	);
}

function control(name: string): Control {
	for (const role of ["textbox", "searchbox", "spinbutton"] as const) {
		const found = screen.queryByRole(role, { name });
		if (found) {
			return asControl(found);
		}
	}

	return asControl(screen.getByLabelText(name));
}

function input(name: string): HTMLInputElement {
	const element = control(name);
	if (!(element instanceof HTMLInputElement)) {
		throw new TypeError(`${name} isn't an input`);
	}

	return element;
}

function textarea(name: string): HTMLTextAreaElement {
	const element = control(name);
	if (!(element instanceof HTMLTextAreaElement)) {
		throw new TypeError(`${name} isn't a textarea`);
	}

	return element;
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function px(value: string): number {
	return Number(value.replace(/px$/v, ""));
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function pill(element: Element): HTMLElement {
	for (
		let node: HTMLElement | null =
			element instanceof HTMLElement ? element : element.parentElement;
		node;
		node = node.parentElement
	) {
		const style = getComputedStyle(node);
		if (style.borderTopStyle !== "none" && px(style.borderTopWidth) > 0) {
			return node;
		}
	}

	throw new Error("no bordered pill around the control");
}

function labelOf(element: Control): HTMLLabelElement {
	const labels = [...(element.labels ?? [])];
	expect(labels).toHaveLength(1);
	return labels[0];
}

function resolved(token: string, property = "color"): string {
	const probe = document.createElement("div");
	probe.style.setProperty(property, `var(${token})`);
	document.body.append(probe);
	const value = getComputedStyle(probe).getPropertyValue(property);
	probe.remove();
	return value;
}

function lightness(colour: string): number {
	const [red = 0, green = 0, blue = 0, alpha = 1] = (
		colour.match(/[\d.]+/gv) ?? []
	).map(Number);
	const onWhite = (channel: number) => {
		const own = channel * alpha;
		const page = 255 * (1 - alpha);
		return own + page;
	};

	const weighted = [
		0.2126 * onWhite(red),
		0.7152 * onWhite(green),
		0.0722 * onWhite(blue),
	];
	return weighted[0] + weighted[1] + weighted[2];
}

function glyph(name: string): string {
	const { container, unmount } = render(<Icon name={name} />);
	const markup = container.querySelector("svg")?.getHTML() ?? "";
	unmount();
	return markup;
}

function isShown(element: Element): boolean {
	const { width, height } = box(element);
	return (
		element.isConnected &&
		width > 0 &&
		height > 0 &&
		element.checkVisibility({ visibilityProperty: true })
	);
}

function errorIconBefore(
	field: Element,
	words: Element,
	markup: string,
): SVGSVGElement | undefined {
	const line = box(words);
	return [...field.querySelectorAll("svg")].find((svg) => {
		const icon = box(svg);
		const half = icon.height / 2;
		const middle = icon.top + half;
		return (
			svg.getHTML() === markup &&
			isShown(svg) &&
			icon.right <= line.left + 0.5 &&
			middle >= line.top &&
			middle <= line.bottom
		);
	});
}

async function typeAtEnd(element: Control, text: string): Promise<void> {
	element.focus();
	if (
		element instanceof HTMLTextAreaElement ||
		["text", "search", "url", "tel", "password"].includes(element.type)
	) {
		element.setSelectionRange(element.value.length, element.value.length);
	} else {
		await userEvent.keyboard("{End}");
	}

	await userEvent.keyboard(text);
}

function rowsOf(element: HTMLTextAreaElement): number {
	const style = getComputedStyle(element);
	const line = px(style.lineHeight);
	const padding = px(style.paddingTop) + px(style.paddingBottom);
	return (element.clientHeight - padding) / line;
}

async function expectRows(
	element: HTMLTextAreaElement,
	rows: number,
): Promise<void> {
	await expect
		.poll(() => {
			const measured = rowsOf(element);
			return Math.abs(measured - rows) < 0.1 ? rows : measured;
		})
		.toBe(rows);
}

function canScroll(element: HTMLTextAreaElement): boolean {
	if (element.scrollHeight <= element.clientHeight + 1) {
		return false;
	}

	const before = element.scrollTop;
	element.scrollTop = element.scrollHeight;
	const hasMoved = element.scrollTop > before;
	element.scrollTop = before;
	return hasMoved && getComputedStyle(element).overflowY !== "hidden";
}

function typedLines(from: number, to: number): string {
	return Array.from(
		{ length: to - from + 1 },
		(_, index) => `line ${from + index}`,
	).join("{Enter}");
}

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
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

function focusBefore() {
	button("Before").focus();
}

type Edit = {
	type: string;
	isNative: boolean;
	nativeType: string;
	target: EventTarget;
	currentTarget: EventTarget;
	targetValue: string;
	value: string;
};

function recorder() {
	const edits: Edit[] = [];
	const onChange = vi.fn<NonNullable<TextFieldProps["onChange"]>>(
		(event, value) => {
			edits.push({
				type: event.type,
				isNative: event instanceof Event,
				nativeType: event.nativeEvent.type,
				target: event.target,
				currentTarget: event.currentTarget,
				targetValue: event.target.value,
				value,
			});
		},
	);
	return { edits, onChange };
}

const sizes = [
	{ name: "md by default", size: undefined, height: 46 },
	{ name: "md", size: "md", height: 46 },
	{ name: "sm", size: "sm", height: 36 },
] as const satisfies ReadonlyArray<{
	name: string;
	size: FieldBaseProps["size"];
	height: number;
}>;

const types = [
	"text",
	"email",
	"password",
	"number",
	"search",
	"tel",
	"url",
] as const satisfies ReadonlyArray<TextFieldProps["type"]>;

describe("TextField: label, name and description", () => {
	test("the label is a real <label for> above the pill, 13px at weight 600, and a press on it focuses the input", async () => {
		render(<TextField label="Email" />);
		const email = input("Email");
		const label = labelOf(email);
		expect(label).toBeInstanceOf(HTMLLabelElement);
		expect(label.htmlFor).toBe(email.id);
		expect(label).toBeVisible();
		expect(box(label).bottom).toBeLessThanOrEqual(box(pill(email)).top + 0.5);
		expect(getComputedStyle(label).fontSize).toBe("13px");
		expect(getComputedStyle(label).fontWeight).toBe("600");
		await userEvent.click(label);
		await expect.element(email).toHaveFocus();
	});

	test("the label names the input; the placeholder is only a hint inside the empty field, in color-muted", () => {
		render(
			<TextField label="Email" type="email" placeholder="you@company.com" />,
		);
		const email = input("Email");
		expect(email).toHaveAccessibleName("Email");
		expect(email).toHaveAttribute("placeholder", "you@company.com");
		expect(email).toHaveValue("");
		expect(getComputedStyle(email, "::placeholder").color).toBe(
			resolved("--color-muted"),
		);
	});

	test("without a label, aria-label names the input, and the root doesn't take it", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<TextField ref={ref} aria-label="Search projects" type="search" />);
		const search = input("Search projects");
		expect(search).toHaveAttribute("aria-label", "Search projects");
		expect(ref.current).not.toHaveAttribute("aria-label");
		expect(ref.current?.querySelector("label")).toBeNull();
	});

	test("aria-labelledby names the input", () => {
		render(
			<>
				<h3 id="billing-title">Billing email</h3>
				<TextField aria-labelledby="billing-title" type="email" />
			</>,
		);
		expect(input("Billing email")).toHaveAttribute(
			"aria-labelledby",
			"billing-title",
		);
	});

	test("helperText sits under the pill in color-muted and describes the input through aria-describedby; no aria-invalid and no icon without error", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<TextField ref={ref} label="Email" helperText="I reply within a day." />,
		);
		const email = input("Email");
		const helper = screen.getByText("I reply within a day.");
		expect(email).toHaveAccessibleDescription("I reply within a day.");
		expect(box(helper).top).toBeGreaterThanOrEqual(box(pill(email)).bottom);
		expect(getComputedStyle(helper).color).toBe(resolved("--color-muted"));
		expect(email).not.toHaveAttribute("aria-invalid", "true");
		expect(
			errorIconBefore(must(ref.current), helper, glyph("error")),
		).toBeUndefined();
	});

	test("aria-describedby goes to the input and joins the helper text in its description", () => {
		render(
			<>
				<p id="invoice-note">Shown on the invoice.</p>
				<TextField
					label="Company"
					helperText="So I know who’s asking."
					aria-describedby="invoice-note"
				/>
			</>,
		);
		const company = input("Company");
		expect(company.getAttribute("aria-describedby")?.split(" ")).toContain(
			"invoice-note",
		);
		expect(company).toHaveAccessibleDescription(/Shown on the invoice\./v);
		expect(company).toHaveAccessibleDescription(/So I know who’s asking\./v);
	});

	test("id is the input's and the label points at it; without one, each field gets an id of its own", () => {
		render(
			<>
				<TextField id="work-email" label="Work email" />
				<TextField label="Name" />
				<TextField label="Company" />
			</>,
		);
		const email = input("Work email");
		expect(email.id).toBe("work-email");
		expect(labelOf(email).htmlFor).toBe("work-email");
		const name = input("Name");
		const company = input("Company");
		expect(name.id).not.toBe("");
		expect(company.id).not.toBe("");
		expect(name.id).not.toBe(company.id);
		expect(labelOf(name).htmlFor).toBe(name.id);
		expect(labelOf(company).htmlFor).toBe(company.id);
	});

	test("error marks the input aria-invalid, edges the pill in danger, and turns the helper danger with the error icon before its words", () => {
		const ref = React.createRef<HTMLDivElement>();
		const markup = glyph("error");
		render(
			<TextField
				ref={ref}
				error
				label="Email"
				type="email"
				defaultValue="sebas@"
				helperText="Add the domain: @company.com."
			/>,
		);
		const email = input("Email");
		const helper = screen.getByText("Add the domain: @company.com.");
		expect(email).toHaveAttribute("aria-invalid", "true");
		expect(email).toHaveAccessibleDescription("Add the domain: @company.com.");
		expect(getComputedStyle(pill(email)).borderTopColor).toBe(
			resolved("--danger"),
		);
		expect(getComputedStyle(helper).color).toBe(resolved("--danger"));
		expect(errorIconBefore(must(ref.current), helper, markup)).toBeDefined();
	});

	test("required puts an asterisk after the label's words, outside the name, and makes the input required; without it, neither", () => {
		render(
			<>
				<TextField required label="Company" />
				<TextField label="Website" />
			</>,
		);
		const company = input("Company");
		const label = labelOf(company);
		expect(label.textContent).toMatch(/^Company\s*\*$/v);
		expect(within(label).getByText("*")).toBeVisible();
		expect(company).toHaveAccessibleName("Company");
		expect(company).toBeRequired();
		const website = input("Website");
		expect(labelOf(website).textContent).toBe("Website");
		expect(website).not.toBeRequired();
	});
});

describe("TextField: look", () => {
	test.each(sizes)(
		"size $name: the pill is $height px tall",
		({ size, height }) => {
			render(<TextField label="Employer" size={size} defaultValue="EPAM" />);
			const field = pill(input("Employer"));
			expect(Math.round(box(field).height)).toBe(height);
		},
	);

	test("outlined, the default: the glass-control fill in a dg-edge border, round as a pill", () => {
		render(
			<>
				<TextField label="Default" />
				<TextField label="Outlined" variant="outlined" />
			</>,
		);
		for (const name of ["Default", "Outlined"]) {
			const style = getComputedStyle(pill(input(name)));
			expect(style.backgroundColor).toBe(resolved("--glass-control"));
			expect(style.borderTopColor).toBe(resolved("--dg-edge"));
			expect(style.borderTopStyle).toBe("solid");
			expect(style.borderTopLeftRadius).toBe(
				resolved("--radius-pill", "border-top-left-radius"),
			);
		}
	});

	test("filled: a glass-inset well whose edge darkens on hover and on focus", async () => {
		render(
			<Around>
				<TextField label="Name" variant="filled" defaultValue="Sebastián" />
			</Around>,
		);
		const name = input("Name");
		const well = pill(name);
		const edge = () => lightness(getComputedStyle(well).borderTopColor);
		expect(getComputedStyle(well).backgroundColor).toBe(
			resolved("--glass-inset"),
		);
		const atRest = edge();
		await userEvent.hover(well);
		await expect.poll(edge).toBeLessThan(atRest - 20);
		await parkPointer();
		await expect.poll(edge).toBe(atRest);
		focusBefore();
		await userEvent.tab();
		await expect.element(name).toHaveFocus();
		await expect.poll(edge).toBeLessThan(atRest - 20);
	});

	test("fullWidth stretches the field and its pill to the container's width; without it the field keeps its own width", () => {
		const fitted = React.createRef<HTMLDivElement>();
		const full = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 360 }}>
				<TextField ref={fitted} label="Fitted" />
				<TextField ref={full} fullWidth label="Full" />
			</div>,
		);
		const fullRoot = must(full.current);
		const fullPill = pill(input("Full"));
		const fittedRoot = must(fitted.current);
		expect(Math.round(box(fullRoot).width)).toBe(360);
		expect(Math.round(box(fullPill).width)).toBe(360);
		expect(box(fittedRoot).width).toBeLessThan(360);
	});

	test("disabled dims the field to 50%, and its input can't be focused or typed into", async () => {
		const ref = React.createRef<HTMLDivElement>();
		const onChange = vi.fn<NonNullable<TextFieldProps["onChange"]>>();
		render(
			<Around>
				<TextField
					ref={ref}
					disabled
					label="Location"
					defaultValue="Medellín, Colombia"
					onChange={onChange}
				/>
			</Around>,
		);
		const location = input("Location");
		expect(location).toBeDisabled();
		expect(getComputedStyle(must(ref.current)).opacity).toBe("0.5");
		focusBefore();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.click(location, { force: true });
		await userEvent.keyboard("x");
		expect(location).toHaveValue("Medellín, Colombia");
		expect(onChange).not.toHaveBeenCalled();
	});

	test("readOnly: focusable and selectable, typing changes nothing, and it shows as an inset well with a dashed dg-edge", async () => {
		const onChange = vi.fn<NonNullable<TextFieldProps["onChange"]>>();
		render(
			<Around>
				<TextField
					readOnly
					label="Time zone"
					defaultValue="Medellín (UTC−5)"
					onChange={onChange}
				/>
			</Around>,
		);
		const zone = input("Time zone");
		expect(zone).toHaveAttribute("readonly");
		const style = getComputedStyle(pill(zone));
		expect(style.backgroundColor).toBe(resolved("--glass-inset"));
		expect(style.borderTopStyle).toBe("dashed");
		expect(style.borderTopColor).toBe(resolved("--dg-edge"));
		focusBefore();
		await userEvent.tab();
		await expect.element(zone).toHaveFocus();
		await userEvent.keyboard("{End}x{Backspace}");
		expect(zone).toHaveValue("Medellín (UTC−5)");
		expect(onChange).not.toHaveBeenCalled();
		await userEvent.tripleClick(zone);
		expect([zone.selectionStart, zone.selectionEnd]).toEqual([
			0,
			"Medellín (UTC−5)".length,
		]);
	});
});

describe("TextField: keyboard and focus", () => {
	test("Tab moves in and out, and the focus ring (focus, 3px at a 2px offset) goes around the whole pill, not the bare input", async () => {
		render(
			<Around>
				<TextField label="Email" helperText="I reply within a day." />
			</Around>,
		);
		const email = input("Email");
		const ring = pill(email);
		focusBefore();
		await userEvent.tab();
		await expect.element(email).toHaveFocus();
		await expect.poll(() => getComputedStyle(ring).outlineStyle).toBe("solid");
		expect(getComputedStyle(ring).outlineWidth).toBe("3px");
		expect(getComputedStyle(ring).outlineOffset).toBe("2px");
		expect(getComputedStyle(ring).outlineColor).toBe(resolved("--focus"));
		expect(getComputedStyle(email).outlineStyle).toBe("none");
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await expect.poll(() => getComputedStyle(ring).outlineStyle).toBe("none");
		await userEvent.tab({ shift: true });
		await expect.element(email).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
	});

	test("a press on the pill's padding focuses the input", async () => {
		render(<TextField label="Name" />);
		const name = input("Name");
		const outline = pill(name);
		await userEvent.click(outline, {
			position: { x: 6, y: box(outline).height / 2 },
		});
		await expect.element(name).toHaveFocus();
	});

	test("autoFocus focuses the input on mount", async () => {
		render(
			<Around>
				{/* eslint-disable-next-line jsx-a11y-x/no-autofocus -- the prop under test */}
				<TextField autoFocus label="Name" />
			</Around>,
		);
		await expect.element(input("Name")).toHaveFocus();
	});

	test("onFocus and onBlur, given to the field, are called as focus enters and leaves its input", async () => {
		const seen: Array<[string, EventTarget]> = [];
		const record = (event: React.FocusEvent) => {
			seen.push([event.type, event.target]);
		};

		render(
			<Around>
				<TextField label="Name" onFocus={record} onBlur={record} />
			</Around>,
		);
		const name = input("Name");
		focusBefore();
		await userEvent.tab();
		await userEvent.tab();
		expect(seen).toEqual([
			["focus", name],
			["blur", name],
		]);
	});
});

describe("TextField: value and onChange", () => {
	test("onChange gets the input's ChangeEvent, already holding the new text, and the new text, on every edit", async () => {
		const { edits, onChange } = recorder();
		render(<TextField label="Name" onChange={onChange} />);
		const name = input("Name");
		await userEvent.click(name);
		await userEvent.keyboard("Hi");
		const edit = (text: string) => ({
			type: "change",
			isNative: false,
			nativeType: "input",
			target: name,
			currentTarget: name,
			targetValue: text,
			value: text,
		});
		expect(edits).toEqual([edit("H"), edit("Hi")]);
		await userEvent.keyboard("{Backspace}");
		expect(edits.at(-1)).toEqual(edit("H"));
	});

	test("defaultValue sets the starting text, and the field keeps what's typed (uncontrolled)", async () => {
		const view = render(<TextField label="Name" defaultValue="Sebastián" />);
		const name = input("Name");
		expect(name).toHaveValue("Sebastián");
		await typeAtEnd(name, " Suárez");
		expect(name).toHaveValue("Sebastián Suárez");
		view.rerender(<TextField label="Name" defaultValue="Someone else" />);
		expect(name).toHaveValue("Sebastián Suárez");
	});

	test("value controls the text: typing calls onChange with the new text, and only a new value moves it", async () => {
		const { edits, onChange } = recorder();
		const view = render(
			<TextField label="Employer" value="EPAM" onChange={onChange} />,
		);
		const employer = input("Employer");
		await typeAtEnd(employer, "!");
		expect(edits.map((edit) => edit.value)).toEqual(["EPAM!"]);
		expect(employer).toHaveValue("EPAM");
		view.rerender(
			<TextField label="Employer" value="Globant" onChange={onChange} />,
		);
		expect(employer).toHaveValue("Globant");
	});

	test("a controlled field follows each edit its parent stores", async () => {
		function Controlled() {
			const [text, setText] = React.useState("");
			return (
				<>
					<TextField
						label="Handle"
						value={text}
						onChange={(_event, next) => {
							setText(next.toLowerCase());
						}}
					/>
					<output>{text}</output>
				</>
			);
		}

		render(<Controlled />);
		const handle = input("Handle");
		await userEvent.click(handle);
		await userEvent.keyboard("SebSuarez");
		await expect.element(handle).toHaveValue("sebsuarez");
		expect(screen.getByRole("status")).toHaveTextContent("sebsuarez");
	});
});

describe("TextField: type", () => {
	test("type reaches the input: text by default, or email, password (which the browser masks), number, search, tel or url", () => {
		render(
			<>
				<TextField label="Default" />
				{types.map((type) => (
					<TextField key={type} label={type} type={type} />
				))}
			</>,
		);
		expect(input("Default").type).toBe("text");
		for (const type of types) {
			expect(input(type).type, type).toBe(type);
		}
	});

	test("number steps with Up and Down by the step in inputProps, within its min and max, and onChange gets each new text", async () => {
		const { edits, onChange } = recorder();
		render(
			<TextField
				label="Latency budget"
				type="number"
				defaultValue="10"
				inputProps={{ min: 0, max: 30, step: 10 }}
				onChange={onChange}
			/>,
		);
		const budget = input("Latency budget");
		await userEvent.click(budget);
		await userEvent.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
		expect(budget).toHaveValue(30);
		await userEvent.keyboard(
			"{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}",
		);
		expect(budget).toHaveValue(0);
		expect(edits.map((edit) => edit.value)).toEqual([
			"20",
			"30",
			"20",
			"10",
			"0",
		]);
	});

	test("number hides the spin buttons: a press where they'd sit doesn't step the value", async () => {
		render(
			<>
				<TextField label="Latency budget" type="number" defaultValue="120" />
				<label>
					Plain number
					<input
						type="number"
						defaultValue="120"
						style={{ width: 200, height: 40 }}
					/>
				</label>
			</>,
		);
		const upButton = (element: Element) => ({
			x: box(element).width - 10,
			y: box(element).height / 4,
		});
		const plain = input("Plain number");
		await userEvent.click(plain, { position: upButton(plain) });
		expect(plain).toHaveValue(121);
		const budget = input("Latency budget");
		await userEvent.click(budget, { position: upButton(budget) });
		expect(budget).toHaveValue(120);
	});
});

describe("TextField: forms", () => {
	test("name and autoComplete reach the input, and its text is in the FormData when Enter submits the form", async () => {
		const submitted: Array<Record<string, FormDataEntryValue>> = [];
		render(
			<form
				onSubmit={(event) => {
					event.preventDefault();
					submitted.push(Object.fromEntries(new FormData(event.currentTarget)));
				}}
			>
				<TextField
					label="Name"
					name="name"
					autoComplete="name"
					defaultValue="Sebastián"
				/>
				<button type="submit">Send message</button>
			</form>,
		);
		const name = input("Name");
		expect(name).toHaveAttribute("name", "name");
		expect(name).toHaveAttribute("autocomplete", "name");
		await typeAtEnd(name, " Suárez{Enter}");
		expect(submitted).toEqual([{ name: "Sebastián Suárez" }]);
	});

	test("required: an empty field fails the form's validation, and a filled one passes", async () => {
		render(
			<form aria-label="Contact">
				<TextField required label="Company" name="company" />
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", {
			name: "Contact",
		});
		const company = input("Company");
		expect(company.validity.valueMissing).toBe(true);
		expect(form.checkValidity()).toBe(false);
		await userEvent.click(company);
		await userEvent.keyboard("EPAM");
		expect(company.validity.valueMissing).toBe(false);
		expect(form.checkValidity()).toBe(true);
	});
});

describe("TextField: maxLength and showCount", () => {
	test("maxLength reaches the input, and typing stops at the limit; without showCount, no counter shows", async () => {
		render(<TextField label="Handle" maxLength={8} />);
		const handle = input("Handle");
		expect(handle).toHaveAttribute("maxlength", "8");
		await userEvent.click(handle);
		await userEvent.keyboard("sebastiansuarez");
		expect(handle).toHaveValue("sebastia");
		expect(screen.queryByText("8/8")).toBeNull();
		expect(screen.queryByText("8")).toBeNull();
	});

	test("showCount with maxLength shows the count over the limit under the pill, and it counts as you type", async () => {
		render(
			<TextField
				showCount
				label="Handle"
				defaultValue="sebastiansuarez"
				maxLength={20}
				helperText="Letters and numbers."
			/>,
		);
		const handle = input("Handle");
		const counter = screen.getByText("15/20");
		expect(counter).toBeVisible();
		expect(box(counter).top).toBeGreaterThanOrEqual(box(pill(handle)).bottom);
		await typeAtEnd(handle, "26");
		await expect.element(screen.getByText("17/20")).toBeVisible();
		expect(screen.queryByText("15/20")).toBeNull();
	});

	test("showCount alone shows the length", async () => {
		render(<TextField showCount label="Handle" defaultValue="sebastian" />);
		expect(screen.getByText("9")).toBeVisible();
		await typeAtEnd(input("Handle"), "suarez");
		await expect.element(screen.getByText("15")).toBeVisible();
	});
});

describe("TextField: multiline", () => {
	test("multiline is a textarea named by the label, on radius-well, which inputRef points at and onChange reports; type is ignored", async () => {
		const inputRef = React.createRef<HTMLInputElement | HTMLTextAreaElement>();
		const { edits, onChange } = recorder();
		render(
			<TextField
				multiline
				label="Message"
				type="password"
				inputRef={inputRef}
				onChange={onChange}
			/>,
		);
		const message = textarea("Message");
		expect(inputRef.current).toBe(message);
		expect(message).not.toHaveAttribute("type");
		expect(getComputedStyle(pill(message)).borderTopLeftRadius).toBe(
			resolved("--radius-well", "border-top-left-radius"),
		);
		await userEvent.click(message);
		await userEvent.keyboard("Hi");
		expect(edits.at(-1)).toEqual({
			type: "change",
			isNative: false,
			nativeType: "input",
			target: message,
			currentTarget: message,
			targetValue: "Hi",
			value: "Hi",
		});
	});

	test("it starts one row tall, grows a row with each line, and shrinks back when cleared", async () => {
		render(<TextField multiline label="Message" />);
		const message = textarea("Message");
		await expectRows(message, 1);
		await typeAtEnd(message, "one{Enter}two");
		await expectRows(message, 2);
		await typeAtEnd(message, "{Enter}three");
		await expectRows(message, 3);
		await userEvent.clear(message);
		await expectRows(message, 1);
	});

	test("minRows sets the floor, and past maxRows it stops growing and scrolls", async () => {
		render(<TextField multiline label="Message" minRows={3} maxRows={5} />);
		const message = textarea("Message");
		await expectRows(message, 3);
		await typeAtEnd(message, typedLines(1, 4));
		await expectRows(message, 4);
		expect(canScroll(message)).toBe(false);
		const enter = "{Enter}";
		await typeAtEnd(message, `${enter}${typedLines(5, 7)}`);
		await expectRows(message, 5);
		expect(canScroll(message)).toBe(true);
	});

	test("rows fixes the height: it doesn't grow with more lines, and scrolls instead", async () => {
		render(
			<TextField multiline label="Summary" rows={3} defaultValue="One line" />,
		);
		const summary = textarea("Summary");
		await expectRows(summary, 3);
		await typeAtEnd(summary, "{Enter}two{Enter}three{Enter}four{Enter}five");
		await expectRows(summary, 3);
		expect(canScroll(summary)).toBe(true);
	});
});

describe("TextField: adornments and inputProps", () => {
	test.each([
		["an Icon", <Icon key="search" name="search" />],
		[
			"an Icon in an InputAdornment",
			<InputAdornment key="search" position="start">
				<Icon name="search" />
			</InputAdornment>,
		],
	])(
		"%s as startAdornment sits in the pill before the text, at 16px in color-muted, and isn't read",
		(_kind, adornment) => {
			render(
				<TextField
					label="Search"
					type="search"
					placeholder="Search projects"
					startAdornment={adornment}
				/>,
			);
			const search = input("Search");
			const outline = pill(search);
			const icon = must(outline.querySelector("svg"));
			expect(box(icon).right).toBeLessThanOrEqual(box(search).left);
			expect(Math.round(box(icon).width)).toBe(16);
			expect(Math.round(box(icon).height)).toBe(16);
			expect(getComputedStyle(icon).color).toBe(resolved("--color-muted"));
			expect(search).toHaveAccessibleDescription("");
		},
	);

	test("an InputAdornment with a unit sits after the text inside the pill, and the unit joins aria-describedby", () => {
		render(
			<TextField
				label="Latency budget"
				type="number"
				defaultValue="120"
				endAdornment={<InputAdornment position="end">ms</InputAdornment>}
			/>,
		);
		const budget = input("Latency budget");
		const unit = screen.getByText("ms");
		expect(pill(budget)).toContainElement(unit);
		expect(box(unit).left).toBeGreaterThanOrEqual(box(budget).right);
		expect(budget).toHaveAccessibleDescription("ms");
	});

	test("a word as startAdornment sits in the pill before the text and joins aria-describedby too", () => {
		render(<TextField label="Website" type="url" startAdornment="https://" />);
		const website = input("Website");
		const word = screen.getByText("https://");
		expect(pill(website)).toContainElement(word);
		expect(box(word).right).toBeLessThanOrEqual(box(website).left);
		expect(website).toHaveAccessibleDescription("https://");
	});

	test("a small Button in endAdornment still works: Tab reaches it after the text, and a press or Enter runs it", async () => {
		function Password() {
			const [isRevealed, setIsRevealed] = React.useState(false);
			return (
				<TextField
					label="Password"
					type={isRevealed ? "text" : "password"}
					defaultValue="medellin26"
					endAdornment={
						<InputAdornment position="end">
							<Button
								variant="text"
								size="sm"
								onClick={() => {
									setIsRevealed((current) => !current);
								}}
							>
								{isRevealed ? "Hide" : "Show"}
							</Button>
						</InputAdornment>
					}
				/>
			);
		}

		render(
			<Around>
				<Password />
			</Around>,
		);
		const password = input("Password");
		expect(password.type).toBe("password");
		expect(pill(password)).toContainElement(button("Show"));
		expect(box(button("Show")).left).toBeGreaterThanOrEqual(
			box(password).right,
		);
		expect(password).toHaveAccessibleDescription("");
		await userEvent.click(button("Show"));
		await expect.element(button("Hide")).toBeVisible();
		expect(password.type).toBe("text");
		expect(password).toHaveValue("medellin26");
		focusBefore();
		await userEvent.tab();
		await expect.element(password).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("Hide")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect.element(button("Show")).toHaveFocus();
		expect(password.type).toBe("password");
	});

	test("inputProps reach the input: inputMode, pattern, min, max and step", () => {
		render(
			<TextField
				label="Port"
				inputProps={{
					inputMode: "numeric",
					pattern: "[0-9]*",
					min: 1,
					max: 65_535,
					step: 1,
				}}
			/>,
		);
		const port = input("Port");
		expect(port).toHaveAttribute("inputmode", "numeric");
		expect(port).toHaveAttribute("pattern", "[0-9]*");
		expect(port).toHaveAttribute("min", "1");
		expect(port).toHaveAttribute("max", "65535");
		expect(port).toHaveAttribute("step", "1");
	});

	test("inputRef is the input, and the ref is the root div, holding the label, the input and the helper, with className, style and the other attributes", () => {
		const ref = React.createRef<HTMLDivElement>();
		const inputRef = React.createRef<HTMLInputElement | HTMLTextAreaElement>();
		render(
			<TextField
				ref={ref}
				inputRef={inputRef}
				label="Email"
				helperText="Only for my reply."
				className="contact-email"
				style={{ marginTop: 12 }}
				data-section="contact"
			/>,
		);
		const email = input("Email");
		const root = ref.current;
		expect(inputRef.current).toBe(email);
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(root).toContainElement(email);
		expect(root).toContainElement(labelOf(email));
		expect(root).toContainElement(screen.getByText("Only for my reply."));
		expect(root).toHaveClass("contact-email");
		expect(root).toHaveStyle({ marginTop: "12px" });
		expect(root).toHaveAttribute("data-section", "contact");
		expect(email).not.toHaveClass("contact-email");
		expect(email).not.toHaveAttribute("data-section");
	});
});

describe("InputAdornment", () => {
	test("renders a span holding its children, and the ref, className, id and other attributes land on it", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<InputAdornment
				ref={ref}
				position="end"
				className="unit"
				id="latency-unit"
				title="milliseconds"
			>
				ms
			</InputAdornment>,
		);
		const unit = screen.getByText("ms");
		expect(unit).toBeInstanceOf(HTMLSpanElement);
		expect(ref.current).toBe(unit);
		expect(unit).toHaveClass("unit");
		expect(unit).toHaveAttribute("id", "latency-unit");
		expect(unit).toHaveAttribute("title", "milliseconds");
	});

	test.each([
		["start", "before"],
		["end", "after"],
	] as const satisfies ReadonlyArray<
		readonly [InputAdornmentProps["position"], string]
	>)("position %s puts it inside the pill %s the text", (position, side) => {
		render(
			<TextField
				label="Amount"
				startAdornment={
					position === "start" ? (
						<InputAdornment position="start">USD</InputAdornment>
					) : undefined
				}
				endAdornment={
					position === "end" ? (
						<InputAdornment position="end">USD</InputAdornment>
					) : undefined
				}
			/>,
		);
		const amount = input("Amount");
		const unit = screen.getByText("USD");
		expect(pill(amount)).toContainElement(unit);
		if (side === "before") {
			expect(box(unit).right).toBeLessThanOrEqual(box(amount).left);
		} else {
			expect(box(unit).left).toBeGreaterThanOrEqual(box(amount).right);
		}
	});

	test("its own id stays on it, and the unit still joins the input's description", () => {
		render(
			<TextField
				label="Latency budget"
				helperText="Per request."
				endAdornment={
					<InputAdornment id="latency-unit" position="end">
						ms
					</InputAdornment>
				}
			/>,
		);
		const budget = input("Latency budget");
		expect(screen.getByText("ms")).toHaveAttribute("id", "latency-unit");
		expect(budget.getAttribute("aria-describedby")?.split(" ")).toContain(
			"latency-unit",
		);
		expect(budget).toHaveAccessibleDescription(/Per request\./v);
		expect(budget).toHaveAccessibleDescription(/ms/v);
	});
});
