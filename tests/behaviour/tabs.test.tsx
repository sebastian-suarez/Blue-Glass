// Behaviour specs for Tabs, Tab and TabPanel, from design-system/components/Tabs/README.md and
// api.d.ts. They run at the default test viewport (414px wide), where the side variant is a row
// of tabs, except its Up and Down keys, which run at a desktop width.
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import "#ui/styles.css";
import { Tab, TabPanel, Tabs, type TabsProps, type TabValue } from "#ui";

afterEach(() => {
	cleanup();
});

type OnChange = NonNullable<TabsProps["onChange"]>;

const sections = [
	{
		value: "work",
		label: "Work",
		text: "Client work: Limber Health and Intive.",
	},
	{
		value: "projects",
		label: "Projects",
		text: "The RS50 bridge and VSebCode.",
	},
	{
		value: "experience",
		label: "Experience",
		text: "EPAM, Globant and PayPal.",
	},
	{
		value: "contact",
		label: "Contact",
		text: "Write from Medellín, Colombia.",
	},
];

type SectionsProps = React.ComponentProps<typeof Tabs> & {
	readonly disabledTabs?: readonly string[];
};

const none: readonly string[] = [];

/**
The preview's default tabs: four tabs, then a panel for each.
*/
function Sections({ disabledTabs = none, ...props }: Readonly<SectionsProps>) {
	return (
		<Tabs aria-label="Sections" {...props}>
			{sections.map((section) => (
				<Tab
					key={section.value}
					value={section.value}
					label={section.label}
					disabled={disabledTabs.includes(section.value)}
				/>
			))}
			{sections.map((section) => (
				<TabPanel key={section.value} value={section.value}>
					<p>{section.text}</p>
				</TabPanel>
			))}
		</Tabs>
	);
}

const employers = [
	"EPAM",
	"Intive",
	"Limber Health",
	"SunDevs",
	"Globant",
	"PayPal",
	"Gorilla Logic",
];

/**
The preview's scrolling row: seven pill tabs in a box too narrow for them.
*/
function Employers(props: Readonly<TabsProps>) {
	return (
		<div style={{ width: 240 }}>
			<Tabs variant="pill" aria-label="Employers" {...props}>
				{employers.map((name) => (
					<Tab key={name} value={name} label={name} />
				))}
			</Tabs>
		</div>
	);
}

/**
The default tabs with value and onChange kept in a parent's state.
*/
function ControlledSections() {
	const [value, setValue] = React.useState<TabValue | false>("work");
	return (
		<Sections
			value={value}
			onChange={(_event, next) => {
				setValue(next);
			}}
		/>
	);
}

function tab(name: string): HTMLElement {
	return screen.getByRole("tab", { name });
}

function textOf(value: string): string {
	const section = sections.find((candidate) => candidate.value === value);
	if (!section) {
		throw new Error(`no section ${value}`);
	}

	return section.text;
}

/**
A tab's disabled state, whether it's the native attribute or aria-disabled.
*/
function isDisabled(element: HTMLElement): boolean {
	return (
		(element instanceof HTMLButtonElement && element.disabled) ||
		element.getAttribute("aria-disabled") === "true"
	);
}

/**
Waits until `name` is the one selected tab and its panel the one panel shown.
*/
async function expectChosen(name: string): Promise<void> {
	await vi.waitFor(() => {
		const chosen = screen.getAllByRole("tab", { selected: true });
		expect(chosen).toHaveLength(1);
		expect(chosen[0]).toBe(tab(name));
		const shown = screen.getAllByRole("tabpanel");
		expect(shown).toHaveLength(1);
		expect(shown[0]).toBe(screen.getByRole("tabpanel", { name }));
	});
}

/**
Presses `key` and waits for focus and the selection to land on the tab named `name`.
*/
async function press(key: string, name: string): Promise<void> {
	await userEvent.keyboard(key);
	await expect.element(tab(name)).toHaveFocus();
	await expectChosen(name);
}

/**
Puts focus on a button before the tabs, so Tab enters the tab list the way a reader does.
*/
function focusBefore(): HTMLElement {
	const before = screen.getByRole("button", { name: "Before" });
	before.focus();
	return before;
}

const looks = ["underline", "pill", "side"] as const;

/**
Checks that the root carries the look's class from styles.css, and no other look's.
*/
function expectLook(root: HTMLElement | null, look: string) {
	for (const name of looks) {
		if (name === look) {
			expect(root).toHaveClass(`gl-tabs-${name}`);
		} else {
			expect(root).not.toHaveClass(`gl-tabs-${name}`);
		}
	}
}

/**
Whether `later` comes after `earlier` in document order.
*/
function isBefore(earlier: Node, later: Node): boolean {
	const range = document.createRange();
	range.setStartBefore(earlier);
	range.collapse(true);
	return range.comparePoint(later, 0) === 1;
}

/**
The element an id names, if it's in the document.
*/
function byId(id: string | null): HTMLElement | null {
	return id === null || id === ""
		? null
		: document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
}

function scrollingRow(element: HTMLElement): HTMLElement {
	for (let node = element.parentElement; node; node = node.parentElement) {
		if (
			node.scrollWidth > node.clientWidth + 1 &&
			getComputedStyle(node).overflowX !== "visible"
		) {
			return node;
		}
	}

	throw new Error("the tab isn't in a scrolling row");
}

/**
Whether the tab lies inside the visible part of the row that scrolls it.
*/
function isInView(element: HTMLElement): boolean {
	const row = scrollingRow(element).getBoundingClientRect();
	const box = element.getBoundingClientRect();
	return box.left >= row.left - 1 && box.right <= row.right + 1;
}

describe("Tabs", () => {
	test("aria-label names the tab list, which holds a tab per Tab, and the selected tab's panel is shown", async () => {
		render(<Sections defaultValue="work" />);
		const list = screen.getByRole("tablist", { name: "Sections" });
		expect(within(list).getAllByRole("tab")).toEqual(
			sections.map((section) => tab(section.label)),
		);
		await expectChosen("Work");
		expect(
			within(screen.getByRole("tabpanel", { name: "Work" })).getByText(
				textOf("work"),
			),
		).toBeVisible();
	});

	test("aria-labelledby names the tab list by another element", () => {
		render(
			<>
				<h2 id="sections-title">Site sections</h2>
				<Sections aria-label={undefined} aria-labelledby="sections-title" />
			</>,
		);
		expect(
			screen.getByRole("tablist", { name: "Site sections" }),
		).toBeInTheDocument();
	});

	test("each tab's aria-controls names its panel, and each panel's aria-labelledby names its tab", () => {
		render(<Sections defaultValue="work" />);
		for (const section of sections) {
			const element = tab(section.label);
			const panel = byId(element.getAttribute("aria-controls"));
			if (!panel) {
				throw new Error(`${section.label}'s panel isn't in the document`);
			}

			expect(panel.getAttribute("role")).toBe("tabpanel");
			expect(panel.getAttribute("aria-labelledby")).toBe(element.id);
			expect(within(panel).getByText(section.text)).toBeInTheDocument();
		}
	});

	test("generated ids don't collide between two Tabs with the same values", () => {
		const first = React.createRef<HTMLDivElement>();
		const second = React.createRef<HTMLDivElement>();
		render(
			<>
				<Sections ref={first} defaultValue="work" />
				<Sections ref={second} defaultValue="work" />
			</>,
		);
		const tabs = screen.getAllByRole("tab");
		expect(tabs).toHaveLength(8);
		const ids = tabs.flatMap((element) => [
			element.id,
			element.getAttribute("aria-controls") ?? "",
		]);
		expect(new Set(ids).size).toBe(ids.length);
		for (const element of tabs) {
			const panel = byId(element.getAttribute("aria-controls"));
			expect(panel).not.toBeNull();
			const root = first.current?.contains(element)
				? first.current
				: second.current;
			expect(root?.contains(panel)).toBe(true);
		}
	});

	test("without value or defaultValue the first enabled tab is selected, and onChange isn't called", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Sections disabledTabs={["work"]} onChange={onChange} />);
		await expectChosen("Projects");
		expect(onChange).not.toHaveBeenCalled();
	});

	test.each(["underline", "pill", "side"] as const)(
		"a click selects a %s tab and shows its panel",
		async (variant) => {
			render(<Sections variant={variant} defaultValue="work" />);
			await userEvent.click(tab("Contact"));
			await expectChosen("Contact");
		},
	);

	test("defaultValue selects the first tab, and a click selects another (uncontrolled)", async () => {
		render(<Sections defaultValue="experience" />);
		await expectChosen("Experience");
		await userEvent.click(tab("Projects"));
		await expectChosen("Projects");
		expect(screen.getByText(textOf("projects"))).toBeVisible();
		expect(screen.getByText(textOf("experience"))).not.toBeVisible();
	});

	test("a click calls onChange with the click event and the tab's value", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Sections defaultValue="work" onChange={onChange} />);
		await userEvent.click(tab("Projects"));
		await expectChosen("Projects");
		expect(onChange).toHaveBeenCalledTimes(1);
		const [event, value] = onChange.mock.calls[0];
		expect(value).toBe("projects");
		expect(event.type).toBe("click");
		expect(event.nativeEvent).toBeInstanceOf(MouseEvent);
		expect(tab("Projects").contains(event.target as Node)).toBe(true);
	});

	test("a click on the selected tab doesn't call onChange, since the value doesn't change", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Sections defaultValue="work" onChange={onChange} />);
		await userEvent.click(tab("Work"));
		await expectChosen("Work");
		expect(onChange).not.toHaveBeenCalled();
	});

	test("value controls the selection: a click calls onChange, and the selection waits for the new value", async () => {
		const onChange = vi.fn<OnChange>();
		const { rerender } = render(<Sections value="work" onChange={onChange} />);
		await userEvent.click(tab("Projects"));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][1]).toBe("projects");
		await expectChosen("Work");
		rerender(<Sections value="projects" onChange={onChange} />);
		await expectChosen("Projects");
	});

	test("value false selects no tab and shows no panel, and the tab list stays one tab stop", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<>
				<button type="button">Before</button>
				<Sections value={false} onChange={onChange} />
				<button type="button">After</button>
			</>,
		);
		expect(screen.queryAllByRole("tab", { selected: true })).toEqual([]);
		expect(screen.queryAllByRole("tabpanel")).toEqual([]);
		focusBefore();
		await userEvent.tab();
		await vi.waitFor(() => {
			expect(document.activeElement).toHaveAttribute("role", "tab");
		});
		await userEvent.tab();
		await expect
			.element(screen.getByRole("button", { name: "After" }))
			.toHaveFocus();
		await userEvent.click(tab("Contact"));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][1]).toBe("contact");
		expect(screen.queryAllByRole("tab", { selected: true })).toEqual([]);
	});

	test("defaultValue false starts with no tab selected, and a click selects one", async () => {
		render(<Sections defaultValue={false} />);
		expect(screen.queryAllByRole("tab", { selected: true })).toEqual([]);
		expect(screen.queryAllByRole("tabpanel")).toEqual([]);
		await userEvent.click(tab("Experience"));
		await expectChosen("Experience");
	});

	test("a Tab's value defaults to its position", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Tabs aria-label="Sections" defaultValue={1} onChange={onChange}>
				<Tab label="Work" />
				<Tab label="Projects" />
				<Tab label="Experience" />
				<TabPanel value={0}>Work panel</TabPanel>
				<TabPanel value={1}>Projects panel</TabPanel>
				<TabPanel value={2}>Experience panel</TabPanel>
			</Tabs>,
		);
		await expectChosen("Projects");
		expect(screen.getByText("Projects panel")).toBeVisible();
		await userEvent.click(tab("Experience"));
		await expectChosen("Experience");
		expect(onChange.mock.calls.map(([, value]) => value)).toEqual([2]);
	});

	test("label names a tab, and children name it when label isn't set", () => {
		render(
			<Tabs aria-label="Sections">
				<Tab value="work" label="Work">
					Not the label
				</Tab>
				<Tab value="projects">Projects</Tab>
			</Tabs>,
		);
		expect(screen.getAllByRole("tab")).toEqual([tab("Work"), tab("Projects")]);
		expect(screen.queryByText("Not the label")).toBeNull();
	});

	test("icon renders inside the tab, before its label", () => {
		render(
			<Tabs aria-label="VSebCode">
				<Tab
					value="overview"
					icon={<span data-testid="overview-icon" />}
					label="Overview"
				/>
				<Tab value="stack" label="Stack" />
			</Tabs>,
		);
		const icon = screen.getByTestId("overview-icon");
		expect(tab("Overview").contains(icon)).toBe(true);
		const label = within(tab("Overview")).getByText("Overview");
		expect(isBefore(icon, label)).toBe(true);
	});

	test("a disabled tab is marked disabled, and a press doesn't select it", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<Sections
				defaultValue="work"
				disabledTabs={["projects"]}
				onChange={onChange}
			/>,
		);
		expect(isDisabled(tab("Projects"))).toBe(true);
		expect(isDisabled(tab("Work"))).toBe(false);
		// Forced: Playwright won't press an element that says it's disabled.
		await userEvent.click(tab("Projects"), { force: true });
		await expectChosen("Work");
		expect(onChange).not.toHaveBeenCalled();
	});

	test("TabPanel keeps hidden panels' content mounted by default, and keepMounted={false} renders it only while selected", async () => {
		render(
			<Tabs aria-label="Sections" defaultValue="work">
				<Tab value="work" label="Work" />
				<Tab value="projects" label="Projects" />
				<TabPanel value="work">
					<p>Kept while hidden.</p>
				</TabPanel>
				<TabPanel value="projects" keepMounted={false}>
					<p>Only while selected.</p>
				</TabPanel>
			</Tabs>,
		);
		expect(screen.queryByText("Only while selected.")).toBeNull();
		await userEvent.click(tab("Projects"));
		await expect
			.element(screen.getByText("Only while selected."))
			.toBeVisible();
		await expect
			.element(screen.getByText("Kept while hidden."))
			.not.toBeVisible();
		await userEvent.click(tab("Work"));
		await expect
			.poll(() => screen.queryByText("Only while selected."))
			.toBeNull();
		await expect.element(screen.getByText("Kept while hidden.")).toBeVisible();
	});

	test("everything that isn't a Tab goes in the panel area, outside the tab list", async () => {
		render(
			<Tabs aria-label="Sections" defaultValue="work">
				<Tab value="work" label="Work" />
				<Tab value="projects" label="Projects" />
				<div data-testid="panel-area">
					<TabPanel value="work">Work panel</TabPanel>
					<TabPanel value="projects">Projects panel</TabPanel>
				</div>
				<p>A note under the tabs.</p>
			</Tabs>,
		);
		const list = screen.getByRole("tablist");
		const area = screen.getByTestId("panel-area");
		const note = screen.getByText("A note under the tabs.");
		expect(list.contains(area)).toBe(false);
		expect(list.contains(note)).toBe(false);
		expect(note).toBeVisible();
		await expectChosen("Work");
		expect(area.contains(screen.getByRole("tabpanel", { name: "Work" }))).toBe(
			true,
		);
		await userEvent.click(tab("Projects"));
		await expectChosen("Projects");
		expect(screen.getByText("Projects panel")).toBeVisible();
	});

	test("a panel fades in when its tab is chosen, but not on first render", async () => {
		const started: EventTarget[] = [];
		const note = (event: Event) => {
			if (event.target) {
				started.push(event.target);
			}
		};

		document.addEventListener("animationstart", note, { capture: true });
		document.addEventListener("transitionrun", note, { capture: true });
		try {
			render(<Sections defaultValue="work" />);
			const work = screen.getByRole("tabpanel", { name: "Work" });
			expect(work.getAnimations({ subtree: true })).toEqual([]);
			await userEvent.click(tab("Projects"));
			const projects = screen.getByRole("tabpanel", { name: "Projects" });
			await expect
				.poll(() =>
					started.some(
						(target) => target instanceof Node && projects.contains(target),
					),
				)
				.toBe(true);
		} finally {
			document.removeEventListener("animationstart", note, { capture: true });
			document.removeEventListener("transitionrun", note, { capture: true });
		}
	});

	test("Tabs' ref is its root element, which takes className and the other attributes", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Sections
				ref={ref}
				className="site-tabs"
				data-testid="tabs"
				defaultValue="work"
			/>,
		);
		expect(ref.current).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(screen.getByTestId("tabs"));
		expect(ref.current).toHaveClass("site-tabs");
		expect(ref.current?.contains(screen.getByRole("tablist"))).toBe(true);
		expect(ref.current?.contains(screen.getByRole("tabpanel"))).toBe(true);
	});

	test("a Tab's ref is its tab button, and a TabPanel's ref is its tab panel", () => {
		const tabRef = React.createRef<HTMLButtonElement>();
		const panelRef = React.createRef<HTMLDivElement>();
		render(
			<Tabs aria-label="Sections" defaultValue="work">
				<Tab ref={tabRef} value="work" label="Work" title="Client work" />
				<Tab value="projects" label="Projects" />
				<TabPanel ref={panelRef} value="work" className="work-panel">
					Work panel
				</TabPanel>
				<TabPanel value="projects">Projects panel</TabPanel>
			</Tabs>,
		);
		expect(tabRef.current).toBeInstanceOf(HTMLButtonElement);
		expect(tabRef.current).toBe(tab("Work"));
		expect(tabRef.current).toHaveAttribute("title", "Client work");
		expect(panelRef.current).toBeInstanceOf(HTMLDivElement);
		expect(panelRef.current).toBe(
			screen.getByRole("tabpanel", { name: "Work" }),
		);
		expect(panelRef.current).toHaveClass("work-panel");
	});

	test("variant defaults to underline: the root takes gl-tabs-underline", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Sections ref={ref} defaultValue="work" />);
		expectLook(ref.current, "underline");
	});

	test.each(looks)("variant %s gives the root gl-tabs-%s", (variant) => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Sections ref={ref} variant={variant} defaultValue="work" />);
		expectLook(ref.current, variant);
	});

	test.each(["underline", "pill"] as const)(
		"fullWidth makes %s tabs share the row equally",
		(variant) => {
			const ref = React.createRef<HTMLDivElement>();
			render(
				<div style={{ width: 400 }}>
					<Tabs ref={ref} fullWidth aria-label="Sections" variant={variant}>
						<Tab label="Work" />
						<Tab label="Projects" />
						<Tab label="Experience" />
					</Tabs>
				</div>,
			);
			expect(ref.current).toHaveClass("gl-tabs-full");
			const boxes = screen
				.getAllByRole("tab")
				.map((element) => element.getBoundingClientRect());
			const widths = boxes.map((box) => box.width);
			expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
			expect(boxes[2].right - boxes[0].left).toBeGreaterThan(360);
		},
	);

	test.each(["underline", "pill"] as const)(
		"without fullWidth, %s tabs keep the width of their labels",
		(variant) => {
			const ref = React.createRef<HTMLDivElement>();
			render(
				<div style={{ width: 400 }}>
					<Tabs ref={ref} aria-label="Sections" variant={variant}>
						<Tab label="Work" />
						<Tab label="Experience" />
					</Tabs>
				</div>,
			);
			expect(ref.current).not.toHaveClass("gl-tabs-full");
			expect(tab("Work").getBoundingClientRect().width).toBeLessThan(
				tab("Experience").getBoundingClientRect().width,
			);
		},
	);

	test("in a scrolling row the selected tab is scrolled into view on first render", async () => {
		render(<Employers defaultValue="Gorilla Logic" />);
		await vi.waitFor(() => {
			expect(isInView(tab("Gorilla Logic"))).toBe(true);
		});
		expect(isInView(tab("EPAM"))).toBe(false);
	});

	test("in a scrolling row a tab selected through value is scrolled into view", async () => {
		const { rerender } = render(<Employers value="EPAM" />);
		await vi.waitFor(() => {
			expect(isInView(tab("EPAM"))).toBe(true);
		});
		expect(isInView(tab("Gorilla Logic"))).toBe(false);
		rerender(<Employers value="Gorilla Logic" />);
		// The row may scroll smoothly.
		await vi.waitFor(
			() => {
				expect(isInView(tab("Gorilla Logic"))).toBe(true);
			},
			{ timeout: 3000 },
		);
	});
});

describe("Tabs keyboard", () => {
	test("Tab moves into the tab list at the selected tab, and Tab again into its panel", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Sections defaultValue="experience" />
				<button type="button">After</button>
			</>,
		);
		const before = focusBefore();
		await userEvent.tab();
		await expect.element(tab("Experience")).toHaveFocus();
		await userEvent.tab();
		const panel = screen.getByRole("tabpanel", { name: "Experience" });
		await vi.waitFor(() => {
			expect(panel.contains(document.activeElement)).toBe(true);
		});
		await userEvent.tab();
		await expect
			.element(screen.getByRole("button", { name: "After" }))
			.toHaveFocus();
		await userEvent.tab({ shift: true });
		await userEvent.tab({ shift: true });
		await expect.element(tab("Experience")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(before).toHaveFocus();
	});

	describe.each(["underline", "pill"] as const)("the %s variant", (variant) => {
		test("Right and Left move to the next or previous tab and select it, wrapping at the ends", async () => {
			render(
				<>
					<button type="button">Before</button>
					<Sections variant={variant} defaultValue="work" />
				</>,
			);
			focusBefore();
			await userEvent.tab();
			await expect.element(tab("Work")).toHaveFocus();
			await press("{ArrowRight}", "Projects");
			await press("{ArrowRight}", "Experience");
			await press("{ArrowRight}", "Contact");
			await press("{ArrowRight}", "Work");
			await press("{ArrowLeft}", "Contact");
			await press("{ArrowLeft}", "Experience");
			expect(screen.getByText(textOf("experience"))).toBeVisible();
		});

		test("the arrows skip disabled tabs, at the ends too", async () => {
			render(
				<>
					<button type="button">Before</button>
					<Sections
						variant={variant}
						defaultValue="projects"
						disabledTabs={["work", "experience"]}
					/>
				</>,
			);
			focusBefore();
			await userEvent.tab();
			await expect.element(tab("Projects")).toHaveFocus();
			await press("{ArrowRight}", "Contact");
			await press("{ArrowRight}", "Projects");
			await press("{ArrowLeft}", "Contact");
			await press("{ArrowLeft}", "Projects");
		});
	});

	describe.each(looks)("the %s variant", (variant) => {
		test("Home and End select the first and last tab", async () => {
			render(
				<>
					<button type="button">Before</button>
					<Sections variant={variant} defaultValue="projects" />
				</>,
			);
			focusBefore();
			await userEvent.tab();
			await expect.element(tab("Projects")).toHaveFocus();
			await press("{End}", "Contact");
			await press("{Home}", "Work");
		});

		test("Home and End skip disabled tabs", async () => {
			render(
				<>
					<button type="button">Before</button>
					<Sections
						variant={variant}
						defaultValue="projects"
						disabledTabs={["work", "contact"]}
					/>
				</>,
			);
			focusBefore();
			await userEvent.tab();
			await expect.element(tab("Projects")).toHaveFocus();
			await press("{End}", "Experience");
			await press("{Home}", "Projects");
		});
	});

	test("onChange reports each key's selection with an event and the new value", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<>
				<button type="button">Before</button>
				<Sections defaultValue="work" onChange={onChange} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		await press("{ArrowRight}", "Projects");
		await press("{End}", "Contact");
		await press("{Home}", "Work");
		expect(onChange.mock.calls.map(([, value]) => value)).toEqual([
			"projects",
			"contact",
			"work",
		]);
		for (const [event] of onChange.mock.calls) {
			expect(event.nativeEvent).toBeInstanceOf(Event);
			expect(typeof event.type).toBe("string");
		}
	});

	describe("the side variant at a desktop width", () => {
		// Above 700px the side selector is a column beside its panels, so its keys run up and down.
		beforeEach(async () => {
			await page.viewport(1280, 900);
		});

		afterEach(async () => {
			await page.viewport(414, 896);
		});

		test("Down and Up move to the next or previous tab and select it, wrapping at the ends and skipping disabled tabs", async () => {
			render(
				<>
					<button type="button">Before</button>
					<Sections
						variant="side"
						defaultValue="work"
						disabledTabs={["experience"]}
					/>
				</>,
			);
			focusBefore();
			await userEvent.tab();
			await expect.element(tab("Work")).toHaveFocus();
			await press("{ArrowDown}", "Projects");
			await press("{ArrowDown}", "Contact");
			await press("{ArrowDown}", "Work");
			await press("{ArrowUp}", "Contact");
			await press("{ArrowUp}", "Projects");
		});
	});

	test("with value and onChange kept in a parent's state, the keys select through the parent", async () => {
		render(
			<>
				<button type="button">Before</button>
				<ControlledSections />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		await press("{ArrowLeft}", "Contact");
		await press("{ArrowRight}", "Work");
		await press("{ArrowRight}", "Projects");
	});
});
