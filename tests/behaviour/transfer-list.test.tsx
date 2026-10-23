// Behaviour specs for TransferList, from design-system/components/TransferList/README.md and
// api.d.ts. The port keeps its selection in Base UI's CheckboxGroup, so the specs find the wells
// as listboxes and the rows as options, by role and name. The row the keys act on is the
// focused option, or the option the focused listbox points at with aria-activedescendant (the
// reference's way), whichever the port uses. Where the README is silent, the reference is the
// spec, and the test says so.
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, type Mock, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	TransferList,
	type TransferListProps,
	type TransferListSelection,
	type TransferListValue,
} from "#ui";

afterEach(() => {
	cleanup();
});

/**
The element with an id, through a selector, as the lint rules prefer.
*/
function byId(id: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

const stack = ["MongoDB", "React", "Rust", "Terraform", "Cloudflare"];
const highlights = ["Node.js", "TypeScript", "AWS", "PostgreSQL"];

// The preview's locked row: it stays on the résumé, and says why.
const locked = {
	value: "Node.js",
	label: "Node.js",
	secondary: "Every backend I’ve led",
	disabled: true,
};

type OnChange = NonNullable<TransferListProps["onChange"]>;
type OnSelectionChange = NonNullable<TransferListProps["onSelectionChange"]>;
type Direction = "right" | "left" | "down" | "up";

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

/**
Whether the element is drawn: a box, and no display none, visibility hidden or opacity 0 on it
or an ancestor.
*/
function isShown(element: Element): boolean {
	const { width, height } = box(element);
	return (
		width > 0 &&
		height > 0 &&
		element.checkVisibility({ visibilityProperty: true, opacityProperty: true })
	);
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

/**
Whether the elements come in this order in the document.
*/
function isInOrder(...elements: Element[]): boolean {
	const all = [...document.querySelectorAll("*")];
	const positions = elements.map((element) => all.indexOf(element));
	return positions.every(
		(position, index) => position > (positions[index - 1] ?? -1),
	);
}

/**
What a token resolves to, read from a probe element styled with it. A blur token goes through
blur(), as backdrop-filter takes it.
*/
function resolved(
	property:
		"backgroundColor" | "borderTopLeftRadius" | "boxShadow" | "backdropFilter",
	token: string,
): string {
	const probe = document.createElement("div");
	probe.style[property] =
		property === "backdropFilter" ? `blur(var(${token}))` : `var(${token})`;
	document.body.append(probe);
	const value = getComputedStyle(probe)[property];
	probe.remove();
	return value;
}

/**
The alpha of a computed colour: rgb() is opaque, rgba() carries its own.
*/
function alphaOf(color: string): number {
	const channels = color.match(/[\d.]+/gv) ?? [];
	return channels.length === 4 ? Number(channels[3]) : 1;
}

async function pause(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/**
Moves the pointer to the page's bottom-left corner, off every row, so no row is hovered.
*/
async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; left: 0; bottom: 0; width: 8px; height: 8px";
	document.body.append(spot);
	try {
		await userEvent.hover(spot);
	} finally {
		spot.remove();
	}
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function well(name: string): HTMLElement {
	return screen.getByRole("listbox", { name });
}

/**
The row named by this label. An object item's secondary line may join its name, after the label.
*/
function option(label: string): HTMLElement {
	return screen.getByRole("option", {
		name: (name) => name === label || name.startsWith(`${label} `),
	});
}

/**
The texts of a well's rows, in order: a string item's label.
*/
function rowsOf(name: string): string[] {
	return within(well(name))
		.queryAllByRole("option")
		.map((row) => row.textContent ?? "");
}

function selectedIn(name: string): string[] {
	return within(well(name))
		.queryAllByRole("option", { selected: true })
		.map((row) => row.textContent ?? "");
}

function moveButtons(): HTMLElement[] {
	return screen.getAllByRole("button", { name: /^Move /v });
}

function expectMoveButtons(names: readonly string[]): void {
	const found = moveButtons();
	expect(found).toHaveLength(names.length);
	for (const [index, element] of found.entries()) {
		expect(element).toHaveAccessibleName(names[index]);
	}
}

const countPattern = /^\d+\/\d+ selected$/v;

/**
The count a well shows, as "2/5 selected", and the well around it: the nearest ancestor of the
listbox that holds a shown count of its own.
*/
function countAndPane(name: string): { count: string; pane: HTMLElement } {
	const list = well(name);
	for (let node = list.parentElement; node; node = node.parentElement) {
		const count = [...node.querySelectorAll("*")].find(
			(element) =>
				!list.contains(element) &&
				countPattern.test(element.textContent?.trim() ?? "") &&
				isShown(element),
		);
		if (count) {
			return { count: count.textContent?.trim() ?? "", pane: node };
		}
	}

	throw new Error(`The ${name} well shows no count`);
}

function countOf(name: string): string {
	return countAndPane(name).count;
}

function paneOf(name: string): HTMLElement {
	return countAndPane(name).pane;
}

/**
The box a well's rows scroll in: the listbox, or its nearest scrolling ancestor.
*/
function scroller(name: string): HTMLElement {
	for (
		let node: HTMLElement | null = well(name);
		node;
		node = node.parentElement
	) {
		if (/^(?:auto|scroll)$/v.test(getComputedStyle(node).overflowY)) {
			return node;
		}
	}

	throw new Error(`The ${name} well doesn't scroll`);
}

function isScrollable(element: HTMLElement): boolean {
	return element.scrollHeight > element.clientHeight + 1;
}

function isWithin(inner: Element, outer: Element): boolean {
	const a = box(inner);
	const b = box(outer);
	return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
}

/**
The row the keys act on: the focused option, or the option the focused listbox points at.
*/
function activeRow(): Element | null {
	const focused = document.activeElement;
	if (!focused || focused === document.body) {
		return null;
	}

	if (focused.getAttribute("role") === "option") {
		return focused;
	}

	const id = focused.getAttribute("aria-activedescendant");
	return id === null || id === "" ? null : byId(id);
}

async function expectActive(label: string): Promise<void> {
	await expect.poll(() => activeRow()).toBe(option(label));
}

/**
Where focus is, counting a focused option as its listbox.
*/
function focusTarget(): Element | null {
	const focused = document.activeElement;
	return focused?.closest('[role="listbox"]') ?? focused;
}

/**
Presses each key in turn and waits for the row named next to it to be the active one.
*/
async function walk(
	steps: ReadonlyArray<readonly [key: string, label: string]>,
): Promise<void> {
	for (const [key, label] of steps) {
		// eslint-disable-next-line no-await-in-loop -- each key starts where the last one left
		await userEvent.keyboard(key);
		// eslint-disable-next-line no-await-in-loop
		await expectActive(label);
	}
}

function hasCheck(row: Element): boolean {
	return [...row.querySelectorAll("svg")].some((svg) => isShown(svg));
}

function sorted(selection: TransferListSelection): TransferListSelection {
	return {
		left: selection.left.toSorted(),
		right: selection.right.toSorted(),
	};
}

/**
The selection onSelectionChange got last, in a fixed order: the order of its values isn't
documented.
*/
function lastSelection(
	onSelectionChange: Mock<OnSelectionChange>,
): TransferListSelection {
	return sorted(must(onSelectionChange.mock.lastCall?.[0]));
}

/**
A React click event, as onChange gets from a move button.
*/
function expectClick(event: React.SyntheticEvent | undefined): void {
	expect(event).not.toBeInstanceOf(Event);
	expect(event?.type).toBe("click");
	expect(event?.nativeEvent).toBeInstanceOf(MouseEvent);
}

/**
Which way the arrow drawn in a control points on screen, however it's turned. An arrow's open
ends spread along its back, so it points away from the side of its outline where the drawn
points spread widest.
*/
function pointing(control: Element): Direction {
	const points: DOMPoint[] = [];
	for (const path of control.querySelectorAll("path")) {
		const toScreen = path.getScreenCTM() ?? new DOMMatrix();
		const length = path.getTotalLength();
		for (let at = 0; at <= length; at += 0.25) {
			points.push(path.getPointAtLength(at).matrixTransform(toScreen));
		}
	}

	const xs = points.map((point) => point.x);
	const ys = points.map((point) => point.y);
	const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
	const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
	const near = 0.75;
	const spread = (
		isOnSide: (point: DOMPoint) => boolean,
		across: (point: DOMPoint) => number,
	) => {
		const values = points
			.filter((point) => isOnSide(point))
			.map((point) => across(point));
		return Math.max(...values) - Math.min(...values);
	};

	const backs: Array<[Direction, number]> = [
		[
			"right",
			spread(
				(point) => point.x <= minX + near,
				(point) => point.y,
			),
		],
		[
			"left",
			spread(
				(point) => point.x >= maxX - near,
				(point) => point.y,
			),
		],
		[
			"down",
			spread(
				(point) => point.y <= minY + near,
				(point) => point.x,
			),
		],
		[
			"up",
			spread(
				(point) => point.y >= maxY - near,
				(point) => point.x,
			),
		],
	];
	return must(backs.toSorted((a, b) => b[1] - a[1])[0])[0];
}

type SkillsProps = TransferListProps & {
	readonly ref?: React.Ref<HTMLDivElement>;
};

/**
The preview's résumé: the stack on the left, the highlights on the right.
*/
function Skills(props: SkillsProps) {
	return (
		<TransferList
			defaultValue={{ left: stack, right: highlights }}
			leftTitle="Stack"
			rightTitle="Highlights"
			{...props}
		/>
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

/**
Renders the résumé between two buttons and tabs into the Stack well, on its first row.
*/
async function tabIntoStack(props: SkillsProps = {}): Promise<void> {
	render(
		<Around>
			<Skills {...props} />
		</Around>,
	);
	button("Before").focus();
	await userEvent.tab();
	await expectActive("MongoDB");
}

function many(count: number): string[] {
	return Array.from({ length: count }, (_, index) => `Skill ${index + 1}`);
}

describe("TransferList: the wells", () => {
	test("two multi-select listboxes, named by their titles, hold the rows as options, none selected yet", () => {
		render(<Skills />);
		for (const [name, labels] of [
			["Stack", stack],
			["Highlights", highlights],
		] as const) {
			expect(well(name)).toHaveAttribute("aria-multiselectable", "true");
			expect(rowsOf(name)).toEqual(labels);
			for (const row of within(well(name)).getAllByRole("option")) {
				expect(row).toHaveAttribute("aria-selected", "false");
			}
		}
	});

	test("leftTitle and rightTitle head the wells", () => {
		render(<Skills />);
		for (const name of ["Stack", "Highlights"]) {
			const title = within(paneOf(name)).getByText(name);
			expect(isShown(title)).toBe(true);
			expect(isInOrder(title, well(name))).toBe(true);
		}
	});

	test('the titles default to "Choices" and "Chosen", which head the wells and name the listboxes and the move buttons', () => {
		render(<TransferList defaultValue={{ left: ["React"], right: ["AWS"] }} />);
		for (const name of ["Choices", "Chosen"]) {
			const title = within(paneOf(name)).getByText(name);
			expect(isShown(title)).toBe(true);
		}

		expectMoveButtons([
			"Move all to Chosen",
			"Move selected to Chosen",
			"Move selected to Choices",
			"Move all to Choices",
		]);
	});

	test("a title can be any node: it heads its well and names its listbox", () => {
		render(
			<TransferList
				defaultValue={{ left: stack, right: highlights }}
				leftTitle={<em>Stack</em>}
				rightTitle={<em>Highlights</em>}
			/>,
		);
		for (const name of ["Stack", "Highlights"]) {
			const title = screen.getByText(name);
			expect(title.tagName).toBe("EM");
			expect(isShown(title)).toBe(true);
			expect(within(well(name)).getAllByRole("option")).not.toHaveLength(0);
		}
	});

	test("a string is its own value and label; an object shows its label, or its value without one, and its secondary line", async () => {
		const onSelectionChange = vi.fn<OnSelectionChange>();
		render(
			<TransferList
				defaultValue={{
					left: [
						{
							value: "vsebcode",
							label: "VSebCode",
							secondary: "My fork of VS Code",
						},
						{ value: "Clean Architecture template" },
						"Portfolio",
					],
					right: [],
				}}
				leftTitle="Projects"
				rightTitle="Featured"
				onSelectionChange={onSelectionChange}
			/>,
		);
		const [vsebcode, clean, portfolio] = within(well("Projects")).getAllByRole(
			"option",
		);
		expect(vsebcode).toHaveAccessibleName(/^VSebCode/v);
		expect(isShown(within(vsebcode).getByText("My fork of VS Code"))).toBe(
			true,
		);
		expect(clean).toHaveAccessibleName("Clean Architecture template");
		expect(portfolio).toHaveAccessibleName("Portfolio");
		await userEvent.click(vsebcode);
		await userEvent.click(portfolio);
		expect(lastSelection(onSelectionChange)).toEqual({
			left: ["Portfolio", "vsebcode"],
			right: [],
		});
	});

	test('each well shows its count, as in "2/5 selected", and the count follows the selection', async () => {
		render(<Skills defaultSelected={{ left: ["Rust", "Terraform"] }} />);
		expect(countOf("Stack")).toBe("2/5 selected");
		expect(countOf("Highlights")).toBe("0/4 selected");
		await userEvent.click(option("React"));
		await expect.poll(() => countOf("Stack")).toBe("3/5 selected");
		await userEvent.click(option("AWS"));
		await expect.poll(() => countOf("Highlights")).toBe("1/4 selected");
	});

	// The README asks for the count so a selection out of view isn't lost; the reference also
	// describes each listbox by it, so a screen reader hears it too.
	test("each listbox is described by its count", async () => {
		render(<Skills defaultSelected={{ left: ["Rust", "Terraform"] }} />);
		expect(well("Stack")).toHaveAccessibleDescription(
			/\b2\b.+\b5\b.+selected/v,
		);
		expect(well("Highlights")).toHaveAccessibleDescription(
			/\b0\b.+\b4\b.+selected/v,
		);
		await userEvent.click(option("React"));
		await expect
			.poll(() => well("Stack"))
			.toHaveAccessibleDescription(/\b3\b.+\b5\b.+selected/v);
	});

	test("the count includes selected rows scrolled out of view", () => {
		render(
			<TransferList
				defaultValue={{ left: many(12), right: [] }}
				defaultSelected={{ left: ["Skill 1", "Skill 12"] }}
				leftTitle="Stack"
			/>,
		);
		expect(box(option("Skill 12")).top).toBeGreaterThanOrEqual(
			box(scroller("Stack")).bottom,
		);
		expect(countOf("Stack")).toBe("2/12 selected");
	});

	test("a selected row shows a check, and an unselected row doesn't", async () => {
		render(<Skills defaultSelected={{ left: ["Rust"] }} />);
		expect(hasCheck(option("Rust"))).toBe(true);
		expect(hasCheck(option("React"))).toBe(false);
		await userEvent.click(option("Rust"));
		await expect.poll(() => hasCheck(option("Rust"))).toBe(false);
		await userEvent.click(option("React"));
		await expect.poll(() => hasCheck(option("React"))).toBe(true);
	});

	test("a selected row is raised, with the glass-raised fill and the raised shadow, and an unselected row is flat", async () => {
		render(<Skills defaultSelected={{ left: ["Rust"] }} />);
		await parkPointer();
		await expect
			.poll(() => getComputedStyle(option("Rust")).backgroundColor)
			.toBe(resolved("backgroundColor", "--glass-raised"));
		expect(getComputedStyle(option("Rust")).boxShadow).toBe(
			resolved("boxShadow", "--shadow-raised"),
		);
		await expect
			.poll(() => alphaOf(getComputedStyle(option("React")).backgroundColor))
			.toBe(0);
		expect(getComputedStyle(option("React")).boxShadow).toBe("none");
	});

	test('an empty well holds no rows and says "No items", or what emptyText says', () => {
		render(
			<>
				<TransferList
					defaultValue={{ left: [], right: ["AWS"] }}
					leftTitle="Empty"
					rightTitle="Full"
				/>
				<TransferList
					defaultValue={{ left: ["React"], right: [] }}
					leftTitle="Stack"
					rightTitle="References"
					emptyText="Nothing here yet"
				/>
			</>,
		);
		expect(rowsOf("Empty")).toEqual([]);
		expect(countOf("Empty")).toBe("0/0 selected");
		const emptyText = within(paneOf("Empty")).getByText("No items");
		expect(isShown(emptyText)).toBe(true);
		expect(within(paneOf("Full")).queryByText("No items")).toBeNull();
		expect(rowsOf("References")).toEqual([]);
		const ownText = within(paneOf("References")).getByText("Nothing here yet");
		expect(isShown(ownText)).toBe(true);
	});

	test("without value or defaultValue both lists start empty", () => {
		render(<TransferList />);
		expect(rowsOf("Choices")).toEqual([]);
		expect(rowsOf("Chosen")).toEqual([]);
		expect(
			screen.getAllByText("No items").filter((element) => isShown(element)),
		).toHaveLength(2);
	});

	test("each well is an inset Paper: the glass-inset fill, a glass-edge border and radius-well corners", () => {
		render(<Skills />);
		for (const name of ["Stack", "Highlights"]) {
			const style = getComputedStyle(paneOf(name));
			expect(style.backgroundColor).toBe(
				resolved("backgroundColor", "--glass-inset"),
			);
			expect(style.borderTopColor).toBe(
				resolved("backgroundColor", "--glass-edge"),
			);
			expect(style.borderTopLeftRadius).toBe(
				resolved("borderTopLeftRadius", "--radius-well"),
			);
		}
	});

	test("the ref is its root div, which holds both wells and takes className, style, id and the other HTML attributes", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Skills
				ref={ref}
				id="skills"
				className="custom"
				style={{ marginTop: 12 }}
				data-section="resume"
				role="group"
				aria-label="Résumé skills"
			/>,
		);
		const root = must(ref.current);
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(screen.getByRole("group", { name: "Résumé skills" })).toBe(root);
		expect(root).toHaveAttribute("id", "skills");
		expect(root).toHaveClass("custom");
		expect(getComputedStyle(root).marginTop).toBe("12px");
		expect(root).toHaveAttribute("data-section", "resume");
		expect(root.contains(well("Stack"))).toBe(true);
		expect(root.contains(well("Highlights"))).toBe(true);
	});

	test("event handlers land on the root too, which hears its wells' keys and clicks", async () => {
		const keys: string[] = [];
		const onClick = vi.fn<() => void>();
		render(
			<Around>
				<Skills
					onClick={onClick}
					onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
						keys.push(event.key);
					}}
				/>
			</Around>,
		);
		await userEvent.click(option("Rust"));
		expect(onClick).toHaveBeenCalledTimes(1);
		await userEvent.keyboard("{ArrowDown}");
		await userEvent.keyboard(" ");
		expect(keys).toEqual(["ArrowDown", " "]);
	});
});

describe("TransferList: moving rows", () => {
	const moves = [
		{
			name: "Move selected to Highlights",
			left: ["MongoDB", "React", "Cloudflare"],
			right: [...highlights, "Rust", "Terraform"],
		},
		{
			name: "Move all to Highlights",
			left: [],
			right: [...highlights, ...stack],
		},
		{
			name: "Move selected to Stack",
			left: [...stack, "AWS"],
			right: ["Node.js", "TypeScript", "PostgreSQL"],
		},
		{
			name: "Move all to Stack",
			left: [...stack, ...highlights],
			right: [],
		},
	] as const;

	test("the move buttons sit between the wells, named from the titles", () => {
		render(<Skills />);
		const names = [
			"Move all to Highlights",
			"Move selected to Highlights",
			"Move selected to Stack",
			"Move all to Stack",
		];
		expectMoveButtons(names);
		expect(
			isInOrder(
				well("Stack"),
				...names.map((name) => button(name)),
				well("Highlights"),
			),
		).toBe(true);
	});

	test("showMoveAll={false} leaves only the two move-selected buttons", () => {
		render(<Skills showMoveAll={false} />);
		expectMoveButtons([
			"Move selected to Highlights",
			"Move selected to Stack",
		]);
	});

	// The README doesn't say where moved rows land; the reference adds them to the end, in order.
	test.each(moves)(
		"$name moves its rows to the end of the other list, and onChange gets the click event and both lists",
		async ({ name, left, right }) => {
			const onChange = vi.fn<OnChange>();
			render(
				<Skills
					defaultSelected={{ left: ["Rust", "Terraform"], right: ["AWS"] }}
					onChange={onChange}
				/>,
			);
			await userEvent.click(button(name));
			await expect.poll(() => rowsOf("Stack")).toEqual(left);
			expect(rowsOf("Highlights")).toEqual(right);
			expect(onChange).toHaveBeenCalledTimes(1);
			const [event, value] = onChange.mock.calls[0] ?? [];
			expectClick(event);
			expect(value).toEqual({ left, right });
		},
	);

	test("onChange gets object items as they were given", async () => {
		const onChange = vi.fn<OnChange>();
		const vsebcode = {
			value: "vsebcode",
			label: "VSebCode",
			secondary: "My fork of VS Code",
		};
		render(
			<TransferList
				defaultValue={{ left: [vsebcode, "Portfolio"], right: [locked] }}
				leftTitle="Projects"
				rightTitle="Featured"
				onChange={onChange}
			/>,
		);
		await userEvent.click(button("Move all to Featured"));
		await vi.waitFor(() => {
			expect(onChange).toHaveBeenCalledTimes(1);
		});
		expect(onChange.mock.calls[0]?.[1]).toEqual({
			left: [],
			right: [locked, vsebcode, "Portfolio"],
		});
	});

	// The words are the reference's: the README asks for how many items went where.
	test("the status region is in the page from the start, empty, and after a move it says how many items went where", async () => {
		render(
			<Skills
				defaultSelected={{ left: ["Rust", "Terraform"], right: ["AWS"] }}
			/>,
		);
		const status = screen.getByRole("status");
		expect(status.textContent).toBe("");
		await userEvent.click(button("Move selected to Highlights"));
		await expect
			.poll(() => status.textContent)
			.toBe("Moved 2 items to Highlights.");
		await userEvent.click(button("Move selected to Stack"));
		await expect.poll(() => status.textContent).toBe("Moved 1 item to Stack.");
		await userEvent.click(button("Move all to Stack"));
		await expect.poll(() => status.textContent).toBe("Moved 5 items to Stack.");
	});

	// The README is silent on the selection after a move; the reference drops the moved rows from it.
	test("moved rows arrive unselected and leave the selection, which onSelectionChange reports, and both counts follow", async () => {
		const onSelectionChange = vi.fn<OnSelectionChange>();
		render(
			<Skills
				defaultSelected={{ left: ["Rust", "Terraform"], right: ["AWS"] }}
				onSelectionChange={onSelectionChange}
			/>,
		);
		await userEvent.click(button("Move selected to Highlights"));
		await expect.poll(() => rowsOf("Highlights")).toContain("Rust");
		expect(selectedIn("Stack")).toEqual([]);
		expect(selectedIn("Highlights")).toEqual(["AWS"]);
		expect(countOf("Stack")).toBe("0/3 selected");
		expect(countOf("Highlights")).toBe("1/6 selected");
		expect(lastSelection(onSelectionChange)).toEqual({
			left: [],
			right: ["AWS"],
		});
	});

	// The README is silent; the reference disables a move button that has nothing to move.
	test("a move button with nothing to move is disabled", async () => {
		render(<Skills defaultValue={{ left: stack, right: [] }} />);
		expect(isDisabled(button("Move selected to Highlights"))).toBe(true);
		expect(isDisabled(button("Move selected to Stack"))).toBe(true);
		expect(isDisabled(button("Move all to Stack"))).toBe(true);
		expect(isDisabled(button("Move all to Highlights"))).toBe(false);
		await userEvent.click(option("React"));
		await expect
			.poll(() => isDisabled(button("Move selected to Highlights")))
			.toBe(false);
	});

	test("the move buttons are the small glass pill: 36px tall, with the control shadow and blur", () => {
		render(<Skills defaultSelected={{ left: ["Rust"], right: ["AWS"] }} />);
		for (const element of moveButtons()) {
			expect(Math.round(box(element).height)).toBe(36);
			const style = getComputedStyle(element);
			expect(style.boxShadow).toBe(resolved("boxShadow", "--shadow-control"));
			expect(style.backdropFilter).toBe(
				resolved("backdropFilter", "--blur-control"),
			);
		}
	});
});

describe("TransferList: value and selection", () => {
	test("value controls the lists: a move calls onChange, and only a new value moves the rows", async () => {
		const onChange = vi.fn<OnChange>();
		const view = (value: TransferListValue) => (
			<TransferList
				value={value}
				defaultSelected={{ left: ["Rust"] }}
				leftTitle="Stack"
				rightTitle="Highlights"
				onChange={onChange}
			/>
		);
		const { rerender } = render(view({ left: stack, right: highlights }));
		await userEvent.click(button("Move selected to Highlights"));
		expect(onChange).toHaveBeenCalledTimes(1);
		const next = must(onChange.mock.calls[0]?.[1]);
		expect(next).toEqual({
			left: ["MongoDB", "React", "Terraform", "Cloudflare"],
			right: [...highlights, "Rust"],
		});
		expect(rowsOf("Stack")).toEqual(stack);
		expect(rowsOf("Highlights")).toEqual(highlights);
		rerender(view(next));
		expect(rowsOf("Stack")).toEqual([
			"MongoDB",
			"React",
			"Terraform",
			"Cloudflare",
		]);
		expect(rowsOf("Highlights")).toEqual([...highlights, "Rust"]);
	});

	test("a click toggles a row, and onSelectionChange gets the selection in both lists", async () => {
		const onSelectionChange = vi.fn<OnSelectionChange>();
		render(<Skills onSelectionChange={onSelectionChange} />);
		await userEvent.click(option("Rust"));
		await expect.poll(() => selectedIn("Stack")).toEqual(["Rust"]);
		expect(lastSelection(onSelectionChange)).toEqual({
			left: ["Rust"],
			right: [],
		});
		await userEvent.click(option("AWS"));
		await expect.poll(() => selectedIn("Highlights")).toEqual(["AWS"]);
		expect(lastSelection(onSelectionChange)).toEqual({
			left: ["Rust"],
			right: ["AWS"],
		});
		await userEvent.click(option("Rust"));
		await expect.poll(() => selectedIn("Stack")).toEqual([]);
		expect(lastSelection(onSelectionChange)).toEqual({
			left: [],
			right: ["AWS"],
		});
		expect(onSelectionChange).toHaveBeenCalledTimes(3);
	});

	test("defaultSelected may name one side only, and the other starts empty", () => {
		render(<Skills defaultSelected={{ right: ["AWS", "TypeScript"] }} />);
		expect(selectedIn("Highlights")).toEqual(["TypeScript", "AWS"]);
		expect(selectedIn("Stack")).toEqual([]);
	});

	test("selected controls the selection: a click calls onSelectionChange, and only the prop moves it", async () => {
		const onSelectionChange = vi.fn<OnSelectionChange>();
		const view = (selection: TransferListSelection) => (
			<Skills selected={selection} onSelectionChange={onSelectionChange} />
		);
		const { rerender } = render(view({ left: ["Rust"], right: [] }));
		await userEvent.click(option("React"));
		expect(lastSelection(onSelectionChange)).toEqual({
			left: ["React", "Rust"],
			right: [],
		});
		expect(selectedIn("Stack")).toEqual(["Rust"]);
		rerender(view({ left: ["React", "Rust"], right: ["AWS"] }));
		expect(selectedIn("Stack")).toEqual(["React", "Rust"]);
		expect(selectedIn("Highlights")).toEqual(["AWS"]);
	});

	test("with selected, Space and Ctrl+A only ask too: onSelectionChange gets the new selection, and the prop decides", async () => {
		const onSelectionChange = vi.fn<OnSelectionChange>();
		await tabIntoStack({
			selected: { left: [], right: ["AWS"] },
			onSelectionChange,
		});
		await userEvent.keyboard(" ");
		await vi.waitFor(() => {
			expect(onSelectionChange).toHaveBeenCalledTimes(1);
		});
		expect(lastSelection(onSelectionChange)).toEqual({
			left: ["MongoDB"],
			right: ["AWS"],
		});
		await userEvent.keyboard("{Control>}a{/Control}");
		await vi.waitFor(() => {
			expect(onSelectionChange).toHaveBeenCalledTimes(2);
		});
		expect(lastSelection(onSelectionChange)).toEqual({
			left: stack.toSorted(),
			right: ["AWS"],
		});
		expect(selectedIn("Stack")).toEqual([]);
		expect(selectedIn("Highlights")).toEqual(["AWS"]);
	});

	test("Move selected moves the rows the selected prop names", async () => {
		render(<Skills selected={{ left: ["MongoDB"], right: [] }} />);
		await userEvent.click(button("Move selected to Highlights"));
		await expect
			.poll(() => rowsOf("Highlights"))
			.toEqual([...highlights, "MongoDB"]);
	});

	test("defaultValue and defaultSelected are read once: after that the component keeps its own lists and selection", async () => {
		const { rerender } = render(
			<Skills defaultSelected={{ left: ["Rust", "React"] }} />,
		);
		await userEvent.click(option("React"));
		await userEvent.click(button("Move selected to Highlights"));
		await expect.poll(() => rowsOf("Highlights")).toContain("Rust");
		rerender(
			<Skills
				defaultValue={{ left: ["Go"], right: [] }}
				defaultSelected={{ left: ["Go"] }}
			/>,
		);
		expect(rowsOf("Stack")).toEqual([
			"MongoDB",
			"React",
			"Terraform",
			"Cloudflare",
		]);
		expect(rowsOf("Highlights")).toEqual([...highlights, "Rust"]);
		expect(selectedIn("Stack")).toEqual([]);
	});
});

describe("TransferList: disabled rows and disabled", () => {
	test("a disabled row is aria-disabled and shows why in its secondary line, and a click doesn't select it", async () => {
		const onSelectionChange = vi.fn<OnSelectionChange>();
		render(
			<Skills
				defaultValue={{ left: stack, right: [locked, "TypeScript"] }}
				onSelectionChange={onSelectionChange}
			/>,
		);
		const row = option("Node.js");
		expect(row).toHaveAttribute("aria-disabled", "true");
		expect(isShown(within(row).getByText("Every backend I’ve led"))).toBe(true);
		await userEvent.click(row, { force: true });
		expect(row).toHaveAttribute("aria-selected", "false");
		expect(onSelectionChange).not.toHaveBeenCalled();
	});

	test("a disabled row stays put: Move all leaves it, and once only it is left Move all is disabled", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Skills
				defaultValue={{ left: stack, right: [locked, "TypeScript", "AWS"] }}
				onChange={onChange}
			/>,
		);
		await userEvent.click(button("Move all to Stack"));
		await expect
			.poll(() => rowsOf("Stack"))
			.toEqual([...stack, "TypeScript", "AWS"]);
		expect(within(well("Highlights")).getAllByRole("option")).toEqual([
			option("Node.js"),
		]);
		expect(onChange.mock.calls[0]?.[1]).toEqual({
			left: [...stack, "TypeScript", "AWS"],
			right: [locked],
		});
		expect(isDisabled(button("Move all to Stack"))).toBe(true);
	});

	// "Dims everything": the reference sets the root at half opacity.
	test("disabled dims everything, and marks both listboxes aria-disabled", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Skills ref={ref} disabled />);
		expect(getComputedStyle(must(ref.current)).opacity).toBe("0.5");
		for (const name of ["Stack", "Highlights"]) {
			expect(well(name)).toHaveAttribute("aria-disabled", "true");
		}
	});

	test("disabled blocks changes: clicks, keys and the move buttons do nothing", async () => {
		const onChange = vi.fn<OnChange>();
		const onSelectionChange = vi.fn<OnSelectionChange>();
		render(
			<Skills
				disabled
				defaultSelected={{ left: ["Rust"] }}
				onChange={onChange}
				onSelectionChange={onSelectionChange}
			/>,
		);
		for (const element of moveButtons()) {
			expect(isDisabled(element)).toBe(true);
		}

		await userEvent.click(option("React"), { force: true });
		well("Stack").focus();
		await userEvent.keyboard(" ");
		await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");
		await userEvent.keyboard("{Control>}a{/Control}");
		for (const element of moveButtons()) {
			// eslint-disable-next-line no-await-in-loop -- one press after another
			await userEvent.click(element, { force: true });
		}

		expect(selectedIn("Stack")).toEqual(["Rust"]);
		expect(rowsOf("Stack")).toEqual(stack);
		expect(rowsOf("Highlights")).toEqual(highlights);
		expect(onChange).not.toHaveBeenCalled();
		expect(onSelectionChange).not.toHaveBeenCalled();
	});

	// The README is silent; in the reference neither the wells nor the disabled buttons are tab stops.
	test("disabled takes it out of the tab order", async () => {
		render(
			<Around>
				<Skills disabled defaultSelected={{ left: ["Rust"] }} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
	});
});

describe("TransferList: keyboard", () => {
	test("each well is one tab stop, Tab reaches the move buttons between them, and Shift+Tab goes back", async () => {
		render(
			<Around>
				<Skills defaultSelected={{ left: ["Rust"], right: ["AWS"] }} />
			</Around>,
		);
		const order = [
			well("Stack"),
			button("Move all to Highlights"),
			button("Move selected to Highlights"),
			button("Move selected to Stack"),
			button("Move all to Stack"),
			well("Highlights"),
			button("After"),
		];
		button("Before").focus();
		for (const target of order) {
			// eslint-disable-next-line no-await-in-loop -- each Tab starts where the last one left
			await userEvent.tab();
			// eslint-disable-next-line no-await-in-loop
			await expect.poll(() => focusTarget()).toBe(target);
		}

		for (const target of [...order.toReversed().slice(1), button("Before")]) {
			// eslint-disable-next-line no-await-in-loop -- each Tab starts where the last one left
			await userEvent.tab({ shift: true });
			// eslint-disable-next-line no-await-in-loop
			await expect.poll(() => focusTarget()).toBe(target);
		}
	});

	// The README is silent on where the keys start; the reference starts on the first enabled row.
	test("Tab into a well puts the keys on its first enabled row, without selecting it", async () => {
		render(
			<Around>
				<Skills defaultValue={{ left: stack, right: [locked, "TypeScript"] }} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expectActive("MongoDB");
		button("After").focus();
		await userEvent.tab({ shift: true });
		await expectActive("TypeScript");
		expect(selectedIn("Stack")).toEqual([]);
		expect(selectedIn("Highlights")).toEqual([]);
	});

	// The README doesn't say whether the arrows wrap; the reference stops at the ends. Each stop is
	// followed by a move that only lands right if the stop held.
	test("Down and Up move between rows without selecting them, and stop at the first and the last", async () => {
		await tabIntoStack();
		await walk([
			["{ArrowDown}", "React"],
			["{ArrowDown}", "Rust"],
			["{ArrowUp}", "React"],
			["{ArrowUp}", "MongoDB"],
			["{ArrowUp}", "MongoDB"],
			["{ArrowDown}", "React"],
			["{ArrowDown}", "Rust"],
			["{ArrowDown}", "Terraform"],
			["{ArrowDown}", "Cloudflare"],
			["{ArrowDown}", "Cloudflare"],
			["{ArrowUp}", "Terraform"],
		]);
		expect(selectedIn("Stack")).toEqual([]);
	});

	test("Home and End jump to the first and the last row", async () => {
		await tabIntoStack();
		await walk([
			["{End}", "Cloudflare"],
			["{Home}", "MongoDB"],
			["{ArrowDown}", "React"],
			["{End}", "Cloudflare"],
		]);
		expect(selectedIn("Stack")).toEqual([]);
	});

	// The README is silent; the reference's keys pass over disabled rows.
	test("the arrows, Home and End pass over disabled rows", async () => {
		render(
			<Around>
				<Skills
					defaultValue={{
						left: [
							{ value: "MongoDB", disabled: true },
							"React",
							{ value: "Rust", disabled: true },
							"Terraform",
							{ value: "Cloudflare", disabled: true },
						],
						right: [],
					}}
				/>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expectActive("React");
		await walk([
			["{ArrowDown}", "Terraform"],
			["{ArrowDown}", "Terraform"],
			["{ArrowUp}", "React"],
			["{ArrowUp}", "React"],
			["{End}", "Terraform"],
			["{Home}", "React"],
		]);
	});

	test("typing a letter jumps to the next row that starts with it, without selecting it", async () => {
		await tabIntoStack();
		await walk([
			["t", "Terraform"],
			["c", "Cloudflare"],
			["m", "MongoDB"],
			["r", "React"],
		]);
		expect(selectedIn("Stack")).toEqual([]);
	});

	test("typing the same letter again moves on to the next row that starts with it", async () => {
		await tabIntoStack();
		await walk([
			["r", "React"],
			["r", "Rust"],
			["r", "React"],
		]);
	});

	test("typing quickly matches more than the first letter", async () => {
		await tabIntoStack();
		await walk([["ru", "Rust"]]);
	});

	test("typing ignores case, and a letter no row starts with leaves the row where it is", async () => {
		await tabIntoStack();
		await walk([
			["T", "Terraform"],
			["x", "Terraform"],
		]);
	});

	// The README gives no timing; the reference's letters build one match for 500ms.
	test("after a pause, typing starts a new match", async () => {
		await tabIntoStack();
		await walk([["r", "React"]]);
		await pause(1000);
		// "ru" would be Rust; "u" alone matches nothing.
		await walk([["u", "React"]]);
	});

	test("typing matches the label a row shows", async () => {
		render(
			<Around>
				<TransferList
					defaultValue={{
						left: [
							{ value: "p1", label: "VSebCode" },
							{ value: "p2", label: "Clean Architecture template" },
							{ value: "p3", label: "RS50 force-feedback bridge" },
						],
						right: [],
					}}
					leftTitle="Projects"
				/>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expectActive("VSebCode");
		await walk([
			["c", "Clean Architecture template"],
			["r", "RS50 force-feedback bridge"],
		]);
	});

	test("Space toggles the row the keys are on, and onSelectionChange gets the selection", async () => {
		const onSelectionChange = vi.fn<OnSelectionChange>();
		await tabIntoStack({ onSelectionChange });
		await userEvent.keyboard(" ");
		await expect.poll(() => selectedIn("Stack")).toEqual(["MongoDB"]);
		await walk([["{ArrowDown}", "React"]]);
		await userEvent.keyboard(" ");
		await expect.poll(() => selectedIn("Stack")).toEqual(["MongoDB", "React"]);
		await userEvent.keyboard(" ");
		await expect.poll(() => selectedIn("Stack")).toEqual(["MongoDB"]);
		expect(onSelectionChange).toHaveBeenCalledTimes(3);
		expect(lastSelection(onSelectionChange)).toEqual({
			left: ["MongoDB"],
			right: [],
		});
	});

	test("Shift+Down and Shift+Up move to the next or the previous row and toggle it", async () => {
		const onSelectionChange = vi.fn<OnSelectionChange>();
		await tabIntoStack({ onSelectionChange });
		await walk([["{Shift>}{ArrowDown}{/Shift}", "React"]]);
		await expect.poll(() => selectedIn("Stack")).toEqual(["React"]);
		await walk([["{Shift>}{ArrowDown}{/Shift}", "Rust"]]);
		await expect.poll(() => selectedIn("Stack")).toEqual(["React", "Rust"]);
		await walk([["{Shift>}{ArrowUp}{/Shift}", "React"]]);
		await expect.poll(() => selectedIn("Stack")).toEqual(["Rust"]);
		expect(onSelectionChange).toHaveBeenCalledTimes(3);
		expect(lastSelection(onSelectionChange)).toEqual({
			left: ["Rust"],
			right: [],
		});
	});

	// The README is silent on the ends and on disabled rows; the reference toggles only a row it
	// moves to, and passes over disabled rows as the plain arrows do.
	test("Shift+Down at the last row toggles nothing, and Shift+Down and Shift+Up pass over disabled rows", async () => {
		render(
			<Around>
				<Skills
					defaultValue={{
						left: ["React", { value: "Rust", disabled: true }, "Terraform"],
						right: [],
					}}
				/>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expectActive("React");
		await walk([["{Shift>}{ArrowDown}{/Shift}", "Terraform"]]);
		await expect.poll(() => selectedIn("Stack")).toEqual(["Terraform"]);
		await walk([["{Shift>}{ArrowDown}{/Shift}", "Terraform"]]);
		expect(selectedIn("Stack")).toEqual(["Terraform"]);
		await walk([["{Shift>}{ArrowUp}{/Shift}", "React"]]);
		await expect
			.poll(() => selectedIn("Stack"))
			.toEqual(["React", "Terraform"]);
		expect(option("Rust")).toHaveAttribute("aria-selected", "false");
	});

	// The README is silent; in the reference a click also puts the keys on the row it toggles.
	test("a click puts the keys on the row it toggles", async () => {
		render(<Skills />);
		await userEvent.click(option("Rust"));
		await expectActive("Rust");
		await walk([["{ArrowDown}", "Terraform"]]);
		expect(selectedIn("Stack")).toEqual(["Rust"]);
	});

	test.each([
		["Ctrl", "Control"],
		["Cmd", "Meta"],
	] as const)(
		"%s+A selects every row, and again selects none once all are selected",
		async (_name, modifier) => {
			const onSelectionChange = vi.fn<OnSelectionChange>();
			await tabIntoStack({
				defaultSelected: { left: ["Rust"] },
				onSelectionChange,
			});
			await userEvent.keyboard(`{${modifier}>}a{/${modifier}}`);
			await expect.poll(() => selectedIn("Stack")).toEqual(stack);
			expect(lastSelection(onSelectionChange)).toEqual({
				left: stack.toSorted(),
				right: [],
			});
			await userEvent.keyboard(`{${modifier}>}a{/${modifier}}`);
			await expect.poll(() => selectedIn("Stack")).toEqual([]);
			expect(lastSelection(onSelectionChange)).toEqual({ left: [], right: [] });
			expect(selectedIn("Highlights")).toEqual([]);
		},
	);

	test("Ctrl+A passes over disabled rows: the others count as all", async () => {
		render(
			<Around>
				<Skills
					defaultValue={{ left: stack, right: [locked, "TypeScript", "AWS"] }}
				/>
			</Around>,
		);
		button("After").focus();
		await userEvent.tab({ shift: true });
		await expectActive("TypeScript");
		await userEvent.keyboard("{Control>}a{/Control}");
		await expect
			.poll(() => selectedIn("Highlights"))
			.toEqual(["TypeScript", "AWS"]);
		await userEvent.keyboard("{Control>}a{/Control}");
		await expect.poll(() => selectedIn("Highlights")).toEqual([]);
	});

	// The README is silent; the reference scrolls the row into view inside its list.
	test("the row the keys are on scrolls into view inside the well", async () => {
		render(
			<Around>
				<TransferList
					defaultValue={{ left: many(12), right: [] }}
					leftTitle="Stack"
				/>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expectActive("Skill 1");
		expect(isWithin(option("Skill 12"), scroller("Stack"))).toBe(false);
		await walk([["{End}", "Skill 12"]]);
		await expect
			.poll(() => isWithin(option("Skill 12"), scroller("Stack")))
			.toBe(true);
		await walk([["{Home}", "Skill 1"]]);
		await expect
			.poll(() => isWithin(option("Skill 1"), scroller("Stack")))
			.toBe(true);
	});

	// The README is silent; the reference keeps each well's row while focus is elsewhere.
	test("Tab back into a well returns to the row the keys were on", async () => {
		await tabIntoStack();
		await walk([
			["{ArrowDown}", "React"],
			["{ArrowDown}", "Rust"],
		]);
		await userEvent.tab();
		await expect.element(button("Move all to Highlights")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expectActive("Rust");
	});

	test.each([
		["Enter", "{Enter}"],
		["Space", " "],
	] as const)("%s on a move button moves the rows", async (_key, key) => {
		const onChange = vi.fn<OnChange>();
		render(<Skills defaultSelected={{ left: ["Rust"] }} onChange={onChange} />);
		button("Move selected to Highlights").focus();
		await userEvent.keyboard(key);
		await expect
			.poll(() => rowsOf("Highlights"))
			.toEqual([...highlights, "Rust"]);
		expect(onChange).toHaveBeenCalledTimes(1);
		expectClick(onChange.mock.calls[0]?.[0]);
	});

	test("the second well answers the same keys", async () => {
		render(
			<Around>
				<Skills />
			</Around>,
		);
		button("After").focus();
		await userEvent.tab({ shift: true });
		await expectActive("Node.js");
		await walk([
			["{ArrowDown}", "TypeScript"],
			["{End}", "PostgreSQL"],
			["a", "AWS"],
		]);
		await userEvent.keyboard(" ");
		await expect.poll(() => selectedIn("Highlights")).toEqual(["AWS"]);
		await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
		await expect
			.poll(() => selectedIn("Highlights"))
			.toEqual(["TypeScript", "AWS"]);
		expect(selectedIn("Stack")).toEqual([]);
	});
});

describe("TransferList: size and layout", () => {
	test("it fills its container", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 640 }}>
				<Skills ref={ref} />
			</div>,
		);
		const root = must(ref.current);
		expect(Math.round(box(root).width)).toBe(640);
	});

	test("in a wide container the wells sit side by side, with the buttons in a column between them, their arrows pointing across", () => {
		render(
			<div style={{ width: 640 }}>
				<Skills />
			</div>,
		);
		const left = box(paneOf("Stack"));
		const right = box(paneOf("Highlights"));
		expect(Math.abs(left.top - right.top)).toBeLessThanOrEqual(1);
		const buttons = moveButtons().map((element) => box(element));
		for (const [index, current] of buttons.entries()) {
			expect(current.left).toBeGreaterThanOrEqual(left.right);
			expect(current.right).toBeLessThanOrEqual(right.left);
			if (index > 0) {
				expect(current.top).toBeGreaterThanOrEqual(buttons[index - 1].bottom);
			}
		}

		expect(moveButtons().map((element) => pointing(element))).toEqual([
			"right",
			"right",
			"left",
			"left",
		]);
	});

	test("in a 320px container the wells stack at full width, the buttons line up in a row between them, and the arrows point down and up", () => {
		render(
			<div style={{ width: 320 }}>
				<Skills />
			</div>,
		);
		const top = box(paneOf("Stack"));
		const bottom = box(paneOf("Highlights"));
		expect(Math.round(top.width)).toBe(320);
		expect(Math.round(bottom.width)).toBe(320);
		const buttons = moveButtons().map((element) => box(element));
		for (const [index, current] of buttons.entries()) {
			expect(current.top).toBeGreaterThanOrEqual(top.bottom);
			expect(current.bottom).toBeLessThanOrEqual(bottom.top);
			if (index === 0) {
				continue;
			}

			expect(
				Math.abs(current.top - buttons[index - 1].top),
			).toBeLessThanOrEqual(1);
			expect(current.left).toBeGreaterThanOrEqual(buttons[index - 1].right);
		}

		expect(moveButtons().map((element) => pointing(element))).toEqual([
			"down",
			"down",
			"up",
			"up",
		]);
	});

	test("it stacks when its container is narrower than 480px, and not when it's wider", () => {
		render(
			<>
				<div style={{ width: 479 }}>
					<Skills leftTitle="Narrow left" rightTitle="Narrow right" />
				</div>
				<div style={{ width: 481 }}>
					<Skills leftTitle="Wide left" rightTitle="Wide right" />
				</div>
			</>,
		);
		expect(box(paneOf("Narrow right")).top).toBeGreaterThanOrEqual(
			box(paneOf("Narrow left")).bottom,
		);
		expect(box(paneOf("Wide right")).left).toBeGreaterThanOrEqual(
			box(paneOf("Wide left")).right,
		);
	});

	test("each list is 232px tall by default, five rows: five fit, and a sixth scrolls", () => {
		render(
			<TransferList
				defaultValue={{
					left: stack,
					right: [...highlights, "Go", "Python"],
				}}
				leftTitle="Five"
				rightTitle="Six"
			/>,
		);
		for (const name of ["Five", "Six"]) {
			const list = scroller(name);
			expect(Math.round(box(list).height)).toBe(232);
		}

		expect(isScrollable(scroller("Five"))).toBe(false);
		expect(isScrollable(scroller("Six"))).toBe(true);
	});

	test("listHeight sets each list's height, and a longer list scrolls inside a well that doesn't grow", () => {
		render(
			<TransferList
				defaultValue={{ left: many(10), right: ["Go", "Rust"] }}
				leftTitle="Long"
				rightTitle="Short"
				listHeight={150}
			/>,
		);
		for (const name of ["Long", "Short"]) {
			const list = scroller(name);
			expect(Math.round(box(list).height)).toBe(150);
		}

		expect(isScrollable(scroller("Long"))).toBe(true);
		expect(isScrollable(scroller("Short"))).toBe(false);
		const longPane = paneOf("Long");
		const shortPane = paneOf("Short");
		expect(Math.round(box(longPane).height)).toBe(
			Math.round(box(shortPane).height),
		);
	});
});
