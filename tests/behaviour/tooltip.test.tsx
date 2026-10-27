import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	Avatar,
	Button,
	Dialog,
	DialogActions,
	DialogTitle,
	Icon,
	Tooltip,
	type DialogProps,
	type Placement,
	type TooltipProps,
} from "#ui";

const email = "contact@sebastiansuarez.dev";

async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; left: 0; top: 300px; width: 40px; height: 40px";
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

type HintedProps = Omit<TooltipProps, "title" | "children"> & {
	readonly title?: React.ReactNode;
	readonly ref?: React.Ref<HTMLElement>;
};

function Hinted({ title = email, ...props }: HintedProps) {
	return (
		<>
			<button type="button">Before</button>
			<div style={{ display: "grid", placeItems: "center", height: 360 }}>
				<Tooltip title={title} {...props}>
					<Button variant="primary">Email me</Button>
				</Tooltip>
			</div>
			<button type="button">After</button>
			<Elsewhere />
		</>
	);
}

function Elsewhere() {
	return (
		<p style={{ position: "fixed", left: 0, bottom: 0, margin: 0, padding: 8 }}>
			Elsewhere
		</p>
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function trigger(): HTMLElement {
	return button("Email me");
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function isShown(element: Element): boolean {
	const { width, height } = box(element);
	return (
		element.isConnected &&
		width > 0 &&
		height > 0 &&
		element.checkVisibility({ visibilityProperty: true })
	);
}

function shownWith(text: string): HTMLElement[] {
	return screen.queryAllByText(text).filter((element) => isShown(element));
}

async function expectOpen(text = email, timeout = 1500): Promise<void> {
	await expect.poll(() => shownWith(text).length, { timeout }).toBe(1);
}

async function expectClosed(text = email, timeout = 1500): Promise<void> {
	await expect.poll(() => shownWith(text).length, { timeout }).toBe(0);
}

async function pause(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

const handOff = 300;

async function coldStart(): Promise<void> {
	await pause(handOff * 2);
}

type AnyEvent = React.SyntheticEvent | Event | null | undefined;

function nativeOf(event: AnyEvent): Event | undefined {
	return event instanceof Event ? event : (event?.nativeEvent ?? undefined);
}

type OnOpen = NonNullable<TooltipProps["onOpen"]>;
type OnClose = NonNullable<TooltipProps["onClose"]>;

function inputPoint(element: Element): { x: number; y: number } {
	const frame = window.frameElement;
	const offset = frame ? box(frame) : { left: 0, top: 0 };
	const scale = frame ? new DOMMatrix(getComputedStyle(frame).transform).a : 1;
	const { left, top, width, height } = box(element);
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const scaledX = scale * (left + halfWidth);
	const scaledY = scale * (top + halfHeight);
	return {
		x: offset.left + scaledX,
		y: offset.top + scaledY,
	};
}

async function touchStart(element: Element): Promise<void> {
	await cdp().send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [inputPoint(element)],
	});
}

async function touchEnd(): Promise<void> {
	await cdp().send("Input.dispatchTouchEvent", {
		type: "touchEnd",
		touchPoints: [],
	});
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

function expectPlaced(
	tip: Element,
	anchor: Element,
	placement: Placement,
	gap: number,
) {
	const [side, align = "center"] = placement.split("-", 2);
	const a = box(anchor);
	const t = box(tip);
	switch (side) {
		case "top": {
			expectNear(t.bottom, a.top - gap, "bottom edge");
			break;
		}

		case "bottom": {
			expectNear(t.top, a.bottom + gap, "top edge");
			break;
		}

		case "left": {
			expectNear(t.right, a.left - gap, "right edge");
			break;
		}

		default: {
			expectNear(t.left, a.right + gap, "left edge");
		}
	}

	const isVertical = side === "top" || side === "bottom";
	if (align === "start") {
		expectNear(
			isVertical ? t.left : t.top,
			isVertical ? a.left : a.top,
			"start edge",
		);
	} else if (align === "end") {
		expectNear(
			isVertical ? t.right : t.bottom,
			isVertical ? a.right : a.bottom,
			"end edge",
		);
	} else if (isVertical) {
		const tipHalf = t.width / 2;
		const anchorHalf = a.width / 2;
		expectNear(t.left + tipHalf, a.left + anchorHalf, "centre");
	} else {
		const tipHalf = t.height / 2;
		const anchorHalf = a.height / 2;
		expectNear(t.top + tipHalf, a.top + anchorHalf, "centre");
	}
}

const placedAt = { left: 157, top: 420 };

function Placed({
	title = "Copy email",
	at = placedAt,
	...props
}: Omit<TooltipProps, "title" | "children" | "open"> & {
	readonly title?: React.ReactNode;
	readonly at?: { left: number; top: number };
}) {
	return (
		<Tooltip open title={title} {...props}>
			<Button
				style={{
					position: "fixed",
					left: at.left,
					top: at.top,
					width: 100,
					margin: 0,
				}}
			>
				Email me
			</Button>
		</Tooltip>
	);
}

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

describe("Tooltip: what it says and to whom", () => {
	test("it describes its child: a role=tooltip surface with the title, the child's aria-describedby while open", async () => {
		const { rerender } = render(<Hinted open />);
		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveTextContent(email);
		await expectOpen();
		expect(trigger()).toHaveAccessibleDescription(email);
		rerender(<Hinted open={false} />);
		await expectClosed();
		expect(trigger()).toHaveAccessibleDescription("");
	});

	test("while closed, the child has no description from the tooltip", () => {
		render(<Hinted />);
		expect(trigger()).toHaveAccessibleDescription("");
		expect(screen.queryByRole("tooltip")).toBeNull();
	});

	test("with describeChild={false} the title is the child's name, before and while it shows, and not a description too", async () => {
		render(
			<>
				<Tooltip title="Copy email" describeChild={false} enterDelay={0}>
					<Button>
						<Icon name="copy" />
					</Button>
				</Tooltip>
				<Elsewhere />
			</>,
		);
		const copy = button("Copy email");
		expect(shownWith("Copy email")).toHaveLength(0);
		await userEvent.hover(copy);
		await expectOpen("Copy email");
		expect(copy).toHaveAccessibleName("Copy email");
		expect(copy).toHaveAccessibleDescription("");
	});

	test.each(["", null])(
		"an empty title (%j) shows no tooltip, even when open",
		(empty) => {
			render(<Hinted open title={empty} />);
			expect(screen.queryByRole("tooltip")).toBeNull();
			expect(trigger()).toHaveAccessibleDescription("");
		},
	);

	test("a long title wraps at 280px", async () => {
		const long =
			"A DirectInput proxy inside the Wine bottle, a Rust daemon on the host. Long titles wrap at 280px.";
		render(
			<Placed
				title={long}
				placement="bottom-start"
				at={{ left: 20, top: 100 }}
			/>,
		);
		const tooltip = await screen.findByRole("tooltip");
		await vi.waitFor(() => {
			expect(box(tooltip).width).toBeLessThanOrEqual(280.5);
			expect(box(tooltip).width).toBeGreaterThan(200);
			expect(box(tooltip).height).toBeGreaterThan(40);
		});
	});
});

describe("Tooltip: hover", () => {
	test("hover shows it after enterDelay with onOpen, and the pointer leaving hides it with onClose", async () => {
		await coldStart();
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		render(<Hinted enterDelay={300} onOpen={onOpen} onClose={onClose} />);
		const start = performance.now();
		await userEvent.hover(trigger());
		await expectOpen(email, 2000);
		expect(performance.now() - start).toBeGreaterThanOrEqual(250);
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(nativeOf(onOpen.mock.calls[0]?.[0])).toBeInstanceOf(MouseEvent);
		await userEvent.hover(screen.getByText("Elsewhere"));
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(nativeOf(onClose.mock.calls[0]?.[0])).toBeInstanceOf(MouseEvent);
	});

	test("enterDelay is 500ms by default", async () => {
		await coldStart();
		render(<Hinted />);
		const start = performance.now();
		await userEvent.hover(trigger());
		await expectOpen(email, 2500);
		expect(performance.now() - start).toBeGreaterThanOrEqual(450);
	});

	test("leaveDelay keeps it after the pointer leaves, then hides it", async () => {
		render(<Hinted enterDelay={0} leaveDelay={600} />);
		await userEvent.hover(trigger());
		await expectOpen();
		const left = performance.now();
		await userEvent.hover(screen.getByText("Elsewhere"));
		await expectClosed(email, 3000);
		expect(performance.now() - left).toBeGreaterThanOrEqual(500);
	});

	test("the pointer can cross the gap onto the tooltip without it closing, and leaving the tooltip closes it", async () => {
		render(<Hinted enterDelay={0} />);
		await userEvent.hover(trigger());
		await expectOpen();
		await userEvent.hover(trigger(), {
			position: { x: box(trigger()).width / 2, y: -4 },
			force: true,
		});
		await userEvent.hover(screen.getByRole("tooltip"));
		await pause(400);
		expect(shownWith(email)).toHaveLength(1);
		await userEvent.hover(screen.getByText("Elsewhere"));
		await expectClosed();
	});

	test("with disableInteractive it closes as the pointer leaves the child, even onto the tooltip", async () => {
		render(<Hinted disableInteractive enterDelay={0} />);
		await userEvent.hover(trigger());
		await expectOpen();
		await userEvent.hover(shownWith(email)[0], { force: true });
		await expectClosed();
	});

	test("disableHoverListener: hover doesn't show it, keyboard focus still does", async () => {
		await coldStart();
		render(<Hinted disableHoverListener enterDelay={100} />);
		await userEvent.hover(trigger());
		await pause(500);
		expect(shownWith(email)).toHaveLength(0);
		button("Before").focus();
		await userEvent.tab();
		await expectOpen();
	});

	test("a press hides it, and it stays hidden while the pointer stays, until it leaves and comes back", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Hinted enterDelay={0} onClose={onClose} />);
		await userEvent.hover(trigger());
		await expectOpen();
		await userEvent.click(trigger());
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(nativeOf(onClose.mock.calls[0]?.[0])).toBeInstanceOf(MouseEvent);
		await userEvent.hover(trigger(), { position: { x: 6, y: 6 } });
		await pause(300);
		expect(shownWith(email)).toHaveLength(0);
		await userEvent.hover(screen.getByText("Elsewhere"));
		await userEvent.hover(trigger());
		await expectOpen();
	});

	test("a click before enterDelay ends keeps it hidden while the pointer stays", async () => {
		await coldStart();
		render(<Hinted enterDelay={200} />);
		await userEvent.click(trigger());
		await pause(700);
		expect(shownWith(email)).toHaveLength(0);
	});

	test("an Avatar child shows its name on hover", async () => {
		render(
			<>
				<Tooltip title="PayPal" describeChild={false} enterDelay={0}>
					<Avatar alt="PayPal" />
				</Tooltip>
				<Elsewhere />
			</>,
		);
		await userEvent.hover(screen.getByRole("img", { name: "PayPal" }));
		await expectOpen("PayPal");
	});

	test("a disabled child wrapped in a span still shows it on hover", async () => {
		render(
			<>
				<Tooltip title="Waiting for Codex review" enterDelay={0}>
					<span style={{ display: "inline-flex" }}>
						<Button disabled variant="primary">
							Merge
						</Button>
					</span>
				</Tooltip>
				<Elsewhere />
			</>,
		);
		await userEvent.hover(button("Merge"));
		await expectOpen("Waiting for Codex review");
	});
});

describe("Tooltip: keyboard", () => {
	test("Tab to the child shows it at once with onOpen, and Tab away hides it with onClose", async () => {
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		render(<Hinted enterDelay={5000} onOpen={onOpen} onClose={onClose} />);
		button("Before").focus();
		await userEvent.tab();
		expect(trigger()).toHaveFocus();
		await expectOpen();
		expect(trigger()).toHaveAccessibleDescription(email);
		expect(onOpen).toHaveBeenCalledTimes(1);
		expect(nativeOf(onOpen.mock.calls[0]?.[0])).toBeInstanceOf(FocusEvent);
		await userEvent.tab();
		expect(button("After")).toHaveFocus();
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(nativeOf(onClose.mock.calls[0]?.[0])).toBeInstanceOf(FocusEvent);
	});

	test("Escape hides it, with onClose and the Escape KeyboardEvent", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Hinted onClose={onClose} />);
		button("Before").focus();
		await userEvent.tab();
		await expectOpen();
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		const event = nativeOf(onClose.mock.calls[0]?.[0]);
		expect(event).toBeInstanceOf(KeyboardEvent);
		expect((event as KeyboardEvent).key).toBe("Escape");
	});

	test("a mouse click doesn't show it: focus from a press isn't keyboard focus", async () => {
		render(<Hinted disableHoverListener enterDelay={100} />);
		await userEvent.click(trigger());
		expect(trigger()).toHaveFocus();
		await pause(400);
		expect(shownWith(email)).toHaveLength(0);
	});

	test("disableFocusListener: keyboard focus doesn't show it, hover still does", async () => {
		render(<Hinted disableFocusListener enterDelay={0} />);
		button("Before").focus();
		await userEvent.tab();
		expect(trigger()).toHaveFocus();
		await pause(400);
		expect(shownWith(email)).toHaveLength(0);
		await userEvent.hover(trigger());
		await expectOpen();
	});

	test("an aria-disabled child stays focusable, and Tab shows its tooltip", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Tooltip title="Waiting for Codex review">
					<Button variant="primary" aria-disabled="true">
						Merge
					</Button>
				</Tooltip>
			</>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(button("Merge")).toHaveFocus();
		await expectOpen("Waiting for Codex review");
	});
});

describe("Tooltip: Escape inside a dialog", () => {
	afterEach(async () => {
		cleanup();
		await vi.waitFor(() => {
			expect(document.body.style.overflow).toBe("");
			expect(
				document.querySelector("[inert], body > [aria-hidden='true']"),
			).toBeNull();
		});
	});

	test("Escape hides the tooltip and stops there, so the dialog underneath stays open; the next Escape closes the dialog", async () => {
		const onDialogClose = vi.fn<NonNullable<DialogProps["onClose"]>>();
		render(
			<Dialog open onClose={onDialogClose}>
				<DialogTitle>Share the draft?</DialogTitle>
				<DialogActions>
					<Tooltip title="Copies a private link" enterDelay={5000}>
						<Button>Copy link</Button>
					</Tooltip>
				</DialogActions>
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Share the draft?",
		});
		await expect.poll(() => dialog.contains(document.activeElement)).toBe(true);
		await userEvent.tab();
		expect(button("Copy link")).toHaveFocus();
		await expectOpen("Copies a private link");
		const tip = shownWith("Copies a private link")[0];
		const { left, top, width, height } = box(tip);
		const halfWidth = width / 2;
		const halfHeight = height / 2;
		expect(
			tip.contains(
				document.elementFromPoint(left + halfWidth, top + halfHeight),
			),
		).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expectClosed("Copies a private link");
		expect(onDialogClose).not.toHaveBeenCalled();
		expect(isShown(dialog)).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => onDialogClose.mock.calls.length).toBe(1);
		expect(onDialogClose.mock.calls[0]?.[1]).toBe("escapeKeyDown");
	});
});

describe("Tooltip: touch", () => {
	test("a long press shows it after enterTouchDelay, and it stays leaveTouchDelay after the finger lifts", async () => {
		const onOpen = vi.fn<OnOpen>();
		render(
			<Hinted enterTouchDelay={400} leaveTouchDelay={800} onOpen={onOpen} />,
		);
		const pressed = performance.now();
		await touchStart(trigger());
		await expectOpen(email, 2500);
		expect(performance.now() - pressed).toBeGreaterThanOrEqual(350);
		expect(onOpen).toHaveBeenCalledTimes(1);
		const lifted = performance.now();
		await touchEnd();
		await expectClosed(email, 3000);
		expect(performance.now() - lifted).toBeGreaterThanOrEqual(700);
	});

	test("by default a long press takes 700ms, and the tooltip stays 1500ms after the finger lifts", async () => {
		render(<Hinted />);
		const pressed = performance.now();
		await touchStart(trigger());
		await expectOpen(email, 3000);
		expect(performance.now() - pressed).toBeGreaterThanOrEqual(650);
		const lifted = performance.now();
		await touchEnd();
		await expectClosed(email, 4000);
		expect(performance.now() - lifted).toBeGreaterThanOrEqual(1400);
	});

	test("a tap doesn't show it: hover is for a fine pointer only", async () => {
		await coldStart();
		render(<Hinted enterDelay={100} />);
		await touchStart(trigger());
		await touchEnd();
		await pause(500);
		expect(shownWith(email)).toHaveLength(0);
	});

	test("disableTouchListener: a long press doesn't show it", async () => {
		render(<Hinted disableTouchListener enterTouchDelay={200} />);
		await touchStart(trigger());
		try {
			await pause(600);
			expect(shownWith(email)).toHaveLength(0);
		} finally {
			await touchEnd();
		}
	});
});

describe("Tooltip: controlled", () => {
	test("open decides: onOpen and onClose only ask, and the tooltip follows open", async () => {
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		const { rerender } = render(
			<Hinted open={false} onOpen={onOpen} onClose={onClose} />,
		);
		button("Before").focus();
		await userEvent.tab();
		await expect.poll(() => onOpen.mock.calls.length).toBe(1);
		expect(nativeOf(onOpen.mock.calls[0]?.[0])).toBeInstanceOf(FocusEvent);
		await pause(300);
		expect(shownWith(email)).toHaveLength(0);
		rerender(<Hinted open onOpen={onOpen} onClose={onClose} />);
		await expectOpen();
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => onClose.mock.calls.length).toBe(1);
		expect(nativeOf(onClose.mock.calls[0]?.[0])).toBeInstanceOf(KeyboardEvent);
		await pause(300);
		expect(shownWith(email)).toHaveLength(1);
		rerender(<Hinted open={false} onOpen={onOpen} onClose={onClose} />);
		await expectClosed();
	});

	test("open shows it with no pointer or focus, and keeps it while the pointer comes and goes", async () => {
		render(<Hinted open />);
		await expectOpen();
		await userEvent.hover(trigger());
		await userEvent.hover(screen.getByText("Elsewhere"));
		await pause(300);
		expect(shownWith(email)).toHaveLength(1);
	});
});

describe("Tooltip: moving along a row", () => {
	function Row({ second = 3000 }: { readonly second?: number }) {
		return (
			<>
				<div style={{ display: "flex", gap: 6, padding: 120 }}>
					<Tooltip title="Copy email" describeChild={false} enterDelay={0}>
						<Button size="sm">
							<Icon name="copy" />
						</Button>
					</Tooltip>
					<Tooltip
						title="Download résumé"
						describeChild={false}
						enterDelay={second}
					>
						<Button size="sm">
							<Icon name="download" />
						</Button>
					</Tooltip>
				</div>
				<Elsewhere />
			</>
		);
	}

	test("while one is open, the next opens at once, without its enterDelay", async () => {
		render(<Row />);
		await userEvent.hover(button("Copy email"));
		await expectOpen("Copy email");
		await userEvent.hover(button("Download résumé"));
		await expectOpen("Download résumé", 1500);
		await expectClosed("Copy email");
	});

	test("just after one closes, the next opens at once", async () => {
		render(<Row />);
		await userEvent.hover(button("Copy email"));
		await expectOpen("Copy email");
		await userEvent.hover(screen.getByText("Elsewhere"));
		await userEvent.hover(button("Download résumé"));
		await expectOpen("Download résumé", 1500);
	});

	test("well after one closes, the next waits for its enterDelay again", async () => {
		render(<Row second={400} />);
		await userEvent.hover(button("Copy email"));
		await expectOpen("Copy email");
		await userEvent.hover(screen.getByText("Elsewhere"));
		await expectClosed("Copy email");
		await pause(handOff + 400);
		const start = performance.now();
		await userEvent.hover(button("Download résumé"));
		await expectOpen("Download résumé", 2000);
		expect(performance.now() - start).toBeGreaterThanOrEqual(350);
	});
});

describe("Tooltip: where it goes", () => {
	test("it sits above its child by default, 8px away", async () => {
		render(<Placed />);
		const tooltip = await screen.findByRole("tooltip");
		await vi.waitFor(() => {
			expectPlaced(tooltip, trigger(), "top", 8);
		});
	});

	test.each(placements)(
		"placement %s puts it on that side, 8px away, lined up as named",
		async (placement) => {
			render(<Placed placement={placement} />);
			const tooltip = await screen.findByRole("tooltip");
			await vi.waitFor(() => {
				expectPlaced(tooltip, trigger(), placement, 8);
			});
		},
	);

	test("it flips below when there's no room above", async () => {
		render(<Placed at={{ left: 157, top: 0 }} />);
		const tooltip = await screen.findByRole("tooltip");
		await vi.waitFor(() => {
			expectPlaced(tooltip, trigger(), "bottom", 8);
		});
	});

	test.each(["top", "bottom", "left", "right"] as const)(
		"arrow, at %s, widens the gap to 12px",
		async (placement) => {
			render(<Placed arrow placement={placement} />);
			const tooltip = await screen.findByRole("tooltip");
			await vi.waitFor(() => {
				expectPlaced(tooltip, trigger(), placement, 12);
			});
		},
	);

	test("it renders in document.body by default, and in place with disablePortal", async () => {
		const { container, rerender } = render(<Placed />);
		const portalled = await screen.findByRole("tooltip");
		expect(container.contains(portalled)).toBe(false);
		expect(document.body.contains(portalled)).toBe(true);
		rerender(<Placed disablePortal />);
		await vi.waitFor(() => {
			expect(container.contains(screen.getByRole("tooltip"))).toBe(true);
		});
	});

	test("slotProps reach the role=tooltip surface and the layer around it", async () => {
		render(
			<Placed
				slotProps={{
					popper: { className: "hint-layer" },
					tooltip: { className: "hint-surface" },
				}}
			/>,
		);
		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveClass("hint-surface");
		expect(tooltip.parentElement?.closest(".hint-layer")).not.toBeNull();
	});
});

describe("Tooltip: the child", () => {
	test("the child keeps its own handlers and ref, and the Tooltip's ref is the child too", async () => {
		const childRef = React.createRef<HTMLButtonElement>();
		const tooltipRef = React.createRef<HTMLElement>();
		const handlers = {
			onFocus: vi.fn(),
			onBlur: vi.fn(),
			onPointerEnter: vi.fn(),
			onPointerLeave: vi.fn(),
			onPointerDown: vi.fn(),
			onClick: vi.fn(),
		};
		render(
			<>
				<button type="button">Before</button>
				<Tooltip ref={tooltipRef} title={email} enterDelay={0}>
					<Button ref={childRef} {...handlers}>
						Email me
					</Button>
				</Tooltip>
				<button type="button">After</button>
				<Elsewhere />
			</>,
		);
		expect(childRef.current).toBe(trigger());
		expect(tooltipRef.current).toBe(trigger());
		button("Before").focus();
		await userEvent.tab();
		expect(handlers.onFocus).toHaveBeenCalledTimes(1);
		await expectOpen();
		await userEvent.hover(trigger());
		expect(handlers.onPointerEnter).toHaveBeenCalled();
		await userEvent.click(trigger());
		expect(handlers.onPointerDown).toHaveBeenCalled();
		expect(handlers.onClick).toHaveBeenCalledTimes(1);
		await userEvent.hover(screen.getByText("Elsewhere"));
		expect(handlers.onPointerLeave).toHaveBeenCalled();
		await userEvent.tab();
		expect(handlers.onBlur).toHaveBeenCalled();
	});
});
