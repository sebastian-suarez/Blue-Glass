import { cleanup, render } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import {
	type BaseUiMenuCloseReason,
	BaseUiMenu,
	MenuItem,
	MenuList,
	useMenuItemMode,
} from "./menu-item.js";

afterEach(() => {
	cleanup();
});

async function frames(count = 3) {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- frames run one after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

function item(name: string): HTMLElement {
	const element = [
		...document.querySelectorAll<HTMLElement>(
			'[role="menuitem"], [role="menuitemradio"]',
		),
	].find(
		(candidate) =>
			candidate.querySelector(".gl-menu-item-label")?.textContent === name,
	);
	if (!element) {
		throw new Error(`no item named ${name}`);
	}

	return element;
}

function activeLabel(): string | undefined {
	const active = document.activeElement;
	const isItem =
		active?.matches('[role="menuitem"], [role="menuitemradio"]') === true;
	return isItem
		? (active?.querySelector(".gl-menu-item-label")?.textContent ?? undefined)
		: undefined;
}

async function press(keys: string, expected: string[]) {
	const seen: Array<string | undefined> = [];
	for (const key of keys.split(" ")) {
		// eslint-disable-next-line no-await-in-loop -- each key depends on the previous one
		await userEvent.keyboard(key);
		seen.push(activeLabel());
	}

	expect(seen).toEqual(expected);
}

type OnClick = (event: React.MouseEvent<HTMLElement>) => void;

type Clicks = {
	onCopy: ReturnType<typeof vi.fn<OnClick>>;
	onDelete: ReturnType<typeof vi.fn<OnClick>>;
	onArchive: ReturnType<typeof vi.fn<OnClick>>;
};

function items(clicks: Clicks, { selected }: { selected?: string } = {}) {
	return [
		<MenuItem
			key="copy"
			selected={selected === undefined ? undefined : selected === "Copy link"}
			onClick={clicks.onCopy}
		>
			Copy link
		</MenuItem>,
		<MenuItem
			key="cut"
			selected={selected === undefined ? undefined : selected === "Cut"}
		>
			Cut
		</MenuItem>,
		<MenuItem key="archive" disabled onClick={clicks.onArchive}>
			Archive
		</MenuItem>,
		<MenuItem
			key="delete"
			divider
			tone="danger"
			selected={selected === undefined ? undefined : selected === "Delete"}
			onClick={clicks.onDelete}
		>
			Delete
		</MenuItem>,
		<MenuItem key="download">Download</MenuItem>,
	];
}

function newClicks(): Clicks {
	return {
		onCopy: vi.fn<OnClick>(),
		onDelete: vi.fn<OnClick>(),
		onArchive: vi.fn<OnClick>(),
	};
}

describe("standalone MenuList", () => {
	test("renders without a Base UI menu around it", () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {
			// Silenced to assert on it.
		});
		try {
			render(<MenuList aria-label="Actions">{items(newClicks())}</MenuList>);
			expect(errors).not.toHaveBeenCalled();
		} finally {
			errors.mockRestore();
		}

		const list = document.querySelector('[role="menu"]');
		expect(list?.tagName).toBe("UL");
		expect(item("Copy link").tagName).toBe("LI");
		expect(item("Copy link").classList.contains("gl-menu-item")).toBe(true);
	});

	test("a roving tab stop: one item is tabbable, Tab enters on it and leaves the list", async () => {
		render(
			<>
				<button type="button" id="before">
					Before
				</button>
				<MenuList aria-label="Actions">{items(newClicks())}</MenuList>
				<button type="button" id="after">
					After
				</button>
			</>,
		);
		const tabbable = [
			...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
		].filter((element) => element.tabIndex === 0);
		expect(tabbable.map((element) => element.textContent)).toEqual([
			"Copy link",
		]);
		document.querySelector<HTMLElement>("#before")?.focus();
		await userEvent.tab();
		expect(activeLabel()).toBe("Copy link");
		await userEvent.keyboard("{ArrowDown}");
		await userEvent.tab();
		expect(document.activeElement).toBe(document.querySelector("#after"));
		await userEvent.tab({ shift: true });
		expect(activeLabel()).toBe("Cut");
	});

	test("Up and Down move and wrap; Home and End jump; disabled items are reachable", async () => {
		render(<MenuList aria-label="Actions">{items(newClicks())}</MenuList>);
		item("Copy link").focus();
		await press("{ArrowDown} {ArrowDown} {ArrowDown} {ArrowDown} {ArrowDown}", [
			"Cut",
			"Archive",
			"Delete",
			"Download",
			"Copy link",
		]);
		await press("{ArrowUp} {Home} {End}", [
			"Download",
			"Copy link",
			"Download",
		]);
		expect(item("Archive").getAttribute("aria-disabled")).toBe("true");
	});

	test("disableListWrap stops at the ends", async () => {
		render(
			<MenuList disableListWrap aria-label="Actions">
				{items(newClicks())}
			</MenuList>,
		);
		item("Download").focus();
		await press("{ArrowDown}", ["Download"]);
		item("Copy link").focus();
		await press("{ArrowUp}", ["Copy link"]);
	});

	test("typeahead: a letter, the same letter again, a word, and Space inside a word", async () => {
		render(<MenuList aria-label="Actions">{items(newClicks())}</MenuList>);
		item("Copy link").focus();
		await press("d d", ["Delete", "Download"]);
		await new Promise((resolve) => {
			setTimeout(resolve, 600);
		});
		await press("c u", ["Copy link", "Cut"]);
		await new Promise((resolve) => {
			setTimeout(resolve, 600);
		});
		const clicks = newClicks();
		cleanup();
		render(
			<MenuList aria-label="Actions">
				<MenuItem>Cut</MenuItem>
				<MenuItem onClick={clicks.onCopy}>Copy</MenuItem>
				<MenuItem onClick={clicks.onDelete}>Copy link</MenuItem>
			</MenuList>,
		);
		item("Cut").focus();
		await press("c o p y [Space] l", [
			"Copy",
			"Copy",
			"Copy",
			"Copy",
			"Copy link",
			"Copy link",
		]);
		expect(clicks.onCopy).not.toHaveBeenCalled();
		expect(clicks.onDelete).not.toHaveBeenCalled();
	});

	test("click, Enter and Space run onClick with a mouse event; disabled items don't", async () => {
		const clicks = newClicks();
		render(<MenuList aria-label="Actions">{items(clicks)}</MenuList>);
		await userEvent.click(item("Copy link"));
		expect(clicks.onCopy).toHaveBeenCalledTimes(1);
		const [event] = clicks.onCopy.mock.calls[0] as [React.MouseEvent];
		expect(event.type).toBe("click");
		expect(event.nativeEvent).toBeInstanceOf(MouseEvent);
		item("Delete").focus();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard("[Space]");
		expect(clicks.onDelete).toHaveBeenCalledTimes(2);
		item("Archive").focus();
		await userEvent.keyboard("{Enter}");
		// Playwright waits for aria-disabled elements to enable; force the press.
		await userEvent.click(item("Archive"), { force: true });
		expect(clicks.onArchive).not.toHaveBeenCalled();
	});

	test("selected items: menuitemradio, aria-checked, a check, and the first tab stop", () => {
		render(
			<MenuList aria-label="Actions">
				{items(newClicks(), { selected: "Delete" })}
			</MenuList>,
		);
		expect(item("Delete").getAttribute("role")).toBe("menuitemradio");
		expect(item("Delete").getAttribute("aria-checked")).toBe("true");
		expect(item("Cut").getAttribute("aria-checked")).toBe("false");
		expect(item("Delete").querySelector('[data-icon="check"]')).not.toBeNull();
		expect(item("Delete").tabIndex).toBe(0);
		expect(item("Copy link").tabIndex).toBe(-1);
	});

	test("autoFocusItem focuses the tab stop when it turns true", async () => {
		function Harness({ autoFocusItem }: { readonly autoFocusItem: boolean }) {
			return (
				<MenuList autoFocusItem={autoFocusItem} aria-label="Actions">
					{items(newClicks(), { selected: "Cut" })}
				</MenuList>
			);
		}

		const view = render(<Harness autoFocusItem={false} />);
		await frames();
		expect(activeLabel()).toBeUndefined();
		view.rerender(<Harness autoFocusItem />);
		await frames();
		expect(activeLabel()).toBe("Cut");
		expect(item("Cut").dataset.autofocus).toBe("");
	});

	test("dense, divider, tone and href", () => {
		render(
			<MenuList dense aria-label="Actions">
				{items(newClicks())}
				<MenuItem href="https://example.com" target="_blank" rel="noreferrer">
					Open repository
				</MenuItem>
			</MenuList>,
		);
		expect(
			document
				.querySelector('[role="menu"]')
				?.classList.contains("gl-menu-list-dense"),
		).toBe(true);
		expect(item("Cut").classList.contains("gl-menu-item-dense")).toBe(true);
		expect(item("Delete").classList.contains("gl-menu-item-danger")).toBe(true);
		expect(item("Delete").nextElementSibling?.getAttribute("role")).toBe(
			"separator",
		);
		const link = item("Open repository");
		expect(link.tagName).toBe("A");
		expect(link.getAttribute("href")).toBe("https://example.com");
		expect(link.parentElement?.getAttribute("role")).toBe("none");
	});

	test("a MenuItem alone renders the standalone row", () => {
		function Probe() {
			return <span id="mode">{useMenuItemMode() ?? "none"}</span>;
		}

		render(
			<ul aria-label="Alone">
				<MenuItem>Alone</MenuItem>
				<Probe />
			</ul>,
		);
		expect(item("Alone").tabIndex).toBe(0);
		expect(document.querySelector("#mode")?.textContent).toBe("none");
	});
});

describe("MenuItem inside a Base UI menu", () => {
	function Harness({
		clicks,
		onClose,
		selected,
		disableListWrap,
	}: {
		readonly clicks: Clicks;
		readonly onClose: (event: Event, reason: BaseUiMenuCloseReason) => void;
		readonly selected?: string;
		readonly disableListWrap?: boolean;
	}) {
		const [anchor, setAnchor] = React.useState<HTMLButtonElement | null>(null);
		return (
			<>
				<button ref={setAnchor} type="button" id="anchor">
					Actions
				</button>
				{anchor ? (
					<BaseUiMenu
						open
						anchor={anchor}
						disableListWrap={disableListWrap}
						aria-label="Actions"
						onClose={onClose}
					>
						{items(clicks, { selected })}
					</BaseUiMenu>
				) : null}
			</>
		);
	}

	async function open(
		options: { selected?: string; disableListWrap?: boolean } = {},
	) {
		const clicks = newClicks();
		const reasons: BaseUiMenuCloseReason[] = [];
		const onClose = vi.fn((_event: Event, reason: BaseUiMenuCloseReason) => {
			reasons.push(reason);
		});
		const errors = vi.spyOn(console, "error").mockImplementation(() => {
			// Silenced to assert on it.
		});
		try {
			render(<Harness clicks={clicks} onClose={onClose} {...options} />);
			await frames();
			expect(errors).not.toHaveBeenCalled();
		} finally {
			errors.mockRestore();
		}

		return { clicks, onClose, reasons };
	}

	test("renders Menu.Item rows in Base UI's role=menu popup", async () => {
		await open();
		const list = document.querySelector('[role="menu"]');
		expect(list?.tagName).toBe("UL");
		expect(item("Copy link").tagName).toBe("LI");
		expect(item("Copy link").classList.contains("gl-menu-item")).toBe(true);
		expect(item("Delete").nextElementSibling?.getAttribute("role")).toBe(
			"separator",
		);
	});

	test("Base UI's keys: Up and Down wrap, Home and End, typeahead, disabled reachable", async () => {
		await open();
		item("Copy link").focus();
		await press("{ArrowDown} {ArrowDown} {ArrowDown} {ArrowDown} {ArrowDown}", [
			"Cut",
			"Archive",
			"Delete",
			"Download",
			"Copy link",
		]);
		await press("{ArrowUp} {Home} {End}", [
			"Download",
			"Copy link",
			"Download",
		]);
		await new Promise((resolve) => {
			setTimeout(resolve, 600);
		});
		await press("c", ["Copy link"]);
		expect(item("Archive").getAttribute("aria-disabled")).toBe("true");
	});

	test("disableListWrap maps to loopFocus={false}", async () => {
		await open({ disableListWrap: true });
		item("Download").focus();
		await press("{ArrowDown}", ["Download"]);
	});

	test("selected items: menuitemradio and aria-checked", async () => {
		await open({ selected: "Delete" });
		expect(item("Delete").getAttribute("role")).toBe("menuitemradio");
		expect(item("Delete").getAttribute("aria-checked")).toBe("true");
		expect(item("Cut").getAttribute("aria-checked")).toBe("false");
		expect(item("Delete").querySelector('[data-icon="check"]')).not.toBeNull();
	});

	test("a click runs onClick, then the menu asks to close with itemClick", async () => {
		const menu = await open();
		await userEvent.click(item("Copy link"));
		expect(menu.clicks.onCopy).toHaveBeenCalledTimes(1);
		const [event] = menu.clicks.onCopy.mock.calls[0] as [React.MouseEvent];
		expect(event.nativeEvent).toBeInstanceOf(MouseEvent);
		expect(menu.reasons).toEqual(["itemClick"]);
	});

	test("Enter and Space run onClick", async () => {
		const menu = await open();
		item("Delete").focus();
		await userEvent.keyboard("{Enter}");
		item("Delete").focus();
		await userEvent.keyboard("[Space]");
		expect(menu.clicks.onDelete).toHaveBeenCalledTimes(2);
	});

	test("preventDefault in onClick keeps the menu open", async () => {
		const menu = await open();
		menu.clicks.onCopy.mockImplementation((event: React.MouseEvent) => {
			event.preventDefault();
		});
		await userEvent.click(item("Copy link"));
		expect(menu.clicks.onCopy).toHaveBeenCalledTimes(1);
		expect(menu.onClose).not.toHaveBeenCalled();
	});

	test("disabled items don't run onClick or close the menu", async () => {
		const menu = await open();
		item("Archive").focus();
		await userEvent.keyboard("{Enter}");
		// Playwright waits for aria-disabled elements to enable; force the press.
		await userEvent.click(item("Archive"), { force: true });
		expect(menu.clicks.onArchive).not.toHaveBeenCalled();
		expect(menu.onClose).not.toHaveBeenCalled();
	});

	test("Escape asks to close with escapeKeyDown", async () => {
		const menu = await open();
		item("Cut").focus();
		await userEvent.keyboard("{Escape}");
		expect(menu.reasons).toEqual(["escapeKeyDown"]);
	});
});
