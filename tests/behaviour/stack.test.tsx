import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import { type SpaceToken, type StackProps, Stack } from "#ui";

afterEach(() => {
	cleanup();
});

// Directions here are single values or xs, which hold at every width. The sm to xl
// breakpoints are viewport media queries, which these specs don't resize.

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

function rect(testId: string): DOMRect {
	return screen.getByTestId(testId).getBoundingClientRect();
}

/**
The element after this one, which must exist.
*/
function next(element: Element): Element {
	const sibling = element.nextElementSibling;
	if (sibling === null) {
		throw new Error("nothing follows the element");
	}

	return sibling;
}

/**
The length a spacing token holds, in px, read from the stylesheet's custom property.
*/
function space(token: SpaceToken): number {
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(`--space-${token}`)
		.trim();
	if (!value.endsWith("px")) {
		throw new Error(`--space-${token} is ${value}, not a length in px`);
	}

	return Number(value.slice(0, -2));
}

/**
Renders a Stack of three labelled children, a, b and c.
*/
function stack(props: StackProps = {}): void {
	render(
		<Stack data-testid="stack" {...props}>
			<span data-testid="a">Domain</span>
			<span data-testid="b">Application</span>
			<span data-testid="c">Infrastructure</span>
		</Stack>,
	);
}

test("children stack in a column by default, with no gap", () => {
	stack({ style: { width: 300 } });
	const [a, b, c] = [rect("a"), rect("b"), rect("c")];
	expect(b.top).toBe(a.bottom);
	expect(c.top).toBe(b.bottom);
	expect([b.left, c.left]).toEqual([a.left, a.left]);
});

test('direction="row" lays the children side by side', () => {
	stack({ direction: "row" });
	const [a, b, c] = [rect("a"), rect("b"), rect("c")];
	expect(b.left).toBe(a.right);
	expect(c.left).toBe(b.right);
	expect([b.top, c.top]).toEqual([a.top, a.top]);
});

test('direction="row-reverse" runs the row from the end', () => {
	stack({ direction: "row-reverse", style: { width: 500 } });
	const [box, a, b, c] = [rect("stack"), rect("a"), rect("b"), rect("c")];
	expect(a.right).toBe(box.right);
	expect(b.right).toBe(a.left);
	expect(c.right).toBe(b.left);
});

test('direction="column-reverse" stacks the children upwards', () => {
	stack({ direction: "column-reverse", style: { width: 300 } });
	const [a, b, c] = [rect("a"), rect("b"), rect("c")];
	expect(a.top).toBe(b.bottom);
	expect(b.top).toBe(c.bottom);
});

test('direction="column" is the column', () => {
	stack({ direction: "column", style: { width: 300 } });
	const [a, b] = [rect("a"), rect("b")];
	expect(b.top).toBe(a.bottom);
});

test("a direction for xs holds at every width, since a breakpoint without a value takes the one below", () => {
	stack({ direction: { xs: "row" } });
	const [a, b] = [rect("a"), rect("b")];
	expect(b.left).toBe(a.right);
	expect(b.top).toBe(a.top);
});

test("spacing sets a token gap between the children", () => {
	stack({ spacing: "md", style: { width: 300 } });
	const [a, b, c] = [rect("a"), rect("b"), rect("c")];
	expect(b.top - a.bottom).toBeCloseTo(space("md"), 1);
	expect(c.top - b.bottom).toBeCloseTo(space("md"), 1);
});

test("gap is an alias of spacing, and spacing wins when both are set", () => {
	stack({ direction: "row", gap: "lg" });
	expect(rect("b").left - rect("a").right).toBeCloseTo(space("lg"), 1);
	cleanup();
	stack({ direction: "row", gap: "lg", spacing: "xs" });
	expect(rect("b").left - rect("a").right).toBeCloseTo(space("xs"), 1);
	cleanup();
	stack({ direction: "row", gap: "lg", spacing: 0 });
	expect(rect("b").left).toBe(rect("a").right);
});

test("divider={true} draws a hairline between each pair of children, across the column", () => {
	stack({ divider: true, spacing: "md", style: { width: 300 } });
	const [a, b, c] = [
		screen.getByTestId("a"),
		screen.getByTestId("b"),
		screen.getByTestId("c"),
	];
	expect(a.previousElementSibling).toBeNull();
	expect(c.nextElementSibling).toBeNull();
	for (const [before, after] of [
		[a, b],
		[b, c],
	]) {
		const rule = next(before);
		expect(next(rule)).toBe(after);
		const line = rule.getBoundingClientRect();
		expect([line.width, line.height]).toEqual([300, 1]);
		expect(line.top - before.getBoundingClientRect().bottom).toBeCloseTo(
			space("md"),
			1,
		);
		expect(after.getBoundingClientRect().top - line.bottom).toBeCloseTo(
			space("md"),
			1,
		);
	}
});

test("the hairline turns vertical in a row, running the row's height", () => {
	stack({
		direction: "row",
		divider: true,
		spacing: "sm",
		style: { height: 40 },
	});
	const [a, b] = [screen.getByTestId("a"), screen.getByTestId("b")];
	const rule = next(a);
	expect(next(rule)).toBe(b);
	const line = rule.getBoundingClientRect();
	expect([line.width, line.height]).toEqual([1, 40]);
	expect(line.left - a.getBoundingClientRect().right).toBeCloseTo(
		space("sm"),
		1,
	);
	expect(b.getBoundingClientRect().left - line.right).toBeCloseTo(
		space("sm"),
		1,
	);
});

test("divider takes any element to place between each pair of children", () => {
	stack({ divider: <hr data-testid="rule" /> });
	const rules = screen.getAllByTestId("rule");
	expect(rules).toHaveLength(2);
	expect(rules[0]?.previousElementSibling).toBe(screen.getByTestId("a"));
	expect(rules[0]?.nextElementSibling).toBe(screen.getByTestId("b"));
	expect(rules[1]?.previousElementSibling).toBe(screen.getByTestId("b"));
	expect(rules[1]?.nextElementSibling).toBe(screen.getByTestId("c"));
});

test("null and false children are skipped, so dividers never double up", () => {
	render(
		<>
			<Stack divider={<hr data-testid="rule" />}>
				{null}
				<span data-testid="a">Domain</span>
				{false}
				{null}
				<span data-testid="b">Application</span>
				{false}
			</Stack>
			<Stack divider>
				{false}
				<span data-testid="c">Spike 0</span>
				{null}
				<span data-testid="d">Spike 1</span>
				{null}
			</Stack>
		</>,
	);
	expect(screen.getAllByTestId("rule")).toHaveLength(1);
	expect(screen.getByTestId("a").nextElementSibling).toBe(
		screen.getByTestId("rule"),
	);
	const c = screen.getByTestId("c");
	const d = screen.getByTestId("d");
	expect(c.previousElementSibling).toBeNull();
	expect(next(next(c))).toBe(d);
	expect(d.nextElementSibling).toBeNull();
});

test("children stretch across the cross axis by default", () => {
	render(
		<>
			<Stack direction="row">
				<span data-testid="tall" style={{ height: 60 }}>
					Tall
				</span>
				<span data-testid="short">Short</span>
			</Stack>
			<Stack data-testid="stack" style={{ width: 300 }}>
				<span data-testid="item">Item</span>
			</Stack>
		</>,
	);
	expect(rect("short").height).toBe(60);
	expect(rect("item").width).toBe(300);
});

test("children pack at the start of the main axis by default", () => {
	render(
		<Stack data-testid="stack" direction="row" style={{ width: 400 }}>
			<span data-testid="a">Domain</span>
			<span data-testid="b">Application</span>
		</Stack>,
	);
	expect(rect("a").left).toBe(rect("stack").left);
	expect(rect("b").right).toBeLessThan(rect("stack").right);
});

test.each([
	"flex-start",
	"center",
	"flex-end",
	"stretch",
	"baseline",
	"start",
	"end",
] as const satisfies Array<StackProps["alignItems"]>)(
	"alignItems %s sets the cross-axis alignment",
	(alignItems) => {
		stack({ direction: "row", alignItems });
		expect(getComputedStyle(screen.getByTestId("stack")).alignItems).toBe(
			alignItems,
		);
	},
);

test("alignItems center centres a short child on the row", () => {
	render(
		<Stack data-testid="stack" direction="row" alignItems="center">
			<span style={{ height: 60 }}>Tall</span>
			<span data-testid="short">Short</span>
		</Stack>,
	);
	const [box, short] = [rect("stack"), rect("short")];
	expect(short.height).toBeLessThan(60);
	expect((short.top + short.bottom) / 2).toBeCloseTo(
		(box.top + box.bottom) / 2,
		1,
	);
});

test.each([
	"flex-start",
	"center",
	"flex-end",
	"space-between",
	"space-around",
	"space-evenly",
	"start",
	"end",
] as const satisfies Array<StackProps["justifyContent"]>)(
	"justifyContent %s sets the main-axis distribution",
	(justifyContent) => {
		stack({ direction: "row", justifyContent });
		expect(getComputedStyle(screen.getByTestId("stack")).justifyContent).toBe(
			justifyContent,
		);
	},
);

test('justifyContent="space-between" puts the first and last children at the ends', () => {
	stack({
		direction: "row",
		justifyContent: "space-between",
		style: { width: 500 },
	});
	expect(rect("a").left).toBe(rect("stack").left);
	expect(rect("c").right).toBe(rect("stack").right);
});

test("children stay on one line by default, and wrap lets them wrap", () => {
	const item: React.CSSProperties = { flex: "none", width: 60 };
	function row(name: string, props: StackProps) {
		return (
			<Stack direction="row" style={{ width: 100 }} {...props}>
				<span data-testid={`${name}-a`} style={item}>
					One
				</span>
				<span data-testid={`${name}-b`} style={item}>
					Two
				</span>
			</Stack>
		);
	}

	render(
		<>
			{row("plain", {})}
			{row("wrapping", { wrap: true })}
		</>,
	);
	expect(rect("plain-b").top).toBe(rect("plain-a").top);
	expect(rect("wrapping-b").top).toBeGreaterThanOrEqual(
		rect("wrapping-a").bottom,
	);
});

test("a reversed direction changes only the look: Tab still follows the DOM", async () => {
	render(
		<Stack direction="row-reverse">
			<button type="button">One</button>
			<button type="button">Two</button>
			<button type="button">Three</button>
		</Stack>,
	);
	const [one, two, three] = ["One", "Two", "Three"].map((name) =>
		screen.getByRole("button", { name }),
	);
	expect(one?.getBoundingClientRect().left).toBeGreaterThan(
		two?.getBoundingClientRect().left ?? 0,
	);
	await userEvent.tab();
	expect(document.activeElement).toBe(one);
	await userEvent.tab();
	expect(document.activeElement).toBe(two);
	await userEvent.tab();
	expect(document.activeElement).toBe(three);
});

test("it renders a div by default, and component picks the element", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<>
			<Stack ref={ref}>
				<span>Default</span>
			</Stack>
			<Stack component="ul" direction="row" aria-label="Stack">
				<li>Node.js</li>
				<li>AWS</li>
			</Stack>
			<Stack component="nav" aria-label="Elsewhere">
				<a href="#github">GitHub</a>
			</Stack>
		</>,
	);
	expect(current(ref).tagName).toBe("DIV");
	const list = screen.getByRole("list", { name: "Stack" });
	expect(within(list).getAllByRole("listitem")).toHaveLength(2);
	expect(screen.getByRole("navigation", { name: "Elsewhere" }).tagName).toBe(
		"NAV",
	);
});

test("the ref is the root, which takes className and other attributes", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<Stack ref={ref} className="mine" id="layers" data-testid="layers">
			<span>Domain</span>
		</Stack>,
	);
	const element = current(ref);
	expect(screen.getByTestId("layers")).toBe(element);
	expect(element.id).toBe("layers");
	expect(element.classList.contains("mine")).toBe(true);
});
