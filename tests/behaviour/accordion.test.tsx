import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	PaneAccordion,
	type AccordionProps,
	type PaneAccordionItem,
	type PaneAccordionProps,
} from "#ui";

afterEach(() => {
	cleanup();
});

type OnChange = NonNullable<AccordionProps["onChange"]>;
type OnPaneChange = NonNullable<PaneAccordionProps["onChange"]>;

const roles = [
	{ employer: "EPAM", text: "Tools for surgeons to study the cases they led." },
	{
		employer: "Intive",
		text: "Two microservices between the CMS and the apps.",
	},
	{ employer: "Globant", text: "Nike's CMS, mainly localization." },
	{ employer: "SunDevs", text: "A fitness app for 1,000 gym clients." },
];

type RowProps = React.ComponentProps<typeof Accordion> & {
	readonly summary: string;
	readonly details: string;
};

function Row({ summary, details, ...props }: Readonly<RowProps>) {
	return (
		<Accordion {...props}>
			<AccordionSummary>{summary}</AccordionSummary>
			<AccordionDetails>
				<p>{details}</p>
			</AccordionDetails>
		</Accordion>
	);
}

type CareerProps = {
	readonly disabled?: readonly string[];
	readonly open?: readonly string[];
};

const none: readonly string[] = [];

function Career({ disabled = none, open = none }: CareerProps) {
	return (
		<div className="gl-accordion-surface">
			{roles.map((role) => (
				<Row
					key={role.employer}
					summary={role.employer}
					details={role.text}
					disabled={disabled.includes(role.employer)}
					defaultExpanded={open.includes(role.employer)}
				/>
			))}
		</div>
	);
}

function SingleOpenCareer() {
	const [open, setOpen] = React.useState<string | false>("Intive");
	return (
		<div className="gl-accordion-surface">
			{roles.map((role) => (
				<Row
					key={role.employer}
					summary={role.employer}
					details={role.text}
					expanded={open === role.employer}
					onChange={(_event, expanded) => {
						setOpen(expanded ? role.employer : false);
					}}
				/>
			))}
		</div>
	);
}

type Pane = {
	id?: string;
	title: string;
	text: string;
	chips: string[];
	tone?: PaneAccordionItem["tone"];
};

const panes: Pane[] = [
	{
		title: "Backend",
		text: "Node.js and TypeScript services.",
		chips: ["Node.js", "NestJS"],
	},
	{
		title: "Frontend and mobile",
		tone: "alt",
		text: "React and React Native apps.",
		chips: ["React", "Material UI"],
	},
	{
		title: "Data and cloud",
		text: "PostgreSQL and MongoDB, on AWS.",
		chips: ["PostgreSQL", "IAM"],
	},
	{
		id: "making",
		title: "Hardware",
		tone: "accent",
		text: "Rust on embedded targets.",
		chips: ["Rust", "Carbon fiber"],
	},
];

const paneIds = ["backend", "frontend-and-mobile", "data-and-cloud", "making"];

function Capabilities({ onChange }: { readonly onChange?: OnPaneChange }) {
	const [open, setOpen] = React.useState<string[]>([]);
	return (
		<PaneAccordion
			items={panes}
			open={open}
			onChange={(event, next) => {
				setOpen(next);
				onChange?.(event, next);
			}}
		/>
	);
}

function button(name: string | RegExp): HTMLElement {
	return screen.getByRole("button", { name });
}

function isDisabled(element: HTMLElement): boolean {
	return (
		(element instanceof HTMLButtonElement && element.disabled) ||
		element.getAttribute("aria-disabled") === "true"
	);
}

async function expectHidden(text: string): Promise<void> {
	await vi.waitFor(() => {
		const element = screen.queryByText(text);
		if (element) {
			expect(element).not.toBeVisible();
		}
	});
}

function ancestors(element: Element): Element[] {
	const found: Element[] = [];
	for (let node = element.parentElement; node; node = node.parentElement) {
		found.push(node);
	}

	return found;
}

function isShown(element: Element): boolean {
	if (
		!element.checkVisibility({
			opacityProperty: true,
			visibilityProperty: true,
		})
	) {
		return false;
	}

	const box = element.getBoundingClientRect();
	const clips = ancestors(element).map((node) => ({
		style: getComputedStyle(node),
		box: node.getBoundingClientRect(),
	}));
	const acrossClips = clips.filter(
		({ style }) => style.overflowX !== "visible",
	);
	const downClips = clips.filter(({ style }) => style.overflowY !== "visible");
	const left = Math.max(box.left, ...acrossClips.map((clip) => clip.box.left));
	const right = Math.min(
		box.right,
		...acrossClips.map((clip) => clip.box.right),
	);
	const top = Math.max(box.top, ...downClips.map((clip) => clip.box.top));
	const bottom = Math.min(
		box.bottom,
		...downClips.map((clip) => clip.box.bottom),
	);
	return right > left && bottom > top;
}

function isBefore(earlier: Node, later: Node): boolean {
	const range = document.createRange();
	range.setStartBefore(earlier);
	range.collapse(true);
	return range.comparePoint(later, 0) === 1;
}

function focusBefore(): HTMLElement {
	const before = button("Before");
	before.focus();
	return before;
}

async function move(key: string, name: string): Promise<void> {
	await userEvent.keyboard(key);
	await expect.element(button(name)).toHaveFocus();
}

function expandedPanes(): string[] {
	return panes
		.filter(
			(item) => button(item.title).getAttribute("aria-expanded") === "true",
		)
		.map((item) => item.title);
}

function expandedIds(): string[] {
	return paneIds
		.filter(
			(_id, index) =>
				button(panes[index].title).getAttribute("aria-expanded") === "true",
		)
		.toSorted();
}

describe("Accordion", () => {
	test("a row starts closed, and a press on its summary opens and closes it", async () => {
		render(<Row summary="EPAM" details={roles[0].text} />);
		expect(button("EPAM")).toHaveAttribute("aria-expanded", "false");
		await expectHidden(roles[0].text);
		await userEvent.click(button("EPAM"));
		await expect
			.element(button("EPAM"))
			.toHaveAttribute("aria-expanded", "true");
		await expect.element(await screen.findByText(roles[0].text)).toBeVisible();
		await userEvent.click(button("EPAM"));
		await expect
			.element(button("EPAM"))
			.toHaveAttribute("aria-expanded", "false");
		await expectHidden(roles[0].text);
	});

	test("defaultExpanded starts the row open", async () => {
		render(<Row defaultExpanded summary="EPAM" details={roles[0].text} />);
		expect(button("EPAM")).toHaveAttribute("aria-expanded", "true");
		await expect.element(screen.getByText(roles[0].text)).toBeVisible();
	});

	test("onChange gets the click event and the requested state", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Row summary="EPAM" details={roles[0].text} onChange={onChange} />);
		await userEvent.click(button("EPAM"));
		await expect
			.element(button("EPAM"))
			.toHaveAttribute("aria-expanded", "true");
		await userEvent.click(button("EPAM"));
		await expect
			.element(button("EPAM"))
			.toHaveAttribute("aria-expanded", "false");
		expect(onChange.mock.calls.map(([, expanded]) => expanded)).toEqual([
			true,
			false,
		]);
		for (const [event] of onChange.mock.calls) {
			expect(event.type).toBe("click");
			expect(event.nativeEvent).toBeInstanceOf(MouseEvent);
			expect(button("EPAM").contains(event.target as Node)).toBe(true);
		}
	});

	test("expanded controls the row: a press calls onChange, and the row waits for the new value", async () => {
		const onChange = vi.fn<OnChange>();
		const { rerender } = render(
			<Row
				expanded={false}
				summary="EPAM"
				details={roles[0].text}
				onChange={onChange}
			/>,
		);
		await userEvent.click(button("EPAM"));
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][1]).toBe(true);
		expect(button("EPAM")).toHaveAttribute("aria-expanded", "false");
		await expectHidden(roles[0].text);
		rerender(
			<Row
				expanded
				summary="EPAM"
				details={roles[0].text}
				onChange={onChange}
			/>,
		);
		await expect
			.element(button("EPAM"))
			.toHaveAttribute("aria-expanded", "true");
		await expect.element(await screen.findByText(roles[0].text)).toBeVisible();
		await userEvent.click(button("EPAM"));
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange.mock.calls[1][1]).toBe(false);
		expect(button("EPAM")).toHaveAttribute("aria-expanded", "true");
	});

	test("rows controlled from a parent open one at a time", async () => {
		render(<SingleOpenCareer />);
		expect(button("Intive")).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(button("EPAM"));
		await expect
			.element(button("EPAM"))
			.toHaveAttribute("aria-expanded", "true");
		expect(button("Intive")).toHaveAttribute("aria-expanded", "false");
		await expectHidden(roles[1].text);
		await userEvent.click(button("EPAM"));
		await expect
			.element(button("EPAM"))
			.toHaveAttribute("aria-expanded", "false");
		for (const role of roles) {
			expect(button(role.employer)).toHaveAttribute("aria-expanded", "false");
		}
	});

	test("disabled marks the summary disabled: Tab passes it, and a press neither focuses nor opens it", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<>
				<button type="button">Before</button>
				<div className="gl-accordion-surface">
					<Row summary="EPAM" details={roles[0].text} />
					<Row
						disabled
						summary="Résumé as a PDF"
						details="Coming with the next résumé update."
						onChange={onChange}
					/>
					<Row summary="Intive" details={roles[1].text} />
				</div>
			</>,
		);
		const disabled = button("Résumé as a PDF");
		expect(isDisabled(disabled)).toBe(true);
		expect(isDisabled(button("EPAM"))).toBe(false);
		focusBefore();
		await userEvent.tab();
		await expect.element(button("EPAM")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("Intive")).toHaveFocus();
		await userEvent.click(disabled, { force: true });
		expect(onChange).not.toHaveBeenCalled();
		expect(disabled).toHaveAttribute("aria-expanded", "false");
		expect(disabled).not.toHaveFocus();
		await expectHidden("Coming with the next résumé update.");
	});

	test("the summary is a button inside a level 3 heading by default", () => {
		render(<Row summary="EPAM" details={roles[0].text} />);
		const heading = screen.getByRole("heading", { level: 3 });
		expect(within(heading).getByRole("button")).toBe(button("EPAM"));
	});

	test.each([2, 3, 4, 5, 6] as const)(
		"headingLevel %i puts the summary button inside a heading of that level",
		(level) => {
			render(
				<Row headingLevel={level} summary="EPAM" details={roles[0].text} />,
			);
			const heading = screen.getByRole("heading", { level });
			expect(within(heading).getByRole("button")).toBe(button("EPAM"));
		},
	);

	test("secondary and meta render in the summary button, after the title", () => {
		render(
			<Accordion>
				<AccordionSummary
					secondary="Frontend Software Engineer"
					meta="Mar 2026 – Present"
				>
					EPAM
				</AccordionSummary>
				<AccordionDetails>
					<p>{roles[0].text}</p>
				</AccordionDetails>
			</Accordion>,
		);
		const summary = button(/^EPAM/v);
		const title = within(summary).getByText("EPAM");
		const secondary = within(summary).getByText("Frontend Software Engineer");
		const meta = within(summary).getByText("Mar 2026 – Present");
		expect(isBefore(title, secondary)).toBe(true);
		expect(isBefore(secondary, meta)).toBe(true);
	});

	test("expandIcon renders in the summary button", () => {
		render(
			<Accordion>
				<AccordionSummary expandIcon={<span data-testid="chevron" />}>
					How this site works
				</AccordionSummary>
				<AccordionDetails>
					<p>A merged pull request publishes it.</p>
				</AccordionDetails>
			</Accordion>,
		);
		expect(
			button("How this site works").contains(screen.getByTestId("chevron")),
		).toBe(true);
	});

	test("AccordionDetails' meta closes the details, after the paragraphs", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Accordion defaultExpanded>
				<AccordionSummary>Intive</AccordionSummary>
				<AccordionDetails ref={ref} meta="Remote">
					<p>I owned both services.</p>
					<p>Payloads shrank by 10%.</p>
				</AccordionDetails>
			</Accordion>,
		);
		const meta = screen.getByText("Remote");
		expect(ref.current?.contains(meta)).toBe(true);
		expect(isBefore(screen.getByText("Payloads shrank by 10%."), meta)).toBe(
			true,
		);
		await expect.element(meta).toBeVisible();
	});

	test("AccordionDetails takes the full-width class with inset={false}, and not by default", () => {
		const inset = React.createRef<HTMLDivElement>();
		const full = React.createRef<HTMLDivElement>();
		render(
			<>
				<Accordion defaultExpanded>
					<AccordionSummary>EPAM</AccordionSummary>
					<AccordionDetails ref={inset}>
						<p>{roles[0].text}</p>
					</AccordionDetails>
				</Accordion>
				<Accordion defaultExpanded>
					<AccordionSummary>VSebCode</AccordionSummary>
					<AccordionDetails ref={full} inset={false}>
						<p>A fork of microsoft/vscode.</p>
					</AccordionDetails>
				</Accordion>
			</>,
		);
		expect(full.current).toHaveClass("gl-accordion-details-full");
		expect(inset.current).not.toHaveClass("gl-accordion-details-full");
	});

	test("the refs: Accordion's is the row, which takes className; AccordionSummary's is the summary button; AccordionDetails' holds the details", () => {
		const row = React.createRef<HTMLDivElement>();
		const summary = React.createRef<HTMLButtonElement>();
		const details = React.createRef<HTMLDivElement>();
		render(
			<Accordion ref={row} defaultExpanded className="career-row">
				<AccordionSummary ref={summary} title="EPAM, since March 2026">
					EPAM
				</AccordionSummary>
				<AccordionDetails ref={details} className="career-details">
					<p>{roles[0].text}</p>
				</AccordionDetails>
			</Accordion>,
		);
		expect(row.current).toBeInstanceOf(HTMLDivElement);
		expect(row.current).toHaveClass("career-row");
		expect(row.current?.contains(button("EPAM"))).toBe(true);
		expect(row.current?.contains(screen.getByText(roles[0].text))).toBe(true);
		expect(summary.current).toBeInstanceOf(HTMLButtonElement);
		expect(summary.current).toBe(button("EPAM"));
		expect(summary.current).toHaveAttribute("title", "EPAM, since March 2026");
		expect(details.current).toBeInstanceOf(HTMLDivElement);
		expect(details.current).toHaveClass("career-details");
		expect(details.current?.contains(screen.getByText(roles[0].text))).toBe(
			true,
		);
	});

	test("closed details stay in the document, hidden, and TransitionProps.unmountOnExit takes them out", async () => {
		render(
			<>
				<Row defaultExpanded summary="EPAM" details="Kept while closed." />
				<Row
					defaultExpanded
					summary="Intive"
					details="Dropped once closed."
					TransitionProps={{ unmountOnExit: true }}
				/>
				<Row summary="Globant" details="Closed from the start." />
				<Row
					summary="SunDevs"
					details="Not there until opened."
					TransitionProps={{ unmountOnExit: true }}
				/>
			</>,
		);
		expect(screen.getByText("Closed from the start.")).not.toBeVisible();
		expect(screen.queryByText("Not there until opened.")).toBeNull();
		await userEvent.click(button("EPAM"));
		await userEvent.click(button("Intive"));
		await expect
			.element(screen.getByText("Kept while closed."))
			.not.toBeVisible();
		await expect
			.poll(() => screen.queryByText("Dropped once closed."))
			.toBeNull();
		expect(screen.getByText("Kept while closed.")).toBeInTheDocument();
		await userEvent.click(button("SunDevs"));
		await expect
			.element(await screen.findByText("Not there until opened."))
			.toBeVisible();
	});

	test("TransitionProps.mountOnEnter leaves the details out of the document until the row first opens", async () => {
		render(
			<Row
				summary="EPAM"
				details={roles[0].text}
				TransitionProps={{ mountOnEnter: true }}
			/>,
		);
		expect(screen.queryByText(roles[0].text)).toBeNull();
		await userEvent.click(button("EPAM"));
		await expect.element(await screen.findByText(roles[0].text)).toBeVisible();
		await userEvent.click(button("EPAM"));
		await expect.element(screen.getByText(roles[0].text)).not.toBeVisible();
	});

	test.each([
		{ name: "by default", timeout: undefined, enter: 300, exit: 200 },
		{
			name: "of { enter: 600, exit: 400 }",
			timeout: { enter: 600, exit: 400 },
			enter: 600,
			exit: 400,
		},
		{ name: "of 500", timeout: 500, enter: 500, exit: 500 },
	])(
		"with a TransitionProps.timeout $name, the details take $enter ms to open and $exit ms to close",
		async ({ timeout, enter, exit }) => {
			const pressed: number[] = [];
			const entered: number[] = [];
			const exited: number[] = [];
			const callbacks = {
				onEntered() {
					entered.push(performance.now());
				},
				onExited() {
					exited.push(performance.now());
				},
			};
			render(
				<Accordion
					TransitionProps={
						timeout === undefined ? callbacks : { ...callbacks, timeout }
					}
				>
					<AccordionSummary
						onClick={() => {
							pressed.push(performance.now());
						}}
					>
						EPAM
					</AccordionSummary>
					<AccordionDetails>
						<p>{roles[0].text}</p>
					</AccordionDetails>
				</Accordion>,
			);
			await userEvent.click(button("EPAM"));
			await vi.waitFor(
				() => {
					expect(entered).toHaveLength(1);
				},
				{ timeout: 5000 },
			);
			const exitedBefore = exited.length;
			await userEvent.click(button("EPAM"));
			await vi.waitFor(
				() => {
					expect(exited.length).toBeGreaterThan(exitedBefore);
				},
				{ timeout: 5000 },
			);
			expect(pressed).toHaveLength(2);
			expect(entered[0] - pressed[0]).toBeGreaterThanOrEqual(enter - 5);
			expect(exited[exitedBefore] - pressed[1]).toBeGreaterThanOrEqual(
				exit - 5,
			);
		},
	);
});

describe("Accordion keyboard", () => {
	test("Tab reaches each summary in turn, and Enter and Space open and close the row", async () => {
		const onChange = vi.fn<OnChange>();
		render(
			<>
				<button type="button">Before</button>
				<div className="gl-accordion-surface">
					{roles.map((role) => (
						<Row
							key={role.employer}
							summary={role.employer}
							details={role.text}
							onChange={role.employer === "Intive" ? onChange : undefined}
						/>
					))}
				</div>
			</>,
		);
		focusBefore();
		await userEvent.tab();
		await expect.element(button("EPAM")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("Intive")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect
			.element(button("Intive"))
			.toHaveAttribute("aria-expanded", "true");
		await expect.element(await screen.findByText(roles[1].text)).toBeVisible();
		await userEvent.keyboard("[Space]");
		await expect
			.element(button("Intive"))
			.toHaveAttribute("aria-expanded", "false");
		await expectHidden(roles[1].text);
		expect(onChange.mock.calls.map(([, expanded]) => expanded)).toEqual([
			true,
			false,
		]);
		await userEvent.tab();
		await expect.element(button("Globant")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("SunDevs")).toHaveFocus();
	});

	test("Down and Up move between the summaries of one list, and Home and End jump to the first and last", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Career open={["Intive"]} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		await expect.element(button("EPAM")).toHaveFocus();
		await move("{ArrowDown}", "Intive");
		await move("{ArrowDown}", "Globant");
		await move("{ArrowUp}", "Intive");
		await move("{End}", "SunDevs");
		await move("{Home}", "EPAM");
	});

	test("the arrows, Home and End pass over disabled rows' summaries", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Career disabled={["EPAM", "Globant"]} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		await expect.element(button("Intive")).toHaveFocus();
		await move("{End}", "SunDevs");
		await move("{ArrowUp}", "Intive");
		await move("{ArrowDown}", "SunDevs");
		await move("{Home}", "Intive");
	});

	test("the arrows, Home and End stay within one list", async () => {
		render(
			<>
				<button type="button">Before</button>
				<div className="gl-accordion-surface">
					<Row summary="EPAM" details={roles[0].text} />
					<Row summary="Intive" details={roles[1].text} />
				</div>
				<div className="gl-accordion-surface">
					<Row summary="VSebCode" details="A fork of microsoft/vscode." />
					<Row summary="RS50 bridge" details="Force feedback under Wine." />
				</div>
			</>,
		);
		const career = [button("EPAM"), button("Intive")];
		const projects = [button("VSebCode"), button("RS50 bridge")];
		focusBefore();
		await userEvent.tab();
		await expect.element(button("EPAM")).toHaveFocus();
		await move("{End}", "Intive");
		await userEvent.keyboard("{ArrowDown}");
		expect(career).toContain(document.activeElement);
		await move("{End}", "Intive");
		await userEvent.tab();
		await expect.element(button("VSebCode")).toHaveFocus();
		await move("{Home}", "VSebCode");
		await userEvent.keyboard("{ArrowUp}");
		expect(projects).toContain(document.activeElement);
		await move("{Home}", "VSebCode");
		await move("{End}", "RS50 bridge");
	});
});

describe("PaneAccordion", () => {
	test("each pane's title is a button inside a level 3 heading by default", () => {
		render(<PaneAccordion items={panes} />);
		const headings = screen.getAllByRole("heading", { level: 3 });
		expect(headings).toHaveLength(panes.length);
		for (const [index, item] of panes.entries()) {
			expect(within(headings[index]).getByRole("button")).toBe(
				button(item.title),
			);
		}
	});

	test.each([2, 4, 6] as const)(
		"headingLevel %i puts each pane's button inside a heading of that level",
		(level) => {
			render(<PaneAccordion items={panes} headingLevel={level} />);
			const headings = screen.getAllByRole("heading", { level });
			expect(headings).toHaveLength(panes.length);
			for (const [index, item] of panes.entries()) {
				expect(within(headings[index]).getByRole("button")).toBe(
					button(item.title),
				);
			}
		},
	);

	test("open lists the open panes by id: an item's own id, or else its slugified title", async () => {
		const { rerender } = render(
			<PaneAccordion items={panes} open={["frontend-and-mobile", "making"]} />,
		);
		expect(expandedPanes()).toEqual(["Frontend and mobile", "Hardware"]);
		rerender(<PaneAccordion items={panes} open={["backend"]} />);
		await vi.waitFor(() => {
			expect(expandedPanes()).toEqual(["Backend"]);
		});
		rerender(<PaneAccordion items={panes} open={[]} />);
		await vi.waitFor(() => {
			expect(expandedPanes()).toEqual([]);
		});
	});

	test("a press calls onChange with the click event and the ids open after it, and a controlled pane waits for open", async () => {
		const onChange = vi.fn<OnPaneChange>();
		const { rerender } = render(
			<PaneAccordion items={panes} open={[]} onChange={onChange} />,
		);
		await userEvent.click(button("Hardware"));
		expect(onChange).toHaveBeenCalledTimes(1);
		const [event, open] = onChange.mock.calls[0];
		expect(open).toEqual(["making"]);
		expect(event.type).toBe("click");
		expect(event.nativeEvent).toBeInstanceOf(MouseEvent);
		expect(button("Hardware")).toHaveAttribute("aria-expanded", "false");
		rerender(
			<PaneAccordion items={panes} open={["making"]} onChange={onChange} />,
		);
		await expect
			.element(button("Hardware"))
			.toHaveAttribute("aria-expanded", "true");
		await userEvent.click(button("Hardware"));
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange.mock.calls[1][1]).toEqual([]);
		expect(button("Hardware")).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(button("Frontend and mobile"));
		expect(onChange.mock.calls[2][1]).toContain("frontend-and-mobile");
	});

	test("defaultOpen opens the listed panes, and each press reports the ids open after it", async () => {
		const onChange = vi.fn<OnPaneChange>();
		render(
			<PaneAccordion
				items={panes}
				defaultOpen={["data-and-cloud"]}
				onChange={onChange}
			/>,
		);
		expect(button("Data and cloud")).toHaveAttribute("aria-expanded", "true");
		await userEvent.click(button("Data and cloud"));
		await expect
			.element(button("Data and cloud"))
			.toHaveAttribute("aria-expanded", "false");
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][1]).not.toContain("data-and-cloud");
		expect(onChange.mock.calls[0][1].toSorted()).toEqual(expandedIds());
		await userEvent.click(button("Data and cloud"));
		await expect
			.element(button("Data and cloud"))
			.toHaveAttribute("aria-expanded", "true");
		expect(onChange).toHaveBeenCalledTimes(2);
		expect(onChange.mock.calls[1][1]).toContain("data-and-cloud");
		expect(onChange.mock.calls[1][1].toSorted()).toEqual(expandedIds());
	});

	test("defaultOpen takes an item's own id", () => {
		render(<PaneAccordion items={panes} defaultOpen={["making"]} />);
		expect(button("Hardware")).toHaveAttribute("aria-expanded", "true");
	});

	test("every pane shows its blurb, and an open pane reveals its chips", async () => {
		render(<PaneAccordion items={panes} open={["backend"]} />);
		for (const item of panes) {
			expect(isShown(screen.getByText(item.text))).toBe(true);
		}

		await vi.waitFor(() => {
			expect(isShown(screen.getByText("Node.js"))).toBe(true);
			expect(isShown(screen.getByText("NestJS"))).toBe(true);
		});
	});

	test("stacked with orientation vertical, a press closes an open pane and hides its chips, and another reopens it", async () => {
		const onChange = vi.fn<OnPaneChange>();
		render(
			<PaneAccordion
				orientation="vertical"
				items={panes}
				defaultOpen={["backend"]}
				onChange={onChange}
			/>,
		);
		await vi.waitFor(() => {
			expect(isShown(screen.getByText("Node.js"))).toBe(true);
		});
		await userEvent.click(button("Backend"));
		await expect
			.element(button("Backend"))
			.toHaveAttribute("aria-expanded", "false");
		await vi.waitFor(() => {
			expect(isShown(screen.getByText("Node.js"))).toBe(false);
		});
		expect(isShown(screen.getByText(panes[0].text))).toBe(true);
		expect(onChange.mock.calls[0][1]).not.toContain("backend");
		await userEvent.click(button("Backend"));
		await expect
			.element(button("Backend"))
			.toHaveAttribute("aria-expanded", "true");
		await vi.waitFor(() => {
			expect(isShown(screen.getByText("Node.js"))).toBe(true);
		});
		expect(onChange.mock.calls[1][1]).toContain("backend");
	});

	test("more replaces the chips with other content, revealed when the pane opens", async () => {
		const items: PaneAccordionItem[] = [
			{
				title: "Writing",
				text: "Notes on the work.",
				chips: ["Not shown"],
				more: <a href="#notes">Read the notes</a>,
			},
			panes[0],
		];
		render(<PaneAccordion items={items} open={["writing"]} />);
		expect(screen.queryByText("Not shown")).toBeNull();
		await vi.waitFor(() => {
			expect(
				isShown(screen.getByRole("link", { name: "Read the notes" })),
			).toBe(true);
		});
	});

	test("a press anywhere on a pane toggles it", async () => {
		const onChange = vi.fn<OnPaneChange>();
		render(<PaneAccordion items={panes} open={[]} onChange={onChange} />);
		await userEvent.click(screen.getByText(panes[2].text), { force: true });
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0][1]).toEqual(["data-and-cloud"]);
	});

	test("PaneAccordion's ref is its root element, which takes className", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<PaneAccordion ref={ref} className="capabilities" items={panes} />);
		expect(ref.current).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toHaveClass("capabilities");
		for (const item of panes) {
			expect(ref.current?.contains(button(item.title))).toBe(true);
		}
	});
});

describe("PaneAccordion keyboard", () => {
	test("Tab reaches each pane button in turn, and Enter and Space open and close the pane", async () => {
		const onChange = vi.fn<OnPaneChange>();
		render(
			<>
				<button type="button">Before</button>
				<Capabilities onChange={onChange} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		await expect.element(button("Backend")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await expect
			.element(button("Backend"))
			.toHaveAttribute("aria-expanded", "true");
		await userEvent.keyboard("[Space]");
		await expect
			.element(button("Backend"))
			.toHaveAttribute("aria-expanded", "false");
		expect(onChange.mock.calls.map(([, open]) => open)).toEqual([
			["backend"],
			[],
		]);
		await userEvent.tab();
		await expect.element(button("Frontend and mobile")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("Data and cloud")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("Hardware")).toHaveFocus();
	});

	test("the arrow keys move between the pane buttons, and Home and End jump to the first and last", async () => {
		render(
			<>
				<button type="button">Before</button>
				<PaneAccordion items={panes} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		await expect.element(button("Backend")).toHaveFocus();
		await move("{ArrowRight}", "Frontend and mobile");
		await move("{ArrowDown}", "Data and cloud");
		await move("{ArrowLeft}", "Frontend and mobile");
		await move("{ArrowUp}", "Backend");
		await move("{End}", "Hardware");
		await move("{Home}", "Backend");
	});
});

describe("PaneAccordion side by side, at a desktop width", () => {
	beforeEach(async () => {
		await page.viewport(1280, 900);
	});

	afterEach(async () => {
		await page.viewport(414, 896);
	});

	test("defaultOpen opens only the listed panes, and only they show their chips", async () => {
		render(<PaneAccordion items={panes} defaultOpen={["backend"]} />);
		expect(expandedPanes()).toEqual(["Backend"]);
		await vi.waitFor(() => {
			expect(isShown(screen.getByText("Node.js"))).toBe(true);
			expect(isShown(screen.getByText("Rust"))).toBe(false);
		});
	});

	test("focusing a pane widens it and shows its chips, as hovering does, without opening it", async () => {
		render(
			<>
				<button type="button">Before</button>
				<PaneAccordion items={panes} />
			</>,
		);
		const blurb = screen.getByText(panes[2].text);
		let pane: HTMLElement = button("Data and cloud");
		while (!pane.contains(blurb) && pane.parentElement) {
			pane = pane.parentElement;
		}

		await vi.waitFor(() => {
			expect(isShown(screen.getByText("PostgreSQL"))).toBe(false);
		});
		const before = pane.getBoundingClientRect().width;
		focusBefore();
		await userEvent.tab();
		await move("{ArrowRight}", "Frontend and mobile");
		await move("{ArrowRight}", "Data and cloud");
		await vi.waitFor(() => {
			expect(isShown(screen.getByText("PostgreSQL"))).toBe(true);
			expect(isShown(screen.getByText("IAM"))).toBe(true);
			expect(pane.getBoundingClientRect().width).toBeGreaterThan(before * 1.2);
		});
		expect(isShown(screen.getByText("React"))).toBe(false);
		expect(button("Data and cloud")).toHaveAttribute("aria-expanded", "false");
	});
});
