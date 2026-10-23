import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	type Mock,
	test,
	vi,
} from "vitest";
import { userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import {
	Autocomplete,
	type AutocompleteChangeReason,
	type AutocompleteCloseReason,
	type AutocompleteInputChangeReason,
	type AutocompleteOption,
	type AutocompleteProps,
	Dialog,
	DialogContent,
	type DialogProps,
	DialogTitle,
	Icon,
	InputAdornment,
} from "#ui";

async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; right: 0; bottom: 0; width: 24px; height: 24px";
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

const employers = [
	"EPAM",
	"Intive",
	"Limber Health",
	"SunDevs",
	"Globant",
	"PayPal",
	"Gorilla Logic",
];

type Technology = { label: string; group: string };

const stack: Technology[] = [
	{ label: "Node.js", group: "Runtime" },
	{ label: "TypeScript", group: "Languages" },
	{ label: "Rust", group: "Languages" },
	{ label: "PostgreSQL", group: "Data" },
	{ label: "MongoDB", group: "Data" },
	{ label: "AWS", group: "Cloud" },
	{ label: "Terraform", group: "Cloud" },
	{ label: "Cloudflare", group: "Cloud" },
	{ label: "React", group: "Frontend" },
];

const nodeJs = stack[0];
const typeScript = stack[1];
const aws = stack[5];

type Zone = { label: string; secondary: string; disabled?: boolean };

const zones: Zone[] = [
	{ label: "Medellín", secondary: "UTC−5 all year, where I work from" },
	{ label: "New York", secondary: "Full overlap" },
	{ label: "San Francisco", secondary: "Full overlap" },
	{ label: "London", secondary: "Overlap in my mornings" },
	{ label: "Madrid", secondary: "Overlap in my mornings" },
	{ label: "Tokyo", secondary: "No working-hours overlap", disabled: true },
];

const cities = ["Medellín", "Berlin", "Bogotá", "Montréal", "Lisbon"];

const technologies = [
	"Astro",
	"AWS",
	"Cloudflare",
	"Docker",
	"GraphQL",
	"Kubernetes",
	"MongoDB",
	"Next.js",
	"Node.js",
	"PostgreSQL",
	"React",
	"Redis",
	"Rust",
	"Terraform",
	"TypeScript",
];

const roles = ["Backend lead", "Software architect", "Lead software engineer"];

type FieldProps<T> = Partial<AutocompleteProps<T>> & {
	readonly ref?: React.Ref<HTMLDivElement>;
};

function Employer(props: FieldProps<string>) {
	return <Autocomplete label="Employer" options={employers} {...props} />;
}

function Stack(props: FieldProps<Technology>) {
	return <Autocomplete multiple label="Stack" options={stack} {...props} />;
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

function Elsewhere() {
	return (
		<p style={{ position: "fixed", left: 0, bottom: 0, margin: 0, padding: 8 }}>
			Elsewhere
		</p>
	);
}

type OnChange = (
	event: React.SyntheticEvent,
	value: unknown,
	reason: Parameters<NonNullable<AutocompleteProps["onChange"]>>[2],
) => void;
type OnInputChange = NonNullable<AutocompleteProps["onInputChange"]>;
type OnOpen = NonNullable<AutocompleteProps["onOpen"]>;
type OnClose = NonNullable<AutocompleteProps["onClose"]>;

function combobox(name = "Employer"): HTMLInputElement {
	return screen.getByRole<HTMLInputElement>("combobox", { name });
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function option(label: string): HTMLElement {
	return screen.getByRole("option", {
		name: (name) => name === label || name.startsWith(`${label} `),
	});
}

function rows(): string[] {
	return screen
		.queryAllByRole("option")
		.map((element) => element.textContent ?? "");
}

function selectedRows(): string[] {
	return screen
		.queryAllByRole("option")
		.filter((element) => element.getAttribute("aria-selected") === "true")
		.map((element) => element.textContent ?? "");
}

function byId(id: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

function highlighted(input: HTMLInputElement = combobox()): HTMLElement | null {
	const id = input.getAttribute("aria-activedescendant");
	return id === null || id === "" ? null : byId(id);
}

async function expectHighlighted(
	label: string,
	input: HTMLInputElement = combobox(),
): Promise<void> {
	await vi.waitFor(() => {
		expect(highlighted(input)).toBe(option(label));
	});
}

async function walk(
	steps: ReadonlyArray<readonly [key: string, label: string]>,
	input: HTMLInputElement = combobox(),
): Promise<void> {
	for (const [key, label] of steps) {
		// eslint-disable-next-line no-await-in-loop -- each key starts where the last left the highlight
		await userEvent.keyboard(key);
		// eslint-disable-next-line no-await-in-loop
		await expectHighlighted(label, input);
		expect(input).toHaveFocus();
	}
}

async function expectListShown(): Promise<HTMLElement> {
	return vi.waitFor(() => screen.getByRole("listbox"));
}

async function expectListGone(): Promise<void> {
	await expect.poll(() => screen.queryByRole("listbox")).toBeNull();
}

async function frames(count = 4): Promise<void> {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- frames run one after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function height(element: Element): number {
	return Math.round(box(element).height);
}

function pill(input: HTMLElement = combobox()): HTMLElement {
	for (
		let element = input.parentElement;
		element;
		element = element.parentElement
	) {
		if (
			within(element).queryAllByRole("button", { name: /^(?:Open|Close)$/v })
				.length > 0
		) {
			return element;
		}
	}

	throw new Error("No element holds both the input and its Open button");
}

type TokenProperty =
	| "backgroundColor"
	| "borderTopColor"
	| "borderTopLeftRadius"
	| "color"
	| "outlineColor"
	| "width";

function resolvedToken(property: TokenProperty, token: string): string {
	const probe = document.createElement("div");
	probe.style[property] = `var(${token})`;
	document.body.append(probe);
	const value = getComputedStyle(probe)[property];
	probe.remove();
	return value;
}

function shownText(text: string): HTMLElement[] {
	return screen.queryAllByText(text).filter((element) => {
		const { width, height: tall } = box(element);
		return (
			width > 1 &&
			tall > 1 &&
			element.checkVisibility({ visibilityProperty: true })
		);
	});
}

async function expectShownText(text: string): Promise<void> {
	await expect.poll(() => shownText(text).length).toBe(1);
}

function boldTextIn(element: Element): string[] {
	return [...element.querySelectorAll("*")]
		.filter(
			(node) =>
				getComputedStyle(node).fontWeight === "600" &&
				node.parentElement !== null &&
				getComputedStyle(node.parentElement).fontWeight !== "600",
		)
		.map((node) => node.textContent ?? "")
		.filter((text) => text !== "");
}

function isInOrder(...elements: Element[]): boolean {
	const all = [...document.querySelectorAll("*")];
	const positions = elements.map((element) => all.indexOf(element));
	return positions.every(
		(position, index) => position > (positions[index - 1] ?? -1),
	);
}

function removeButtons(): HTMLElement[] {
	return screen.queryAllByRole("button", { name: /^Remove /v });
}

function chip(label: string): HTMLElement {
	const remove = button(`Remove ${label}`);
	for (
		let element = remove.parentElement;
		element;
		element = element.parentElement
	) {
		if (element.textContent?.includes(label)) {
			return element;
		}
	}

	throw new Error(`No chip holds "${label}"`);
}

async function expectChips(labels: readonly string[]): Promise<void> {
	await vi.waitFor(() => {
		const buttons = removeButtons();
		expect(buttons).toHaveLength(labels.length);
		for (const [index, label] of labels.entries()) {
			expect(buttons[index]).toBe(button(`Remove ${label}`));
		}
	});
}

async function expectChipFocused(label: string): Promise<void> {
	await expect
		.poll(() => chip(label).contains(document.activeElement))
		.toBe(true);
}

function expectReactEvent(
	event: unknown,
	type: new (...arguments_: never[]) => Event,
): Event {
	expect(event).toBeTruthy();
	expect(event).not.toBeInstanceOf(Event);
	const { nativeEvent } = event as React.SyntheticEvent;
	expect(nativeEvent).toBeInstanceOf(type);
	return nativeEvent;
}

function expectKey(event: unknown, key: string): void {
	const native = expectReactEvent(event, KeyboardEvent) as KeyboardEvent;
	expect(native.key).toBe(key);
}

function expectTyping(event: unknown): void {
	expect(expectReactEvent(event, Event).type).toBe("input");
}

function expectReactEventOrNull(event: unknown): void {
	if (event !== null) {
		expectReactEvent(event, Event);
	}
}

async function onlyCall<F extends (...arguments_: never[]) => unknown>(
	mock: Mock<F>,
): Promise<Parameters<F>> {
	await vi.waitFor(() => {
		expect(mock).toHaveBeenCalled();
	});
	expect(mock).toHaveBeenCalledTimes(1);
	return mock.mock.calls[0] as Parameters<F>;
}

function changes(
	onChange: Mock<OnChange>,
): Array<[unknown, AutocompleteChangeReason]> {
	return onChange.mock.calls.map(([, value, reason]) => [value, reason]);
}

function texts(
	onInputChange: Mock<OnInputChange>,
): Array<[string, AutocompleteInputChangeReason]> {
	return onInputChange.mock.calls.map(([, value, reason]) => [value, reason]);
}

function closes(onClose: Mock<OnClose>): AutocompleteCloseReason[] {
	return onClose.mock.calls.map(([, reason]) => reason);
}

function helperOf(input: HTMLElement, text: string): HTMLElement {
	const helper = (input.getAttribute("aria-describedby") ?? "")
		.split(" ")
		.map((id) => byId(id))
		.find((element) => element?.textContent?.includes(text));
	if (!helper) {
		throw new Error(`aria-describedby names nothing that says "${text}"`);
	}

	return helper;
}

function form(): HTMLFormElement {
	return screen.getByRole<HTMLFormElement>("form", { name: "Career" });
}

function entries(name: string): FormDataEntryValue[] {
	return new FormData(form()).getAll(name);
}

describe("Autocomplete: the field", () => {
	test("the input is a combobox named by its label; the ref, className, style and other attributes go to the root div around it", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Employer
				ref={ref}
				className="employer-field"
				style={{ marginTop: 12 }}
				data-section="career"
				title="Where you work"
			/>,
		);
		const input = combobox();
		expect(input).toBeInstanceOf(HTMLInputElement);
		expect(input.type).toBe("text");
		const root = ref.current;
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(root?.contains(input)).toBe(true);
		expect(root?.contains(screen.getByText("Employer"))).toBe(true);
		expect(root).toHaveClass("employer-field");
		expect(root?.style.marginTop).toBe("12px");
		expect(root).toHaveAttribute("data-section", "career");
		expect(root).toHaveAttribute("title", "Where you work");
	});

	test("the label sits above the pill in 13px at weight 600, and a press on it focuses the input", async () => {
		render(<Employer />);
		const label = screen.getByText("Employer");
		const input = combobox();
		expect(box(label).bottom).toBeLessThanOrEqual(box(pill(input)).top);
		expect(getComputedStyle(label).fontSize).toBe("13px");
		expect(getComputedStyle(label).fontWeight).toBe("600");
		await userEvent.click(label);
		await expect.element(input).toHaveFocus();
	});

	test("without a label, aria-label names the input and its list, and aria-labelledby names them from elsewhere", async () => {
		render(
			<>
				<h3 id="history-title">Where I worked</h3>
				<Autocomplete aria-label="Current employer" options={employers} />
				<Autocomplete aria-labelledby="history-title" options={employers} />
			</>,
		);
		combobox("Current employer").focus();
		await userEvent.keyboard("{ArrowDown}");
		await vi.waitFor(() =>
			screen.getByRole("listbox", { name: "Current employer" }),
		);
		combobox("Where I worked").focus();
		await userEvent.keyboard("{ArrowDown}");
		await vi.waitFor(() =>
			screen.getByRole("listbox", { name: "Where I worked" }),
		);
	});

	test("helperText sits under the pill in color-muted and describes the input through aria-describedby, along with the input's own aria-describedby", () => {
		render(
			<>
				<p id="employer-hint">Type to search.</p>
				<Employer
					helperText="Where you work now."
					aria-describedby="employer-hint"
				/>
			</>,
		);
		const input = combobox();
		expect(input).toHaveAccessibleDescription(/Where you work now\./v);
		expect(input).toHaveAccessibleDescription(/Type to search\./v);
		const helper = helperOf(input, "Where you work now.");
		expect(box(helper).top).toBeGreaterThanOrEqual(box(pill(input)).bottom);
		expect(getComputedStyle(helper).color).toBe(
			resolvedToken("color", "--color-muted"),
		);
	});

	test("error marks the input aria-invalid, draws the pill's edge in danger, and turns the helper text danger with the error icon", () => {
		const wrong = React.createRef<HTMLDivElement>();
		const calm = React.createRef<HTMLDivElement>();
		render(
			<>
				<Employer ref={wrong} error helperText="Choose one from the list." />
				<Autocomplete
					ref={calm}
					label="Previous employer"
					options={employers}
					helperText="Optional."
				/>
			</>,
		);
		const danger = resolvedToken("color", "--danger");
		const input = combobox();
		expect(input).toHaveAttribute("aria-invalid", "true");
		expect(getComputedStyle(pill(input)).borderTopColor).toBe(
			resolvedToken("borderTopColor", "--danger"),
		);
		expect(
			getComputedStyle(helperOf(input, "Choose one from the list.")).color,
		).toBe(danger);

		const other = combobox("Previous employer");
		expect(other).not.toHaveAttribute("aria-invalid", "true");
		expect(getComputedStyle(helperOf(other, "Optional.")).color).not.toBe(
			danger,
		);
		const iconsOutside = (root: HTMLElement | null, field: HTMLElement) =>
			[...(root?.querySelectorAll("svg") ?? [])].filter(
				(svg) => !pill(field).contains(svg),
			).length;
		expect(iconsOutside(wrong.current, input)).toBe(1);
		expect(iconsOutside(calm.current, other)).toBe(0);
	});

	test("required adds an asterisk to the label, which the name leaves out, and marks the input required", () => {
		render(<Employer required />);
		expect(combobox()).toBeRequired();
		expect(screen.getByText("Employer")).toHaveTextContent("Employer*");
	});

	referenceDefectTest(
		"required keeps the input marked required once there's a value, with multiple too",
		() => {
			render(
				<>
					<Employer required defaultValue="PayPal" />
					<Stack required defaultValue={[nodeJs]} />
				</>,
			);
			expect(combobox()).toBeRequired();
			expect(combobox("Stack")).toBeRequired();
		},
	);

	test("disabled dims the field to 50% and blocks it: the input and its Open button are disabled, Tab passes it, and there's no Clear button", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Around>
				<Employer ref={ref} disabled defaultValue="EPAM" />
			</Around>,
		);
		expect(getComputedStyle(ref.current!).opacity).toBe("0.5");
		const input = combobox();
		expect(input).toBeDisabled();
		expect(input).toHaveValue("EPAM");
		expect(button("Open")).toBeDisabled();
		expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.click(button("Open"), { force: true });
		await frames();
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	test("readOnly: Tab reaches the input, but the text takes no edits, the list doesn't open, and there's no Clear button", async () => {
		render(
			<Around>
				<Employer readOnly defaultValue="PayPal" />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		const input = combobox();
		await expect.element(input).toHaveFocus();
		await userEvent.keyboard("x{Backspace}{ArrowDown}");
		await userEvent.click(input);
		await userEvent.click(button("Open"), { force: true });
		await frames();
		expect(input).toHaveValue("PayPal");
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(input).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
	});

	test("size sm makes the pill 36px tall; md, the default, 46px", () => {
		render(
			<>
				<Employer />
				<Autocomplete label="Medium" size="md" options={employers} />
				<Autocomplete label="Small" size="sm" options={employers} />
			</>,
		);
		const defaultPill = pill(combobox());
		const mediumPill = pill(combobox("Medium"));
		const smallPill = pill(combobox("Small"));
		expect(height(defaultPill)).toBe(46);
		expect(height(mediumPill)).toBe(46);
		expect(height(smallPill)).toBe(36);
	});

	test("fullWidth stretches the field and its pill to the container's width", () => {
		const wide = React.createRef<HTMLDivElement>();
		const narrow = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 380 }}>
				<Employer ref={wide} fullWidth />
				<Autocomplete
					ref={narrow}
					label="Previous employer"
					options={employers}
				/>
			</div>,
		);
		expect(Math.round(box(wide.current!).width)).toBe(380);
		const widePill = pill(combobox());
		expect(Math.round(box(widePill).width)).toBe(380);
		expect(box(narrow.current!).width).toBeLessThan(380);
	});

	test("variant outlined, the default, fills the pill with glass-control inside a dg-edge border; filled makes it a glass-inset well", () => {
		render(
			<>
				<Employer />
				<Autocomplete label="Outlined" variant="outlined" options={employers} />
				<Autocomplete label="Filled" variant="filled" options={employers} />
			</>,
		);
		for (const name of ["Employer", "Outlined"]) {
			const style = getComputedStyle(pill(combobox(name)));
			expect(style.backgroundColor).toBe(
				resolvedToken("backgroundColor", "--glass-control"),
			);
			expect(style.borderTopColor).toBe(
				resolvedToken("borderTopColor", "--dg-edge"),
			);
		}

		const filledPill = pill(combobox("Filled"));
		expect(getComputedStyle(filledPill).backgroundColor).toBe(
			resolvedToken("backgroundColor", "--glass-inset"),
		);
	});

	test("filled: the well's edge darkens to dg-edge under the pointer, and to color-ink with focus", async () => {
		render(<Employer variant="filled" />);
		const style = getComputedStyle(pill());
		const atRest = style.borderTopColor;
		const edge = resolvedToken("borderTopColor", "--dg-edge");
		expect(atRest).not.toBe(edge);
		await userEvent.hover(pill());
		await expect.poll(() => style.borderTopColor).toBe(edge);
		await parkPointer();
		await expect.poll(() => style.borderTopColor).toBe(atRest);
		combobox().focus();
		await expect
			.poll(() => style.borderTopColor)
			.toBe(resolvedToken("borderTopColor", "--color-ink"));
	});

	test("focus rings the whole pill: the 3px focus outline at a 2px offset", async () => {
		render(
			<Around>
				<Employer />
			</Around>,
		);
		const style = getComputedStyle(pill());
		expect(style.outlineStyle).toBe("none");
		button("Before").focus();
		await userEvent.tab();
		await expect.poll(() => style.outlineStyle).toBe("solid");
		expect(style.outlineWidth).toBe("3px");
		expect(style.outlineOffset).toBe("2px");
		expect(style.outlineColor).toBe(resolvedToken("outlineColor", "--focus"));
	});

	test("id lands on the input, which the label names; without one each field generates its own", () => {
		render(
			<>
				<Employer id="employer" />
				<Autocomplete label="Previous employer" options={employers} />
				<Autocomplete label="First employer" options={employers} />
			</>,
		);
		expect(combobox().id).toBe("employer");
		const previous = combobox("Previous employer").id;
		const first = combobox("First employer").id;
		expect(previous).not.toBe("");
		expect(first).not.toBe("");
		expect(previous).not.toBe(first);
	});

	test("placeholder shows in the empty input in color-muted, and the label still names it", () => {
		render(<Employer placeholder="Type a company" />);
		const input = combobox();
		expect(input).toHaveAttribute("placeholder", "Type a company");
		expect(getComputedStyle(input, "::placeholder").color).toBe(
			resolvedToken("color", "--color-muted"),
		);
	});

	test("startAdornment, an Icon or an InputAdornment, sits inside the pill before the input", () => {
		render(
			<>
				<Employer startAdornment={<Icon name="search" title="Search" />} />
				<Autocomplete
					label="Handle"
					options={["sebastian-suarez", "sebsuarez"]}
					startAdornment={<InputAdornment position="start">@</InputAdornment>}
				/>
			</>,
		);
		const pairs = [
			[screen.getByRole("img", { name: "Search" }), combobox()],
			[screen.getByText("@"), combobox("Handle")],
		] as const;
		for (const [adornment, input] of pairs) {
			expect(pill(input).contains(adornment)).toBe(true);
			expect(isInOrder(adornment, input)).toBe(true);
			expect(box(adornment).right).toBeLessThanOrEqual(box(input).left);
		}
	});

	test("inputProps reach the input, and inputRef points at it", () => {
		const inputRef = React.createRef<HTMLInputElement>();
		render(
			<Employer
				inputRef={inputRef}
				inputProps={{
					"data-field": "employer",
					inputMode: "search",
					maxLength: 40,
				}}
			/>,
		);
		const input = combobox();
		expect(inputRef.current).toBe(input);
		expect(input).toHaveAttribute("data-field", "employer");
		expect(input).toHaveAttribute("inputmode", "search");
		expect(input).toHaveAttribute("maxlength", "40");
	});

	test("autoFocus focuses the input on mount", async () => {
		// eslint-disable-next-line jsx-a11y-x/no-autofocus -- the prop under test
		render(<Employer autoFocus />);
		await expect.element(combobox()).toHaveFocus();
	});

	test("the input is a combobox with aria-autocomplete list: aria-expanded says whether the list shows, and aria-controls names the listbox while it does", async () => {
		render(<Employer />);
		const input = combobox();
		expect(input).toHaveAttribute("aria-autocomplete", "list");
		expect(input).toHaveAttribute("aria-expanded", "false");
		await userEvent.click(input);
		const list = await expectListShown();
		await expect.element(input).toHaveAttribute("aria-expanded", "true");
		expect(list.id).not.toBe("");
		expect(input).toHaveAttribute("aria-controls", list.id);
		await userEvent.keyboard("{Escape}");
		await expect.element(input).toHaveAttribute("aria-expanded", "false");
		await expectListGone();
	});
});

describe("Autocomplete: the list", () => {
	test("typing opens the list and filters it to the options that contain the text, ignoring case", async () => {
		render(<Employer />);
		const input = combobox();
		input.focus();
		expect(screen.queryByRole("listbox")).toBeNull();
		await userEvent.keyboard("l");
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual([
				"Limber Health",
				"Globant",
				"PayPal",
				"Gorilla Logic",
			]);
		});
		await userEvent.keyboard("O");
		await vi.waitFor(() => {
			expect(rows()).toEqual(["Globant", "Gorilla Logic"]);
		});
		expect(input).toHaveValue("lO");
	});

	test("the filter ignores accents both ways: medellin finds Medellín, and lín finds Berlin", async () => {
		render(<Autocomplete label="City" options={cities} />);
		const input = combobox("City");
		input.focus();
		await userEvent.keyboard("medellin");
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual(["Medellín"]);
		});
		await userEvent.fill(input, "lín");
		await vi.waitFor(() => {
			expect(rows()).toEqual(["Medellín", "Berlin"]);
		});
	});

	test("the match is set in weight 600 inside the row, whatever its case and accents, and with nothing typed no part of a row is", async () => {
		render(<Autocomplete label="City" options={cities} />);
		const input = combobox("City");
		input.focus();
		await userEvent.keyboard("{ArrowDown}");
		await expectListShown();
		for (const city of cities) {
			expect(boldTextIn(option(city))).toEqual([]);
		}

		await userEvent.keyboard("MEDELLIN");
		await vi.waitFor(() => {
			expect(boldTextIn(option("Medellín"))).toEqual(["Medellín"]);
		});
		await userEvent.fill(input, "real");
		await vi.waitFor(() => {
			expect(boldTextIn(option("Montréal"))).toEqual(["réal"]);
		});
		expect(getComputedStyle(option("Montréal")).fontWeight).not.toBe("600");
	});

	test("getOptionLabel gives each option its text: in the rows, the filter and the input once chosen", async () => {
		type Country = { code: string; name: string };
		const countries: Country[] = [
			{ code: "CO", name: "Colombia" },
			{ code: "ES", name: "Spain" },
			{ code: "US", name: "United States" },
		];
		render(
			<Autocomplete
				label="Country"
				options={countries}
				getOptionLabel={(country) =>
					typeof country === "string" ? country : country.name
				}
			/>,
		);
		const input = combobox("Country");
		input.focus();
		await userEvent.keyboard("{ArrowDown}");
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual(["Colombia", "Spain", "United States"]);
		});
		await userEvent.keyboard("sp");
		await vi.waitFor(() => {
			expect(rows()).toEqual(["Spain"]);
		});
		await userEvent.click(option("Spain"));
		await expect.element(input).toHaveValue("Spain");
	});

	test("an option's secondary line shows under its label", async () => {
		render(<Autocomplete label="Your time zone" options={zones} />);
		await userEvent.click(combobox("Your time zone"));
		const row = await vi.waitFor(() => option("Tokyo"));
		const label = within(row).getByText("Tokyo");
		const secondary = within(row).getByText("No working-hours overlap");
		expect(box(secondary).top).toBeGreaterThanOrEqual(box(label).bottom - 1);
	});

	test("an option with disabled is marked aria-disabled, and a press on it chooses nothing", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Autocomplete
				label="Your time zone"
				options={zones}
				onChange={onChange}
			/>,
		);
		const input = combobox("Your time zone");
		await userEvent.click(input);
		const tokyo = await vi.waitFor(() => option("Tokyo"));
		expect(tokyo).toHaveAttribute("aria-disabled", "true");
		expect(option("London")).not.toHaveAttribute("aria-disabled", "true");
		await userEvent.click(tokyo, { force: true });
		await frames();
		expect(onChange).not.toHaveBeenCalled();
		expect(input).toHaveValue("");
		expect(screen.getByRole("listbox")).toBeVisible();
	});

	test("getOptionDisabled replaces option.disabled", async () => {
		render(
			<Autocomplete
				label="Your time zone"
				options={zones}
				getOptionDisabled={(zone) => zone.label === "London"}
			/>,
		);
		await userEvent.click(combobox("Your time zone"));
		await vi.waitFor(() => {
			expect(option("London")).toHaveAttribute("aria-disabled", "true");
		});
		expect(option("Tokyo")).not.toHaveAttribute("aria-disabled", "true");
	});

	const employerRecords: AutocompleteOption[] = [
		{ label: "EPAM" },
		{ label: "Globant", value: 4 },
		{ label: "PayPal", value: 3 },
	];

	test.each<[string, AutocompleteOption, string[]]>([
		[
			"a value with the same value field",
			{ label: "PayPal Holdings", value: 3 },
			["PayPal"],
		],
		["a string with the same label", "EPAM", ["EPAM"]],
		[
			"nothing with the same label but another value field",
			{ label: "Globant", value: 9 },
			[],
		],
	])(
		"by default an option matches %s",
		async (_what, defaultValue, selected) => {
			render(
				<Autocomplete
					label="Employer"
					options={employerRecords}
					defaultValue={defaultValue}
				/>,
			);
			await userEvent.click(combobox());
			await expectListShown();
			await vi.waitFor(() => {
				expect(selectedRows()).toEqual(selected);
			});
		},
	);

	test("isOptionEqualToValue replaces the default match", async () => {
		type Job = { id: number; label: string };
		const options: Job[] = [
			{ id: 1, label: "EPAM" },
			{ id: 2, label: "PayPal" },
		];
		render(
			<Autocomplete
				label="Employer"
				options={options}
				defaultValue={{ id: 2, label: "PayPal (2021 to 2023)" }}
				isOptionEqualToValue={(job, value) =>
					typeof value !== "string" && job.id === value.id
				}
			/>,
		);
		await userEvent.click(combobox());
		await expectListShown();
		await vi.waitFor(() => {
			expect(selectedRows()).toEqual(["PayPal"]);
		});
	});

	test("groupBy heads each run of options: a group named by its heading holds the run's rows", async () => {
		render(
			<Autocomplete
				label="Stack"
				options={stack}
				groupBy={(technology) => technology.group}
			/>,
		);
		await userEvent.click(combobox("Stack"));
		const list = await expectListShown();
		const runs = [
			["Runtime", ["Node.js"]],
			["Languages", ["TypeScript", "Rust"]],
			["Data", ["PostgreSQL", "MongoDB"]],
			["Cloud", ["AWS", "Terraform", "Cloudflare"]],
			["Frontend", ["React"]],
		] as const;
		const groups = within(list).getAllByRole("group");
		expect(groups).toHaveLength(runs.length);
		for (const [index, [heading, labels]] of runs.entries()) {
			const group = within(list).getByRole("group", { name: heading });
			expect(group).toBe(groups[index]);
			expect(
				within(group)
					.getAllByRole("option")
					.map((element) => element.textContent),
			).toEqual(labels);
		}
	});

	test("consecutive options with one heading form a group: a heading that comes back later starts another", async () => {
		const unsorted: Technology[] = [
			{ label: "Rust", group: "Languages" },
			{ label: "AWS", group: "Cloud" },
			{ label: "TypeScript", group: "Languages" },
		];
		render(
			<Autocomplete
				label="Stack"
				options={unsorted}
				groupBy={(technology) => technology.group}
			/>,
		);
		await userEvent.click(combobox("Stack"));
		const list = await expectListShown();
		const groups = within(list).getAllByRole("group");
		expect(groups).toHaveLength(3);
		const [first, second, third] = groups;
		expect(first).toHaveAccessibleName("Languages");
		expect(second).toHaveAccessibleName("Cloud");
		expect(third).toHaveAccessibleName("Languages");
		expect(within(third).getByRole("option")).toHaveTextContent("TypeScript");
	});

	test("filterOptions replaces the default filter, and gets the options, the typed text and getOptionLabel", async () => {
		const filterOptions = vi.fn<
			NonNullable<AutocompleteProps<Technology>["filterOptions"]>
		>((options, { inputValue, getOptionLabel }) =>
			options.filter((technology) =>
				getOptionLabel(technology)
					.toLowerCase()
					.startsWith(inputValue.toLowerCase()),
			),
		);
		render(
			<Autocomplete
				label="Stack"
				options={stack}
				filterOptions={filterOptions}
			/>,
		);
		combobox("Stack").focus();
		await userEvent.keyboard("t");
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual(["TypeScript", "Terraform"]);
		});
		const [options, state] = filterOptions.mock.lastCall ?? [];
		expect(options).toEqual(stack);
		expect(state?.inputValue).toBe("t");
		expect(state?.getOptionLabel(stack[3])).toBe("PostgreSQL");
	});

	test("renderOption draws each row from the option and its state: selected, the typed text, and the label with the match in 600", async () => {
		const renderOption = vi.fn<
			NonNullable<AutocompleteProps<string>["renderOption"]>
		>((employer, { label }) => (
			<span data-testid={`row ${employer}`}>{label}</span>
		));
		render(
			<Autocomplete
				multiple
				label="Employers"
				options={employers}
				defaultValue={["PayPal"]}
				renderOption={renderOption}
			/>,
		);
		combobox("Employers").focus();
		await userEvent.keyboard("pa");
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual(["EPAM", "PayPal"]);
		});
		const custom = screen.getByTestId("row PayPal");
		expect(option("PayPal").contains(custom)).toBe(true);
		expect(boldTextIn(custom)).toEqual(["Pa"]);
		const latest = (employer: string) =>
			renderOption.mock.calls.findLast(
				([rendered]) => rendered === employer,
			)?.[1];
		expect(latest("PayPal")).toMatchObject({
			selected: true,
			inputValue: "pa",
		});
		expect(latest("EPAM")).toMatchObject({ selected: false, inputValue: "pa" });
	});

	test("loading: while the list is empty the popup says Loading…, or loadingText", async () => {
		render(
			<>
				<Employer loading defaultOpen options={[]} defaultInputValue="Glo" />
				<Autocomplete
					loading
					defaultOpen
					label="Previous employer"
					options={[]}
					loadingText="Fetching employers…"
				/>
			</>,
		);
		await expectShownText("Loading…");
		await expectShownText("Fetching employers…");
	});

	test("loading with options shows them: loadingText is only for an empty list", async () => {
		const view = render(<Employer loading defaultOpen options={[]} />);
		await expectShownText("Loading…");
		view.rerender(<Employer loading defaultOpen />);
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual(employers);
		});
		expect(shownText("Loading…")).toHaveLength(0);
	});

	test("when nothing matches, the popup says No options, or noOptionsText", async () => {
		render(
			<>
				<Employer defaultOpen defaultInputValue="Stripe" />
				<Autocomplete
					defaultOpen
					label="Previous employer"
					options={employers}
					defaultInputValue="Stripe"
					noOptionsText="No company by that name"
				/>
			</>,
		);
		await expectShownText("No options");
		await expectShownText("No company by that name");
		expect(screen.queryAllByRole("option")).toHaveLength(0);
	});

	test("the empty and loading states are announced in a status region", async () => {
		const statuses = () =>
			screen.queryAllByRole("status").map((element) => element.textContent);
		const view = render(<Employer defaultOpen defaultInputValue="Stripe" />);
		await vi.waitFor(() => {
			expect(statuses()).toContain("No options");
		});
		view.rerender(
			<Employer loading defaultOpen options={[]} defaultInputValue="Stripe" />,
		);
		await vi.waitFor(() => {
			expect(statuses()).toContain("Loading…");
		});
	});

	test("the list renders in document.body by default, and in place inside the field with disablePortal", async () => {
		const inPlace = React.createRef<HTMLDivElement>();
		const { container } = render(
			<>
				<Employer defaultOpen />
				<Autocomplete
					ref={inPlace}
					defaultOpen
					disablePortal
					label="Previous employer"
					options={employers}
				/>
			</>,
		);
		const away = await vi.waitFor(() =>
			screen.getByRole("listbox", { name: "Employer" }),
		);
		expect(container.contains(away)).toBe(false);
		expect(document.body.contains(away)).toBe(true);
		const near = await vi.waitFor(() =>
			screen.getByRole("listbox", { name: "Previous employer" }),
		);
		expect(inPlace.current?.contains(near)).toBe(true);
	});

	test("the list floats 8px under the pill on the popover material: its left edge on the pill's, as wide as the pill, a glass fill blurred by blur-selector, with radius-well corners", async () => {
		render(
			<div style={{ padding: 24, width: 320 }}>
				<Employer defaultOpen fullWidth />
			</div>,
		);
		const list = await expectListShown();
		const surface = list.closest(".gl-popover");
		expect(surface).not.toBeNull();
		const misplacement = () => {
			const anchor = box(pill());
			const floating = box(surface!);
			const problems: string[] = [];
			const near = (what: string, actual: number, expected: number) => {
				if (Math.abs(actual - expected) > 1.5) {
					problems.push(
						`${what} at ${actual.toFixed(1)}, not ${expected.toFixed(1)}`,
					);
				}
			};

			near("top edge", floating.top, anchor.bottom + 8);
			near("left edge", floating.left, anchor.left);
			near("width", floating.width, anchor.width);
			return problems;
		};

		await expect.poll(misplacement).toEqual([]);
		const style = getComputedStyle(surface!);
		expect(style.borderTopLeftRadius).toBe(
			resolvedToken("borderTopLeftRadius", "--radius-well"),
		);
		expect(style.backgroundColor).toBe(
			resolvedToken("backgroundColor", "--glass"),
		);
		expect(style.backdropFilter).toContain(
			`blur(${resolvedToken("width", "--blur-selector")})`,
		);
	});

	test("with freeSolo the options are only suggestions: text that matches none shows no popup, and there's no Open button", async () => {
		render(<Autocomplete freeSolo label="Role" options={roles} />);
		const input = combobox("Role");
		expect(screen.queryByRole("button", { name: "Open" })).toBeNull();
		input.focus();
		await userEvent.keyboard("lead");
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual(["Backend lead", "Lead software engineer"]);
		});
		await userEvent.keyboard(" platform");
		await expectListGone();
		await expect.element(input).toHaveAttribute("aria-expanded", "false");
		await expect.poll(() => shownText("No options").length).toBe(0);
	});

	test("with a choice made, the list shows every option, the chosen one selected, until the text is edited", async () => {
		render(<Employer defaultValue="PayPal" />);
		const input = combobox();
		await userEvent.click(input);
		const list = await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual(employers);
			expect(selectedRows()).toEqual(["PayPal"]);
		});
		expect(list).not.toHaveAttribute("aria-multiselectable", "true");
		input.setSelectionRange(input.value.length, input.value.length);
		await userEvent.keyboard("{Backspace}");
		await vi.waitFor(() => {
			expect(rows()).toEqual(["PayPal"]);
		});
	});
});

describe("Autocomplete: keyboard", () => {
	test("Down opens the list on its first row, then Down and Up move through the rows and wrap, while focus stays in the input", async () => {
		render(<Employer />);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("{ArrowDown}");
		await expectListShown();
		await expectHighlighted("EPAM");
		await walk([
			["{ArrowDown}", "Intive"],
			["{ArrowDown}", "Limber Health"],
			["{ArrowDown}", "SunDevs"],
			["{ArrowDown}", "Globant"],
			["{ArrowDown}", "PayPal"],
			["{ArrowDown}", "Gorilla Logic"],
			["{ArrowDown}", "EPAM"],
			["{ArrowUp}", "Gorilla Logic"],
			["{ArrowUp}", "PayPal"],
		]);
	});

	test("Up opens the list on its last row", async () => {
		render(<Employer />);
		combobox().focus();
		await userEvent.keyboard("{ArrowUp}");
		await expectListShown();
		await expectHighlighted("Gorilla Logic");
	});

	test("with a choice made, Down opens the list on the chosen row", async () => {
		render(<Employer defaultValue="Globant" />);
		combobox().focus();
		await userEvent.keyboard("{ArrowDown}");
		await expectListShown();
		await expectHighlighted("Globant");
	});

	test("the highlighted row is announced through aria-activedescendant, its id, and with none highlighted there's no attribute", async () => {
		render(<Employer />);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("p");
		await expectListShown();
		expect(input).not.toHaveAttribute("aria-activedescendant");
		await userEvent.keyboard("{ArrowDown}");
		const epam = option("EPAM");
		expect(epam.id).not.toBe("");
		await expect
			.element(input)
			.toHaveAttribute("aria-activedescendant", epam.id);
		expect(input).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await expect.element(input).not.toHaveAttribute("aria-activedescendant");
	});

	test("Page Down and Page Up move five rows, and stop at the last and first", async () => {
		render(<Autocomplete label="Technology" options={technologies} />);
		const input = combobox("Technology");
		input.focus();
		await userEvent.keyboard("{ArrowDown}");
		await expectHighlighted("Astro", input);
		await walk(
			[
				["{PageDown}", "Kubernetes"],
				["{PageDown}", "React"],
				["{PageDown}", "TypeScript"],
				["{PageUp}", "PostgreSQL"],
				["{PageUp}", "GraphQL"],
				["{PageUp}", "Astro"],
			],
			input,
		);
	});

	test("Home and End jump to the first and last rows", async () => {
		render(<Employer />);
		combobox().focus();
		await userEvent.keyboard("{ArrowDown}{ArrowDown}");
		await expectHighlighted("Intive");
		await walk([
			["{End}", "Gorilla Logic"],
			["{Home}", "EPAM"],
		]);
	});

	test("with freeSolo, Home and End move the caret instead", async () => {
		render(<Autocomplete freeSolo label="Role" options={roles} />);
		const input = combobox("Role");
		input.focus();
		await userEvent.keyboard("lead");
		await expectListShown();
		await userEvent.keyboard("{Home}");
		expect(input.selectionStart).toBe(0);
		expect(highlighted(input)).toBeNull();
		await userEvent.keyboard("{End}");
		expect(input.selectionStart).toBe(4);
		expect(highlighted(input)).toBeNull();
	});

	test("Enter chooses the highlighted row: onChange gets the Enter key, the option and selectOption, the text becomes its label, the list closes, and the form isn't submitted", async () => {
		const onChange = vi.fn<OnChange>();
		const onSubmit = vi.fn((event: React.SubmitEvent) => {
			event.preventDefault();
		});
		render(
			<form aria-label="Career" onSubmit={onSubmit}>
				<Employer onChange={onChange} />
				<button type="submit">Save</button>
			</form>,
		);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("{ArrowDown}{ArrowDown}");
		await expectHighlighted("Intive");
		await userEvent.keyboard("{Enter}");
		const [event, value, reason] = await onlyCall(onChange);
		expectKey(event, "Enter");
		expect(value).toBe("Intive");
		expect(reason).toBe("selectOption");
		await expect.element(input).toHaveValue("Intive");
		await expectListGone();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test("without a highlighted row, Enter chooses nothing", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Employer onChange={onChange} />);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("pal");
		await expectListShown();
		await userEvent.keyboard("{Enter}");
		await frames();
		expect(onChange).not.toHaveBeenCalled();
		expect(input).toHaveValue("pal");
	});

	test("with freeSolo, Enter with no row highlighted commits the text, with createOption; with a row highlighted it still chooses the row", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Autocomplete
				freeSolo
				label="Role"
				options={roles}
				onChange={onChange}
			/>,
		);
		const input = combobox("Role");
		input.focus();
		await userEvent.keyboard("Staff engineer{Enter}");
		const [event, value, reason] = await onlyCall(onChange);
		expectKey(event, "Enter");
		expect(value).toBe("Staff engineer");
		expect(reason).toBe("createOption");
		await expect.element(input).toHaveValue("Staff engineer");
		await userEvent.fill(input, "lead");
		await expectListShown();
		await userEvent.keyboard("{ArrowDown}");
		await expectHighlighted("Backend lead", input);
		await userEvent.keyboard("{Enter}");
		await vi.waitFor(() => {
			expect(changes(onChange)).toEqual([
				["Staff engineer", "createOption"],
				["Backend lead", "selectOption"],
			]);
		});
	});

	test("Escape closes the list and leaves the text; without clearOnEscape, Escape on the closed list clears nothing", async () => {
		render(<Employer />);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("pa");
		await expectListShown();
		await userEvent.keyboard("{Escape}");
		await expect.element(input).toHaveAttribute("aria-expanded", "false");
		await expectListGone();
		expect(input).toHaveValue("pa");
		await userEvent.keyboard("{Escape}");
		await frames();
		expect(input).toHaveValue("pa");
	});

	test("with clearOnEscape, Escape on the closed list clears the text and the value: onInputChange and onChange get clear", async () => {
		const onChange = vi.fn<OnChange>();
		const onInputChange = vi.fn<OnInputChange>();
		render(
			<Employer
				clearOnEscape
				defaultValue="PayPal"
				onChange={onChange}
				onInputChange={onInputChange}
			/>,
		);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("{ArrowDown}");
		await expectListShown();
		await userEvent.keyboard("{Escape}");
		await expectListGone();
		expect(input).toHaveValue("PayPal");
		expect(onChange).not.toHaveBeenCalled();
		await userEvent.keyboard("{Escape}");
		await expect.element(input).toHaveValue("");
		const [event, value, reason] = await onlyCall(onChange);
		expectKey(event, "Escape");
		expect([value, reason]).toEqual([null, "clear"]);
		const [textEvent, text, textReason] = await onlyCall(onInputChange);
		expectKey(textEvent, "Escape");
		expect([text, textReason]).toEqual(["", "clear"]);
	});

	test("the arrows, Page Up and Page Down, Home and End skip disabled rows", async () => {
		const options = [
			{ label: "EPAM", disabled: true },
			{ label: "Intive" },
			{ label: "Limber Health", disabled: true },
			{ label: "SunDevs" },
			{ label: "Globant" },
			{ label: "PayPal" },
			{ label: "Gorilla Logic", disabled: true },
		];
		render(<Autocomplete label="Employer" options={options} />);
		combobox().focus();
		await userEvent.keyboard("{ArrowDown}");
		await expectHighlighted("Intive");
		await walk([
			["{ArrowDown}", "SunDevs"],
			["{ArrowDown}", "Globant"],
			["{ArrowDown}", "PayPal"],
			["{ArrowDown}", "Intive"],
			["{ArrowUp}", "PayPal"],
			["{Home}", "Intive"],
			["{End}", "PayPal"],
			["{PageUp}", "Intive"],
			["{PageDown}", "PayPal"],
		]);
	});

	test("the field is one tab stop: Tab goes from Before to the input to After, past its buttons and chips", async () => {
		render(
			<Around>
				<Stack defaultValue={[nodeJs, typeScript]} />
			</Around>,
		);
		const input = combobox("Stack");
		button("Before").focus();
		await userEvent.tab();
		await expect.element(input).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(input).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
	});
});

describe("Autocomplete: choosing", () => {
	test("a press on a row chooses it: onChange gets the press, the option and selectOption; the text becomes its label, the list closes, and focus stays in the input", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Autocomplete label="Stack" options={stack} onChange={onChange} />);
		const input = combobox("Stack");
		await userEvent.click(input);
		await expectListShown();
		await userEvent.click(option("Rust"));
		const [event, value, reason] = await onlyCall(onChange);
		expectReactEvent(event, MouseEvent);
		expect(value).toBe(stack[2]);
		expect(reason).toBe("selectOption");
		await expect.element(input).toHaveValue("Rust");
		await expectListGone();
		await expect.element(input).toHaveFocus();
	});

	test("defaultValue sets the starting choice: its label is the starting text and its row is selected, and a new choice replaces it", async () => {
		render(<Employer defaultValue="PayPal" />);
		const input = combobox();
		expect(input).toHaveValue("PayPal");
		await userEvent.click(input);
		await expectListShown();
		await vi.waitFor(() => {
			expect(selectedRows()).toEqual(["PayPal"]);
		});
		await userEvent.click(option("Globant"));
		await expect.element(input).toHaveValue("Globant");
		await expectListGone();
		await userEvent.click(input);
		await expectListShown();
		await vi.waitFor(() => {
			expect(selectedRows()).toEqual(["Globant"]);
		});
	});

	test("value controls the choice: a choice calls onChange, and only a new value from the parent moves it", async () => {
		const onChange = vi.fn<OnChange>();
		const view = render(
			<Around>
				<Employer value={null} onChange={onChange} />
			</Around>,
		);
		const input = combobox();
		await userEvent.click(input);
		await expectListShown();
		await userEvent.click(option("PayPal"));
		await vi.waitFor(() => {
			expect(changes(onChange)).toEqual([["PayPal", "selectOption"]]);
		});
		await userEvent.tab();
		await expect.element(input).toHaveValue("");
		await userEvent.click(input);
		await expectListShown();
		expect(selectedRows()).toEqual([]);
		await userEvent.keyboard("{Escape}");
		await expectListGone();
		view.rerender(
			<Around>
				<Employer value="PayPal" onChange={onChange} />
			</Around>,
		);
		await userEvent.click(input);
		await expectListShown();
		await vi.waitFor(() => {
			expect(selectedRows()).toEqual(["PayPal"]);
		});
	});

	test("inputValue controls the text: typing calls onInputChange with the new text and input, and only a new inputValue moves the text", async () => {
		const onInputChange = vi.fn<OnInputChange>();
		const view = render(
			<Employer inputValue="pa" onInputChange={onInputChange} />,
		);
		const input = combobox();
		input.focus();
		input.setSelectionRange(2, 2);
		await userEvent.keyboard("y");
		const [event, text, reason] = await onlyCall(onInputChange);
		expectTyping(event);
		expect([text, reason]).toEqual(["pay", "input"]);
		expect(input).toHaveValue("pa");
		view.rerender(<Employer inputValue="pay" onInputChange={onInputChange} />);
		await expect.element(input).toHaveValue("pay");
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual(["PayPal"]);
		});
	});

	test("defaultInputValue sets the starting text, which filters the list", async () => {
		render(<Employer defaultOpen defaultInputValue="a" />);
		expect(combobox()).toHaveValue("a");
		await expectListShown();
		await vi.waitFor(() => {
			expect(rows()).toEqual([
				"EPAM",
				"Limber Health",
				"Globant",
				"PayPal",
				"Gorilla Logic",
			]);
		});
	});

	test("onInputChange says why the text changed: input as you type, reset after a choice, clear from the Clear button", async () => {
		const onInputChange = vi.fn<OnInputChange>();
		render(<Employer onInputChange={onInputChange} />);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("glo");
		await expectListShown();
		await userEvent.click(option("Globant"));
		await userEvent.click(button("Clear"));
		await vi.waitFor(() => {
			expect(texts(onInputChange)).toEqual([
				["g", "input"],
				["gl", "input"],
				["glo", "input"],
				["Globant", "reset"],
				["", "clear"],
			]);
		});
		const events = onInputChange.mock.calls.map(([event]) => event);
		expectTyping(events[0]);
		expectReactEventOrNull(events[3]);
		expectReactEvent(events[4], MouseEvent);
	});

	test("without freeSolo, text that chose nothing goes when focus leaves: the field shows its value's label again, or nothing, as a reset", async () => {
		const onChange = vi.fn<OnChange>();
		const onInputChange = vi.fn<OnInputChange>();
		render(
			<Around>
				<Employer
					defaultValue="PayPal"
					onChange={onChange}
					onInputChange={onInputChange}
				/>
				<Autocomplete label="Previous employer" options={employers} />
			</Around>,
		);
		const input = combobox();
		input.focus();
		input.setSelectionRange(6, 6);
		await userEvent.keyboard("{Backspace}{Backspace}");
		expect(input).toHaveValue("PayP");
		await userEvent.tab();
		await expect.element(input).toHaveValue("PayPal");
		const [event, text, reason] = onInputChange.mock.lastCall ?? [];
		expectReactEventOrNull(event);
		expect([text, reason]).toEqual(["PayPal", "reset"]);
		expect(onChange).not.toHaveBeenCalled();

		const previous = combobox("Previous employer");
		await expect.element(previous).toHaveFocus();
		await userEvent.keyboard("Stri");
		await userEvent.tab();
		await expect.element(previous).toHaveValue("");
	});

	test("with freeSolo the value may be any string, and typed text stays when focus leaves, unchosen until Enter", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Around>
				<Autocomplete
					freeSolo
					label="Role"
					options={roles}
					defaultValue="Platform lead"
					onChange={onChange}
				/>
			</Around>,
		);
		const input = combobox("Role");
		expect(input).toHaveValue("Platform lead");
		await userEvent.fill(input, "Staff engineer");
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		expect(input).toHaveValue("Staff engineer");
		expect(onChange).not.toHaveBeenCalled();
	});

	test("the Clear button shows while the field has focus and something to clear", async () => {
		render(
			<Around>
				<Employer defaultValue="PayPal" />
				<Autocomplete label="Previous employer" options={employers} />
			</Around>,
		);
		expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
		button("Before").focus();
		await userEvent.tab();
		const clear = await vi.waitFor(() => button("Clear"));
		expect(pill(combobox()).contains(clear)).toBe(true);
		await userEvent.tab();
		await expect
			.poll(() => screen.queryByRole("button", { name: "Clear" }))
			.toBeNull();
		await userEvent.keyboard("p");
		const other = await vi.waitFor(() => button("Clear"));
		expect(pill(combobox("Previous employer")).contains(other)).toBe(true);
	});

	test("the Clear button empties the text and the value: onChange gets the press, null and clear, and focus is in the input", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Around>
				<Employer defaultValue="PayPal" onChange={onChange} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await userEvent.click(await vi.waitFor(() => button("Clear")));
		const input = combobox();
		await expect.element(input).toHaveValue("");
		const [event, value, reason] = await onlyCall(onChange);
		expectReactEvent(event, MouseEvent);
		expect([value, reason]).toEqual([null, "clear"]);
		await expect.element(input).toHaveFocus();
	});

	test("emptying the text clears a chosen value: onChange gets null and clear", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Employer defaultValue="PayPal" onChange={onChange} />);
		await userEvent.clear(combobox());
		const [event, value, reason] = await onlyCall(onChange);
		expectTyping(event);
		expect([value, reason]).toEqual([null, "clear"]);
	});

	test("disableClearable leaves out the Clear button, and emptying the text keeps the value", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Around>
				<Employer disableClearable defaultValue="PayPal" onChange={onChange} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await userEvent.hover(pill());
		await frames();
		expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
		const input = combobox();
		await userEvent.clear(input);
		expect(input).toHaveValue("");
		await userEvent.tab();
		await expect.element(input).toHaveValue("PayPal");
		expect(onChange).not.toHaveBeenCalled();
	});

	test("defaultOpen starts with the list open; the popup button reads Close and closes it, with toggleInput, then reads Open and opens it, and focus goes to the input", async () => {
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		render(<Employer defaultOpen onOpen={onOpen} onClose={onClose} />);
		await expectListShown();
		const input = combobox();
		expect(input).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(button("Close"));
		await expectListGone();
		const [closeEvent, reason] = await onlyCall(onClose);
		expectReactEvent(closeEvent, MouseEvent);
		expect(reason).toBe("toggleInput");
		await expect.element(input).toHaveFocus();
		await userEvent.click(button("Open"));
		await expectListShown();
		const [openEvent] = await onlyCall(onOpen);
		expectReactEvent(openEvent, MouseEvent);
		await expect.element(input).toHaveFocus();
	});

	test("open controls the list: onOpen and onClose only ask, and the list follows open", async () => {
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		const view = render(
			<Employer open={false} onOpen={onOpen} onClose={onClose} />,
		);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("p");
		await vi.waitFor(() => {
			expect(onOpen).toHaveBeenCalled();
		});
		await frames();
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(input).toHaveAttribute("aria-expanded", "false");
		view.rerender(<Employer open onOpen={onOpen} onClose={onClose} />);
		await expectListShown();
		await userEvent.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(closes(onClose)).toEqual(["escape"]);
		});
		await frames();
		expect(screen.getByRole("listbox")).toBeVisible();
		view.rerender(<Employer open={false} onOpen={onOpen} onClose={onClose} />);
		await expectListGone();
	});

	test.each<
		[
			string,
			() => Promise<void>,
			new (...arguments_: never[]) => Event,
			string | undefined,
		]
	>([
		[
			"typing",
			async () => {
				combobox().focus();
				await userEvent.keyboard("p");
			},
			Event,
			"input",
		],
		[
			"Down",
			async () => {
				combobox().focus();
				await userEvent.keyboard("{ArrowDown}");
			},
			KeyboardEvent,
			"keydown",
		],
		[
			"a press on the input",
			async () => {
				await userEvent.click(combobox());
			},
			MouseEvent,
			undefined,
		],
		[
			"the Open button",
			async () => {
				await userEvent.click(button("Open"));
			},
			MouseEvent,
			undefined,
		],
	])(
		"onOpen gets the event that asked to open the list: %s",
		async (_how, act, type, nativeType) => {
			const onOpen = vi.fn<OnOpen>();
			render(<Employer onOpen={onOpen} />);
			await act();
			await expectListShown();
			const [event] = await onlyCall(onOpen);
			const native = expectReactEvent(event, type);
			if (nativeType !== undefined) {
				expect(native.type).toBe(nativeType);
			}
		},
	);

	test("openOnFocus opens the list when the input takes focus, and onOpen gets the focus; without it, focus alone doesn't", async () => {
		const onOpen = vi.fn<OnOpen>();
		render(
			<Around>
				<Employer openOnFocus onOpen={onOpen} />
				<Autocomplete label="Previous employer" options={employers} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await vi.waitFor(() => screen.getByRole("listbox", { name: "Employer" }));
		const [event] = await onlyCall(onOpen);
		expectReactEvent(event, FocusEvent);
		await userEvent.tab();
		await expect.element(combobox("Previous employer")).toHaveFocus();
		await expectListGone();
	});

	test.each<
		[
			string,
			AutocompleteCloseReason,
			() => Promise<void>,
			(native: Event) => boolean,
		]
	>([
		[
			"a press on a row",
			"selectOption",
			async () => {
				await userEvent.click(combobox());
				await expectListShown();
				await userEvent.click(option("PayPal"));
			},
			(native) => native instanceof MouseEvent,
		],
		[
			"Enter on a row",
			"selectOption",
			async () => {
				combobox().focus();
				await userEvent.keyboard("{ArrowDown}");
				await expectHighlighted("EPAM");
				await userEvent.keyboard("{Enter}");
			},
			(native) => native instanceof KeyboardEvent && native.key === "Enter",
		],
		[
			"Escape",
			"escape",
			async () => {
				combobox().focus();
				await userEvent.keyboard("{ArrowDown}");
				await expectListShown();
				await userEvent.keyboard("{Escape}");
			},
			(native) => native instanceof KeyboardEvent && native.key === "Escape",
		],
		[
			"Tab",
			"blur",
			async () => {
				button("Before").focus();
				await userEvent.tab();
				await userEvent.keyboard("{ArrowDown}");
				await expectListShown();
				await userEvent.tab();
				await expect.element(button("After")).toHaveFocus();
			},
			(native) =>
				native instanceof KeyboardEvent || native instanceof FocusEvent,
		],
		[
			"a press outside",
			"blur",
			async () => {
				await userEvent.click(combobox());
				await expectListShown();
				await userEvent.click(screen.getByText("Elsewhere"));
			},
			(native) => native instanceof MouseEvent || native instanceof FocusEvent,
		],
		[
			"the Close button",
			"toggleInput",
			async () => {
				await userEvent.click(combobox());
				await expectListShown();
				await userEvent.click(button("Close"));
			},
			(native) => native instanceof MouseEvent,
		],
	])(
		"onClose gets the event and why the list closes: %s is %s",
		async (_how, expected, act, isExpectedEvent) => {
			const onClose = vi.fn<OnClose>();
			render(
				<>
					<Around>
						<Employer onClose={onClose} />
					</Around>
					<Elsewhere />
				</>,
			);
			await act();
			await expectListGone();
			const [event, reason] = await onlyCall(onClose);
			expect(reason).toBe(expected);
			expect(isExpectedEvent(expectReactEvent(event, Event))).toBe(true);
		},
	);

	test("autoHighlight highlights the first enabled match as you type, so Enter takes it", async () => {
		const onChange = vi.fn<OnChange>();
		const options = [
			{ label: "Globant", disabled: true },
			{ label: "Gorilla Logic" },
			{ label: "PayPal" },
		];
		render(
			<Autocomplete
				autoHighlight
				label="Employer"
				options={options}
				onChange={onChange}
			/>,
		);
		const input = combobox();
		input.focus();
		await userEvent.keyboard("g");
		await expectHighlighted("Gorilla Logic");
		await userEvent.keyboard("{Enter}");
		await vi.waitFor(() => {
			expect(changes(onChange)).toEqual([[options[1], "selectOption"]]);
		});
		await expect.element(input).toHaveValue("Gorilla Logic");
	});

	test("disableCloseOnSelect keeps the list open after a choice", async () => {
		const onChange = vi.fn<OnChange>();
		const onClose = vi.fn<OnClose>();
		render(
			<Employer disableCloseOnSelect onChange={onChange} onClose={onClose} />,
		);
		await userEvent.click(combobox());
		await expectListShown();
		await userEvent.click(option("PayPal"));
		await userEvent.click(option("Globant"));
		await vi.waitFor(() => {
			expect(changes(onChange)).toEqual([
				["PayPal", "selectOption"],
				["Globant", "selectOption"],
			]);
		});
		await frames();
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByRole("listbox")).toBeVisible();
		await expect.element(combobox()).toHaveValue("Globant");
	});
});

describe("Autocomplete: multiple", () => {
	test("chips sit inside the pill before the input, one per chosen option, with its label and a Remove button", async () => {
		render(<Stack defaultValue={[nodeJs, typeScript, aws]} />);
		await expectChips(["Node.js", "TypeScript", "AWS"]);
		const input = combobox("Stack");
		expect(input).toHaveValue("");
		for (const label of ["Node.js", "TypeScript", "AWS"]) {
			const element = chip(label);
			expect(pill(input).contains(element)).toBe(true);
			expect(isInOrder(element, input)).toBe(true);
			expect(element).toHaveTextContent(label);
		}
	});

	test("a chip is the site's .chip: 12px text in ink-soft on glass-control", () => {
		render(<Stack defaultValue={[typeScript]} />);
		const style = getComputedStyle(chip("TypeScript"));
		expect(style.fontSize).toBe("12px");
		expect(style.color).toBe(resolvedToken("color", "--ink-soft"));
		expect(style.backgroundColor).toBe(
			resolvedToken("backgroundColor", "--glass-control"),
		);
	});

	test("a choice adds a chip and empties the text, and choosing a chosen row again removes it", async () => {
		const onChange = vi.fn<OnChange>();
		const onInputChange = vi.fn<OnInputChange>();
		render(<Stack onChange={onChange} onInputChange={onInputChange} />);
		const input = combobox("Stack");
		input.focus();
		await userEvent.keyboard("ty");
		await expectListShown();
		await userEvent.click(option("TypeScript"));
		await expectChips(["TypeScript"]);
		await expect.element(input).toHaveValue("");
		await vi.waitFor(() => {
			expect(texts(onInputChange).at(-1)).toEqual(["", "reset"]);
		});
		await parkPointer();
		await userEvent.keyboard("{ArrowDown}");
		await expectListShown();
		await vi.waitFor(() => {
			expect(option("TypeScript")).toHaveAttribute("aria-selected", "true");
		});
		await userEvent.click(option("TypeScript"));
		await expectChips([]);
		expect(changes(onChange)).toEqual([
			[[typeScript], "selectOption"],
			[[], "removeOption"],
		]);
	});

	test("the list is aria-multiselectable, and every chosen row is selected", async () => {
		render(<Stack defaultValue={[nodeJs, aws]} />);
		await userEvent.click(combobox("Stack"));
		const list = await expectListShown();
		expect(list).toHaveAttribute("aria-multiselectable", "true");
		await vi.waitFor(() => {
			expect(selectedRows()).toEqual(["Node.js", "AWS"]);
		});
	});

	test("a press on a chip's Remove button removes it: onChange gets the press and removeOption, and focus is in the input", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Stack defaultValue={[nodeJs, typeScript, aws]} onChange={onChange} />,
		);
		await userEvent.click(button("Remove TypeScript"));
		await expectChips(["Node.js", "AWS"]);
		const [event, value, reason] = await onlyCall(onChange);
		expectReactEvent(event, MouseEvent);
		expect(value).toEqual([nodeJs, aws]);
		expect(reason).toBe("removeOption");
		await expect.element(combobox("Stack")).toHaveFocus();
	});

	test("Backspace in the empty input removes the last chip; with text there, it edits the text", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Stack defaultValue={[nodeJs, typeScript, aws]} onChange={onChange} />,
		);
		const input = combobox("Stack");
		input.focus();
		await userEvent.keyboard("r{Backspace}");
		expect(input).toHaveValue("");
		expect(onChange).not.toHaveBeenCalled();
		await userEvent.keyboard("{Backspace}");
		await expectChips(["Node.js", "TypeScript"]);
		await userEvent.keyboard("{Backspace}");
		await expectChips(["Node.js"]);
		expect(changes(onChange)).toEqual([
			[[nodeJs, typeScript], "removeOption"],
			[[nodeJs], "removeOption"],
		]);
		for (const [event] of onChange.mock.calls) {
			expectKey(event, "Backspace");
		}
	});

	test("Left at the start of the input moves to the last chip; Left and Right move between the chips, and Right from the last goes back to the input", async () => {
		render(<Stack defaultValue={[nodeJs, typeScript, aws]} />);
		const input = combobox("Stack");
		input.focus();
		await userEvent.keyboard("re{ArrowLeft}{ArrowLeft}");
		expect(input).toHaveFocus();
		expect(input.selectionStart).toBe(0);
		await userEvent.keyboard("{ArrowLeft}");
		await expectChipFocused("AWS");
		await userEvent.keyboard("{ArrowLeft}");
		await expectChipFocused("TypeScript");
		await userEvent.keyboard("{ArrowLeft}");
		await expectChipFocused("Node.js");
		await userEvent.keyboard("{ArrowLeft}");
		await expectChipFocused("Node.js");
		await userEvent.keyboard("{ArrowRight}");
		await expectChipFocused("TypeScript");
		await userEvent.keyboard("{ArrowRight}");
		await expectChipFocused("AWS");
		await userEvent.keyboard("{ArrowRight}");
		await expect.element(input).toHaveFocus();
	});

	test("Backspace or Delete on a chip removes it, and focus moves to the chip before it, or to the input once none are left", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Stack defaultValue={[nodeJs, typeScript, aws]} onChange={onChange} />,
		);
		const input = combobox("Stack");
		input.focus();
		await userEvent.keyboard("{ArrowLeft}");
		await expectChipFocused("AWS");
		await userEvent.keyboard("{Backspace}");
		await expectChips(["Node.js", "TypeScript"]);
		await expectChipFocused("TypeScript");
		await userEvent.keyboard("{Delete}");
		await expectChips(["Node.js"]);
		await expectChipFocused("Node.js");
		await userEvent.keyboard("{Delete}");
		await expectChips([]);
		await expect.element(input).toHaveFocus();
		expect(changes(onChange)).toEqual([
			[[nodeJs, typeScript], "removeOption"],
			[[nodeJs], "removeOption"],
			[[], "removeOption"],
		]);
		const keys = ["Backspace", "Delete", "Delete"];
		for (const [index, [event]] of onChange.mock.calls.entries()) {
			expectKey(event, keys[index]);
		}
	});

	test("value controls the chips: a choice or a removal calls onChange, and only a new value from the parent moves them", async () => {
		const onChange = vi.fn<OnChange>();
		const view = render(<Stack value={[nodeJs]} onChange={onChange} />);
		await userEvent.click(button("Remove Node.js"));
		await frames();
		await expectChips(["Node.js"]);
		await userEvent.click(combobox("Stack"));
		await expectListShown();
		await userEvent.click(option("TypeScript"));
		await frames();
		await expectChips(["Node.js"]);
		expect(changes(onChange)).toEqual([
			[[], "removeOption"],
			[[nodeJs, typeScript], "selectOption"],
		]);
		view.rerender(<Stack value={[typeScript, aws]} onChange={onChange} />);
		await expectChips(["TypeScript", "AWS"]);
	});

	test("with freeSolo, Enter makes a chip of the typed text, with createOption", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Stack freeSolo defaultValue={[nodeJs]} onChange={onChange} />);
		const input = combobox("Stack");
		input.focus();
		await userEvent.keyboard("Elixir{Enter}");
		await expectChips(["Node.js", "Elixir"]);
		await expect.element(input).toHaveValue("");
		const [event, value, reason] = await onlyCall(onChange);
		expectKey(event, "Enter");
		expect(value).toEqual([nodeJs, "Elixir"]);
		expect(reason).toBe("createOption");
	});

	test("the placeholder shows only while there are no chips", async () => {
		render(<Stack placeholder="Add a technology" defaultValue={[nodeJs]} />);
		const input = combobox("Stack");
		expect(input.placeholder).toBe("");
		await userEvent.click(button("Remove Node.js"));
		await expectChips([]);
		await expect
			.element(input)
			.toHaveAttribute("placeholder", "Add a technology");
	});

	test("disabled or readOnly, the chips keep their labels but lose their Remove buttons, and Backspace removes none", async () => {
		render(
			<>
				<Stack readOnly defaultValue={[nodeJs, typeScript]} />
				<Autocomplete
					multiple
					disabled
					label="Languages"
					options={stack}
					defaultValue={[stack[2]]}
				/>
			</>,
		);
		expect(removeButtons()).toHaveLength(0);
		for (const label of ["Node.js", "TypeScript", "Rust"]) {
			expect(screen.getByText(label)).toBeVisible();
		}

		combobox("Stack").focus();
		await userEvent.keyboard("{Backspace}");
		await frames();
		expect(screen.getByText("TypeScript")).toBeVisible();
	});
});

describe("Autocomplete: forms", () => {
	test("name puts the input's text in the form: the chosen option's label, not its value field", async () => {
		const options = [
			{ label: "EPAM", value: 1 },
			{ label: "Globant", value: 2 },
			{ label: "PayPal", value: 3 },
		];
		render(
			<form aria-label="Career">
				<Autocomplete
					label="Employer"
					name="employer"
					options={options}
					defaultValue={options[2]}
				/>
			</form>,
		);
		expect(entries("employer")).toEqual(["PayPal"]);
		await userEvent.click(combobox());
		await expectListShown();
		await userEvent.click(option("Globant"));
		await vi.waitFor(() => {
			expect(entries("employer")).toEqual(["Globant"]);
		});
	});

	test("with freeSolo the form gets the typed text, chosen or not", async () => {
		render(
			<form aria-label="Career">
				<Autocomplete freeSolo label="Role" name="role" options={roles} />
			</form>,
		);
		combobox("Role").focus();
		await userEvent.keyboard("Staff engineer");
		await vi.waitFor(() => {
			expect(entries("role")).toEqual(["Staff engineer"]);
		});
	});

	test("with multiple, the form gets one entry per chip under name, each its label, and not the typed text", async () => {
		const options = [
			{ label: "Node.js", value: "node" },
			{ label: "TypeScript", value: "ts" },
			{ label: "Rust", value: "rust" },
		];
		render(
			<form aria-label="Career">
				<Autocomplete
					multiple
					label="Stack"
					name="stack"
					options={options}
					defaultValue={[options[0], options[1]]}
				/>
			</form>,
		);
		expect(entries("stack")).toEqual(["Node.js", "TypeScript"]);
		combobox("Stack").focus();
		await userEvent.keyboard("ru");
		await expectListShown();
		expect(entries("stack")).toEqual(["Node.js", "TypeScript"]);
		await userEvent.click(button("Remove Node.js"));
		await vi.waitFor(() => {
			expect(entries("stack")).toEqual(["TypeScript"]);
		});
	});

	test("required: an empty field fails validation and stops the form submitting, and a choice makes it valid", async () => {
		const onSubmit = vi.fn((event: React.SubmitEvent) => {
			event.preventDefault();
		});
		render(
			<form aria-label="Career" onSubmit={onSubmit}>
				<Employer required name="employer" />
				<button type="submit">Save</button>
			</form>,
		);
		expect(form().checkValidity()).toBe(false);
		await userEvent.click(button("Save"));
		expect(onSubmit).not.toHaveBeenCalled();
		await userEvent.click(combobox());
		await expectListShown();
		await userEvent.click(option("EPAM"));
		await expect.poll(() => form().checkValidity()).toBe(true);
		await userEvent.click(button("Save"));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	test("required with multiple: valid while there's a chip, invalid with none", async () => {
		render(
			<form aria-label="Career">
				<Stack required name="stack" />
			</form>,
		);
		expect(form().checkValidity()).toBe(false);
		await userEvent.click(combobox("Stack"));
		await expectListShown();
		await userEvent.click(option("Rust"));
		await expectChips(["Rust"]);
		await expect.poll(() => form().checkValidity()).toBe(true);
		await userEvent.click(button("Remove Rust"));
		await expectChips([]);
		await expect.poll(() => form().checkValidity()).toBe(false);
	});
});

describe("Autocomplete: inside a dialog", () => {
	afterEach(async () => {
		cleanup();
		await vi.waitFor(() => {
			expect(document.body.style.overflow).toBe("");
			expect(
				document.querySelector("[inert], body > [aria-hidden='true']"),
			).toBeNull();
		});
	});

	test("with disablePortal the list opens inside the dialog, and Escape closes the list first, then the dialog", async () => {
		const onClose = vi.fn<NonNullable<DialogProps["onClose"]>>();
		render(
			<Dialog open onClose={onClose}>
				<DialogTitle>Add a role</DialogTitle>
				<DialogContent>
					<Employer disablePortal />
				</DialogContent>
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Add a role" });
		await userEvent.click(
			within(dialog).getByRole("combobox", { name: "Employer" }),
		);
		const list = await vi.waitFor(() => within(dialog).getByRole("listbox"));
		expect(dialog.contains(list)).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => within(dialog).queryByRole("listbox")).toBeNull();
		expect(onClose).not.toHaveBeenCalled();
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => onClose.mock.calls.length).toBe(1);
		expect(onClose.mock.calls[0]?.[1]).toBe("escapeKeyDown");
	});
});
