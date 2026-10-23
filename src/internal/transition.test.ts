import { createElement, Fragment } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import {
	Box,
	Panel,
	ServerTree,
} from "../../tests/fixtures/transition-tree.js";
import {
	collapseStyle,
	durations,
	fadeStyle,
	getTimeout,
	growStyle,
	isShown,
	type MotionContext,
	slideStyle,
	type TransitionStatus,
	zoomStyle,
} from "./transition.js";

describe("server rendering", () => {
	test("runs without DOM globals", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
	});

	test("content that is in renders entered and visible, even with appear", async () => {
		const html = renderToString(createElement(ServerTree));
		await expect(html).toMatchFileSnapshot("./transition.server.html.txt");
		expect(html.match(/data-transition="entered"/gu)).toHaveLength(5);
		expect(html).not.toMatch(/opacity:0/u);
		expect(html).not.toMatch(/visibility:hidden/u);
		expect(html).not.toMatch(/aria-hidden/u);
		expect(html).not.toMatch(/scale\(|translate3d\(/u);
		expect(html).toContain("grid-template-rows:minmax(0px, 1fr)");
	});

	test("content that is out renders hidden, or not at all with mountOnEnter", () => {
		const html = renderToString(
			createElement(
				Fragment,
				null,
				createElement(Box, { kind: "fade", label: "out", in: false }),
				createElement(Box, {
					kind: "fade",
					label: "lazy",
					in: false,
					mountOnEnter: true,
				}),
				createElement(Panel, { in: false }),
			),
		);
		expect(html).toMatch(
			/id="out" data-transition="exited" style="opacity:0;visibility:hidden/u,
		);
		expect(html).not.toContain('id="lazy"');
		expect(html).toMatch(
			/id="panel" data-transition="exited" aria-hidden="true"[^>]*grid-template-rows:minmax\(0px, 0fr\)/u,
		);
	});
});

describe("timeouts", () => {
	test("each direction falls back to the default on its own", () => {
		expect(getTimeout(undefined, "enter", 200)).toBe(200);
		expect(getTimeout(120, "exit", 150)).toBe(120);
		expect(getTimeout({ exit: 0 }, "exit", 150)).toBe(0);
		expect(getTimeout({ exit: 90 }, "enter", 200)).toBe(200);
	});

	test("exits are faster than entrances", () => {
		for (const { enter, exit } of Object.values(durations)) {
			expect(exit).toBeLessThan(enter);
		}
	});
});

const statuses: TransitionStatus[] = [
	"exited",
	"entering",
	"entered",
	"exiting",
];
const motion: MotionContext = { enter: 200, exit: 150, reduced: false };
const reduced: MotionContext = { ...motion, reduced: true };
const easeOut = "var(--ease-out-quint, cubic-bezier(0.23, 1, 0.32, 1))";

describe("motion", () => {
	test("Grow starts at 0.96 and Zoom at 0.85, always with opacity", () => {
		expect(growStyle("exited", motion)).toMatchObject({
			opacity: 0,
			transform: "scale(0.96)",
			transformOrigin: "var(--gl-transform-origin, center)",
		});
		expect(zoomStyle("exiting", motion)).toMatchObject({
			opacity: 0,
			transform: "scale(0.85)",
		});
		expect(growStyle("entering", motion, "top left")).toMatchObject({
			opacity: 1,
			transform: "none",
			transformOrigin: "top left",
		});
	});

	test("entrances ease out over the enter time, exits run the exit time", () => {
		expect(fadeStyle("entering", motion).transition).toBe(
			`opacity 200ms ${easeOut}`,
		);
		expect(fadeStyle("exiting", motion).transition).toBe("opacity 150ms ease");
		expect(slideStyle("exiting", motion, "left")).toMatchObject({
			transform: "translate3d(100%, 0, 0)",
			transition: `transform 150ms ${easeOut}`,
		});
	});

	test("only exited hides the child: exiting still shows it fading out", () => {
		for (const status of statuses) {
			expect(fadeStyle(status, motion).visibility).toBe(
				status === "exited" ? "hidden" : undefined,
			);
		}

		expect(isShown("exiting")).toBe(false);
		expect(isShown("entering")).toBe(true);
	});
});

describe("reduced motion", () => {
	test("Grow, Zoom and Slide become opacity fades: nothing moves", () => {
		for (const status of statuses) {
			for (const style of [
				growStyle(status, reduced),
				zoomStyle(status, reduced),
				slideStyle(status, reduced, "right"),
			]) {
				expect(style.transform).toBe("none");
				expect(style.opacity).toBe(isShown(status) ? 1 : 0);
			}

			expect(slideStyle(status, reduced).transition).toMatch(/^opacity /u);
		}
	});

	test("Fade is unchanged", () => {
		for (const status of statuses) {
			expect(fadeStyle(status, reduced)).toEqual(fadeStyle(status, motion));
		}
	});

	test("Collapse is instant", () => {
		for (const status of statuses) {
			expect(collapseStyle(status, reduced, { in: true }).root.transition).toBe(
				"none",
			);
		}

		expect(
			collapseStyle("entering", motion, { in: true }).root.transition,
		).toBe(`grid-template-rows 200ms ${easeOut}`);
	});
});
