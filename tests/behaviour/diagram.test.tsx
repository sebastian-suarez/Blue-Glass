import { cleanup, render, screen, within } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	Diagram,
	DiagramHost,
	type DiagramData,
	type DiagramHostProps,
	type DiagramNodeLine,
} from "#ui";

function boldLine(text: string): Exclude<DiagramNodeLine, string> {
	return { text, bold: true };
}

const flow: DiagramData = {
	id: "site-flow",
	width: 600,
	height: 300,
	label: "How a merge reaches you",
	description:
		"A merged pull request runs GitHub Actions, which syncs the site to a private S3 bucket. A CDN serves it from there.",
	regions: [
		{ x: 0, y: 0, w: 600, h: 140, radius: 16, tone: "panel" },
		{ shape: "circle", x: 440, y: 160, w: 140, h: 140, tone: "ring" },
	],
	nodes: [
		{
			x: 20,
			y: 34,
			w: 150,
			h: 72,
			lines: [boldLine("Pull request"), "checks must pass"],
		},
		{
			x: 225,
			y: 30,
			w: 150,
			h: 80,
			lines: [boldLine("GitHub Actions"), "builds the site", "OIDC, no keys"],
			tone: "accent",
		},
		{
			x: 430,
			y: 34,
			w: 150,
			h: 72,
			lines: [boldLine("S3 bucket"), "private"],
			tone: "accent-fill",
		},
		{ shape: "circle", x: 470, y: 190, w: 80, h: 80, lines: ["CDN"] },
	],
	edges: [
		{
			points: [
				[170, 70],
				[220, 70],
			],
		},
		{
			points: [
				[375, 70],
				[425, 70],
			],
			dashed: true,
		},
		{
			points: [
				[505, 106],
				[505, 150],
				[510, 185],
			],
			arrow: false,
		},
	],
	labels: [
		{ x: 20, y: 160, lines: ["Publish", "on every merge"] },
		{ x: 170, y: 40, w: 55, align: "middle", lines: ["merge"] },
		{ x: 375, y: 40, w: 55, align: "middle", tone: "accent", lines: ["sync"] },
	],
};

const lanes: DiagramData = {
	id: "lanes",
	width: 400,
	height: 220,
	label: "Three lanes",
	description:
		"Requests travel the top lane left to right and the bottom lane right to left. The middle lane is idle.",
	nodes: [],
	edges: [
		{
			points: [
				[20, 40],
				[380, 40],
			],
			tone: "accent",
		},
		{
			points: [
				[20, 110],
				[380, 110],
			],
		},
		{
			points: [
				[380, 180],
				[20, 180],
			],
			tone: "accent",
		},
	],
	labels: [{ x: 20, y: 84, lines: ["idle"] }],
};

const accentLanes = [40, 180];
const pulseCycle = 3200;
const diagramHint = "Scroll sideways for the whole diagram.";
const outOfView = { height: "200vh" };

function lineText(line: DiagramNodeLine): string {
	return typeof line === "string" ? line : line.text;
}

function textsOf(data: DiagramData): string[] {
	return [
		...data.nodes.flatMap((node) => node.lines.map((line) => lineText(line))),
		...(data.labels ?? []).flatMap((label) => label.lines),
	];
}

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

function devTools(): CDPSession {
	return cdp();
}

function pretendNotAutomated() {
	Object.defineProperty(navigator, "webdriver", {
		configurable: true,
		get: () => false,
	});
}

async function emulateMedia(options: {
	media?: string;
	features?: Array<{ name: string; value: string }>;
}) {
	isMediaEmulated = true;
	await devTools().send("Emulation.setEmulatedMedia", options);
}

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

async function frames(count = 2) {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- frames run one after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

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

function isHintShown(text: string): boolean {
	const hint = screen.queryByText(text);
	return hint !== null && isShown(hint);
}

function runningAnimations(root: Element): number {
	return root
		.getAnimations({ subtree: true })
		.filter((animation) => animation.playState === "running").length;
}

async function afterEntrance(root: HTMLElement, text: string) {
	await expect
		.poll(() => isShown(within(root).getByText(text)), { timeout: 5000 })
		.toBe(true);
	await expect.poll(() => runningAnimations(root), { timeout: 5000 }).toBe(0);
}

function name(element: Element): string {
	const text = element.textContent.trim().slice(0, 24);
	return text === ""
		? `<${element.tagName.toLowerCase()}>`
		: `<${element.tagName.toLowerCase()}> "${text}"`;
}

function isCollapsed(element: SVGGraphicsElement): boolean {
	const box = element.getBBox();
	const rect = element.getBoundingClientRect();
	return (
		(box.width > 0 && rect.width === 0) || (box.height > 0 && rect.height === 0)
	);
}

function unfinished(root: Element): string[] {
	const problems: string[] = [];
	const running = runningAnimations(root);
	if (running > 0) {
		problems.push(`${running} animations running`);
	}

	for (const element of [root, ...root.querySelectorAll("*")]) {
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

		if (!/^0(?:px)?$/v.test(style.strokeDashoffset)) {
			problems.push(`${name(element)} not drawn in`);
		}

		if (element instanceof SVGGraphicsElement && isCollapsed(element)) {
			problems.push(`${name(element)} collapsed`);
		}
	}

	return problems;
}

function figureOf(root: Element): SVGSVGElement {
	const svg = root.querySelector("svg");
	if (!svg) {
		throw new Error("the figure has no SVG");
	}

	return svg;
}

function toFigure(svg: SVGSVGElement): DOMMatrix {
	const matrix = svg.getScreenCTM();
	if (!matrix) {
		throw new Error("the SVG isn't rendered");
	}

	return matrix.inverse();
}

function boxOf(element: Element, svg: SVGSVGElement) {
	const rect = element.getBoundingClientRect();
	const matrix = toFigure(svg);
	const topLeft = new DOMPoint(rect.left, rect.top).matrixTransform(matrix);
	const bottomRight = new DOMPoint(rect.right, rect.bottom).matrixTransform(
		matrix,
	);
	return {
		left: topLeft.x,
		top: topLeft.y,
		right: bottomRight.x,
		bottom: bottomRight.y,
		centerX: (topLeft.x + bottomRight.x) / 2,
	};
}

function showFraction(element: Element, fraction: number) {
	const rect = element.getBoundingClientRect();
	const shown = fraction * rect.height;
	window.scrollTo(0, rect.top + window.scrollY - window.innerHeight + shown);
}

async function intersection(
	element: Element,
	isReached: (ratio: number) => boolean,
) {
	let ratio: number | undefined;
	const observer = new IntersectionObserver(
		(entries) => {
			ratio = entries.at(-1)?.intersectionRatio;
		},
		{ threshold: Array.from({ length: 21 }, (_, index) => index / 20) },
	);
	observer.observe(element);
	try {
		await expect
			.poll(() => ratio !== undefined && isReached(ratio), { timeout: 2000 })
			.toBe(true);
	} finally {
		observer.disconnect();
	}
}

async function screenshotPixels(element: Element): Promise<ImageData> {
	const image = new Image();
	image.src = `data:image/png;base64,${await page.screenshot({ element, save: false })}`;
	await image.decode();
	const canvas = document.createElement("canvas");
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;
	const context = canvas.getContext("2d");
	if (!context) {
		throw new Error("no 2D canvas");
	}

	context.drawImage(image, 0, 0);
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

function changedPixels(before: ImageData, after: ImageData): number[] {
	if (before.width !== after.width || before.height !== after.height) {
		throw new Error("the screenshots differ in size");
	}

	const changed: number[] = [];
	for (let offset = 0; offset < before.data.length; offset += 4) {
		if (
			before.data[offset] !== after.data[offset] ||
			before.data[offset + 1] !== after.data[offset + 1] ||
			before.data[offset + 2] !== after.data[offset + 2] ||
			before.data[offset + 3] !== after.data[offset + 3]
		) {
			changed.push(offset / 4);
		}
	}

	return changed;
}

async function motionOver(
	root: HTMLElement,
	duration: number,
): Promise<DOMPoint[]> {
	const changed = new Set<number>();
	let previous = await screenshotPixels(root);
	const end = performance.now() + duration;
	while (performance.now() < end) {
		// eslint-disable-next-line no-await-in-loop -- each shot is compared with the one before
		const next = await screenshotPixels(root);
		for (const pixel of changedPixels(previous, next)) {
			changed.add(pixel);
		}

		previous = next;
	}

	const rect = root.getBoundingClientRect();
	const matrix = toFigure(figureOf(root));
	const { width, height } = previous;
	return [...changed].map((pixel) => {
		const x = (((pixel % width) + 0.5) * rect.width) / width;
		const y = ((Math.floor(pixel / width) + 0.5) * rect.height) / height;
		return new DOMPoint(rect.left + x, rect.top + y).matrixTransform(matrix);
	});
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

function Around({
	width,
	children,
}: {
	readonly width: number;
	readonly children: React.ReactNode;
}) {
	return (
		<>
			<button type="button">Before</button>
			<div style={{ width }}>{children}</div>
			<button type="button">After</button>
		</>
	);
}

async function tabFromBefore(): Promise<Element | null> {
	screen.getByRole("button", { name: "Before" }).focus();
	await userEvent.tab();
	return document.activeElement;
}

describe("Diagram: content and naming", () => {
	test("the diagram is one group named by data.label and described by data.description, the SVG's desc", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Diagram ref={ref} data={flow} />);
		const group = screen.getByRole("group", { name: flow.label });
		expect(group).toHaveAccessibleDescription(flow.description);
		const desc = figureOf(current(ref)).querySelector(":scope > desc");
		expect(desc?.textContent).toBe(flow.description);
	});

	test("node lines and labels are text inside the group, which screen readers can reach", () => {
		render(<Diagram data={flow} />);
		const group = screen.getByRole("group", { name: flow.label });
		for (const text of textsOf(flow)) {
			const element = within(group).getByText(text);
			expect(element.closest('[aria-hidden="true"]')).toBeNull();
		}
	});

	test("each node line is its own line, in order and inside its box, and bold lines are heavier", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 600 }}>
				<Diagram ref={ref} data={flow} />
			</div>,
		);
		const svg = figureOf(current(ref));
		for (const node of flow.nodes) {
			const boxes = node.lines.map((line) =>
				boxOf(screen.getByText(lineText(line)), svg),
			);
			for (const box of boxes) {
				expect(box.left).toBeGreaterThanOrEqual(node.x - 0.5);
				expect(box.right).toBeLessThanOrEqual(node.x + node.w + 0.5);
				expect(box.top).toBeGreaterThanOrEqual(node.y - 0.5);
				expect(box.bottom).toBeLessThanOrEqual(node.y + node.h + 0.5);
			}

			for (const [index, box] of boxes.slice(1).entries()) {
				expect(box.top).toBeGreaterThanOrEqual(boxes[index].bottom - 0.5);
			}
		}

		const weight = (text: string) =>
			Number(getComputedStyle(screen.getByText(text)).fontWeight);
		expect(weight("Pull request")).toBeGreaterThan(weight("checks must pass"));
		expect(weight("GitHub Actions")).toBeGreaterThan(weight("OIDC, no keys"));
	});

	test("labels sit by their top-left, or centre inside w with align middle, and their lines stack", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 600 }}>
				<Diagram ref={ref} data={flow} />
			</div>,
		);
		const svg = figureOf(current(ref));
		const publish = boxOf(screen.getByText("Publish"), svg);
		const everyMerge = boxOf(screen.getByText("on every merge"), svg);
		expect(publish.left).toBeCloseTo(20, 0);
		expect(Math.abs(publish.top - 160)).toBeLessThanOrEqual(2);
		expect(everyMerge.left).toBeCloseTo(20, 0);
		expect(everyMerge.top).toBeGreaterThanOrEqual(publish.bottom - 0.5);
		const merge = boxOf(screen.getByText("merge"), svg);
		expect(merge.centerX).toBeCloseTo(197.5, 0);
		expect(Math.abs(merge.top - 40)).toBeLessThanOrEqual(2);
		const sync = boxOf(screen.getByText("sync"), svg);
		expect(sync.centerX).toBeCloseTo(402.5, 0);
	});

	test("two diagrams of one dataset each keep their own description", () => {
		render(
			<>
				<Diagram
					data={{
						...flow,
						label: "First copy",
						description: "The first copy's description.",
					}}
				/>
				<Diagram
					data={{
						...flow,
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

	test("the root is the ref's div: className merges with its own, and style, id and other attributes land on it", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Diagram
				ref={ref}
				data={flow}
				id="flow-figure"
				className="case-study"
				style={{ marginTop: 12 }}
				data-testid="figure"
			/>,
		);
		const root = current(ref);
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(screen.getByTestId("figure")).toBe(root);
		expect(root.id).toBe("flow-figure");
		expect(root.classList.contains("case-study")).toBe(true);
		expect(root.classList.length).toBeGreaterThan(1);
		expect(getComputedStyle(root).marginTop).toBe("12px");
		expect(root.contains(screen.getByRole("group", { name: flow.label }))).toBe(
			true,
		);
	});
});

describe("Diagram: scale and scrolling", () => {
	test("with the default minScale the SVG fills its host at the data's aspect ratio, with no scrolling, hint or tab stop", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Around width={300}>
				<Diagram ref={ref} data={flow} />
			</Around>,
		);
		const root = current(ref);
		const svg = figureOf(root).getBoundingClientRect();
		expect(svg.width).toBeCloseTo(300, 0);
		expect(svg.height / svg.width).toBeCloseTo(flow.height / flow.width, 2);
		for (const element of [root, ...root.querySelectorAll("*")]) {
			expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
		}

		expect(isHintShown(diagramHint)).toBe(false);
		expect(await tabFromBefore()).toBe(
			screen.getByRole("button", { name: "After" }),
		);
	});

	test("below width × minScale the SVG stops shrinking, the host scrolls sideways, and the hint shows under it", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 240 }}>
				<Diagram ref={ref} data={flow} minScale={0.5} />
			</div>,
		);
		const group = screen.getByRole("group", { name: flow.label });
		expect(figureOf(current(ref)).getBoundingClientRect().width).toBeCloseTo(
			300,
			0,
		);
		expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
		const hint = screen.getByText(diagramHint);
		expect(isShown(hint)).toBe(true);
		expect(hint.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			group.getBoundingClientRect().bottom - 0.5,
		);
	});

	test("Tab reaches an overflowing host as a group named by the label, and Shift+Tab comes back to it", async () => {
		render(
			<Around width={240}>
				<Diagram data={flow} minScale={0.5} />
			</Around>,
		);
		const group = screen.getByRole("group", { name: flow.label });
		const after = screen.getByRole("button", { name: "After" });
		expect(await tabFromBefore()).toBe(group);
		expect(group.tabIndex).toBe(0);
		await userEvent.tab();
		expect(document.activeElement).toBe(after);
		await userEvent.tab({ shift: true });
		expect(document.activeElement).toBe(group);
	});

	test("arrow keys scroll the focused host sideways", async () => {
		render(
			<Around width={240}>
				<Diagram data={flow} minScale={0.5} />
			</Around>,
		);
		const group = screen.getByRole("group", { name: flow.label });
		expect(await tabFromBefore()).toBe(group);
		expect(group.scrollLeft).toBe(0);
		await userEvent.keyboard("{ArrowRight}");
		await expect.poll(() => group.scrollLeft).toBeGreaterThan(0);
		let last = -1;
		await expect
			.poll(
				() => {
					const isSettled = group.scrollLeft === last;
					last = group.scrollLeft;
					return isSettled;
				},
				{ interval: 100 },
			)
			.toBe(true);
		await userEvent.keyboard("{ArrowLeft}");
		await expect.poll(() => group.scrollLeft).toBe(0);
	});

	test("above its floor the host fits: no hint, and Tab passes it by", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Around width={380}>
				<Diagram ref={ref} data={flow} minScale={0.5} />
			</Around>,
		);
		expect(figureOf(current(ref)).getBoundingClientRect().width).toBeCloseTo(
			380,
			0,
		);
		expect(isHintShown(diagramHint)).toBe(false);
		expect(await tabFromBefore()).toBe(
			screen.getByRole("button", { name: "After" }),
		);
	});

	test("the host joins the tab order and shows the hint only while its width is under the floor", async () => {
		const figure = <Diagram data={flow} minScale={0.5} />;
		const { rerender } = render(<Around width={380}>{figure}</Around>);
		const after = screen.getByRole("button", { name: "After" });
		expect(await tabFromBefore()).toBe(after);

		rerender(<Around width={240}>{figure}</Around>);
		await expect.poll(() => isHintShown(diagramHint)).toBe(true);
		const group = screen.getByRole("group", { name: flow.label });
		await vi.waitFor(async () => {
			expect(await tabFromBefore()).toBe(group);
		});
		expect(group.tabIndex).toBe(0);

		rerender(<Around width={380}>{figure}</Around>);
		await expect.poll(() => isHintShown(diagramHint)).toBe(false);
		await vi.waitFor(async () => {
			expect(await tabFromBefore()).toBe(after);
		});
	});
});

describe("Diagram: entrance and pulses", () => {
	test("automated browsers get the finished diagram at once, even out of view", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<Diagram ref={ref} data={flow} />
				</div>
			</>,
		);
		const root = current(ref);
		expect(unfinished(root)).toEqual([]);
		for (const text of textsOf(flow)) {
			expect(isShown(screen.getByText(text))).toBe(true);
		}

		await frames();
		expect(unfinished(root)).toEqual([]);
	});

	test("for a reader, the entrance waits until 30% of the diagram is in view, nodes rise, and it plays once to a fully drawn diagram", async () => {
		pretendNotAutomated();
		const ref = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<Diagram ref={ref} data={flow} />
				</div>
				<div style={outOfView} />
			</>,
		);
		const root = current(ref);
		const texts = textsOf(flow).map((text) => screen.getByText(text));
		const pageTop = (element: Element) =>
			element.getBoundingClientRect().top + window.scrollY;
		for (const text of texts) {
			expect(isShown(text)).toBe(false);
		}

		const hiddenTop = pageTop(screen.getByText("Pull request"));

		showFraction(root, 0.25);
		await intersection(root, (ratio) => ratio >= 0.2 && ratio < 0.3);
		await frames();
		expect(runningAnimations(root)).toBe(0);
		for (const text of texts) {
			expect(isShown(text)).toBe(false);
		}

		showFraction(root, 0.35);
		await expect.poll(() => unfinished(root), { timeout: 5000 }).toEqual([]);
		for (const text of texts) {
			expect(isShown(text)).toBe(true);
		}

		expect(pageTop(screen.getByText("Pull request"))).toBeLessThan(
			hiddenTop - 1,
		);

		window.scrollTo(0, 0);
		await intersection(root, (ratio) => ratio === 0);
		await frames();
		expect(unfinished(root)).toEqual([]);
		root.scrollIntoView({ block: "center" });
		await intersection(root, (ratio) => ratio === 1);
		await frames();
		expect(unfinished(root)).toEqual([]);
	});

	test("reveal={false} shows the diagram finished at once, even out of view", () => {
		pretendNotAutomated();
		const ref = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<Diagram ref={ref} data={flow} reveal={false} />
				</div>
			</>,
		);
		expect(unfinished(current(ref))).toEqual([]);
	});

	test("under reduced motion the diagram renders finished, and its pulses stay hidden", async () => {
		pretendNotAutomated();
		await emulateMedia({
			features: [{ name: "prefers-reduced-motion", value: "reduce" }],
		});
		const lanesRef = React.createRef<HTMLDivElement>();
		const flowRef = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={{ width: 380 }}>
					<Diagram ref={lanesRef} data={lanes} />
				</div>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<Diagram ref={flowRef} data={flow} />
				</div>
			</>,
		);
		expect(unfinished(current(lanesRef))).toEqual([]);
		expect(unfinished(current(flowRef))).toEqual([]);
		const motion = await motionOver(current(lanesRef), pulseCycle + 300);
		expect(motion.length).toBe(0);
	}, 20_000);

	test("print shows the diagram finished, even one still waiting to scroll in", async () => {
		pretendNotAutomated();
		await emulateMedia({ media: "print" });
		const ref = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<Diagram ref={ref} data={flow} />
				</div>
			</>,
		);
		expect(unfinished(current(ref))).toEqual([]);
		for (const text of textsOf(flow)) {
			expect(isShown(screen.getByText(text))).toBe(true);
		}
	});

	test("once the diagram has entered, a dot runs along each accent edge and nowhere else", async () => {
		pretendNotAutomated();
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 380 }}>
				<Diagram ref={ref} data={lanes} />
			</div>,
		);
		const root = current(ref);
		await afterEntrance(root, "idle");
		const motion = await motionOver(root, pulseCycle + 300);
		const laneOf = (point: DOMPoint) =>
			accentLanes.find((y) => Math.abs(point.y - y) <= 30);
		const strays = motion.filter((point) => laneOf(point) === undefined);
		expect(strays.length, "pixels that moved away from the accent edges").toBe(
			0,
		);
		for (const y of accentLanes) {
			const xs = motion
				.filter((point) => laneOf(point) === y)
				.map((point) => point.x)
				.toSorted((a, b) => a - b);
			expect(
				xs.length,
				`pixels that moved along the edge at y ${y}`,
			).toBeGreaterThan(0);
			expect(xs[0]).toBeLessThan(146);
			expect(xs.at(-1)).toBeGreaterThan(254);
		}
	}, 20_000);

	test("pulses={false} leaves every accent edge still", async () => {
		pretendNotAutomated();
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 380 }}>
				<Diagram ref={ref} data={lanes} pulses={false} />
			</div>,
		);
		const root = current(ref);
		await afterEntrance(root, "idle");
		expect(unfinished(root)).toEqual([]);
		const motion = await motionOver(root, pulseCycle + 300);
		expect(motion.length).toBe(0);
	}, 20_000);
});

describe("Diagram: server markup", () => {
	test("without JavaScript the server markup is fully visible, named and described", () => {
		const root = serverRender(<Diagram data={flow} />, 380);
		expect(unfinished(root)).toEqual([]);
		const group = within(root).getByRole("group", { name: flow.label });
		expect(group).toHaveAccessibleDescription(flow.description);
		for (const text of textsOf(flow)) {
			expect(isShown(within(group).getByText(text))).toBe(true);
		}
	});

	test("with gl-js on <html>, server markup that never hydrates starts hidden, and the failsafe shows it after 2.5 s", async () => {
		document.documentElement.classList.add("gl-js");
		const root = serverRender(<Diagram data={flow} />, 380);
		const start = performance.now();
		const texts = textsOf(flow).map((text) => within(root).getByText(text));
		for (const text of texts) {
			expect(isShown(text)).toBe(false);
		}

		await expect
			.poll(() => texts.every((text) => isShown(text)), {
				timeout: 6000,
				interval: 25,
			})
			.toBe(true);
		expect(performance.now() - start).toBeGreaterThan(2000);
		await expect.poll(() => unfinished(root), { timeout: 3000 }).toEqual([]);
	}, 15_000);
});

const gates = [
	{ name: "Spike 0", x: 70 },
	{ name: "M1", x: 223.3 },
	{ name: "M2", x: 376.6 },
	{ name: "M3", x: 529.9 },
];

function order(index: number): React.CSSProperties {
	const style: React.CSSProperties & { "--i": number } = { "--i": index };
	return style;
}

function Gates(
	props: Readonly<
		Partial<DiagramHostProps> & { ref?: React.Ref<HTMLDivElement> }
	>,
) {
	return (
		<DiagramHost
			label="Bridge gates"
			description="Four gates in a row: Spike 0 passed, M1 is built, M2 and M3 are planned."
			width={600}
			height={92}
			{...props}
		>
			<path
				className="gl-dg-edge gl-dg-edge-draw"
				d="M 70 34 L 530 34"
				pathLength={1}
			/>
			{gates.map((gate, index) => (
				<g key={gate.name} className="gl-dg-node" style={order(index)}>
					<circle className="gl-dg-box" cx={gate.x} cy={34} r={14} />
				</g>
			))}
			{gates.map((gate, index) => (
				<text
					key={gate.name}
					className="gl-dg-label"
					style={order(index)}
					x={gate.x}
					y={76}
					textAnchor="middle"
					fontSize={13}
				>
					{gate.name}
				</text>
			))}
		</DiagramHost>
	);
}

describe("DiagramHost", () => {
	test("it names its figure, describes it with the SVG's desc, and draws its children in the width × height space", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<div style={{ width: 380 }}>
				<Gates ref={ref} />
			</div>,
		);
		const group = screen.getByRole("group", { name: "Bridge gates" });
		expect(group).toHaveAccessibleDescription(
			"Four gates in a row: Spike 0 passed, M1 is built, M2 and M3 are planned.",
		);
		const svg = figureOf(current(ref));
		expect(svg.querySelector(":scope > desc")?.textContent).toBe(
			"Four gates in a row: Spike 0 passed, M1 is built, M2 and M3 are planned.",
		);
		const frame = svg.getBoundingClientRect();
		expect(frame.width).toBeCloseTo(380, 0);
		expect(frame.height / frame.width).toBeCloseTo(92 / 600, 2);
		for (const gate of gates) {
			const label = within(group).getByText(gate.name).getBoundingClientRect();
			const centre = (label.left + label.right) / 2;
			expect((centre - frame.left) / frame.width).toBeCloseTo(gate.x / 600, 2);
		}
	});

	test("id lands on the root and is the base of the description's id", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Gates ref={ref} id="gates" />);
		const root = current(ref);
		expect(root.id).toBe("gates");
		const desc = figureOf(root).querySelector(":scope > desc");
		expect(desc?.id.startsWith("gates")).toBe(true);
		expect(desc?.id).not.toBe("gates");
		expect(
			screen.getByRole("group", { name: "Bridge gates" }),
		).toHaveAccessibleDescription(desc?.textContent ?? "");
	});

	test("the root is the ref's div: className merges with its own, and style and other attributes land on it", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Gates
				ref={ref}
				className="roadmap"
				style={{ marginTop: 12 }}
				data-testid="gates"
			/>,
		);
		const root = current(ref);
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(screen.getByTestId("gates")).toBe(root);
		expect(root.classList.contains("roadmap")).toBe(true);
		expect(root.classList.length).toBeGreaterThan(1);
		expect(getComputedStyle(root).marginTop).toBe("12px");
	});

	test("below width × minScale it scrolls sideways, shows scrollHint under the host, and Tab reaches it as a named group", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Around width={240}>
				<Gates
					ref={ref}
					minScale={0.75}
					scrollHint={<em>Swipe to see every gate.</em>}
				/>
			</Around>,
		);
		const group = screen.getByRole("group", { name: "Bridge gates" });
		expect(figureOf(current(ref)).getBoundingClientRect().width).toBeCloseTo(
			450,
			0,
		);
		expect(group.scrollWidth).toBeGreaterThan(group.clientWidth);
		const hint = screen.getByText("Swipe to see every gate.");
		expect(hint.tagName).toBe("EM");
		expect(isShown(hint)).toBe(true);
		expect(hint.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			group.getBoundingClientRect().bottom - 0.5,
		);
		expect(await tabFromBefore()).toBe(group);
		expect(group.tabIndex).toBe(0);
		await userEvent.keyboard("{ArrowRight}");
		await expect.poll(() => group.scrollLeft).toBeGreaterThan(0);
	});

	test("children using the gl-dg classes take part in the entrance, and reveal={false} shows them at once", async () => {
		pretendNotAutomated();
		const revealRef = React.createRef<HTMLDivElement>();
		const plainRef = React.createRef<HTMLDivElement>();
		render(
			<>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<Gates ref={revealRef} />
				</div>
				<div style={outOfView} />
				<div style={{ width: 380 }}>
					<Gates ref={plainRef} reveal={false} />
				</div>
			</>,
		);
		const revealing = current(revealRef);
		expect(unfinished(current(plainRef))).toEqual([]);
		for (const gate of gates) {
			expect(isShown(within(revealing).getByText(gate.name))).toBe(false);
		}

		revealing.scrollIntoView({ block: "center" });
		await expect
			.poll(() => unfinished(revealing), { timeout: 5000 })
			.toEqual([]);
		for (const gate of gates) {
			expect(isShown(within(revealing).getByText(gate.name))).toBe(true);
		}
	});
});
