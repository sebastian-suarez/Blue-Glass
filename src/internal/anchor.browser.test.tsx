/*
Proof: a Base UI Popover positioned through the adapter lands where the reference's
computePosition puts it, within 1px. The reference math is imported from the design system
itself, so this compares against the source, not a copy.
*/
import { Popover } from "@base-ui/react/popover";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { computePosition } from "../../design-system/shared/position.js";
import {
	type AnchorEl,
	anchorWidthStyle,
	type Placement,
	positionerVariables,
	toBaseAnchor,
	toPlacement,
	toPositionerProps,
} from "./anchor.js";

const placements: Placement[] = [
	"top",
	"top-start",
	"top-end",
	"bottom",
	"bottom-start",
	"bottom-end",
	"left",
	"left-start",
	"left-end",
	"right",
	"right-start",
	"right-end",
];

type Box = { left: number; top: number; width: number; height: number };

type Case = {
	id: string;
	anchor: AnchorEl;
	placement: Placement;
	offset?: number;
	/**
	The popup's size; omitted, it sizes to its content.
	*/
	popup?: { width: number; height: number };
	matchWidth?: boolean;
};

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0).toReversed()) {
		cleanup();
	}
});

beforeAll(async () => {
	await page.viewport(1280, 800);
});

/**
A fixed element to anchor to, at a known place in the viewport.
*/
function placeAnchor({ left, top, width, height }: Box): HTMLElement {
	const anchor = document.createElement("button");
	anchor.textContent = "Anchor";
	Object.assign(anchor.style, {
		position: "fixed",
		margin: "0",
		left: `${left}px`,
		top: `${top}px`,
		width: `${width}px`,
		height: `${height}px`,
	});
	document.body.append(anchor);
	cleanups.push(() => {
		anchor.remove();
	});
	return anchor;
}

function resolve(
	anchor: AnchorEl,
): Element | { getBoundingClientRect(): DOMRect } {
	const resolved = typeof anchor === "function" ? anchor() : anchor;
	if (!resolved) {
		throw new Error("Every case has an anchor");
	}

	return resolved;
}

function popupOf(id: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(
		`[data-popup="${CSS.escape(id)}"]`,
	);
}

function positionerOf(id: string): HTMLElement | null {
	return document.querySelector<HTMLElement>(`[data-case="${CSS.escape(id)}"]`);
}

/**
Opens one Base UI Popover per case, each positioned only through the adapter, and waits for
all of them to settle.
*/
async function open(cases: Case[]): Promise<Map<string, DOMRect>> {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	cleanups.push(() => {
		root.unmount();
		container.remove();
	});
	root.render(
		<>
			{cases.map(({ id, anchor, placement, offset, popup, matchWidth }) => (
				<Popover.Root key={id} open>
					<Popover.Portal>
						<Popover.Positioner
							data-case={id}
							anchor={toBaseAnchor(anchor)}
							style={positionerVariables}
							{...toPositionerProps({ placement, offset })}
						>
							<Popover.Popup
								data-popup={id}
								initialFocus={false}
								style={{
									boxSizing: "border-box",
									padding: 0,
									...(popup ?? { width: "max-content" }),
									...(matchWidth && anchorWidthStyle),
								}}
							>
								{id}
							</Popover.Popup>
						</Popover.Positioner>
					</Popover.Portal>
				</Popover.Root>
			))}
		</>,
	);

	const measure = () =>
		new Map(
			cases.map(({ id }) => {
				const popup = popupOf(id);
				const positioner = positionerOf(id);
				// Base UI holds the positioner at opacity 0 until it has a position.
				if (!popup || !positioner || positioner.style.opacity === "0") {
					throw new Error(`${id} isn't positioned yet`);
				}

				return [id, popup.getBoundingClientRect()];
			}),
		);
	// Positioned, and still in the same place a few frames later.
	return vi.waitFor(
		async () => {
			const first = measure();
			await new Promise((done) => {
				requestAnimationFrame(() => {
					requestAnimationFrame(done);
				});
			});
			const second = measure();
			expect(second).toEqual(first);
			return second;
		},
		{ interval: 20, timeout: 3000 },
	);
}

/**
What the positioner says it landed on, as a placement.
*/
function landedOn(id: string): Placement | undefined {
	const positioner = positionerOf(id);
	return toPlacement(
		positioner?.dataset.side ?? "",
		positioner?.dataset.align ?? "",
	);
}

/**
Compares each popup with the reference math for the same anchor rect and popup size.
*/
async function expectReferencePositions(cases: Case[]): Promise<void> {
	const rects = await open(cases);
	for (const { id, anchor, placement, offset, matchWidth } of cases) {
		const rect = rects.get(id);
		if (!rect) {
			throw new Error(`${id} wasn't measured`);
		}

		const expected = computePosition(
			resolve(anchor).getBoundingClientRect(),
			{ width: rect.width, height: rect.height },
			{ placement, offset, matchWidth },
		);
		expect
			.soft(Math.abs(rect.left - expected.x), `${id}: x`)
			.toBeLessThanOrEqual(1);
		expect
			.soft(Math.abs(rect.top - expected.y), `${id}: y`)
			.toBeLessThanOrEqual(1);
		expect.soft(landedOn(id), `${id}: placement`).toBe(expected.placement);
	}
}

const middle = { left: 560, top: 380, width: 160, height: 40 };
const card = { width: 180, height: 90 };

describe("every placement, with room on every side", () => {
	for (const offset of [0, 8, 12]) {
		test(`offset ${offset}`, async () => {
			const anchor = placeAnchor(middle);
			await expectReferencePositions(
				placements.map((placement) => ({
					id: `${placement}-${offset}`,
					anchor,
					placement,
					offset,
					popup: card,
				})),
			);
		});
	}
});

describe("collisions", () => {
	test("flips to the opposite side when the preferred one is too small", async () => {
		await expectReferencePositions([
			{
				id: "bottom-start-at-the-bottom",
				anchor: placeAnchor({ left: 300, top: 740, width: 120, height: 40 }),
				placement: "bottom-start",
				popup: card,
			},
			{
				id: "top-end-at-the-top",
				anchor: placeAnchor({ left: 700, top: 20, width: 120, height: 40 }),
				placement: "top-end",
				popup: card,
			},
			{
				id: "right-at-the-right",
				anchor: placeAnchor({ left: 1180, top: 300, width: 60, height: 40 }),
				placement: "right",
				popup: card,
			},
			{
				id: "left-end-at-the-left",
				anchor: placeAnchor({ left: 20, top: 500, width: 60, height: 40 }),
				placement: "left-end",
				popup: card,
			},
		]);
	});

	test("shifts along the alignment axis to stay 8px inside the viewport", async () => {
		await expectReferencePositions([
			{
				id: "bottom-start-at-the-right",
				anchor: placeAnchor({ left: 1200, top: 200, width: 60, height: 40 }),
				placement: "bottom-start",
				popup: card,
			},
			{
				id: "bottom-end-at-the-left",
				anchor: placeAnchor({ left: 10, top: 200, width: 60, height: 40 }),
				placement: "bottom-end",
				popup: card,
			},
			{
				id: "left-start-at-the-bottom",
				anchor: placeAnchor({ left: 600, top: 760, width: 60, height: 30 }),
				placement: "left-start",
				popup: card,
			},
		]);
	});

	test("keeps the preferred side when neither side has room and the other has no more", async () => {
		await expectReferencePositions([
			{
				id: "too-tall",
				anchor: placeAnchor({ left: 560, top: 380, width: 160, height: 40 }),
				placement: "bottom",
				popup: { width: 180, height: 500 },
			},
		]);
	});

	test("Base UI flips a pixel earlier than the reference: the documented difference", async () => {
		// Exactly the room the popup needs below: the reference stays, Base UI flips...
		const exact = placeAnchor({ left: 300, top: 654, width: 120, height: 40 });
		// ...and with one more pixel both stay.
		const spare = placeAnchor({ left: 700, top: 653, width: 120, height: 40 });
		await open([
			{ id: "exact", anchor: exact, placement: "bottom", popup: card },
			{ id: "spare", anchor: spare, placement: "bottom", popup: card },
		]);
		const reference = (anchor: HTMLElement) =>
			computePosition(anchor.getBoundingClientRect(), card, {
				placement: "bottom",
			}).placement;
		expect(reference(exact)).toBe("bottom");
		expect(landedOn("exact")).toBe("top");
		expect(reference(spare)).toBe("bottom");
		expect(landedOn("spare")).toBe("bottom");
	});
});

describe("anchors", () => {
	test("a virtual element, a function and an element all land where the reference puts them", async () => {
		const point = new DOMRect(400, 300, 0, 0);
		const element = placeAnchor({ left: 820, top: 520, width: 90, height: 32 });
		await expectReferencePositions([
			{
				id: "virtual-bottom-start",
				anchor: { getBoundingClientRect: () => point },
				placement: "bottom-start",
				popup: card,
			},
			{
				id: "virtual-right",
				anchor: { getBoundingClientRect: () => point },
				placement: "right",
				popup: card,
			},
			{
				id: "function-top",
				anchor: () => element,
				placement: "top",
				popup: card,
			},
		]);
	});

	test("matchWidth makes the popup at least as wide as the anchor", async () => {
		const wide = { left: 400, top: 200, width: 300, height: 40 };
		await expectReferencePositions([
			{
				id: "bottom-start-match",
				anchor: placeAnchor(wide),
				placement: "bottom-start",
				matchWidth: true,
			},
			{
				id: "bottom-match",
				anchor: placeAnchor({ ...wide, top: 500 }),
				placement: "bottom",
				matchWidth: true,
			},
		]);
		for (const id of ["bottom-start-match", "bottom-match"]) {
			expect(popupOf(id)?.getBoundingClientRect().width).toBe(300);
		}
	});

	test("the reference's variables read Base UI's", async () => {
		await open([
			{
				id: "variables",
				anchor: placeAnchor(middle),
				placement: "bottom-start",
				popup: card,
			},
		]);
		const popup = popupOf("variables");
		if (!popup) {
			throw new Error("The popup isn't open");
		}

		const style = getComputedStyle(popup);
		expect(style.getPropertyValue("--gl-transform-origin")).toBe(
			style.getPropertyValue("--transform-origin"),
		);
		expect(style.getPropertyValue("--gl-available-height")).toMatch(
			/^\d+(?:\.\d+)?px$/u,
		);
	});
});
