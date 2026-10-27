import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test } from "vitest";
import "../../styles/index.css";
import { TimingChart } from "../TimingChart/TimingChart.js";
import { Diagram, type DiagramData } from "./Diagram.js";

const data: DiagramData = {
	id: "hops",
	width: 600,
	height: 120,
	label: "Two hops",
	description:
		"A request goes from the browser to the edge, then to the bucket.",
	nodes: [
		{ x: 0, y: 24, w: 160, h: 72, lines: ["Browser"] },
		{ x: 220, y: 24, w: 160, h: 72, lines: ["Edge"] },
		{ x: 440, y: 24, w: 160, h: 72, lines: ["Bucket"] },
	],
	edges: [
		{
			points: [
				[160, 60],
				[215, 60],
			],
		},
		{
			points: [
				[380, 60],
				[435, 60],
			],
		},
	],
};

const diagramHint = "Scroll sideways for the whole diagram.";
const chartHint = "Scroll sideways for the whole chart.";
const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0).toReversed()) {
		cleanup();
	}
});

function Page({ width }: { readonly width: number }) {
	return (
		<div style={{ width }}>
			<Diagram data={data} minScale={0.5} />
			<p>Below the diagram</p>
			<TimingChart
				data={{
					id: "wait",
					label: "Wait, before and after",
					description: "The wait went from about 6 seconds to 20 milliseconds.",
					axisMax: 6000,
					ticks: [{ value: 0, text: "0 s" }],
					rows: [
						{ name: "Before", value: 6000, text: "about 6 s" },
						{ name: "After", value: 20, text: "20 ms", tone: "accent" },
					],
				}}
				minScale={0.4}
			/>
			<p>Below the chart</p>
		</div>
	);
}

function serverPage(width: number): HTMLElement {
	const container = document.createElement("div");
	container.innerHTML = renderToString(<Page width={width} />);
	document.body.append(container);
	cleanups.push(() => {
		container.remove();
	});
	return container;
}

function hydrate(container: HTMLElement, width: number): string[] {
	const errors: string[] = [];
	const root: Root = hydrateRoot(container, <Page width={width} />, {
		onRecoverableError(error) {
			errors.push(String(error));
		},
	});
	cleanups.push(() => {
		root.unmount();
	});
	return errors;
}

function positions(container: HTMLElement, texts: string[]): string[] {
	const boxes = new Map<string, DOMRect>();
	const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
		const range = document.createRange();
		range.selectNodeContents(node);
		boxes.set(node.textContent ?? "", range.getBoundingClientRect());
	}

	return texts.map((text) => {
		const box = boxes.get(text);
		return box === undefined || box.width === 0 || box.height === 0
			? `${text}: hidden`
			: `${text}: ${Math.round(box.left)},${Math.round(box.top)}`;
	});
}

async function frames(count = 3) {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- frames run one after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

const texts = [diagramHint, "Below the diagram", chartHint, "Below the chart"];

describe("the scroll hint before and after hydration", () => {
	test("under the floor, the server HTML already shows the hints, and hydrating moves nothing", async () => {
		const container = serverPage(240);
		const before = positions(container, texts);
		expect(before.filter((line) => line.endsWith("hidden"))).toEqual([]);

		const errors = hydrate(container, 240);
		await frames();
		expect(errors).toEqual([]);
		expect(positions(container, texts)).toEqual(before);
		const group = container.querySelector('[role="group"]');
		expect(group?.getAttribute("tabindex")).toBe("0");
	});

	test("above the floor, neither the server HTML nor the hydrated page shows them", async () => {
		const container = serverPage(400);
		const before = positions(container, texts);
		expect(before.filter((line) => line.endsWith("hidden"))).toEqual([
			`${diagramHint}: hidden`,
			`${chartHint}: hidden`,
		]);

		const errors = hydrate(container, 400);
		await frames();
		expect(errors).toEqual([]);
		expect(positions(container, texts)).toEqual(before);
		const group = container.querySelector('[role="group"]');
		expect(group?.hasAttribute("tabindex")).toBe(false);
	});
});
