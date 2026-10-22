// Behaviour specs for Drawer, from design-system/components/Drawer/README.md and api.d.ts. A
// temporary drawer sits on Modal and takes its flags, with deviations 7 and 8
// (docs/deviations.md): while focus is kept in, the rest of the page is hidden from assistive
// tech, never made inert. Modal's own spec covers its flag matrix; these check that Drawer passes
// each flag on. The panel is found through PaperProps, which reach the glass surface. They run at
// the default test viewport (414 by 896).
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { Drawer, type DrawerCloseReason, type DrawerProps } from "#ui";

let bodyBefore: Element[] = [];

beforeEach(() => {
	bodyBefore = [...document.body.children];
});

afterEach(() => {
	cleanup();
	window.scrollTo(0, 0);
	// Once a test unmounts, nothing is left behind: no portal node, no page hidden from assistive
	// tech or made inert, no scroll lock.
	expect(
		[...document.body.children].filter((child) => !bodyBefore.includes(child)),
	).toEqual([]);
	expect(
		document.querySelectorAll('[aria-hidden="true"], [inert]'),
	).toHaveLength(0);
	expect(getComputedStyle(document.body).overflow).not.toBe("hidden");
	expect(getComputedStyle(document.documentElement).overflow).not.toBe(
		"hidden",
	);
});

/**
Waits a few frames. Only for checks that something does not happen (focus not moving, the page
not scrolling), where there is no condition to wait for.
*/
async function frames(count = 4) {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- frames run one after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

type CloseCall = {
	event: React.SyntheticEvent | KeyboardEvent;
	reason: DrawerCloseReason;
};

const reasons = (calls: CloseCall[]) => calls.map((call) => call.reason);

const name = "Sebastian Suarez";

function SiteLinks() {
	return (
		<nav aria-label="Main navigation">
			<button type="button">Work</button>
			<button type="button">Projects</button>
		</nav>
	);
}

type PageProps = Omit<DrawerProps, "open" | "onClose"> & {
	readonly calls?: CloseCall[];
	/**
	Whether onClose sets open to false: the parent decides.
	*/
	readonly closes?: boolean;
	readonly pageClicks?: string[];
};

/**
The site's menu: the button that opens the drawer, a page button in the strip of scrim a left
drawer leaves beside it, and the drawer, with open in state.
*/
function MenuPage({
	calls,
	closes = true,
	pageClicks,
	children,
	...props
}: PageProps) {
	const [open, setOpen] = React.useState(false);
	return (
		<>
			<button
				type="button"
				aria-haspopup="dialog"
				aria-expanded={open}
				onClick={() => {
					setOpen(true);
				}}
			>
				Menu
			</button>
			<button
				type="button"
				style={{ position: "fixed", top: 400, right: 4 }}
				onClick={() => {
					pageClicks?.push("Page");
				}}
			>
				Page
			</button>
			<Drawer
				open={open}
				title={name}
				onClose={(event, reason) => {
					calls?.push({ event, reason });
					if (closes) {
						setOpen(false);
					}
				}}
				{...props}
			>
				{children ?? <SiteLinks />}
			</Drawer>
		</>
	);
}

/**
Clicks the page's Menu button and waits for the drawer. Returns the opener, which keeps focus.
*/
async function openMenu(drawerName = name) {
	const opener = screen.getByRole("button", { name: "Menu" });
	await userEvent.click(opener);
	const drawer = await screen.findByRole("dialog", { name: drawerName });
	return { opener, drawer };
}

async function expectClosed() {
	await expect.poll(() => screen.queryByRole("dialog")).toBeNull();
}

async function expectFocusInside(element: Element) {
	await expect.poll(() => element.contains(document.activeElement)).toBe(true);
}

/**
Hidden from assistive tech: under aria-hidden (deviation 7) or inert (the reference).
*/
function isHiddenFromAssistiveTech(element: Element) {
	return element.closest('[aria-hidden="true"], [inert]') !== null;
}

function expectReactEvent(
	event: React.SyntheticEvent | KeyboardEvent,
	native: new (type: string) => Event = MouseEvent,
) {
	// A React event (or one shaped like it), not a native one.
	expect(event).not.toBeInstanceOf(Event);
	expect((event as React.SyntheticEvent).nativeEvent).toBeInstanceOf(native);
}

async function tabTrail(count: number, isShift = false) {
	const trail: Array<Element | null> = [];
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- each Tab starts where the last one left focus
		await userEvent.tab({ shift: isShift });
		trail.push(document.activeElement);
	}

	return trail;
}

/**
Whether each step of the trail moves one place along the cycle of controls (backwards with
Shift), wrapping at the ends.
*/
function followsCycle(
	trail: Array<Element | null>,
	controls: Element[],
	step: 1 | -1,
) {
	const indexes = trail.map((element) =>
		element === null ? -1 : controls.indexOf(element),
	);
	return indexes.every(
		(index, at) =>
			index !== -1 &&
			(at === 0 ||
				index === (indexes[at - 1] + step + controls.length) % controls.length),
	);
}

type Edge = "left" | "right" | "top" | "bottom";

/**
How far each side of the element is from the same side of the viewport, rounded to the pixel.
*/
function gaps(element: Element): Record<Edge, number> {
	const rect = element.getBoundingClientRect();
	const { clientWidth, clientHeight } = document.documentElement;
	return {
		left: Math.round(rect.left),
		top: Math.round(rect.top),
		right: Math.round(clientWidth - rect.right),
		bottom: Math.round(clientHeight - rect.bottom),
	};
}

function panel(id = "panel"): HTMLElement {
	const element = document.querySelector<HTMLElement>(`#${id}`);
	if (!element) {
		throw new Error(`#${id} is missing`);
	}

	return element;
}

const anchors = ["left", "right", "top", "bottom"] as const;

const opposite = {
	left: "right",
	right: "left",
	top: "bottom",
	bottom: "top",
} as const;

describe("a temporary drawer", () => {
	test("is a modal dialog named by its title, the heading in its header", async () => {
		render(
			<Drawer open title={name}>
				<SiteLinks />
			</Drawer>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		expect(drawer).toHaveAttribute("aria-modal", "true");
		const heading = within(drawer).getByRole("heading", { name });
		expect(heading.id).not.toBe("");
		expect(drawer).toHaveAttribute("aria-labelledby", heading.id);
	});

	test("without a title, aria-label names it", async () => {
		render(
			<Drawer open aria-label="Site menu">
				<SiteLinks />
			</Drawer>,
		);
		const drawer = await screen.findByRole("dialog", { name: "Site menu" });
		expect(within(drawer).queryByRole("heading")).toBeNull();
	});

	test("open shows it; when open turns false it goes and leaves the DOM", async () => {
		const view = render(
			<Drawer open={false} title={name}>
				<SiteLinks />
			</Drawer>,
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.queryByText(name)).toBeNull();

		view.rerender(
			<Drawer open title={name}>
				<SiteLinks />
			</Drawer>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		await expect.element(drawer).toBeVisible();

		view.rerender(
			<Drawer open={false} title={name}>
				<SiteLinks />
			</Drawer>,
		);
		await expect.poll(() => drawer.isConnected).toBe(false);
	});

	test("the ref and the other attributes go to the drawer, the element with the dialog role", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Drawer ref={ref} open title={name} id="site-menu">
				<SiteLinks />
			</Drawer>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		expect(drawer.id).toBe("site-menu");
		expect(ref.current).toBe(drawer);
	});

	test("its content sits in a scrolling body under the header, which stays in view", async () => {
		const projects = Array.from(
			{ length: 60 },
			(_, index) => `Project ${index + 1}: a write-up and its diagrams`,
		);
		render(
			<Drawer open title={name} onClose={() => undefined}>
				<ul>
					{projects.map((project) => (
						<li key={project}>{project}</li>
					))}
				</ul>
			</Drawer>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		const heading = within(drawer).getByRole("heading", { name });
		const close = within(drawer).getByRole("button", { name: "Close" });
		const last = screen.getByText(projects.at(-1)!);
		await expect.element(heading).toBeInViewport({ ratio: 1 });
		await expect.element(last).not.toBeInViewport();

		await userEvent.wheel(screen.getByText(projects[0]), {
			delta: { y: 5000 },
		});
		await expect.element(last).toBeInViewport({ ratio: 1 });
		await expect.element(heading).toBeInViewport({ ratio: 1 });
		await expect.element(close).toBeInViewport({ ratio: 1 });
	});

	test("PaperProps go to the glass surface that holds the content", async () => {
		render(
			<Drawer
				open
				title={name}
				PaperProps={{ id: "menu-panel", className: "menu-panel" }}
			>
				<SiteLinks />
			</Drawer>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		const surface = panel("menu-panel");
		expect(surface).toHaveClass("menu-panel");
		expect(drawer.contains(surface)).toBe(true);
		expect(
			surface.contains(
				screen.getByRole("navigation", { name: "Main navigation" }),
			),
		).toBe(true);
	});
});

describe("onClose and its reasons", () => {
	test("Escape calls onClose with escapeKeyDown and the native KeyboardEvent, and focus returns to the button that opened it", async () => {
		const calls: CloseCall[] = [];
		render(<MenuPage calls={calls} />);
		const { opener, drawer } = await openMenu();
		await expectFocusInside(drawer);

		await userEvent.keyboard("{Escape}");
		expect(reasons(calls)).toEqual(["escapeKeyDown"]);
		expect(calls[0]?.event).toBeInstanceOf(KeyboardEvent);
		expect((calls[0]?.event as KeyboardEvent).key).toBe("Escape");
		await expectClosed();
		await expect.element(opener).toHaveFocus();
	});

	test("a press on the scrim beside it calls onClose with backdropClick and the React event; a press on the panel doesn't", async () => {
		const calls: CloseCall[] = [];
		render(<MenuPage calls={calls} />);
		const page = screen.getByRole("button", { name: "Page" });
		const { opener, drawer } = await openMenu();

		await userEvent.click(within(drawer).getByRole("button", { name: "Work" }));
		expect(calls).toEqual([]);

		// The page button sits in the strip of scrim beside the panel.
		await userEvent.click(page, { force: true });
		expect(reasons(calls)).toEqual(["backdropClick"]);
		expectReactEvent(calls[0].event);
		await expectClosed();
		await expect.element(opener).toHaveFocus();
	});

	test("passing onClose shows a close button named Close, which calls onClose with closeButton", async () => {
		const view = render(
			<Drawer open title={name}>
				<p>Backend lead and architect</p>
			</Drawer>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		expect(within(drawer).queryByRole("button")).toBeNull();

		const calls: CloseCall[] = [];
		view.rerender(
			<Drawer
				open
				title={name}
				onClose={(event, reason) => {
					calls.push({ event, reason });
				}}
			>
				<p>Backend lead and architect</p>
			</Drawer>,
		);
		const close = within(screen.getByRole("dialog", { name })).getByRole(
			"button",
			{
				name: "Close",
			},
		);
		await userEvent.click(close);
		expect(reasons(calls)).toEqual(["closeButton"]);
		expectReactEvent(calls[0].event);
	});

	test("the close button closes it through onClose, and focus returns to the button that opened it", async () => {
		const calls: CloseCall[] = [];
		render(<MenuPage calls={calls} />);
		const { opener, drawer } = await openMenu();
		await userEvent.click(
			within(drawer).getByRole("button", { name: "Close" }),
		);
		expect(reasons(calls)).toEqual(["closeButton"]);
		await expectClosed();
		await expect.element(opener).toHaveFocus();
	});

	test("closeLabel names the close button", async () => {
		render(<MenuPage closeLabel="Close the menu" />);
		const { drawer } = await openMenu();
		expect(
			within(drawer).getByRole("button", { name: "Close the menu" }),
		).toBeInstanceOf(HTMLButtonElement);
		expect(within(drawer).queryByRole("button", { name: "Close" })).toBeNull();
	});

	test("onClose only reports: the drawer stays open until the parent sets open to false", async () => {
		const calls: CloseCall[] = [];
		render(<MenuPage calls={calls} closes={false} />);
		const page = screen.getByRole("button", { name: "Page" });
		const { drawer } = await openMenu();
		await expectFocusInside(drawer);

		await userEvent.keyboard("{Escape}");
		await userEvent.click(page, { force: true });
		await userEvent.click(
			within(drawer).getByRole("button", { name: "Close" }),
		);
		// Still open each time, so each one reports.
		expect(reasons(calls)).toEqual([
			"escapeKeyDown",
			"backdropClick",
			"closeButton",
		]);
		expect(drawer.isConnected).toBe(true);
		await expect.element(drawer).toBeVisible();
	});
});

describe("focus and the page", () => {
	test("focus moves into the drawer when it opens, and Tab and Shift+Tab stay inside", async () => {
		render(<MenuPage />);
		const { drawer } = await openMenu();
		await expectFocusInside(drawer);
		const controls = [
			within(drawer).getByRole("button", { name: "Close" }),
			within(drawer).getByRole("button", { name: "Work" }),
			within(drawer).getByRole("button", { name: "Projects" }),
		];

		const forward = await tabTrail(5);
		expect(followsCycle(forward, controls, 1)).toBe(true);
		const backward = await tabTrail(5, true);
		expect(followsCycle(backward, controls, -1)).toBe(true);
	});

	test("while it's open the rest of the page is hidden from assistive tech, and exposed again once it closes", async () => {
		render(<MenuPage />);
		const page = screen.getByRole("button", { name: "Page" });
		const { drawer } = await openMenu();
		await expect.poll(() => isHiddenFromAssistiveTech(page)).toBe(true);
		expect(isHiddenFromAssistiveTech(drawer)).toBe(false);

		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.poll(() => isHiddenFromAssistiveTech(page)).toBe(false);
	});
});

describe("anchor, inset and width", () => {
	test.each(anchors)(
		"anchor %s brings the panel in from that edge, 12px from it",
		async (anchor) => {
			render(
				<Drawer
					open
					anchor={anchor}
					title="Filters"
					PaperProps={{ id: "panel" }}
				>
					<p>Only open roles.</p>
				</Drawer>,
			);
			await screen.findByRole("dialog", { name: "Filters" });
			await expect.poll(() => gaps(panel())[anchor]).toBe(12);
			// It never touches the viewport, and it keeps to its own edge.
			const all = gaps(panel());
			expect(Math.min(...Object.values(all))).toBeGreaterThanOrEqual(12);
			expect(all[opposite[anchor]]).toBeGreaterThan(40);
		},
	);

	const outerCorners = {
		left: ["top-left", "bottom-left"],
		right: ["top-right", "bottom-right"],
		top: ["top-left", "top-right"],
		bottom: ["bottom-left", "bottom-right"],
	} as const;
	const corners = [
		"top-left",
		"top-right",
		"bottom-right",
		"bottom-left",
	] as const;

	test.each(anchors)(
		"inset={false} sets a %s drawer flush to its edge, with only its inner corners rounded",
		async (anchor) => {
			render(
				<Drawer
					open
					anchor={anchor}
					inset={false}
					title="Filters"
					PaperProps={{ id: "panel" }}
				>
					<p>Only open roles.</p>
				</Drawer>,
			);
			await screen.findByRole("dialog", { name: "Filters" });
			await expect.poll(() => gaps(panel())[anchor]).toBe(0);
			const style = getComputedStyle(panel());
			for (const corner of corners) {
				const radius = style.getPropertyValue(`border-${corner}-radius`);
				const isOuter = (outerCorners[anchor] as readonly string[]).includes(
					corner,
				);
				expect({ corner, square: radius === "0px" }).toEqual({
					corner,
					square: isOuter,
				});
			}
		},
	);

	// 320px is 20rem at the 16px root size, 280px 17.5rem.
	test.each([
		{ width: undefined, label: "320px by default", rem: 20 },
		{ width: 280, label: "a number of px", rem: 17.5 },
		{ width: "18rem", label: "a CSS length", rem: 18 },
	])("width sets a side panel's width: $label", async ({ width, rem }) => {
		render(
			<Drawer open width={width} title="Filters" PaperProps={{ id: "panel" }}>
				<p>Only open roles.</p>
			</Drawer>,
		);
		await screen.findByRole("dialog", { name: "Filters" });
		// eslint-disable-next-line unicorn/prefer-number-coercion -- the font size carries a px unit, which Number() turns into NaN
		const rootFont = Number.parseFloat(
			getComputedStyle(document.documentElement).fontSize,
		);
		// The offsetWidth is the laid-out width, whatever the slide is doing.
		expect(panel().offsetWidth).toBe(rem * rootFont);
	});

	test("a wide temporary drawer caps its width to keep 40px of scrim beside it", async () => {
		render(
			<Drawer open width={1000} title="Filters" PaperProps={{ id: "panel" }}>
				<p>Only open roles.</p>
			</Drawer>,
		);
		await screen.findByRole("dialog", { name: "Filters" });
		await expect.poll(() => gaps(panel()).left).toBe(12);
		const { right } = panel().getBoundingClientRect();
		expect(document.documentElement.clientWidth - right).toBeGreaterThanOrEqual(
			39.5,
		);
	});

	test.each(["top", "bottom"] as const)(
		"a %s drawer sizes to its content",
		async (anchor) => {
			const view = render(
				<Drawer
					open
					anchor={anchor}
					aria-label="Share"
					PaperProps={{ id: "panel" }}
				>
					<p>Copy the link.</p>
				</Drawer>,
			);
			await screen.findByRole("dialog", { name: "Share" });
			const short = panel().offsetHeight;
			expect(short).toBeLessThan(window.innerHeight / 2);

			view.rerender(
				<Drawer
					open
					anchor={anchor}
					aria-label="Share"
					PaperProps={{ id: "panel" }}
				>
					<p>Copy the link.</p>
					<p>Or send it by email.</p>
					<p>Or post it where the team reads.</p>
				</Drawer>,
			);
			expect(panel().offsetHeight).toBeGreaterThan(short);
		},
	);
});

/**
The preview's bottom sheet: share a project, with the sheet open from the start.
*/
function ShareSheet({ calls }: { readonly calls: CloseCall[] }) {
	const [open, setOpen] = React.useState(true);
	return (
		<Drawer
			anchor="bottom"
			open={open}
			title="Share this project"
			PaperProps={{ id: "panel" }}
			onClose={(event, reason) => {
				calls.push({ event, reason });
				setOpen(false);
			}}
		>
			<button type="button">Copy link</button>
			<button type="button">Email</button>
		</Drawer>
	);
}

describe("the bottom sheet", () => {
	test("dragging its grab handle down closes it, with the reason swipe", async () => {
		const calls: CloseCall[] = [];
		render(<ShareSheet calls={calls} />);
		await screen.findByRole("dialog", { name: "Share this project" });
		await expect.poll(() => gaps(panel()).bottom).toBe(12);
		const { width, height } = panel().getBoundingClientRect();

		// The handle sits at the top of the sheet: press on it and drag down the sheet's height.
		await userEvent.dragAndDrop(panel(), panel(), {
			sourcePosition: { x: width / 2, y: 12 },
			targetPosition: { x: width / 2, y: height - 2 },
		});
		await expect.poll(() => reasons(calls)).toEqual(["swipe"]);
		expectReactEvent(calls[0].event, Event);
		await expectClosed();
	});

	test("the grab handle is for pointers only: Tab reaches only the sheet's buttons, and Escape closes it", async () => {
		const calls: CloseCall[] = [];
		render(<ShareSheet calls={calls} />);
		const sheet = await screen.findByRole("dialog", {
			name: "Share this project",
		});
		await expectFocusInside(sheet);
		const controls = [
			within(sheet).getByRole("button", { name: "Close" }),
			within(sheet).getByRole("button", { name: "Copy link" }),
			within(sheet).getByRole("button", { name: "Email" }),
		];

		const trail = await tabTrail(6);
		expect(followsCycle(trail, controls, 1)).toBe(true);

		await userEvent.keyboard("{Escape}");
		expect(reasons(calls)).toEqual(["escapeKeyDown"]);
		await expectClosed();
	});
});

/**
The preview's persistent contents: a flex row with the drawer first and the content beside it.
*/
function Contents({
	open,
	onClose,
}: {
	readonly open: boolean;
	readonly onClose?: DrawerProps["onClose"];
}) {
	return (
		<>
			<button type="button">Before</button>
			<div id="row" style={{ display: "flex", width: 400, height: 300 }}>
				<Drawer
					id="hiw-contents"
					variant="persistent"
					role="navigation"
					open={open}
					title="Contents"
					width={200}
					onClose={onClose}
				>
					<button type="button">The request path</button>
				</Drawer>
				<div id="main" style={{ flex: 1, minWidth: 0 }}>
					<button type="button">How this site works</button>
				</div>
			</div>
		</>
	);
}

describe("persistent and permanent", () => {
	test("persistent: part of the page and its tab order, beside the content it pushes; closed, it's hidden and out of the tab order", async () => {
		const calls: CloseCall[] = [];
		const onClose: DrawerProps["onClose"] = (event, reason) => {
			calls.push({ event, reason });
		};

		const view = render(<Contents open onClose={onClose} />);
		const nav = screen.getByRole("navigation", { name: "Contents" });
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(nav).not.toHaveAttribute("aria-modal");
		const before = screen.getByRole("button", { name: "Before" });
		const close = within(nav).getByRole("button", { name: "Close" });
		const path = within(nav).getByRole("button", { name: "The request path" });
		const content = screen.getByRole("button", { name: "How this site works" });
		await expect.element(path).toBeVisible();

		// Nothing is covered: the content starts where the drawer ends.
		const main = document.querySelector("#main")!;
		const row = document.querySelector("#row")!;
		expect(main.getBoundingClientRect().left).toBeGreaterThanOrEqual(
			nav.getBoundingClientRect().right - 0.5,
		);
		expect(isHiddenFromAssistiveTech(content)).toBe(false);

		await userEvent.click(before);
		expect(await tabTrail(3)).toEqual([close, path, content]);

		await userEvent.click(close);
		expect(reasons(calls)).toEqual(["closeButton"]);

		view.rerender(<Contents open={false} onClose={onClose} />);
		await expect.element(path).not.toBeVisible();
		expect(screen.queryByRole("navigation", { name: "Contents" })).toBeNull();
		// The content takes the drawer's place.
		await expect
			.poll(() =>
				Math.round(
					main.getBoundingClientRect().left - row.getBoundingClientRect().left,
				),
			)
			.toBe(0);

		await userEvent.click(before);
		expect(await tabTrail(1)).toEqual([content]);
	});

	test("a persistent drawer's id and ref are on the drawer, so the opener's aria-controls can point at it", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Drawer
				ref={ref}
				open
				id="hiw-contents"
				variant="persistent"
				role="navigation"
				title="Contents"
			>
				<p>The request path</p>
			</Drawer>,
		);
		const nav = screen.getByRole("navigation", { name: "Contents" });
		expect(nav.id).toBe("hiw-contents");
		expect(ref.current).toBe(nav);
	});

	test("permanent: always shown whatever open says, in the tab order, never modal, with no close button", async () => {
		render(
			<>
				<button type="button">Before</button>
				<div style={{ display: "flex" }}>
					<Drawer
						variant="permanent"
						open={false}
						role="navigation"
						title="Résumé"
						width={190}
						onClose={() => undefined}
					>
						<button type="button">Summary</button>
					</Drawer>
					<button type="button">After</button>
				</div>
			</>,
		);
		const nav = screen.getByRole("navigation", { name: "Résumé" });
		const summary = within(nav).getByRole("button", { name: "Summary" });
		await expect.element(summary).toBeVisible();
		expect(nav).not.toHaveAttribute("aria-modal");
		expect(screen.queryByRole("dialog")).toBeNull();
		// A permanent drawer can't close, so onClose shows no button.
		expect(within(nav).queryByRole("button", { name: "Close" })).toBeNull();

		await userEvent.click(screen.getByRole("button", { name: "Before" }));
		expect(await tabTrail(2)).toEqual([
			summary,
			screen.getByRole("button", { name: "After" }),
		]);
	});
});

describe("Modal's flags, passed on by a temporary drawer", () => {
	test("by default it portals into document.body, out of its parent; disablePortal renders it in place", async () => {
		const view = render(
			<section id="host">
				<Drawer open title={name}>
					<SiteLinks />
				</Drawer>
			</section>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		expect(document.querySelector("#host")?.contains(drawer)).toBe(false);
		expect(document.body.contains(drawer)).toBe(true);
		view.unmount();

		render(
			<section id="host">
				<Drawer open disablePortal title={name}>
					<SiteLinks />
				</Drawer>
			</section>,
		);
		const inPlace = await screen.findByRole("dialog", { name });
		expect(document.querySelector("#host")?.contains(inPlace)).toBe(true);
	});

	test("container picks where the portal mounts", async () => {
		const target = document.createElement("div");
		document.body.append(target);
		try {
			render(
				<Drawer open container={target} title={name}>
					<SiteLinks />
				</Drawer>,
			);
			await expect
				.poll(() => {
					const drawer = screen.queryByRole("dialog", { name });
					return drawer !== null && target.contains(drawer);
				})
				.toBe(true);
		} finally {
			cleanup();
			target.remove();
		}
	});

	test("keepMounted keeps the closed panel in the DOM, out of sight, with its state", async () => {
		render(
			<MenuPage keepMounted>
				<label>
					Search the site <input />
				</label>
			</MenuPage>,
		);
		await openMenu();
		const field = screen.getByRole("textbox", { name: "Search the site" });
		await userEvent.fill(field, "RS50");
		await userEvent.keyboard("{Escape}");
		await expectClosed();

		expect(field.isConnected).toBe(true);
		await expect.element(field).not.toBeVisible();

		await openMenu();
		expect(screen.getByRole("textbox", { name: "Search the site" })).toBe(
			field,
		);
		expect(field).toHaveValue("RS50");
	});

	referenceDefectTest(
		"hideBackdrop: no scrim, and the page beside the drawer stays clickable",
		async () => {
			const pageClicks: string[] = [];
			render(<MenuPage hideBackdrop pageClicks={pageClicks} />);
			const page = screen.getByRole("button", { name: "Page" });
			await openMenu();
			await userEvent.click(page, { force: true });
			expect(pageClicks).toEqual(["Page"]);
		},
	);

	test("disableEscapeKeyDown: Escape does nothing", async () => {
		const calls: CloseCall[] = [];
		render(<MenuPage disableEscapeKeyDown calls={calls} />);
		const { drawer } = await openMenu();
		await expectFocusInside(drawer);
		await userEvent.keyboard("{Escape}");
		expect(calls).toEqual([]);
		await expect.element(drawer).toBeVisible();
	});

	test("disableAutoFocus doesn't move focus into the drawer when it opens", async () => {
		render(<MenuPage disableAutoFocus />);
		const { drawer } = await openMenu();
		await frames();
		expect(drawer.contains(document.activeElement)).toBe(false);
	});

	referenceDefectTest(
		"disableEnforceFocus lets Tab leave the drawer for the page, which stays exposed to assistive tech",
		async () => {
			render(
				<>
					<button type="button">Before</button>
					<Drawer open disableEnforceFocus title={name}>
						<SiteLinks />
					</Drawer>
					<button type="button">After</button>
				</>,
			);
			const before = screen.getByRole("button", {
				name: "Before",
				hidden: true,
			});
			const after = screen.getByRole("button", { name: "After", hidden: true });
			const drawer = await screen.findByRole("dialog", { name });
			await expectFocusInside(drawer);

			const trail = await tabTrail(5);
			expect(
				trail.some((element) => element === before || element === after),
			).toBe(true);
			expect(isHiddenFromAssistiveTech(before)).toBe(false);
			expect(isHiddenFromAssistiveTech(after)).toBe(false);
		},
	);

	test("disableRestoreFocus doesn't send focus back to the opener", async () => {
		render(<MenuPage disableRestoreFocus />);
		const { opener, drawer } = await openMenu();
		await expectFocusInside(drawer);
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.poll(() => drawer.isConnected).toBe(false);
		expect(document.activeElement).not.toBe(opener);
	});

	test("by default the page under an open drawer doesn't scroll", async () => {
		render(
			<>
				<div style={{ height: 3000 }} />
				<Drawer open title={name}>
					<SiteLinks />
				</Drawer>
			</>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		await userEvent.wheel(within(drawer).getByRole("heading"), {
			delta: { y: 600 },
		});
		await frames(8);
		expect(window.scrollY).toBe(0);
	});

	test("disableScrollLock leaves the page scrollable under the open drawer", async () => {
		render(
			<>
				<div style={{ height: 3000 }} />
				<Drawer open disableScrollLock title={name}>
					<SiteLinks />
				</Drawer>
			</>,
		);
		const drawer = await screen.findByRole("dialog", { name });
		await userEvent.wheel(within(drawer).getByRole("heading"), {
			delta: { y: 600 },
		});
		await expect.poll(() => window.scrollY).toBeGreaterThan(0);
	});

	test("transitionDuration sets how long the drawer takes to leave", async () => {
		render(<MenuPage transitionDuration={{ exit: 600 }} />);
		const { drawer } = await openMenu();
		await expectFocusInside(drawer);

		const closedAt = performance.now();
		await userEvent.keyboard("{Escape}");
		// Well before 600ms it's still on its way out...
		expect(drawer.isConnected).toBe(true);
		// ...and it's gone once the exit has run.
		await expect.poll(() => drawer.isConnected, { timeout: 3000 }).toBe(false);
		expect(performance.now() - closedAt).toBeGreaterThanOrEqual(500);
	});
});
