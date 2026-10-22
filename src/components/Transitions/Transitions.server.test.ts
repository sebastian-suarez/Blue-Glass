/*
The transitions rendered on the server, in Node with no DOM globals. Transitions.test.tsx renders
the same tree in Chromium to the same file snapshot, and hydrates it.
*/
import { createElement, Fragment } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Collapse, Fade, Grow, Slide, Transition, Zoom } from "./index.js";

/**
Content that is `in` when the page renders, with `appear` at its default (Collapse's set).
*/
function serverTree() {
	return createElement(
		Fragment,
		null,
		createElement(Transition, {
			in: true,
			children: (status, ref) =>
				createElement(
					"section",
					{ ref, id: "transition", "data-status": status },
					"Transition",
				),
		}),
		createElement(Fade, {
			in: true,
			children: createElement("div", { id: "fade" }, "Fade"),
		}),
		createElement(Grow, {
			in: true,
			children: createElement("div", { id: "grow" }, "Grow"),
		}),
		createElement(Zoom, {
			in: true,
			children: createElement("div", { id: "zoom" }, "Zoom"),
		}),
		createElement(Slide, {
			in: true,
			children: createElement("div", { id: "slide" }, "Slide"),
		}),
		createElement(Collapse, {
			in: true,
			appear: true,
			children: createElement("p", { id: "collapse" }, "Collapse"),
		}),
	);
}

describe("the transitions on the server", () => {
	test("run without DOM globals", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
	});

	test("content that is in renders entered and visible, even with appear", async () => {
		const html = renderToString(serverTree());
		await expect(html).toMatchFileSnapshot("./Transitions.server.html.txt");
		expect(html.match(/data-transition="entered"/gu)).toHaveLength(5);
		expect(html).toContain('id="transition" data-status="entered"');
		expect(html).not.toMatch(/opacity:0|visibility:hidden|aria-hidden/u);
		// Nothing waits away from its place: no start scale, no start offset.
		expect(html).not.toMatch(/scale\(|translate3d\(/u);
		expect(html).toContain("grid-template-rows:minmax(0px, 1fr)");
	});

	test("content that is out renders hidden, or not at all with mountOnEnter", () => {
		const html = renderToString(
			createElement(
				Fragment,
				null,
				createElement(Grow, {
					in: false,
					children: createElement("div", { id: "out" }, "Out"),
				}),
				createElement(Fade, {
					in: false,
					mountOnEnter: true,
					children: createElement("div", { id: "lazy" }, "Lazy"),
				}),
				createElement(Collapse, { in: false, children: "Closed" }),
			),
		);
		expect(html).toMatch(
			/id="out" data-transition="exited" style="opacity:0;transform:scale\(0\.96\)[^"]*visibility:hidden/u,
		);
		expect(html).not.toContain("Lazy");
		expect(html).toMatch(
			/class="gl-collapse" data-transition="exited" aria-hidden="true" style="[^"]*grid-template-rows:minmax\(0px, 0fr\)[^"]*visibility:hidden/u,
		);
	});

	test("each carries the mark a Modal reads to drive its in and wait for its exit", () => {
		for (const transition of [Transition, Fade, Grow, Zoom, Slide, Collapse]) {
			expect(transition.__glTransition).toBe(true);
		}
	});
});
