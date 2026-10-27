import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test, vi } from "vitest";
import {
	Collapse,
	Fade,
	Grow,
	Slide,
	Transition,
	type TransitionProps,
	Zoom,
} from "./index.js";

type Callbacks = Pick<
	TransitionProps,
	"onEnter" | "onEntered" | "onExit" | "onExited"
>;

function ServerTree(callbacks: Callbacks) {
	return (
		<>
			<Transition in {...callbacks}>
				{(status, ref) => (
					<section ref={ref} id="transition" data-status={status}>
						Transition
					</section>
				)}
			</Transition>
			<Fade in {...callbacks}>
				<div id="fade">Fade</div>
			</Fade>
			<Grow in {...callbacks}>
				<div id="grow">Grow</div>
			</Grow>
			<Zoom in {...callbacks}>
				<div id="zoom">Zoom</div>
			</Zoom>
			<Slide in {...callbacks}>
				<div id="slide">Slide</div>
			</Slide>
			<Collapse appear in {...callbacks}>
				<p id="collapse">Collapse</p>
			</Collapse>
		</>
	);
}

const cleanups: Array<() => void> = [];

afterEach(() => {
	for (const cleanup of cleanups.splice(0).toReversed()) {
		cleanup();
	}
});

async function settle(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

test("hydrating the server HTML raises no error, changes nothing and animates nothing", async () => {
	const html = renderToString(<ServerTree />);
	await expect(html).toMatchFileSnapshot("./Transitions.server.html.txt");

	const container = document.createElement("div");
	document.body.append(container);
	cleanups.push(() => {
		container.remove();
	});
	container.innerHTML = html;
	const children = [
		...container.querySelectorAll<HTMLElement>(
			"#transition, [data-transition]",
		),
	];
	expect(children).toHaveLength(6);
	for (const element of children) {
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
	} satisfies Callbacks;
	const root = hydrateRoot(container, <ServerTree {...callbacks} />, {
		onRecoverableError(error) {
			recoverable.push(error);
		},
	});
	cleanups.push(() => {
		root.unmount();
	});

	await vi.waitFor(() => {
		expect(callbacks.onEntered).toHaveBeenCalledTimes(6);
	});
	expect(callbacks.onEntered.mock.calls.map(([node]) => node)).toEqual(
		expect.arrayContaining(children),
	);
	await settle(600);
	expect(recoverable).toEqual([]);
	expect(consoleError).not.toHaveBeenCalled();
	expect(mutations).toEqual([]);
	expect(document.getAnimations()).toEqual([]);
	expect(callbacks.onEnter).not.toHaveBeenCalled();
	expect(callbacks.onExit).not.toHaveBeenCalled();
	expect(callbacks.onExited).not.toHaveBeenCalled();
});
