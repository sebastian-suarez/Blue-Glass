import { cleanup, render, screen, within } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cdp } from "vitest/browser";
import "#ui/styles.css";
import {
	CircularProgress,
	type CircularProgressProps,
	LinearProgress,
	type LinearProgressProps,
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

function progressbar(name: string): HTMLElement {
	return screen.getByRole("progressbar", { name });
}

function size(element: Element): [number, number] {
	const box = element.getBoundingClientRect();
	return [Math.round(box.width), Math.round(box.height)];
}

function centre(element: Element): { x: number; y: number } {
	const box = element.getBoundingClientRect();
	const halfWidth = box.width / 2;
	const halfHeight = box.height / 2;
	return { x: box.left + halfWidth, y: box.top + halfHeight };
}

function labelledBy(element: Element): HTMLElement[] {
	return (element.getAttribute("aria-labelledby") ?? "")
		.split(/\s+/v)
		.filter(Boolean)
		.map((id) =>
			must(document.querySelector<HTMLElement>(`#${CSS.escape(id)}`)),
		);
}

function animatedProperties(element: Element): Set<string> {
	const meta = new Set(["offset", "computedOffset", "easing", "composite"]);
	return new Set(
		element
			.getAnimations({ subtree: true })
			.flatMap(
				(animation) =>
					(animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [],
			)
			.flatMap((keyframe) => Object.keys(keyframe))
			.filter((property) => !meta.has(property)),
	);
}

async function startedTimings(
	element: Element,
): Promise<Array<{ duration: number; easing: string }>> {
	return vi.waitFor(
		() => {
			const timings = element
				.getAnimations({ subtree: true })
				.map((animation) => {
					const timing = must(animation.effect).getTiming();
					return {
						duration: Math.round(Number(timing.duration)),
						easing: String(timing.easing),
					};
				});
			expect(timings).not.toHaveLength(0);
			return timings;
		},
		{ interval: 5, timeout: 2000 },
	);
}

async function nextFrame(): Promise<void> {
	await new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});
}

async function isAnimatingWithin(
	element: Element,
	frames = 6,
): Promise<boolean> {
	for (let frame = 0; frame < frames; frame++) {
		if (element.getAnimations({ subtree: true }).length > 0) {
			return true;
		}

		// eslint-disable-next-line no-await-in-loop -- one frame after another
		await nextFrame();
	}

	return element.getAnimations({ subtree: true }).length > 0;
}

function Values({ value }: { readonly value: number }) {
	return (
		<>
			<LinearProgress variant="determinate" value={value} aria-label="Bar" />
			<CircularProgress variant="determinate" value={value} aria-label="Ring" />
		</>
	);
}

async function changeValue(): Promise<void> {
	const { rerender } = render(<Values value={20} />);
	expect(progressbar("Bar")).toHaveAttribute("aria-valuenow", "20");
	expect(progressbar("Ring")).toHaveAttribute("aria-valuenow", "20");
	await nextFrame();
	await nextFrame();
	rerender(<Values value={80} />);
}

async function emulateMedia(
	features: Array<{ name: string; value: string }>,
): Promise<void> {
	const session: CDPSession = cdp();
	await session.send("Emulation.setEmulatedMedia", { features });
}

const easeOutQuint = "cubic-bezier(0.23, 1, 0.32, 1)";
const easeInOutQuart = "cubic-bezier(0.77, 0, 0.175, 1)";
const durationExpand = 450;

describe("LinearProgress", () => {
	test("renders a div with role progressbar, aria-valuemin 0 and aria-valuemax 100, holding className, the ref and other attributes", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<LinearProgress
				ref={ref}
				id="deploy"
				className="custom"
				aria-label="Deploying"
			/>,
		);
		const bar = progressbar("Deploying");
		expect(bar).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(bar);
		expect(bar).toHaveAttribute("id", "deploy");
		expect(bar).toHaveClass("custom");
		expect(bar).toHaveAttribute("aria-valuemin", "0");
		expect(bar).toHaveAttribute("aria-valuemax", "100");
	});

	test("is indeterminate by default, with no aria-valuenow", () => {
		render(<LinearProgress aria-label="Deploying" value={40} />);
		const bar = progressbar("Deploying");
		expect(bar).not.toHaveAttribute("aria-valuenow");
		expect(bar).toHaveClass("gl-linear-progress-indeterminate");
	});

	test("determinate sets aria-valuenow to value, and follows it as it changes", () => {
		const view = (value: number) => (
			<LinearProgress
				variant="determinate"
				value={value}
				aria-label="Uploading build to S3"
			/>
		);
		const { rerender } = render(view(62));
		const bar = progressbar("Uploading build to S3");
		expect(bar).toHaveAttribute("aria-valuenow", "62");
		expect(bar).toHaveClass("gl-linear-progress-determinate");
		rerender(view(100));
		expect(bar).toHaveAttribute("aria-valuenow", "100");
	});

	test("value is 0 by default for determinate and buffer", () => {
		render(
			<>
				<LinearProgress variant="determinate" aria-label="Determinate" />
				<LinearProgress variant="buffer" aria-label="Buffer" />
			</>,
		);
		expect(progressbar("Determinate")).toHaveAttribute("aria-valuenow", "0");
		expect(progressbar("Buffer")).toHaveAttribute("aria-valuenow", "0");
	});

	test("buffer reports value as aria-valuenow, not valueBuffer", () => {
		render(
			<LinearProgress
				variant="buffer"
				value={38}
				valueBuffer={64}
				aria-label="Streaming lap telemetry"
			/>,
		);
		const bar = progressbar("Streaming lap telemetry");
		expect(bar).toHaveAttribute("aria-valuenow", "38");
		expect(bar).toHaveClass("gl-linear-progress-buffer");
	});

	test("without a label it is a 4px line", () => {
		render(<LinearProgress aria-label="Deploying" />);
		expect(progressbar("Deploying").getBoundingClientRect().height).toBe(4);
	});

	test("label shows above the track and names the progressbar through aria-labelledby", () => {
		render(
			<LinearProgress
				variant="determinate"
				value={62}
				label="Uploading build to S3"
			/>,
		);
		const bar = progressbar("Uploading build to S3");
		const label = within(bar).getByText("Uploading build to S3");
		expect(label).toBeVisible();
		expect(labelledBy(bar).some((element) => element.contains(label))).toBe(
			true,
		);
		expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(
			bar.getBoundingClientRect().bottom - 4,
		);
	});

	test("aria-label names it, and so does aria-labelledby pointing at your own heading", () => {
		render(
			<>
				<LinearProgress aria-label="Invalidate CloudFront cache" />
				<h3 id="upload-heading">Upload to S3</h3>
				<LinearProgress
					variant="determinate"
					value={30}
					aria-labelledby="upload-heading"
				/>
			</>,
		);
		expect(progressbar("Invalidate CloudFront cache")).toBeVisible();
		expect(progressbar("Upload to S3")).toHaveAttribute("aria-valuenow", "30");
	});

	test("without label, aria-label or aria-labelledby it is announced as Loading", () => {
		render(<LinearProgress />);
		expect(progressbar("Loading")).toBeVisible();
	});

	test("valueText shows at the end of the label row and is read as aria-valuetext", () => {
		render(
			<div style={{ width: 400 }}>
				<LinearProgress
					variant="determinate"
					value={60}
					label="Uploading"
					valueText="3 of 5 files"
				/>
			</div>,
		);
		const bar = progressbar("Uploading");
		expect(bar).toHaveAttribute("aria-valuetext", "3 of 5 files");
		const value = within(bar).getByText("3 of 5 files");
		const label = within(bar).getByText("Uploading");
		expect(value).toBeVisible();
		const row = bar.getBoundingClientRect();
		const valueBox = value.getBoundingClientRect();
		const labelBox = label.getBoundingClientRect();
		expect(Math.abs(labelBox.left - row.left)).toBeLessThanOrEqual(1);
		expect(Math.abs(valueBox.right - row.right)).toBeLessThanOrEqual(1);
		expect(centre(value).y).toBeGreaterThan(labelBox.top);
		expect(centre(value).y).toBeLessThan(labelBox.bottom);
	});

	test("valueText shows and is read with no label too", () => {
		render(
			<LinearProgress
				aria-label="Invalidating CloudFront cache"
				valueText="About a minute"
			/>,
		);
		const bar = progressbar("Invalidating CloudFront cache");
		expect(bar).toHaveAttribute("aria-valuetext", "About a minute");
		expect(within(bar).getByText("About a minute")).toBeVisible();
	});

	test("showValue shows the rounded percentage for determinate and buffer, and nothing while indeterminate", () => {
		render(
			<>
				<LinearProgress
					showValue
					variant="determinate"
					value={62.4}
					label="Determinate"
				/>
				<LinearProgress
					showValue
					variant="buffer"
					value={38}
					valueBuffer={64}
					label="Buffer"
				/>
				<LinearProgress showValue label="Indeterminate" />
			</>,
		);
		expect(within(progressbar("Determinate")).getByText("62%")).toBeVisible();
		expect(within(progressbar("Buffer")).getByText("38%")).toBeVisible();
		expect(within(progressbar("Indeterminate")).queryByText(/%/v)).toBeNull();
	});

	test("without showValue or valueText no value shows", () => {
		render(
			<LinearProgress variant="determinate" value={62} label="Uploading" />,
		);
		const bar = progressbar("Uploading");
		expect(bar).toHaveAttribute("aria-valuenow", "62");
		expect(within(bar).queryByText(/62/v)).toBeNull();
	});

	test("color inherit puts its class on the root; the default doesn't", () => {
		const colours = ["default", "inherit"] as const satisfies ReadonlyArray<
			LinearProgressProps["color"]
		>;
		render(
			<>
				<LinearProgress aria-label="Unset" />
				{colours.map((colour) => (
					<LinearProgress key={colour} color={colour} aria-label={colour} />
				))}
			</>,
		);
		expect(progressbar("Unset")).not.toHaveClass("gl-progress-inherit");
		expect(progressbar("default")).not.toHaveClass("gl-progress-inherit");
		expect(progressbar("inherit")).toHaveClass("gl-progress-inherit");
	});
});

describe("CircularProgress", () => {
	test("renders a span with role progressbar, aria-valuemin 0 and aria-valuemax 100, holding className, the ref and other attributes", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<CircularProgress
				ref={ref}
				id="publishing"
				className="custom"
				aria-label="Publishing"
			/>,
		);
		const ring = progressbar("Publishing");
		expect(ring).toBeInstanceOf(HTMLSpanElement);
		expect(ref.current).toBe(ring);
		expect(ring).toHaveAttribute("id", "publishing");
		expect(ring).toHaveClass("custom");
		expect(ring).toHaveAttribute("aria-valuemin", "0");
		expect(ring).toHaveAttribute("aria-valuemax", "100");
	});

	test("is indeterminate by default, with no aria-valuenow, and announced as Loading without a name", () => {
		render(<CircularProgress value={40} />);
		const ring = progressbar("Loading");
		expect(ring).not.toHaveAttribute("aria-valuenow");
		expect(ring).toHaveClass("gl-circular-progress-indeterminate");
	});

	test("determinate sets aria-valuenow to value, 0 by default, and follows it as it changes", () => {
		const view = (value?: number) => (
			<CircularProgress
				variant="determinate"
				value={value}
				aria-label="Calibration"
			/>
		);
		const { rerender } = render(view());
		const ring = progressbar("Calibration");
		expect(ring).toHaveAttribute("aria-valuenow", "0");
		expect(ring).toHaveClass("gl-circular-progress-determinate");
		rerender(view(25));
		expect(ring).toHaveAttribute("aria-valuenow", "25");
	});

	test("aria-labelledby names it too", () => {
		render(
			<>
				<span id="step">Upload to S3</span>
				<CircularProgress aria-labelledby="step" />
			</>,
		);
		expect(progressbar("Upload to S3")).toBeVisible();
	});

	test("size: xs 20, sm 28, md 40 by default, lg 56, or a number of px", () => {
		const sizes = [
			["xs", 20],
			["sm", 28],
			["md", 40],
			["lg", 56],
			[64, 64],
		] as const satisfies ReadonlyArray<
			readonly [CircularProgressProps["size"], number]
		>;
		render(
			<>
				<CircularProgress aria-label="Default" />
				{sizes.map(([ringSize]) => (
					<CircularProgress
						key={ringSize}
						size={ringSize}
						aria-label={String(ringSize)}
					/>
				))}
			</>,
		);
		expect(size(progressbar("Default"))).toEqual([40, 40]);
		for (const [ringSize, pixels] of sizes) {
			const name = String(ringSize);
			expect(size(progressbar(name))).toEqual([pixels, pixels]);
		}
	});

	test("showValue shows the rounded percentage in the middle, from 40px up, only when determinate; nothing shows without it", () => {
		render(
			<>
				<CircularProgress
					showValue
					variant="determinate"
					value={72.4}
					size="lg"
					aria-label="Large"
				/>
				<CircularProgress
					showValue
					variant="determinate"
					value={40}
					aria-label="Medium"
				/>
				<CircularProgress
					showValue
					variant="determinate"
					value={30}
					size="sm"
					aria-label="Small"
				/>
				<CircularProgress
					showValue
					variant="determinate"
					value={30}
					size={36}
					aria-label="Thirty-six"
				/>
				<CircularProgress showValue aria-label="Turning" />
				<CircularProgress
					variant="determinate"
					value={72}
					size="lg"
					aria-label="Quiet"
				/>
			</>,
		);
		for (const [name, text] of [
			["Large", "72%"],
			["Medium", "40%"],
		] as const) {
			const ring = progressbar(name);
			const value = within(ring).getByText(text);
			expect(value).toBeVisible();
			expect(Math.abs(centre(value).x - centre(ring).x)).toBeLessThanOrEqual(1);
			expect(Math.abs(centre(value).y - centre(ring).y)).toBeLessThanOrEqual(1);
		}

		for (const name of ["Small", "Thirty-six", "Turning", "Quiet"]) {
			expect(within(progressbar(name)).queryByText(/%/v)).toBeNull();
		}
	});

	test("color inherit puts its class on the root; the default doesn't", () => {
		render(
			<>
				<CircularProgress aria-label="Unset" />
				<CircularProgress color="default" aria-label="default" />
				<CircularProgress color="inherit" aria-label="inherit" />
			</>,
		);
		expect(progressbar("Unset")).not.toHaveClass("gl-progress-inherit");
		expect(progressbar("default")).not.toHaveClass("gl-progress-inherit");
		expect(progressbar("inherit")).toHaveClass("gl-progress-inherit");
	});
});

describe("Progress motion", () => {
	test("the bar's sweep eases with ease-in-out-quart", () => {
		render(<LinearProgress aria-label="Bar" />);
		const easings = progressbar("Bar")
			.getAnimations({ subtree: true })
			.flatMap((animation) => {
				const effect = animation.effect as KeyframeEffect | null;
				return [
					effect?.getTiming().easing,
					...(effect?.getKeyframes() ?? []).map((keyframe) => keyframe.easing),
				];
			});
		expect(easings).toContain(easeInOutQuart);
	});

	test("while the length is unknown the bar slides and the ring turns, without end", () => {
		render(
			<>
				<LinearProgress aria-label="Bar" />
				<CircularProgress aria-label="Ring" />
			</>,
		);
		for (const name of ["Bar", "Ring"]) {
			const element = progressbar(name);
			const moving = [...animatedProperties(element)].filter(
				(property) => property !== "opacity",
			);
			expect(moving).not.toHaveLength(0);
			expect(
				element
					.getAnimations({ subtree: true })
					.some(
						(animation) =>
							animation.effect?.getTiming().iterations === Infinity,
					),
			).toBe(true);
		}
	});

	test("a value change eases over duration-expand with ease-out-quint", async () => {
		await changeValue();
		for (const name of ["Bar", "Ring"]) {
			// eslint-disable-next-line no-await-in-loop -- one element after the other
			const timings = await startedTimings(progressbar(name));
			expect(timings).toContainEqual({
				duration: durationExpand,
				easing: easeOutQuint,
			});
		}
	});
});

describe("Progress under reduced motion", () => {
	beforeEach(async () => {
		await emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
		expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
	});

	afterEach(async () => {
		await emulateMedia([]);
	});

	test("nothing sweeps or turns: an unknown length becomes an opacity pulse", () => {
		render(
			<>
				<LinearProgress aria-label="Bar" />
				<CircularProgress aria-label="Ring" />
			</>,
		);
		for (const name of ["Bar", "Ring"]) {
			expect([...animatedProperties(progressbar(name))]).toEqual(["opacity"]);
		}
	});

	test("value changes jump", async () => {
		await changeValue();
		expect(await isAnimatingWithin(progressbar("Bar"))).toBe(false);
		expect(await isAnimatingWithin(progressbar("Ring"))).toBe(false);
		expect(progressbar("Bar")).toHaveAttribute("aria-valuenow", "80");
	});
});
