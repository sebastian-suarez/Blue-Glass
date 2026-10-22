/*
The standalone MenuList rendered on the server, in Node with no DOM globals. menu-item.test.tsx
hydrates the same HTML in Chromium.
*/
import { createElement, Fragment } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { MenuItem, MenuList } from "./menu-item.js";

function renderList(
	items: Array<{ label: string; selected?: boolean; disabled?: boolean }>,
): string {
	return renderToString(
		createElement(
			MenuList,
			{ "aria-label": "Actions" },
			items.map(({ label, ...props }) =>
				createElement(MenuItem, { key: label, ...props }, label),
			),
		),
	);
}

// The labels of the items with tabindex="0", in order.
function tabbable(html: string): string[] {
	return html
		.matchAll(
			/<li [^>]*tabindex="0"[^>]*>.*?class="gl-menu-item-label">(?<label>[^<]*)</gu,
		)
		.map((match) => match.groups?.label ?? "")
		.toArray();
}

describe("MenuList on the server", () => {
	test("one item is tabbable: the first enabled one", () => {
		const html = renderList([
			{ label: "Archive", disabled: true },
			{ label: "Copy link" },
			{ label: "Delete" },
		]);
		expect(tabbable(html)).toEqual(["Copy link"]);
	});

	test("one item is tabbable: the selected one", () => {
		const html = renderList([
			{ label: "Copy link", selected: false },
			{ label: "Cut", selected: true },
			{ label: "Delete", selected: false },
		]);
		expect(tabbable(html)).toEqual(["Cut"]);
	});

	test("with every item disabled, the first is tabbable", () => {
		const html = renderList([
			{ label: "Archive", disabled: true },
			{ label: "Delete", disabled: true },
		]);
		expect(tabbable(html)).toEqual(["Archive"]);
	});

	// Items the list can't see while rendering: inside a fragment, or rendered by a component.
	// Each is tabbable until the list mounts and picks one.
	test("items inside a fragment are tabbable", () => {
		const items = [
			createElement(MenuItem, { key: "copy" }, "Copy link"),
			createElement(MenuItem, { key: "delete" }, "Delete"),
		];
		const html = renderToString(
			createElement(
				MenuList,
				{ "aria-label": "Actions" },
				createElement(Fragment, null, items),
			),
		);
		expect(tabbable(html)).toEqual(["Copy link", "Delete"]);
	});

	test("items a component renders are tabbable", () => {
		// A component in a .ts file: createElement takes it as a function.
		const shareItem = () => createElement(MenuItem, null, "Share");
		const html = renderToString(
			createElement(
				MenuList,
				{ "aria-label": "Actions" },
				createElement(shareItem),
			),
		);
		expect(tabbable(html)).toEqual(["Share"]);
	});
});
