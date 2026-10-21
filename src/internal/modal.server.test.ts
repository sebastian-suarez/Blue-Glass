/*
ModalLayer rendered on the server, in Node with no DOM globals. modal.test.tsx hydrates the same
trees in Chromium.
*/
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ModalLayer, type ModalLayerProps } from "./modal.js";

const surface = createElement(
	"div",
	{ id: "surface", role: "dialog", "aria-label": "Surface" },
	"Modal content",
);

function render(props: Omit<ModalLayerProps, "children">): string {
	// The children come as createElement's third argument, as JSX passes them.
	const layerProps = props as ModalLayerProps;
	return renderToString(
		createElement(
			"section",
			{ id: "host" },
			createElement(ModalLayer, layerProps, surface),
		),
	);
}

// No element exists on the server; the layer must not look at this one while rendering.
const element = Object.create(null) as Element;

const containers = [
	["omitted", undefined],
	["null", null],
	["an element", element],
	["a function", () => element],
] as const;

describe("ModalLayer on the server", () => {
	test("runs without DOM globals", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
		expect(typeof HTMLElement).toBe("undefined");
	});

	describe.each(containers)("with the container %s", (_label, container) => {
		test.each([true, false])(
			"renders open=%s without touching the DOM",
			(open) => {
				expect(() => render({ open, container })).not.toThrow();
			},
		);
	});

	test("a portaled layer leaves nothing in the server HTML", () => {
		expect(render({ open: true })).toBe('<section id="host"></section>');
	});

	test("disablePortal renders an open layer's content in place", () => {
		const html = render({ open: true, disablePortal: true });
		expect(html).toMatch(
			/^<section id="host"><div [^>]*class="gl-modal"[^>]*>.*<div id="surface" role="dialog" aria-label="Surface">Modal content<\/div>.*<\/section>$/u,
		);
		expect(html).toContain('class="gl-backdrop"');
	});

	test("disablePortal renders a closed layer only with keepMounted, and hidden", () => {
		expect(render({ open: false, disablePortal: true })).not.toContain(
			"Modal content",
		);
		const kept = render({
			open: false,
			disablePortal: true,
			keepMounted: true,
		});
		expect(kept).toContain("Modal content");
		expect(kept).toMatch(/class="gl-modal gl-modal-hidden"/u);
	});
});
