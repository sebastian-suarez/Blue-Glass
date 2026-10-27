// Behaviour specs for Slider and its SliderMark type, from design-system/components/Slider/README.md
// and api.d.ts. The port runs on Base UI's Slider, whose thumbs are visually hidden range inputs
// inside the thumb a reader sees, so the specs find each thumb by role and name, and the other
// parts by what a reader sees: the rail by its color-line background, the fill by its color-blue
// one, the value pill and the mark labels by their text. Drags run through Chromium's own mouse
// input (CDP): a press, moves and a release, so the pointer capture is the browser's.
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { Slider, type SliderMark, type SliderProps } from "#ui";

type Point = { readonly x: number; readonly y: number };

let isMouseDown = false;

/**
Parks the pointer in the page's bottom-left corner, clear of every slider below: a thumb that
appears under a resting pointer counts as hovered.
*/
async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; left: 0; bottom: 0; width: 40px; height: 40px";
	document.body.append(spot);
	try {
		await userEvent.hover(spot);
	} finally {
		spot.remove();
	}
}

beforeEach(async () => {
	await parkPointer();
});

afterEach(async () => {
	// A test that failed mid-drag would leave the button down for the next one.
	if (isMouseDown) {
		await releaseAt({ x: 0, y: 0 });
	}

	cleanup();
});

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function centre(element: Element): Point {
	const { left, top, width, height } = box(element);
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	return { x: left + halfWidth, y: top + halfHeight };
}

function expectNear(
	actual: number,
	expected: number,
	what: string,
	tolerance = 1.5,
) {
	expect(
		Math.abs(actual - expected),
		`${what}: ${actual} against ${expected}`,
	).toBeLessThanOrEqual(tolerance);
}

async function pause(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

/**
A point in the test page's own coordinates, in the coordinates Chromium's input takes.
*/
function inputPoint({ x, y }: Point): Point {
	const frame = window.frameElement;
	const offset = frame ? box(frame) : { left: 0, top: 0 };
	const scale = frame ? new DOMMatrix(getComputedStyle(frame).transform).a : 1;
	const dx = scale * x;
	const dy = scale * y;
	return {
		x: Math.round(offset.left + dx),
		y: Math.round(offset.top + dy),
	};
}

type MouseInput = "mousePressed" | "mouseMoved" | "mouseReleased";

async function mouse(type: MouseInput, point: Point): Promise<void> {
	await cdp().send("Input.dispatchMouseEvent", {
		type,
		...inputPoint(point),
		button: isMouseDown || type !== "mouseMoved" ? "left" : "none",
		buttons: isMouseDown ? 1 : 0,
		clickCount: type === "mouseMoved" ? 0 : 1,
		pointerType: "mouse",
	});
}

async function pressAt(point: Point): Promise<void> {
	isMouseDown = true;
	await mouse("mousePressed", point);
}

/**
Moves the mouse there: a drag while the button is down, a hover otherwise.
*/
async function moveTo(point: Point): Promise<void> {
	await mouse("mouseMoved", point);
}

async function releaseAt(point: Point): Promise<void> {
	isMouseDown = false;
	await mouse("mouseReleased", point);
}

async function touchAt(point: Point): Promise<void> {
	await cdp().send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [inputPoint(point)],
	});
	await cdp().send("Input.dispatchTouchEvent", {
		type: "touchEnd",
		touchPoints: [],
	});
}

type Property =
	| "backgroundColor"
	| "color"
	| "borderTopColor"
	| "borderTopLeftRadius"
	| "boxShadow";

/**
The computed value of a token (or a plain CSS value), read from a probe element styled with it.
*/
function resolved(
	token: string,
	property: Property = "backgroundColor",
): string {
	const probe = document.createElement("div");
	if (property === "borderTopColor") {
		probe.style.borderTopStyle = "solid";
	}

	probe.style[property] = token.startsWith("--") ? `var(${token})` : token;
	document.body.append(probe);
	const value = getComputedStyle(probe)[property];
	probe.remove();
	return value;
}

/**
The elements inside the slider painted with this token as their background.
*/
function painted(root: Element, token: string): HTMLElement[] {
	const colour = resolved(token);
	return [...root.querySelectorAll<HTMLElement>("*")].filter(
		(element) => getComputedStyle(element).backgroundColor === colour,
	);
}

/**
The rail: the one color-line part.
*/
function railOf(root: Element): DOMRect {
	const rails = painted(root, "--color-line");
	if (rails.length !== 1) {
		throw new Error(`${rails.length} color-line parts, not one rail`);
	}

	return box(rails[0]);
}

/**
The filled part: the one color-blue part with an area, or undefined when nothing is filled.
*/
function fillOf(root: Element): DOMRect | undefined {
	const parts = painted(root, "--color-blue")
		.map((element) => box(element))
		.filter(({ width, height }) => width > 0 && height > 0);
	if (parts.length > 1) {
		throw new Error(`${parts.length} color-blue parts, not one fill`);
	}

	return parts[0];
}

type Scale = { readonly min?: number; readonly max?: number };

/**
Where a value sits on the rail: from min at its left end (its bottom when vertical) to max.
*/
function pointAt(
	root: Element,
	value: number,
	{ min = 0, max = 100 }: Scale = {},
	isVertical = false,
): Point {
	const rail = railOf(root);
	const share = (value - min) / (max - min);
	const halfWidth = rail.width / 2;
	const halfHeight = rail.height / 2;
	const along = share * rail.width;
	const up = share * rail.height;
	return isVertical
		? { x: rail.left + halfWidth, y: rail.bottom - up }
		: { x: rail.left + along, y: rail.top + halfHeight };
}

/**
The dots on the rail: small round marks centred on its line.
*/
function dotsOf(root: Element): DOMRect[] {
	const rail = railOf(root);
	const halfRail = rail.height / 2;
	const line = rail.top + halfRail;
	return [...root.querySelectorAll("*")]
		.map((element) => box(element))
		.filter(({ width, height, top }) => {
			const half = height / 2;
			return (
				width >= 2 &&
				width <= 8 &&
				Math.abs(width - height) < 0.5 &&
				Math.abs(top + half - line) < 1
			);
		});
}

/**
The horizontal middle of a box.
*/
function middleOf(rect: DOMRect): number {
	const half = rect.width / 2;
	return rect.left + half;
}

function thumb(name = "Volume", container: HTMLElement = document.body) {
	return within(container).getByRole("slider", { name });
}

function thumbs(container: HTMLElement = document.body): HTMLElement[] {
	return within(container).getAllByRole("slider");
}

function valueOf(element: Element): number {
	return Number(element.getAttribute("aria-valuenow"));
}

/**
The value a thumb announces and the range it announces it in: its aria-valuenow, aria-valuemin
and aria-valuemax, which a native range input takes from its value, min and max.
*/
function announced(element: HTMLElement): {
	now: number;
	min: number;
	max: number;
} {
	const native = element instanceof HTMLInputElement ? element : undefined;
	const read = (name: string, fallback: string | undefined) =>
		Number(element.getAttribute(`aria-value${name}`) ?? fallback);
	return {
		now: read("now", native?.value),
		min: read("min", native?.min),
		max: read("max", native?.max),
	};
}

/**
Disabled natively, or through aria-disabled.
*/
function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

/**
Whether the element is drawn: a box, and no display none, visibility hidden or opacity 0 on it
or an ancestor.
*/
function isDrawn(element: Element): boolean {
	const { width, height } = box(element);
	return (
		width > 0 &&
		height > 0 &&
		element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
	);
}

/**
The drawn elements inside the slider whose own text is `text`: a value pill showing.
*/
function drawn(root: HTMLElement, text: string): HTMLElement[] {
	return within(root)
		.queryAllByText(text)
		.filter((element) => isDrawn(element));
}

async function expectPill(
	root: HTMLElement,
	text: string,
	isShown: boolean,
): Promise<void> {
	await expect.poll(() => drawn(root, text).length).toBe(isShown ? 1 : 0);
}

/**
What a callback's event is: a React event, or one shaped like it as the documented
React.SyntheticEvent says, of a type, around a native event of a class.
*/
function eventOf(event: React.SyntheticEvent | Event): string {
	if (event instanceof Event) {
		return `native ${event.type}`;
	}

	const { nativeEvent } = event;
	let kind = "Event";
	if (nativeEvent instanceof KeyboardEvent) {
		kind = "KeyboardEvent";
	} else if (nativeEvent instanceof PointerEvent) {
		kind = "PointerEvent";
	} else if (nativeEvent instanceof MouseEvent) {
		kind = "MouseEvent";
	}

	return `${event.type} (${kind})`;
}

type Change = { event: string; value: number | number[]; thumb: number };
type Commit = { event: string; value: number | number[] };

function copied(value: number | number[]): number | number[] {
	return Array.isArray(value) ? [...value] : value;
}

/**
Records what onChange and onChangeCommitted saw at call time.
*/
function recorder() {
	const changes: Change[] = [];
	const commits: Commit[] = [];
	return {
		changes,
		commits,
		onChange(
			event: React.SyntheticEvent,
			value: number | number[],
			activeThumb: number,
		): void {
			changes.push({
				event: eventOf(event),
				value: copied(value),
				thumb: activeThumb,
			});
		},
		onChangeCommitted(
			event: React.SyntheticEvent,
			value: number | number[],
		): void {
			commits.push({ event: eventOf(event), value: copied(value) });
		},
	};
}

type StageProps = SliderProps & {
	readonly ref?: React.Ref<HTMLSpanElement>;
	readonly testId?: string;
};

/**
A slider named "Volume" on a 300px stage, with room around it for its band and pill.
*/
function Stage({ testId = "stage", ...props }: StageProps) {
	return (
		<div
			data-testid={testId}
			style={{ boxSizing: "content-box", width: 300, padding: "40px 24px" }}
		>
			<Slider aria-label="Volume" {...props} />
		</div>
	);
}

/**
A vertical slider named "Strength" in a 200px tall parent, as the README asks.
*/
function Upright(props: SliderProps) {
	return (
		<div
			data-testid="stage"
			style={{
				boxSizing: "content-box",
				height: 200,
				width: 120,
				padding: "40px 80px",
			}}
		>
			<Slider orientation="vertical" aria-label="Strength" {...props} />
		</div>
	);
}

function Around({ children }: { readonly children: React.ReactNode }) {
	return (
		<>
			<button type="button">Before</button>
			{children}
			<button type="button">After</button>
		</>
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function formNamed(name: string): HTMLFormElement {
	const form = screen.getByRole("form", { name });
	if (!(form instanceof HTMLFormElement)) {
		throw new TypeError(`no form named ${name}`);
	}

	return form;
}

/**
The slider's root: the first element it renders in its stage.
*/
function rootOf(testId = "stage"): HTMLElement {
	const root = screen.getByTestId(testId).firstElementChild;
	if (!(root instanceof HTMLElement)) {
		throw new TypeError(`nothing rendered in ${testId}`);
	}

	return root;
}

/**
Names a range's thumbs, as the api.d.ts example does.
*/
function ends(index: number): string {
	return index === 0 ? "Lowest" : "Highest";
}

const degrees = [360, 540, 900, 1080];

/**
The preview's rotation marks: a labelled mark at each of these degrees.
*/
const rotation: SliderMark[] = degrees.map((value) => ({
	value,
	label: `${value}°`,
}));

/**
Tabs from the Before button and waits for focus on the named thumb.
*/
async function tabInto(name = "Volume"): Promise<HTMLElement> {
	button("Before").focus();
	await userEvent.tab();
	const target = thumb(name);
	await expect.element(target).toHaveFocus();
	return target;
}

/**
Presses each key in turn on the focused thumb and waits for the value after it.
*/
async function keys(
	target: HTMLElement,
	steps: ReadonlyArray<readonly [key: string, value: number]>,
): Promise<void> {
	for (const [key, value] of steps) {
		// eslint-disable-next-line no-await-in-loop -- each key starts from the last one's value
		await userEvent.keyboard(key);
		// eslint-disable-next-line no-await-in-loop
		await expect.poll(() => valueOf(target), { message: key }).toBe(value);
	}
}

describe("Slider: what it renders", () => {
	test("one value makes one role=slider thumb with aria-valuenow, and by default aria-valuemin 0, aria-valuemax 100 and a horizontal aria-orientation", () => {
		render(<Stage defaultValue={30} />);
		expect(thumbs()).toHaveLength(1);
		const volume = thumb("Volume");
		expect(announced(volume)).toEqual({ now: 30, min: 0, max: 100 });
		expect(volume).toHaveAttribute("aria-orientation", "horizontal");
	});

	test("an array makes a range: a thumb per value, low then high", () => {
		render(<Stage defaultValue={[20, 60]} getAriaLabel={ends} />);
		const [low, high, ...others] = thumbs();
		expect(others).toHaveLength(0);
		expect(low).toHaveAccessibleName("Lowest");
		expect(valueOf(low)).toBe(20);
		expect(high).toHaveAccessibleName("Highest");
		expect(valueOf(high)).toBe(60);
	});

	test("with neither value nor defaultValue it starts at min", () => {
		render(
			<>
				<Stage testId="plain" />
				<Stage testId="raised" min={20} max={80} aria-label="Damping" />
			</>,
		);
		expect(valueOf(thumb("Volume"))).toBe(0);
		expect(valueOf(thumb("Damping"))).toBe(20);
	});

	test("min and max are the thumb's aria-valuemin and aria-valuemax, and the rail runs from one to the other", () => {
		render(<Stage min={360} max={1080} defaultValue={720} />);
		const volume = thumb("Volume");
		expect(announced(volume)).toEqual({ now: 720, min: 360, max: 1080 });
		const rail = railOf(rootOf());
		expectNear(centre(volume).x, middleOf(rail), "thumb centre");
	});

	test("each thumb sits on the rail at its value", () => {
		render(<Stage defaultValue={[20, 60]} getAriaLabel={ends} />);
		const root = rootOf();
		for (const [name, value] of [
			["Lowest", 20],
			["Highest", 60],
		] as const) {
			const at = pointAt(root, value);
			expectNear(centre(thumb(name)).x, at.x, `${name} across`);
			expectNear(centre(thumb(name)).y, at.y, `${name} down`);
		}
	});

	test("the track is a 4px pill in color-line across the slider's width", () => {
		render(<Stage defaultValue={30} />);
		const root = rootOf();
		const [rail] = painted(root, "--color-line");
		expect(box(rail).height).toBe(4);
		expectNear(box(rail).left, box(root).left, "left end");
		expectNear(box(rail).width, box(root).width, "width");
		expect(getComputedStyle(rail).borderTopLeftRadius).toBe(
			resolved("--radius-pill", "borderTopLeftRadius"),
		);
	});

	test("the thumb a reader sees is white, with a dg-edge edge and the raised shadow", () => {
		render(<Stage defaultValue={30} />);
		const { x, y } = centre(thumb("Volume"));
		const seen = document.elementFromPoint(x, y);
		if (!seen) {
			throw new Error("nothing drawn at the thumb");
		}

		const style = getComputedStyle(seen);
		expect(style.backgroundColor).toBe(resolved("white"));
		expect(style.borderTopColor).toBe(resolved("--dg-edge", "borderTopColor"));
		expect(style.boxShadow).toBe(resolved("--shadow-raised", "boxShadow"));
	});

	test("the track sits in a 32px band for a mouse, and a press anywhere in the band moves the thumb", async () => {
		render(<Stage defaultValue={30} />);
		const root = rootOf();
		const band = box(root);
		expect(band.height).toBe(32);
		const rail = railOf(root);
		const halfRail = rail.height / 2;
		const halfBand = band.height / 2;
		expectNear(rail.top + halfRail, band.top + halfBand, "rail in the middle");
		const near = { x: pointAt(root, 60).x, y: band.top + 2 };
		await pressAt(near);
		await releaseAt(near);
		await expect.poll(() => valueOf(thumb("Volume"))).toBe(60);
	});

	test("on a touch screen the band is 44px, and a tap anywhere in it moves the thumb", async () => {
		await cdp().send("Emulation.setTouchEmulationEnabled", {
			enabled: true,
			maxTouchPoints: 1,
		});
		try {
			render(<Stage defaultValue={30} />);
			const root = rootOf();
			await expect.poll(() => box(root).height).toBe(44);
			await touchAt({ x: pointAt(root, 70).x, y: box(root).top + 3 });
			await expect.poll(() => valueOf(thumb("Volume"))).toBe(70);
		} finally {
			await cdp().send("Emulation.setTouchEmulationEnabled", {
				enabled: false,
			});
		}
	});

	test("the ref is the root span, which holds the thumbs, and className, style and the other HTML attributes land on it", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<Stage
				ref={ref}
				defaultValue={[20, 60]}
				getAriaLabel={ends}
				className="budget"
				style={{ marginTop: 6 }}
				id="latency"
				data-testid="latency"
				title="Latency budget"
			/>,
		);
		const root = ref.current;
		expect(root).toBeInstanceOf(HTMLSpanElement);
		expect(root).toBe(rootOf());
		expect(root).toContainElement(thumb("Lowest"));
		expect(root).toContainElement(thumb("Highest"));
		expect(root).toHaveClass("budget");
		expect(root).toHaveStyle({ marginTop: "6px" });
		expect(root).toHaveAttribute("id", "latency");
		expect(root).toHaveAttribute("data-testid", "latency");
		expect(root).toHaveAttribute("title", "Latency budget");
	});
});

describe("Slider: names and value text", () => {
	test("aria-labelledby names the thumb after a visible label", () => {
		render(
			<>
				<span id="latency-label">Latency budget</span>
				<Stage aria-label={undefined} aria-labelledby="latency-label" />
			</>,
		);
		expect(thumb("Latency budget")).toBeInTheDocument();
	});

	// The preview's range sets both: the visible label for the slider, getAriaLabel for each thumb.
	test("getAriaLabel names each thumb of a range, over aria-labelledby", () => {
		render(
			<>
				<span id="window-label">Response window</span>
				<Stage
					aria-label={undefined}
					aria-labelledby="window-label"
					defaultValue={[80, 240]}
					max={500}
					getAriaLabel={(index) =>
						index === 0 ? "Fastest expected" : "Slowest acceptable"
					}
				/>
			</>,
		);
		expect(valueOf(thumb("Fastest expected"))).toBe(80);
		expect(valueOf(thumb("Slowest acceptable"))).toBe(240);
	});

	test("aria-describedby describes every thumb", () => {
		render(
			<>
				<Stage
					defaultValue={[20, 60]}
					getAriaLabel={ends}
					aria-describedby="window-help"
				/>
				<p id="window-help">The wheel gets it when you let go.</p>
			</>,
		);
		for (const name of ["Lowest", "Highest"]) {
			expect(thumb(name)).toHaveAccessibleDescription(
				"The wheel gets it when you let go.",
			);
		}
	});

	// The README makes aria-valuetext from these two props only; without them a screen reader
	// reads the number, as in the reference.
	test("without getAriaValueText or a format that returns a string, the thumbs have no aria-valuetext", () => {
		render(
			<>
				<Stage testId="one" defaultValue={30} />
				<Stage testId="two" defaultValue={[20, 60]} getAriaLabel={ends} />
			</>,
		);
		for (const element of thumbs()) {
			expect(element).not.toHaveAttribute("aria-valuetext");
		}
	});

	test("a string from valueLabelFormat is also the thumb's aria-valuetext, and follows the value", async () => {
		render(
			<Around>
				<Stage
					defaultValue={120}
					max={500}
					step={10}
					valueLabelFormat={(value) => `${value} ms`}
				/>
			</Around>,
		);
		const volume = await tabInto();
		expect(volume).toHaveAttribute("aria-valuetext", "120 ms");
		await userEvent.keyboard("{ArrowRight}");
		await expect.element(volume).toHaveAttribute("aria-valuetext", "130 ms");
	});

	test("valueLabelFormat as a string is the pill and the aria-valuetext whatever the value", async () => {
		render(
			<Around>
				<Stage
					defaultValue={40}
					valueLabelFormat="Fixed delay"
					valueLabelDisplay="on"
				/>
			</Around>,
		);
		const volume = await tabInto();
		await expectPill(rootOf(), "Fixed delay", true);
		expect(volume).toHaveAttribute("aria-valuetext", "Fixed delay");
		await userEvent.keyboard("{ArrowRight}");
		await expect.poll(() => valueOf(volume)).toBe(41);
		expect(volume).toHaveAttribute("aria-valuetext", "Fixed delay");
		await expectPill(rootOf(), "Fixed delay", true);
	});

	test("a valueLabelFormat that returns an element formats the pill only", async () => {
		render(
			<Stage
				defaultValue={120}
				max={500}
				valueLabelDisplay="on"
				valueLabelFormat={(value) => <strong>{value} ms</strong>}
			/>,
		);
		await expectPill(rootOf(), "120 ms", true);
		expect(thumb("Volume")).not.toHaveAttribute("aria-valuetext");
	});

	test("getAriaValueText gives each thumb its aria-valuetext from the value and the thumb's index, over valueLabelFormat", async () => {
		render(
			<Around>
				<Stage
					defaultValue={[80, 240]}
					max={500}
					step={10}
					getAriaLabel={ends}
					valueLabelFormat={(value) => `${value} ms`}
					getAriaValueText={(value, index) =>
						`${value} milliseconds, the ${index === 0 ? "fastest" : "slowest"}`
					}
				/>
			</Around>,
		);
		expect(thumb("Lowest")).toHaveAttribute(
			"aria-valuetext",
			"80 milliseconds, the fastest",
		);
		expect(thumb("Highest")).toHaveAttribute(
			"aria-valuetext",
			"240 milliseconds, the slowest",
		);
		const low = await tabInto("Lowest");
		await userEvent.keyboard("{ArrowRight}");
		await expect
			.element(low)
			.toHaveAttribute("aria-valuetext", "90 milliseconds, the fastest");
	});

	// The README says a thumb stops at the other thumb; the reference announces those stops as each
	// thumb's range, as the APG's multi-thumb slider does, and moves them with the other thumb.
	test("in a range each thumb's aria-valuemin and aria-valuemax are where it stops: the slider's end and the other thumb", async () => {
		render(
			<Around>
				<Stage defaultValue={[20, 60]} getAriaLabel={ends} />
			</Around>,
		);
		expect(announced(thumb("Lowest"))).toEqual({ now: 20, min: 0, max: 60 });
		expect(announced(thumb("Highest"))).toEqual({ now: 60, min: 20, max: 100 });
		await tabInto("Lowest");
		await userEvent.keyboard("{PageUp}");
		await expect
			.poll(() => announced(thumb("Highest")))
			.toEqual({ now: 60, min: 30, max: 100 });
	});
});

describe("Slider: keyboard", () => {
	test("the thumb is one tab stop: Tab goes from Before to it and on to After, and Shift+Tab back", async () => {
		render(
			<Around>
				<Stage defaultValue={30} />
			</Around>,
		);
		await tabInto();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(thumb("Volume")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
	});

	test("in a range each thumb is a tab stop of its own, the low one first", async () => {
		render(
			<Around>
				<Stage defaultValue={[20, 60]} getAriaLabel={ends} />
			</Around>,
		);
		await tabInto("Lowest");
		await userEvent.tab();
		await expect.element(thumb("Highest")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(thumb("Highest")).toHaveFocus();
	});

	test("Right and Up step up, Left and Down step down, by a step of 1 by default", async () => {
		render(
			<Around>
				<Stage defaultValue={50} />
			</Around>,
		);
		await keys(await tabInto(), [
			["{ArrowRight}", 51],
			["{ArrowUp}", 52],
			["{ArrowLeft}", 51],
			["{ArrowDown}", 50],
		]);
	});

	test("step sets how far an arrow moves", async () => {
		render(
			<Around>
				<Stage defaultValue={120} max={500} step={10} />
			</Around>,
		);
		await keys(await tabInto(), [
			["{ArrowRight}", 130],
			["{ArrowDown}", 120],
		]);
	});

	test("a fractional step lands on exact values", async () => {
		render(
			<Around>
				<Stage defaultValue={0.2} max={1} step={0.1} />
			</Around>,
		);
		const volume = await tabInto();
		await userEvent.keyboard("{ArrowRight}");
		await expect.element(volume).toHaveAttribute("aria-valuenow", "0.3");
		await userEvent.keyboard("{ArrowRight}");
		await expect.element(volume).toHaveAttribute("aria-valuenow", "0.4");
		await userEvent.keyboard("{ArrowLeft}");
		await expect.element(volume).toHaveAttribute("aria-valuenow", "0.3");
	});

	test("Shift+arrow, Page Up and Page Down take shiftStep", async () => {
		render(
			<Around>
				<Stage defaultValue={50} shiftStep={25} />
			</Around>,
		);
		await keys(await tabInto(), [
			["{Shift>}{ArrowRight}{/Shift}", 75],
			["{Shift>}{ArrowLeft}{/Shift}", 50],
			["{Shift>}{ArrowUp}{/Shift}", 75],
			["{Shift>}{ArrowDown}{/Shift}", 50],
			["{PageUp}", 75],
			["{PageDown}", 50],
		]);
	});

	test("shiftStep is 10 steps by default", async () => {
		render(
			<Around>
				<Stage defaultValue={50} />
				<Stage
					testId="coarse"
					aria-label="Budget"
					defaultValue={100}
					max={500}
					step={5}
				/>
			</Around>,
		);
		await keys(await tabInto(), [
			["{PageUp}", 60],
			["{Shift>}{ArrowLeft}{/Shift}", 50],
		]);
		await userEvent.tab();
		const budget = thumb("Budget");
		await expect.element(budget).toHaveFocus();
		await keys(budget, [
			["{PageUp}", 150],
			["{Shift>}{ArrowRight}{/Shift}", 200],
		]);
	});

	test("Home and End go to min and max", async () => {
		render(
			<Around>
				<Stage defaultValue={50} min={20} max={80} />
			</Around>,
		);
		await keys(await tabInto(), [
			["{End}", 80],
			["{Home}", 20],
		]);
	});

	test("the keys stop at min and max", async () => {
		render(
			<Around>
				<Stage defaultValue={95} />
			</Around>,
		);
		await keys(await tabInto(), [
			["{PageUp}", 100],
			["{ArrowRight}", 100],
			["{Home}", 0],
			["{ArrowLeft}", 0],
			["{PageDown}", 0],
		]);
	});

	test("in a range a thumb stops at the other thumb: End, Home and the arrows", async () => {
		render(
			<Around>
				<Stage defaultValue={[30, 70]} getAriaLabel={ends} />
			</Around>,
		);
		const low = await tabInto("Lowest");
		await keys(low, [
			["{End}", 70],
			["{ArrowRight}", 70],
			["{Home}", 0],
			["{PageUp}", 10],
			["{PageUp}", 20],
			["{PageUp}", 30],
		]);
		await userEvent.tab();
		const high = thumb("Highest");
		await expect.element(high).toHaveFocus();
		await keys(high, [
			["{Home}", 30],
			["{ArrowLeft}", 30],
			["{PageDown}", 30],
		]);
		expect(valueOf(low)).toBe(30);
	});

	test("with step null the arrows, Page Up and Page Down go to the next or previous mark, and Home and End to min and max", async () => {
		render(
			<Around>
				<Stage
					defaultValue={540}
					min={360}
					max={1080}
					step={null}
					marks={rotation}
				/>
			</Around>,
		);
		await keys(await tabInto(), [
			["{ArrowRight}", 900],
			["{ArrowUp}", 1080],
			["{ArrowRight}", 1080],
			["{ArrowLeft}", 900],
			["{ArrowDown}", 540],
			["{PageDown}", 360],
			["{PageUp}", 540],
			["{Shift>}{ArrowRight}{/Shift}", 900],
			["{Home}", 360],
			["{End}", 1080],
		]);
	});
});

describe("Slider: pointer", () => {
	test("a press on the track jumps the thumb there, and a drag then follows the pointer", async () => {
		render(<Stage defaultValue={10} />);
		const root = rootOf();
		const volume = thumb("Volume");
		await pressAt(pointAt(root, 30));
		await expect.poll(() => valueOf(volume)).toBe(30);
		for (const value of [65, 20]) {
			// eslint-disable-next-line no-await-in-loop -- the drag goes from point to point
			await moveTo(pointAt(root, value));
			// eslint-disable-next-line no-await-in-loop
			await expect.poll(() => valueOf(volume)).toBe(value);
			// eslint-disable-next-line no-await-in-loop
			await vi.waitFor(() => {
				expectNear(
					centre(volume).x,
					pointAt(root, value).x,
					"thumb under the pointer",
				);
			});
		}

		await releaseAt(pointAt(root, 20));
		await pause(100);
		expect(valueOf(volume)).toBe(20);
	});

	test("a press snaps to the nearest step", async () => {
		render(<Stage defaultValue={0} max={500} step={10} />);
		const root = rootOf();
		const volume = thumb("Volume");
		await pressAt(pointAt(root, 243, { max: 500 }));
		await releaseAt(pointAt(root, 243, { max: 500 }));
		await expect.poll(() => valueOf(volume)).toBe(240);
		await pressAt(pointAt(root, 447, { max: 500 }));
		await releaseAt(pointAt(root, 447, { max: 500 }));
		await expect.poll(() => valueOf(volume)).toBe(450);
	});

	test("with step null a press snaps to the nearest mark", async () => {
		render(
			<Stage
				defaultValue={360}
				min={360}
				max={1080}
				step={null}
				marks={rotation}
			/>,
		);
		const root = rootOf();
		const volume = thumb("Volume");
		const scale = { min: 360, max: 1080 };
		await pressAt(pointAt(root, 700, scale));
		await releaseAt(pointAt(root, 700, scale));
		await expect.poll(() => valueOf(volume)).toBe(540);
		await pressAt(pointAt(root, 760, scale));
		await releaseAt(pointAt(root, 760, scale));
		await expect.poll(() => valueOf(volume)).toBe(900);
	});

	test("the pointer is captured: the drag keeps working outside the track, and ends where it's let go", async () => {
		const { commits, onChangeCommitted } = recorder();
		render(<Stage defaultValue={50} onChangeCommitted={onChangeCommitted} />);
		const root = rootOf();
		const volume = thumb("Volume");
		const below = box(root).bottom + 120;
		await pressAt(centre(volume));
		await moveTo({ x: box(root).right + 80, y: below });
		await expect.poll(() => valueOf(volume)).toBe(100);
		await moveTo({ x: pointAt(root, 25).x, y: below });
		await expect.poll(() => valueOf(volume)).toBe(25);
		expect(commits).toEqual([]);
		await releaseAt({ x: pointAt(root, 25).x, y: below });
		await expect
			.poll(() => commits.map((commit) => commit.value))
			.toEqual([25]);
	});

	test("in a range a press moves the nearest thumb", async () => {
		render(<Stage defaultValue={[20, 80]} getAriaLabel={ends} />);
		const root = rootOf();
		await pressAt(pointAt(root, 70));
		await releaseAt(pointAt(root, 70));
		await expect
			.poll(() => thumbs().map((element) => valueOf(element)))
			.toEqual([20, 70]);
		await pressAt(pointAt(root, 35));
		await releaseAt(pointAt(root, 35));
		await expect
			.poll(() => thumbs().map((element) => valueOf(element)))
			.toEqual([35, 70]);
	});

	test("in a range a dragged thumb stops at the other thumb", async () => {
		render(
			<>
				<Stage testId="up" defaultValue={[20, 60]} getAriaLabel={ends} />
				<Stage testId="down" defaultValue={[20, 60]} getAriaLabel={ends} />
			</>,
		);
		const up = rootOf("up");
		await pressAt(centre(thumb("Lowest", up)));
		await moveTo(pointAt(up, 90));
		await moveTo(pointAt(up, 95));
		await releaseAt(pointAt(up, 95));
		await expect
			.poll(() => thumbs(up).map((element) => valueOf(element)))
			.toEqual([60, 60]);

		const down = rootOf("down");
		await pressAt(centre(thumb("Highest", down)));
		await moveTo(pointAt(down, 5));
		await moveTo(pointAt(down, 0));
		await releaseAt(pointAt(down, 0));
		await expect
			.poll(() => thumbs(down).map((element) => valueOf(element)))
			.toEqual([20, 20]);
	});
});

describe("Slider: onChange and onChangeCommitted", () => {
	test("a key calls onChange with the keydown event, the new value and the thumb, then onChangeCommitted with the event and the value", async () => {
		const { changes, commits, onChange, onChangeCommitted } = recorder();
		render(
			<Around>
				<Stage
					defaultValue={50}
					onChange={onChange}
					onChangeCommitted={onChangeCommitted}
				/>
			</Around>,
		);
		await keys(await tabInto(), [
			["{ArrowRight}", 51],
			["{End}", 100],
		]);
		expect(changes).toEqual([
			{ event: "keydown (KeyboardEvent)", value: 51, thumb: 0 },
			{ event: "keydown (KeyboardEvent)", value: 100, thumb: 0 },
		]);
		expect(commits).toEqual([
			{ event: "keydown (KeyboardEvent)", value: 51 },
			{ event: "keydown (KeyboardEvent)", value: 100 },
		]);
	});

	test("a key that can't move the value calls neither", async () => {
		const { changes, commits, onChange, onChangeCommitted } = recorder();
		render(
			<Around>
				<Stage
					defaultValue={100}
					onChange={onChange}
					onChangeCommitted={onChangeCommitted}
				/>
			</Around>,
		);
		const volume = await tabInto();
		await userEvent.keyboard("{ArrowRight}");
		await userEvent.keyboard("{End}");
		await userEvent.keyboard("{PageUp}");
		await userEvent.keyboard("{ArrowLeft}");
		await expect.poll(() => valueOf(volume)).toBe(99);
		expect(changes.map((change) => change.value)).toEqual([99]);
		expect(commits.map((commit) => commit.value)).toEqual([99]);
	});

	test("a drag calls onChange on the press and on every move that changes the value, with the pointer event and the thumb", async () => {
		const { changes, onChange } = recorder();
		render(<Stage defaultValue={10} onChange={onChange} />);
		const root = rootOf();
		await pressAt(pointAt(root, 30));
		await moveTo(pointAt(root, 45));
		// Down off the track, the same distance along: the value stays.
		await moveTo({ x: pointAt(root, 45).x, y: pointAt(root, 45).y + 40 });
		await moveTo(pointAt(root, 80));
		await releaseAt(pointAt(root, 80));
		await expect.poll(() => changes.length).toBe(3);
		expect(changes).toEqual([
			{ event: "pointerdown (PointerEvent)", value: 30, thumb: 0 },
			{ event: "pointermove (PointerEvent)", value: 45, thumb: 0 },
			{ event: "pointermove (PointerEvent)", value: 80, thumb: 0 },
		]);
	});

	test("onChangeCommitted runs once a drag ends, with the pointerup event and the final value", async () => {
		const { changes, commits, onChange, onChangeCommitted } = recorder();
		render(
			<Stage
				defaultValue={10}
				onChange={onChange}
				onChangeCommitted={onChangeCommitted}
			/>,
		);
		const root = rootOf();
		await pressAt(pointAt(root, 30));
		await moveTo(pointAt(root, 45));
		await moveTo(pointAt(root, 80));
		await expect.poll(() => changes.length).toBe(3);
		expect(commits).toEqual([]);
		await releaseAt(pointAt(root, 80));
		await expect
			.poll(() => commits)
			.toEqual([{ event: "pointerup (PointerEvent)", value: 80 }]);
	});

	test("in a range onChange gets the new array and the index of the thumb that moved, and onChangeCommitted the array", async () => {
		const { changes, commits, onChange, onChangeCommitted } = recorder();
		render(
			<Around>
				<Stage
					defaultValue={[20, 60]}
					getAriaLabel={ends}
					onChange={onChange}
					onChangeCommitted={onChangeCommitted}
				/>
			</Around>,
		);
		await tabInto("Lowest");
		await userEvent.tab();
		await keys(thumb("Highest"), [["{ArrowRight}", 61]]);
		const root = rootOf();
		await pressAt(pointAt(root, 30));
		await moveTo(pointAt(root, 35));
		await releaseAt(pointAt(root, 35));
		await expect.poll(() => commits.length).toBe(2);
		expect(changes).toEqual([
			{ event: "keydown (KeyboardEvent)", value: [20, 61], thumb: 1 },
			{ event: "pointerdown (PointerEvent)", value: [30, 61], thumb: 0 },
			{ event: "pointermove (PointerEvent)", value: [35, 61], thumb: 0 },
		]);
		expect(commits).toEqual([
			{ event: "keydown (KeyboardEvent)", value: [20, 61] },
			{ event: "pointerup (PointerEvent)", value: [35, 61] },
		]);
	});
});

describe("Slider: value and defaultValue", () => {
	test("defaultValue only sets the start: the slider keeps its value, and a new defaultValue doesn't move it", async () => {
		const { rerender } = render(
			<Around>
				<Stage defaultValue={30} />
			</Around>,
		);
		await keys(await tabInto(), [["{ArrowRight}", 31]]);
		rerender(
			<Around>
				<Stage defaultValue={70} />
			</Around>,
		);
		await pause(100);
		expect(valueOf(thumb("Volume"))).toBe(31);
	});

	test("value controls it: a key or a press calls onChange, and only a new value moves the thumb", async () => {
		const { changes, onChange } = recorder();
		const { rerender } = render(
			<Around>
				<Stage value={50} onChange={onChange} />
			</Around>,
		);
		const volume = await tabInto();
		await userEvent.keyboard("{ArrowRight}");
		await pressAt(pointAt(rootOf(), 80));
		await releaseAt(pointAt(rootOf(), 80));
		await expect
			.poll(() => changes.map((change) => change.value))
			.toEqual([51, 80]);
		await pause(100);
		expect(valueOf(volume)).toBe(50);
		rerender(
			<Around>
				<Stage value={80} onChange={onChange} />
			</Around>,
		);
		await expect.poll(() => valueOf(thumb("Volume"))).toBe(80);
	});

	test("a range under value moves as onChange sets each new array, as the README's usage does", async () => {
		function Window() {
			const [value, setValue] = React.useState<number[]>([20, 60]);
			return (
				<Around>
					<Stage
						value={value}
						getAriaLabel={ends}
						onChange={(_event, next) => {
							setValue(next as number[]);
						}}
					/>
				</Around>
			);
		}

		render(<Window />);
		await keys(await tabInto("Lowest"), [["{ArrowRight}", 21]]);
		const root = rootOf();
		await pressAt(pointAt(root, 75));
		await moveTo(pointAt(root, 85));
		await releaseAt(pointAt(root, 85));
		await expect
			.poll(() => thumbs().map((element) => valueOf(element)))
			.toEqual([21, 85]);
	});
});

describe("Slider: marks", () => {
	test("there are no marks by default", () => {
		render(<Stage defaultValue={30} step={10} />);
		expect(dotsOf(rootOf())).toEqual([]);
	});

	test("marks={true} puts a dot at every step", () => {
		render(<Stage marks defaultValue={2} max={6} />);
		const root = rootOf();
		const dots = dotsOf(root)
			.map((dot) => middleOf(dot))
			.toSorted((a, b) => a - b);
		expect(dots).toHaveLength(7);
		for (const [step, x] of dots.entries()) {
			expectNear(x, pointAt(root, step, { max: 6 }).x, `dot ${step}`);
		}
	});

	test("an array of marks puts a dot at each value and its label under it, the end labels within the track", () => {
		const marks: SliderMark[] = [...rotation, { value: 720 }];
		render(
			<Stage
				defaultValue={900}
				min={360}
				max={1080}
				step={null}
				marks={marks}
			/>,
		);
		const root = rootOf();
		const scale = { min: 360, max: 1080 };
		const dots = dotsOf(root)
			.map((dot) => middleOf(dot))
			.toSorted((a, b) => a - b);
		expect(dots).toHaveLength(5);
		for (const [index, value] of [360, 540, 720, 900, 1080].entries()) {
			expectNear(dots[index], pointAt(root, value, scale).x, `dot at ${value}`);
		}

		const rail = railOf(root);
		for (const value of degrees) {
			const text = box(within(root).getByText(`${value}°`));
			expect(text.top).toBeGreaterThanOrEqual(rail.bottom);
			expect(text.left).toBeGreaterThanOrEqual(rail.left - 0.5);
			expect(text.right).toBeLessThanOrEqual(rail.right + 0.5);
			if (value === 360 || value === 1080) {
				continue;
			}

			expectNear(
				middleOf(text),
				pointAt(root, value, scale).x,
				`${value}° under its dot`,
			);
		}
	});

	test("mark labels are 12px and color-muted, and color-ink inside the filled range", () => {
		const shared = { min: 360, max: 1080, step: null, marks: rotation };
		render(
			<>
				<Stage testId="normal" defaultValue={540} {...shared} />
				<Stage
					testId="inverted"
					defaultValue={540}
					track="inverted"
					{...shared}
				/>
				<Stage
					testId="range"
					defaultValue={[540, 900]}
					getAriaLabel={ends}
					{...shared}
				/>
			</>,
		);
		const ink = resolved("--color-ink", "color");
		const muted = resolved("--color-muted", "color");
		const inked = {
			normal: [360, 540],
			inverted: [540, 900, 1080],
			range: [540, 900],
		};
		for (const [testId, inside] of Object.entries(inked)) {
			for (const value of degrees) {
				const text = within(rootOf(testId)).getByText(`${value}°`);
				expect(getComputedStyle(text).fontSize).toBe("12px");
				expect(getComputedStyle(text).color, `${testId} ${value}°`).toBe(
					inside.includes(value) ? ink : muted,
				);
			}
		}
	});
});

describe("Slider: track", () => {
	test("track normal (the default) fills the rail in color-blue from min up to the value", () => {
		render(<Stage defaultValue={30} />);
		const root = rootOf();
		const rail = railOf(root);
		const fill = fillOf(root);
		expect(fill).toBeDefined();
		expectNear(fill?.left ?? NaN, rail.left, "start");
		expectNear(fill?.right ?? NaN, pointAt(root, 30).x, "end");
		expectNear(fill?.top ?? NaN, rail.top, "top");
		expect(fill?.height).toBe(4);
	});

	test("the fill follows the value", async () => {
		render(
			<Around>
				<Stage defaultValue={30} />
			</Around>,
		);
		await keys(await tabInto(), [["{End}", 100]]);
		const root = rootOf();
		await vi.waitFor(() => {
			expectNear(fillOf(root)?.right ?? NaN, railOf(root).right, "end");
		});
	});

	test("track inverted fills from the value to max", () => {
		render(<Stage defaultValue={30} track="inverted" />);
		const root = rootOf();
		const fill = fillOf(root);
		expectNear(fill?.left ?? NaN, pointAt(root, 30).x, "start");
		expectNear(fill?.right ?? NaN, railOf(root).right, "end");
	});

	test("track false fills nothing", () => {
		render(<Stage defaultValue={30} track={false} />);
		expect(fillOf(rootOf())).toBeUndefined();
	});

	test("a range fills between its thumbs", () => {
		render(<Stage defaultValue={[20, 60]} getAriaLabel={ends} />);
		const root = rootOf();
		const fill = fillOf(root);
		expectNear(fill?.left ?? NaN, pointAt(root, 20).x, "start");
		expectNear(fill?.right ?? NaN, pointAt(root, 60).x, "end");
	});
});

describe("Slider: the value pill", () => {
	test("auto, the default: no pill at rest; hovering the thumb shows it, and the pointer leaving hides it", async () => {
		render(<Stage defaultValue={30} />);
		const root = rootOf();
		await pause(200);
		expect(drawn(root, "30")).toHaveLength(0);
		await moveTo(centre(thumb("Volume")));
		await expectPill(root, "30", true);
		await parkPointer();
		await expectPill(root, "30", false);
	});

	test("auto: keyboard focus shows it, and it goes when focus leaves", async () => {
		render(
			<Around>
				<Stage defaultValue={30} />
			</Around>,
		);
		const root = rootOf();
		await tabInto();
		await expectPill(root, "30", true);
		await userEvent.tab();
		await expectPill(root, "30", false);
	});

	test("auto: a drag shows it with the value as it moves, the pointer off the thumb too", async () => {
		render(<Stage defaultValue={30} />);
		const root = rootOf();
		const volume = thumb("Volume");
		const below = box(root).bottom + 120;
		await pressAt(centre(volume));
		await moveTo({ x: pointAt(root, 50).x, y: below });
		await expect.poll(() => valueOf(volume)).toBe(50);
		await expectPill(root, "50", true);
		await moveTo({ x: pointAt(root, 60).x, y: below });
		await expectPill(root, "60", true);
		await releaseAt({ x: pointAt(root, 60).x, y: below });
	});

	referenceDefectTest(
		"auto: once a drag ends away from the thumb the pill goes, since a press isn't keyboard focus",
		async () => {
			render(<Stage defaultValue={30} />);
			const root = rootOf();
			const volume = thumb("Volume");
			const below = box(root).bottom + 120;
			await pressAt(centre(volume));
			await moveTo({ x: pointAt(root, 60).x, y: below });
			await expect.poll(() => valueOf(volume)).toBe(60);
			await releaseAt({ x: pointAt(root, 60).x, y: below });
			await expectPill(root, "60", false);
		},
	);

	test("auto: in a range only the hovered thumb shows its pill", async () => {
		render(<Stage defaultValue={[20, 60]} getAriaLabel={ends} />);
		const root = rootOf();
		await moveTo(centre(thumb("Highest")));
		await expectPill(root, "60", true);
		expect(drawn(root, "20")).toHaveLength(0);
	});

	test("on shows every thumb's pill at rest", async () => {
		render(
			<Stage
				defaultValue={[20, 60]}
				getAriaLabel={ends}
				valueLabelDisplay="on"
			/>,
		);
		const root = rootOf();
		await expectPill(root, "20", true);
		await expectPill(root, "60", true);
	});

	test("off never shows it: hovered, keyboard-focused or dragged", async () => {
		render(
			<Around>
				<Stage defaultValue={30} valueLabelDisplay="off" />
			</Around>,
		);
		const root = rootOf();
		const volume = thumb("Volume");
		await moveTo(centre(volume));
		await pause(250);
		expect(drawn(root, "30")).toHaveLength(0);
		await parkPointer();
		await tabInto();
		await pause(250);
		expect(drawn(root, "30")).toHaveLength(0);
		await pressAt(centre(volume));
		await moveTo({ x: pointAt(root, 40).x, y: box(root).bottom + 120 });
		await expect.poll(() => valueOf(volume)).toBe(40);
		await pause(250);
		expect(drawn(root, "40")).toHaveLength(0);
		await releaseAt({ x: pointAt(root, 40).x, y: box(root).bottom + 120 });
	});

	test("the pill is an ink pill over its thumb, showing the value", async () => {
		render(<Stage defaultValue={30} valueLabelDisplay="on" />);
		const root = rootOf();
		await expectPill(root, "30", true);
		const [pill] = drawn(root, "30");
		await vi.waitFor(() => {
			expect(getComputedStyle(pill).opacity).toBe("1");
		});
		expect(getComputedStyle(pill).backgroundColor).toBe(
			resolved("--color-ink"),
		);
		expect(getComputedStyle(pill).color).toBe(resolved("--on-ink", "color"));
		expect(getComputedStyle(pill).fontSize).toBe("12px");
		const volume = thumb("Volume");
		await vi.waitFor(() => {
			expect(box(pill).bottom).toBeLessThanOrEqual(box(volume).top);
			expectNear(centre(pill).x, centre(volume).x, "centred over the thumb");
		});
	});

	test("valueLabelFormat formats each pill from the value and the thumb's index", async () => {
		render(
			<Stage
				defaultValue={[80, 240]}
				max={500}
				getAriaLabel={ends}
				valueLabelDisplay="on"
				valueLabelFormat={(value, index) =>
					`${index === 0 ? "from" : "to"} ${value} ms`
				}
			/>,
		);
		const root = rootOf();
		await expectPill(root, "from 80 ms", true);
		await expectPill(root, "to 240 ms", true);
	});
});

describe("Slider: vertical", () => {
	test("vertical fills its parent's height, its thumb says vertical, and a value sits that share of the way up", () => {
		render(<Upright defaultValue={30} />);
		const root = rootOf();
		expectNear(box(root).height, 200, "slider height");
		expectNear(railOf(root).height, 200, "rail height");
		const strength = thumb("Strength");
		expect(strength).toHaveAttribute("aria-orientation", "vertical");
		const at = pointAt(root, 30, {}, true);
		expectNear(centre(strength).y, at.y, "thumb height");
		expectNear(centre(strength).x, at.x, "thumb on the rail");
	});

	test("vertical, the fill rises from the bottom up to the value", () => {
		render(<Upright defaultValue={30} />);
		const root = rootOf();
		const fill = fillOf(root);
		expectNear(fill?.bottom ?? NaN, railOf(root).bottom, "bottom");
		expectNear(fill?.top ?? NaN, pointAt(root, 30, {}, true).y, "top");
		expect(fill?.width).toBe(4);
	});

	test("vertical, the bottom is min and the top max: a press jumps there and a drag follows", async () => {
		render(<Upright defaultValue={30} />);
		const root = rootOf();
		const strength = thumb("Strength");
		await pressAt(pointAt(root, 75, {}, true));
		await expect.poll(() => valueOf(strength)).toBe(75);
		await moveTo(pointAt(root, 25, {}, true));
		await expect.poll(() => valueOf(strength)).toBe(25);
		await releaseAt(pointAt(root, 25, {}, true));
	});

	test("vertical, Up and Right still step up, and Down and Left down", async () => {
		render(
			<Around>
				<Upright defaultValue={50} />
			</Around>,
		);
		await keys(await tabInto("Strength"), [
			["{ArrowUp}", 51],
			["{ArrowRight}", 52],
			["{ArrowDown}", 51],
			["{ArrowLeft}", 50],
		]);
	});
});

describe("Slider: disabled", () => {
	test("disabled dims the slider to 50%", () => {
		render(<Stage disabled defaultValue={30} />);
		expect(getComputedStyle(rootOf()).opacity).toBe("0.5");
	});

	test("disabled: a press on the track or a drag on the thumb changes nothing", async () => {
		const { changes, onChange } = recorder();
		render(<Stage disabled defaultValue={30} onChange={onChange} />);
		const root = rootOf();
		const volume = thumb("Volume");
		await pressAt(pointAt(root, 80));
		await releaseAt(pointAt(root, 80));
		await pressAt(centre(volume));
		await moveTo(pointAt(root, 60));
		await releaseAt(pointAt(root, 60));
		await pause(100);
		expect(valueOf(volume)).toBe(30);
		expect(changes).toEqual([]);
	});

	test("disabled: the thumbs are disabled and out of the tab order, and keys change nothing", async () => {
		const { changes, onChange } = recorder();
		render(
			<Around>
				<Stage
					disabled
					defaultValue={[20, 60]}
					getAriaLabel={ends}
					onChange={onChange}
				/>
			</Around>,
		);
		for (const element of thumbs()) {
			expect(isDisabled(element)).toBe(true);
		}

		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		thumb("Lowest").focus();
		await userEvent.keyboard("{ArrowRight}");
		await userEvent.keyboard("{End}");
		await pause(100);
		expect(thumbs().map((element) => valueOf(element))).toEqual([20, 60]);
		expect(changes).toEqual([]);
	});
});

describe("Slider: forms", () => {
	test("name puts a hidden input per thumb in the form, each holding its thumb's value", () => {
		render(
			<form aria-label="Settings">
				<Stage name="latency" defaultValue={120} max={500} />
				<Stage
					testId="window"
					name="window"
					defaultValue={[80, 240]}
					max={500}
					getAriaLabel={ends}
				/>
			</form>,
		);
		const data = new FormData(formNamed("Settings"));
		expect(data.getAll("latency")).toEqual(["120"]);
		expect(data.getAll("window")).toEqual(["80", "240"]);
	});

	test("the form's value follows the slider", async () => {
		render(
			<form aria-label="Settings">
				<Around>
					<Stage name="latency" defaultValue={120} max={500} step={10} />
				</Around>
			</form>,
		);
		const form = formNamed("Settings");
		await keys(await tabInto(), [["{ArrowRight}", 130]]);
		await expect
			.poll(() => new FormData(form).getAll("latency"))
			.toEqual(["130"]);
		await pressAt(pointAt(rootOf(), 300, { max: 500 }));
		await releaseAt(pointAt(rootOf(), 300, { max: 500 }));
		await expect
			.poll(() => new FormData(form).getAll("latency"))
			.toEqual(["300"]);
	});

	test("without name the slider adds nothing to the form", () => {
		render(
			<form aria-label="Settings">
				<Stage defaultValue={[20, 60]} getAriaLabel={ends} />
			</form>,
		);
		const data = new FormData(formNamed("Settings"));
		expect(data.keys().toArray()).toEqual([]);
	});
});

describe("Slider: the events its callbacks get", () => {
	test("onChange gets the React event of the key that moved the thumb: its nativeEvent is that key event, and its target sits in the slider", async () => {
		const seen: Array<{ nativeEvent: Event; target: EventTarget | null }> = [];
		const keydowns: KeyboardEvent[] = [];
		const onKeydown = (event: KeyboardEvent) => {
			keydowns.push(event);
		};

		document.addEventListener("keydown", onKeydown, { capture: true });
		try {
			render(
				<Around>
					<Stage
						defaultValue={20}
						onChange={(event) => {
							seen.push({
								nativeEvent: event.nativeEvent,
								target: event.target,
							});
						}}
					/>
				</Around>,
			);
			await tabInto();
			await userEvent.keyboard("{ArrowRight}");
			await vi.waitFor(() => {
				expect(seen).toHaveLength(1);
			});
			expect(seen[0].nativeEvent).toBe(keydowns.at(-1));
			expect(rootOf().contains(seen[0].target as Node)).toBe(true);
		} finally {
			document.removeEventListener("keydown", onKeydown, { capture: true });
		}
	});

	test("a consumer's capture handlers on the root still run: onKeyDownCapture sees the key, and the thumb still moves", async () => {
		const onKeyDownCapture =
			vi.fn<React.KeyboardEventHandler<HTMLSpanElement>>();
		render(
			<Around>
				<Stage defaultValue={20} onKeyDownCapture={onKeyDownCapture} />
			</Around>,
		);
		const volume = await tabInto();
		await userEvent.keyboard("{ArrowRight}");
		await expect.element(volume).toHaveAttribute("aria-valuenow", "21");
		expect(onKeyDownCapture).toHaveBeenCalledTimes(1);
	});
});
