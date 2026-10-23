import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import "#ui/styles.css";
import { type ContainerProps, Container } from "#ui";

afterEach(() => {
	cleanup();
});

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

type Column = {
	width: number;
	gutterLeft: number;
	gutterRight: number;
};

function column(parentWidth: number, props: ContainerProps = {}): Column {
	const parent = React.createRef<HTMLDivElement>();
	const ref = React.createRef<HTMLElement>();
	render(
		<div ref={parent} style={{ width: parentWidth }}>
			<Container ref={ref} {...props}>
				Content
			</Container>
		</div>,
	);
	const outer = current(parent).getBoundingClientRect();
	const inner = current(ref).getBoundingClientRect();
	return {
		width: inner.width,
		gutterLeft: inner.left - outer.left,
		gutterRight: outer.right - inner.right,
	};
}

test("it renders a div by default, and component picks the element", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<>
			<Container ref={ref}>Default</Container>
			<Container component="main">Main</Container>
			<Container component="section" aria-label="Projects">
				Section
			</Container>
		</>,
	);
	expect(current(ref).tagName).toBe("DIV");
	expect(screen.getByRole("main").textContent).toBe("Main");
	expect(screen.getByRole("region", { name: "Projects" }).tagName).toBe(
		"SECTION",
	);
});

test("the ref is the root, which takes className and other attributes", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<Container ref={ref} className="mine" id="work" data-testid="column">
			<h2>Work</h2>
		</Container>,
	);
	const element = current(ref);
	expect(screen.getByTestId("column")).toBe(element);
	expect(element.id).toBe("work");
	expect(element.classList.contains("mine")).toBe(true);
	expect(element.contains(screen.getByRole("heading", { name: "Work" }))).toBe(
		true,
	);
});

test("maxWidth caps the column at the site's page width, 1180px, by default", () => {
	expect(column(3000).width).toBe(1180);
	expect(column(3000, { maxWidth: "wrap" }).width).toBe(1180);
});

test("maxWidth header caps the column at the header's width, 1380px", () => {
	expect(column(3000, { maxWidth: "header" }).width).toBe(1380);
});

test("maxWidth prose caps the column at a 62ch reading measure", () => {
	const ref = React.createRef<HTMLElement>();
	const probe = React.createRef<HTMLDivElement>();
	render(
		<div style={{ width: 3000 }}>
			<Container ref={ref} maxWidth="prose">
				<div ref={probe} style={{ width: "62ch" }} />
			</Container>
		</div>,
	);
	const { width } = current(ref).getBoundingClientRect();
	expect(width).toBeLessThan(1180);
	expect(width).toBeCloseTo(current(probe).getBoundingClientRect().width, 1);
});

test("maxWidth={false} drops the cap but keeps the side gutters", () => {
	const { width, gutterLeft, gutterRight } = column(3000, { maxWidth: false });
	expect(width).toBeGreaterThan(1380);
	expect(width).toBeLessThan(3000);
	expect(gutterLeft).toBeGreaterThan(0);
	expect(gutterLeft).toBeCloseTo(gutterRight, 1);
});

test("the column is centred, with gutters of 5% to 6% each side, so content never touches the edge", () => {
	const { width, gutterLeft, gutterRight } = column(1000);
	expect(gutterLeft).toBeCloseTo(gutterRight, 1);
	expect(gutterLeft).toBeGreaterThanOrEqual(50);
	expect(gutterLeft).toBeLessThanOrEqual(60);
	expect(width).toBeCloseTo(1000 - gutterLeft - gutterRight, 1);
});

test("a capped column is centred in a wider parent", () => {
	const { gutterLeft, gutterRight } = column(3000, { maxWidth: "header" });
	expect(gutterLeft).toBe(810);
	expect(gutterRight).toBe(810);
});

test("the gutters come from the width, not from padding", () => {
	const ref = React.createRef<HTMLElement>();
	render(<Container ref={ref}>Content</Container>);
	const style = getComputedStyle(current(ref));
	expect([style.paddingLeft, style.paddingRight]).toEqual(["0px", "0px"]);
});

test("disableGutters runs the column 100% wide, up to the cap", () => {
	expect(column(1000, { disableGutters: true })).toEqual({
		width: 1000,
		gutterLeft: 0,
		gutterRight: 0,
	});
	expect(column(3000, { disableGutters: true }).width).toBe(1180);
	expect(column(3000, { disableGutters: true, maxWidth: "header" }).width).toBe(
		1380,
	);
	expect(column(3000, { disableGutters: true, maxWidth: false })).toEqual({
		width: 3000,
		gutterLeft: 0,
		gutterRight: 0,
	});
});
