// Behaviour specs for TimingChart, from design-system/components/TimingChart (README.md and
// api.d.ts). It's built on DiagramHost, whose shared behaviour diagram.test.tsx covers in depth.
import { cleanup, render, screen, within } from "@testing-library/react";
// Type-only: the provider's types are what give the DevTools session its typed send().
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import "#ui/styles.css";
import { TimingChart, type TimingChartProps, type TimingData } from "#ui";

// The site's PDF timing: about 6 s before, 10–20 ms after.
const pdf: TimingData = {
	id: "pdf-timing",
	label: "PDF generation time, before and after the rework",
	description:
		"Before the rework, generating a training specification PDF took about 6 seconds. After it, 10 to 20 milliseconds.",
	axisMax: 6000,
	ticks: [
		{ value: 0, text: "0 s" },
		{ value: 2000, text: "2 s" },
		{ value: 4000, text: "4 s" },
		{ value: 6000, text: "6 s" },
	],
	rows: [
		{ name: "Before", value: 6000, text: "about 6 s" },
		{ name: "After", value: 20, text: "10–20 ms", tone: "accent" },
	],
};

// Four rows, with values off the ticks.
const builds: TimingData = {
	id: "build-times",
	label: "Build time per stage",
	description:
		"Installing takes about 100 seconds, testing 90, bundling 60 and deploying 35.",
	axisMax: 100,
	ticks: [0, 25, 50, 75, 100].map((value) => ({ value, text: `${value} s` })),
	rows: [
		{ name: "Install", value: 100, text: "about 100 s" },
		{ name: "Test", value: 90, text: "about 90 s" },
		{ name: "Bundle", value: 60, text: "about 60 s", tone: "accent" },
		{ name: "Deploy", value: 35, text: "about 35 s" },
	],
};

// A value far below the 2-unit minimum bar: 0.1 of 100 is 0.6 units of the 600-unit axis.
const hairline: TimingData = {
	id: "cache-hit",
	label: "Response time, cold and cached",
	description:
		"A cold response takes about 100 milliseconds, and a cached one a tenth of a millisecond.",
	axisMax: 100,
	ticks: [0, 50, 100].map((value) => ({ value, text: `${value} ms` })),
	rows: [
		{ name: "Cold", value: 100, text: "about 100 ms" },
		{ name: "Cached", value: 0.1, text: "0.1 ms", tone: "accent" },
	],
};

const chartHint = "Scroll sideways for the whole chart.";
const outOfView = { height: "200vh" };

const serverHosts: HTMLElement[] = [];
let isMediaEmulated = false;

afterEach(async () => {
	cleanup();
	for (const host of serverHosts.splice(0)) {
		host.remove();
	}

	document.documentElement.classList.remove("gl-js");
	Reflect.deleteProperty(navigator, "webdriver");
	window.scrollTo(0, 0);
	if (!isMediaEmulated) {
		return;
	}

	isMediaEmulated = false;
	await devTools().send("Emulation.setEmulatedMedia", {
		media: "",
		features: [],
	});
});

/**
The test page's DevTools session, which emulates media features for this page only.
*/
function devTools(): CDPSession {
	return cdp();
}

/**
Plays a reader's browser. The Diagram README names navigator.webdriver as what tells automated
browsers apart, and those skip the entrance.
*/
function pretendNotAutomated() {
	Object.defineProperty(navigator, "webdriver", {
		configurable: true,
		get: () => false,
	});
}

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

/**
Whether the element is drawn at all: no ancestor has display none. (Chromium's checkVisibility
calls SVG children of a hidden group visible.)
*/
function isRendered(element: Element): boolean {
	for (
		let node: Element | null = element;
		node !== null;
		node = node.parentElement
	) {
		if (getComputedStyle(node).display === "none") {
			return false;
		}
	}

	return true;
}

/**
Whether a sighted reader sees the element: drawn, not visibility-hidden, and with no ancestor at
opacity 0.
*/
function isShown(element: Element): boolean {
	if (
		!isRendered(element) ||
		getComputedStyle(element).visibility !== "visible"
	) {
		return false;
	}

	for (
		let node: Element | null = element;
		node !== null;
		node = node.parentElement
	) {
		if (getComputedStyle(node).opacity === "0") {
			return false;
		}
	}

	return true;
}

function isHintShown(): boolean {
	const hint = screen.queryByText(chartHint);
	return hint !== null && isShown(hint);
}

function runningAnimations(root: Element): number {
	return root
		.getAnimations({ subtree: true })
		.filter((animation) => animation.playState === "running").length;
}

function name(element: Element): string {
	const text = element.textContent.trim().slice(0, 24);
	return text === ""
		? `<${element.tagName.toLowerCase()}>`
		: `<${element.tagName.toLowerCase()}> "${text}"`;
}

/**
A shape a transform has squashed to nothing, such as a bar still at scaleX(0).
*/
function isCollapsed(element: SVGGraphicsElement): boolean {
	const box = element.getBBox();
	const rect = element.getBoundingClientRect();
	return (
		(box.width > 0 && rect.width === 0) || (box.height > 0 && rect.height === 0)
	);
}

/**
What keeps a chart from being fully drawn and at rest: running animations, and drawn parts that
are faded, hidden or squashed. Empty once the chart is finished.
*/
function unfinished(root: Element): string[] {
	const problems: string[] = [];
	const running = runningAnimations(root);
	if (running > 0) {
		problems.push(`${running} animations running`);
	}

	for (const element of [root, ...root.querySelectorAll("*")]) {
		// Parts that aren't drawn at all, such as the hint while the host fits.
		if (!isRendered(element)) {
			continue;
		}

		const style = getComputedStyle(element);
		if (style.opacity !== "1") {
			problems.push(`${name(element)} at opacity ${style.opacity}`);
		}

		if (style.visibility !== "visible") {
			problems.push(`${name(element)} is ${style.visibility}`);
		}

		if (element instanceof SVGGraphicsElement && isCollapsed(element)) {
			problems.push(`${name(element)} collapsed`);
		}
	}

	return problems;
}

/**
The chart's outermost SVG, whose viewBox is the chart's coordinate space.
*/
function figureOf(root: Element): SVGSVGElement {
	const svg = root.querySelector("svg");
	if (!svg) {
		throw new Error("the chart has no SVG");
	}

	return svg;
}

/**
An element's box in the chart's own coordinates.
*/
function boxOf(element: Element, svg: SVGSVGElement) {
	const matrix = svg.getScreenCTM()?.inverse();
	if (!matrix) {
		throw new Error("the SVG isn't rendered");
	}

	const rect = element.getBoundingClientRect();
	const topLeft = new DOMPoint(rect.left, rect.top).matrixTransform(matrix);
	const bottomRight = new DOMPoint(rect.right, rect.bottom).matrixTransform(
		matrix,
	);
	return {
		left: topLeft.x,
		top: topLeft.y,
		bottom: bottomRight.y,
		centerX: (topLeft.x + bottomRight.x) / 2,
	};
}

function serverRender(element: React.ReactElement, width: number): HTMLElement {
	const host = document.createElement("div");
	host.style.width = `${width}px`;
	host.innerHTML = renderToString(element);
	document.body.append(host);
	serverHosts.push(host);
	const root = host.firstElementChild;
	if (!(root instanceof HTMLElement)) {
		throw new TypeError("the server rendered no element");
	}

	return root;
}

function Chart({
	width,
	...props
}: Readonly<
	TimingChartProps & { width: number; ref?: React.Ref<HTMLDivElement> }
>) {
	return (
		<>
			<button type="button">Before</button>
			<div style={{ width }}>
				<TimingChart {...props} />
			</div>
			<button type="button">After</button>
		</>
	);
}

async function tabFromBefore(): Promise<Element | null> {
	screen.getByRole("button", { name: "Before" }).focus();
	await userEvent.tab();
	return document.activeElement;
}

/**
Each tick's centre, in chart units, by its value.
*/
function tickCentres(
	data: TimingData,
	svg: SVGSVGElement,
): Map<number, number> {
	return new Map(
		data.ticks.map((tick) => [
			tick.value,
			boxOf(screen.getByText(tick.text), svg).centerX,
		]),
	);
}

function at(centres: Map<number, number>, value: number): number {
	const centre = centres.get(value);
	if (centre === undefined) {
		throw new Error(`no tick at ${value}`);
	}

	return centre;
}

describe("TimingChart: content and naming", () => {
	test("the chart is one group named by data.label and described by data.description, the SVG's desc", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<TimingChart ref={ref} data={pdf} />);
		const group = screen.getByRole("group", { name: pdf.label });
		expect(group).toHaveAccessibleDescription(pdf.description);
		const desc = figureOf(current(ref)).querySelector(":scope > desc");
		expect(desc?.textContent).toBe(pdf.description);
	});

	test("row names and values are text inside the group that screen readers can reach, and every tick is drawn", () => {
		render(<TimingChart data={builds} />);
		const group = screen.getByRole("group", { name: builds.label });
		for (const row of builds.rows) {
			for (const text of [row.name, row.text]) {
				const element = within(group).getByText(text);
				expect(element.closest('[aria-hidden="true"]')).toBeNull();
				expect(isShown(element)).toBe(true);
			}
		}

		for (const tick of builds.ticks) {
			expect(isShown(within(group).getByText(tick.text))).toBe(true);
		}
	});

	test("two charts of one dataset each keep their own description", () => {
		render(
			<>
				<TimingChart
					data={{
						...pdf,
						label: "First copy",
						description: "The first copy's description.",
					}}
				/>
				<TimingChart
					data={{
						...pdf,
						label: "Second copy",
						description: "The second copy's description.",
					}}
				/>
			</>,
		);
		expect(
			screen.getByRole("group", { name: "First copy" }),
		).toHaveAccessibleDescription("The first copy's description.");
		expect(
			screen.getByRole("group", { name: "Second copy" }),
		).toHaveAccessibleDescription("The second copy's description.");
		const ids = [...document.querySelectorAll("[id]")].map(
			(element) => element.id,
		);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test("the root is the ref's div: it keeps data-chart, merges className with its own, and takes style and other attributes", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<TimingChart
				ref={ref}
				data={pdf}
				id="pdf-chart"
				className="case-study"
				style={{ marginTop: 12 }}
				data-testid="chart"
			/>,
		);
		const root = current(ref);
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(screen.getByTestId("chart")).toBe(root);
		expect(root.dataset.chart).toBe("pdf-timing");
		expect(root.id).toBe("pdf-chart");
		expect(root.classList.contains("case-study")).toBe(true);
		expect(root.classList.length).toBeGreaterThan(1);
		expect(getComputedStyle(root).marginTop).toBe("12px");
		expect(root.contains(screen.getByRole("group", { name: pdf.label }))).toBe(
			true,
		);
	});
});

describe("TimingChart: the linear axis", () => {
	test("ticks sit on a linear axis: equal steps in value are equal steps across", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 1644 }}>
				<TimingChart ref={ref} data={builds} />
			</div>,
		);
		const centres = tickCentres(builds, figureOf(current(ref)));
		const step = at(centres, 25) - at(centres, 0);
		expect(step).toBeGreaterThan(0);
		for (const value of [50, 75, 100]) {
			expect(at(centres, value) - at(centres, value - 25)).toBeCloseTo(step, 0);
		}
	});

	test("each value sits just past its bar's tip, on the same linear scale as the ticks", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 1644 }}>
				<TimingChart ref={ref} data={builds} />
			</div>,
		);
		const svg = figureOf(current(ref));
		const centres = tickCentres(builds, svg);
		const zero = at(centres, 0);
		const full = at(centres, builds.axisMax);
		const gaps = builds.rows.map((row) => {
			const length = (row.value / builds.axisMax) * (full - zero);
			return boxOf(screen.getByText(row.text), svg).left - length - zero;
		});
		const [first] = gaps;
		expect(first).toBeGreaterThan(0);
		expect(first).toBeLessThan(40);
		for (const gap of gaps) {
			expect(gap).toBeCloseTo(first, 0);
		}
	});

	test("a tiny value is still drawn 2 units wide, so its value sits 2 units past the axis origin plus the usual gap", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 1644 }}>
				<TimingChart ref={ref} data={hairline} />
			</div>,
		);
		const svg = figureOf(current(ref));
		const centres = tickCentres(hairline, svg);
		const zero = at(centres, 0);
		const gap =
			boxOf(screen.getByText("about 100 ms"), svg).left - at(centres, 100);
		const cached = boxOf(screen.getByText("0.1 ms"), svg).left;
		expect(cached - zero - gap).toBeCloseTo(2, 0);
	});

	test("rows beyond two stack with the same spacing above the axis, and the chart grows to fit them", () => {
		const fourRef = React.createRef<HTMLDivElement>();
		const twoRef = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={{ width: 380 }}>
					<TimingChart ref={fourRef} data={builds} />
				</div>
				<div style={{ width: 380 }}>
					<TimingChart ref={twoRef} data={pdf} />
				</div>
			</>,
		);
		const four = current(fourRef);
		const svg = figureOf(four);
		const names = builds.rows.map((row) =>
			boxOf(within(four).getByText(row.name), svg),
		);
		const spacing = names[1].top - names[0].top;
		expect(spacing).toBeGreaterThan(0);
		for (const [index, box] of names.slice(1).entries()) {
			expect(box.top - names[index].top).toBeCloseTo(spacing, 0);
		}

		const rowsEnd = Math.max(...names.map((box) => box.bottom));
		for (const tick of builds.ticks) {
			const tickTop = boxOf(within(four).getByText(tick.text), svg).top;
			expect(tickTop).toBeGreaterThan(rowsEnd);
		}

		expect(svg.getBoundingClientRect().height).toBeGreaterThan(
			figureOf(current(twoRef)).getBoundingClientRect().height,
		);
	});
});

describe("TimingChart: scale and scrolling", () => {
	test("with the default minScale the chart fills its host, with no scrolling, hint or tab stop", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Chart ref={ref} width={300} data={pdf} />);
		const root = current(ref);
		expect(figureOf(root).getBoundingClientRect().width).toBeCloseTo(300, 0);
		for (const element of [root, ...root.querySelectorAll("*")]) {
			expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
		}

		expect(isHintShown()).toBe(false);
		expect(await tabFromBefore()).toBe(
			screen.getByRole("button", { name: "After" }),
		);
	});

	test("below 820 × minScale the host scrolls sideways with its hint under it, Tab reaches it as a named group, and arrow keys scroll it", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Chart ref={ref} width={300} data={pdf} minScale={0.4} />);
		const group = screen.getByRole("group", { name: pdf.label });
		expect(figureOf(current(ref)).getBoundingClientRect().width).toBeCloseTo(
			328,
			0,
		);
		expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
		const hint = screen.getByText(chartHint);
		expect(isShown(hint)).toBe(true);
		expect(hint.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			group.getBoundingClientRect().bottom - 0.5,
		);

		expect(await tabFromBefore()).toBe(group);
		// Chromium's Tab reaches any scroller on its own; browsers that don't need the host's own
		// tab stop.
		expect(group.tabIndex).toBe(0);
		await userEvent.keyboard("{ArrowRight}");
		await expect.poll(() => group.scrollLeft).toBeGreaterThan(0);
		await userEvent.keyboard("{ArrowLeft}");
		await expect.poll(() => group.scrollLeft).toBe(0);
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "After" }),
		);
		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(group);
	});

	test("above its floor the host fits: no hint, and Tab passes it by", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Chart ref={ref} width={380} data={pdf} minScale={0.4} />);
		expect(figureOf(current(ref)).getBoundingClientRect().width).toBeCloseTo(
			380,
			0,
		);
		expect(isHintShown()).toBe(false);
		expect(await tabFromBefore()).toBe(
			screen.getByRole("button", { name: "After" }),
		);
	});
});

describe("TimingChart: reveal", () => {
	test("automated browsers get the finished chart at once, even out of view", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<TimingChart ref={ref} data={pdf} />
				</div>
			</>,
		);
		const root = current(ref);
		expect(unfinished(root)).toEqual([]);
		for (const row of pdf.rows) {
			expect(isShown(within(root).getByText(row.text))).toBe(true);
		}
	});

	test("for a reader, the values wait out of view and the bars grow in once the chart scrolls into view; reveal={false} shows it at once", async () => {
		pretendNotAutomated();
		const revealRef = React.createRef<HTMLDivElement>();
		const plainRef = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<TimingChart ref={revealRef} data={pdf} />
				</div>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<TimingChart ref={plainRef} data={pdf} reveal={false} />
				</div>
			</>,
		);
		const revealing = current(revealRef);
		expect(unfinished(current(plainRef))).toEqual([]);
		for (const row of pdf.rows) {
			expect(isShown(within(revealing).getByText(row.text))).toBe(false);
		}

		revealing.scrollIntoView({ block: "center" });
		await expect
			.poll(() => unfinished(revealing), { timeout: 5000 })
			.toEqual([]);
		for (const row of pdf.rows) {
			expect(isShown(within(revealing).getByText(row.text))).toBe(true);
		}
	});

	test("under reduced motion the chart renders finished, even out of view", async () => {
		pretendNotAutomated();
		isMediaEmulated = true;
		await devTools().send("Emulation.setEmulatedMedia", {
			features: [{ name: "prefers-reduced-motion", value: "reduce" }],
		});
		const ref = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<TimingChart ref={ref} data={pdf} />
				</div>
			</>,
		);
		expect(unfinished(current(ref))).toEqual([]);
	});

	test("without JavaScript the server markup is fully visible, named and described", () => {
		const root = serverRender(<TimingChart data={pdf} />, 380);
		expect(unfinished(root)).toEqual([]);
		const group = within(root).getByRole("group", { name: pdf.label });
		expect(group).toHaveAccessibleDescription(pdf.description);
		for (const row of pdf.rows) {
			expect(isShown(within(group).getByText(row.text))).toBe(true);
		}
	});

	test("with gl-js on <html>, server markup that never hydrates starts hidden, and the failsafe shows it after 2.5 s", async () => {
		document.documentElement.classList.add("gl-js");
		const root = serverRender(<TimingChart data={pdf} />, 380);
		const start = performance.now();
		const values = pdf.rows.map((row) => within(root).getByText(row.text));
		for (const value of values) {
			expect(isShown(value)).toBe(false);
		}

		await expect
			.poll(() => values.every((value) => isShown(value)), {
				timeout: 6000,
				interval: 25,
			})
			.toBe(true);
		expect(performance.now() - start).toBeGreaterThan(2000);
		await expect.poll(() => unfinished(root), { timeout: 3000 }).toEqual([]);
	}, 15_000);
});
