import { act, cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test } from "vitest";
import "#ui/styles.css";
import { NoSsr } from "#ui";

afterEach(() => {
	cleanup();
});

async function nextFrame(): Promise<void> {
	await new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});
}

/**
A browser-only child, like the preview's: it reads window while it renders, and counts its
renders.
*/
function frameWidth() {
	const renders = { count: 0 };
	function FrameWidth() {
		renders.count++;
		return <span>This frame is {window.innerWidth}px wide.</span>;
	}

	return { renders, FrameWidth };
}

/**
Puts the tree's server HTML in a host on the page, ready to hydrate, and records the
recoverable errors React reports while hydrating.
*/
function serverPage(tree: React.ReactElement) {
	const host = document.createElement("div");
	document.body.append(host);
	const errors: unknown[] = [];
	let root: ReturnType<typeof hydrateRoot> | undefined;
	host.innerHTML = renderToString(tree);
	return {
		host,
		errors,
		async hydrate() {
			await act(async () => {
				root = hydrateRoot(host, tree, {
					onRecoverableError(error) {
						errors.push(error);
					},
				});
			});
		},
		remove() {
			act(() => {
				root?.unmount();
			});
			host.remove();
		},
	};
}

describe("NoSsr", () => {
	test("renders its children in the browser, with no element of its own around them", () => {
		render(
			<ul>
				<NoSsr fallback={<li>Measuring…</li>}>
					<li>Measured</li>
				</NoSsr>
			</ul>,
		);
		const item = screen.getByRole("listitem");
		expect(item).toHaveTextContent("Measured");
		expect(item.parentElement).toBe(screen.getByRole("list"));
		expect(screen.queryByText("Measuring…")).toBeNull();
	});

	test("its children never render on the server: the server HTML holds the fallback", () => {
		const { renders, FrameWidth } = frameWidth();
		const html = renderToString(
			<NoSsr fallback={<span>Measuring…</span>}>
				<FrameWidth />
			</NoSsr>,
		);
		expect(renders.count).toBe(0);
		const host = document.createElement("div");
		host.innerHTML = html;
		expect(host.textContent).toBe("Measuring…");
	});

	test("the fallback is nothing by default", () => {
		const { renders, FrameWidth } = frameWidth();
		const host = document.createElement("div");
		host.innerHTML = renderToString(
			<NoSsr>
				<FrameWidth />
			</NoSsr>,
		);
		expect(renders.count).toBe(0);
		expect(host).toBeEmptyDOMElement();
	});

	test.each([false, true])(
		"hydrating the server HTML (defer=%s) raises no error, then swaps the fallback for the children",
		async (defer) => {
			const { FrameWidth } = frameWidth();
			const page = serverPage(
				<NoSsr defer={defer} fallback={<span>Measuring…</span>}>
					<FrameWidth />
				</NoSsr>,
			);
			try {
				expect(page.host.textContent).toBe("Measuring…");
				await page.hydrate();
				await expect
					.poll(() => page.host.textContent)
					.toBe(`This frame is ${window.innerWidth}px wide.`);
				expect(page.errors).toEqual([]);
			} finally {
				page.remove();
			}
		},
	);

	test("defer waits one more frame after mount: the fallback first, then the children in its place", async () => {
		const { renders, FrameWidth } = frameWidth();
		render(
			<NoSsr defer fallback={<span>deferred…</span>}>
				<FrameWidth />
			</NoSsr>,
		);
		expect(screen.getByText("deferred…")).toBeVisible();
		expect(renders.count).toBe(0);

		await act(async () => {
			await nextFrame();
			await nextFrame();
		});
		expect(
			screen.getByText(`This frame is ${window.innerWidth}px wide.`),
		).toBeVisible();
		expect(screen.queryByText("deferred…")).toBeNull();
	});

	test("defer with no fallback renders nothing until the children", async () => {
		const { container } = render(
			<NoSsr defer>
				<span>Heavy chart</span>
			</NoSsr>,
		);
		expect(container).toBeEmptyDOMElement();
		await act(async () => {
			await nextFrame();
			await nextFrame();
		});
		expect(screen.getByText("Heavy chart")).toBeVisible();
	});
});
