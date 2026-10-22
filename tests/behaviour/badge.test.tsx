import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import "#ui/styles.css";
import { Badge, type BadgeProps, type BadgeTone, Button } from "#ui";

afterEach(() => {
	cleanup();
});

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

/**
The text a screen reader reads inside an element, in document order: what is aria-hidden or not
displayed is left out, and an element with an aria-label reads as its label. Text runs are
joined with spaces, so it checks the words and their order, not the spacing between them.
*/
function spoken(element: Element): string {
	const parts: string[] = [];
	const walk = (node: Node) => {
		if (node instanceof Text) {
			parts.push(node.data);
			return;
		}

		if (
			!(node instanceof Element) ||
			node.getAttribute("aria-hidden") === "true"
		) {
			return;
		}

		const style = getComputedStyle(node);
		if (style.display === "none" || style.visibility === "hidden") {
			return;
		}

		const label = node.getAttribute("aria-label");
		if (label !== null && label !== "") {
			parts.push(label);
			return;
		}

		for (const child of node.childNodes) {
			walk(child);
		}
	};

	for (const child of element.childNodes) {
		walk(child);
	}

	return parts.join(" ").replaceAll(/\s+/gv, " ").trim();
}

/**
Whether the element shows on screen: not hidden or transparent, and bigger than the pixel a
visually hidden text is clipped to.
*/
function isShown(element: Element): boolean {
	const box = element.getBoundingClientRect();
	return (
		element.checkVisibility({
			opacityProperty: true,
			visibilityProperty: true,
		}) &&
		box.width > 1 &&
		box.height > 1
	);
}

/**
Read by screen readers but not seen: a box of a pixel or less, as gl-sr-only clips it.
*/
function isVisuallyHidden(element: Element): boolean {
	const box = element.getBoundingClientRect();
	return (
		element.checkVisibility({ visibilityProperty: true }) &&
		box.width <= 1 &&
		box.height <= 1
	);
}

/**
Whether any element showing this exact text is on screen.
*/
function isTextShown(text: string): boolean {
	return screen.queryAllByText(text).some((element) => isShown(element));
}

function centre(element: Element): { x: number; y: number } {
	const box = element.getBoundingClientRect();
	const halfWidth = box.width / 2;
	const halfHeight = box.height / 2;
	return { x: box.left + halfWidth, y: box.top + halfHeight };
}

async function nextFrame(): Promise<void> {
	await new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});
}

/**
The duration and easing of the animations a change starts on the element or inside it, once
there are some.
*/
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

async function atRest(element: Element): Promise<void> {
	await vi.waitFor(
		() => {
			expect(element.getAnimations({ subtree: true })).toEqual([]);
		},
		{ interval: 5, timeout: 2000 },
	);
}

/**
A 40px square to sit the badge on, like the preview's icon tiles.
*/
function Tile({ ref }: { readonly ref?: React.Ref<HTMLSpanElement> }) {
	return (
		<span
			ref={ref}
			style={{ display: "inline-block", width: 40, height: 40 }}
		/>
	);
}

const easeOutQuint = "cubic-bezier(0.23, 1, 0.32, 1)";

describe("Badge", () => {
	test("renders a span around its child, holding className, the ref and other attributes", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<Badge
				ref={ref}
				id="inbox-badge"
				className="custom"
				badgeContent={4}
				label="4 unread"
			>
				<span>Inbox</span>
			</Badge>,
		);
		const root = must(ref.current);
		expect(root).toBeInstanceOf(HTMLSpanElement);
		expect(root).toHaveAttribute("id", "inbox-badge");
		expect(root).toHaveClass("custom");
		expect(root).toContainElement(screen.getByText("Inbox"));
		expect(root).toContainElement(screen.getByText("4"));
	});

	test("component renders it as another element", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<Badge ref={ref} component="div" badgeContent={4} label="4 unread">
				<span>Inbox</span>
			</Badge>,
		);
		expect(ref.current).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toContainElement(screen.getByText("Inbox"));
	});

	test("the pill shows badgeContent and is aria-hidden; label is read after the child instead, visually hidden", () => {
		const { container } = render(
			<Badge badgeContent={4} label="4 unread">
				<span>Inbox</span>
			</Badge>,
		);
		const pill = screen.getByText("4");
		expect(isShown(pill)).toBe(true);
		expect(pill.closest('[aria-hidden="true"]')).not.toBeNull();
		const words = screen.getByText("4 unread");
		expect(isVisuallyHidden(words)).toBe(true);
		expect(spoken(container)).toBe("Inbox 4 unread");
	});

	test("with neither label nor aria-label, the bare count is read after the child", () => {
		const { container } = render(
			<Badge badgeContent={4}>
				<span>Inbox</span>
			</Badge>,
		);
		expect(isTextShown("4")).toBe(true);
		expect(spoken(container)).toBe("Inbox 4");
	});

	test('label="" adds nothing for screen readers when the child already says it', () => {
		const { container } = render(
			<Badge badgeContent={4} label="">
				<span>4 unread messages</span>
			</Badge>,
		);
		expect(isTextShown("4")).toBe(true);
		expect(spoken(container)).toBe("4 unread messages");
	});

	test("aria-label passes through to the child, which reads the count with its name, and no hidden text is added", () => {
		const { container } = render(
			<Badge badgeContent={4} aria-label="Messages, 4 unread">
				<Button>Messages</Button>
			</Badge>,
		);
		expect(
			screen.getByRole("button", { name: "Messages, 4 unread" }),
		).toBeVisible();
		expect(isTextShown("4")).toBe(true);
		expect(spoken(container)).toBe("Messages, 4 unread");
	});

	test("max caps a number at max+, 99 by default; words aren't capped", () => {
		const { container } = render(
			<>
				<p>
					<Badge badgeContent={120}>
						<span>Default cap</span>
					</Badge>
				</p>
				<p>
					<Badge badgeContent={99}>
						<span>At the cap</span>
					</Badge>
				</p>
				<p>
					<Badge badgeContent={1200} max={999}>
						<span>Own cap</span>
					</Badge>
				</p>
				<p>
					<Badge badgeContent="New" tone="accent">
						<span>Word</span>
					</Badge>
				</p>
			</>,
		);
		for (const text of ["99+", "99", "999+", "New"]) {
			expect(isTextShown(text)).toBe(true);
		}

		expect(screen.queryByText("120")).toBeNull();
		expect(screen.queryByText("1200")).toBeNull();
		const read = [...container.querySelectorAll("p")].map((paragraph) =>
			spoken(paragraph),
		);
		expect(read).toEqual([
			"Default cap 99+",
			"At the cap 99",
			"Own cap 999+",
			"Word New",
		]);
	});

	test("a count of 0 hides the pill and adds nothing for screen readers; showZero shows it", () => {
		const { container } = render(
			<>
				<p>
					<Badge badgeContent={0}>
						<span>Hidden zero</span>
					</Badge>
				</p>
				<p>
					<Badge showZero badgeContent={0}>
						<span>Shown zero</span>
					</Badge>
				</p>
			</>,
		);
		const [hidden, shown] = [...container.querySelectorAll("p")];
		expect(spoken(must(hidden))).toBe("Hidden zero");
		expect(spoken(must(shown))).toBe("Shown zero 0");
		const zeros = screen
			.queryAllByText("0")
			.filter((element) => isShown(element));
		expect(zeros).toHaveLength(1);
		expect(must(shown)).toContainElement(must(zeros[0]));
	});

	test("a count that drops to 0 scales out, and its words go with it", async () => {
		const view = (count: number) => (
			<Badge badgeContent={count} label={`${count} waiting`}>
				<span>Pull requests</span>
			</Badge>
		);
		const { container, rerender } = render(view(1));
		expect(spoken(container)).toBe("Pull requests 1 waiting");
		await nextFrame();
		rerender(view(0));
		await expect.poll(() => isTextShown("1") || isTextShown("0")).toBe(false);
		expect(spoken(container)).toBe("Pull requests");
	});

	test("invisible hides the pill and what it adds for screen readers; turning it off brings both back", async () => {
		const view = (isInvisible: boolean) => (
			<>
				<p>
					<Badge badgeContent={3} label="3 new" invisible={isInvisible}>
						<span>Mail</span>
					</Badge>
				</p>
				<p>
					<Badge
						badgeContent={4}
						aria-label="Messages, 4 unread"
						invisible={isInvisible}
					>
						<Button>Messages</Button>
					</Badge>
				</p>
			</>
		);
		const { container, rerender } = render(view(true));
		const [mail, messages] = [...container.querySelectorAll("p")];
		expect(isTextShown("3")).toBe(false);
		expect(isTextShown("4")).toBe(false);
		expect(spoken(must(mail))).toBe("Mail");
		// While hidden the button keeps its own name.
		expect(screen.getByRole("button", { name: "Messages" })).toBeVisible();

		rerender(view(false));
		await expect.poll(() => isTextShown("3") && isTextShown("4")).toBe(true);
		expect(spoken(must(mail))).toBe("Mail 3 new");
		expect(spoken(must(messages))).toBe("Messages, 4 unread");

		rerender(view(true));
		await expect.poll(() => isTextShown("3") || isTextShown("4")).toBe(false);
		expect(spoken(must(mail))).toBe("Mail");
		expect(screen.getByRole("button", { name: "Messages" })).toBeVisible();
	});

	test("invisible fades and scales the pill to 0.85 in 140ms, and it returns in 180ms with ease-out-quint", async () => {
		const ref = React.createRef<HTMLSpanElement>();
		const view = (isInvisible: boolean) => (
			<Badge ref={ref} badgeContent={3} label="3 new" invisible={isInvisible}>
				<Tile />
			</Badge>
		);
		const { rerender } = render(view(false));
		const root = must(ref.current);
		const pill = screen.getByText("3");
		const shownWidth = pill.getBoundingClientRect().width;
		// Let the page draw it first: a change before that would start no transition.
		await nextFrame();
		await nextFrame();

		rerender(view(true));
		const out = await startedTimings(root);
		expect(out.map((timing) => timing.duration)).toContain(140);
		// Read the end of the fade at once, whatever happens to the pill after it.
		for (const animation of root.getAnimations({ subtree: true })) {
			animation.finish();
		}

		expect(
			pill.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
		).toBe(false);
		expect(pill.getBoundingClientRect().width / shownWidth).toBeCloseTo(
			0.85,
			2,
		);
		await atRest(root);

		rerender(view(false));
		const back = await startedTimings(root);
		expect(back).toContainEqual({ duration: 180, easing: easeOutQuint });
		await atRest(root);
		const returned = screen.getByText("3");
		expect(isShown(returned)).toBe(true);
		expect(returned.getBoundingClientRect().width).toBeCloseTo(shownWidth, 1);
	});

	test("the count pill is 18px tall and at least as wide; variant dot is an 8px dot with no text, on the corner", () => {
		const dotRef = React.createRef<HTMLSpanElement>();
		const tile = React.createRef<HTMLSpanElement>();
		const { container } = render(
			<>
				<Badge badgeContent={4} label="4 unread">
					<Tile />
				</Badge>
				<Badge badgeContent={120} label="Over a hundred">
					<Tile />
				</Badge>
				<p style={{ padding: 20 }}>
					<Badge
						ref={dotRef}
						variant="dot"
						badgeContent={7}
						label="New activity"
					>
						<Tile ref={tile} />
					</Badge>
				</p>
			</>,
		);
		for (const text of ["4", "99+"]) {
			const box = screen.getByText(text).getBoundingClientRect();
			expect(Math.round(box.height)).toBe(18);
			expect(Math.round(box.width)).toBeGreaterThanOrEqual(18);
		}

		expect(screen.queryByText("7")).toBeNull();
		// The dot has no text to find it by, so find the 8px box the badge draws.
		const dots = [...must(dotRef.current).querySelectorAll("*")].filter(
			(element) => {
				const box = element.getBoundingClientRect();
				return (
					isShown(element) &&
					Math.round(box.width) === 8 &&
					Math.round(box.height) === 8
				);
			},
		);
		expect(dots).toHaveLength(1);
		const child = must(tile.current).getBoundingClientRect();
		const dot = centre(must(dots[0]));
		expect(Math.abs(dot.x - child.right)).toBeLessThanOrEqual(1);
		expect(Math.abs(dot.y - child.top)).toBeLessThanOrEqual(1);
		const paragraph = must(container.querySelector("p"));
		expect(spoken(paragraph)).toBe("New activity");
	});

	test("tone puts its class on the root; the default tone puts none", () => {
		const tones = [
			"accent",
			"danger",
			"warning",
			"success",
			"info",
		] as const satisfies readonly BadgeTone[];
		const refs = new Map(
			[...tones, "default" as const, "unset" as const].map((tone) => [
				tone,
				React.createRef<HTMLSpanElement>(),
			]),
		);
		render(
			<>
				<Badge ref={refs.get("unset")} badgeContent={1}>
					<Tile />
				</Badge>
				<Badge ref={refs.get("default")} tone="default" badgeContent={1}>
					<Tile />
				</Badge>
				{tones.map((tone) => (
					<Badge key={tone} ref={refs.get(tone)} tone={tone} badgeContent={1}>
						<Tile />
					</Badge>
				))}
			</>,
		);
		for (const tone of tones) {
			const root = refs.get(tone)?.current;
			expect(root).toHaveClass(`gl-badge-${tone}`);
			for (const other of tones) {
				if (other !== tone) {
					expect(root).not.toHaveClass(`gl-badge-${other}`);
				}
			}
		}

		for (const plain of ["default", "unset"] as const) {
			for (const tone of tones) {
				expect(refs.get(plain)?.current).not.toHaveClass(`gl-badge-${tone}`);
			}
		}
	});

	const corners = [
		{ anchor: undefined, x: "right", y: "top" },
		{ anchor: "top-right", x: "right", y: "top" },
		{ anchor: "top-left", x: "left", y: "top" },
		{ anchor: "bottom-right", x: "right", y: "bottom" },
		{ anchor: "bottom-left", x: "left", y: "bottom" },
	] as const satisfies ReadonlyArray<{
		anchor: BadgeProps["anchor"];
		x: "left" | "right";
		y: "top" | "bottom";
	}>;

	test.each(corners)(
		"anchor $anchor centres the pill on the child's $y-$x corner",
		({ anchor, x, y }) => {
			const tile = React.createRef<HTMLSpanElement>();
			render(
				<div style={{ padding: 40 }}>
					<Badge badgeContent={4} label="4 unread" anchor={anchor}>
						<Tile ref={tile} />
					</Badge>
				</div>,
			);
			const child = must(tile.current).getBoundingClientRect();
			const pill = centre(screen.getByText("4"));
			expect(Math.abs(pill.x - child[x])).toBeLessThanOrEqual(1);
			expect(Math.abs(pill.y - child[y])).toBeLessThanOrEqual(1);
		},
	);

	test.each(corners.slice(1))(
		"overlap circular moves the pill in 14% from the $y-$x corner, onto a round child",
		({ anchor, x, y }) => {
			const tile = React.createRef<HTMLSpanElement>();
			render(
				<div style={{ padding: 40 }}>
					<Badge
						badgeContent={4}
						label="4 unread"
						anchor={anchor}
						overlap="circular"
					>
						<Tile ref={tile} />
					</Badge>
				</div>,
			);
			const child = must(tile.current).getBoundingClientRect();
			const inset = 0.14 * 40;
			const pill = centre(screen.getByText("4"));
			const expectedX =
				x === "right" ? child.right - inset : child.left + inset;
			const expectedY =
				y === "bottom" ? child.bottom - inset : child.top + inset;
			expect(Math.abs(pill.x - expectedX)).toBeLessThanOrEqual(1);
			expect(Math.abs(pill.y - expectedY)).toBeLessThanOrEqual(1);
		},
	);

	test("--gl-badge-ring recolours the ring that cuts the pill out of its child", () => {
		render(
			<>
				<Badge badgeContent={4} label="4 unread">
					<Tile />
				</Badge>
				<Badge
					badgeContent={5}
					label="5 unread"
					style={{ "--gl-badge-ring": "rgb(255, 0, 0)" } as React.CSSProperties}
				>
					<Tile />
				</Badge>
			</>,
		);
		expect(getComputedStyle(screen.getByText("4")).boxShadow).not.toContain(
			"rgb(255, 0, 0)",
		);
		expect(getComputedStyle(screen.getByText("5")).boxShadow).toContain(
			"rgb(255, 0, 0)",
		);
	});

	test("without children the pill sits inline, in the text after what precedes it", () => {
		const { container } = render(
			<p style={{ fontSize: 16, lineHeight: "24px" }}>
				<span>Inbox</span> <Badge badgeContent={4} label="4 unread" />
			</p>,
		);
		const text = screen.getByText("Inbox").getBoundingClientRect();
		const pill = screen.getByText("4").getBoundingClientRect();
		expect(isShown(screen.getByText("4"))).toBe(true);
		expect(pill.left).toBeGreaterThanOrEqual(text.right);
		const halfHeight = pill.height / 2;
		const middle = pill.top + halfHeight;
		expect(middle).toBeGreaterThan(text.top);
		expect(middle).toBeLessThan(text.bottom);
		const paragraph = must(container.querySelector("p"));
		expect(spoken(paragraph)).toBe("Inbox 4 unread");
	});
});
