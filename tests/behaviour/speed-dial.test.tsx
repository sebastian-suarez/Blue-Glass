// Behaviour specs for SpeedDial, SpeedDialAction and SpeedDialIcon, from
// design-system/components/SpeedDial/README.md and api.d.ts. SpeedDial is a plain React port, so
// the specs find the trigger as a button named by ariaLabel, its list as a menu and the actions as
// menuitems named by tooltipTitle. The README's timers run in real time: the stagger is sampled
// every few ms from a time taken before the dial opens, so a gap can only run long, under a
// generous ceiling. Hover runs through Chromium's mouse, and a tap through its touch input (CDP).
import { cleanup, render, screen, within } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import {
	Icon,
	SpeedDial,
	SpeedDialAction,
	type SpeedDialActionProps,
	type SpeedDialDirection,
	SpeedDialIcon,
	type SpeedDialProps,
} from "#ui";

/**
Parks the pointer in the page's bottom-left corner, clear of every dial below: a trigger that
appears under a resting pointer can count as hovered without a move.
*/
async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; left: 0; bottom: 0; width: 8px; height: 8px";
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

/**
The number a computed value starts with: "0.85", "45deg", "0.22s" or "1 1".
*/
function leading(value: string): number {
	return Number(/^-?[\d.]+/v.exec(value)?.[0] ?? NaN);
}

// The preview's actions, nearest the trigger first.
const contact = [
	{ icon: "mail", label: "Email me" },
	{ icon: "link", label: "Copy link" },
	{ icon: "share", label: "Share" },
	{ icon: "download", label: "Download résumé" },
] as const;

type Label = (typeof contact)[number]["label"];

const labels: Label[] = contact.map(({ label }) => label);

type OnOpen = NonNullable<SpeedDialProps["onOpen"]>;
type OnClose = NonNullable<SpeedDialProps["onClose"]>;
type OnClick = NonNullable<SpeedDialActionProps["onClick"]>;
type Placement = NonNullable<SpeedDialActionProps["tooltipPlacement"]>;

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

async function pause(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function dimensions(element: Element): [number, number] {
	const { width, height } = box(element);
	return [Math.round(width), Math.round(height)];
}

/**
Disabled natively, or through aria-disabled, which keeps the element focusable.
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
function opacityOf(element: Element): number {
	let opacity = 1;
	for (let node: Element | null = element; node; node = node.parentElement) {
		opacity *= Number(getComputedStyle(node).opacity);
	}

	return opacity;
}

/**
How much the element is scaled: the scale of its transforms and its ancestors'.
*/
function scaleOf(element: Element): number {
	let scale = 1;
	for (let node: Element | null = element; node; node = node.parentElement) {
		const style = getComputedStyle(node);
		if (style.transform !== "none") {
			const matrix = new DOMMatrix(style.transform);
			scale *= Math.hypot(matrix.a, matrix.b);
		}

		if (style.scale !== "none") {
			scale *= leading(style.scale);
		}
	}

	return scale;
}

/**
How far the element is turned, in degrees, by its own transforms and its ancestors' up to `upTo`.
*/
function turnOf(element: Element, upTo: Element): number {
	let degrees = 0;
	for (
		let node: Element | null = element;
		node && node !== upTo;
		node = node.parentElement
	) {
		const style = getComputedStyle(node);
		if (style.transform !== "none") {
			const matrix = new DOMMatrix(style.transform);
			degrees += (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI;
		}

		if (style.rotate !== "none") {
			degrees += leading(style.rotate);
		}
	}

	return Math.round(degrees);
}

/**
Whether the element is drawn in full: visible, opaque and at its size.
*/
function isShownInFull(element: Element): boolean {
	return (
		element.checkVisibility({ visibilityProperty: true }) &&
		opacityOf(element) === 1 &&
		Math.abs(scaleOf(element) - 1) < 0.001
	);
}

/**
What a token resolves to, read from a probe element styled with it.
*/
function resolved(
	property:
		| "backgroundColor"
		| "color"
		| "boxShadow"
		| "backdropFilter"
		| "borderTopLeftRadius"
		| "transitionDuration"
		| "transitionTimingFunction"
		| "zIndex",
	token: string,
): string {
	const probe = document.createElement("div");
	probe.style.position = "relative";
	probe.style[property] =
		property === "backdropFilter" ? `blur(var(${token}))` : `var(${token})`;
	document.body.append(probe);
	const value = getComputedStyle(probe)[property];
	probe.remove();
	return value;
}

/**
A duration token in whole ms.
*/
function resolvedMs(token: string): number {
	return Math.round(leading(resolved("transitionDuration", token)) * 1000);
}

/**
The markup of a glyph as Icon draws it, to compare with what a component shows.
*/
function glyph(name: string): string {
	const { container, unmount } = render(<Icon name={name} />);
	const markup = container.querySelector("svg")?.getHTML() ?? "";
	unmount();
	container.remove();
	return markup;
}

function glyphsIn(element: Element): string[] {
	return [...element.querySelectorAll("svg")].map((svg) => svg.getHTML());
}

/**
The drawing of that glyph inside the element.
*/
function glyphIn(element: Element, name: string): SVGSVGElement {
	const markup = glyph(name);
	return must(
		[...element.querySelectorAll("svg")].find(
			(svg) => svg.getHTML() === markup,
		),
	);
}

type AnyEvent = React.SyntheticEvent | Event | undefined;

/**
The DOM event behind a callback's event, whether it came wrapped or native.
*/
function nativeOf(event: AnyEvent): Event | undefined {
	return event instanceof Event ? event : event?.nativeEvent;
}

/**
A React event, as onOpen and an action's onClick get, of the given kind.
*/
function expectReactEvent(
	event: React.SyntheticEvent | undefined,
	kind: new (type: string) => Event,
	type?: string,
): void {
	expect(event).not.toBeInstanceOf(Event);
	expect(event?.nativeEvent).toBeInstanceOf(kind);
	if (type !== undefined) {
		expect(event?.type).toBe(type);
	}
}

/**
A point in the test page's own coordinates, in the coordinates Chromium's input takes.
*/
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

async function tap(element: Element): Promise<void> {
	await cdp().send("Input.dispatchTouchEvent", {
		type: "touchStart",
		touchPoints: [inputPoint(element)],
	});
	await cdp().send("Input.dispatchTouchEvent", {
		type: "touchEnd",
		touchPoints: [],
	});
}

/**
Samples the elements every few ms until each has passed the check once, and returns when each
first did, in ms after `start`.
*/
async function firstTimes(
	elements: readonly Element[],
	isMet: (element: Element) => boolean,
	start: number,
	timeout = 3000,
): Promise<number[]> {
	const seen: Array<number | undefined> = elements.map(() => undefined);
	const end = performance.now() + timeout;
	while (seen.includes(undefined) && performance.now() < end) {
		const now = performance.now();
		for (const [index, element] of elements.entries()) {
			if (seen[index] === undefined && isMet(element)) {
				seen[index] = now - start;
			}
		}

		// eslint-disable-next-line no-await-in-loop -- one sample after another
		await pause(2);
	}

	return seen.map((time) => must(time));
}

/**
Runs `sample` every few ms for `ms`.
*/
async function sampleFor(ms: number, sample: () => void): Promise<void> {
	const end = performance.now() + ms;
	while (performance.now() < end) {
		sample();
		// eslint-disable-next-line no-await-in-loop -- one sample after another
		await pause(2);
	}
}

type DialProps = Omit<SpeedDialProps, "ariaLabel"> & {
	readonly ariaLabel?: string;
	readonly ref?: React.Ref<HTMLDivElement>;
};

/**
A page with the dial in the middle of a tall stage, a button before and after it, and a corner
to move the pointer to.
*/
function Dial({
	ariaLabel = "Contact and share",
	children,
	...props
}: DialProps) {
	return (
		<>
			<button type="button">Before</button>
			<div style={{ display: "grid", placeItems: "center", height: 480 }}>
				<SpeedDial ariaLabel={ariaLabel} {...props}>
					{children ?? contactActions()}
				</SpeedDial>
			</div>
			<button type="button">After</button>
			<p
				style={{
					position: "fixed",
					left: 0,
					bottom: 0,
					margin: 0,
					padding: 8,
				}}
			>
				Elsewhere
			</p>
		</>
	);
}

/**
The preview's four actions, each with props of its own and props they all share.
*/
function contactActions(
	own: Partial<Record<Label, Partial<SpeedDialActionProps>>> = {},
	shared: Partial<SpeedDialActionProps> = {},
): React.ReactNode {
	return contact.map(({ icon, label }) => (
		<SpeedDialAction
			key={label}
			icon={<Icon name={icon} />}
			tooltipTitle={label}
			{...shared}
			{...own[label]}
		/>
	));
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function trigger(): HTMLElement {
	return screen.getByRole("button", { name: "Contact and share" });
}

/**
The trigger, found while it may be zoomed out of sight.
*/
function anyTrigger(): HTMLElement {
	return screen.getByRole("button", {
		name: "Contact and share",
		hidden: true,
	});
}

function menu(): HTMLElement {
	return screen.getByRole("menu", { name: "Contact and share" });
}

function action(label: string): HTMLElement {
	return screen.getByRole("menuitem", { name: label });
}

/**
An action's button, found while it may be zoomed out of sight, by its place among the actions:
a hidden element has no accessible name to find it by.
*/
function anyAction(
	label: string,
	among: readonly string[] = labels,
): HTMLElement {
	return must(
		screen.getAllByRole("menuitem", { hidden: true })[among.indexOf(label)],
	);
}

/**
An action's label pill: the element showing its tooltipTitle.
*/
function pill(label: string): HTMLElement {
	return screen.getByText(label);
}

function isOpen(): boolean {
	return anyTrigger().getAttribute("aria-expanded") === "true";
}

/**
The actions drawn in full, as menuitems.
*/
function shownActions(among: readonly string[] = labels): string[] {
	return among.filter((label) => {
		const element = screen.queryByRole("menuitem", { name: label });
		return element !== null && isShownInFull(element);
	});
}

async function expectOpen(among: readonly string[] = labels): Promise<void> {
	await expect.poll(() => isOpen()).toBe(true);
	await expect.poll(() => shownActions(among)).toEqual(among);
}

async function expectClosed(): Promise<void> {
	await expect.poll(() => isOpen()).toBe(false);
	await expect.poll(() => screen.queryAllByRole("menuitem")).toEqual([]);
}

async function tabToTrigger(): Promise<void> {
	button("Before").focus();
	await userEvent.tab();
	await expect.element(trigger()).toHaveFocus();
}

/**
Presses each key in turn and waits for focus on the action named next to it, or the trigger.
*/
async function walk(
	steps: ReadonlyArray<readonly [key: string, target: string]>,
): Promise<void> {
	for (const [key, target] of steps) {
		// eslint-disable-next-line no-await-in-loop -- each key starts where the last left focus
		await userEvent.keyboard(key);
		// eslint-disable-next-line no-await-in-loop
		await expect
			.element(target === "trigger" ? anyTrigger() : anyAction(target))
			.toHaveFocus();
	}
}

const directions = [
	{
		direction: "up",
		side: "above",
		orientation: "vertical",
		along: "{ArrowUp}",
		back: "{ArrowDown}",
		across: ["{ArrowLeft}", "{ArrowRight}"],
	},
	{
		direction: "down",
		side: "below",
		orientation: "vertical",
		along: "{ArrowDown}",
		back: "{ArrowUp}",
		across: ["{ArrowLeft}", "{ArrowRight}"],
	},
	{
		direction: "left",
		side: "to the left of",
		orientation: "horizontal",
		along: "{ArrowLeft}",
		back: "{ArrowRight}",
		across: ["{ArrowUp}", "{ArrowDown}"],
	},
	{
		direction: "right",
		side: "to the right of",
		orientation: "horizontal",
		along: "{ArrowRight}",
		back: "{ArrowLeft}",
		across: ["{ArrowUp}", "{ArrowDown}"],
	},
] as const satisfies ReadonlyArray<{
	direction: SpeedDialDirection;
	side: string;
	orientation: "vertical" | "horizontal";
	along: string;
	back: string;
	across: readonly string[];
}>;

type Side = SpeedDialDirection | Placement;

/**
Whether `far` lies wholly on that side of `near`.
*/
function isBeyond(side: Side, near: DOMRect, far: DOMRect): boolean {
	switch (side) {
		case "up":
		case "top": {
			return far.bottom <= near.top + 0.5;
		}

		case "down":
		case "bottom": {
			return far.top >= near.bottom - 0.5;
		}

		case "left": {
			return far.right <= near.left + 0.5;
		}

		case "right": {
			return far.left >= near.right - 0.5;
		}
	}
}

/**
Whether the two boxes share the centre line that runs along that side.
*/
const verticalSides = new Set<Side>(["up", "down", "top", "bottom"]);

function isCentredAlong(side: Side, a: DOMRect, b: DOMRect): boolean {
	const isVertical = verticalSides.has(side);
	const centre = (rect: DOMRect) => {
		const half = (isVertical ? rect.width : rect.height) / 2;
		const start = isVertical ? rect.left : rect.top;
		return start + half;
	};

	return Math.abs(centre(a) - centre(b)) <= 1;
}

async function emulateMedia(
	features: Array<{ name: string; value: string }>,
): Promise<void> {
	const session: CDPSession = cdp();
	await session.send("Emulation.setEmulatedMedia", { features });
}

describe("SpeedDial: the trigger and its menu", () => {
	test('the trigger is a button named by ariaLabel, with aria-haspopup="menu" and aria-expanded false, and closed it shows no actions', () => {
		render(<Dial />);
		expect(trigger()).toBeInstanceOf(HTMLButtonElement);
		expect(trigger()).toHaveAttribute("aria-haspopup", "menu");
		expect(trigger()).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryAllByRole("menuitem")).toEqual([]);
	});

	test("open, aria-expanded turns true, and aria-controls points at a menu named by ariaLabel whose menuitems are the actions, named by tooltipTitle, nearest the trigger first", async () => {
		render(<Dial openOnHover={false} />);
		await userEvent.click(trigger());
		await expectOpen();
		const list = menu();
		expect(trigger()).toHaveAttribute("aria-controls", list.id);
		const items = within(list).getAllByRole("menuitem");
		expect(items).toHaveLength(labels.length);
		for (const [index, label] of labels.entries()) {
			expect(items[index]).toBe(action(label));
		}
	});

	test("the ref is the dial's root div, which holds the trigger and the menu and takes className, style, id and the other HTML attributes", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Dial
				ref={ref}
				defaultOpen
				openOnHover={false}
				id="contact-dial"
				className="pinned"
				style={{ marginTop: 8 }}
				data-track="dial"
			/>,
		);
		await expectOpen();
		const root = must(ref.current);
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(root.contains(trigger())).toBe(true);
		expect(root.contains(menu())).toBe(true);
		expect(root).toHaveAttribute("id", "contact-dial");
		expect(root).toHaveClass("pinned");
		expect(getComputedStyle(root).marginTop).toBe("8px");
		expect(root).toHaveAttribute("data-track", "dial");
	});

	test("it stacks at z-fab", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Dial ref={ref} />);
		expect(getComputedStyle(must(ref.current)).zIndex).toBe(
			resolved("zIndex", "--z-fab"),
		);
	});

	test("it doesn't position itself: pinned with the README's style, it sits 16px from the bottom-right corner and grows upward from there", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<SpeedDial
				ref={ref}
				defaultOpen
				ariaLabel="Contact and share"
				openOnHover={false}
				style={{
					position: "fixed",
					right: "calc(var(--space-md) + env(safe-area-inset-right, 0px))",
					bottom: "calc(var(--space-md) + env(safe-area-inset-bottom, 0px))",
				}}
			>
				{contactActions()}
			</SpeedDial>,
		);
		await expectOpen();
		const corner = box(trigger());
		expect(
			Math.round(document.documentElement.clientWidth - corner.right),
		).toBe(16);
		expect(Math.round(window.innerHeight - corner.bottom)).toBe(16);
		const email = box(action("Email me"));
		expect(isBeyond("up", corner, email)).toBe(true);
		cleanup();
		render(<Dial ref={ref} />);
		expect(getComputedStyle(must(ref.current)).position).not.toMatch(
			/^(?:fixed|absolute|sticky)$/v,
		);
	});

	test("the trigger is the ink circle with the primary shadow, 46px by default; FabProps size sets its size, and it stays ink whatever FabProps' variant", () => {
		render(
			<>
				<SpeedDial ariaLabel="Default">{contactActions()}</SpeedDial>
				<SpeedDial ariaLabel="Small" FabProps={{ size: "sm" }}>
					{contactActions()}
				</SpeedDial>
				<SpeedDial
					ariaLabel="Large"
					FabProps={{ size: "lg", variant: "glass" }}
				>
					{contactActions()}
				</SpeedDial>
			</>,
		);
		const sides = { Default: 46, Small: 36, Large: 56 };
		for (const [name, side] of Object.entries(sides)) {
			const element = button(name);
			expect(dimensions(element)).toEqual([side, side]);
			expect(getComputedStyle(element).backgroundColor).toBe(
				resolved("backgroundColor", "--color-ink"),
			);
			expect(getComputedStyle(element).color).toBe(
				resolved("color", "--on-ink"),
			);
			expect(getComputedStyle(element).boxShadow).toBe(
				resolved("boxShadow", "--shadow-primary"),
			);
		}
	});

	test("FabProps reach the trigger: its className and title, and an onClick that runs as the trigger toggles the dial", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Dial
				openOnHover={false}
				FabProps={{
					className: "dial-trigger",
					title: "Contact options",
					onClick,
				}}
			/>,
		);
		expect(trigger()).toHaveClass("dial-trigger");
		expect(trigger()).toHaveAttribute("title", "Contact options");
		await userEvent.click(trigger());
		await expectOpen();
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	test("each action is a small glass Fab showing its icon: a 36px circle with the control shadow and blur", async () => {
		render(<Dial defaultOpen openOnHover={false} />);
		await expectOpen();
		for (const { icon, label } of contact) {
			const element = action(label);
			expect(glyphsIn(element)).toEqual([glyph(icon)]);
			expect(dimensions(element)).toEqual([36, 36]);
			const style = getComputedStyle(element);
			expect(style.boxShadow).toBe(resolved("boxShadow", "--shadow-control"));
			expect(style.backdropFilter).toBe(
				resolved("backdropFilter", "--blur-control"),
			);
		}
	});

	test("the trigger's icon is a SpeedDialIcon by default, a plus, and icon replaces it", () => {
		render(
			<>
				<Dial />
				<SpeedDial ariaLabel="Share this page" icon={<Icon name="share" />}>
					{contactActions()}
				</SpeedDial>
			</>,
		);
		expect(glyphsIn(trigger())).toEqual([glyph("plus")]);
		expect(glyphsIn(button("Share this page"))).toEqual([glyph("share")]);
	});
});

describe("SpeedDial: the pointer", () => {
	test('a click on the trigger opens it, with onOpen(click, "toggle"), and another closes it, with onClose(click, "toggle")', async () => {
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		render(<Dial openOnHover={false} onOpen={onOpen} onClose={onClose} />);
		await userEvent.click(trigger());
		await expectOpen();
		expect(onOpen).toHaveBeenCalledTimes(1);
		const [openEvent, openReason] = onOpen.mock.calls[0] ?? [];
		expect(openReason).toBe("toggle");
		expectReactEvent(openEvent, MouseEvent, "click");
		await userEvent.click(trigger());
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		const [closeEvent, closeReason] = onClose.mock.calls[0] ?? [];
		expect(closeReason).toBe("toggle");
		expect(nativeOf(closeEvent)).toBeInstanceOf(MouseEvent);
		expect(nativeOf(closeEvent)?.type).toBe("click");
	});

	test('a click on an action runs its onClick with the click event, then the dial closes with "actionClick" and focus goes back to the trigger', async () => {
		const order: string[] = [];
		const onCopy = vi.fn<OnClick>(() => {
			order.push("onClick");
		});
		render(
			<Dial
				defaultOpen
				openOnHover={false}
				onClose={(_event, reason) => {
					order.push(reason);
				}}
			>
				{contactActions({ "Copy link": { onClick: onCopy } })}
			</Dial>,
		);
		await expectOpen();
		await userEvent.click(action("Copy link"));
		await expectClosed();
		expect(order).toEqual(["onClick", "actionClick"]);
		expectReactEvent(onCopy.mock.calls[0]?.[0], MouseEvent, "click");
		await expect.element(trigger()).toHaveFocus();
	});

	test("event.preventDefault() in an action's onClick keeps the dial open", async () => {
		const onClose = vi.fn<OnClose>();
		render(
			<Dial defaultOpen openOnHover={false} onClose={onClose}>
				{contactActions({
					"Copy link": {
						onClick(event) {
							event.preventDefault();
						},
					},
				})}
			</Dial>,
		);
		await expectOpen();
		await userEvent.click(action("Copy link"));
		await pause(300);
		expect(isOpen()).toBe(true);
		expect(shownActions()).toEqual(labels);
		expect(onClose).not.toHaveBeenCalled();
	});

	test("a disabled action is disabled: a click doesn't run its onClick, and the dial stays open", async () => {
		const onCopy = vi.fn<OnClick>();
		const onClose = vi.fn<OnClose>();
		render(
			<Dial defaultOpen openOnHover={false} onClose={onClose}>
				{contactActions({ "Copy link": { disabled: true, onClick: onCopy } })}
			</Dial>,
		);
		// A disabled Fab is dimmed, so it never shows in full.
		await expectOpen(labels.filter((label) => label !== "Copy link"));
		expect(isDisabled(action("Copy link"))).toBe(true);
		await userEvent.click(action("Copy link"), { force: true });
		await pause(300);
		expect(onCopy).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
		expect(isOpen()).toBe(true);
	});

	// The README names blur among the close reasons; the reference closes on a press outside too.
	test('a press outside closes it, with onClose(press, "blur")', async () => {
		const onClose = vi.fn<OnClose>();
		render(<Dial openOnHover={false} onClose={onClose} />);
		await userEvent.click(trigger());
		await expectOpen();
		await userEvent.click(screen.getByText("Elsewhere"));
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		const [event, reason] = onClose.mock.calls[0] ?? [];
		expect(reason).toBe("blur");
		expect(nativeOf(event)).toBeInstanceOf(MouseEvent);
	});

	test('with a fine pointer, hovering opens it with onOpen(event, "mouseEnter"), and leaving closes it 160ms later with onClose(event, "mouseLeave")', async () => {
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		render(<Dial onOpen={onOpen} onClose={onClose} />);
		await userEvent.hover(trigger());
		await expectOpen();
		expect(onOpen).toHaveBeenCalledTimes(1);
		const [openEvent, openReason] = onOpen.mock.calls[0] ?? [];
		expect(openReason).toBe("mouseEnter");
		expectReactEvent(openEvent, MouseEvent);
		// Taken before the pointer leaves, so the elapsed time can only run long.
		const left = performance.now();
		await userEvent.hover(screen.getByText("Elsewhere"));
		await expect.poll(() => isOpen()).toBe(false);
		expect(performance.now() - left).toBeGreaterThanOrEqual(150);
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		const [closeEvent, closeReason] = onClose.mock.calls[0] ?? [];
		expect(closeReason).toBe("mouseLeave");
		expect(nativeOf(closeEvent)).toBeInstanceOf(MouseEvent);
	});

	test("the pointer can move from the trigger out to the farthest action and back without the dial closing", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Dial onClose={onClose} />);
		await userEvent.hover(trigger());
		await expectOpen();
		await userEvent.hover(action("Download résumé"));
		await pause(400);
		await userEvent.hover(action("Email me"));
		await userEvent.hover(trigger());
		await pause(400);
		expect(isOpen()).toBe(true);
		expect(onClose).not.toHaveBeenCalled();
	});

	test("a click right after a hover-open keeps it open, so it stays open when the pointer leaves", async () => {
		const onOpen = vi.fn<OnOpen>();
		const onClose = vi.fn<OnClose>();
		render(<Dial onOpen={onOpen} onClose={onClose} />);
		// The pointer arrives on the trigger, which opens it, and clicks at once.
		await userEvent.click(trigger());
		await expectOpen();
		expect(onOpen.mock.calls[0]?.[1]).toBe("mouseEnter");
		await userEvent.hover(screen.getByText("Elsewhere"));
		await pause(500);
		expect(isOpen()).toBe(true);
		expect(onClose).not.toHaveBeenCalled();
	});

	// "Right after" is the reference's 400ms.
	test('a click well after a hover-open closes it, with "toggle"', async () => {
		const onClose = vi.fn<OnClose>();
		render(<Dial onClose={onClose} />);
		await userEvent.hover(trigger());
		await expectOpen();
		await pause(800);
		await userEvent.click(trigger());
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onClose.mock.calls[0]?.[1]).toBe("toggle");
	});

	test("openOnHover={false}: hovering doesn't open it, and a click still does", async () => {
		const onOpen = vi.fn<OnOpen>();
		render(<Dial openOnHover={false} onOpen={onOpen} />);
		await userEvent.hover(trigger());
		await pause(400);
		expect(isOpen()).toBe(false);
		expect(onOpen).not.toHaveBeenCalled();
		await userEvent.click(trigger());
		await expectOpen();
		expect(onOpen.mock.calls.map(([, reason]) => reason)).toEqual(["toggle"]);
	});

	test('a tap opens it once, with "toggle": touch is no hover', async () => {
		const onOpen = vi.fn<OnOpen>();
		render(<Dial onOpen={onOpen} />);
		await tap(trigger());
		await expectOpen();
		await pause(200);
		expect(onOpen.mock.calls.map(([, reason]) => reason)).toEqual(["toggle"]);
	});
});

describe("SpeedDial: keyboard", () => {
	test("Tab reaches the trigger and then leaves the dial: the actions are tabindex -1 and take focus only through the arrows", async () => {
		render(<Dial defaultOpen />);
		await expectOpen();
		for (const label of labels) {
			expect(action(label)).toHaveAttribute("tabindex", "-1");
		}

		await tabToTrigger();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(trigger()).toHaveFocus();
	});

	test.each([
		["Enter", "{Enter}"],
		["Space", " "],
	] as const)(
		'%s on the trigger opens it and closes it again, with "toggle", and focus stays on the trigger',
		async (_name, key) => {
			const onOpen = vi.fn<OnOpen>();
			const onClose = vi.fn<OnClose>();
			render(<Dial onOpen={onOpen} onClose={onClose} />);
			await tabToTrigger();
			await userEvent.keyboard(key);
			await expectOpen();
			expect(trigger()).toHaveFocus();
			expect(onOpen.mock.calls.map(([, reason]) => reason)).toEqual(["toggle"]);
			await userEvent.keyboard(key);
			await expectClosed();
			expect(trigger()).toHaveFocus();
			expect(onClose.mock.calls.map(([, reason]) => reason)).toEqual([
				"toggle",
			]);
		},
	);

	test.each(directions)(
		'$direction dial: the arrow along it opens it with onOpen(keydown, "keyboard") and walks out through the actions, stopping at the farthest; the opposite arrow walks back to the trigger; the arrows across it do nothing',
		async ({ direction, along, back, across }) => {
			const onOpen = vi.fn<OnOpen>();
			render(<Dial direction={direction} onOpen={onOpen} />);
			await tabToTrigger();
			for (const key of [...across, back]) {
				// eslint-disable-next-line no-await-in-loop -- one key after another
				await userEvent.keyboard(key);
			}

			await pause(100);
			expect(isOpen()).toBe(false);
			expect(trigger()).toHaveFocus();
			await walk([[along, "Email me"]]);
			expect(isOpen()).toBe(true);
			expect(onOpen).toHaveBeenCalledTimes(1);
			const [event, reason] = onOpen.mock.calls[0] ?? [];
			expect(reason).toBe("keyboard");
			expectReactEvent(event, KeyboardEvent, "keydown");
			await walk([
				[along, "Copy link"],
				[along, "Share"],
				[along, "Download résumé"],
				[along, "Download résumé"],
				[back, "Share"],
				[back, "Copy link"],
				[back, "Email me"],
				[back, "trigger"],
			]);
			expect(isOpen()).toBe(true);
		},
	);

	test("on an open dial the arrow along it goes from the trigger to the nearest action", async () => {
		render(<Dial />);
		await tabToTrigger();
		await userEvent.keyboard("{Enter}");
		await expectOpen();
		await walk([
			["{ArrowUp}", "Email me"],
			["{ArrowUp}", "Copy link"],
		]);
	});

	test("the arrows pass over a disabled action", async () => {
		render(<Dial>{contactActions({ "Copy link": { disabled: true } })}</Dial>);
		await tabToTrigger();
		await walk([
			["{ArrowUp}", "Email me"],
			["{ArrowUp}", "Share"],
			["{ArrowDown}", "Email me"],
		]);
	});

	test('Escape on an action closes the dial, with onClose(Escape keydown, "escapeKeyDown"), and returns focus to the trigger', async () => {
		const onClose = vi.fn<OnClose>();
		render(<Dial onClose={onClose} />);
		await tabToTrigger();
		await walk([
			["{ArrowUp}", "Email me"],
			["{ArrowUp}", "Copy link"],
		]);
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.element(trigger()).toHaveFocus();
		expect(onClose).toHaveBeenCalledTimes(1);
		const [event, reason] = onClose.mock.calls[0] ?? [];
		expect(reason).toBe("escapeKeyDown");
		const native = nativeOf(event);
		expect(native).toBeInstanceOf(KeyboardEvent);
		expect((native as KeyboardEvent).key).toBe("Escape");
	});

	test("Escape on the trigger closes an open dial, and on a closed one does nothing", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Dial onClose={onClose} />);
		await tabToTrigger();
		await userEvent.keyboard("{Enter}");
		await expectOpen();
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		expect(trigger()).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await pause(100);
		expect(onClose.mock.calls.map(([, reason]) => reason)).toEqual([
			"escapeKeyDown",
		]);
	});

	test.each([
		["Enter", "{Enter}"],
		["Space", " "],
	] as const)(
		'%s on an action chooses it: its onClick runs with a click event, then the dial closes with "actionClick" and focus goes back to the trigger',
		async (_name, key) => {
			const order: string[] = [];
			const onCopy = vi.fn<OnClick>(() => {
				order.push("onClick");
			});
			render(
				<Dial
					onClose={(_event, reason) => {
						order.push(reason);
					}}
				>
					{contactActions({ "Copy link": { onClick: onCopy } })}
				</Dial>,
			);
			await tabToTrigger();
			await walk([
				["{ArrowUp}", "Email me"],
				["{ArrowUp}", "Copy link"],
			]);
			await userEvent.keyboard(key);
			await expectClosed();
			expect(order).toEqual(["onClick", "actionClick"]);
			expectReactEvent(onCopy.mock.calls[0]?.[0], MouseEvent, "click");
			await expect.element(trigger()).toHaveFocus();
		},
	);

	test('Tab from an action leaves the dial for the next control and closes it, with onClose(event, "blur")', async () => {
		const onClose = vi.fn<OnClose>();
		render(<Dial onClose={onClose} />);
		await tabToTrigger();
		await walk([
			["{ArrowUp}", "Email me"],
			["{ArrowUp}", "Copy link"],
		]);
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await expectClosed();
		expect(onClose).toHaveBeenCalledTimes(1);
		const [event, reason] = onClose.mock.calls[0] ?? [];
		expect(reason).toBe("blur");
		expect(nativeOf(event)).toBeInstanceOf(FocusEvent);
	});

	test("Shift+Tab from the trigger of an open dial leaves for the control before it, and closes the dial", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Dial onClose={onClose} />);
		await tabToTrigger();
		await userEvent.keyboard("{Enter}");
		await expectOpen();
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
		await expectClosed();
		expect(onClose.mock.calls.map(([, reason]) => reason)).toEqual(["blur"]);
	});
});

describe("SpeedDial: controlled and uncontrolled", () => {
	test("defaultOpen starts it open, and it keeps its own state after that", async () => {
		render(<Dial defaultOpen openOnHover={false} />);
		await expectOpen();
		await userEvent.click(trigger());
		await expectClosed();
		await userEvent.click(trigger());
		await expectOpen();
	});

	test("open controls it: onOpen only asks, and it opens when open turns true", async () => {
		const onOpen = vi.fn<OnOpen>();
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false} onOpen={onOpen} />
		);
		const { rerender } = render(view(false));
		await userEvent.click(trigger());
		await vi.waitFor(() => {
			expect(onOpen).toHaveBeenCalledTimes(1);
		});
		expect(onOpen.mock.calls[0]?.[1]).toBe("toggle");
		await pause(300);
		expect(isOpen()).toBe(false);
		expect(screen.queryAllByRole("menuitem")).toEqual([]);
		rerender(view(true));
		await expectOpen();
	});

	test("open controls it: onClose only asks, and it closes when open turns false", async () => {
		const onClose = vi.fn<OnClose>();
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false} onClose={onClose} />
		);
		const { rerender } = render(view(true));
		await expectOpen();
		await userEvent.click(action("Copy link"));
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(1);
		});
		trigger().focus();
		await userEvent.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalledTimes(2);
		});
		expect(onClose.mock.calls.map(([, reason]) => reason)).toEqual([
			"actionClick",
			"escapeKeyDown",
		]);
		await pause(300);
		expect(isOpen()).toBe(true);
		expect(shownActions()).toEqual(labels);
		rerender(view(false));
		await expectClosed();
	});
});

describe("SpeedDial: hidden", () => {
	test("hidden zooms the trigger out of sight, and back in when it turns false", async () => {
		const view = (isHidden: boolean) => (
			<Dial hidden={isHidden} openOnHover={false} />
		);
		const { rerender } = render(view(false));
		const fab = trigger();
		expect(isShownInFull(fab)).toBe(true);
		let hasShrunk = false;
		rerender(view(true));
		await vi.waitFor(
			() => {
				hasShrunk ||= scaleOf(fab) < 0.99;
				expect(
					screen.queryByRole("button", { name: "Contact and share" }),
				).toBeNull();
			},
			{ interval: 5, timeout: 2000 },
		);
		expect(hasShrunk).toBe(true);
		expect(
			fab.checkVisibility({ visibilityProperty: true, opacityProperty: true }),
		).toBe(false);
		// Out of sight, it's out of the tab order too.
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		rerender(view(false));
		await expect.poll(() => isShownInFull(fab)).toBe(true);
		expect(trigger()).toBe(fab);
	});

	test("hidden closes an open dial: its actions zoom out with it", async () => {
		const view = (isHidden: boolean) => (
			<Dial defaultOpen hidden={isHidden} openOnHover={false} />
		);
		const { rerender } = render(view(false));
		await expectOpen();
		rerender(view(true));
		await expectClosed();
	});

	referenceDefectTest(
		"a dial that hidden closed stays closed when it shows again",
		async () => {
			const view = (isHidden: boolean) => (
				<Dial defaultOpen hidden={isHidden} openOnHover={false} />
			);
			const { rerender } = render(view(false));
			await expectOpen();
			rerender(view(true));
			await expectClosed();
			rerender(view(false));
			await expect.poll(() => isShownInFull(anyTrigger())).toBe(true);
			await pause(300);
			expect(isOpen()).toBe(false);
			expect(screen.queryAllByRole("menuitem")).toEqual([]);
		},
	);

	test("while hidden, a dial whose open is true shows closed", async () => {
		const view = (isHidden: boolean) => (
			<Dial open hidden={isHidden} openOnHover={false} />
		);
		const { rerender } = render(view(false));
		await expectOpen();
		rerender(view(true));
		await expectClosed();
	});
});

describe("SpeedDial: direction", () => {
	test.each(directions)(
		"direction $direction fans the actions out $side the trigger, nearest first, on its centre line, and the menu's aria-orientation is $orientation",
		async ({ direction, orientation }) => {
			render(<Dial defaultOpen direction={direction} openOnHover={false} />);
			await expectOpen();
			const boxes = [trigger(), ...labels.map((label) => action(label))].map(
				(element) => box(element),
			);
			for (const [index, current] of boxes.entries()) {
				if (index === 0) {
					continue;
				}

				expect(isBeyond(direction, boxes[index - 1], current)).toBe(true);
				expect(isCentredAlong(direction, boxes[0], current)).toBe(true);
			}

			expect(menu()).toHaveAttribute("aria-orientation", orientation);
		},
	);

	test("the direction is up by default", async () => {
		render(<Dial defaultOpen openOnHover={false} />);
		await expectOpen();
		const triggerBox = box(trigger());
		const email = box(action("Email me"));
		const copy = box(action("Copy link"));
		expect(isBeyond("up", triggerBox, email)).toBe(true);
		expect(isBeyond("up", email, copy)).toBe(true);
	});
});

describe("SpeedDial: label pills", () => {
	test("tooltipTitle is the text of the action's label pill", async () => {
		render(<Dial defaultOpen openOnHover={false} />);
		await expectOpen();
		for (const label of labels) {
			const element = pill(label);
			expect(element).not.toBe(action(label));
			expect(element.closest('[role="menu"]')).toBe(menu());
		}
	});

	test("without tooltipOpen the pills stay hidden while the dial is open, and a pill shows while the pointer is on its action", async () => {
		render(<Dial defaultOpen openOnHover={false} />);
		await expectOpen();
		await pause(200);
		expect(labels.map((label) => opacityOf(pill(label)))).toEqual([0, 0, 0, 0]);
		await userEvent.hover(action("Copy link"));
		await expect.poll(() => opacityOf(pill("Copy link"))).toBe(1);
		expect(opacityOf(pill("Share"))).toBe(0);
		await userEvent.hover(screen.getByText("Elsewhere"));
		await expect.poll(() => opacityOf(pill("Copy link"))).toBe(0);
	});

	test("without tooltipOpen a pill shows while its action has focus", async () => {
		render(<Dial />);
		await tabToTrigger();
		await walk([["{ArrowUp}", "Email me"]]);
		await expect.poll(() => opacityOf(pill("Email me"))).toBe(1);
		expect(opacityOf(pill("Copy link"))).toBe(0);
		await walk([["{ArrowUp}", "Copy link"]]);
		await expect.poll(() => opacityOf(pill("Copy link"))).toBe(1);
		await expect.poll(() => opacityOf(pill("Email me"))).toBe(0);
	});

	test("tooltipOpen shows the pill whenever the dial is open, and it hides with the dial", async () => {
		render(
			<Dial openOnHover={false}>
				{contactActions({}, { tooltipOpen: true })}
			</Dial>,
		);
		expect(labels.map((label) => opacityOf(pill(label)))).toEqual([0, 0, 0, 0]);
		await userEvent.click(trigger());
		await expectOpen();
		await expect
			.poll(() => labels.map((label) => opacityOf(pill(label))))
			.toEqual([1, 1, 1, 1]);
		await userEvent.click(trigger());
		await expect
			.poll(() => labels.map((label) => opacityOf(pill(label))))
			.toEqual([0, 0, 0, 0]);
	});

	test.each([
		["up", "left"],
		["down", "left"],
		["left", "top"],
		["right", "top"],
	] as const)(
		"a dial opening %s puts the pills %s of their actions by default",
		async (direction, placement) => {
			render(
				<Dial defaultOpen direction={direction} openOnHover={false}>
					{contactActions({}, { tooltipOpen: true })}
				</Dial>,
			);
			await expectOpen();
			for (const label of labels) {
				const near = box(action(label));
				const far = box(pill(label));
				expect(isBeyond(placement, near, far)).toBe(true);
				expect(isCentredAlong(placement, near, far)).toBe(true);
			}
		},
	);

	test.each(["left", "right", "top", "bottom"] as const)(
		"tooltipPlacement %s puts the pill on that side of its action",
		async (placement) => {
			render(
				<Dial defaultOpen openOnHover={false}>
					{contactActions(
						{},
						{ tooltipOpen: true, tooltipPlacement: placement },
					)}
				</Dial>,
			);
			await expectOpen();
			for (const label of labels) {
				const near = box(action(label));
				const far = box(pill(label));
				expect(isBeyond(placement, near, far)).toBe(true);
				expect(isCentredAlong(placement, near, far)).toBe(true);
			}
		},
	);

	test("the pill is the ink chip: 12px text, 5px 11px of padding and pill corners, on color-ink", async () => {
		render(
			<Dial defaultOpen openOnHover={false}>
				{contactActions({}, { tooltipOpen: true })}
			</Dial>,
		);
		await expectOpen();
		const style = getComputedStyle(pill("Copy link"));
		expect(style.fontSize).toBe("12px");
		expect(style.padding).toBe("5px 11px");
		expect(style.borderTopLeftRadius).toBe(
			resolved("borderTopLeftRadius", "--radius-pill"),
		);
		expect(style.backgroundColor).toBe(
			resolved("backgroundColor", "--color-ink"),
		);
		expect(style.color).toBe(resolved("color", "--on-ink"));
	});
});

describe("SpeedDial: the icon and the motion", () => {
	test("the plus turns 45° into a close as the dial opens, over duration-surface, and back as it closes", async () => {
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false} />
		);
		const { rerender } = render(view(false));
		const plus = glyphIn(trigger(), "plus");
		expect(turnOf(plus, trigger())).toBe(0);
		rerender(view(true));
		const durations = await vi.waitFor(
			() => {
				const turning = trigger()
					.getAnimations({ subtree: true })
					.filter(
						(animation) =>
							animation instanceof CSSTransition &&
							/^(?:transform|rotate)$/v.test(animation.transitionProperty),
					)
					.map((animation) =>
						Math.round(Number(animation.effect?.getTiming().duration)),
					);
				expect(turning).not.toHaveLength(0);
				return turning;
			},
			{ interval: 5, timeout: 2000 },
		);
		expect(durations).toContain(resolvedMs("--duration-surface"));
		await expect.poll(() => turnOf(plus, trigger())).toBe(45);
		rerender(view(false));
		await expect.poll(() => turnOf(plus, trigger())).toBe(0);
	});

	test("with openIcon it cross-fades instead: open, the second icon shows upright and the plus is gone; closed, the plus is back", async () => {
		const view = (isDialOpen: boolean) => (
			<Dial
				open={isDialOpen}
				openOnHover={false}
				icon={<SpeedDialIcon openIcon={<Icon name="edit" />} />}
			/>
		);
		const { rerender } = render(view(false));
		const plus = glyphIn(trigger(), "plus");
		const edit = glyphIn(trigger(), "edit");
		await expect.poll(() => [opacityOf(plus), opacityOf(edit)]).toEqual([1, 0]);
		rerender(view(true));
		await expect.poll(() => [opacityOf(plus), opacityOf(edit)]).toEqual([0, 1]);
		await expect.poll(() => turnOf(edit, trigger())).toBe(0);
		rerender(view(false));
		await expect.poll(() => [opacityOf(plus), opacityOf(edit)]).toEqual([1, 0]);
		await expect.poll(() => turnOf(plus, trigger())).toBe(0);
	});

	test("SpeedDialIcon's open overrides the dial's state", async () => {
		render(
			<>
				<span data-testid="alone">
					<SpeedDialIcon open />
				</span>
				<Dial
					defaultOpen
					openOnHover={false}
					icon={<SpeedDialIcon open={false} />}
				/>
			</>,
		);
		const alone = screen.getByTestId("alone");
		const alonePlus = glyphIn(alone, "plus");
		await expect.poll(() => turnOf(alonePlus, alone)).toBe(45);
		await expectOpen();
		await pause(300);
		const plusAgain = glyphIn(trigger(), "plus");
		expect(turnOf(plusAgain, trigger())).toBe(0);
	});

	test("SpeedDialIcon's icon replaces the plus", () => {
		render(
			<Dial
				openOnHover={false}
				icon={<SpeedDialIcon icon={<Icon name="share" />} />}
			/>,
		);
		expect(glyphsIn(trigger())).toEqual([glyph("share")]);
	});

	test("SpeedDialIcon's ref is its span, which takes className and the other attributes", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(<SpeedDialIcon ref={ref} className="dial-icon" data-track="icon" />);
		const span = must(ref.current);
		expect(span).toBeInstanceOf(HTMLSpanElement);
		expect(span).toHaveClass("dial-icon");
		expect(span).toHaveAttribute("data-track", "icon");
		expect(glyphsIn(span)).toEqual([glyph("plus")]);
	});

	test("the actions zoom in one after another, nearest first, 40ms apart", async () => {
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false} />
		);
		const { rerender } = render(view(false));
		const buttons = labels.map((label) => anyAction(label));
		// Taken before the dial opens, so each time can only run long.
		const start = performance.now();
		rerender(view(true));
		const times = await firstTimes(
			buttons,
			(element) => opacityOf(element) > 0,
			start,
		);
		for (const [index, time] of times.entries()) {
			const stagger = index * 40;
			expect(time).toBeGreaterThanOrEqual(stagger - 10);
			expect(time).toBeLessThan(1500);
			if (index > 0) {
				expect(time).toBeGreaterThanOrEqual(times[index - 1]);
			}
		}

		await expectOpen();
	});

	test("they zoom out the other way, farthest first, 25ms apart", async () => {
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false} />
		);
		const { rerender } = render(view(true));
		await expectOpen();
		const buttons = labels.map((label) => anyAction(label)).toReversed();
		const start = performance.now();
		rerender(view(false));
		const times = await firstTimes(
			buttons,
			(element) => opacityOf(element) < 1,
			start,
		);
		for (const [index, time] of times.entries()) {
			const stagger = index * 25;
			expect(time).toBeGreaterThanOrEqual(stagger - 10);
			expect(time).toBeLessThan(1500);
			if (index > 0) {
				expect(time).toBeGreaterThanOrEqual(times[index - 1]);
			}
		}

		await expectClosed();
	});

	test("each action zooms in from 0.85 with its opacity, over 220ms with ease-out-quint", async () => {
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false} />
		);
		const { rerender } = render(view(false));
		const farthest = anyAction("Download résumé");
		rerender(view(true));
		// Its turn comes last, so it still waits where it starts.
		expect(scaleOf(farthest)).toBeCloseTo(0.85);
		expect(opacityOf(farthest)).toBe(0);
		const list = menu();
		const timings = await vi.waitFor(
			() => {
				const running = list
					.getAnimations({ subtree: true })
					.filter((animation) => animation instanceof CSSTransition)
					.map((animation) => {
						const timing = must(animation.effect).getTiming();
						return [
							animation.transitionProperty,
							Math.round(Number(timing.duration)),
							timing.easing,
						];
					});
				expect(running.map(([property]) => property)).toEqual(
					expect.arrayContaining(["opacity", "transform"]),
				);
				return running;
			},
			{ interval: 5, timeout: 2000 },
		);
		const easeOutQuint = resolved(
			"transitionTimingFunction",
			"--ease-out-quint",
		);
		expect(timings).toContainEqual(["opacity", 220, easeOutQuint]);
		expect(timings).toContainEqual(["transform", 220, easeOutQuint]);
		await expectOpen();
	});

	test("delay sets an action's own entry delay", async () => {
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false}>
				<SpeedDialAction icon={<Icon name="mail" />} tooltipTitle="Email me" />
				<SpeedDialAction
					icon={<Icon name="link" />}
					tooltipTitle="Copy link"
					delay={300}
				/>
			</Dial>
		);
		const { rerender } = render(view(false));
		const among = ["Email me", "Copy link"];
		const buttons = among.map((label) => anyAction(label, among));
		const start = performance.now();
		rerender(view(true));
		const [first, late] = await firstTimes(
			buttons,
			(element) => opacityOf(element) > 0,
			start,
		);
		expect(late).toBeGreaterThanOrEqual(290);
		expect(late).toBeGreaterThan(first);
		await expectOpen(["Email me", "Copy link"]);
	});
});

describe("SpeedDial under reduced motion", () => {
	beforeEach(async () => {
		await emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
		expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
	});

	afterEach(async () => {
		await emulateMedia([]);
	});

	test("the actions appear together, with no stagger, and only fade", async () => {
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false} />
		);
		const { rerender } = render(view(false));
		const buttons = labels.map((label) => anyAction(label));
		let hasMoved = false;
		const watchMotion = () => {
			hasMoved ||= buttons.some(
				(element) => Math.abs(scaleOf(element) - 1) > 0.001,
			);
		};

		const start = performance.now();
		rerender(view(true));
		const times = await firstTimes(
			buttons,
			(element) => {
				watchMotion();
				return opacityOf(element) > 0;
			},
			start,
		);
		expect(Math.max(...times) - Math.min(...times)).toBeLessThan(20);
		await sampleFor(400, watchMotion);
		expect(hasMoved).toBe(false);
		await expectOpen();
	});

	test("the plus doesn't turn: the close appears at once", async () => {
		const view = (isDialOpen: boolean) => (
			<Dial open={isDialOpen} openOnHover={false} />
		);
		const { rerender } = render(view(false));
		const plus = glyphIn(trigger(), "plus");
		rerender(view(true));
		expect(turnOf(plus, trigger())).toBe(45);
		expect(
			trigger()
				.getAnimations({ subtree: true })
				.filter(
					(animation) =>
						animation instanceof CSSTransition &&
						/^(?:transform|rotate)$/v.test(animation.transitionProperty),
				),
		).toEqual([]);
	});
});

describe("SpeedDialAction", () => {
	test("the ref is the action's root span, which holds its button and takes className, style, id and the other attributes", async () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<Dial defaultOpen openOnHover={false}>
				<SpeedDialAction icon={<Icon name="mail" />} tooltipTitle="Email me" />
				<SpeedDialAction
					ref={ref}
					id="copy-action"
					className="copy"
					style={{ marginTop: 4 }}
					data-track="copy"
					icon={<Icon name="link" />}
					tooltipTitle="Copy link"
				/>
			</Dial>,
		);
		await expectOpen(["Email me", "Copy link"]);
		const root = must(ref.current);
		expect(root).toBeInstanceOf(HTMLSpanElement);
		expect(root.contains(action("Copy link"))).toBe(true);
		expect(root).toHaveAttribute("id", "copy-action");
		expect(root).toHaveClass("copy");
		expect(getComputedStyle(root).marginTop).toBe("4px");
		expect(root).toHaveAttribute("data-track", "copy");
	});

	test("FabProps reach the action's button: its className, title and size", async () => {
		render(
			<Dial defaultOpen openOnHover={false}>
				{contactActions({
					"Copy link": {
						FabProps: {
							className: "copy-button",
							title: "Copies the page's address",
							size: "md",
						},
					},
				})}
			</Dial>,
		);
		await expectOpen();
		const copy = action("Copy link");
		expect(copy).toHaveClass("copy-button");
		expect(copy).toHaveAttribute("title", "Copies the page's address");
		expect(dimensions(copy)).toEqual([46, 46]);
	});
});
