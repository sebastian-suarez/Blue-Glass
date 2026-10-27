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
	type FieldBaseProps,
	Icon,
	InputAdornment,
	Option,
	Select,
	type SelectCloseReason,
	type SelectOption,
	type SelectProps,
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

afterEach(async () => {
	cleanup();
	await expect.poll(() => isScrollLocked()).toBe(false);
	await expect
		.poll(
			() => document.querySelectorAll('[aria-hidden="true"], [inert]').length,
		)
		.toBe(0);
});

type OnChange = NonNullable<SelectProps["onChange"]>;
type OnOpen = NonNullable<SelectProps["onOpen"]>;
type OnClose = NonNullable<SelectProps["onClose"]>;

const stack = [
	"Node.js",
	"TypeScript",
	"AWS",
	"PostgreSQL",
	"MongoDB",
	"React",
	"Rust",
	"Terraform",
	"Cloudflare",
];

const employers = [
	"EPAM",
	"Intive",
	"Limber Health",
	"SunDevs",
	"Globant",
	"PayPal",
	"Gorilla Logic",
];

const topics = [
	"Backend architecture",
	"AWS and Terraform",
	"PostgreSQL performance",
	"Team practices",
	"Hiring process",
];

const slots: SelectOption[] = [
	{
		value: "mon9",
		label: "Monday, 09:00",
		secondary: "Booked",
		disabled: true,
	},
	{ value: "wed10", label: "Wednesday, 10:00", secondary: "45 minutes free" },
	{
		value: "wed15",
		label: "Wednesday, 15:00",
		secondary: "Booked",
		disabled: true,
	},
	{ value: "thu930", label: "Thursday, 09:30", secondary: "60 minutes free" },
	{ value: "fri11", label: "Friday, 11:00", secondary: "30 minutes free" },
	{
		value: "fri16",
		label: "Friday, 16:00",
		secondary: "Booked",
		disabled: true,
	},
];

const lengths: SelectOption[] = [
	{ value: "15", label: "15 minutes" },
	{ value: "30", label: "30 minutes" },
	{ value: "45", label: "45 minutes" },
];

const hours = Array.from(
	{ length: 24 },
	(_, hour) => `${String(hour).padStart(2, "0")}:00`,
);

function StackSelect(props: Partial<React.ComponentProps<typeof Select>>) {
	return <Select label="Primary stack" options={stack} {...props} />;
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

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function focusBefore() {
	button("Before").focus();
}

function trigger(name: string): HTMLElement {
	return screen.getByRole("combobox", { name });
}

function listbox(): HTMLElement {
	return screen.getByRole("listbox");
}

function px(value: string): number {
	return Number(value.replace(/px$/v, ""));
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
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

type Piece = { text: string; element: HTMLElement };

function shownPieces(root: Element): Piece[] {
	const pieces: Piece[] = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const text = node.textContent?.trim() ?? "";
		const parent = node.parentElement;
		if (
			text !== "" &&
			parent &&
			isShown(parent) &&
			!isAriaHiddenWithin(parent, root)
		) {
			pieces.push({ text, element: parent });
		}
	}

	return pieces;
}

function isAriaHiddenWithin(element: Element, root: Element): boolean {
	for (
		let node: Element | null = element;
		node && node !== root.parentElement;
		node = node.parentElement
	) {
		if (node.getAttribute("aria-hidden") === "true") {
			return true;
		}
	}

	return false;
}

function shown(element: Element): string[] {
	return shownPieces(element).map((piece) => piece.text);
}

function labelOf(option: Element): string {
	return shownPieces(option)[0]?.text ?? "";
}

function rows(): HTMLElement[] {
	return within(listbox()).getAllByRole("option");
}

function row(label: string): HTMLElement {
	const found = rows().filter((option) => labelOf(option) === label);
	expect(found, `the row ${label}`).toHaveLength(1);
	return found[0];
}

function activeOption(): HTMLElement | undefined {
	const focused = document.activeElement;
	if (!(focused instanceof HTMLElement)) {
		return undefined;
	}

	if (focused.getAttribute("role") === "option") {
		return focused;
	}

	const id = focused.getAttribute("aria-activedescendant");
	return id === null || id === ""
		? undefined
		: (document.querySelector<HTMLElement>(`#${CSS.escape(id)}`) ?? undefined);
}

function activeLabel(): string | undefined {
	const option = activeOption();
	return option ? labelOf(option) : undefined;
}

async function expectActive(label: string): Promise<void> {
	await expect.poll(activeLabel).toBe(label);
}

async function walk(
	steps: ReadonlyArray<readonly [key: string, label: string]>,
): Promise<void> {
	for (const [key, label] of steps) {
		// eslint-disable-next-line no-await-in-loop -- each key starts where the last one left off
		await userEvent.keyboard(key);
		// eslint-disable-next-line no-await-in-loop
		await expectActive(label);
	}
}

async function openByPress(element: HTMLElement): Promise<HTMLElement> {
	await userEvent.click(element);
	return screen.findByRole("listbox");
}

async function expectClosed(element: HTMLElement): Promise<void> {
	await expect.element(element).toHaveAttribute("aria-expanded", "false");
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

function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

function isScrollLocked(): boolean {
	return [document.documentElement, document.body].some((element) =>
		/^(?:hidden|clip)$/v.test(getComputedStyle(element).overflowY),
	);
}

function isInView(element: Element): boolean {
	let view: Element | undefined;
	for (let node = element.parentElement; node; node = node.parentElement) {
		const { overflowY } = getComputedStyle(node);
		if (
			/^(?:auto|scroll)$/v.test(overflowY) &&
			node.scrollHeight > node.clientHeight
		) {
			view = node;
			break;
		}
	}

	const outer = view ? box(view) : new DOMRect(0, 0, innerWidth, innerHeight);
	const inner = box(element);
	return inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
}

function isSettled(element: HTMLElement): boolean {
	const { width, height } = box(element);
	return (
		Math.abs(width - element.offsetWidth) < 0.5 &&
		Math.abs(height - element.offsetHeight) < 0.5
	);
}

function bordered(element: Element): HTMLElement {
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

	throw new Error("no bordered box around the element");
}

function labelElement(control: HTMLElement): HTMLElement {
	const labels = (control as HTMLButtonElement).labels ?? [];
	if (labels.length > 0) {
		return labels[0];
	}

	const [id = ""] =
		control.getAttribute("aria-labelledby")?.split(" ", 1) ?? [];
	return must(document.querySelector<HTMLElement>(`#${CSS.escape(id)}`));
}

function resolved(token: string, property = "color"): string {
	const probe = document.createElement("div");
	probe.style.setProperty(property, `var(${token})`);
	document.body.append(probe);
	const value = getComputedStyle(probe).getPropertyValue(property);
	probe.remove();
	return value;
}

function glyph(name: string): string {
	const { container, unmount } = render(<Icon name={name} />);
	const markup = container.querySelector("svg")?.getHTML() ?? "";
	unmount();
	return markup;
}

function glyphsIn(root: Element, markup: string): SVGSVGElement[] {
	return [...root.querySelectorAll("svg")].filter(
		(svg) => svg.getHTML() === markup && isShown(svg),
	);
}

function nativeOf(event: React.SyntheticEvent | Event): Event {
	return event instanceof Event ? event : event.nativeEvent;
}

function expectSynthetic(
	event: unknown,
	native: new (...args: never[]) => Event = Event,
): void {
	expect(event).not.toBeInstanceOf(Event);
	expect((event as React.SyntheticEvent).nativeEvent).toBeInstanceOf(native);
}

function onlyClose(
	onClose: Mock<OnClose>,
): [React.SyntheticEvent | KeyboardEvent, SelectCloseReason] {
	expect(onClose).toHaveBeenCalledTimes(1);
	const [event, reason] = onClose.mock.calls[0] ?? [];
	if (event === undefined || reason === undefined) {
		throw new Error("onClose got no event or reason");
	}

	return [event, reason];
}

function changes(onChange: Mock<OnChange>): unknown[] {
	return onChange.mock.calls.map(([, value]) => value as unknown);
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

const openKeys = [
	["Enter", "{Enter}"],
	["Space", " "],
	["Down", "{ArrowDown}"],
	["Up", "{ArrowUp}"],
] as const;

const chooseKeys = [
	["Enter", "{Enter}"],
	["Space", " "],
] as const;

describe("Select: the field", () => {
	test("a select-only combobox named by its label, which sits above it: aria-haspopup listbox, aria-expanded false, and the chosen row's label", () => {
		render(<StackSelect defaultValue="TypeScript" />);
		const stackTrigger = trigger("Primary stack");
		expect(stackTrigger).toHaveAttribute("aria-haspopup", "listbox");
		expect(stackTrigger).toHaveAttribute("aria-expanded", "false");
		expect(shown(stackTrigger)).toEqual(["TypeScript"]);
		expect(screen.queryByRole("textbox")).toBeNull();
		const label = labelElement(stackTrigger);
		expect(label).toHaveTextContent("Primary stack");
		expect(label).toBeVisible();
		expect(box(label).bottom).toBeLessThanOrEqual(box(stackTrigger).top + 0.5);
	});

	test("a press on the label focuses the trigger without opening the list", async () => {
		render(<StackSelect />);
		const stackTrigger = trigger("Primary stack");
		await userEvent.click(labelElement(stackTrigger));
		await expect.element(stackTrigger).toHaveFocus();
		await frames();
		expect(stackTrigger).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	test("the ref is the root div, holding the label, the trigger and the helper, and className, style and other attributes land on it", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<StackSelect
				ref={ref}
				helperText="The one you use most."
				className="stack-field"
				style={{ marginTop: 12 }}
				data-section="stack"
			/>,
		);
		const stackTrigger = trigger("Primary stack");
		const root = ref.current;
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(root).toContainElement(stackTrigger);
		expect(root).toContainElement(labelElement(stackTrigger));
		expect(root).toContainElement(screen.getByText("The one you use most."));
		expect(root).toHaveClass("stack-field");
		expect(root).toHaveStyle({ marginTop: "12px" });
		expect(root).toHaveAttribute("data-section", "stack");
		expect(stackTrigger).not.toHaveClass("stack-field");
		expect(stackTrigger).not.toHaveAttribute("data-section");
	});

	test("id is the trigger's; without one, each Select's trigger gets an id of its own", () => {
		render(
			<>
				<StackSelect id="stack-select" />
				<Select label="Employer" options={employers} />
				<Select label="Topics" options={topics} />
			</>,
		);
		expect(trigger("Primary stack").id).toBe("stack-select");
		const employer = trigger("Employer").id;
		const topic = trigger("Topics").id;
		expect(employer).not.toBe("");
		expect(topic).not.toBe("");
		expect(employer).not.toBe(topic);
	});

	test("without a label, aria-label names the trigger, and so does aria-labelledby", () => {
		render(
			<>
				<h3 id="sort-title">Sort the projects</h3>
				<Select aria-label="Sort" options={["Most recent", "Biggest impact"]} />
				<Select
					aria-labelledby="sort-title"
					options={["Most recent", "Biggest impact"]}
				/>
			</>,
		);
		expect(trigger("Sort")).toHaveAttribute("aria-haspopup", "listbox");
		expect(trigger("Sort the projects")).toHaveAttribute(
			"aria-haspopup",
			"listbox",
		);
	});

	test("helperText sits under the pill in color-muted and describes the trigger, and aria-describedby joins it", () => {
		render(
			<>
				<p id="stack-note">Shown on the proposal.</p>
				<StackSelect
					helperText="The one you use most."
					aria-describedby="stack-note"
				/>
			</>,
		);
		const stackTrigger = trigger("Primary stack");
		const helper = screen.getByText("The one you use most.");
		expect(stackTrigger).toHaveAccessibleDescription(/The one you use most\./v);
		expect(stackTrigger).toHaveAccessibleDescription(
			/Shown on the proposal\./v,
		);
		expect(box(helper).top).toBeGreaterThanOrEqual(box(stackTrigger).bottom);
		expect(getComputedStyle(helper).color).toBe(resolved("--color-muted"));
		expect(stackTrigger).not.toHaveAttribute("aria-invalid", "true");
	});

	test("error marks the trigger aria-invalid with a danger edge, and turns the helper danger with the error icon before its words", () => {
		const markup = glyph("error");
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Select
				ref={ref}
				error
				label="Notice period"
				placeholder="Choose one"
				helperText="Pick one so I can plan the start."
				options={["Two weeks", "One month", "Two months"]}
			/>,
		);
		const notice = trigger("Notice period");
		const helper = screen.getByText("Pick one so I can plan the start.");
		expect(notice).toHaveAttribute("aria-invalid", "true");
		expect(notice).toHaveAccessibleDescription(
			"Pick one so I can plan the start.",
		);
		expect(getComputedStyle(notice).borderTopColor).toBe(resolved("--danger"));
		expect(getComputedStyle(helper).color).toBe(resolved("--danger"));
		const line = box(helper);
		const icons = glyphsIn(must(ref.current), markup).filter((svg) => {
			const icon = box(svg);
			const half = icon.height / 2;
			const middle = icon.top + half;
			return (
				icon.right <= line.left + 0.5 &&
				middle >= line.top &&
				middle <= line.bottom
			);
		});
		expect(icons).toHaveLength(1);
	});

	test("required puts an asterisk after the label's words, outside the name, and marks the trigger aria-required", () => {
		render(
			<Select
				required
				label="Slot"
				placeholder="Choose a slot"
				options={slots}
			/>,
		);
		const slot = trigger("Slot");
		const label = labelElement(slot);
		expect(label.textContent).toMatch(/^Slot\s*\*$/v);
		expect(within(label).getByText("*")).toBeVisible();
		expect(slot).toHaveAttribute("aria-required", "true");
	});

	test("disabled dims the field to 50% and takes the trigger out of the tab order, and neither a press nor a key opens it", async () => {
		const ref = React.createRef<HTMLDivElement>();
		const onOpen = vi.fn<OnOpen>();
		render(
			<Around>
				<Select
					ref={ref}
					disabled
					label="Country"
					defaultValue="co"
					options={[{ value: "co", label: "Colombia" }]}
					onOpen={onOpen}
				/>
			</Around>,
		);
		const country = trigger("Country");
		expect(isDisabled(country)).toBe(true);
		expect(getComputedStyle(must(ref.current)).opacity).toBe("0.5");
		focusBefore();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.click(country, { force: true });
		country.focus();
		await userEvent.keyboard("{ArrowDown}{Enter}");
		await frames();
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(country).toHaveAttribute("aria-expanded", "false");
		expect(onOpen).not.toHaveBeenCalled();
		expect(shown(country)).toEqual(["Colombia"]);
	});

	test("readOnly: the trigger takes focus and says aria-readonly, but neither a press nor a key opens it", async () => {
		const onOpen = vi.fn<OnOpen>();
		render(
			<Around>
				<StackSelect readOnly defaultValue="Rust" onOpen={onOpen} />
			</Around>,
		);
		const stackTrigger = trigger("Primary stack");
		expect(stackTrigger).toHaveAttribute("aria-readonly", "true");
		focusBefore();
		await userEvent.tab();
		await expect.element(stackTrigger).toHaveFocus();
		await userEvent.keyboard("{ArrowDown}");
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		await userEvent.keyboard("t");
		await userEvent.click(stackTrigger);
		await frames();
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(stackTrigger).toHaveAttribute("aria-expanded", "false");
		expect(onOpen).not.toHaveBeenCalled();
		expect(shown(stackTrigger)).toEqual(["Rust"]);
	});

	test.each(sizes)(
		"size $name: the trigger is a $height px pill",
		({ size, height }) => {
			render(<StackSelect size={size} defaultValue="Rust" />);
			const stackTrigger = trigger("Primary stack");
			expect(Math.round(box(stackTrigger).height)).toBe(height);
			expect(getComputedStyle(stackTrigger).borderTopLeftRadius).toBe(
				resolved("--radius-pill", "border-top-left-radius"),
			);
		},
	);

	test("variant: outlined by default, the glass-control fill in a dg-edge border; filled, the glass-inset well", () => {
		render(
			<>
				<StackSelect />
				<Select label="Outlined" variant="outlined" options={stack} />
				<Select label="Filled" variant="filled" options={stack} />
			</>,
		);
		for (const name of ["Primary stack", "Outlined"]) {
			const style = getComputedStyle(trigger(name));
			expect(style.backgroundColor, name).toBe(resolved("--glass-control"));
			expect(style.borderTopColor, name).toBe(resolved("--dg-edge"));
		}

		expect(getComputedStyle(trigger("Filled")).backgroundColor).toBe(
			resolved("--glass-inset"),
		);
	});

	test("fullWidth stretches the field and its trigger to the container's width; without it the field keeps its own width", () => {
		const fitted = React.createRef<HTMLDivElement>();
		const full = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 380 }}>
				<Select ref={fitted} label="Fitted" options={employers} />
				<Select ref={full} fullWidth label="Full" options={employers} />
			</div>,
		);
		const fullRoot = must(full.current);
		const fullTrigger = trigger("Full");
		const fittedRoot = must(fitted.current);
		expect(Math.round(box(fullRoot).width)).toBe(380);
		expect(Math.round(box(fullTrigger).width)).toBe(380);
		expect(box(fittedRoot).width).toBeLessThan(380);
	});

	test("the trigger is as wide as its longest option, so choosing another doesn't change its width", async () => {
		render(
			<div style={{ display: "grid", justifyItems: "start", gap: 24 }}>
				<Select
					label="Topic"
					options={["AWS", "PostgreSQL performance"]}
					defaultValue="AWS"
				/>
				<Select label="Cloud" options={["AWS"]} defaultValue="AWS" />
			</div>,
		);
		const topic = trigger("Topic");
		const { width } = box(topic);
		expect(width).toBeGreaterThan(box(trigger("Cloud")).width + 60);
		await openByPress(topic);
		await userEvent.click(row("PostgreSQL performance"));
		await expectClosed(topic);
		expect(shown(topic)).toEqual(["PostgreSQL performance"]);
		expect(box(topic).width).toBeCloseTo(width, 0);
		const [value] = shownPieces(topic);
		expect(value.element.scrollWidth).toBeLessThanOrEqual(
			value.element.clientWidth,
		);
	});

	test.each([
		["an Icon", <Icon key="sort" name="sort" />],
		[
			"an InputAdornment",
			<InputAdornment key="sort" position="start">
				<Icon name="sort" />
			</InputAdornment>,
		],
	])(
		"startAdornment takes %s, inside the pill before the value",
		(_kind, adornment) => {
			render(
				<Select
					label="Sort"
					startAdornment={adornment}
					defaultValue="impact"
					options={[
						{ value: "recent", label: "Most recent" },
						{ value: "impact", label: "Biggest impact" },
					]}
				/>,
			);
			const sort = trigger("Sort");
			const [value] = shownPieces(sort);
			expect(value.text).toBe("Biggest impact");
			const before = [...sort.querySelectorAll("svg")].filter(
				(svg) =>
					isShown(svg) && box(svg).right <= box(value.element).left + 0.5,
			);
			expect(before).toHaveLength(1);
		},
	);

	test("placeholder shows in color-muted while nothing is chosen, with null or '' as the value too, and the label stays the name", () => {
		const view = render(
			<Select
				label="Employer"
				placeholder="Choose an employer"
				options={employers}
				value={null}
			/>,
		);
		const employer = trigger("Employer");
		expect(shown(employer)).toEqual(["Choose an employer"]);
		expect(getComputedStyle(shownPieces(employer)[0].element).color).toBe(
			resolved("--color-muted"),
		);
		view.rerender(
			<Select
				label="Employer"
				placeholder="Choose an employer"
				options={employers}
				value=""
			/>,
		);
		expect(shown(employer)).toEqual(["Choose an employer"]);
		view.rerender(
			<Select
				label="Employer"
				placeholder="Choose an employer"
				options={employers}
				value="EPAM"
			/>,
		);
		expect(shown(employer)).toEqual(["EPAM"]);
		expect(employer).toHaveAccessibleName("Employer");
		expect(labelElement(employer)).toBeVisible();
	});

	test("renderValue draws the trigger's content from the current value, the array with multiple; with nothing chosen the placeholder shows", () => {
		const renderStack = vi.fn((value: string) => `Stack: ${value}`);
		render(
			<>
				<StackSelect defaultValue="Rust" renderValue={renderStack} />
				<Select
					multiple
					label="Topics"
					options={topics}
					defaultValue={["Team practices", "Hiring process"]}
					renderValue={(value: string[]) => `${value.length} topics`}
				/>
				<Select
					label="Employer"
					placeholder="Choose an employer"
					options={employers}
					renderValue={(value: string) => `At ${value}`}
				/>
			</>,
		);
		expect(shown(trigger("Primary stack"))).toEqual(["Stack: Rust"]);
		expect(renderStack).toHaveBeenCalledWith("Rust");
		expect(shown(trigger("Topics"))).toEqual(["2 topics"]);
		expect(shown(trigger("Employer"))).toEqual(["Choose an employer"]);
	});
});

describe("Select: with the pointer", () => {
	test("a press on the trigger opens the list of rows: aria-expanded, aria-controls naming the listbox, and onOpen with the press", async () => {
		const onOpen = vi.fn<OnOpen>();
		render(<StackSelect onOpen={onOpen} />);
		const stackTrigger = trigger("Primary stack");
		const list = await openByPress(stackTrigger);
		expect(stackTrigger).toHaveAttribute("aria-expanded", "true");
		expect(list.id).not.toBe("");
		expect(stackTrigger).toHaveAttribute("aria-controls", list.id);
		expect(rows().map((option) => labelOf(option))).toEqual(stack);
		expect(onOpen).toHaveBeenCalledTimes(1);
		expectSynthetic(onOpen.mock.calls[0]?.[0], MouseEvent);
	});

	test("the list is named by the label too", async () => {
		render(<StackSelect />);
		await openByPress(trigger("Primary stack"));
		expect(listbox()).toHaveAccessibleName("Primary stack");
	});

	test("the list opens on Popover's radius-well surface below the trigger: 8px away, left edges lined up, at least as wide as the trigger", async () => {
		render(
			<div style={{ padding: "24px 48px" }}>
				<StackSelect defaultValue="Rust" />
			</div>,
		);
		const stackTrigger = trigger("Primary stack");
		const list = await openByPress(stackTrigger);
		const misplacement = () => {
			const anchor = box(stackTrigger);
			const surface = box(bordered(list));
			const problems: string[] = [];
			const expectedTop = anchor.bottom + 8;
			if (Math.abs(surface.top - expectedTop) > 1.5) {
				problems.push(
					`top at ${surface.top}, trigger's bottom at ${anchor.bottom}`,
				);
			}

			if (Math.abs(surface.left - anchor.left) > 1.5) {
				problems.push(`left at ${surface.left}, trigger's at ${anchor.left}`);
			}

			if (surface.width < anchor.width - 0.5) {
				problems.push(`${surface.width} wide, trigger ${anchor.width}`);
			}

			return problems;
		};

		await expect.poll(misplacement).toEqual([]);
		expect(getComputedStyle(bordered(list)).borderTopLeftRadius).toBe(
			resolved("--radius-well", "border-top-left-radius"),
		);
	});

	test("a press on a row chooses it: onChange gets a React event and the value, onClose gets select, and the list closes with focus back on the trigger, which shows the row", async () => {
		const onChange = vi.fn<OnChange>();
		const onClose = vi.fn<OnClose>();
		render(
			<StackSelect
				defaultValue="TypeScript"
				onChange={onChange}
				onClose={onClose}
			/>,
		);
		const stackTrigger = trigger("Primary stack");
		await openByPress(stackTrigger);
		await userEvent.click(row("Rust"));
		await expectClosed(stackTrigger);
		expect(changes(onChange)).toEqual(["Rust"]);
		expectSynthetic(onChange.mock.calls[0]?.[0], MouseEvent);
		const [event, reason] = onlyClose(onClose);
		expect(reason).toBe("select");
		expect(nativeOf(event)).toBeInstanceOf(MouseEvent);
		await expect.element(stackTrigger).toHaveFocus();
		expect(shown(stackTrigger)).toEqual(["Rust"]);
	});

	test("a press on the chosen row closes the list without calling onChange", async () => {
		const onChange = vi.fn<OnChange>();
		const onClose = vi.fn<OnClose>();
		render(
			<StackSelect defaultValue="AWS" onChange={onChange} onClose={onClose} />,
		);
		const stackTrigger = trigger("Primary stack");
		await openByPress(stackTrigger);
		await userEvent.click(row("AWS"));
		await expectClosed(stackTrigger);
		expect(onChange).not.toHaveBeenCalled();
		expect(onlyClose(onClose)[1]).toBe("select");
	});

	test("a press outside closes it: onClose gets the press and backdropClick, the page under it doesn't, and focus is back on the trigger", async () => {
		const onClose = vi.fn<OnClose>();
		const onAfter = vi.fn<() => void>();
		render(
			<>
				<StackSelect onClose={onClose} />
				<button type="button" onClick={onAfter}>
					After
				</button>
			</>,
		);
		const stackTrigger = trigger("Primary stack");
		const after = button("After");
		await openByPress(stackTrigger);
		await userEvent.click(after, { force: true });
		await expectClosed(stackTrigger);
		const [event, reason] = onlyClose(onClose);
		expect(reason).toBe("backdropClick");
		expect(nativeOf(event)).toBeInstanceOf(MouseEvent);
		expect(onAfter).not.toHaveBeenCalled();
		await expect.element(stackTrigger).toHaveFocus();
	});

	test("a press on the trigger while the list is open closes it, as a press outside does", async () => {
		const onClose = vi.fn<OnClose>();
		render(<StackSelect onClose={onClose} />);
		const stackTrigger = trigger("Primary stack");
		await openByPress(stackTrigger);
		await userEvent.click(stackTrigger, { force: true });
		await expectClosed(stackTrigger);
		expect(onlyClose(onClose)[1]).toBe("backdropClick");
	});

	test("the chosen row is raised (glass-raised, shadow-raised) with a check and aria-selected; the others aren't", async () => {
		const check = glyph("check");
		render(<StackSelect defaultValue="AWS" />);
		await openByPress(trigger("Primary stack"));
		const aws = row("AWS");
		expect(aws).toHaveAttribute("aria-selected", "true");
		expect(glyphsIn(aws, check)).toHaveLength(1);
		const style = getComputedStyle(aws);
		expect(style.backgroundColor).toBe(resolved("--glass-raised"));
		expect(style.boxShadow).toBe(resolved("--shadow-raised", "box-shadow"));
		for (const option of rows()) {
			if (option === aws) {
				continue;
			}

			expect(option, labelOf(option)).toHaveAttribute("aria-selected", "false");
			expect(glyphsIn(option, check), labelOf(option)).toHaveLength(0);
		}
	});
});

describe("Select: keys on the trigger", () => {
	test("the trigger is one tab stop: Tab moves from Before to it and on to After, and Shift+Tab back", async () => {
		render(
			<Around>
				<StackSelect defaultValue="AWS" />
			</Around>,
		);
		const stackTrigger = trigger("Primary stack");
		focusBefore();
		await userEvent.tab();
		await expect.element(stackTrigger).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(stackTrigger).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	test.each(openKeys)(
		"%s opens the list on the chosen row, and onOpen gets the key's event",
		async (_name, key) => {
			const onOpen = vi.fn<OnOpen>();
			render(
				<Around>
					<StackSelect defaultValue="PostgreSQL" onOpen={onOpen} />
				</Around>,
			);
			const stackTrigger = trigger("Primary stack");
			focusBefore();
			await userEvent.tab();
			await userEvent.keyboard(key);
			await expectActive("PostgreSQL");
			expect(stackTrigger).toHaveAttribute("aria-expanded", "true");
			expect(onOpen).toHaveBeenCalledTimes(1);
			expectSynthetic(onOpen.mock.calls[0]?.[0]);
		},
	);

	test.each(openKeys)(
		"with nothing chosen, %s opens the list on the first enabled row",
		async (_name, key) => {
			render(
				<Around>
					<Select label="Slot" options={slots} />
				</Around>,
			);
			focusBefore();
			await userEvent.tab();
			await userEvent.keyboard(key);
			await expectActive("Wednesday, 10:00");
		},
	);

	test("Home opens the list on the first enabled row, and End on the last", async () => {
		render(
			<Around>
				<Select label="Slot" options={slots} defaultValue="thu930" />
			</Around>,
		);
		const slot = trigger("Slot");
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("{Home}");
		await expectActive("Wednesday, 10:00");
		await userEvent.keyboard("{Escape}");
		await expectClosed(slot);
		await expect.element(slot).toHaveFocus();
		await userEvent.keyboard("{End}");
		await expectActive("Friday, 11:00");
	});

	test("typing a letter opens the list on the first row that starts with it, choosing nothing yet", async () => {
		const onOpen = vi.fn<OnOpen>();
		const onChange = vi.fn<OnChange>();
		render(
			<Around>
				<Select
					label="Employer"
					placeholder="Choose an employer"
					options={employers}
					onOpen={onOpen}
					onChange={onChange}
				/>
			</Around>,
		);
		const employer = trigger("Employer");
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("g");
		await expectActive("Globant");
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(onChange).not.toHaveBeenCalled();
		expect(shown(employer)).toEqual(["Choose an employer"]);
		await userEvent.keyboard("{Escape}");
		await expectClosed(employer);
		await expect.element(employer).toHaveFocus();
		await userEvent.keyboard("p");
		await expectActive("PayPal");
	});
});

describe("Select: keys in the list", () => {
	async function openWithDown(label: string): Promise<void> {
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("{ArrowDown}");
		await expectActive(label);
	}

	test("Down and Up move a row at a time, skipping disabled rows, and stop at the first and last", async () => {
		render(
			<Around>
				<Select label="Slot" options={slots} />
			</Around>,
		);
		await openWithDown("Wednesday, 10:00");
		await walk([
			["{ArrowDown}", "Thursday, 09:30"],
			["{ArrowDown}", "Friday, 11:00"],
			["{ArrowDown}", "Friday, 11:00"],
			["{ArrowUp}", "Thursday, 09:30"],
			["{ArrowUp}", "Wednesday, 10:00"],
			["{ArrowUp}", "Wednesday, 10:00"],
			["{ArrowDown}", "Thursday, 09:30"],
		]);
	});

	test("Home and End jump to the first and last enabled rows", async () => {
		render(
			<Around>
				<Select label="Slot" options={slots} defaultValue="thu930" />
			</Around>,
		);
		await openWithDown("Thursday, 09:30");
		await walk([
			["{End}", "Friday, 11:00"],
			["{Home}", "Wednesday, 10:00"],
			["{End}", "Friday, 11:00"],
		]);
	});

	test("Page Down and Page Up move ten rows, stop at the first and last, and bring the row into view", async () => {
		render(
			<Around>
				<Select label="Start time" options={hours} />
			</Around>,
		);
		await openWithDown("00:00");
		await expect.poll(() => isSettled(bordered(listbox()))).toBe(true);
		for (const [key, label] of [
			["{PageDown}", "10:00"],
			["{PageDown}", "20:00"],
			["{PageDown}", "23:00"],
			["{PageUp}", "13:00"],
			["{PageUp}", "03:00"],
			["{PageUp}", "00:00"],
		] as const) {
			// eslint-disable-next-line no-await-in-loop -- each key starts where the last one left off
			await userEvent.keyboard(key);
			// eslint-disable-next-line no-await-in-loop
			await expectActive(label);
			// eslint-disable-next-line no-await-in-loop
			await expect
				.poll(() => isInView(row(label)), { message: `${label} in view` })
				.toBe(true);
		}
	});

	test("Page Down and Page Up land on the nearest enabled row when the tenth is disabled", async () => {
		const breaks = new Set(["10:00", "23:00", "01:00"]);
		render(
			<Around>
				<Select
					label="Start time"
					options={hours.map((hour) => ({
						value: hour,
						disabled: breaks.has(hour),
					}))}
				/>
			</Around>,
		);
		await openWithDown("00:00");
		await walk([
			["{PageDown}", "11:00"],
			["{PageDown}", "21:00"],
			["{PageDown}", "22:00"],
			["{PageUp}", "12:00"],
			["{PageUp}", "02:00"],
		]);
	});

	test("typing a letter moves to the next row that starts with it, and repeating the letter cycles through them", async () => {
		render(
			<Around>
				<StackSelect />
			</Around>,
		);
		await openWithDown("Node.js");
		await walk([
			["t", "TypeScript"],
			["t", "Terraform"],
			["t", "TypeScript"],
			["c", "Cloudflare"],
		]);
	});

	test("typing quickly matches more than the first letter", async () => {
		render(
			<Around>
				<StackSelect />
			</Around>,
		);
		await openWithDown("Node.js");
		await walk([["ru", "Rust"]]);
	});

	test("typing skips disabled rows", async () => {
		render(
			<Around>
				<Select label="Slot" options={slots} defaultValue="thu930" />
			</Around>,
		);
		await openWithDown("Thursday, 09:30");
		await walk([
			["w", "Wednesday, 10:00"],
			["m", "Wednesday, 10:00"],
			["{ArrowDown}", "Thursday, 09:30"],
		]);
	});

	test.each(chooseKeys)(
		"%s chooses the active row: onChange gets a React event and the value, onClose gets select, and focus is back on the trigger, which shows the row",
		async (_name, key) => {
			const onChange = vi.fn<OnChange>();
			const onClose = vi.fn<OnClose>();
			render(
				<Around>
					<StackSelect onChange={onChange} onClose={onClose} />
				</Around>,
			);
			const stackTrigger = trigger("Primary stack");
			await openWithDown("Node.js");
			await walk([["{ArrowDown}", "TypeScript"]]);
			await userEvent.keyboard(key);
			await expectClosed(stackTrigger);
			expect(changes(onChange)).toEqual(["TypeScript"]);
			expectSynthetic(onChange.mock.calls[0]?.[0]);
			expect(onlyClose(onClose)[1]).toBe("select");
			await expect.element(stackTrigger).toHaveFocus();
			expect(shown(stackTrigger)).toEqual(["TypeScript"]);
		},
	);

	test("Alt+Up chooses the active row and closes the list", async () => {
		const onChange = vi.fn<OnChange>();
		const onClose = vi.fn<OnClose>();
		render(
			<Around>
				<StackSelect defaultValue="AWS" onChange={onChange} onClose={onClose} />
			</Around>,
		);
		const stackTrigger = trigger("Primary stack");
		await openWithDown("AWS");
		await walk([["{ArrowDown}", "PostgreSQL"]]);
		await userEvent.keyboard("{Alt>}{ArrowUp}{/Alt}");
		await expectClosed(stackTrigger);
		expect(changes(onChange)).toEqual(["PostgreSQL"]);
		expect(onlyClose(onClose)[1]).toBe("select");
		await expect.element(stackTrigger).toHaveFocus();
	});

	test("Escape closes the list and keeps the value: onClose gets the Escape keydown and escapeKeyDown, and focus is back on the trigger", async () => {
		const onChange = vi.fn<OnChange>();
		const onClose = vi.fn<OnClose>();
		render(
			<Around>
				<StackSelect defaultValue="AWS" onChange={onChange} onClose={onClose} />
			</Around>,
		);
		const stackTrigger = trigger("Primary stack");
		await openWithDown("AWS");
		await walk([["{ArrowDown}", "PostgreSQL"]]);
		await userEvent.keyboard("{Escape}");
		await expectClosed(stackTrigger);
		const [event, reason] = onlyClose(onClose);
		expect(reason).toBe("escapeKeyDown");
		const native = nativeOf(event);
		expect(native).toBeInstanceOf(KeyboardEvent);
		expect((native as KeyboardEvent).key).toBe("Escape");
		expect(onChange).not.toHaveBeenCalled();
		await expect.element(stackTrigger).toHaveFocus();
		expect(shown(stackTrigger)).toEqual(["AWS"]);
	});

	test("Tab closes the list and keeps the value: onClose gets the Tab keydown and tabKeyDown, focus is back on the trigger, and the next Tab leaves", async () => {
		const onChange = vi.fn<OnChange>();
		const onClose = vi.fn<OnClose>();
		render(
			<Around>
				<StackSelect defaultValue="AWS" onChange={onChange} onClose={onClose} />
			</Around>,
		);
		const stackTrigger = trigger("Primary stack");
		const after = button("After");
		await openWithDown("AWS");
		await walk([["{ArrowDown}", "PostgreSQL"]]);
		await userEvent.tab();
		await expectClosed(stackTrigger);
		const [event, reason] = onlyClose(onClose);
		expect(reason).toBe("tabKeyDown");
		const native = nativeOf(event);
		expect(native).toBeInstanceOf(KeyboardEvent);
		expect((native as KeyboardEvent).key).toBe("Tab");
		expect(onChange).not.toHaveBeenCalled();
		await expect.element(stackTrigger).toHaveFocus();
		expect(shown(stackTrigger)).toEqual(["AWS"]);
		await userEvent.tab();
		await expect.element(after).toHaveFocus();
	});
});

describe("Select: value and open", () => {
	test("defaultValue picks the starting row, choices move it, and a later defaultValue changes nothing (uncontrolled)", async () => {
		const view = render(<StackSelect defaultValue="Rust" />);
		const stackTrigger = trigger("Primary stack");
		expect(shown(stackTrigger)).toEqual(["Rust"]);
		await openByPress(stackTrigger);
		expect(row("Rust")).toHaveAttribute("aria-selected", "true");
		await userEvent.click(row("Terraform"));
		await expectClosed(stackTrigger);
		expect(shown(stackTrigger)).toEqual(["Terraform"]);
		view.rerender(<StackSelect defaultValue="AWS" />);
		expect(shown(stackTrigger)).toEqual(["Terraform"]);
	});

	test("value controls the choice: a choice calls onChange, and only a new value moves it", async () => {
		const onChange = vi.fn<OnChange>();
		const view = render(<StackSelect value="AWS" onChange={onChange} />);
		const stackTrigger = trigger("Primary stack");
		await openByPress(stackTrigger);
		await userEvent.click(row("Rust"));
		await expectClosed(stackTrigger);
		expect(changes(onChange)).toEqual(["Rust"]);
		expect(shown(stackTrigger)).toEqual(["AWS"]);
		view.rerender(<StackSelect value="Rust" onChange={onChange} />);
		expect(shown(stackTrigger)).toEqual(["Rust"]);
		await openByPress(stackTrigger);
		expect(row("Rust")).toHaveAttribute("aria-selected", "true");
		expect(row("AWS")).toHaveAttribute("aria-selected", "false");
	});

	test("a number value stays a number: it picks its row, and onChange gets the number", async () => {
		const onChange = vi.fn<OnChange>();
		const minutes = [
			{ value: 15, label: "15 minutes" },
			{ value: 30, label: "30 minutes" },
			{ value: 45, label: "45 minutes" },
		];
		render(
			<Select
				label="Length"
				options={minutes}
				defaultValue={30}
				onChange={onChange}
			/>,
		);
		const length = trigger("Length");
		expect(shown(length)).toEqual(["30 minutes"]);
		await openByPress(length);
		expect(row("30 minutes")).toHaveAttribute("aria-selected", "true");
		await userEvent.click(row("45 minutes"));
		await expectClosed(length);
		expect(changes(onChange)).toEqual([45]);
	});

	test("open controls the list: it shows while open is true, onClose only asks, and while it's false a press asks onOpen without opening it", async () => {
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		const onChange = vi.fn<OnChange>();
		const view = render(
			<StackSelect
				open
				onOpen={onOpen}
				onClose={onClose}
				onChange={onChange}
			/>,
		);
		const stackTrigger = trigger("Primary stack");
		await screen.findByRole("listbox");
		expect(stackTrigger).toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => onClose.mock.calls.length).toBe(1);
		await userEvent.click(row("Rust"));
		expect(changes(onChange)).toEqual(["Rust"]);
		expect(onClose.mock.calls.map(([, reason]) => reason)).toEqual([
			"escapeKeyDown",
			"select",
		]);
		await frames();
		expect(listbox()).toBeVisible();
		view.rerender(
			<StackSelect
				open={false}
				onOpen={onOpen}
				onClose={onClose}
				onChange={onChange}
			/>,
		);
		await expectClosed(stackTrigger);
		await userEvent.click(stackTrigger);
		await expect.poll(() => onOpen.mock.calls.length).toBe(1);
		await frames();
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(stackTrigger).toHaveAttribute("aria-expanded", "false");
	});

	test("defaultOpen starts it open without moving focus, and a press on a row still chooses", async () => {
		const onChange = vi.fn<OnChange>();
		function Page({ hasSelect }: { readonly hasSelect: boolean }) {
			return (
				<Around>
					{hasSelect ? (
						<StackSelect
							defaultOpen
							defaultValue="TypeScript"
							PopoverProps={{ disablePortal: true }}
							onChange={onChange}
						/>
					) : null}
				</Around>
			);
		}

		const view = render(<Page hasSelect={false} />);
		const before = button("Before");
		before.focus();
		view.rerender(<Page hasSelect />);
		const stackTrigger = trigger("Primary stack");
		await screen.findByRole("listbox");
		expect(stackTrigger).toHaveAttribute("aria-expanded", "true");
		expect(row("TypeScript")).toHaveAttribute("aria-selected", "true");
		await frames();
		expect(before).toHaveFocus();
		await userEvent.click(row("Rust"));
		await expectClosed(stackTrigger);
		expect(changes(onChange)).toEqual(["Rust"]);
		expect(shown(stackTrigger)).toEqual(["Rust"]);
	});
});

describe("Select: multiple", () => {
	test("multiple shows the chosen rows as chips in the trigger, and the list is multiselectable with each chosen row selected", async () => {
		render(
			<Select
				multiple
				label="Stack"
				options={stack}
				defaultValue={["Node.js", "TypeScript"]}
			/>,
		);
		const stackTrigger = trigger("Stack");
		expect(shown(stackTrigger)).toEqual(["Node.js", "TypeScript"]);
		const chips = shownPieces(stackTrigger).map((piece) => piece.element);
		expect(chips[0]).not.toBe(chips[1]);
		const list = await openByPress(stackTrigger);
		expect(list).toHaveAttribute("aria-multiselectable", "true");
		expect(
			rows()
				.filter((option) => option.getAttribute("aria-selected") === "true")
				.map((option) => labelOf(option)),
		).toEqual(["Node.js", "TypeScript"]);
	});

	test("a press toggles its row, onChange gets the new array each time, and the list stays open", async () => {
		const onChange = vi.fn<OnChange>();
		const onClose = vi.fn<OnClose>();
		render(
			<Select
				multiple
				label="Stack"
				options={stack}
				defaultValue={["Node.js", "TypeScript"]}
				onChange={onChange}
				onClose={onClose}
			/>,
		);
		const stackTrigger = trigger("Stack");
		await openByPress(stackTrigger);
		await userEvent.click(row("AWS"));
		await expect.element(row("AWS")).toHaveAttribute("aria-selected", "true");
		await userEvent.click(row("Node.js"));
		await expect
			.element(row("Node.js"))
			.toHaveAttribute("aria-selected", "false");
		expect(changes(onChange)).toEqual([
			["Node.js", "TypeScript", "AWS"],
			["TypeScript", "AWS"],
		]);
		expectSynthetic(onChange.mock.calls[0]?.[0], MouseEvent);
		await frames();
		expect(listbox()).toBeVisible();
		expect(stackTrigger).toHaveAttribute("aria-expanded", "true");
		expect(onClose).not.toHaveBeenCalled();
		expect(shown(stackTrigger)).toEqual(["TypeScript", "AWS"]);
	});

	test.each(chooseKeys)(
		"%s toggles the active row, and the list stays open",
		async (_name, key) => {
			const onChange = vi.fn<OnChange>();
			render(
				<Around>
					<Select
						multiple
						label="Stack"
						options={stack}
						defaultValue={["TypeScript"]}
						onChange={onChange}
					/>
				</Around>,
			);
			const stackTrigger = trigger("Stack");
			focusBefore();
			await userEvent.tab();
			await userEvent.keyboard("{ArrowDown}");
			await expectActive("TypeScript");
			await userEvent.keyboard(key);
			await expect
				.element(row("TypeScript"))
				.toHaveAttribute("aria-selected", "false");
			await walk([["{ArrowDown}", "AWS"]]);
			await userEvent.keyboard(key);
			await expect.element(row("AWS")).toHaveAttribute("aria-selected", "true");
			expect(changes(onChange)).toEqual([[], ["AWS"]]);
			expect(stackTrigger).toHaveAttribute("aria-expanded", "true");
			await expectActive("AWS");
		},
	);

	test("the value keeps the rows' order, whatever order they're picked in", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Select multiple label="Stack" options={stack} onChange={onChange} />,
		);
		const stackTrigger = trigger("Stack");
		await openByPress(stackTrigger);
		await userEvent.click(row("Rust"));
		await userEvent.click(row("AWS"));
		await expect.poll(() => changes(onChange).at(-1)).toEqual(["AWS", "Rust"]);
		expect(shown(stackTrigger)).toEqual(["AWS", "Rust"]);
	});

	test("chips that don't fit wrap onto more lines, and the pill becomes a 23px-corner box", () => {
		render(
			<div style={{ width: 260 }}>
				<Select
					multiple
					fullWidth
					label="Stack"
					options={stack}
					defaultValue={[
						"Node.js",
						"TypeScript",
						"AWS",
						"PostgreSQL",
						"Terraform",
					]}
				/>
			</div>,
		);
		const stackTrigger = trigger("Stack");
		const tops = new Set(
			shownPieces(stackTrigger).map((piece) =>
				Math.round(box(piece.element).top),
			),
		);
		expect(tops.size).toBeGreaterThan(1);
		expect(box(stackTrigger).height).toBeGreaterThan(46);
		expect(getComputedStyle(stackTrigger).borderTopLeftRadius).toBe("23px");
	});

	test("with nothing chosen it shows the placeholder", () => {
		render(
			<Select
				multiple
				label="Topics"
				placeholder="What should we cover?"
				options={topics}
			/>,
		);
		expect(shown(trigger("Topics"))).toEqual(["What should we cover?"]);
	});
});

const rowForms = [
	["an options array", "options"],
	["<Option> children", "children"],
] as const;

function rowsAs(
	form: (typeof rowForms)[number][1],
	entries: readonly SelectOption[],
): Pick<SelectProps, "options" | "children"> {
	if (form === "options") {
		return { options: entries };
	}

	return {
		children: entries.map(({ value, label, ...rest }) => (
			<Option key={String(value)} value={value} {...rest}>
				{label}
			</Option>
		)),
	};
}

describe.each(rowForms)("Select: rows as %s", (_name, form) => {
	test("each row shows its label, or its value without one, and the trigger shows the chosen row's", async () => {
		render(
			<Select
				label="Employer"
				defaultValue="epam"
				{...rowsAs(form, [
					{ value: "epam", label: "EPAM" },
					{ value: "Globant" },
					{ value: 42 },
				])}
			/>,
		);
		const employer = trigger("Employer");
		expect(shown(employer)).toEqual(["EPAM"]);
		await openByPress(employer);
		expect(rows().map((option) => labelOf(option))).toEqual([
			"EPAM",
			"Globant",
			"42",
		]);
		await userEvent.click(row("Globant"));
		await expectClosed(employer);
		expect(shown(employer)).toEqual(["Globant"]);
	});

	test("secondary is a second line under the label, in color-muted", async () => {
		render(<Select label="Slot" {...rowsAs(form, slots)} />);
		await openByPress(trigger("Slot"));
		const wednesday = row("Wednesday, 10:00");
		const label = within(wednesday).getByText("Wednesday, 10:00");
		const secondary = within(wednesday).getByText("45 minutes free");
		expect(box(secondary).top).toBeGreaterThanOrEqual(box(label).bottom - 0.5);
		expect(getComputedStyle(secondary).color).toBe(resolved("--color-muted"));
	});

	test("icon leads the row, before its label, in color-muted", async () => {
		render(
			<Select
				label="Slot"
				{...rowsAs(form, [
					{
						value: "wed10",
						label: "Wednesday, 10:00",
						icon: <Icon name="calendar" />,
					},
					{ value: "thu930", label: "Thursday, 09:30" },
				])}
			/>,
		);
		await openByPress(trigger("Slot"));
		const wednesday = row("Wednesday, 10:00");
		const icon = must(wednesday.querySelector("svg"));
		const label = within(wednesday).getByText("Wednesday, 10:00");
		expect(box(icon).right).toBeLessThanOrEqual(box(label).left);
		expect(getComputedStyle(icon).color).toBe(resolved("--color-muted"));
	});

	referenceDefectTest("icon shows at 16px", async () => {
		render(
			<Select
				label="Slot"
				{...rowsAs(form, [
					{
						value: "wed10",
						label: "Wednesday, 10:00",
						icon: <Icon name="calendar" />,
					},
					{ value: "thu930", label: "Thursday, 09:30" },
				])}
			/>,
		);
		const list = await openByPress(trigger("Slot"));
		await expect.poll(() => isSettled(bordered(list))).toBe(true);
		const icon = must(row("Wednesday, 10:00").querySelector("svg"));
		expect(Math.round(box(icon).width)).toBe(16);
		expect(Math.round(box(icon).height)).toBe(16);
	});

	test("disabled marks the row aria-disabled, and a press on it chooses nothing and leaves the list open", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Select label="Slot" onChange={onChange} {...rowsAs(form, slots)} />,
		);
		const slot = trigger("Slot");
		await openByPress(slot);
		const booked = row("Wednesday, 15:00");
		expect(booked).toHaveAttribute("aria-disabled", "true");
		expect(within(booked).getByText("Booked")).toBeVisible();
		expect(row("Wednesday, 10:00")).not.toHaveAttribute(
			"aria-disabled",
			"true",
		);
		await userEvent.click(booked, { force: true });
		await frames();
		expect(onChange).not.toHaveBeenCalled();
		expect(listbox()).toBeVisible();
		expect(slot).toHaveAttribute("aria-expanded", "true");
	});

	test("textValue is what typing matches when a label isn't a string", async () => {
		render(
			<Around>
				<Select
					label="Language"
					{...rowsAs(form, [
						{ value: "lang-1", label: <em>Node.js</em>, textValue: "Node.js" },
						{ value: "lang-2", label: <em>Rust</em>, textValue: "Rust" },
						{
							value: "lang-3",
							label: <em>TypeScript</em>,
							textValue: "TypeScript",
						},
					])}
				/>
			</Around>,
		);
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("r");
		await expectActive("Rust");
		await walk([["t", "TypeScript"]]);
	});
});

describe("Option", () => {
	test("an Option is an li with role option and the gl-option class, and its ref, className and other attributes land on it", async () => {
		const ref = React.createRef<HTMLLIElement>();
		render(
			<Select label="Language">
				<Option
					ref={ref}
					value="rust"
					className="systems"
					title="Since 2015"
					data-year="2015"
				>
					Rust
				</Option>
				<Option value="go">Go</Option>
			</Select>,
		);
		await openByPress(trigger("Language"));
		const rust = row("Rust");
		expect(rust).toBeInstanceOf(HTMLLIElement);
		expect(ref.current).toBe(rust);
		expect(rust).toHaveClass("gl-option");
		expect(rust).toHaveClass("systems");
		expect(rust).toHaveAttribute("title", "Since 2015");
		expect(rust).toHaveAttribute("data-year", "2015");
	});

	test("selected is Select's to set: an Option's own gives way to the value", async () => {
		render(
			<Select label="Language" defaultValue="go">
				<Option selected value="rust">
					Rust
				</Option>
				<Option value="go">Go</Option>
			</Select>,
		);
		await openByPress(trigger("Language"));
		expect(row("Rust")).toHaveAttribute("aria-selected", "false");
		expect(row("Go")).toHaveAttribute("aria-selected", "true");
	});

	test("an Option's own onClick runs, and the press still chooses its row", async () => {
		const onClick = vi.fn<(event: React.MouseEvent<HTMLLIElement>) => void>();
		const onChange = vi.fn<OnChange>();
		render(
			<Select label="Language" onChange={onChange}>
				<Option value="rust" onClick={onClick}>
					Rust
				</Option>
				<Option value="go">Go</Option>
			</Select>,
		);
		const language = trigger("Language");
		await openByPress(language);
		await userEvent.click(row("Rust"));
		await expectClosed(language);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(changes(onChange)).toEqual(["rust"]);
	});
});

describe("Select: plain values and forms", () => {
	test("options takes plain values: each is a row showing its value, and choosing it gives that value", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Select label="Employer" options={employers} onChange={onChange} />);
		const employer = trigger("Employer");
		await openByPress(employer);
		expect(rows().map((option) => labelOf(option))).toEqual(employers);
		await userEvent.click(row("Limber Health"));
		await expectClosed(employer);
		expect(changes(onChange)).toEqual(["Limber Health"]);
		expect(shown(employer)).toEqual(["Limber Health"]);
	});

	test("name: a hidden input carries the value into the form's FormData, a number as its digits and nothing chosen as an empty string", async () => {
		render(
			<form aria-label="Booking">
				<Select
					label="Length"
					name="length"
					defaultValue={30}
					options={[
						{ value: 15, label: "15 minutes" },
						{ value: 30, label: "30 minutes" },
						{ value: 45, label: "45 minutes" },
					]}
				/>
				<Select label="Slot" name="slot" options={slots} />
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", {
			name: "Booking",
		});
		const length = trigger("Length");
		const values = () => Object.fromEntries(new FormData(form));
		expect(values()).toEqual({ length: "30", slot: "" });
		await openByPress(length);
		await userEvent.click(row("45 minutes"));
		await expectClosed(length);
		expect(values()).toEqual({ length: "45", slot: "" });
	});

	test("with multiple, the FormData has every chosen value", async () => {
		render(
			<form aria-label="Booking">
				<Select
					multiple
					label="Topics"
					name="topics"
					options={topics}
					defaultValue={["Backend architecture"]}
				/>
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", {
			name: "Booking",
		});
		const topicsTrigger = trigger("Topics");
		expect(new FormData(form).getAll("topics")).toEqual([
			"Backend architecture",
		]);
		await openByPress(topicsTrigger);
		await userEvent.click(row("Team practices"));
		await expect
			.element(row("Team practices"))
			.toHaveAttribute("aria-selected", "true");
		expect(new FormData(form).getAll("topics")).toEqual([
			"Backend architecture",
			"Team practices",
		]);
	});
});

describe("Select: PopoverProps", () => {
	test("the list renders in document.body, outside the field, by default; with disablePortal, inside the field's root", async () => {
		const ref = React.createRef<HTMLDivElement>();
		const view = render(<StackSelect ref={ref} />);
		const portalled = await openByPress(trigger("Primary stack"));
		expect(must(ref.current).contains(portalled)).toBe(false);
		expect(document.body.contains(portalled)).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expectClosed(trigger("Primary stack"));
		view.unmount();
		render(<StackSelect ref={ref} PopoverProps={{ disablePortal: true }} />);
		const inPlace = await openByPress(trigger("Primary stack"));
		expect(must(ref.current).contains(inPlace)).toBe(true);
	});

	test("container renders the list there", async () => {
		const host = document.createElement("div");
		document.body.append(host);
		try {
			render(<StackSelect PopoverProps={{ container: host }} />);
			const list = await openByPress(trigger("Primary stack"));
			expect(host.contains(list)).toBe(true);
		} finally {
			cleanup();
			host.remove();
		}
	});

	test("while the list is open the page doesn't scroll; disableScrollLock leaves it scrolling", async () => {
		const view = render(<StackSelect />);
		expect(isScrollLocked()).toBe(false);
		await openByPress(trigger("Primary stack"));
		await expect.poll(() => isScrollLocked()).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expectClosed(trigger("Primary stack"));
		await expect.poll(() => isScrollLocked()).toBe(false);
		view.unmount();
		render(<StackSelect PopoverProps={{ disableScrollLock: true }} />);
		await openByPress(trigger("Primary stack"));
		await frames();
		expect(isScrollLocked()).toBe(false);
	});
});

describe("Select: native", () => {
	function nativeSelect(name: string): HTMLSelectElement {
		const element =
			screen.queryByRole("combobox", { name }) ??
			screen.getByRole("listbox", { name });
		if (!(element instanceof HTMLSelectElement)) {
			throw new TypeError(`${name} isn't a <select>`);
		}

		return element;
	}

	function texts(select: HTMLSelectElement): string[] {
		return [...select.options].map((option) => option.text);
	}

	test("native renders a <select> named by its <label for>, with an <option> per row, the chosen row's value and its id", () => {
		render(
			<Select
				native
				id="length-select"
				label="Length"
				defaultValue="30"
				options={lengths}
			/>,
		);
		const length = nativeSelect("Length");
		expect(length.id).toBe("length-select");
		expect([...(length.labels ?? [])].map((label) => label.htmlFor)).toEqual([
			"length-select",
		]);
		expect(texts(length)).toEqual(["15 minutes", "30 minutes", "45 minutes"]);
		expect(length.value).toBe("30");
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	test("choosing calls onChange with the select's change event and the row's value, and a number stays a number", async () => {
		const calls: Array<{
			isNative: boolean;
			type: string;
			target: EventTarget;
			value: unknown;
		}> = [];
		const record: OnChange = (event, value) => {
			calls.push({
				isNative: event instanceof Event,
				type: event.type,
				target: event.target,
				value,
			});
		};

		render(
			<>
				<Select
					native
					label="Length"
					defaultValue="30"
					options={lengths}
					onChange={record}
				/>
				<Select
					native
					label="Minutes"
					defaultValue={30}
					options={[15, 30, 45]}
					onChange={record}
				/>
			</>,
		);
		const length = nativeSelect("Length");
		await userEvent.selectOptions(length, "45 minutes");
		expect(length.value).toBe("45");
		const minutes = nativeSelect("Minutes");
		await userEvent.selectOptions(minutes, "15");
		expect(calls).toEqual([
			{ isNative: false, type: "change", target: length, value: "45" },
			{ isNative: false, type: "change", target: minutes, value: 15 },
		]);
	});

	test("placeholder is a first option, in color-muted while nothing is chosen, and when required it can't be chosen", async () => {
		render(
			<>
				<Select
					native
					label="Length"
					placeholder="Choose a length"
					options={lengths}
				/>
				<Select
					native
					required
					label="Slot"
					placeholder="Choose a slot"
					options={slots}
				/>
			</>,
		);
		const length = nativeSelect("Length");
		expect(texts(length)).toEqual([
			"Choose a length",
			"15 minutes",
			"30 minutes",
			"45 minutes",
		]);
		expect(length.value).toBe("");
		expect(length.selectedOptions[0]?.text).toBe("Choose a length");
		expect(getComputedStyle(length).color).toBe(resolved("--color-muted"));
		await userEvent.selectOptions(length, "30 minutes");
		expect(length.value).toBe("30");
		const slot = nativeSelect("Slot");
		expect(slot.options[0]?.text).toBe("Choose a slot");
		expect(slot.options[0]?.disabled).toBe(true);
	});

	test("multiple renders a multiple <select>, and onChange gets the array", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Select
				native
				multiple
				label="Topics"
				options={topics}
				defaultValue={["Team practices"]}
				onChange={onChange}
			/>,
		);
		const list = nativeSelect("Topics");
		expect(list.multiple).toBe(true);
		expect([...list.selectedOptions].map((option) => option.text)).toEqual([
			"Team practices",
		]);
		await userEvent.selectOptions(list, [
			"Backend architecture",
			"Hiring process",
		]);
		expect(changes(onChange).at(-1)).toEqual([
			"Backend architecture",
			"Hiring process",
		]);
	});

	test("name, required and disabled reach the select: the FormData has its value, and an empty required select fails validation", () => {
		render(
			<form aria-label="Booking">
				<Select
					native
					label="Length"
					name="length"
					defaultValue="45"
					options={lengths}
				/>
				<Select
					native
					required
					label="Slot"
					name="slot"
					placeholder="Choose a slot"
					options={slots}
				/>
				<Select
					native
					disabled
					label="Country"
					defaultValue="co"
					options={[{ value: "co", label: "Colombia" }]}
				/>
			</form>,
		);
		const form = screen.getByRole<HTMLFormElement>("form", {
			name: "Booking",
		});
		expect(new FormData(form).get("length")).toBe("45");
		const slot = nativeSelect("Slot");
		expect(slot).toBeRequired();
		expect(slot.validity.valueMissing).toBe(true);
		expect(form.checkValidity()).toBe(false);
		expect(nativeSelect("Country")).toBeDisabled();
	});

	test("readOnly says aria-readonly, keeps the value and calls no onChange", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Select
				native
				readOnly
				label="Length"
				defaultValue="30"
				options={lengths}
				onChange={onChange}
			/>,
		);
		const length = nativeSelect("Length");
		expect(length).toHaveAttribute("aria-readonly", "true");
		await userEvent.selectOptions(length, "45 minutes");
		await expect.poll(() => length.value).toBe("30");
		expect(onChange).not.toHaveBeenCalled();
	});

	test.each(sizes)(
		"size $name: the native pill is $height px tall",
		({ size, height }) => {
			render(
				<Select
					native
					size={size}
					label="Length"
					defaultValue="30"
					options={lengths}
				/>,
			);
			const well = bordered(nativeSelect("Length"));
			expect(Math.round(box(well).height)).toBe(height);
		},
	);

	test("textValue is an option's text when a row's label isn't a string", () => {
		render(
			<Select
				native
				label="Language"
				options={[
					{ value: "lang-1", label: <em>Node.js</em>, textValue: "Node.js" },
					{ value: "lang-2", label: <em>Rust</em>, textValue: "Rust" },
				]}
				defaultValue="lang-2"
			/>,
		);
		expect(texts(nativeSelect("Language"))).toEqual(["Node.js", "Rust"]);
	});
});

describe("Select: open at mount, and inside a containing block", () => {
	test("an in-place list inside a short containing block is capped to the block's room, as the reference's popover is", async () => {
		render(
			<div
				data-testid="stage"
				style={{
					height: 300,
					padding: 8,
					transform: "translateZ(0)",
					overflow: "visible",
				}}
			>
				<Select
					defaultOpen
					label="Hour"
					options={hours}
					defaultValue="00:00"
					PopoverProps={{
						disablePortal: true,
						disableScrollLock: true,
						disableEnforceFocus: true,
					}}
				/>
			</div>,
		);
		const list = await vi.waitFor(() => listbox());
		const surface = must(list.closest<HTMLElement>(".gl-popover"));
		await expect
			.poll(() => box(surface).height, { timeout: 2000 })
			.toBeGreaterThanOrEqual(80);
		await frames(8);
		const stage = box(screen.getByTestId("stage"));
		expect(box(surface).top).toBeGreaterThanOrEqual(
			box(trigger("Hour")).bottom,
		);
		expect(box(surface).bottom).toBeLessThanOrEqual(stage.bottom + 1);
	});

	test("defaultOpen through the portal enforces focus as an interactive open does: the page is hidden from assistive tech, and Tab stays in the layer", async () => {
		render(
			<Around>
				<StackSelect defaultOpen defaultValue="TypeScript" />
			</Around>,
		);
		const list = await vi.waitFor(() => listbox());
		await new Promise((resolve) => {
			setTimeout(resolve, 300);
		});
		const before = screen.getByText("Before");
		const isKeptFromAssistiveTech = (element: Element): boolean => {
			for (
				let node: Element | null = element;
				node;
				node = node.parentElement
			) {
				if (
					node.getAttribute("aria-hidden") === "true" ||
					node.hasAttribute("inert")
				) {
					return true;
				}
			}

			return false;
		};

		expect(isKeptFromAssistiveTech(before)).toBe(true);
		expect(list.contains(document.activeElement)).toBe(false);
		await userEvent.keyboard("{Tab}");
		await frames();
		const focused = must(document.activeElement);
		expect(focused).not.toBe(before);
		expect(isKeptFromAssistiveTech(focused)).toBe(false);
		expect(list.isConnected).toBe(true);
		expect(
			screen.getByRole("combobox", { name: "Primary stack", hidden: true }),
		).toHaveAttribute("aria-expanded", "true");
	});

	test("an in-place list follows its trigger when a render moves the trigger without resizing anything", async () => {
		function Stage({ shift }: { readonly shift: boolean }) {
			return (
				<div
					style={{
						height: 400,
						padding: 8,
						transform: "translateZ(0)",
						overflow: "visible",
					}}
				>
					{shift ? <div style={{ height: 80 }} /> : null}
					<Select
						defaultOpen
						label="Hour"
						options={hours}
						defaultValue="00:00"
						PopoverProps={{
							disablePortal: true,
							disableScrollLock: true,
							disableEnforceFocus: true,
						}}
					/>
				</div>
			);
		}

		const view = render(<Stage shift={false} />);
		const list = await vi.waitFor(() => listbox());
		const surface = must(list.closest<HTMLElement>(".gl-popover"));
		await expect
			.poll(() => box(surface).height, { timeout: 2000 })
			.toBeGreaterThanOrEqual(80);
		await frames(8);
		const triggerTop = box(trigger("Hour")).top;
		const gap = box(surface).top - triggerTop;
		view.rerender(<Stage shift />);
		await frames(8);
		const movedTop = box(trigger("Hour")).top;
		expect(movedTop - triggerTop).toBeGreaterThan(70);
		expect(Math.abs(box(surface).top - movedTop - gap)).toBeLessThanOrEqual(1);
	});

	referenceDefectTest(
		"required with a name on the glass select: the form is invalid while nothing is chosen, and valid once a slot is",
		async () => {
			render(
				<form aria-label="Booking">
					<Select
						required
						label="Slot"
						name="slot"
						placeholder="Choose a slot"
						options={slots}
					/>
				</form>,
			);
			const form = screen.getByRole<HTMLFormElement>("form", {
				name: "Booking",
			});
			expect(form.checkValidity()).toBe(false);
			await openByPress(trigger("Slot"));
			await userEvent.click(row("Wednesday, 10:00"));
			await expect.poll(() => form.checkValidity()).toBe(true);
		},
	);
});
