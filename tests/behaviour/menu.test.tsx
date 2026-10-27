import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, type Mock, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	Menu,
	type MenuCloseReason,
	MenuItem,
	MenuList,
	type MenuProps,
	type Placement,
} from "#ui";

afterEach(async () => {
	cleanup();
	window.history.replaceState(
		null,
		"",
		window.location.pathname + window.location.search,
	);
	await expect.poll(() => isScrollLocked()).toBe(false);
	await expect
		.poll(
			() => document.querySelectorAll('[aria-hidden="true"], [inert]').length,
		)
		.toBe(0);
});

type OnClose = NonNullable<MenuProps["onClose"]>;
type OnClick = (event: React.MouseEvent<HTMLElement>) => void;

type ProjectMenuProps = Omit<MenuProps, "open" | "anchorEl" | "onClose"> & {
	readonly onClose?: OnClose;
	readonly closes?: boolean;
	readonly at?: { left: number; top: number; width?: number };
	readonly ref?: React.Ref<HTMLDivElement>;
};

const menuButtonAt = { left: 48, top: 96 };

function ProjectMenu({
	onClose,
	closes = true,
	at = menuButtonAt,
	...props
}: ProjectMenuProps) {
	const [anchor, setAnchor] = React.useState<HTMLButtonElement | null>(null);
	const [open, setOpen] = React.useState(false);
	return (
		<>
			<p>VSebCode, a fork of VS Code.</p>
			<button
				ref={setAnchor}
				id="project-actions"
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={open ? "project-menu" : undefined}
				style={{ position: "fixed", margin: 0, ...at }}
				onClick={() => {
					setOpen(true);
				}}
			>
				Project actions
			</button>
			<Menu
				id="project-menu"
				open={open}
				anchorEl={anchor}
				onClose={(event, reason) => {
					onClose?.(event, reason);
					if (closes) {
						setOpen(false);
					}
				}}
				{...props}
			/>
		</>
	);
}

async function openMenu(): Promise<{ button: HTMLElement; menu: HTMLElement }> {
	const button = screen.getByRole("button", { name: "Project actions" });
	await userEvent.click(button);
	const menu = await vi.waitFor(() =>
		screen.getByRole("menu", { name: "Project actions" }),
	);
	return { button, menu };
}

async function expectClosed(): Promise<void> {
	await expect
		.poll(() => screen.queryByRole("menu", { name: "Project actions" }))
		.toBeNull();
}

async function pressOutside(): Promise<void> {
	await userEvent.click(document.body, {
		force: true,
		position: { x: 4, y: 4 },
	});
}

function item(name: string | RegExp): HTMLElement {
	return (
		screen.queryByRole("menuitem", { name }) ??
		screen.getByRole("menuitemradio", { name })
	);
}

async function walk(
	steps: ReadonlyArray<readonly [key: string, name: string]>,
): Promise<void> {
	for (const [key, name] of steps) {
		// eslint-disable-next-line no-await-in-loop -- each key starts where the last left focus
		await userEvent.keyboard(key);
		// eslint-disable-next-line no-await-in-loop
		await expect.element(item(name)).toHaveFocus();
	}
}

function rowHeights(names: readonly string[]): number[] {
	return names.map((name) =>
		Math.round(item(name).getBoundingClientRect().height),
	);
}

function isInOrder(...elements: Array<Element | undefined>): boolean {
	const all = [...document.querySelectorAll("*")];
	const positions = elements.map((element) =>
		element === undefined ? -1 : all.indexOf(element),
	);
	return positions.every(
		(position, index) => position > (positions[index - 1] ?? -1),
	);
}

function nativeOf(event: React.SyntheticEvent | Event): Event {
	return event instanceof Event ? event : event.nativeEvent;
}

function onlyClose(
	onClose: Mock<OnClose>,
): [React.SyntheticEvent | KeyboardEvent, MenuCloseReason] {
	expect(onClose).toHaveBeenCalledTimes(1);
	const [event, reason] = onClose.mock.calls[0] ?? [];
	if (event === undefined || reason === undefined) {
		throw new Error("onClose got no event or reason");
	}

	return [event, reason];
}

function isScrollLocked(): boolean {
	return [document.documentElement, document.body].some((element) =>
		/^(?:hidden|clip)$/v.test(getComputedStyle(element).overflowY),
	);
}

async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- frames run one after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

function misplacement(
	anchor: Element,
	surface: Element | null,
	placement: Placement,
): string[] {
	if (!surface) {
		return ["no surface"];
	}

	const a = anchor.getBoundingClientRect();
	const s = surface.getBoundingClientRect();
	const [side, align] = placement.split("-", 2);
	const problems: string[] = [];
	const near = (what: string, actual: number, expected: number) => {
		if (Math.abs(actual - expected) > 1.5) {
			problems.push(
				`${what} at ${actual.toFixed(1)}, not ${expected.toFixed(1)}`,
			);
		}
	};

	if (side === "top") {
		near("bottom edge", s.bottom, a.top - 8);
	} else {
		near("top edge", s.top, a.bottom + 8);
	}

	if (align === "end") {
		near("right edge", s.right, a.right);
	} else {
		near("left edge", s.left, a.left);
	}

	return problems;
}

type Clicks = Record<
	"copy" | "share" | "archive" | "delete" | "download",
	Mock<OnClick>
>;

function newClicks(): Clicks {
	return {
		copy: vi.fn<OnClick>(),
		share: vi.fn<OnClick>(),
		archive: vi.fn<OnClick>(),
		delete: vi.fn<OnClick>(),
		download: vi.fn<OnClick>(),
	};
}

function projectActions(clicks: Clicks = newClicks()): React.ReactNode {
	return [
		<MenuItem key="copy" onClick={clicks.copy}>
			Copy link
		</MenuItem>,
		<MenuItem key="share" divider onClick={clicks.share}>
			Share
		</MenuItem>,
		<MenuItem key="archive" disabled onClick={clicks.archive}>
			Archive
		</MenuItem>,
		<MenuItem key="delete" tone="danger" onClick={clicks.delete}>
			Delete
		</MenuItem>,
		<MenuItem key="download" onClick={clicks.download}>
			Download
		</MenuItem>,
	];
}

const allActions = ["Copy link", "Share", "Archive", "Delete", "Download"];

type Mode = "menu" | "list";

async function present(
	mode: Mode,
	items: React.ReactNode,
	{
		dense,
		disableListWrap,
	}: { readonly dense?: boolean; readonly disableListWrap?: boolean } = {},
): Promise<{ list: HTMLElement; onClose: Mock<OnClose> }> {
	const onClose = vi.fn<OnClose>();
	if (mode === "menu") {
		render(
			<ProjectMenu
				dense={dense}
				MenuListProps={{ disableListWrap }}
				onClose={onClose}
			>
				{items}
			</ProjectMenu>,
		);
		const { menu } = await openMenu();
		return { list: menu, onClose };
	}

	render(
		<>
			<button type="button">Before</button>
			<MenuList
				aria-label="Project actions"
				dense={dense}
				disableListWrap={disableListWrap}
			>
				{items}
			</MenuList>
			<button type="button">After</button>
		</>,
	);
	await userEvent.click(screen.getByRole("button", { name: "Before" }));
	await userEvent.tab();
	return {
		list: screen.getByRole("menu", { name: "Project actions" }),
		onClose,
	};
}

describe.each([
	["inside a Menu", "menu"],
	["in a standalone MenuList", "list"],
] as const)("MenuItem %s", (_where, mode) => {
	test("focus starts on the first item; Down and Up move between items and wrap, and Home and End go to the first and last", async () => {
		await present(mode, projectActions());
		await expect.element(item("Copy link")).toHaveFocus();
		await walk([
			["{ArrowDown}", "Share"],
			["{ArrowDown}", "Archive"],
			["{ArrowDown}", "Delete"],
			["{ArrowDown}", "Download"],
			["{ArrowDown}", "Copy link"],
			["{ArrowUp}", "Download"],
			["{Home}", "Copy link"],
			["{End}", "Download"],
		]);
	});

	test("focus starts on the first enabled item", async () => {
		await present(mode, [
			<MenuItem key="archive" disabled>
				Archive
			</MenuItem>,
			<MenuItem key="copy">Copy link</MenuItem>,
			<MenuItem key="share">Share</MenuItem>,
		]);
		await expect.element(item("Copy link")).toHaveFocus();
	});

	test("disableListWrap stops the arrows at the first and last item", async () => {
		await present(mode, projectActions(), { disableListWrap: true });
		await expect.element(item("Copy link")).toHaveFocus();
		await walk([
			["{ArrowUp}", "Copy link"],
			["{ArrowDown}", "Share"],
			["{End}", "Download"],
			["{ArrowDown}", "Download"],
			["{ArrowUp}", "Delete"],
		]);
	});

	test("a disabled item is reachable with the arrows and marked aria-disabled, but Enter, Space and a click do nothing", async () => {
		const clicks = newClicks();
		const { onClose } = await present(mode, projectActions(clicks));
		await expect.element(item("Copy link")).toHaveFocus();
		await walk([
			["{ArrowDown}", "Share"],
			["{ArrowDown}", "Archive"],
		]);
		const archive = item("Archive");
		expect(archive).toHaveAttribute("aria-disabled", "true");
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		await userEvent.click(archive, { force: true });
		expect(clicks.archive).not.toHaveBeenCalled();
		await walk([["{ArrowDown}", "Delete"]]);
		expect(onClose).not.toHaveBeenCalled();
	});

	test("typing a letter moves to the next item that starts with it", async () => {
		await present(mode, projectActions());
		await expect.element(item("Copy link")).toHaveFocus();
		await walk([
			["d", "Delete"],
			["d", "Download"],
		]);
	});

	test("typing quickly matches a word", async () => {
		await present(mode, projectActions());
		await expect.element(item("Copy link")).toHaveFocus();
		await walk([["do", "Download"]]);
	});

	test.each([
		["Enter", "{Enter}"],
		["Space", " "],
	] as const)(
		"%s runs the focused item's onClick with a click event",
		async (_key, key) => {
			const clicks = newClicks();
			await present(mode, projectActions(clicks));
			await expect.element(item("Copy link")).toHaveFocus();
			await userEvent.keyboard(key);
			await vi.waitFor(() => {
				expect(clicks.copy).toHaveBeenCalledTimes(1);
			});
			const [event] = clicks.copy.mock.calls[0] ?? [];
			expect(event?.type).toBe("click");
			expect(event?.nativeEvent).toBeInstanceOf(MouseEvent);
			expect(clicks.share).not.toHaveBeenCalled();
		},
	);

	test("a click runs the item's onClick with the click event", async () => {
		const clicks = newClicks();
		await present(mode, projectActions(clicks));
		await userEvent.click(item("Share"));
		expect(clicks.share).toHaveBeenCalledTimes(1);
		const [event] = clicks.share.mock.calls[0] ?? [];
		expect(event?.type).toBe("click");
		expect(event?.nativeEvent).toBeInstanceOf(MouseEvent);
	});

	test("selected makes items menuitemradio with aria-checked, true or false, and focus starts on the selected one", async () => {
		await present(mode, [
			<MenuItem key="copy" selected={false}>
				Copy link
			</MenuItem>,
			<MenuItem key="share" selected>
				Share
			</MenuItem>,
			<MenuItem key="delete" selected={false}>
				Delete
			</MenuItem>,
			<MenuItem key="download">Download</MenuItem>,
		]);
		const share = screen.getByRole("menuitemradio", { name: "Share" });
		await expect.element(share).toHaveFocus();
		expect(share).toHaveAttribute("aria-checked", "true");
		for (const name of ["Copy link", "Delete"]) {
			expect(screen.getByRole("menuitemradio", { name })).toHaveAttribute(
				"aria-checked",
				"false",
			);
		}

		expect(
			screen.getByRole("menuitem", { name: "Download" }),
		).not.toHaveAttribute("aria-checked");
	});

	test("href renders a link: an <a> menuitem with its href, target and rel, inside a role=none item, and the ref is the link", async () => {
		const ref = React.createRef<HTMLElement>();
		await present(mode, [
			<MenuItem key="copy">Copy link</MenuItem>,
			<MenuItem
				key="repository"
				ref={ref}
				href="https://github.com/sebastian-suarez/VSebCode"
				target="_blank"
				rel="noreferrer"
			>
				Open repository
			</MenuItem>,
		]);
		const link = item("Open repository");
		expect(link).toBeInstanceOf(HTMLAnchorElement);
		expect(link).toHaveAttribute(
			"href",
			"https://github.com/sebastian-suarez/VSebCode",
		);
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noreferrer");
		expect(link.parentElement).toBeInstanceOf(HTMLLIElement);
		expect(link.parentElement).toHaveAttribute("role", "none");
		expect(ref.current).toBe(link);
	});

	test.each([
		["a click", "click"],
		["Enter", "{Enter}"],
		["Space", " "],
	] as const)("%s on a link item runs its onClick", async (_how, how) => {
		const onClick = vi.fn<OnClick>();
		await present(mode, [
			<MenuItem key="copy">Copy link</MenuItem>,
			<MenuItem key="docs" href="#menu-docs" onClick={onClick}>
				Read the docs
			</MenuItem>,
		]);
		if (how === "click") {
			await userEvent.click(item("Read the docs"));
		} else {
			await walk([["{End}", "Read the docs"]]);
			await userEvent.keyboard(how);
		}

		await vi.waitFor(() => {
			expect(onClick).toHaveBeenCalledTimes(1);
		});
		expect(onClick.mock.calls[0]?.[0].type).toBe("click");
	});

	test('divider puts a separator after its item, a <li role="separator"> works too, and the arrows step over both', async () => {
		const { list } = await present(mode, [
			<MenuItem key="copy">Copy link</MenuItem>,
			<MenuItem key="share" divider>
				Share
			</MenuItem>,
			<MenuItem key="archive">Archive</MenuItem>,
			<li key="break" role="separator" />,
			<MenuItem key="delete" tone="danger">
				Delete
			</MenuItem>,
		]);
		const separators = within(list).getAllByRole("separator");
		expect(separators).toHaveLength(2);
		expect(
			isInOrder(
				item("Share"),
				separators[0],
				item("Archive"),
				separators[1],
				item("Delete"),
			),
		).toBe(true);
		await expect.element(item("Copy link")).toHaveFocus();
		await walk([
			["{ArrowDown}", "Share"],
			["{ArrowDown}", "Archive"],
			["{ArrowDown}", "Delete"],
		]);
	});

	test("dense on the list makes every row 32px tall", async () => {
		await present(mode, projectActions(), { dense: true });
		await expect
			.poll(() => rowHeights(allActions))
			.toEqual([32, 32, 32, 32, 32]);
		for (const name of allActions) {
			expect(item(name)).toHaveClass("gl-menu-item-dense");
		}
	});

	test("rows are 40px tall, and an item's own dense makes its row 32px", async () => {
		await present(mode, [
			<MenuItem key="copy">Copy link</MenuItem>,
			<MenuItem key="share" dense>
				Share
			</MenuItem>,
			<MenuItem key="delete">Delete</MenuItem>,
		]);
		await expect
			.poll(() => rowHeights(["Copy link", "Share", "Delete"]))
			.toEqual([40, 32, 40]);
		expect(item("Share")).toHaveClass("gl-menu-item-dense");
		expect(item("Copy link")).not.toHaveClass("gl-menu-item-dense");
	});

	test("tone danger gives the item the danger class", async () => {
		await present(mode, projectActions());
		expect(item("Delete")).toHaveClass("gl-menu-item-danger");
		expect(item("Share")).not.toHaveClass("gl-menu-item-danger");
	});

	test("icon, the label, secondary and end fill the row in that order, and aria-keyshortcuts lands on the item", async () => {
		await present(mode, [
			<MenuItem
				key="copy"
				icon={<svg role="img" aria-label="Link icon" width={16} height={16} />}
				secondary="Paste it anywhere"
				end="⌘C"
				aria-keyshortcuts="Meta+C"
			>
				Copy link
			</MenuItem>,
			<MenuItem key="share">Share</MenuItem>,
		]);
		const copy = item(/Copy link/v);
		expect(copy).toHaveAttribute("aria-keyshortcuts", "Meta+C");
		expect(
			isInOrder(
				within(copy).getByRole("img", { name: "Link icon" }),
				within(copy).getByText("Copy link"),
				within(copy).getByText("Paste it anywhere"),
				within(copy).getByText("⌘C"),
			),
		).toBe(true);
	});

	test("the ref and className land on the item", async () => {
		const ref = React.createRef<HTMLElement>();
		await present(mode, [
			<MenuItem key="copy" ref={ref} className="project-action">
				Copy link
			</MenuItem>,
			<MenuItem key="share">Share</MenuItem>,
		]);
		expect(ref.current).toBe(item("Copy link"));
		expect(item("Copy link")).toHaveClass("project-action");
	});
});

describe("Menu", () => {
	test("the button's id names it, and the Menu's id lands on its role=menu list of menuitems", async () => {
		render(<ProjectMenu>{projectActions()}</ProjectMenu>);
		const { button, menu } = await openMenu();
		expect(menu).toHaveAttribute("id", "project-menu");
		expect(button).toHaveAttribute("aria-controls", menu.id);
		expect(
			within(menu)
				.getAllByRole("menuitem")
				.map((element) => element.textContent),
		).toEqual(allActions);
	});

	test("MenuListProps reach the list: its aria-labelledby names the menu instead of the button", async () => {
		render(
			<>
				<h2 id="project-title">VSebCode</h2>
				<ProjectMenu MenuListProps={{ "aria-labelledby": "project-title" }}>
					{projectActions()}
				</ProjectMenu>
			</>,
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Project actions" }),
		);
		await vi.waitFor(() => screen.getByRole("menu", { name: "VSebCode" }));
	});

	test("the ref and className land on its surface, a div holding the list", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<ProjectMenu ref={ref} className="project-menu">
				{projectActions()}
			</ProjectMenu>,
		);
		const { menu } = await openMenu();
		expect(ref.current).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toHaveClass("project-menu");
		expect(ref.current?.contains(menu)).toBe(true);
	});

	test("it opens 8px below its button, their left edges lined up (bottom-start)", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(<ProjectMenu ref={ref}>{projectActions()}</ProjectMenu>);
		const { button } = await openMenu();
		await expect
			.poll(() => misplacement(button, ref.current, "bottom-start"))
			.toEqual([]);
	});

	test.each([
		["bottom-end", "right edges lined up", { left: 240, top: 96 }],
		["top-start", "8px above it", { left: 48, top: 640 }],
	] as const)(
		"placement %s puts it against its button, %s",
		async (placement, _where, at) => {
			const ref = React.createRef<HTMLDivElement>();
			render(
				<ProjectMenu ref={ref} placement={placement} at={at}>
					{projectActions()}
				</ProjectMenu>,
			);
			const { button } = await openMenu();
			await expect
				.poll(() => misplacement(button, ref.current, placement))
				.toEqual([]);
		},
	);

	test("autoFocus={false} opens it without focusing an item", async () => {
		render(<ProjectMenu autoFocus={false}>{projectActions()}</ProjectMenu>);
		const { menu } = await openMenu();
		await frames();
		expect(menu).toBeVisible();
		const focused = document.activeElement;
		expect(focused?.getAttribute("role") ?? "").not.toMatch(/^menuitem/v);
	});

	test("disableAutoFocus leaves focus out of the menu when it opens", async () => {
		render(<ProjectMenu disableAutoFocus>{projectActions()}</ProjectMenu>);
		const { menu } = await openMenu();
		await frames();
		expect(menu).toBeVisible();
		expect(menu.contains(document.activeElement)).toBe(false);
	});

	test("disableAutoFocus with disablePortal, as the preview stages it, keeps focus on the button", async () => {
		render(
			<ProjectMenu disableAutoFocus disablePortal>
				{projectActions()}
			</ProjectMenu>,
		);
		const { button, menu } = await openMenu();
		await frames();
		expect(menu).toBeVisible();
		expect(button).toHaveFocus();
	});

	test("disableRestoreFocus, from Popover, leaves focus off the button once it closes", async () => {
		render(<ProjectMenu disableRestoreFocus>{projectActions()}</ProjectMenu>);
		const { button, menu } = await openMenu();
		await expect.poll(() => menu.contains(document.activeElement)).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await frames();
		expect(button).not.toHaveFocus();
	});

	test("keepMounted, from Popover, keeps the items in the document while closed, hidden, and opens them again", async () => {
		render(<ProjectMenu keepMounted>{projectActions()}</ProjectMenu>);
		const copy = screen.getByText("Copy link");
		expect(copy).not.toBeVisible();
		const { button } = await openMenu();
		await expect.element(copy).toBeVisible();
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.element(copy).not.toBeVisible();
		expect(copy.isConnected).toBe(true);
		await userEvent.click(button);
		await expect.element(copy).toBeVisible();
	});

	test("matchWidth, from Popover, makes the menu at least as wide as its button", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<ProjectMenu ref={ref} matchWidth at={{ ...menuButtonAt, width: 360 }}>
				{projectActions()}
			</ProjectMenu>,
		);
		const { button } = await openMenu();
		await expect
			.poll(() => Math.round(ref.current?.getBoundingClientRect().width ?? 0))
			.toBeGreaterThanOrEqual(Math.round(button.getBoundingClientRect().width));
	});

	test("transitionDuration, from Popover, sets how long the menu takes to leave", async () => {
		render(
			<ProjectMenu transitionDuration={{ exit: 600 }}>
				{projectActions()}
			</ProjectMenu>,
		);
		const { menu } = await openMenu();
		await expect.poll(() => menu.contains(document.activeElement)).toBe(true);
		const closedAt = performance.now();
		await userEvent.keyboard("{Escape}");
		expect(menu.isConnected).toBe(true);
		await expect.poll(() => menu.isConnected, { timeout: 3000 }).toBe(false);
		expect(performance.now() - closedAt).toBeGreaterThanOrEqual(500);
	});

	test("a click on an item runs its onClick, then onClose gets the click and itemClick; once closed, focus is back on the button", async () => {
		const seen: string[] = [];
		const onClose = vi.fn<OnClose>((_event, reason) => {
			seen.push(reason);
		});
		const onCopy = vi.fn<OnClick>(() => {
			seen.push("onClick");
		});
		render(
			<ProjectMenu onClose={onClose}>
				<MenuItem onClick={onCopy}>Copy link</MenuItem>
				<MenuItem>Share</MenuItem>
			</ProjectMenu>,
		);
		const { button } = await openMenu();
		await userEvent.click(item("Copy link"));
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
		expect(seen).toEqual(["onClick", "itemClick"]);
		const [event] = onlyClose(onClose);
		expect(nativeOf(event)).toBeInstanceOf(MouseEvent);
		expect(nativeOf(event).type).toBe("click");
		await expectClosed();
		await expect.element(button).toHaveFocus();
	});

	test.each([
		["Enter", "{Enter}"],
		["Space", " "],
	] as const)(
		"%s chooses the focused item: its onClick runs, then onClose gets itemClick; once closed, focus is back on the button",
		async (_key, key) => {
			const clicks = newClicks();
			const onClose = vi.fn<OnClose>();
			render(
				<ProjectMenu onClose={onClose}>{projectActions(clicks)}</ProjectMenu>,
			);
			const { button } = await openMenu();
			await expect.element(item("Copy link")).toHaveFocus();
			await walk([["{ArrowDown}", "Share"]]);
			await userEvent.keyboard(key);
			await vi.waitFor(() => {
				expect(onClose).toHaveBeenCalled();
			});
			expect(clicks.share).toHaveBeenCalledTimes(1);
			const [event, reason] = onlyClose(onClose);
			expect(reason).toBe("itemClick");
			expect(nativeOf(event).type).toBe("click");
			await expectClosed();
			await expect.element(button).toHaveFocus();
		},
	);

	test("a link item closes it with itemClick too", async () => {
		const onClose = vi.fn<OnClose>();
		render(
			<ProjectMenu onClose={onClose}>
				<MenuItem>Copy link</MenuItem>
				<MenuItem href="#menu-docs">Read the docs</MenuItem>
			</ProjectMenu>,
		);
		const { button } = await openMenu();
		await userEvent.click(item("Read the docs"));
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
		expect(onlyClose(onClose)[1]).toBe("itemClick");
		await expectClosed();
		await expect.element(button).toHaveFocus();
	});

	test.each([
		["a click", "click"],
		["Enter", "{Enter}"],
	] as const)(
		"event.preventDefault() in onClick keeps it open, on %s",
		async (_how, how) => {
			const onClose = vi.fn<OnClose>();
			render(
				<ProjectMenu onClose={onClose}>
					<MenuItem
						onClick={(event) => {
							event.preventDefault();
						}}
					>
						Copy link
					</MenuItem>
					<MenuItem>Share</MenuItem>
				</ProjectMenu>,
			);
			await openMenu();
			const copy = item("Copy link");
			await expect.element(copy).toHaveFocus();
			if (how === "click") {
				await userEvent.click(copy);
			} else {
				await userEvent.keyboard(how);
			}

			await walk([["{ArrowDown}", "Share"]]);
			expect(onClose).not.toHaveBeenCalled();
		},
	);

	test("Escape closes it: onClose gets the Escape keydown and escapeKeyDown; once closed, focus is back on the button", async () => {
		const onClose = vi.fn<OnClose>();
		render(<ProjectMenu onClose={onClose}>{projectActions()}</ProjectMenu>);
		const { button } = await openMenu();
		await expect.element(item("Copy link")).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
		const [event, reason] = onlyClose(onClose);
		expect(reason).toBe("escapeKeyDown");
		const native = nativeOf(event);
		expect(native).toBeInstanceOf(KeyboardEvent);
		expect((native as KeyboardEvent).key).toBe("Escape");
		await expectClosed();
		await expect.element(button).toHaveFocus();
	});

	test("Tab closes it: onClose gets the Tab keydown and tabKeyDown; once closed, focus is back on the button", async () => {
		const onClose = vi.fn<OnClose>();
		render(<ProjectMenu onClose={onClose}>{projectActions()}</ProjectMenu>);
		const { button } = await openMenu();
		await expect.element(item("Copy link")).toHaveFocus();
		await userEvent.tab();
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
		const [event, reason] = onlyClose(onClose);
		expect(reason).toBe("tabKeyDown");
		const native = nativeOf(event);
		expect(native).toBeInstanceOf(KeyboardEvent);
		expect((native as KeyboardEvent).key).toBe("Tab");
		await expectClosed();
		await expect.element(button).toHaveFocus();
	});

	test("a press outside closes it: onClose gets the press and backdropClick; once closed, focus is back on the button", async () => {
		const onClose = vi.fn<OnClose>();
		render(<ProjectMenu onClose={onClose}>{projectActions()}</ProjectMenu>);
		const { button } = await openMenu();
		await expect.element(item("Copy link")).toHaveFocus();
		await pressOutside();
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
		const [event, reason] = onlyClose(onClose);
		expect(reason).toBe("backdropClick");
		expect(nativeOf(event)).toBeInstanceOf(MouseEvent);
		await expectClosed();
		await expect.element(button).toHaveFocus();
	});

	test("onClose only asks: while open stays true, it stays open and its keys keep working", async () => {
		const onClose = vi.fn<OnClose>();
		render(
			<ProjectMenu closes={false} onClose={onClose}>
				{projectActions()}
			</ProjectMenu>,
		);
		const { menu } = await openMenu();
		await expect.element(item("Copy link")).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalledWith(expect.anything(), "escapeKeyDown");
		});
		await walk([["{ArrowDown}", "Share"]]);
		expect(menu).toBeVisible();
	});
});

describe("MenuList", () => {
	test("renders a role=menu <ul> named by its aria-label, and the ref and className land on it", () => {
		const ref = React.createRef<HTMLUListElement>();
		render(
			<MenuList ref={ref} aria-label="Switch project" className="project-list">
				<MenuItem>VSebCode</MenuItem>
				<MenuItem>RS50 force-feedback bridge</MenuItem>
			</MenuList>,
		);
		const list = screen.getByRole("menu", { name: "Switch project" });
		expect(list).toBeInstanceOf(HTMLUListElement);
		expect(ref.current).toBe(list);
		expect(list).toHaveClass("project-list");
		expect(within(list).getAllByRole("menuitem")).toHaveLength(2);
	});

	test("it's one tab stop: Tab enters on an item and the next Tab leaves the list; Shift+Tab comes back to the item focus was on", async () => {
		render(
			<>
				<button type="button">Before</button>
				<MenuList aria-label="Project actions">{projectActions()}</MenuList>
				<button type="button">After</button>
			</>,
		);
		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		await userEvent.tab();
		await expect.element(item("Copy link")).toHaveFocus();
		await walk([["{ArrowDown}", "Share"]]);
		await userEvent.tab();
		await expect
			.element(screen.getByRole("button", { name: "After" }))
			.toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(item("Share")).toHaveFocus();
	});

	test.each([
		["the selected item", "RS50 force-feedback bridge"],
		["the first enabled item when none is selected", undefined],
	] as const)(
		"autoFocusItem moves focus to %s when it turns true",
		async (_which, selected) => {
			const projects = ["VSebCode", "RS50 force-feedback bridge"];
			function Projects({
				autoFocusItem,
			}: {
				readonly autoFocusItem: boolean;
			}) {
				return (
					<MenuList aria-label="Switch project" autoFocusItem={autoFocusItem}>
						<MenuItem disabled>Clean Architecture template</MenuItem>
						{projects.map((name) => (
							<MenuItem
								key={name}
								selected={
									selected === undefined ? undefined : name === selected
								}
							>
								{name}
							</MenuItem>
						))}
					</MenuList>
				);
			}

			const view = render(<Projects autoFocusItem={false} />);
			const list = screen.getByRole("menu", { name: "Switch project" });
			await frames();
			expect(list.contains(document.activeElement)).toBe(false);
			view.rerender(<Projects autoFocusItem />);
			await expect.element(item(selected ?? "VSebCode")).toHaveFocus();
		},
	);
});
