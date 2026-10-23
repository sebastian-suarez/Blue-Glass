import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cdp } from "vitest/browser";
import {
	Box,
	type Kind,
	Panel,
	ServerTree,
} from "../../tests/fixtures/transition-tree.js";
import { type TransitionOptions } from "./transition.js";

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0).toReversed()) {
		cleanup();
	}
});

function mountPoint(): HTMLDivElement {
	const container = document.createElement("div");
	document.body.append(container);
	cleanups.push(() => {
		container.remove();
	});
	return container;
}

function track(root: Root): Root {
	cleanups.push(() => {
		root.unmount();
	});
	return root;
}

function watchStatuses(container: HTMLElement): (id: string) => string[] {
	const traces = new Map<string, { element: HTMLElement; before: string[] }>();
	const traceOf = (element: HTMLElement) => {
		const trace = traces.get(element.id) ?? { element, before: [] };
		traces.set(element.id, trace);
		return trace;
	};

	const observer = new MutationObserver((records) => {
		for (const record of records) {
			if (record.type === "attributes") {
				traceOf(record.target as HTMLElement).before.push(
					record.oldValue ?? "",
				);
			}

			for (const node of record.addedNodes) {
				if (node instanceof HTMLElement && node.id !== "") {
					traceOf(node);
				}
			}
		}
	});
	observer.observe(container, {
		attributes: true,
		attributeFilter: ["data-transition"],
		attributeOldValue: true,
		childList: true,
		subtree: true,
	});
	cleanups.push(() => {
		observer.disconnect();
	});
	return (id) => {
		const trace = traces.get(id);
		return trace
			? [...trace.before, trace.element.dataset.transition ?? ""]
			: [];
	};
}

function runningTransitions(element: Element): string[] {
	return element
		.getAnimations()
		.filter((animation) => animation instanceof CSSTransition)
		.map((animation) => animation.transitionProperty)
		.toSorted();
}

function byId(id: string): HTMLElement {
	const element = document.querySelector<HTMLElement>(`#${id}`);
	if (!element) {
		throw new Error(`#${id} isn't in the document`);
	}

	return element;
}

async function until(id: string, status: string): Promise<HTMLElement> {
	return vi.waitFor(
		() => {
			const element = byId(id);
			expect(element.dataset.transition).toBe(status);
			return element;
		},
		{ interval: 5, timeout: 2000 },
	);
}

function recordCallbacks() {
	const calls: string[] = [];
	const note = (name: string) => () => {
		calls.push(name);
	};

	return {
		calls,
		callbacks: {
			onEnter: note("enter"),
			onEntered: note("entered"),
			onExit: note("exit"),
			onExited: note("exited"),
		} satisfies Partial<TransitionOptions>,
	};
}

async function settle(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

const fast = { enter: 200, exit: 160 } as const;

describe("(b) hydration", () => {
	test("hydrating the server HTML raises no error and animates nothing", async () => {
		const html = renderToString(<ServerTree />);
		await expect(html).toMatchFileSnapshot("./transition.server.html.txt");

		const container = mountPoint();
		container.innerHTML = html;
		const ids = ["fade", "grow", "zoom", "slide", "panel"];
		const before = ids.map((id) => byId(id));
		for (const element of before) {
			expect(getComputedStyle(element).opacity).toBe("1");
			expect(getComputedStyle(element).visibility).toBe("visible");
		}

		const mutations: MutationRecord[] = [];
		const observer = new MutationObserver((records) => {
			mutations.push(...records);
		});
		observer.observe(container, {
			attributes: true,
			characterData: true,
			childList: true,
			subtree: true,
		});
		cleanups.push(() => {
			observer.disconnect();
		});
		const consoleError = vi.spyOn(console, "error");
		cleanups.push(() => {
			consoleError.mockRestore();
		});
		const recoverable: unknown[] = [];
		const callbacks = {
			onEnter: vi.fn<(node: HTMLElement) => void>(),
			onEntered: vi.fn<(node: HTMLElement) => void>(),
			onExit: vi.fn<(node: HTMLElement) => void>(),
			onExited: vi.fn<(node: HTMLElement) => void>(),
		} satisfies Partial<TransitionOptions>;

		track(
			hydrateRoot(container, <ServerTree {...callbacks} />, {
				onRecoverableError(error) {
					recoverable.push(error);
				},
			}),
		);
		await vi.waitFor(() => {
			expect(callbacks.onEntered).toHaveBeenCalledTimes(5);
		});
		expect(document.getAnimations()).toEqual([]);
		await settle(600);

		expect(recoverable).toEqual([]);
		expect(consoleError).not.toHaveBeenCalled();
		expect(mutations).toEqual([]);
		expect(document.getAnimations()).toEqual([]);
		expect(callbacks.onEnter).not.toHaveBeenCalled();
		expect(callbacks.onExit).not.toHaveBeenCalled();
		expect(callbacks.onExited).not.toHaveBeenCalled();
		expect(ids.map((id) => byId(id))).toEqual(before);
		for (const element of before) {
			expect(element.dataset.transition).toBe("entered");
			expect(getComputedStyle(element).opacity).toBe("1");
		}
	});
});

describe("(c) client mounts", () => {
	test("with appear, a client mount goes entering, then entered, and animates", async () => {
		const container = mountPoint();
		const statusesOf = watchStatuses(container);
		const { calls, callbacks } = recordCallbacks();
		track(createRoot(container)).render(
			<Box in kind="grow" label="grow" timeout={fast} {...callbacks} />,
		);
		const element = await until("grow", "entering");
		expect(runningTransitions(element)).toEqual(["opacity", "transform"]);
		await until("grow", "entered");
		expect(statusesOf("grow")).toEqual(["exited", "entering", "entered"]);
		expect(calls).toEqual(["enter", "entered"]);
	});

	test("without appear, a client mount starts entered", async () => {
		const container = mountPoint();
		const statusesOf = watchStatuses(container);
		track(createRoot(container)).render(
			<Box in appear={false} kind="fade" label="still" timeout={fast} />,
		);
		const element = await until("still", "entered");
		await settle(fast.enter + 50);
		expect(statusesOf("still")).toEqual(["entered"]);
		expect(element.getAnimations()).toEqual([]);
	});
});

describe("(d) toggling in", () => {
	function Toggle(props: TransitionOptions & { kind?: Kind }) {
		return <Box kind="fade" label="toggle" timeout={fast} {...props} />;
	}

	test("animates both ways and unmounts after the exit with unmountOnExit", async () => {
		const container = mountPoint();
		const statusesOf = watchStatuses(container);
		const { calls, callbacks } = recordCallbacks();
		const root = track(createRoot(container));
		root.render(<Toggle unmountOnExit in={false} {...callbacks} />);
		await settle(50);
		expect(container.getHTML()).toBe("");

		root.render(<Toggle in unmountOnExit {...callbacks} />);
		expect(runningTransitions(await until("toggle", "entering"))).toEqual([
			"opacity",
		]);
		await until("toggle", "entered");

		root.render(<Toggle unmountOnExit in={false} {...callbacks} />);
		const element = await until("toggle", "exiting");
		expect(runningTransitions(element)).toEqual(["opacity"]);
		await vi.waitFor(() => {
			expect(element.isConnected).toBe(false);
		});

		expect(statusesOf("toggle")).toEqual([
			"exited",
			"entering",
			"entered",
			"exiting",
			"exited",
		]);
		expect(calls).toEqual(["enter", "entered", "exit", "exited"]);
	});

	test("without unmountOnExit the child stays, hidden, and turns back midway", async () => {
		const container = mountPoint();
		const statusesOf = watchStatuses(container);
		const root = track(createRoot(container));
		const slow = { enter: 200, exit: 400 };
		root.render(<Toggle in kind="slide" timeout={slow} />);
		await until("toggle", "entered");

		root.render(<Toggle in={false} kind="slide" timeout={slow} />);
		expect(runningTransitions(await until("toggle", "exiting"))).toEqual([
			"transform",
		]);
		root.render(<Toggle in kind="slide" timeout={slow} />);
		await until("toggle", "entered");

		root.render(<Toggle in={false} kind="slide" timeout={slow} />);
		const element = await until("toggle", "exited");
		expect(getComputedStyle(element).visibility).toBe("hidden");
		expect(statusesOf("toggle")).toEqual([
			"exited",
			"entering",
			"entered",
			"exiting",
			"entering",
			"entered",
			"exiting",
			"exited",
		]);
	});
});

describe("(e) reduced motion", () => {
	async function emulateReducedMotion(): Promise<void> {
		await cdp().send("Emulation.setEmulatedMedia", {
			features: [{ name: "prefers-reduced-motion", value: "reduce" }],
		});
		cleanups.push(() => {
			void cdp().send("Emulation.setEmulatedMedia", { features: [] });
		});
		expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
	}

	test("Grow, Zoom and Slide only fade, Fade is unchanged, and the statuses still run", async () => {
		await emulateReducedMotion();
		const container = mountPoint();
		const statusesOf = watchStatuses(container);
		const kinds: Kind[] = ["grow", "zoom", "slide", "fade"];
		track(createRoot(container)).render(
			<>
				{kinds.map((kind) => (
					<Box key={kind} in kind={kind} label={kind} timeout={fast} />
				))}
			</>,
		);
		await until("fade", "entering");
		for (const kind of kinds) {
			expect(runningTransitions(byId(kind))).toEqual(["opacity"]);
			expect(getComputedStyle(byId(kind)).transform).toBe("none");
		}

		await until("fade", "entered");
		for (const kind of kinds) {
			expect(statusesOf(kind)).toEqual(["exited", "entering", "entered"]);
		}
	});

	test("Collapse opens and shuts at once", async () => {
		await emulateReducedMotion();
		const container = mountPoint();
		const root = track(createRoot(container));
		root.render(<Panel in={false} />);
		const panel = await until("panel", "exited");
		expect(panel.getBoundingClientRect().height).toBe(0);

		root.render(<Panel in />);
		await until("panel", "entering");
		expect(panel.getAnimations({ subtree: true })).toEqual([]);
		expect(panel.getBoundingClientRect().height).toBeGreaterThan(0);

		root.render(<Panel in={false} />);
		await until("panel", "exiting");
		expect(panel.getAnimations({ subtree: true })).toEqual([]);
		expect(panel.getBoundingClientRect().height).toBe(0);
	});
});
