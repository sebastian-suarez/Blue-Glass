import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import "#ui/styles.css";
import { type BoxProps, type SpaceToken, Box } from "#ui";

afterEach(() => {
	cleanup();
});

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

/**
Renders one Box and returns its root element's computed style, through the documented ref.
*/
function styleOf(props: BoxProps): CSSStyleDeclaration {
	const ref = React.createRef<HTMLElement>();
	render(<Box ref={ref} {...props} />);
	return getComputedStyle(current(ref));
}

/**
The length a spacing token holds, read from the stylesheet's custom property.
*/
function space(token: SpaceToken): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(`--space-${token}`)
		.trim();
}

function padding(style: CSSStyleDeclaration): string[] {
	return [
		style.paddingTop,
		style.paddingRight,
		style.paddingBottom,
		style.paddingLeft,
	];
}

function margin(style: CSSStyleDeclaration): string[] {
	return [
		style.marginTop,
		style.marginRight,
		style.marginBottom,
		style.marginLeft,
	];
}

const tokens: SpaceToken[] = [
	"3xs",
	"2xs",
	"xs",
	"sm",
	"md",
	"lg",
	"xl",
	"2xl",
	"3xl",
	"4xl",
	"section-sm",
	"section",
];

test("it renders a div by default, and component picks the element", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<>
			<Box ref={ref}>Default</Box>
			<Box component="ul" aria-label="Stack">
				<li>Node.js</li>
				<li>AWS</li>
			</Box>
			<Box component="section" aria-label="Contact">
				Write to me
			</Box>
		</>,
	);
	expect(current(ref).tagName).toBe("DIV");
	const list = screen.getByRole("list", { name: "Stack" });
	expect(within(list).getAllByRole("listitem")).toHaveLength(2);
	expect(screen.getByRole("region", { name: "Contact" }).tagName).toBe(
		"SECTION",
	);
});

test("the ref is the root, which takes className and other attributes", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<Box ref={ref} className="mine" id="glue" data-testid="box">
			Content
		</Box>,
	);
	const element = current(ref);
	expect(screen.getByTestId("box")).toBe(element);
	expect(element.id).toBe("glue");
	expect(element.classList.contains("mine")).toBe(true);
});

test("Box has no look of its own", () => {
	const style = styleOf({ children: "Plain" });
	expect(style.display).toBe("block");
	expect(padding(style)).toEqual(["0px", "0px", "0px", "0px"]);
	expect(margin(style)).toEqual(["0px", "0px", "0px", "0px"]);
	expect(style.borderTopWidth).toBe("0px");
	expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
	expect(style.boxShadow).toBe("none");
});

test("the spacing scale runs from 3xs at 4px through lg at 24px to section at 105px", () => {
	expect(space("3xs")).toBe("4px");
	expect(space("lg")).toBe("24px");
	expect(space("section")).toBe("105px");
});

test.each(tokens)("p=%s pads every side with that token", (token) => {
	const value = space(token);
	expect(value).not.toBe("");
	expect(padding(styleOf({ p: token }))).toEqual([value, value, value, value]);
});

test.each(tokens)("m=%s sets that token's margin on every side", (token) => {
	const value = space(token);
	expect(margin(styleOf({ m: token }))).toEqual([value, value, value, value]);
});

test("0 sets no space, even where the element has its own", () => {
	const style = styleOf({
		component: "ul",
		p: 0,
		m: 0,
		children: <li>One</li>,
	});
	expect(padding(style)).toEqual(["0px", "0px", "0px", "0px"]);
	expect(margin(style)).toEqual(["0px", "0px", "0px", "0px"]);
});

test("for padding, a side beats an axis, which beats p", () => {
	const [xs, md, lg] = [space("xs"), space("md"), space("lg")];
	expect(padding(styleOf({ p: "xs", px: "md", pl: "lg" }))).toEqual([
		xs,
		md,
		xs,
		lg,
	]);
	cleanup();
	expect(padding(styleOf({ p: "xs", py: "md", pt: "lg" }))).toEqual([
		lg,
		xs,
		md,
		xs,
	]);
	cleanup();
	expect(padding(styleOf({ p: "lg", pr: 0, pb: "xs" }))).toEqual([
		lg,
		"0px",
		xs,
		lg,
	]);
});

test("for margin, a side beats an axis, which beats m", () => {
	const [xs, md, lg] = [space("xs"), space("md"), space("lg")];
	expect(margin(styleOf({ m: "xs", mx: "md", ml: "lg" }))).toEqual([
		xs,
		md,
		xs,
		lg,
	]);
	cleanup();
	expect(margin(styleOf({ m: "xs", my: "md", mt: "lg" }))).toEqual([
		lg,
		xs,
		md,
		xs,
	]);
	cleanup();
	expect(margin(styleOf({ m: "lg", mr: 0, mb: "xs" }))).toEqual([
		lg,
		"0px",
		xs,
		lg,
	]);
});

test('mx="auto" centres a box that has a width', () => {
	const parent = React.createRef<HTMLDivElement>();
	const ref = React.createRef<HTMLElement>();
	render(
		<div ref={parent} style={{ width: 300 }}>
			<Box ref={ref} mx="auto" style={{ width: 100 }}>
				Centred
			</Box>
		</div>,
	);
	const outer = current(parent).getBoundingClientRect();
	const inner = current(ref).getBoundingClientRect();
	expect(inner.left - outer.left).toBe(100);
	expect(outer.right - inner.right).toBe(100);
});

test("gap sets the row and column gaps of a flex or grid box", () => {
	const md = space("md");
	const grid = styleOf({ display: "grid", gap: "md" });
	expect([grid.rowGap, grid.columnGap]).toEqual([md, md]);
	cleanup();
	const flex = styleOf({ display: "flex", gap: "md" });
	expect([flex.rowGap, flex.columnGap]).toEqual([md, md]);
});

test("rowGap and columnGap each win over gap", () => {
	const [sm, lg, xl] = [space("sm"), space("lg"), space("xl")];
	const rows = styleOf({ display: "flex", gap: "sm", rowGap: "lg" });
	expect([rows.rowGap, rows.columnGap]).toEqual([lg, sm]);
	cleanup();
	const columns = styleOf({ display: "grid", gap: "sm", columnGap: "xl" });
	expect([columns.rowGap, columns.columnGap]).toEqual([sm, xl]);
	cleanup();
	const zero = styleOf({ display: "grid", gap: "sm", rowGap: 0 });
	expect([zero.rowGap, zero.columnGap]).toEqual(["0px", sm]);
});

test.each([
	"block",
	"inline",
	"inline-block",
	"flex",
	"inline-flex",
	"grid",
	"inline-grid",
	"contents",
	"none",
] as const satisfies Array<BoxProps["display"]>)(
	"display %s sets the CSS display",
	(display) => {
		expect(styleOf({ display, children: "Content" }).display).toBe(display);
	},
);

test("your style wins over the shorthands", () => {
	const lg = space("lg");
	const style = styleOf({
		p: "lg",
		m: "lg",
		display: "flex",
		gap: "lg",
		style: { paddingTop: 2, marginLeft: 3, display: "grid", columnGap: 5 },
	});
	expect(padding(style)).toEqual(["2px", lg, lg, lg]);
	expect(margin(style)).toEqual([lg, lg, lg, "3px"]);
	expect(style.display).toBe("grid");
	expect([style.rowGap, style.columnGap]).toEqual([lg, "5px"]);
});
