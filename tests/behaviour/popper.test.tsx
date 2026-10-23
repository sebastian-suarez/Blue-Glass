import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	computePosition,
	containingBlock,
	Grow,
	Popper,
	positionFixed,
	splitPlacement,
	type Placement,
	type PopperChildProps,
	type PopperProps,
	type VirtualElement,
} from "#ui";

afterEach(() => {
	cleanup();
});

type Box = { left: number; top: number; width: number; height: number };

const centre: Box = { left: 157, top: 420, width: 100, height: 40 };

type HarnessProps = Omit<PopperProps, "open" | "anchorEl"> & {
	readonly open?: boolean;
	readonly at?: Box;
	readonly ref?: React.Ref<HTMLDivElement>;
};

function Harness({
	open = true,
	at = centre,
	children = defaultHint,
	...props
}: HarnessProps) {
	const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
	return (
		<>
			<button
				ref={setAnchor}
				type="button"
				style={{
					position: "fixed",
					left: at.left,
					top: at.top,
					width: at.width,
					height: at.height,
					margin: 0,
				}}
			>
				Anchor
			</button>
			<Popper open={open && anchor !== null} anchorEl={anchor} {...props}>
				{children}
			</Popper>
		</>
	);
}

function Hint({
	width = 80,
	height = 30,
}: {
	readonly width?: number;
	readonly height?: number;
}) {
	return <div style={{ width, height }}>Hint</div>;
}

const defaultHint = <Hint />;

function anchorButton(): HTMLElement {
	return screen.getByRole("button", { name: "Anchor" });
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
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
	content: Element,
	anchor: Element,
	placement: Placement,
	offset: number,
) {
	const [side, align = "center"] = placement.split("-", 2);
	const a = box(anchor);
	const c = box(content);
	switch (side) {
		case "top": {
			expectNear(c.bottom, a.top - offset, "bottom edge");
			break;
		}

		case "bottom": {
			expectNear(c.top, a.bottom + offset, "top edge");
			break;
		}

		case "left": {
			expectNear(c.right, a.left - offset, "right edge");
			break;
		}

		default: {
			expectNear(c.left, a.right + offset, "left edge");
		}
	}

	const isVertical = side === "top" || side === "bottom";
	if (align === "start") {
		if (isVertical) {
			expectNear(c.left, a.left, "start edge");
		} else {
			expectNear(c.top, a.top, "start edge");
		}
	} else if (align === "end") {
		if (isVertical) {
			expectNear(c.right, a.right, "end edge");
		} else {
			expectNear(c.bottom, a.bottom, "end edge");
		}
	} else if (isVertical) {
		const contentHalf = c.width / 2;
		const anchorHalf = a.width / 2;
		expectNear(c.left + contentHalf, a.left + anchorHalf, "centre");
	} else {
		const contentHalf = c.height / 2;
		const anchorHalf = a.height / 2;
		expectNear(c.top + contentHalf, a.top + anchorHalf, "centre");
	}
}

function isShown(element: Element | null): boolean {
	if (!element?.isConnected) {
		return false;
	}

	const { width, height } = box(element);
	return (
		width > 0 &&
		height > 0 &&
		element.checkVisibility({ visibilityProperty: true })
	);
}

function isHiddenFromAssistiveTech(element: Element): boolean {
	return element.closest('[aria-hidden="true"], [inert]') !== null;
}

function leadingNumber(value: string): number {
	// eslint-disable-next-line unicorn/prefer-number-coercion -- Number() turns a value with a unit into NaN
	return Number.parseFloat(value);
}

function token(name: string): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
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

describe("Popper", () => {
	test("open shows the content next to the anchor, and closing removes it", async () => {
		const { rerender } = render(<Harness open={false} />);
		expect(screen.queryByText("Hint")).toBeNull();
		rerender(<Harness />);
		const hint = await screen.findByText("Hint");
		await vi.waitFor(() => {
			expect(isShown(hint)).toBe(true);
			expectPlaced(hint, anchorButton(), "bottom", 8);
		});
		rerender(<Harness open={false} />);
		await expect.poll(() => screen.queryByText("Hint")).toBeNull();
	});

	test("by default it sits below the anchor, centred, 8px away", async () => {
		render(<Harness />);
		const hint = await screen.findByText("Hint");
		await vi.waitFor(() => {
			expectPlaced(hint, anchorButton(), "bottom", 8);
		});
	});

	test.each(placements)(
		"placement %s puts it on that side, 8px away, lined up as named",
		async (placement) => {
			render(<Harness placement={placement} />);
			const hint = await screen.findByText("Hint");
			await vi.waitFor(() => {
				expectPlaced(hint, anchorButton(), placement, 8);
			});
		},
	);

	test.each([0, 20])(
		"offset %ipx sets the gap to the anchor",
		async (offset) => {
			render(<Harness placement="top" offset={offset} />);
			const hint = await screen.findByText("Hint");
			await vi.waitFor(() => {
				expectPlaced(hint, anchorButton(), "top", offset);
			});
		},
	);

	const flips = [
		{
			placement: "bottom",
			lands: "top",
			at: { left: 157, top: 846, width: 100, height: 40 },
		},
		{
			placement: "top",
			lands: "bottom",
			at: { left: 157, top: 10, width: 100, height: 40 },
		},
		{
			placement: "left",
			lands: "right",
			at: { left: 10, top: 420, width: 60, height: 40 },
		},
		{
			placement: "right",
			lands: "left",
			at: { left: 344, top: 420, width: 60, height: 40 },
		},
	] as const;

	test.each(flips)(
		"with no room on the $placement side it flips to $lands, and the children get the placement it landed on",
		async ({ placement, lands, at }) => {
			render(
				<Harness transition placement={placement} at={at}>
					{({ placement: current, TransitionProps }: PopperChildProps) => (
						<Grow {...TransitionProps}>
							<div style={{ width: 80, height: 30 }}>{`Placed ${current}`}</div>
						</Grow>
					)}
				</Harness>,
			);
			const content = await screen.findByText(/^Placed /v);
			await vi.waitFor(() => {
				expect(content).toHaveTextContent(`Placed ${lands}`);
				expectPlaced(content, anchorButton(), lands, 8);
			});
		},
	);

	const shifts = [
		{
			edge: "left",
			placement: "bottom",
			at: { left: 0, top: 420, width: 20, height: 40 },
			size: { width: 200, height: 30 },
		},
		{
			edge: "right",
			placement: "top",
			at: { left: 394, top: 420, width: 20, height: 40 },
			size: { width: 200, height: 30 },
		},
		{
			edge: "top",
			placement: "right",
			at: { left: 157, top: 0, width: 60, height: 20 },
			size: { width: 80, height: 200 },
		},
	] as const;

	test.each(shifts)(
		"next to the $edge edge it shifts along its side to stay on screen",
		async ({ placement, at, size }) => {
			render(
				<Harness placement={placement} at={at}>
					<Hint {...size} />
				</Harness>,
			);
			const hint = await screen.findByText("Hint");
			await vi.waitFor(() => {
				const c = box(hint);
				const a = box(anchorButton());
				expect(c.left).toBeGreaterThanOrEqual(0);
				expect(c.top).toBeGreaterThanOrEqual(0);
				expect(c.right).toBeLessThanOrEqual(window.innerWidth);
				expect(c.bottom).toBeLessThanOrEqual(window.innerHeight);
				if (placement === "bottom") {
					expectNear(c.top, a.bottom + 8, "top edge");
				} else if (placement === "top") {
					expectNear(c.bottom, a.top - 8, "bottom edge");
				} else {
					expectNear(c.left, a.right + 8, "left edge");
				}
			});
		},
	);

	test("anchorEl can be a virtual element, such as a cursor position", async () => {
		const cursor: VirtualElement = {
			getBoundingClientRect: () => new DOMRect(120, 300, 0, 0),
		};
		render(
			<Popper open anchorEl={cursor} placement="right-start" offset={14}>
				<Hint />
			</Popper>,
		);
		const hint = await screen.findByText("Hint");
		await vi.waitFor(() => {
			expectNear(box(hint).left, 134, "left edge");
			expectNear(box(hint).top, 300, "top edge");
		});
	});

	test("anchorEl can be a function that returns the anchor", async () => {
		function WithFunction() {
			const anchorRef = React.useRef<HTMLButtonElement>(null);
			const [ready, setReady] = React.useState(false);
			React.useEffect(() => {
				// eslint-disable-next-line react-hooks/set-state-in-effect -- the Popper opens once the anchor is mounted
				setReady(true);
			}, []);
			return (
				<>
					<button
						ref={anchorRef}
						type="button"
						style={{
							position: "fixed",
							left: 157,
							top: 420,
							width: 100,
							height: 40,
							margin: 0,
						}}
					>
						Anchor
					</button>
					<Popper
						open={ready}
						anchorEl={() => anchorRef.current}
						placement="top"
					>
						<Hint />
					</Popper>
				</>
			);
		}

		render(<WithFunction />);
		const hint = await screen.findByText("Hint");
		await vi.waitFor(() => {
			expectPlaced(hint, anchorButton(), "top", 8);
		});
	});

	test("matchWidth makes it at least as wide as the anchor", async () => {
		const wide = { left: 87, top: 420, width: 240, height: 40 };
		const { rerender } = render(
			<Harness at={wide}>
				<div>Hint</div>
			</Harness>,
		);
		const hint = await screen.findByText("Hint");
		await vi.waitFor(() => {
			expect(box(hint).width).toBeLessThan(240);
		});
		rerender(
			<Harness matchWidth at={wide}>
				<div>Hint</div>
			</Harness>,
		);
		await vi.waitFor(() => {
			expect(box(hint).width).toBeGreaterThanOrEqual(239);
			expectNear(box(hint).top, box(anchorButton()).bottom + 8, "top edge");
		});
	});

	test("keepMounted keeps the content in the document, hidden, while closed", async () => {
		const { rerender } = render(<Harness keepMounted open={false} />);
		const hint = screen.getByText("Hint");
		expect(isShown(hint)).toBe(false);
		rerender(<Harness keepMounted />);
		await vi.waitFor(() => {
			expect(isShown(hint)).toBe(true);
			expectPlaced(hint, anchorButton(), "bottom", 8);
		});
		rerender(<Harness keepMounted open={false} />);
		await expect.poll(() => isShown(hint)).toBe(false);
		expect(hint).toBeInTheDocument();
	});

	test("keepMounted with a transition hides the content once it has exited, and keeps it", async () => {
		const child = ({ TransitionProps }: PopperChildProps) => (
			<Grow {...TransitionProps}>
				<div style={{ width: 80, height: 30 }}>Hint</div>
			</Grow>
		);
		const { rerender } = render(
			<Harness transition keepMounted>
				{child}
			</Harness>,
		);
		const hint = await screen.findByText("Hint");
		await expect.poll(() => isShown(hint)).toBe(true);
		rerender(
			<Harness transition keepMounted open={false}>
				{child}
			</Harness>,
		);
		await expect.poll(() => isShown(hint)).toBe(false);
		expect(hint).toBeInTheDocument();
	});

	test("it renders in document.body by default, and in place with disablePortal", async () => {
		const { container, rerender } = render(<Harness />);
		const portalled = await screen.findByText("Hint");
		expect(container.contains(portalled)).toBe(false);
		expect(document.body.contains(portalled)).toBe(true);
		rerender(<Harness disablePortal />);
		await vi.waitFor(() => {
			expect(container.contains(screen.getByText("Hint"))).toBe(true);
		});
	});

	test.each(["an element", "a function returning one"] as const)(
		"container takes %s as the mount point",
		async (kind) => {
			const host = document.createElement("div");
			document.body.append(host);
			try {
				render(
					<Harness container={kind === "an element" ? host : () => host} />,
				);
				const hint = await screen.findByText("Hint");
				expect(host.contains(hint)).toBe(true);
			} finally {
				cleanup();
				host.remove();
			}
		},
	);

	test("the ref, className and other attributes go to the Popper's own element, a position: fixed layer that holds the content", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Harness
				ref={ref}
				role="group"
				aria-label="Placement hint"
				id="placement-layer"
				className="my-layer"
			/>,
		);
		const layer = await screen.findByRole("group", { name: "Placement hint" });
		expect(ref.current).toBe(layer);
		expect(layer).toBeInstanceOf(HTMLDivElement);
		expect(layer.id).toBe("placement-layer");
		expect(layer).toHaveClass("my-layer");
		expect(layer).toContainElement(screen.getByText("Hint"));
		expect(getComputedStyle(layer).position).toBe("fixed");
	});

	test("Popper adds no styling of its own: no fill, border, padding or shadow", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<Harness ref={ref} />);
		await screen.findByText("Hint");
		const style = getComputedStyle(ref.current!);
		expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)");
		expect(style.backgroundImage).toBe("none");
		expect(style.borderTopWidth).toBe("0px");
		expect(style.paddingTop).toBe("0px");
		expect(style.paddingLeft).toBe("0px");
		expect(style.boxShadow).toBe("none");
	});

	test("zIndex is the z-modal token by default, and takes a number or a token", async () => {
		const ref = React.createRef<HTMLDivElement>();
		const { rerender } = render(<Harness ref={ref} />);
		await screen.findByText("Hint");
		expect(getComputedStyle(ref.current!).zIndex).toBe(token("--z-modal"));
		rerender(<Harness ref={ref} zIndex={1234} />);
		await expect.poll(() => getComputedStyle(ref.current!).zIndex).toBe("1234");
		rerender(<Harness ref={ref} zIndex="var(--z-tooltip)" />);
		await expect
			.poll(() => getComputedStyle(ref.current!).zIndex)
			.toBe(token("--z-tooltip"));
	});

	test("with transition, the children get TransitionProps, and the content stays until its exit has run", async () => {
		const renderChild = vi.fn(({ TransitionProps }: PopperChildProps) => (
			<Grow {...TransitionProps}>
				<div style={{ width: 80, height: 30 }}>Hint</div>
			</Grow>
		));
		const { rerender } = render(<Harness transition>{renderChild}</Harness>);
		const hint = await screen.findByText("Hint");
		await expect.poll(() => isShown(hint)).toBe(true);
		expect(renderChild.mock.lastCall?.[0].TransitionProps.in).toBe(true);
		rerender(
			<Harness transition open={false}>
				{renderChild}
			</Harness>,
		);
		expect(hint).toBeInTheDocument();
		expect(renderChild.mock.lastCall?.[0].TransitionProps.in).toBe(false);
		await expect.poll(() => screen.queryByText("Hint")).toBeNull();
	});

	test("it is non-modal: focus stays put, and the page stays exposed and clickable", async () => {
		const onClick = vi.fn<() => void>();
		function Page({ open }: { readonly open: boolean }) {
			return (
				<>
					<button type="button" onClick={onClick}>
						Elsewhere
					</button>
					<Harness open={open} />
				</>
			);
		}

		const { rerender } = render(<Page open={false} />);
		const elsewhere = screen.getByRole("button", { name: "Elsewhere" });
		elsewhere.focus();
		rerender(<Page open />);
		const hint = await screen.findByText("Hint");
		await expect.poll(() => isShown(hint)).toBe(true);
		expect(elsewhere).toHaveFocus();
		expect(isHiddenFromAssistiveTech(elsewhere)).toBe(false);
		await userEvent.click(elsewhere);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(isShown(hint)).toBe(true);
	});

	test("it follows the anchor when a scrolling ancestor scrolls", async () => {
		function Scroller() {
			const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
			return (
				<div
					role="region"
					aria-label="Scroller"
					style={{
						position: "fixed",
						left: 20,
						top: 100,
						width: 300,
						height: 400,
						overflow: "auto",
					}}
				>
					<div style={{ position: "relative", height: 1200 }}>
						<button
							ref={setAnchor}
							type="button"
							style={{
								position: "absolute",
								left: 100,
								top: 150,
								width: 100,
								height: 40,
								margin: 0,
							}}
						>
							Anchor
						</button>
					</div>
					<Popper open={anchor !== null} anchorEl={anchor}>
						<Hint />
					</Popper>
				</div>
			);
		}

		render(<Scroller />);
		const hint = await screen.findByText("Hint");
		await vi.waitFor(() => {
			expectPlaced(hint, anchorButton(), "bottom", 8);
		});
		const before = box(anchorButton()).top;
		screen.getByRole("region", { name: "Scroller" }).scrollTop = 60;
		await vi.waitFor(() => {
			expectNear(box(anchorButton()).top, before - 60, "anchor");
			expectPlaced(hint, anchorButton(), "bottom", 8);
		});
	});

	test("it follows the anchor when the anchor resizes", async () => {
		render(<Harness placement="bottom" />);
		const hint = await screen.findByText("Hint");
		await vi.waitFor(() => {
			expectPlaced(hint, anchorButton(), "bottom", 8);
		});
		anchorButton().style.width = "220px";
		await vi.waitFor(() => {
			expect(box(anchorButton()).width).toBe(220);
			expectPlaced(hint, anchorButton(), "bottom", 8);
		});
	});

	const blocks = [
		{ kind: "transform", style: { transform: "translateZ(0)" } },
		{ kind: "filter", style: { filter: "saturate(1)" } },
		{ kind: "backdrop-filter", style: { backdropFilter: "blur(4px)" } },
	] as const;

	test.each(blocks)(
		"with disablePortal inside an ancestor with a $kind, it still sits next to the anchor",
		async ({ style }) => {
			function Panel() {
				const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
				return (
					<div
						style={{
							position: "fixed",
							left: 40,
							top: 120,
							width: 300,
							height: 300,
							...style,
						}}
					>
						<button
							ref={setAnchor}
							type="button"
							style={{
								position: "absolute",
								left: 100,
								top: 100,
								width: 60,
								height: 30,
								margin: 0,
							}}
						>
							Anchor
						</button>
						<Popper
							disablePortal
							open={anchor !== null}
							anchorEl={anchor}
							placement="bottom"
						>
							<Hint />
						</Popper>
					</div>
				);
			}

			render(<Panel />);
			const hint = await screen.findByText("Hint");
			await vi.waitFor(() => {
				expectPlaced(hint, anchorButton(), "bottom", 8);
			});
		},
	);

	const origins = [
		{ placement: "bottom-start", size: { width: 160, height: 30 } },
		{ placement: "top-end", size: { width: 160, height: 30 } },
		{ placement: "left-start", size: { width: 80, height: 120 } },
		{ placement: "right-end", size: { width: 80, height: 120 } },
	] as const;

	test.each(origins)(
		"--gl-transform-origin, at $placement, is on the edge facing the anchor, at the anchor's centre",
		async ({ placement, size }) => {
			const at = { left: 157, top: 420, width: 40, height: 40 };
			render(
				<Harness placement={placement} at={at}>
					<div
						style={{ ...size, transformOrigin: "var(--gl-transform-origin)" }}
					>
						Hint
					</div>
				</Harness>,
			);
			const hint = await screen.findByText("Hint");
			await vi.waitFor(() => {
				const origin = getComputedStyle(hint).transformOrigin.split(" ", 2);
				const [x = NaN, y = NaN] = origin.map((value) => leadingNumber(value));
				const c = box(hint);
				const a = box(anchorButton());
				const point = { x: c.left + x, y: c.top + y };
				const side = placement.split("-", 1)[0];
				if (side === "bottom" || side === "top") {
					expectNear(
						point.y,
						side === "bottom" ? c.top : c.bottom,
						"origin's edge",
					);
					const anchorHalf = a.width / 2;
					expectNear(point.x, a.left + anchorHalf, "origin's centre");
				} else {
					expectNear(
						point.x,
						side === "right" ? c.left : c.right,
						"origin's edge",
					);
					const anchorHalf = a.height / 2;
					expectNear(point.y, a.top + anchorHalf, "origin's centre");
				}
			});
		},
	);

	test.each(["bottom", "top"] as const)(
		"--gl-available-height holds the space left on the %s side",
		async (placement) => {
			render(<Harness placement={placement} />);
			const hint = await screen.findByText("Hint");
			await vi.waitFor(() => {
				expectPlaced(hint, anchorButton(), placement, 8);
			});
			const available = leadingNumber(
				getComputedStyle(hint).getPropertyValue("--gl-available-height"),
			);
			const a = box(anchorButton());
			const space =
				(placement === "bottom" ? window.innerHeight - a.bottom : a.top) - 8;
			expect(available).toBeLessThanOrEqual(space);
			expect(available).toBeGreaterThanOrEqual(space - 16);
		},
	);
});

describe("computePosition", () => {
	const viewport = { width: 400, height: 800 };
	const anchor = new DOMRect(150, 300, 100, 40);
	const floating = { width: 80, height: 30 };

	function originPoint(
		origin: string,
		size: { width: number; height: number },
	) {
		const [x = "", y = ""] = origin.split(" ", 2);
		const resolve = (value: string, length: number) =>
			value.endsWith("%")
				? (leadingNumber(value) / 100) * length
				: leadingNumber(value);
		return { x: resolve(x, size.width), y: resolve(y, size.height) };
	}

	test.each([
		{ placement: "bottom", x: 160, y: 348 },
		{ placement: "bottom-start", x: 150, y: 348 },
		{ placement: "bottom-end", x: 170, y: 348 },
		{ placement: "top", x: 160, y: 262 },
		{ placement: "top-start", x: 150, y: 262 },
		{ placement: "left", x: 62, y: 305 },
		{ placement: "left-end", x: 62, y: 310 },
		{ placement: "right", x: 258, y: 305 },
		{ placement: "right-start", x: 258, y: 300 },
	] as const)(
		"$placement places the box on that side, offset away, lined up as named",
		({ placement, x, y }) => {
			const result = computePosition(anchor, floating, {
				placement,
				offset: 8,
				viewport,
			});
			expect(result).toMatchObject({ x, y, placement });
		},
	);

	test("it flips to the other side when the preferred one has no room, unless flip is false", () => {
		const low = new DOMRect(150, 760, 100, 30);
		expect(
			computePosition(low, floating, {
				placement: "bottom",
				offset: 8,
				viewport,
			}),
		).toMatchObject({ placement: "top", y: 722 });
		expect(
			computePosition(low, floating, {
				placement: "bottom",
				offset: 8,
				viewport,
				flip: false,
			}),
		).toMatchObject({ placement: "bottom", y: 798 });
	});

	test("it shifts along the side to keep padding clear of the edge, unless shift is false", () => {
		const edge = new DOMRect(0, 300, 20, 40);
		const wide = { width: 200, height: 30 };
		const options = { placement: "bottom", offset: 8, viewport } as const;
		expect(computePosition(edge, wide, { ...options, padding: 8 }).x).toBe(8);
		expect(computePosition(edge, wide, { ...options, padding: 20 }).x).toBe(20);
		expect(computePosition(edge, wide, { ...options, shift: false }).x).toBe(
			-90,
		);
	});

	test("maxHeight is the space left on the chosen side", () => {
		const result = computePosition(anchor, floating, {
			placement: "bottom",
			offset: 8,
			padding: 8,
			viewport,
		});
		expect(result.maxHeight).toBe(444);
	});

	test("matchWidth gives a minWidth of the anchor's width and centres that width", () => {
		const narrow = { width: 60, height: 30 };
		const result = computePosition(anchor, narrow, {
			placement: "bottom",
			offset: 8,
			viewport,
			matchWidth: true,
		});
		expect(result.minWidth).toBe(100);
		expect(result.x).toBe(150);
		expect(
			computePosition(anchor, narrow, {
				placement: "bottom",
				offset: 8,
				viewport,
			}).minWidth,
		).toBeUndefined();
	});

	test.each([
		{ placement: "bottom-start", edge: "top" },
		{ placement: "top", edge: "bottom" },
		{ placement: "right-end", edge: "left" },
		{ placement: "left", edge: "right" },
	] as const)(
		"origin, at $placement, is on the box's $edge edge, at the anchor's centre",
		({ placement, edge }) => {
			const result = computePosition(anchor, floating, {
				placement,
				offset: 8,
				viewport,
			});
			const point = originPoint(result.origin, floating);
			const anchorCentre = { x: 200 - result.x, y: 320 - result.y };
			switch (edge) {
				case "top": {
					expect(point).toEqual({ x: anchorCentre.x, y: 0 });
					break;
				}

				case "bottom": {
					expect(point).toEqual({ x: anchorCentre.x, y: floating.height });
					break;
				}

				case "left": {
					expect(point).toEqual({ x: 0, y: anchorCentre.y });
					break;
				}

				case "right": {
					expect(point).toEqual({ x: floating.width, y: anchorCentre.y });
				}
			}
		},
	);

	test("without viewport it stays inside the window", () => {
		const low = new DOMRect(150, window.innerHeight - 40, 100, 30);
		const result = computePosition(low, floating, {
			placement: "bottom",
			offset: 8,
		});
		expect(result.placement).toBe("top");
		expect(result.y).toBe(window.innerHeight - 40 - 30 - 8);
	});
});

describe("positionFixed, containingBlock and splitPlacement", () => {
	function Panel({ style }: { readonly style?: React.CSSProperties }) {
		return (
			<div
				style={{
					position: "fixed",
					left: 40,
					top: 120,
					width: 300,
					height: 300,
					...style,
				}}
			>
				<div style={{ position: "fixed", width: 80, height: 30 }}>Floating</div>
			</div>
		);
	}

	test("containingBlock is the box of an ancestor that contains fixed elements, or null for the viewport", () => {
		const { rerender } = render(
			<Panel style={{ transform: "translateZ(0)" }} />,
		);
		expect(containingBlock(screen.getByText("Floating"))).toEqual({
			x: 40,
			y: 120,
			width: 300,
			height: 300,
		});
		rerender(<Panel />);
		expect(containingBlock(screen.getByText("Floating"))).toBeNull();
	});

	test("positionFixed positions an element in its containing block's coordinates, with its own size", () => {
		const { rerender } = render(
			<Panel style={{ transform: "translateZ(0)" }} />,
		);
		const target = new DOMRect(140, 220, 60, 30);
		expect(
			positionFixed(target, screen.getByText("Floating"), {
				placement: "bottom",
				offset: 8,
			}),
		).toMatchObject({ x: 90, y: 138, placement: "bottom" });
		rerender(<Panel />);
		expect(
			positionFixed(target, screen.getByText("Floating"), {
				placement: "bottom",
				offset: 8,
			}),
		).toMatchObject({ x: 130, y: 258, placement: "bottom" });
	});

	test("splitPlacement gives the side and the alignment, centre when none is named", () => {
		expect(splitPlacement("top-start")).toEqual(["top", "start"]);
		expect(splitPlacement("right-end")).toEqual(["right", "end"]);
		expect(splitPlacement("left")).toEqual(["left", "center"]);
	});
});
