import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import { page } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { type GridProps, Grid } from "#ui";

afterEach(() => {
	cleanup();
});

type Placement = { left: number; top: number; width: number };

type Item = GridProps & { id: string };

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

function round(value: number): number {
	return Math.round(value * 10) / 10;
}

function measure(ids: string[]): Record<string, Placement> {
	const grid = screen.getByTestId("grid").getBoundingClientRect();
	const placements: Record<string, Placement> = {};
	for (const id of ids) {
		const box = screen.getByTestId(id).getBoundingClientRect();
		placements[id] = {
			left: round(box.left - grid.left),
			top: round(box.top - grid.top),
			width: round(box.width),
		};
	}

	return placements;
}

function layout(
	width: number,
	props: GridProps,
	items: Item[],
): Record<string, Placement> {
	render(
		<Grid container data-testid="grid" style={{ width }} {...props}>
			{items.map(({ id, ...item }) => (
				<Grid key={id} data-testid={id} style={{ height: 10 }} {...item} />
			))}
		</Grid>,
	);
	return measure(items.map(({ id }) => id));
}

test("a container lays its items on 12 columns, wrapping onto new rows", () => {
	expect(
		layout(1200, {}, [
			{ id: "a", size: 4 },
			{ id: "b", size: 4 },
			{ id: "c", size: 4 },
			{ id: "d", size: 6 },
			{ id: "e", size: 6 },
		]),
	).toEqual({
		a: { left: 0, top: 0, width: 400 },
		b: { left: 400, top: 0, width: 400 },
		c: { left: 800, top: 0, width: 400 },
		d: { left: 0, top: 10, width: 600 },
		e: { left: 600, top: 10, width: 600 },
	});
});

test("an item with no size fills its row", () => {
	expect(
		layout(1200, {}, [{ id: "a", size: 4 }, { id: "b" }, { id: "c", size: 4 }]),
	).toEqual({
		a: { left: 0, top: 0, width: 400 },
		b: { left: 0, top: 10, width: 1200 },
		c: { left: 0, top: 20, width: 400 },
	});
});

test("without container a Grid doesn't lay its children on columns", () => {
	render(
		<Grid data-testid="grid" style={{ width: 1200 }}>
			<Grid data-testid="a" size={6} style={{ height: 10 }} />
			<Grid data-testid="b" size={6} style={{ height: 10 }} />
		</Grid>,
	);
	expect(measure(["a", "b"])).toEqual({
		a: { left: 0, top: 0, width: 1200 },
		b: { left: 0, top: 10, width: 1200 },
	});
});

test("columns sets another column count", () => {
	expect(
		layout(1200, { columns: 5 }, [
			{ id: "a", size: 1 },
			{ id: "b", size: 1 },
			{ id: "c", size: 3 },
		]),
	).toEqual({
		a: { left: 0, top: 0, width: 240 },
		b: { left: 240, top: 0, width: 240 },
		c: { left: 480, top: 0, width: 720 },
	});
});

test("a single columns number can go past 12", () => {
	expect(
		layout(1200, { columns: 16 }, [
			{ id: "a", size: 4 },
			{ id: "b", size: 12 },
		]),
	).toEqual({
		a: { left: 0, top: 0, width: 300 },
		b: { left: 300, top: 0, width: 900 },
	});
});

test("size can be any whole number against the column count", () => {
	expect(
		layout(1200, { columns: 24 }, [
			{ id: "a", size: 18 },
			{ id: "b", size: 6 },
			{ id: "c", size: 13 },
		]),
	).toEqual({
		a: { left: 0, top: 0, width: 900 },
		b: { left: 900, top: 0, width: 300 },
		c: { left: 0, top: 10, width: 650 },
	});
});

test("values for xs hold at every width, since a breakpoint without a value takes the one below", () => {
	expect(
		layout(1200, { columns: { xs: 4 } }, [
			{ id: "a", size: { xs: 1 } },
			{ id: "b", size: { xs: 2 }, offset: { xs: 1 } },
		]),
	).toEqual({
		a: { left: 0, top: 0, width: 300 },
		b: { left: 600, top: 0, width: 600 },
	});
});

test("offset leaves empty columns before an item", () => {
	expect(
		layout(1200, {}, [
			{ id: "a", size: 6, offset: 3 },
			{ id: "b", size: 4, offset: 0 },
		]),
	).toEqual({
		a: { left: 300, top: 0, width: 600 },
		b: { left: 0, top: 10, width: 400 },
	});
});

test("offset pushes an item from where it would sit, as in MUI", () => {
	expect(
		layout(1200, {}, [
			{ id: "a", size: 4 },
			{ id: "b", size: 4, offset: 4 },
			{ id: "c", size: 2, offset: 1 },
		]),
	).toEqual({
		a: { left: 0, top: 0, width: 400 },
		b: { left: 800, top: 0, width: 400 },
		c: { left: 100, top: 10, width: 200 },
	});
});

test("an offset counts the column gaps it skips", () => {
	expect(
		layout(1176, { spacing: "lg" }, [
			{ id: "a", size: 6, offset: 3 },
			{ id: "b", size: 3 },
		]),
	).toEqual({
		a: { left: 300, top: 0, width: 576 },
		b: { left: 900, top: 0, width: 276 },
	});
});

test("spacing is 0 by default: items and rows touch", () => {
	expect(
		layout(1200, {}, [
			{ id: "a", size: 6 },
			{ id: "b", size: 6 },
			{ id: "c", size: 12 },
		]),
	).toEqual({
		a: { left: 0, top: 0, width: 600 },
		b: { left: 600, top: 0, width: 600 },
		c: { left: 0, top: 10, width: 1200 },
	});
});

const rows: Item[] = [
	{ id: "a", size: 6 },
	{ id: "b", size: 6 },
	{ id: "c", size: 12 },
];

test("spacing sets the gap between rows and between columns", () => {
	expect(layout(1184, { spacing: "md" }, rows)).toEqual({
		a: { left: 0, top: 0, width: 584 },
		b: { left: 600, top: 0, width: 584 },
		c: { left: 0, top: 26, width: 1184 },
	});
});

test("rowSpacing wins over spacing for the gap between rows", () => {
	expect(layout(1184, { spacing: "md", rowSpacing: "2xs" }, rows)).toEqual({
		a: { left: 0, top: 0, width: 584 },
		b: { left: 600, top: 0, width: 584 },
		c: { left: 0, top: 16, width: 1184 },
	});
});

test("columnSpacing wins over spacing for the gap between columns", () => {
	expect(layout(1176, { spacing: "md", columnSpacing: "lg" }, rows)).toEqual({
		a: { left: 0, top: 0, width: 576 },
		b: { left: 600, top: 0, width: 576 },
		c: { left: 0, top: 26, width: 1176 },
	});
});

test("rowSpacing alone leaves the columns touching", () => {
	expect(layout(1200, { rowSpacing: "xs" }, rows)).toEqual({
		a: { left: 0, top: 0, width: 600 },
		b: { left: 600, top: 0, width: 600 },
		c: { left: 0, top: 18, width: 1200 },
	});
});

test("a Grid can be a container and an item at once", () => {
	render(
		<Grid container data-testid="grid" style={{ width: 1200 }}>
			<Grid container data-testid="inner" size={6}>
				<Grid data-testid="x" size={6} style={{ height: 10 }} />
				<Grid data-testid="y" size={6} style={{ height: 10 }} />
			</Grid>
			<Grid data-testid="z" size={6} style={{ height: 10 }} />
		</Grid>,
	);
	expect(measure(["inner", "x", "y", "z"])).toEqual({
		inner: { left: 0, top: 0, width: 600 },
		x: { left: 0, top: 0, width: 300 },
		y: { left: 300, top: 0, width: 300 },
		z: { left: 600, top: 0, width: 600 },
	});
});

referenceDefectTest(
	"a container that's also an item fills its row below its first size, whatever its own columns",
	async () => {
		await page.viewport(414, 896);
		render(
			<Grid container data-testid="grid" style={{ width: 400 }}>
				<Grid container data-testid="inner" columns={4} size={{ md: 6 }}>
					<Grid data-testid="x" size={2} style={{ height: 10 }} />
				</Grid>
			</Grid>,
		);
		expect(measure(["inner", "x"])).toEqual({
			inner: { left: 0, top: 0, width: 400 },
			x: { left: 0, top: 0, width: 200 },
		});
	},
);

referenceDefectTest(
	"an offset waits for the item's first size: below it the item fills its row",
	async () => {
		await page.viewport(414, 896);
		render(
			<Grid container data-testid="grid" style={{ width: 400 }}>
				<Grid
					container
					data-testid="inner"
					columns={4}
					size={{ md: 6 }}
					offset={0}
				>
					<Grid data-testid="x" size={2} style={{ height: 10 }} />
				</Grid>
				<Grid
					data-testid="pushed"
					size={{ md: 6 }}
					offset={{ xs: 2, md: 3 }}
					style={{ height: 10 }}
				/>
			</Grid>,
		);
		expect(measure(["inner", "x", "pushed"])).toEqual({
			inner: { left: 0, top: 0, width: 400 },
			x: { left: 0, top: 0, width: 200 },
			pushed: { left: 0, top: 10, width: 400 },
		});
	},
);

test("it renders a div by default, and component picks the element", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<>
			<Grid ref={ref} container>
				<Grid size={6}>Default</Grid>
			</Grid>
			<Grid container component="ul" aria-label="Projects">
				<Grid component="li" size={6}>
					Blue Glass
				</Grid>
				<Grid component="li" size={6}>
					RS50 bridge
				</Grid>
			</Grid>
		</>,
	);
	expect(current(ref).tagName).toBe("DIV");
	const list = screen.getByRole("list", { name: "Projects" });
	expect(within(list).getAllByRole("listitem")).toHaveLength(2);
});

test("the ref is the root, which takes className and other attributes", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<Grid
			ref={ref}
			container
			className="mine"
			id="work"
			data-testid="work-grid"
		>
			<Grid size={12}>Work</Grid>
		</Grid>,
	);
	const element = current(ref);
	expect(screen.getByTestId("work-grid")).toBe(element);
	expect(element.id).toBe("work");
	expect(element.classList.contains("mine")).toBe(true);
	expect(element.contains(screen.getByText("Work"))).toBe(true);
});
