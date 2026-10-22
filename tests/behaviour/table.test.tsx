import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TableSortLabel,
} from "#ui";

afterEach(() => {
	cleanup();
});

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

const roles = [
	["EPAM", "Mar 2026 – Present"],
	["Intive", "Jul 2025"],
	["Globant", "Jun 2023 – Dec 2024"],
	["Limber Health", "Aug 2022 – Jun 2023"],
	["SunDevs", "May 2021 – Nov 2022"],
	["PayPal", "Dec 2021 – Jul 2022"],
	["Gorilla Logic", "Dec 2020 – Dec 2021"],
	["Pefpi", "Apr 2020 – Aug 2020"],
	["ActiveONE", "Oct 2017 – Apr 2019"],
] as const;

/**
The roles as body rows, each named by its employer.
*/
function RoleRows() {
	return (
		<TableBody>
			{roles.map(([employer, dates]) => (
				<TableRow key={employer}>
					<TableCell component="th">{employer}</TableCell>
					<TableCell>{dates}</TableCell>
				</TableRow>
			))}
		</TableBody>
	);
}

function RolesTable({
	minWidth,
	isSortable = false,
	...props
}: {
	caption?: string;
	captionSide?: "top" | "bottom";
	stickyHeader?: boolean;
	minWidth?: number;
	/**
	A sort label in the Employer header. Chromium lets Tab reach a scroll container with
	nothing focusable inside on its own, so the label shows the container's own tab stop.
	*/
	isSortable?: boolean;
}) {
	return (
		<Table {...props} style={minWidth === undefined ? undefined : { minWidth }}>
			<TableHead>
				<TableRow>
					<TableCell>
						{isSortable ? (
							<TableSortLabel>Employer</TableSortLabel>
						) : (
							"Employer"
						)}
					</TableCell>
					<TableCell>Dates</TableCell>
				</TableRow>
			</TableHead>
			<RoleRows />
		</Table>
	);
}

type Column = "employer" | "dates";

/**
The README's sorting recipe: a TableSortLabel in each sortable header, and sortDirection on
that header's cell. The rows stay put; only the sort state matters here.
*/
function SortableRoles({ onSort }: { onSort: (type: string) => void }) {
	const [orderBy, setOrderBy] = React.useState<Column | undefined>();
	const [direction, setDirection] = React.useState<"asc" | "desc">("asc");
	const header = (column: Column, label: string) => (
		<TableCell sortDirection={orderBy === column ? direction : false}>
			<TableSortLabel
				active={orderBy === column}
				direction={orderBy === column ? direction : "asc"}
				onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
					onSort(event.type);
					if (orderBy === column) {
						setDirection(direction === "asc" ? "desc" : "asc");
					} else {
						setOrderBy(column);
						setDirection("asc");
					}
				}}
			>
				{label}
			</TableSortLabel>
		</TableCell>
	);

	return (
		<Table aria-label="Roles">
			<TableHead>
				<TableRow>
					{header("employer", "Employer")}
					{header("dates", "Dates")}
				</TableRow>
			</TableHead>
			<RoleRows />
		</Table>
	);
}

describe("structure", () => {
	test("the parts render a table: th scope=col in the head, td in the body, th scope=row on request, each ref on its element", () => {
		const refs = {
			container: React.createRef<HTMLDivElement>(),
			table: React.createRef<HTMLTableElement>(),
			head: React.createRef<HTMLTableSectionElement>(),
			body: React.createRef<HTMLTableSectionElement>(),
			row: React.createRef<HTMLTableRowElement>(),
			cell: React.createRef<HTMLTableCellElement>(),
		};
		render(
			<TableContainer ref={refs.container}>
				<Table ref={refs.table} aria-label="Outcomes">
					<TableHead ref={refs.head}>
						<TableRow>
							<TableCell>Employer</TableCell>
							<TableCell numeric>Result</TableCell>
						</TableRow>
					</TableHead>
					<TableBody ref={refs.body}>
						<TableRow ref={refs.row}>
							<TableCell component="th">Intive</TableCell>
							<TableCell ref={refs.cell} numeric>
								−10%
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>,
		);
		const table = screen.getByRole("table", { name: "Outcomes" });
		expect(refs.table.current).toBe(table);
		expect(refs.container.current?.tagName).toBe("DIV");
		expect(refs.container.current).toContainElement(table);

		for (const name of ["Employer", "Result"]) {
			const header = screen.getByRole("columnheader", { name });
			expect(header.tagName).toBe("TH");
			expect(header).toHaveAttribute("scope", "col");
		}

		const rowHeader = screen.getByRole("rowheader", { name: "Intive" });
		expect(rowHeader.tagName).toBe("TH");
		expect(rowHeader).toHaveAttribute("scope", "row");
		const cell = screen.getByRole("cell", { name: "−10%" });
		expect(cell.tagName).toBe("TD");
		expect(refs.cell.current).toBe(cell);
		expect(refs.row.current).toBeInstanceOf(HTMLTableRowElement);
		expect(refs.row.current).toContainElement(rowHeader);
		expect(refs.head.current?.tagName).toBe("THEAD");
		expect(refs.body.current?.tagName).toBe("TBODY");
		expect(refs.body.current).toContainElement(cell);
	});
});

describe("TableContainer", () => {
	test('variant="plain" puts its class on the container, and the default surface does not', () => {
		const surface = React.createRef<HTMLDivElement>();
		const plain = React.createRef<HTMLDivElement>();
		render(
			<>
				<TableContainer ref={surface}>
					<RolesTable />
				</TableContainer>
				<TableContainer ref={plain} variant="plain">
					<RolesTable />
				</TableContainer>
			</>,
		);
		expect(plain.current).toHaveClass("gl-table-container-plain");
		expect(surface.current).not.toHaveClass("gl-table-container-plain");
	});

	test("component renders the container as another element", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<TableContainer ref={ref} component="section">
				<RolesTable />
			</TableContainer>,
		);
		expect(ref.current?.tagName).toBe("SECTION");
		expect(ref.current).toContainElement(screen.getByRole("table"));
	});

	test("maxHeight caps the container: a number in px, or any CSS length, and the body scrolls under it", () => {
		const capped = React.createRef<HTMLDivElement>();
		const inEm = React.createRef<HTMLDivElement>();
		render(
			<>
				<TableContainer ref={capped} maxHeight={150}>
					<RolesTable />
				</TableContainer>
				<TableContainer ref={inEm} maxHeight="12em">
					<RolesTable />
				</TableContainer>
			</>,
		);
		const box = must(capped.current);
		expect(getComputedStyle(box).maxHeight).toBe("150px");
		expect(box.getBoundingClientRect().height).toBeLessThanOrEqual(150);
		expect(box.scrollHeight).toBeGreaterThan(box.clientHeight);

		const style = getComputedStyle(must(inEm.current));
		const fontSize = Number(style.fontSize.replace("px", ""));
		expect(style.maxHeight).toBe(`${12 * fontSize}px`);
	});

	test("a container its table overflows joins the tab order as a region named by its label, and arrow keys scroll it", async () => {
		render(
			<>
				<button type="button">Before</button>
				<div style={{ width: 320 }}>
					<TableContainer aria-label="Experience">
						<RolesTable isSortable minWidth={660} />
					</TableContainer>
				</div>
			</>,
		);
		const region = await vi.waitFor(() =>
			screen.getByRole("region", { name: "Experience" }),
		);
		screen.getByRole("button", { name: "Before" }).focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(region);
		expect(region.scrollLeft).toBe(0);
		await userEvent.keyboard("{ArrowRight}");
		await expect.poll(() => region.scrollLeft).toBeGreaterThan(0);
		// Then on into the table's own content.
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Employer" }),
		);
	});

	test("a container joins the tab order only once its table outgrows it", async () => {
		function Page({ width }: { width: number }) {
			return (
				<>
					<button type="button">Before</button>
					<div style={{ width }}>
						<TableContainer aria-label="Experience">
							<RolesTable isSortable minWidth={660} />
						</TableContainer>
					</div>
				</>
			);
		}

		const { rerender } = render(<Page width={800} />);
		const before = screen.getByRole("button", { name: "Before" });
		const label = screen.getByRole("button", { name: "Employer" });
		// It fits: no scrolling, so no tab stop of its own and no region.
		before.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(label);
		expect(
			screen.queryByRole("region", { name: "Experience" }),
		).not.toBeInTheDocument();

		rerender(<Page width={320} />);
		const region = await vi.waitFor(() =>
			screen.getByRole("region", { name: "Experience" }),
		);
		before.focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(region);
		await userEvent.tab();
		expect(document.activeElement).toBe(label);
	});

	test("an unnamed container that scrolls joins the tab order too, but isn't a region", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<>
				<button type="button">Before</button>
				<div style={{ width: 320 }}>
					<TableContainer ref={ref}>
						<RolesTable isSortable minWidth={660} />
					</TableContainer>
				</div>
			</>,
		);
		const box = must(ref.current);
		const before = screen.getByRole("button", { name: "Before" });
		// No role to wait on: retry until the container has measured its overflow.
		await vi.waitFor(async () => {
			before.focus();
			await userEvent.tab();
			expect(document.activeElement).toBe(box);
		});
		expect(screen.queryByRole("region")).not.toBeInTheDocument();
	});

	test("ArrowDown scrolls a focused container capped by maxHeight", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<>
				<button type="button">Before</button>
				<TableContainer ref={ref} maxHeight={150} aria-label="All roles">
					<RolesTable isSortable />
				</TableContainer>
			</>,
		);
		const box = must(ref.current);
		await vi.waitFor(() => {
			expect(screen.getByRole("region", { name: "All roles" })).toBe(box);
		});
		screen.getByRole("button", { name: "Before" }).focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(box);
		await userEvent.keyboard("{ArrowDown}");
		await expect.poll(() => box.scrollTop).toBeGreaterThan(0);
	});
});

describe("Table", () => {
	test("caption names the table as its caption: below the rows by default, above them with captionSide top", () => {
		render(
			<>
				<RolesTable caption="Experience, from my CV" />
				<RolesTable caption="Client work, newest first" captionSide="top" />
			</>,
		);
		const below = screen.getByRole("table", { name: "Experience, from my CV" });
		const belowCaption = within(below).getByText("Experience, from my CV");
		expect(belowCaption.tagName).toBe("CAPTION");
		const lastRow = must(within(below).getAllByRole("row").at(-1));
		expect(belowCaption.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			lastRow.getBoundingClientRect().bottom - 1,
		);

		const above = screen.getByRole("table", {
			name: "Client work, newest first",
		});
		const aboveCaption = within(above).getByText("Client work, newest first");
		expect(aboveCaption.tagName).toBe("CAPTION");
		const firstRow = must(within(above).getAllByRole("row")[0]);
		expect(aboveCaption.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			firstRow.getBoundingClientRect().top + 1,
		);
	});

	test("a cell takes its size from the table unless it sets its own", () => {
		render(
			<>
				<Table size="sm" aria-label="Dense">
					<TableBody>
						<TableRow>
							<TableCell>Small</TableCell>
							<TableCell size="md">Override</TableCell>
						</TableRow>
					</TableBody>
				</Table>
				<Table aria-label="Regular">
					<TableBody>
						<TableRow>
							<TableCell>Regular</TableCell>
							<TableCell size="sm">Own</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</>,
		);
		const cell = (name: string) => screen.getByRole("cell", { name });
		expect(cell("Small")).toHaveClass("gl-table-cell-sm");
		expect(cell("Override")).not.toHaveClass("gl-table-cell-sm");
		expect(cell("Regular")).not.toHaveClass("gl-table-cell-sm");
		expect(cell("Own")).toHaveClass("gl-table-cell-sm");
	});

	test("stickyHeader keeps the header in view while the body scrolls under it", () => {
		const sticky = React.createRef<HTMLDivElement>();
		const plain = React.createRef<HTMLDivElement>();
		render(
			<>
				<TableContainer ref={sticky} maxHeight={160}>
					<RolesTable stickyHeader />
				</TableContainer>
				<TableContainer ref={plain} maxHeight={160}>
					<RolesTable />
				</TableContainer>
			</>,
		);
		const stickyBox = must(sticky.current);
		const plainBox = must(plain.current);
		stickyBox.scrollTop = 120;
		plainBox.scrollTop = 120;
		expect(stickyBox.scrollTop).toBe(120);
		expect(plainBox.scrollTop).toBe(120);
		const header = (box: HTMLElement) =>
			within(box)
				.getByRole("columnheader", { name: "Employer" })
				.getBoundingClientRect();
		expect(header(stickyBox).top).toBeGreaterThanOrEqual(
			stickyBox.getBoundingClientRect().top,
		);
		expect(header(plainBox).bottom).toBeLessThanOrEqual(
			plainBox.getBoundingClientRect().top,
		);
	});
});

describe("TableRow", () => {
	test("selected marks the row aria-selected, and rows that aren't selected aren't", () => {
		render(
			<Table aria-label="Client work">
				<TableBody>
					<TableRow selected>
						<TableCell>Limber Health</TableCell>
					</TableRow>
					<TableRow selected={false}>
						<TableCell>Intive</TableCell>
					</TableRow>
					<TableRow>
						<TableCell>SunDevs</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);
		const row = (name: string) => screen.getByRole("row", { name });
		expect(row("Limber Health")).toHaveAttribute("aria-selected", "true");
		expect(row("Intive")).not.toHaveAttribute("aria-selected", "true");
		expect(row("SunDevs")).not.toHaveAttribute("aria-selected", "true");
	});

	test("hover puts its class on the row", () => {
		render(
			<Table aria-label="Experience">
				<TableBody>
					<TableRow hover>
						<TableCell>EPAM</TableCell>
					</TableRow>
					<TableRow>
						<TableCell>Intive</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);
		expect(screen.getByRole("row", { name: "EPAM" })).toHaveClass(
			"gl-table-row-hover",
		);
		expect(screen.getByRole("row", { name: "Intive" })).not.toHaveClass(
			"gl-table-row-hover",
		);
	});
});

describe("TableCell", () => {
	test("numeric cells, in the head and the body, right-align tabular figures that never wrap", () => {
		render(
			<Table aria-label="Outcomes">
				<TableHead>
					<TableRow>
						<TableCell>Employer</TableCell>
						<TableCell numeric>Result</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell component="th">Limber Health</TableCell>
						<TableCell numeric>10–20 ms</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);
		for (const cell of [
			screen.getByRole("columnheader", { name: "Result" }),
			screen.getByRole("cell", { name: "10–20 ms" }),
		]) {
			const style = getComputedStyle(cell);
			expect(style.textAlign).toBe("right");
			expect(style.fontVariantNumeric).toBe("tabular-nums");
			expect(style.whiteSpace).toBe("nowrap");
		}

		expect(
			getComputedStyle(screen.getByRole("rowheader", { name: "Limber Health" }))
				.textAlign,
		).toBe("start");
	});

	test("align sets a cell's text alignment, and wins over numeric's right", () => {
		render(
			<Table aria-label="Alignment">
				<TableBody>
					<TableRow>
						<TableCell align="left">Left</TableCell>
						<TableCell align="center">Centre</TableCell>
						<TableCell align="right">Right</TableCell>
						<TableCell numeric align="center">
							7
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);
		const alignment = (name: string) =>
			getComputedStyle(screen.getByRole("cell", { name })).textAlign;
		expect(alignment("Left")).toBe("left");
		expect(alignment("Centre")).toBe("center");
		expect(alignment("Right")).toBe("right");
		expect(alignment("7")).toBe("center");
	});

	test("sortDirection sets aria-sort on the header cell", () => {
		render(
			<Table aria-label="Roles">
				<TableHead>
					<TableRow>
						<TableCell sortDirection="asc">Employer</TableCell>
						<TableCell sortDirection="desc">Dates</TableCell>
						<TableCell sortDirection={false}>Role</TableCell>
						<TableCell>Location</TableCell>
					</TableRow>
				</TableHead>
			</Table>,
		);
		const header = (name: string) => screen.getByRole("columnheader", { name });
		expect(header("Employer")).toHaveAttribute("aria-sort", "ascending");
		expect(header("Dates")).toHaveAttribute("aria-sort", "descending");
		expect(header("Role")).not.toHaveAttribute("aria-sort");
		expect(header("Location")).not.toHaveAttribute("aria-sort");
	});

	referenceDefectTest(
		"variant changes only the look: in the head a cell stays a sorted column header, and in the body a td",
		() => {
			render(
				<Table aria-label="Roles">
					<TableHead>
						<TableRow>
							<TableCell variant="body" sortDirection="asc">
								Employer
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						<TableRow>
							<TableCell variant="head">EPAM</TableCell>
						</TableRow>
					</TableBody>
				</Table>,
			);
			const header = screen.getByRole("columnheader", { name: "Employer" });
			expect(header).toHaveAttribute("scope", "col");
			expect(header).toHaveAttribute("aria-sort", "ascending");
			expect(header).not.toHaveClass("gl-table-cell-head");
			const cell = screen.getByRole("cell", { name: "EPAM" });
			expect(cell.tagName).toBe("TD");
			expect(cell).toHaveClass("gl-table-cell-head");
		},
	);

	test('padding="checkbox" and padding="none" put their classes on the cell', () => {
		render(
			<Table aria-label="Padding">
				<TableBody>
					<TableRow>
						<TableCell padding="checkbox">Checkbox</TableCell>
						<TableCell padding="none">None</TableCell>
						<TableCell padding="normal">Normal</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);
		const cell = (name: string) => screen.getByRole("cell", { name });
		expect(cell("Checkbox")).toHaveClass("gl-table-cell-pad-checkbox");
		expect(cell("None")).toHaveClass("gl-table-cell-pad-none");
		expect(cell("Normal")).not.toHaveClass("gl-table-cell-pad-checkbox");
		expect(cell("Normal")).not.toHaveClass("gl-table-cell-pad-none");
	});

	test("variant gives a cell the head or body look, by default from its section", () => {
		render(
			<Table aria-label="Looks">
				<TableHead>
					<TableRow>
						<TableCell>Head</TableCell>
						<TableCell variant="body">Body look in the head</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell>Body</TableCell>
						<TableCell variant="head">Head look in the body</TableCell>
					</TableRow>
				</TableBody>
			</Table>,
		);
		expect(screen.getByText("Head")).toHaveClass("gl-table-cell-head");
		expect(screen.getByText("Body look in the head")).not.toHaveClass(
			"gl-table-cell-head",
		);
		expect(screen.getByText("Body")).not.toHaveClass("gl-table-cell-head");
		expect(screen.getByText("Head look in the body")).toHaveClass(
			"gl-table-cell-head",
		);
	});
});

describe("TableSortLabel", () => {
	test("is a button holding the ref, and only the active one says how its column is sorted", () => {
		const ref = React.createRef<HTMLButtonElement>();
		render(
			<Table aria-label="Roles">
				<TableHead>
					<TableRow>
						<TableCell>
							<TableSortLabel ref={ref}>Employer</TableSortLabel>
						</TableCell>
						<TableCell sortDirection="asc">
							<TableSortLabel active>Dates</TableSortLabel>
						</TableCell>
						<TableCell sortDirection="desc">
							<TableSortLabel active direction="desc">
								Role
							</TableSortLabel>
						</TableCell>
						<TableCell>
							<TableSortLabel direction="desc">Location</TableSortLabel>
						</TableCell>
					</TableRow>
				</TableHead>
			</Table>,
		);
		const employer = screen.getByRole("button", { name: "Employer" });
		expect(employer).toBeInstanceOf(HTMLButtonElement);
		expect(ref.current).toBe(employer);
		// Active with the default direction, asc.
		expect(
			screen.getByRole("button", { name: /^Dates\W*sorted ascending\W*$/v }),
		).toBeVisible();
		expect(
			screen.getByRole("button", { name: /^Role\W*sorted descending\W*$/v }),
		).toBeVisible();
		expect(screen.getByRole("button", { name: "Location" })).toBeVisible();
	});

	test("Tab reaches each sort label, Enter and Space sort, and aria-sort follows on the header cell", async () => {
		const onSort = vi.fn<(type: string) => void>();
		render(
			<>
				<button type="button">Before</button>
				<SortableRoles onSort={onSort} />
			</>,
		);
		const employer = screen.getByRole("button", { name: "Employer" });
		const dates = screen.getByRole("button", { name: "Dates" });
		const header = (name: RegExp) => screen.getByRole("columnheader", { name });
		screen.getByRole("button", { name: "Before" }).focus();

		await userEvent.tab();
		expect(document.activeElement).toBe(employer);
		await userEvent.keyboard("{Enter}");
		expect(header(/^Employer/v)).toHaveAttribute("aria-sort", "ascending");
		expect(employer).toHaveAccessibleName(/^Employer\W*sorted ascending\W*$/v);
		await userEvent.keyboard("[Space]");
		expect(header(/^Employer/v)).toHaveAttribute("aria-sort", "descending");
		expect(employer).toHaveAccessibleName(/^Employer\W*sorted descending\W*$/v);

		await userEvent.tab();
		expect(document.activeElement).toBe(dates);
		await userEvent.keyboard("[Space]");
		expect(header(/^Dates/v)).toHaveAttribute("aria-sort", "ascending");
		expect(header(/^Employer/v)).not.toHaveAttribute("aria-sort");
		expect(employer).toHaveAccessibleName("Employer");
		expect(onSort.mock.calls).toEqual([["click"], ["click"], ["click"]]);
	});
});
