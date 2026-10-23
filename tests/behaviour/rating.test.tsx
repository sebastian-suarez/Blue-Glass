// Behaviour specs for Rating, from design-system/components/Rating/README.md and api.d.ts. The port
// runs on Base UI's RadioGroup, whose radios are spans with the role beside hidden inputs, so the
// specs find the stars by role and name: a radiogroup of radios named by getLabelText, and a
// read-only rating as one image. How full each star is drawn is read from a screenshot of the row:
// the color-blue pixels in each half of each star's slot. The mouse goes to points across the row.
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import "#ui/styles.css";
import { Rating, type RatingProps } from "#ui";

/**
Parks the pointer in the page's bottom-left corner, clear of every rating below: stars that
appear under a resting pointer count as hovered.
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

afterEach(() => {
	cleanup();
});

type OnChange = NonNullable<RatingProps["onChange"]>;
type OnChangeActive = NonNullable<RatingProps["onChangeActive"]>;

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function middleOf(element: Element): number {
	const { top, height } = box(element);
	const half = height / 2;
	return top + half;
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

function stars(name = "Rating"): HTMLElement {
	return screen.getByRole("radiogroup", { name });
}

function radio(name: string, container: HTMLElement = document.body) {
	return within(container).getByRole("radio", { name });
}

function checkedIn(container: HTMLElement): HTMLElement[] {
	return within(container).queryAllByRole("radio", { checked: true });
}

/**
Checks that the named radio is the only checked one in the group.
*/
function expectOnlyChecked(
	name: string,
	group: HTMLElement = stars(),
	message = name,
): void {
	const checked = checkedIn(group);
	expect(checked, message).toHaveLength(1);
	expect(checked[0], message).toBe(radio(name, group));
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
Disabled natively, or through aria-disabled.
*/
function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

/**
How opaque the element is drawn: its opacity times its ancestors'.
*/
function drawnOpacity(element: Element): number {
	let opacity = 1;
	for (
		let current: Element | null = element;
		current;
		current = current.parentElement
	) {
		opacity *= Number(getComputedStyle(current).opacity);
	}

	return opacity;
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

async function tabFromBefore(): Promise<void> {
	button("Before").focus();
	await userEvent.tab();
}

type Part = "whole" | "first half" | "second half";

function shareOf(part: Part): number {
	if (part === "first half") {
		return 0.25;
	}

	return part === "second half" ? 0.75 : 0.5;
}

/**
A point over a star (counted from 1) in a row of `count`, relative to the row: the middle of the
star's slot, or of its first or second half.
*/
function over(
	row: HTMLElement,
	star: number,
	count = 5,
	part: Part = "whole",
): { x: number; y: number } {
	const { width, height } = box(row);
	const slot = width / count;
	const half = height / 2;
	return { x: (star - 1 + shareOf(part)) * slot, y: half };
}

async function hoverStar(
	row: HTMLElement,
	star: number,
	part: Part = "whole",
	count = 5,
): Promise<void> {
	await userEvent.hover(row, { position: over(row, star, count, part) });
}

async function pressStar(
	row: HTMLElement,
	star: number,
	{
		part = "whole",
		count = 5,
		force = false,
	}: { part?: Part; count?: number; force?: boolean } = {},
): Promise<void> {
	await userEvent.click(row, { position: over(row, star, count, part), force });
}

/**
The computed value of a colour token, read from a probe element styled with it.
*/
function resolvedColor(token: string): string {
	const probe = document.createElement("div");
	probe.style.color = `var(${token})`;
	document.body.append(probe);
	const { color } = getComputedStyle(probe);
	probe.remove();
	return color;
}

function channels(color: string): number[] {
	return (color.match(/[\d.]+/gv) ?? []).slice(0, 3).map(Number);
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

function changedPixels(before: ImageData, after: ImageData): number {
	if (before.width !== after.width || before.height !== after.height) {
		throw new Error("the screenshots differ in size");
	}

	let changed = 0;
	for (let offset = 0; offset < before.data.length; offset += 4) {
		if (
			before.data[offset] !== after.data[offset] ||
			before.data[offset + 1] !== after.data[offset + 1] ||
			before.data[offset + 2] !== after.data[offset + 2]
		) {
			changed++;
		}
	}

	return changed;
}

/**
Counts, in each half of each star's slot, the pixels drawn in a token's colour: [first, second]
per star. Only pixels at the colour count, so other colours and blended edges don't.
*/
async function pixelsIn(
	row: HTMLElement,
	token: string,
	count: number,
): Promise<Array<[number, number]>> {
	const pixels = await screenshotPixels(row);
	const [red, green, blue] = channels(resolvedColor(token));
	const slot = pixels.width / count;
	const between = (from: number, to: number): number => {
		let found = 0;
		for (let y = 0; y < pixels.height; y++) {
			for (let x = Math.ceil(from); x < Math.floor(to); x++) {
				const rowStart = y * pixels.width;
				const offset = (rowStart + x) * 4;
				const distance =
					Math.abs(pixels.data[offset] - red) +
					Math.abs(pixels.data[offset + 1] - green) +
					Math.abs(pixels.data[offset + 2] - blue);
				if (distance <= 30) {
					found++;
				}
			}
		}

		return found;
	};

	return Array.from({ length: count }, (_, index) => {
		const start = index * slot;
		const half = slot / 2;
		const middle = start + half;
		return [
			between(start + 1, middle - 1),
			between(middle + 1, start + slot - 1),
		];
	});
}

/**
How full each star of the row is drawn, from a screenshot: 1 when color-blue fills both halves
of its slot, 0.5 when only the first half, 0 when neither.
*/
async function fills(row: HTMLElement, count = 5): Promise<number[]> {
	const halves = await pixelsIn(row, "--color-blue", count);
	return halves.map(([first, second]) => {
		if (first < 6) {
			return 0;
		}

		return second < 6 ? 0.5 : 1;
	});
}

type Changed = {
	type: string;
	isMouse: boolean;
	input?: { value: string; checked: boolean };
	value: number | null;
};

/**
Records what onChange saw at call time: the event's type, whether it came from a mouse, the
input it targets with that input's state, and the value.
*/
function changes() {
	const calls: Changed[] = [];
	const onChange = vi.fn<OnChange>((event, value) => {
		const { target } = event;
		const { nativeEvent } = event as Partial<React.SyntheticEvent>;
		calls.push({
			type: event.type,
			isMouse: nativeEvent instanceof MouseEvent,
			...(target instanceof HTMLInputElement && {
				input: { value: target.value, checked: target.checked },
			}),
			value,
		});
	});
	return { calls, onChange };
}

type Active = { type: string; isMouse: boolean; value: number };

/**
Records what onChangeActive saw at call time.
*/
function previews() {
	const calls: Active[] = [];
	const onChangeActive = vi.fn<OnChangeActive>((event, value) => {
		calls.push({
			type: event.type,
			isMouse: event.nativeEvent instanceof MouseEvent,
			value,
		});
	});
	/**
	The values in order, a value repeated while the mouse stays on it counted once.
	*/
	const values = () =>
		calls
			.map((call) => call.value)
			.filter((value, index, all) => index === 0 || all[index - 1] !== value);
	return { calls, onChangeActive, values };
}

const fiveStars = [1, 2, 3, 4, 5].map((value) => `${value} out of 5 stars`);

describe("Rating: what it renders", () => {
	test('a radiogroup named "Rating" by default, with a radio per star named "N out of 5 stars" and one named "No rating"', () => {
		render(<Rating />);
		const group = stars();
		expect(within(group).getAllByRole("radio")).toHaveLength(6);
		for (const name of [...fiveStars, "No rating"]) {
			expect(radio(name, group)).toBeInTheDocument();
		}
	});

	test("aria-label names the stars", () => {
		render(<Rating aria-label="Rate the Clean Architecture template" />);
		expect(
			within(stars("Rate the Clean Architecture template")).getAllByRole(
				"radio",
			),
		).toHaveLength(6);
	});

	test("aria-labelledby names the stars after another element", () => {
		render(
			<>
				<span id="rate-question">How useful was the write-up?</span>
				<Rating aria-labelledby="rate-question" />
			</>,
		);
		expect(stars("How useful was the write-up?")).toBeInTheDocument();
	});

	test("getLabelText names each step, half steps too, and emptyLabelText names the radio for no rating", () => {
		const getLabelText = (value: number) =>
			`${value} star${value === 1 ? "" : "s"}`;
		render(
			<>
				<Rating
					aria-label="Whole"
					getLabelText={getLabelText}
					emptyLabelText="Not rated"
				/>
				<Rating aria-label="Half" precision={0.5} getLabelText={getLabelText} />
			</>,
		);
		for (const name of [
			"1 star",
			"2 stars",
			"3 stars",
			"4 stars",
			"5 stars",
			"Not rated",
		]) {
			expect(radio(name, stars("Whole"))).toBeInTheDocument();
		}

		expect(radio("2.5 stars", stars("Half"))).toBeInTheDocument();
	});

	test("max sets the number of stars", () => {
		render(<Rating max={10} size="sm" />);
		const group = stars();
		expect(within(group).getAllByRole("radio")).toHaveLength(11);
		for (let value = 1; value <= 10; value++) {
			expect(radio(`${value} out of 10 stars`, group)).toBeInTheDocument();
		}

		// The stars sit side by side, so the row is max times the star size.
		expect(box(group).width).toBe(180);
	});

	test("precision 0.5 makes a radio per half star", () => {
		render(<Rating precision={0.5} />);
		const group = stars();
		expect(within(group).getAllByRole("radio")).toHaveLength(11);
		for (let step = 1; step <= 10; step++) {
			expect(radio(`${step / 2} out of 5 stars`, group)).toBeInTheDocument();
		}
	});

	test("size: the stars are 18px (sm), 24px (md, the default) and 32px (lg)", () => {
		render(
			<>
				<Rating aria-label="Default" />
				<Rating aria-label="sm" size="sm" />
				<Rating aria-label="md" size="md" />
				<Rating aria-label="lg" size="lg" />
			</>,
		);
		// Five stars side by side.
		expect(box(stars("Default")).width).toBe(120);
		expect(box(stars("sm")).width).toBe(90);
		expect(box(stars("md")).width).toBe(120);
		expect(box(stars("lg")).width).toBe(160);
	});

	test("label shows beside the stars, outside the radiogroup", () => {
		render(<Rating defaultValue={4} label="Very useful" />);
		const text = screen.getByText("Very useful");
		const group = stars();
		expect(text).toBeVisible();
		expect(group).not.toContainElement(text);
		expect(box(text).left).toBeGreaterThanOrEqual(box(group).right);
		expectNear(middleOf(text), middleOf(group), "lined up with the stars");
	});

	test("the ref is the root span, which holds the stars and the label, and className, style and the other HTML attributes land on it", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<Rating
				ref={ref}
				defaultValue={3}
				label="Useful"
				className="score"
				style={{ marginLeft: 4 }}
				data-testid="score"
				title="Your score"
			/>,
		);
		const root = ref.current;
		expect(root).toBeInstanceOf(HTMLSpanElement);
		expect(root).toContainElement(stars());
		expect(root).toContainElement(screen.getByText("Useful"));
		expect(root).toHaveClass("score");
		expect(root).toHaveStyle({ marginLeft: "4px" });
		expect(root).toHaveAttribute("data-testid", "score");
		expect(root).toHaveAttribute("title", "Your score");
	});

	test("id is the root's, and the radio inputs' ids derive from it", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(<Rating ref={ref} id="template-rating" defaultValue={3} />);
		const root = ref.current;
		expect(root).toHaveAttribute("id", "template-rating");
		// The documented inputs: the reference's radios, a port's hidden inputs beside them.
		const ids = [...(root?.querySelectorAll("input") ?? [])].map(
			(input) => input.id,
		);
		expect(ids).toHaveLength(6);
		expect(new Set(ids).size).toBe(6);
		for (const id of ids) {
			expect(id).toMatch(/^template-rating-/v);
		}
	});
});

describe("Rating: value", () => {
	test('defaultValue checks its star, and with none (null, the default) "No rating" is checked', () => {
		render(
			<>
				<Rating aria-label="Rated" defaultValue={4} />
				<Rating aria-label="Unrated" />
				<Rating aria-label="Cleared" defaultValue={null} />
			</>,
		);
		expectOnlyChecked("4 out of 5 stars", stars("Rated"));
		expectOnlyChecked("No rating", stars("Unrated"));
		expectOnlyChecked("No rating", stars("Cleared"));
	});

	test("defaultValue only sets the start: a press moves the rating, and a new defaultValue doesn't", async () => {
		const { rerender } = render(<Rating defaultValue={2} />);
		await pressStar(stars(), 4);
		await expect.element(radio("4 out of 5 stars")).toBeChecked();
		rerender(<Rating defaultValue={1} />);
		await pause(100);
		expectOnlyChecked("4 out of 5 stars");
	});

	test("value controls it: a press calls onChange, and only a new value moves the rating; null is no rating", async () => {
		const onChange = vi.fn<OnChange>();
		const { rerender } = render(<Rating value={2} onChange={onChange} />);
		await pressStar(stars(), 4);
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange.mock.calls[0]?.[1]).toBe(4);
		await pause(100);
		expectOnlyChecked("2 out of 5 stars");
		rerender(<Rating value={4} onChange={onChange} />);
		expectOnlyChecked("4 out of 5 stars");
		rerender(<Rating value={null} onChange={onChange} />);
		expectOnlyChecked("No rating");
	});

	test("the stars fill in color-blue up to the rating: whole stars, half a star at precision 0.5, none without a rating", async () => {
		render(
			<>
				<Rating aria-label="Four" defaultValue={4} />
				<Rating aria-label="Half" precision={0.5} defaultValue={2.5} />
				<Rating aria-label="None" />
			</>,
		);
		await expect
			.poll(async () => fills(stars("Four")))
			.toEqual([1, 1, 1, 1, 0]);
		await expect
			.poll(async () => fills(stars("Half")))
			.toEqual([1, 1, 0.5, 0, 0]);
		await expect
			.poll(async () => fills(stars("None")))
			.toEqual([0, 0, 0, 0, 0]);
	});

	test("an empty star is a dg-edge outline", async () => {
		render(<Rating defaultValue={2} />);
		const outlines = await pixelsIn(stars(), "--dg-edge", 5);
		for (const [index, [first, second]] of outlines.entries()) {
			const isEmpty = index >= 2;
			expect(first > 6 && second > 6, `star ${index + 1}`).toBe(isEmpty);
		}
	});
});

describe("Rating: keyboard", () => {
	test("Tab reaches the current rating, and the next Tab leaves the stars", async () => {
		render(
			<Around>
				<Rating defaultValue={4} />
			</Around>,
		);
		await tabFromBefore();
		await expect.element(radio("4 out of 5 stars")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(radio("4 out of 5 stars")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
	});

	test('Tab reaches "No rating" when there is none', async () => {
		render(
			<Around>
				<Rating />
			</Around>,
		);
		await tabFromBefore();
		await expect.element(radio("No rating")).toHaveFocus();
	});

	test('the arrows move the rating one step and wrap through "No rating"', async () => {
		render(
			<Around>
				<Rating defaultValue={4} />
			</Around>,
		);
		await tabFromBefore();
		for (const [key, name] of [
			["{ArrowRight}", "5 out of 5 stars"],
			["{ArrowRight}", "No rating"],
			["{ArrowRight}", "1 out of 5 stars"],
			["{ArrowLeft}", "No rating"],
			["{ArrowLeft}", "5 out of 5 stars"],
			["{ArrowUp}", "4 out of 5 stars"],
			["{ArrowDown}", "5 out of 5 stars"],
		] as const) {
			// eslint-disable-next-line no-await-in-loop -- each key starts from the last one's rating
			await userEvent.keyboard(key);
			// eslint-disable-next-line no-await-in-loop
			await expect.element(radio(name), { message: key }).toHaveFocus();
			expectOnlyChecked(name, stars(), key);
		}
	});

	test('each arrow calls onChange with the change event on the chosen input and the new rating, null on "No rating"', async () => {
		const { calls, onChange } = changes();
		render(
			<Around>
				<Rating defaultValue={4} onChange={onChange} />
			</Around>,
		);
		await tabFromBefore();
		await userEvent.keyboard("{ArrowRight}");
		await userEvent.keyboard("{ArrowRight}");
		await userEvent.keyboard("{ArrowRight}");
		await expect.poll(() => calls.length).toBe(3);
		expect(
			calls.map(({ type, input, value }) => ({ type, input, value })),
		).toEqual([
			{ type: "change", input: { value: "5", checked: true }, value: 5 },
			{ type: "change", input: { value: "", checked: true }, value: null },
			{ type: "change", input: { value: "1", checked: true }, value: 1 },
		]);
	});

	test("at precision 0.5 the arrows move half a star", async () => {
		render(
			<Around>
				<Rating precision={0.5} defaultValue={2.5} />
			</Around>,
		);
		await tabFromBefore();
		await expect.element(radio("2.5 out of 5 stars")).toHaveFocus();
		await userEvent.keyboard("{ArrowRight}");
		await expect.element(radio("3 out of 5 stars")).toBeChecked();
		await userEvent.keyboard("{ArrowLeft}");
		await expect.element(radio("2.5 out of 5 stars")).toBeChecked();
		await userEvent.keyboard("{ArrowLeft}");
		await expect.element(radio("2 out of 5 stars")).toBeChecked();
	});
});

describe("Rating: mouse", () => {
	test("a press on a star rates it, and onChange gets the change event on its input and the value", async () => {
		const { calls, onChange } = changes();
		render(<Rating defaultValue={2} onChange={onChange} />);
		await pressStar(stars(), 3);
		await expect.element(radio("3 out of 5 stars")).toBeChecked();
		expectOnlyChecked("3 out of 5 stars");
		expect(
			calls.map(({ type, input, value }) => ({ type, input, value })),
		).toEqual([
			{ type: "change", input: { value: "3", checked: true }, value: 3 },
		]);
	});

	// Clearing changes no input, so the event is the press itself.
	test('pressing the current star clears the rating: onChange gets the press and null, and "No rating" is checked', async () => {
		const { calls, onChange } = changes();
		render(<Rating defaultValue={3} onChange={onChange} />);
		await pressStar(stars(), 3);
		await expect.element(radio("No rating")).toBeChecked();
		expect(calls).toEqual([
			expect.objectContaining({ isMouse: true, value: null }),
		]);
		await parkPointer();
		await expect.poll(async () => fills(stars())).toEqual([0, 0, 0, 0, 0]);
	});

	test("hovering previews: onChangeActive gets the value under the mouse, and -1 when it leaves", async () => {
		const { calls, onChangeActive, values } = previews();
		render(<Rating defaultValue={1} onChangeActive={onChangeActive} />);
		await hoverStar(stars(), 2);
		await hoverStar(stars(), 4);
		await parkPointer();
		await expect.poll(values).toEqual([2, 4, -1]);
		for (const call of calls) {
			expect(call.isMouse).toBe(true);
		}

		expect(calls.at(0)?.type).toMatch(/move|over|enter/v);
		expect(calls.at(-1)?.type).toMatch(/leave|out/v);
	});

	test("while the mouse hovers, the stars fill up to the one under it, and leaving shows the rating again", async () => {
		render(<Rating defaultValue={2} />);
		await hoverStar(stars(), 4);
		await expect.poll(async () => fills(stars())).toEqual([1, 1, 1, 1, 0]);
		await parkPointer();
		await expect.poll(async () => fills(stars())).toEqual([1, 1, 0, 0, 0]);
	});

	test("at precision 0.5 the first half of a star previews and rates the half, the second half the whole star", async () => {
		const active = previews();
		const { calls, onChange } = changes();
		render(
			<Rating
				precision={0.5}
				onChange={onChange}
				onChangeActive={active.onChangeActive}
			/>,
		);
		await hoverStar(stars(), 3, "first half");
		await expect.poll(active.values).toEqual([2.5]);
		await expect.poll(async () => fills(stars())).toEqual([1, 1, 0.5, 0, 0]);
		await hoverStar(stars(), 3, "second half");
		await expect.poll(active.values).toEqual([2.5, 3]);
		await expect.poll(async () => fills(stars())).toEqual([1, 1, 1, 0, 0]);
		await pressStar(stars(), 3, { part: "first half" });
		await expect.element(radio("2.5 out of 5 stars")).toBeChecked();
		expect(calls.map((call) => call.value)).toEqual([2.5]);
	});

	test("a label fed from onChangeActive describes the value the mouse previews, as the preview's example does", async () => {
		const meanings: Record<number, string> = {
			1: "Not useful",
			2: "Somewhat useful",
			3: "Useful",
			4: "Very useful",
			5: "Saved me a weekend",
		};
		function Feedback() {
			const [value, setValue] = React.useState<number | null>(3);
			const [hover, setHover] = React.useState(-1);
			const shown = hover === -1 ? value : hover;
			return (
				<Rating
					value={value}
					label={
						shown === null || shown === 0 ? "Not rated yet" : meanings[shown]
					}
					onChange={(_event, next) => {
						setValue(next);
					}}
					onChangeActive={(_event, next) => {
						setHover(next);
					}}
				/>
			);
		}

		render(<Feedback />);
		expect(screen.getByText("Useful")).toBeVisible();
		await hoverStar(stars(), 4);
		await expect.element(screen.getByText("Very useful")).toBeVisible();
		await parkPointer();
		await expect.element(screen.getByText("Useful")).toBeVisible();
	});
});

describe("Rating: readOnly", () => {
	test("readOnly is one image named by aria-label and the value, with no radios", () => {
		render(
			<Rating
				readOnly
				precision={0.5}
				value={4.5}
				label="4.5"
				aria-label="VSebCode"
			/>,
		);
		const image = screen.getByRole("img", {
			name: "VSebCode: 4.5 out of 5 stars",
		});
		expect(image).toBeInTheDocument();
		expect(screen.queryAllByRole("radio")).toHaveLength(0);
		expect(screen.queryByRole("radiogroup")).toBeNull();
		expect(screen.getByText("4.5")).toBeVisible();
	});

	test("without aria-label the image is named by the value alone, and getLabelText and emptyLabelText name it too", () => {
		render(
			<>
				<Rating readOnly value={4} />
				<Rating readOnly value={null} />
				<Rating readOnly value={null} emptyLabelText="Not rated" />
				<Rating
					readOnly
					value={3}
					aria-label="Template"
					getLabelText={(value) => `${value} stars`}
				/>
			</>,
		);
		for (const name of [
			"4 out of 5 stars",
			"No rating",
			"Not rated",
			"Template: 3 stars",
		]) {
			expect(screen.getByRole("img", { name })).toBeInTheDocument();
		}
	});

	test("aria-labelledby names interactive stars only: the image keeps the value as its name", () => {
		render(
			<>
				<span id="score-title">Average score</span>
				<Rating readOnly value={4} aria-labelledby="score-title" />
			</>,
		);
		expect(
			screen.getByRole("img", { name: "4 out of 5 stars" }),
		).toBeInTheDocument();
	});

	test("readOnly draws half stars", async () => {
		render(<Rating readOnly precision={0.5} value={3.5} />);
		const image = screen.getByRole("img", { name: "3.5 out of 5 stars" });
		await expect.poll(async () => fills(image)).toEqual([1, 1, 1, 0.5, 0]);
	});

	test("readOnly: Tab passes it by, and the mouse neither previews nor rates", async () => {
		const onChange = vi.fn<OnChange>();
		const onChangeActive = vi.fn<OnChangeActive>();
		render(
			<Around>
				<Rating
					readOnly
					value={2}
					aria-label="Score"
					onChange={onChange}
					onChangeActive={onChangeActive}
				/>
			</Around>,
		);
		await tabFromBefore();
		await expect.element(button("After")).toHaveFocus();
		const image = screen.getByRole("img", { name: "Score: 2 out of 5 stars" });
		const before = await screenshotPixels(image);
		await hoverStar(image, 4);
		await pause(300);
		expect(changedPixels(before, await screenshotPixels(image))).toBe(0);
		await pressStar(image, 4);
		await pause(100);
		expect(onChange).not.toHaveBeenCalled();
		expect(onChangeActive).not.toHaveBeenCalled();
		expect(image).toHaveAccessibleName("Score: 2 out of 5 stars");
	});
});

describe("Rating: disabled", () => {
	test("disabled: the stars are disabled and dimmed, and Tab passes them by", async () => {
		render(
			<Around>
				<Rating disabled defaultValue={2} />
			</Around>,
		);
		const group = stars();
		const radios = within(group).getAllByRole("radio");
		expect(radios.length).toBeGreaterThanOrEqual(5);
		for (const element of radios) {
			expect(isDisabled(element)).toBe(true);
		}

		expect(drawnOpacity(group)).toBeLessThan(1);
		await tabFromBefore();
		await expect.element(button("After")).toHaveFocus();
	});

	test("disabled: a press rates nothing, and hovering previews nothing", async () => {
		const onChange = vi.fn<OnChange>();
		const onChangeActive = vi.fn<OnChangeActive>();
		render(
			<Rating
				disabled
				defaultValue={2}
				onChange={onChange}
				onChangeActive={onChangeActive}
			/>,
		);
		const group = stars();
		const before = await screenshotPixels(group);
		await hoverStar(group, 4);
		await pause(300);
		expect(changedPixels(before, await screenshotPixels(group))).toBe(0);
		// Playwright waits for an aria-disabled target to enable; force the press.
		await pressStar(group, 4, { force: true });
		await pause(100);
		expect(onChange).not.toHaveBeenCalled();
		expect(onChangeActive).not.toHaveBeenCalled();
		expectOnlyChecked("2 out of 5 stars", group);
	});
});

describe("Rating: forms", () => {
	// With no rating the form gets the empty value of the checked "No rating" radio, as in the
	// reference; the README doesn't say.
	test("name is every radio input's; the form gets the rating, and an empty value without one", async () => {
		render(
			<form aria-label="Feedback">
				<Rating name="usefulness" defaultValue={4} />
			</form>,
		);
		const form = formNamed("Feedback");
		expect(new FormData(form).get("usefulness")).toBe("4");
		for (const input of form.querySelectorAll("input")) {
			expect(input.name).toBe("usefulness");
		}

		await pressStar(stars(), 2);
		await expect.poll(() => new FormData(form).get("usefulness")).toBe("2");
		await pressStar(stars(), 2);
		await expect.poll(() => new FormData(form).get("usefulness")).toBe("");
	});

	test("without name each rating gets a name of its own, and the form gets each value", async () => {
		render(
			<form aria-label="Feedback">
				<Rating aria-label="Clarity" defaultValue={4} />
				<Rating aria-label="Depth" defaultValue={2} />
			</form>,
		);
		const form = formNamed("Feedback");
		const entries = () => [...new FormData(form)];
		expect(entries().map(([, value]) => value)).toEqual(["4", "2"]);
		const [clarity, depth] = entries().map(([key]) => key);
		expect(clarity).not.toBe("");
		expect(depth).not.toBe(clarity);
		await pressStar(stars("Depth"), 5);
		await expect
			.poll(() => entries().map(([, value]) => value))
			.toEqual(["4", "5"]);
		expectOnlyChecked("4 out of 5 stars", stars("Clarity"));
	});
});
