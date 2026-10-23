import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import "#ui/styles.css";
import { GLYPHS, Icon, iconNames, SvgIcon } from "#ui";

afterEach(() => {
	cleanup();
});

const ink = "rgb(10, 20, 30)";

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

function shapes(svg: SVGSVGElement): SVGGeometryElement[] {
	return [
		...svg.querySelectorAll<SVGGeometryElement>(
			"path, circle, rect, ellipse, line, polyline, polygon",
		),
	];
}

test("iconNames lists every glyph in GLYPHS once, from the site's arrow-ne to the status marks", () => {
	expect(new Set(iconNames).size).toBe(iconNames.length);
	expect(iconNames.toSorted()).toEqual(Object.keys(GLYPHS).toSorted());
	expect(iconNames).toEqual(
		expect.arrayContaining([
			"arrow-ne",
			"close",
			"check",
			"chevron-down",
			"chevrons-right",
			"success",
			"warning",
			"error",
			"info",
			"star",
		]),
	);
});

test("arrow-ne is the site's north-east arrow, path for path", () => {
	expect(GLYPHS["arrow-ne"]).toEqual([{ d: "M6 18 18 6M6 6h12v12" }]);
	const ref = React.createRef<SVGSVGElement>();
	render(<Icon ref={ref} name="arrow-ne" />);
	const paths = shapes(current(ref));
	expect(paths.map((path) => path.getAttribute("d"))).toEqual([
		"M6 18 18 6M6 6h12v12",
	]);
});

test("every glyph draws something, inside the 24-unit grid", () => {
	const icons = new Map<string, SVGSVGElement>();
	render(
		<div>
			{iconNames.map((name) => (
				<Icon
					key={name}
					ref={(element) => {
						if (element) {
							icons.set(name, element);
						}
					}}
					name={name}
				/>
			))}
		</div>,
	);
	expect(icons.keys().toArray()).toEqual(iconNames);
	for (const [name, svg] of icons) {
		const box = svg.getBBox();
		expect(box.width + box.height, name).toBeGreaterThan(0);
		expect(box.x, name).toBeGreaterThanOrEqual(0);
		expect(box.y, name).toBeGreaterThanOrEqual(0);
		expect(box.x + box.width, name).toBeLessThanOrEqual(24);
		expect(box.y + box.height, name).toBeLessThanOrEqual(24);
	}
});

test("the shell is a 24-unit grid stroked in currentColor, 1.5 wide, with round caps and joins", () => {
	const ref = React.createRef<SVGSVGElement>();
	render(
		<span style={{ color: ink }}>
			<Icon ref={ref} name="check" />
		</span>,
	);
	const svg = current(ref);
	const { x, y, width, height } = svg.viewBox.baseVal;
	expect({ x, y, width, height }).toEqual({
		x: 0,
		y: 0,
		width: 24,
		height: 24,
	});
	const style = getComputedStyle(svg);
	expect(style.stroke).toBe(ink);
	expect(style.strokeWidth).toBe("1.5px");
	expect(style.strokeLinecap).toBe("round");
	expect(style.strokeLinejoin).toBe("round");
	expect(style.fill).toBe("none");
});

test("size is 18px by default and takes a number or a CSS length", () => {
	const plain = React.createRef<SVGSVGElement>();
	const number = React.createRef<SVGSVGElement>();
	const length = React.createRef<SVGSVGElement>();
	render(
		<div style={{ fontSize: 10 }}>
			<Icon ref={plain} name="star" />
			<Icon ref={number} name="star" size={32} />
			<Icon ref={length} name="star" size="2em" />
		</div>,
	);
	for (const [ref, side] of [
		[plain, 18],
		[number, 32],
		[length, 20],
	] as const) {
		const box = current(ref).getBoundingClientRect();
		expect([box.width, box.height]).toEqual([side, side]);
	}
});

test("strokeWidth sets the stroke on the 24-unit grid", () => {
	const ref = React.createRef<SVGSVGElement>();
	render(<Icon ref={ref} name="plus" strokeWidth={2} />);
	expect(getComputedStyle(current(ref)).strokeWidth).toBe("2px");
});

test("filled fills the closed shapes in currentColor, and they are hollow by default", () => {
	const hollow = React.createRef<SVGSVGElement>();
	const filled = React.createRef<SVGSVGElement>();
	render(
		<span style={{ color: ink }}>
			<Icon ref={hollow} name="star" />
			<Icon ref={filled} filled name="star" />
		</span>,
	);
	const hollowShapes = shapes(current(hollow));
	const filledShapes = shapes(current(filled));
	expect(hollowShapes.length).toBeGreaterThan(0);
	expect(filledShapes.length).toBeGreaterThan(0);
	for (const shape of hollowShapes) {
		expect(getComputedStyle(shape).fill).toBe("none");
	}

	for (const shape of filledShapes) {
		expect(getComputedStyle(shape).fill).toBe(ink);
	}
});

test("a title makes the icon an image named by it", () => {
	const ref = React.createRef<SVGSVGElement>();
	render(<Icon ref={ref} name="success" title="Done" />);
	const image = screen.getByRole("img", { name: "Done" });
	expect(image).toBe(ref.current);
	expect(image.getAttribute("aria-hidden")).not.toBe("true");
});

test("without a title the icon is decorative: aria-hidden, and no part of a link's name", () => {
	const ref = React.createRef<SVGSVGElement>();
	render(
		<a href="#repo">
			Repository
			<Icon ref={ref} name="arrow-ne" />
		</a>,
	);
	expect(current(ref).getAttribute("aria-hidden")).toBe("true");
	expect(screen.queryByRole("img")).toBeNull();
	expect(screen.getByRole("link", { name: "Repository" })).toBeTruthy();
});

test("SvgIcon draws your own paths on the same shell", () => {
	const ref = React.createRef<SVGSVGElement>();
	render(
		<span style={{ color: ink }}>
			<SvgIcon ref={ref} title="Wave">
				<path d="M4 18c4-1 6-4 8-8s4-6 8-6" />
			</SvgIcon>
		</span>,
	);
	const svg = current(ref);
	expect(screen.getByRole("img", { name: "Wave" })).toBe(svg);
	expect(shapes(svg).map((shape) => shape.getAttribute("d"))).toEqual([
		"M4 18c4-1 6-4 8-8s4-6 8-6",
	]);
	expect(svg.viewBox.baseVal.width).toBe(24);
	expect(svg.getBoundingClientRect().width).toBe(18);
	const style = getComputedStyle(svg);
	expect(style.stroke).toBe(ink);
	expect(style.strokeWidth).toBe("1.5px");
	expect(style.strokeLinecap).toBe("round");
	expect(style.strokeLinejoin).toBe("round");
});

test("SvgIcon takes another viewBox", () => {
	const ref = React.createRef<SVGSVGElement>();
	render(
		<SvgIcon ref={ref} viewBox="0 0 48 48">
			<circle cx="24" cy="24" r="20" />
		</SvgIcon>,
	);
	const { width, height } = current(ref).viewBox.baseVal;
	expect([width, height]).toEqual([48, 48]);
});

test("the ref is the svg element, which takes className and the other SVG attributes", () => {
	const icon = React.createRef<SVGSVGElement>();
	const shell = React.createRef<SVGSVGElement>();
	render(
		<>
			<Icon
				ref={icon}
				name="mail"
				className="mine"
				data-testid="icon"
				opacity={0.5}
			/>
			<SvgIcon ref={shell} className="theirs" data-testid="shell" />
		</>,
	);
	expect(icon.current).toBeInstanceOf(SVGSVGElement);
	expect(shell.current).toBeInstanceOf(SVGSVGElement);
	expect(screen.getByTestId("icon")).toBe(icon.current);
	expect(screen.getByTestId("shell")).toBe(shell.current);
	expect(current(icon).classList.contains("mine")).toBe(true);
	expect(current(shell).classList.contains("theirs")).toBe(true);
	expect(getComputedStyle(current(icon)).opacity).toBe("0.5");
});
