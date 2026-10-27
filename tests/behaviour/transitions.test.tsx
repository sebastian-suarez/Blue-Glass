import { cleanup, render, screen } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cdp } from "vitest/browser";
import "#ui/styles.css";
import {
	Collapse,
	Fade,
	Grow,
	Slide,
	Transition,
	useTransition,
	Zoom,
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

type Status = "unmounted" | "exited" | "entering" | "entered" | "exiting";

type Callbacks = {
	onEnter?: (node: HTMLElement) => void;
	onEntered?: (node: HTMLElement) => void;
	onExit?: (node: HTMLElement) => void;
	onExited?: (node: HTMLElement) => void;
};

type Options = Callbacks & {
	in?: boolean;
	appear?: boolean;
	mountOnEnter?: boolean;
	unmountOnExit?: boolean;
	timeout?: number | { enter?: number; exit?: number };
};

type UseTransition = (
	options: Options,
	nodeRef: React.RefObject<HTMLDivElement | null>,
	defaults: { enter: number; exit: number },
) => Status;

const useStatus = useTransition as UseTransition;

type Name = "Fade" | "Grow" | "Zoom" | "Slide";

function Motion({
	name,
	ref,
	...props
}: Options & {
	name: Name;
	ref?: React.Ref<HTMLElement>;
	children: React.ReactElement;
}) {
	switch (name) {
		case "Fade": {
			return <Fade ref={ref} {...props} />;
		}

		case "Grow": {
			return <Grow ref={ref} {...props} />;
		}

		case "Zoom": {
			return <Zoom ref={ref} {...props} />;
		}

		case "Slide": {
			return <Slide ref={ref} {...props} />;
		}
	}
}

const kinds = [
	{ name: "Fade", enter: 200, exit: 150 },
	{ name: "Grow", enter: 200, exit: 140 },
	{ name: "Zoom", enter: 220, exit: 160 },
	{ name: "Slide", enter: 280, exit: 220 },
] as const;

const box = { width: 120, height: 80 } as const;

type Callback = "enter" | "entered" | "exit" | "exited";

type Call = {
	name: Callback;
	node: HTMLElement;
	isConnected: boolean;
	at: number;
};

function recordCallbacks() {
	const calls: Call[] = [];
	const note = (name: Callback) => (node: HTMLElement) => {
		calls.push({
			name,
			node,
			isConnected: node.isConnected,
			at: performance.now(),
		});
	};

	const callbacks: Callbacks = {
		onEnter: note("enter"),
		onEntered: note("entered"),
		onExit: note("exit"),
		onExited: note("exited"),
	};
	return {
		calls,
		callbacks,
		names: () => calls.map((call) => call.name),
		clear() {
			calls.length = 0;
		},
		async until(name: Callback) {
			await vi.waitFor(
				() => {
					expect(calls.map((call) => call.name)).toContain(name);
				},
				{ interval: 5, timeout: 3000 },
			);
		},
		time(name: Callback): number {
			return must(calls.findLast((call) => call.name === name)).at;
		},
	};
}

function distinct(statuses: Status[]): Status[] {
	return statuses.filter((status, index) => status !== statuses[index - 1]);
}

async function runningDurations(root: Element): Promise<number[]> {
	return vi.waitFor(
		() => {
			const durations = root
				.getAnimations({ subtree: true })
				.map((animation) =>
					Math.round(Number(animation.effect?.getTiming().duration)),
				);
			expect(durations).not.toHaveLength(0);
			return [...new Set(durations)];
		},
		{ interval: 5, timeout: 2000 },
	);
}

async function atRest(root: Element): Promise<void> {
	await vi.waitFor(
		() => {
			expect(root.getAnimations({ subtree: true })).toEqual([]);
		},
		{ interval: 5, timeout: 2000 },
	);
}

function transformOf(element: Element): DOMMatrixReadOnly {
	return new DOMMatrixReadOnly(getComputedStyle(element).transform);
}

describe("Transition, the state machine they share", () => {
	test("with appear on by default, a client mount with in enters: exited, entering, entered, with onEnter then onEntered on the child", async () => {
		const statuses: Status[] = [];
		const recorder = recordCallbacks();
		render(
			<Transition in timeout={{ enter: 80, exit: 40 }} {...recorder.callbacks}>
				{(status: Status, ref: React.Ref<HTMLElement>) => {
					statuses.push(status);
					return <section ref={ref}>Panel</section>;
				}}
			</Transition>,
		);
		await recorder.until("entered");
		expect(distinct(statuses)).toEqual(["exited", "entering", "entered"]);
		expect(recorder.names()).toEqual(["enter", "entered"]);
		const child = screen.getByText("Panel");
		for (const call of recorder.calls) {
			expect(call.node).toBe(child);
		}
	});

	test("appear={false}: a client mount with in starts entered, with no onEnter and no motion", () => {
		const statuses: Status[] = [];
		const recorder = recordCallbacks();
		const { container } = render(
			<>
				<Transition in appear={false} timeout={60} {...recorder.callbacks}>
					{(status: Status, ref: React.Ref<HTMLElement>) => {
						statuses.push(status);
						return <section ref={ref}>Panel</section>;
					}}
				</Transition>
				<Fade in appear={false} timeout={60}>
					<div style={box}>Note</div>
				</Fade>
			</>,
		);
		expect(distinct(statuses)).toEqual(["entered"]);
		expect(recorder.names()).not.toContain("enter");
		expect(getComputedStyle(screen.getByText("Note")).opacity).toBe("1");
		expect(container.getAnimations({ subtree: true })).toEqual([]);
	});

	test("turning in off and on runs exiting, exited, entering, entered, with each callback on the child, which stays mounted", async () => {
		const statuses: Status[] = [];
		const recorder = recordCallbacks();
		const view = (isIn: boolean) => (
			<Transition
				in={isIn}
				appear={false}
				timeout={{ enter: 80, exit: 40 }}
				{...recorder.callbacks}
			>
				{(status: Status, ref: React.Ref<HTMLElement>) => {
					statuses.push(status);
					return <section ref={ref}>Panel</section>;
				}}
			</Transition>
		);
		const { rerender } = render(view(true));
		const child = screen.getByText("Panel");
		statuses.length = 0;
		recorder.clear();

		rerender(view(false));
		await recorder.until("exited");
		expect(child.isConnected).toBe(true);
		rerender(view(true));
		await recorder.until("entered");

		expect(
			distinct(statuses).filter(
				(status, index) => index > 0 || status !== "entered",
			),
		).toEqual(["exiting", "exited", "entering", "entered"]);
		expect(recorder.names()).toEqual(["exit", "exited", "enter", "entered"]);
		for (const call of recorder.calls) {
			expect(call.node).toBe(child);
		}

		expect(screen.getByText("Panel")).toBe(child);
	});

	test("mountOnEnter renders nothing until the first enter, then keeps the child once it exits", async () => {
		const recorder = recordCallbacks();
		const view = (isIn: boolean) => (
			<Fade mountOnEnter in={isIn} timeout={60} {...recorder.callbacks}>
				<div style={box}>Lazy</div>
			</Fade>
		);
		const { rerender } = render(view(false));
		expect(screen.queryByText("Lazy")).not.toBeInTheDocument();

		rerender(view(true));
		await recorder.until("entered");
		const child = screen.getByText("Lazy");
		recorder.clear();
		rerender(view(false));
		await recorder.until("exited");
		expect(child.isConnected).toBe(true);
		expect(getComputedStyle(child).visibility).toBe("hidden");
	});

	test("unmountOnExit keeps the child while it exits, then unmounts it after onExited", async () => {
		const recorder = recordCallbacks();
		const view = (isIn: boolean) => (
			<Fade
				unmountOnExit
				in={isIn}
				appear={false}
				timeout={60}
				{...recorder.callbacks}
			>
				<div style={box}>Toast</div>
			</Fade>
		);
		const { container, rerender } = render(view(true));
		const child = screen.getByText("Toast");
		expect(getComputedStyle(child).opacity).toBe("1");
		recorder.clear();

		rerender(view(false));
		expect(child.isConnected).toBe(true);
		expect(await runningDurations(container)).toEqual([60]);
		await vi.waitFor(() => {
			expect(child.isConnected).toBe(false);
		});
		expect(recorder.names()).toEqual(["exit", "exited"]);
		expect(recorder.calls.at(-1)?.isConnected).toBe(true);

		rerender(view(true));
		await recorder.until("entered");
		expect(screen.getByText("Toast")).toBeVisible();
	});

	test.each([
		{ label: "120", timeout: 120, enter: 120, exit: 120 },
		{
			label: "{ enter: 240, exit: 90 }",
			timeout: { enter: 240, exit: 90 },
			enter: 240,
			exit: 90,
		},
		{ label: "{ exit: 90 }", timeout: { exit: 90 }, enter: 200, exit: 90 },
	])(
		"timeout=$label: entering takes $enter ms and exiting $exit ms, a side left out keeping its default",
		async ({ timeout, enter, exit }) => {
			const recorder = recordCallbacks();
			const view = (isIn: boolean) => (
				<Fade in={isIn} timeout={timeout} {...recorder.callbacks}>
					<div style={box}>Note</div>
				</Fade>
			);
			const { container, rerender } = render(view(false));
			rerender(view(true));
			expect(await runningDurations(container)).toEqual([enter]);
			await recorder.until("entered");
			expect(
				recorder.time("entered") - recorder.time("enter"),
			).toBeGreaterThanOrEqual(enter - 1);

			await atRest(container);
			rerender(view(false));
			expect(await runningDurations(container)).toEqual([exit]);
			await vi.waitFor(() => {
				expect(recorder.names().at(-1)).toBe("exited");
			});
			expect(
				recorder.time("exited") - recorder.time("exit"),
			).toBeGreaterThanOrEqual(exit - 1);
		},
	);

	test("Transition sets no styles of its own: a child that is out looks as it is, and nothing animates", async () => {
		const recorder = recordCallbacks();
		const view = (isIn: boolean) => (
			<Transition in={isIn} timeout={60} {...recorder.callbacks}>
				<div style={box}>Plain</div>
			</Transition>
		);
		const { container, rerender } = render(view(false));
		const child = screen.getByText("Plain");
		const style = getComputedStyle(child);
		expect(style.opacity).toBe("1");
		expect(style.visibility).toBe("visible");
		expect(style.transform).toBe("none");

		rerender(view(true));
		expect(container.getAnimations({ subtree: true })).toEqual([]);
		await recorder.until("entered");
		expect(getComputedStyle(child).opacity).toBe("1");
	});
});

describe("Fade, Grow, Zoom and Slide", () => {
	test.each(kinds)(
		"$name enters in $enter ms and exits in $exit ms by default",
		async ({ name, enter, exit }) => {
			const recorder = recordCallbacks();
			const view = (isIn: boolean) => (
				<Motion name={name} in={isIn} {...recorder.callbacks}>
					<div style={box}>{name}</div>
				</Motion>
			);
			const { container, rerender } = render(view(false));
			recorder.clear();
			rerender(view(true));
			expect(await runningDurations(container)).toEqual([enter]);
			await recorder.until("entered");
			await atRest(container);
			recorder.clear();
			rerender(view(false));
			expect(await runningDurations(container)).toEqual([exit]);
			await recorder.until("exited");
		},
	);

	test.each(kinds)(
		"$name hides the child while out, and shows it opaque and unmoved once in",
		async ({ name }) => {
			const recorder = recordCallbacks();
			const view = (isIn: boolean) => (
				<Motion name={name} in={isIn} timeout={60} {...recorder.callbacks}>
					<div style={box}>{name}</div>
				</Motion>
			);
			const { rerender } = render(view(false));
			const child = screen.getByText(name);
			expect(getComputedStyle(child).visibility).toBe("hidden");

			recorder.clear();
			rerender(view(true));
			await recorder.until("entered");
			await vi.waitFor(() => {
				const style = getComputedStyle(child);
				expect(style.opacity).toBe("1");
				expect(style.visibility).toBe("visible");
				expect(style.transform).toBe("none");
			});
		},
	);

	test.each(["Transition", ...kinds.map((kind) => kind.name)] as const)(
		"%s keeps the child's own ref, attributes and style, and its own ref is the child",
		(name) => {
			const childRef = React.createRef<HTMLDivElement>();
			const ref = React.createRef<HTMLElement>();
			const child = (
				<div
					ref={childRef}
					id="note"
					className="note"
					style={{ color: "rgb(1, 2, 3)" }}
				>
					Note
				</div>
			);
			render(
				name === "Transition" ? (
					<Transition ref={ref} in>
						{child}
					</Transition>
				) : (
					<Motion ref={ref} in name={name}>
						{child}
					</Motion>
				),
			);
			const element = screen.getByText("Note");
			expect(childRef.current).toBe(element);
			expect(ref.current).toBe(element);
			expect(element).toHaveAttribute("id", "note");
			expect(element).toHaveClass("note");
			expect(getComputedStyle(element).color).toBe("rgb(1, 2, 3)");
		},
	);

	test("Grow starts at 0.96 and Zoom at 0.85, both from opacity 0, and Zoom scales from the centre", () => {
		render(
			<>
				<Grow in={false}>
					<div style={box}>Grow</div>
				</Grow>
				<Zoom in={false}>
					<div style={box}>Zoom</div>
				</Zoom>
			</>,
		);
		const starts = [
			["Grow", 0.96],
			["Zoom", 0.85],
		] as const;
		for (const [name, scale] of starts) {
			const child = screen.getByText(name);
			const matrix = transformOf(child);
			expect(matrix.a).toBeCloseTo(scale);
			expect(matrix.d).toBeCloseTo(scale);
			expect(getComputedStyle(child).opacity).toBe("0");
		}

		expect(getComputedStyle(screen.getByText("Zoom")).transformOrigin).toBe(
			"60px 40px",
		);
	});

	test("Grow scales from its origin, and by default from --gl-transform-origin", () => {
		render(
			<>
				<Grow in origin="top left">
					<div style={box}>Menu</div>
				</Grow>
				<div
					style={
						{ "--gl-transform-origin": "right bottom" } as React.CSSProperties
					}
				>
					<Grow in>
						<div style={box}>Popover</div>
					</Grow>
				</div>
			</>,
		);
		expect(getComputedStyle(screen.getByText("Menu")).transformOrigin).toBe(
			"0px 0px",
		);
		expect(getComputedStyle(screen.getByText("Popover")).transformOrigin).toBe(
			"120px 80px",
		);
	});

	test.each([
		{ direction: "up", from: "below", axis: "y", sign: 1 },
		{ direction: "down", from: "above", axis: "y", sign: -1 },
		{ direction: "left", from: "the right", axis: "x", sign: 1 },
		{ direction: "right", from: "the left", axis: "x", sign: -1 },
	] as const)(
		'Slide direction="$direction" enters from $from and leaves the same way',
		async ({ direction, axis, sign }) => {
			const recorder = recordCallbacks();
			const view = (isIn: boolean) => (
				<Slide
					in={isIn}
					direction={direction}
					timeout={60}
					{...recorder.callbacks}
				>
					<div style={box}>Drawer</div>
				</Slide>
			);
			const { rerender } = render(view(false));
			const child = screen.getByText("Drawer");
			const offset = () => {
				const matrix = transformOf(child);
				return { x: matrix.m41, y: matrix.m42 };
			};

			const start = offset();
			expect(Math.sign(start[axis])).toBe(sign);
			expect(start[axis === "x" ? "y" : "x"]).toBeCloseTo(0);

			recorder.clear();
			rerender(view(true));
			await recorder.until("entered");
			await expect.poll(() => getComputedStyle(child).transform).toBe("none");

			recorder.clear();
			rerender(view(false));
			await recorder.until("exited");
			await expect.poll(offset).toEqual(start);
		},
	);

	test("with appear on by default, a Fade mounted in on the client fades in", async () => {
		const recorder = recordCallbacks();
		const { container } = render(
			<Fade in {...recorder.callbacks}>
				<div style={box}>Note</div>
			</Fade>,
		);
		expect(await runningDurations(container)).toEqual([200]);
		await recorder.until("entered");
		expect(recorder.names()).toEqual(["enter", "entered"]);
		await expect
			.poll(() => getComputedStyle(screen.getByText("Note")).opacity)
			.toBe("1");
	});

	test("Fade's easing sets the timing function of the fade", async () => {
		const view = (isIn: boolean) => (
			<Fade in={isIn} easing="linear">
				<div style={box}>Note</div>
			</Fade>
		);
		const { container, rerender } = render(view(false));
		rerender(view(true));
		const easing = await vi.waitFor(
			() => {
				const [animation] = container.getAnimations({ subtree: true });
				return must(animation?.effect).getTiming().easing;
			},
			{ interval: 5 },
		);
		expect(easing).toBe("linear");
	});
});

describe("Collapse", () => {
	const details = <div style={{ height: 120 }}>Details</div>;

	test("opens from 0 to its content's height and closes back, in 450 ms and 300 ms by default", async () => {
		const ref = React.createRef<HTMLDivElement>();
		const recorder = recordCallbacks();
		const view = (isIn: boolean) => (
			<Collapse ref={ref} in={isIn} {...recorder.callbacks}>
				{details}
			</Collapse>
		);
		const { rerender } = render(view(false));
		const root = must(ref.current);
		const height = () => root.getBoundingClientRect().height;
		expect(height()).toBe(0);

		recorder.clear();
		rerender(view(true));
		expect(await runningDurations(root)).toEqual([450]);
		await recorder.until("entered");
		await expect.poll(height).toBe(120);

		await atRest(root);
		recorder.clear();
		rerender(view(false));
		expect(await runningDurations(root)).toEqual([300]);
		await recorder.until("exited");
		await expect.poll(height).toBe(0);
	});

	test("collapsedSize keeps that much of the content showing while closed", async () => {
		const ref = React.createRef<HTMLDivElement>();
		const recorder = recordCallbacks();
		const view = (isIn: boolean) => (
			<Collapse
				ref={ref}
				in={isIn}
				collapsedSize="48px"
				timeout={60}
				{...recorder.callbacks}
			>
				{details}
			</Collapse>
		);
		const { rerender } = render(view(false));
		const height = () => must(ref.current).getBoundingClientRect().height;
		expect(height()).toBe(48);
		expect(
			screen.getByText("Details").checkVisibility({ visibilityProperty: true }),
		).toBe(true);

		rerender(view(true));
		await recorder.until("entered");
		await expect.poll(height).toBe(120);
		recorder.clear();
		rerender(view(false));
		await recorder.until("exited");
		await expect.poll(height).toBe(48);
	});

	test("className and style go on the Collapse's own element, which holds the ref and the children", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Collapse ref={ref} in className="more" style={{ marginTop: 4 }}>
				<p>Details</p>
			</Collapse>,
		);
		const root = must(ref.current);
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(root).toHaveClass("more");
		expect(getComputedStyle(root).marginTop).toBe("4px");
		expect(root).toContainElement(screen.getByText("Details"));
	});

	test("with appear, a client mount with in opens", async () => {
		const ref = React.createRef<HTMLDivElement>();
		const recorder = recordCallbacks();
		render(
			<Collapse ref={ref} in appear {...recorder.callbacks}>
				{details}
			</Collapse>,
		);
		expect(await runningDurations(must(ref.current))).toEqual([450]);
		await recorder.until("entered");
		expect(recorder.names()).toEqual(["enter", "entered"]);
		await expect
			.poll(() => must(ref.current).getBoundingClientRect().height)
			.toBe(120);
	});

	test("mountOnEnter mounts it on the first enter, and unmountOnExit unmounts it after its exit", async () => {
		const recorder = recordCallbacks();
		const view = (isIn: boolean) => (
			<Collapse
				mountOnEnter
				unmountOnExit
				in={isIn}
				timeout={60}
				{...recorder.callbacks}
			>
				{details}
			</Collapse>
		);
		const { rerender } = render(view(false));
		expect(screen.queryByText("Details")).not.toBeInTheDocument();

		rerender(view(true));
		await recorder.until("entered");
		const content = screen.getByText("Details");
		recorder.clear();
		rerender(view(false));
		expect(content.isConnected).toBe(true);
		await vi.waitFor(() => {
			expect(content.isConnected).toBe(false);
		});
		expect(recorder.names()).toEqual(["exit", "exited"]);
	});
});

describe("useTransition", () => {
	function Custom({
		onStatus,
		...options
	}: Options & { onStatus: (status: Status) => void }) {
		const nodeRef = React.useRef<HTMLDivElement | null>(null);
		const status = useStatus(options, nodeRef, { enter: 90, exit: 60 });
		React.useLayoutEffect(() => {
			onStatus(status);
		}, [onStatus, status]);
		return status === "unmounted" ? null : <div ref={nodeRef}>Custom</div>;
	}

	test("runs the machine for a component of your own, with the defaults it passes", async () => {
		const statuses: Status[] = [];
		const onStatus = (status: Status) => {
			statuses.push(status);
		};

		const recorder = recordCallbacks();
		const { rerender } = render(
			<Custom in onStatus={onStatus} {...recorder.callbacks} />,
		);
		await recorder.until("entered");
		rerender(<Custom in={false} onStatus={onStatus} {...recorder.callbacks} />);
		await vi.waitFor(() => {
			expect(recorder.names().at(-1)).toBe("exited");
		});

		expect(distinct(statuses)).toEqual([
			"exited",
			"entering",
			"entered",
			"exiting",
			"exited",
		]);
		expect(recorder.names()).toEqual(["enter", "entered", "exit", "exited"]);
		const node = screen.getByText("Custom");
		for (const call of recorder.calls) {
			expect(call.node).toBe(node);
		}

		expect(
			recorder.time("entered") - recorder.time("enter"),
		).toBeGreaterThanOrEqual(89);
		expect(
			recorder.time("exited") - recorder.time("exit"),
		).toBeGreaterThanOrEqual(59);
	});
});

describe("under reduced motion", () => {
	async function emulateMedia(
		features: Array<{ name: string; value: string }>,
	) {
		const session: CDPSession = cdp();
		await session.send("Emulation.setEmulatedMedia", { features });
	}

	beforeEach(async () => {
		await emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
		expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
	});

	afterEach(async () => {
		await emulateMedia([]);
	});

	test.each(kinds)(
		"$name only fades: the child never moves",
		async ({ name }) => {
			const recorder = recordCallbacks();
			const view = (isIn: boolean) => (
				<Motion name={name} in={isIn} {...recorder.callbacks}>
					<div style={box}>{name}</div>
				</Motion>
			);
			const { container, rerender } = render(view(false));
			const child = screen.getByText(name);
			expect(getComputedStyle(child).transform).toBe("none");
			expect(getComputedStyle(child).opacity).toBe("0");

			recorder.clear();
			rerender(view(true));
			let hasMoved = false;
			let hasFaded = false;
			await vi.waitFor(
				() => {
					hasMoved ||= getComputedStyle(child).transform !== "none";
					hasFaded ||= container.getAnimations({ subtree: true }).length > 0;
					expect(recorder.names()).toContain("entered");
				},
				{ interval: 5, timeout: 3000 },
			);
			expect(hasMoved).toBe(false);
			expect(hasFaded).toBe(true);
			await expect.poll(() => getComputedStyle(child).opacity).toBe("1");
		},
	);

	test("Collapse opens and shuts at once", async () => {
		const ref = React.createRef<HTMLDivElement>();
		const view = (isIn: boolean) => (
			<Collapse ref={ref} in={isIn}>
				<div style={{ height: 120 }}>Details</div>
			</Collapse>
		);
		const { rerender } = render(view(false));
		const root = must(ref.current);
		const hasAnimatedTo = async (height: number) => {
			let hasAnimated = false;
			await vi.waitFor(
				() => {
					hasAnimated ||= root.getAnimations({ subtree: true }).length > 0;
					expect(root.getBoundingClientRect().height).toBe(height);
				},
				{ interval: 5, timeout: 3000 },
			);
			return hasAnimated;
		};

		expect(root.getBoundingClientRect().height).toBe(0);
		rerender(view(true));
		expect(await hasAnimatedTo(120)).toBe(false);
		rerender(view(false));
		expect(await hasAnimatedTo(0)).toBe(false);
	});
});
