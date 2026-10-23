import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import "#ui/styles.css";
import { Divider } from "#ui";

afterEach(() => {
	cleanup();
});

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

function rect(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function orientation(element: Element): string {
	return element.getAttribute("aria-orientation") ?? "horizontal";
}

test("a plain divider is an hr, which is a horizontal separator on its own", () => {
	const ref = React.createRef<HTMLElement>();
	render(<Divider ref={ref} />);
	const separator = screen.getByRole("separator");
	expect(separator).toBe(ref.current);
	expect(separator).toBeInstanceOf(HTMLHRElement);
	expect(orientation(separator)).toBe("horizontal");
});

test("any other element gets the separator role", () => {
	const ref = React.createRef<HTMLElement>();
	render(<Divider ref={ref} component="div" />);
	const separator = screen.getByRole("separator");
	expect(separator).toBe(ref.current);
	expect(separator.tagName).toBe("DIV");
	expect(orientation(separator)).toBe("horizontal");
});

test('component="li" puts a separator inside a list', () => {
	render(
		<ul aria-label="Contact">
			<li>Email</li>
			<Divider component="li" variant="inset" />
			<li>GitHub</li>
		</ul>,
	);
	const list = screen.getByRole("list", { name: "Contact" });
	const separator = within(list).getByRole("separator");
	expect(separator.tagName).toBe("LI");
	expect(separator.parentElement).toBe(list);
	expect(within(list).getAllByRole("listitem")).toHaveLength(2);
});

test("a vertical divider says so with aria-orientation, as an hr or another element", () => {
	render(
		<>
			<Divider orientation="vertical" aria-label="Rule" />
			<Divider orientation="vertical" component="div" aria-label="Div rule" />
		</>,
	);
	const rule = screen.getByRole("separator", { name: "Rule" });
	expect(rule).toBeInstanceOf(HTMLHRElement);
	expect(rule.getAttribute("aria-orientation")).toBe("vertical");
	const division = screen.getByRole("separator", { name: "Div rule" });
	expect(division.tagName).toBe("DIV");
	expect(division.getAttribute("aria-orientation")).toBe("vertical");
});

test("a label names the divider through aria-labelledby, and the divider becomes a div", () => {
	const ref = React.createRef<HTMLElement>();
	render(<Divider ref={ref}>Earlier roles</Divider>);
	const separator = screen.getByRole("separator", { name: "Earlier roles" });
	expect(separator).toBe(ref.current);
	expect(separator).toBeInstanceOf(HTMLDivElement);
	const ids = (separator.getAttribute("aria-labelledby") ?? "")
		.split(" ")
		.filter(Boolean);
	expect(ids.length).toBeGreaterThan(0);
	const labels = ids.map(
		(id) => document.querySelector(`#${CSS.escape(id)}`)?.textContent,
	);
	expect(labels.join(" ")).toBe("Earlier roles");
});

test("aria-hidden takes a decorative rule out of the accessibility tree", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<div>
			<a href="#github">GitHub</a>
			<Divider ref={ref} aria-hidden orientation="vertical" />
			<a href="#linkedin">LinkedIn</a>
		</div>,
	);
	expect(screen.queryByRole("separator")).toBeNull();
	expect(current(ref).getAttribute("aria-hidden")).toBe("true");
});

test("the ref is the root, which takes className and other attributes", () => {
	const ref = React.createRef<HTMLElement>();
	render(<Divider ref={ref} className="mine" id="rule" data-testid="rule" />);
	const element = current(ref);
	expect(screen.getByTestId("rule")).toBe(element);
	expect(element.id).toBe("rule");
	expect(element.classList.contains("mine")).toBe(true);
});

test("a horizontal divider is a 1px line across its container, with no margin of its own", () => {
	const parent = React.createRef<HTMLDivElement>();
	const ref = React.createRef<HTMLElement>();
	render(
		<div ref={parent} style={{ width: 400 }}>
			<Divider ref={ref} />
		</div>,
	);
	const line = rect(current(ref));
	const outer = rect(current(parent));
	expect([line.left, line.width, line.height]).toEqual([outer.left, 400, 1]);
	const style = getComputedStyle(current(ref));
	expect([
		style.marginTop,
		style.marginRight,
		style.marginBottom,
		style.marginLeft,
	]).toEqual(["0px", "0px", "0px", "0px"]);
});

test("a vertical divider is 1px wide and one line of text tall, centred on its row", () => {
	const row = React.createRef<HTMLDivElement>();
	const ref = React.createRef<HTMLElement>();
	render(
		<div
			ref={row}
			style={{ display: "flex", alignItems: "stretch", fontSize: 16 }}
		>
			<span style={{ height: 60 }}>Node.js</span>
			<Divider ref={ref} orientation="vertical" />
			<span>TypeScript</span>
		</div>,
	);
	const line = rect(current(ref));
	const box = rect(current(row));
	expect(line.width).toBe(1);
	expect(line.height).toBeGreaterThanOrEqual(16);
	expect(line.height).toBeLessThanOrEqual(25.6);
	expect((line.top + line.bottom) / 2).toBeCloseTo(
		(box.top + box.bottom) / 2,
		1,
	);
});

test("flexItem stretches a vertical divider to the row's full height", () => {
	const row = React.createRef<HTMLDivElement>();
	const ref = React.createRef<HTMLElement>();
	render(
		<div ref={row} style={{ display: "flex", alignItems: "stretch" }}>
			<span style={{ height: 60 }}>Download</span>
			<Divider ref={ref} flexItem orientation="vertical" />
			<span>Share</span>
		</div>,
	);
	const line = rect(current(ref));
	const box = rect(current(row));
	expect([line.top, line.height, line.width]).toEqual([box.top, 60, 1]);
});

test("inset starts the line 42px in, or at --gl-divider-inset", () => {
	const parent = React.createRef<HTMLDivElement>();
	const inset = React.createRef<HTMLElement>();
	const custom = React.createRef<HTMLElement>();
	render(
		<div ref={parent} style={{ width: 400 }}>
			<Divider ref={inset} variant="inset" />
			<Divider
				ref={custom}
				variant="inset"
				style={{ "--gl-divider-inset": "60px" } as React.CSSProperties}
			/>
		</div>,
	);
	const outer = rect(current(parent));
	const line = rect(current(inset));
	expect([line.left - outer.left, line.right]).toEqual([42, outer.right]);
	const moved = rect(current(custom));
	expect([moved.left - outer.left, moved.right]).toEqual([60, outer.right]);
});

test("middle stops the line 16px short of both ends", () => {
	const parent = React.createRef<HTMLDivElement>();
	const ref = React.createRef<HTMLElement>();
	render(
		<div ref={parent} style={{ width: 400 }}>
			<Divider ref={ref} variant="middle" />
		</div>,
	);
	const outer = rect(current(parent));
	const line = rect(current(ref));
	expect([line.left - outer.left, outer.right - line.right]).toEqual([16, 16]);
});

test("a vertical middle divider stops 8px short of the top and bottom", () => {
	const row = React.createRef<HTMLDivElement>();
	const ref = React.createRef<HTMLElement>();
	render(
		<div ref={row} style={{ display: "flex", alignItems: "stretch" }}>
			<span style={{ height: 60 }}>Download</span>
			<Divider ref={ref} flexItem orientation="vertical" variant="middle" />
			<span>Share</span>
		</div>,
	);
	const box = rect(current(row));
	const line = rect(current(ref));
	expect([line.top - box.top, box.bottom - line.bottom]).toEqual([8, 8]);
});

test("a label sits centred between two lines by default", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<div style={{ width: 400 }}>
			<Divider ref={ref}>Earlier roles</Divider>
		</div>,
	);
	const line = rect(current(ref));
	const label = rect(screen.getByText("Earlier roles"));
	expect(label.left).toBeGreaterThan(line.left);
	expect(label.right).toBeLessThan(line.right);
	expect((label.left + label.right) / 2).toBeCloseTo(
		(line.left + line.right) / 2,
		0,
	);
});

test('textAlign="left" puts the label at the start, the line after it', () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<div style={{ width: 400 }}>
			<Divider ref={ref} textAlign="left">
				Elsewhere
			</Divider>
		</div>,
	);
	const line = rect(current(ref));
	const label = rect(screen.getByText("Elsewhere"));
	expect(label.left).toBeCloseTo(line.left, 0);
	expect(label.right).toBeLessThan(line.right);
});
