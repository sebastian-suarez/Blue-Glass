import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { createPortal } from "react-dom";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { Fade, Modal, type ModalCloseReason, type ModalProps } from "#ui";

type OnClose = NonNullable<ModalProps["onClose"]>;

type Flags = Omit<ModalProps, "open" | "onClose" | "children">;

afterEach(async () => {
	cleanup();
	window.scrollTo(0, 0);
	await expect.poll(() => document.body.childElementCount).toBe(0);
	expect(isScrollLocked()).toBe(false);
	expect(document.querySelector('[aria-hidden="true"], [inert]')).toBeNull();
});

async function frames(count = 5): Promise<void> {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- one frame after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

function isScrollLocked(): boolean {
	return (
		getComputedStyle(document.documentElement).overflow !== "visible" ||
		getComputedStyle(document.body).overflow !== "visible"
	);
}

function isHiddenFromAssistiveTech(element: Element): boolean {
	return element.closest('[aria-hidden="true"], [inert]') !== null;
}

function alphaOf(color: string): number {
	const channels = color.match(/[\d.]+/gv) ?? [];
	return channels.length === 4 ? Number(channels[3]) : 1;
}

function elementOver(element: Element): Element | null {
	const box = element.getBoundingClientRect();
	const halfWidth = box.width / 2;
	const halfHeight = box.height / 2;
	return document.elementFromPoint(box.left + halfWidth, box.top + halfHeight);
}

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

function token(name: string): string {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
}

async function tabTrail(
	count: number,
	isShifted = false,
): Promise<Array<Element | null>> {
	const trail: Array<Element | null> = [];
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- each press starts where the last one left focus
		await userEvent.tab({ shift: isShifted });
		trail.push(document.activeElement);
	}

	return trail;
}

async function expectScrollLocked(over: HTMLElement): Promise<void> {
	window.scrollTo(0, 0);
	await userEvent.wheel(over, { delta: { y: 400 } });
	await frames(8);
	expect(window.scrollY).toBe(0);
}

async function expectScrollFree(over: HTMLElement): Promise<void> {
	window.scrollTo(0, 0);
	await userEvent.wheel(over, { delta: { y: 400 } });
	await expect.poll(() => window.scrollY).toBeGreaterThan(0);
	window.scrollTo(0, 0);
}

const surfaceStyle: React.CSSProperties = {
	position: "fixed",
	top: 200,
	left: 100,
	width: 220,
	padding: 16,
	background: "white",
};

type SurfaceProps = React.ComponentProps<"div"> & { readonly label?: string };

function Surface({ label = "Modal", children, style, ...rest }: SurfaceProps) {
	const titleId = React.useId();
	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			{...rest}
			style={{ ...surfaceStyle, ...style }}
		>
			<h2 id={titleId}>{label}</h2>
			{children ?? (
				<>
					<button type="button">Open nested</button>
					<button type="button">Done</button>
				</>
			)}
		</div>
	);
}

type PageProps = {
	readonly flags?: Flags;
	readonly onClose?: OnClose;
	readonly closesOnRequest?: boolean;
	readonly onPagePress?: () => void;
	readonly children?: React.ReactElement;
};

function Page({
	flags,
	onClose,
	closesOnRequest = true,
	onPagePress,
	children,
}: PageProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	return (
		<>
			<button
				type="button"
				onClick={() => {
					setIsOpen(true);
				}}
			>
				Open a modal
			</button>
			<button type="button" onClick={onPagePress}>
				Page action
			</button>
			<Modal
				open={isOpen}
				onClose={(event, reason) => {
					onClose?.(event, reason);
					if (closesOnRequest) {
						setIsOpen(false);
					}
				}}
				{...flags}
			>
				{children ?? <Surface />}
			</Modal>
			<button type="button">After</button>
			<div style={{ height: 3000 }} />
		</>
	);
}

function setup(props: PageProps = {}) {
	const onClose = vi.fn<OnClose>();
	const onPagePress = vi.fn<() => void>();
	render(<Page onClose={onClose} onPagePress={onPagePress} {...props} />);
	const opener = screen.getByRole("button", { name: "Open a modal" });
	const pageAction = screen.getByRole("button", { name: "Page action" });
	const after = screen.getByRole("button", { name: "After" });
	return {
		onClose,
		onPagePress,
		opener,
		pageAction,
		after,
		page: [opener, pageAction, after],
		reasons: () => onClose.mock.calls.map(([, reason]) => reason),
		async open(): Promise<HTMLElement> {
			await userEvent.click(opener);
			return screen.findByRole("dialog", { name: "Modal" });
		},
		async pressOutside(): Promise<void> {
			await userEvent.click(pageAction, { force: true });
		},
	};
}

function button(container: HTMLElement, name: string): HTMLElement {
	return within(container).getByRole("button", { name });
}

describe("open and closed", () => {
	test("closed, nothing of it is rendered, and Escape calls no onClose", async () => {
		const modal = setup();
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.queryByText("Open nested")).toBeNull();
		modal.opener.focus();
		await userEvent.keyboard("{Escape}");
		await frames();
		expect(modal.onClose).not.toHaveBeenCalled();
	});

	test("open, the content renders into document.body, outside the element the Modal is written in", async () => {
		render(
			<section data-testid="host">
				<Modal open>
					<Surface />
				</Modal>
			</section>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Modal" });
		expect(screen.getByTestId("host").contains(dialog)).toBe(false);
		expect(document.body.contains(dialog)).toBe(true);
	});

	test("the surface keeps its role, aria-modal and name, and the layer adds no dialog of its own", async () => {
		const modal = setup();
		const dialog = await modal.open();
		expect(screen.getAllByRole("dialog")).toEqual([dialog]);
		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(dialog).toHaveAccessibleName("Modal");
		expect(dialog).toBeVisible();
	});

	test("the ref is the layer's root: it holds the content, takes className and style, and stacks at the z-modal token", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Modal
				ref={ref}
				open
				className="publish-layer"
				style={{ color: "rgb(1, 2, 3)" }}
			>
				<Surface />
			</Modal>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Modal" });
		const root = must(ref.current);
		expect(root).toBeInstanceOf(HTMLDivElement);
		expect(root.contains(dialog)).toBe(true);
		expect(root).toHaveClass("publish-layer");
		const style = getComputedStyle(root);
		expect(style.color).toBe("rgb(1, 2, 3)");
		expect(token("--z-modal")).not.toBe("");
		expect(style.zIndex).toBe(token("--z-modal"));
	});

	test("zIndex sets the layer's z-index", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Modal ref={ref} open zIndex={1450}>
				<Surface />
			</Modal>,
		);
		await screen.findByRole("dialog", { name: "Modal" });
		expect(getComputedStyle(must(ref.current)).zIndex).toBe("1450");
	});
});

describe("where it renders", () => {
	test("disablePortal renders the layer where it's written", async () => {
		render(
			<section data-testid="host">
				<Modal open disablePortal>
					<Surface />
				</Modal>
			</section>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Modal" });
		expect(screen.getByTestId("host").contains(dialog)).toBe(true);
	});

	test.each([
		{ kind: "an element", toContainer: (element: HTMLElement) => element },
		{
			kind: "a function that returns one",
			toContainer: (element: HTMLElement) => () => element,
		},
	])("container: $kind receives the layer", async ({ toContainer }) => {
		render(<section data-testid="target" />);
		const target = screen.getByTestId("target");
		render(
			<Modal open container={toContainer(target)}>
				<Surface />
			</Modal>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Modal" });
		expect(target.contains(dialog)).toBe(true);
	});

	test("container null means document.body", async () => {
		render(
			<section data-testid="host">
				<Modal open container={null}>
					<Surface />
				</Modal>
			</section>,
		);
		const dialog = await screen.findByRole("dialog", { name: "Modal" });
		expect(screen.getByTestId("host").contains(dialog)).toBe(false);
		expect(document.body.contains(dialog)).toBe(true);
	});
});

describe.each([
	{ where: "through the portal", disablePortal: false },
	{ where: "in place", disablePortal: true },
])("$where", ({ disablePortal }) => {
	const flags: Flags = { disablePortal };

	test("focus moves into the content on open: to the surface, when nothing is marked", async () => {
		const modal = setup({ flags });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
	});

	test("focus moves to the element marked data-autofocus", async () => {
		const modal = setup({
			flags,
			children: (
				<Surface>
					<button type="button">Open nested</button>
					<button data-autofocus type="button">
						Done
					</button>
				</Surface>
			),
		});
		const dialog = await modal.open();
		await expect.element(button(dialog, "Done")).toHaveFocus();
	});

	test("Tab and Shift+Tab cycle through the content", async () => {
		const modal = setup({ flags });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
		const first = button(dialog, "Open nested");
		const last = button(dialog, "Done");
		expect(await tabTrail(4)).toEqual([first, last, first, last]);
		expect(await tabTrail(2, true)).toEqual([first, last]);
	});

	test("focus put outside the content while it's open comes back in", async () => {
		const modal = setup({ flags });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
		modal.pageAction.focus();
		await expect.poll(() => dialog.contains(document.activeElement)).toBe(true);
	});

	referenceDefectTest(
		"a press on the backdrop leaves focus in the content",
		async () => {
			const modal = setup({ flags, closesOnRequest: false });
			const dialog = await modal.open();
			await expect.element(dialog).toHaveFocus();
			await modal.pressOutside();
			await expect.poll(modal.reasons).toEqual(["backdropClick"]);
			await expect
				.poll(() => dialog.contains(document.activeElement))
				.toBe(true);
		},
	);

	test("Escape calls onClose with the native KeyboardEvent and escapeKeyDown; closed, focus returns to the opener", async () => {
		const modal = setup({ flags });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await expect.poll(modal.reasons).toEqual(["escapeKeyDown"]);
		const [event] = modal.onClose.mock.calls[0];
		expect(event).toBeInstanceOf(KeyboardEvent);
		expect((event as KeyboardEvent).key).toBe("Escape");
		await expect.element(dialog).not.toBeInTheDocument();
		await expect.element(modal.opener).toHaveFocus();
	});

	test("a press on the backdrop calls onClose with the press's React event and backdropClick, and the page doesn't get it", async () => {
		const modal = setup({ flags });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
		await modal.pressOutside();
		await expect.poll(modal.reasons).toEqual(["backdropClick"]);
		const [event] = modal.onClose.mock.calls[0];
		expect(event).not.toBeInstanceOf(Event);
		expect(event.type).toBe("click");
		expect((event as React.MouseEvent).nativeEvent).toBeInstanceOf(MouseEvent);
		expect(modal.onPagePress).not.toHaveBeenCalled();
		await expect.element(dialog).not.toBeInTheDocument();
		await expect.element(modal.opener).toHaveFocus();
	});

	test("onClose only reports: while the parent keeps it open, Escape and a press on the backdrop leave it open", async () => {
		const modal = setup({ flags, closesOnRequest: false });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await modal.pressOutside();
		await expect
			.poll(modal.reasons)
			.toEqual(["escapeKeyDown", "backdropClick"]);
		await frames();
		expect(screen.getByRole("dialog", { name: "Modal" })).toBe(dialog);
		expect(dialog).toBeVisible();
	});

	test("disableEscapeKeyDown: Escape calls no onClose, and the modal stays open", async () => {
		const modal = setup({ flags: { ...flags, disableEscapeKeyDown: true } });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await frames();
		expect(modal.onClose).not.toHaveBeenCalled();
		expect(dialog).toBeVisible();
		await modal.pressOutside();
		await expect.poll(modal.reasons).toEqual(["backdropClick"]);
	});

	test("the backdrop covers the page beside the content and dims it", async () => {
		const modal = setup({ flags });
		await modal.open();
		const cover = must(elementOver(modal.pageAction));
		expect(cover).not.toBe(modal.pageAction);
		expect(alphaOf(getComputedStyle(cover).backgroundColor)).toBeGreaterThan(0);
	});

	test("invisibleBackdrop: the backdrop is transparent, and a press on it still calls onClose with backdropClick", async () => {
		const modal = setup({ flags: { ...flags, invisibleBackdrop: true } });
		await modal.open();
		const cover = must(elementOver(modal.pageAction));
		expect(cover).not.toBe(modal.pageAction);
		const style = getComputedStyle(cover);
		expect(alphaOf(style.backgroundColor)).toBe(0);
		expect(style.backdropFilter).toBe("none");
		await modal.pressOutside();
		await expect.poll(modal.reasons).toEqual(["backdropClick"]);
		expect(modal.onPagePress).not.toHaveBeenCalled();
	});

	test("BackdropProps go to the backdrop, which still reports a press", async () => {
		const modal = setup({
			flags: { ...flags, BackdropProps: { id: "scrim", className: "scrim" } },
		});
		await modal.open();
		const scrim = must(document.querySelector("#scrim"));
		expect(scrim).toHaveClass("scrim");
		expect(elementOver(modal.pageAction)).toBe(scrim);
		await modal.pressOutside();
		await expect.poll(modal.reasons).toEqual(["backdropClick"]);
	});

	test("BackdropProps' invisible makes the backdrop transparent", async () => {
		const modal = setup({
			flags: { ...flags, BackdropProps: { id: "scrim", invisible: true } },
		});
		await modal.open();
		const scrim = must(document.querySelector("#scrim"));
		expect(alphaOf(getComputedStyle(scrim).backgroundColor)).toBe(0);
	});

	test("hideBackdrop: a press beside the content calls no onClose, and Tab still cycles in the content", async () => {
		const modal = setup({ flags: { ...flags, hideBackdrop: true } });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
		await modal.pressOutside();
		await frames();
		expect(modal.onClose).not.toHaveBeenCalled();
		const first = button(dialog, "Open nested");
		const last = button(dialog, "Done");
		first.focus();
		expect(await tabTrail(3)).toEqual([last, first, last]);
	});

	referenceDefectTest(
		"hideBackdrop: the page beside the content stays clickable, and focus comes back to the content",
		async () => {
			const modal = setup({ flags: { ...flags, hideBackdrop: true } });
			const dialog = await modal.open();
			await expect.element(dialog).toHaveFocus();
			await modal.pressOutside();
			await expect.poll(() => modal.onPagePress.mock.calls.length).toBe(1);
			expect(modal.onClose).not.toHaveBeenCalled();
			await expect
				.poll(() => dialog.contains(document.activeElement))
				.toBe(true);
		},
	);

	(disablePortal ? referenceDefectTest : test)(
		"while focus is kept in, the rest of the page is hidden from assistive tech, until it closes",
		async () => {
			const modal = setup({ flags });
			const dialog = await modal.open();
			await expect
				.poll(() =>
					modal.page.map((element) => isHiddenFromAssistiveTech(element)),
				)
				.toEqual([true, true, true]);
			expect(isHiddenFromAssistiveTech(dialog)).toBe(false);
			await userEvent.keyboard("{Escape}");
			await expect.element(dialog).not.toBeInTheDocument();
			await expect
				.poll(() =>
					modal.page.map((element) => isHiddenFromAssistiveTech(element)),
				)
				.toEqual([false, false, false]);
		},
	);

	test("a popup already open in body is hidden with the rest of the page, until it closes", async () => {
		function Saved() {
			return createPortal(
				<div role="tooltip">Saved to drafts</div>,
				document.body,
			);
		}

		render(<Saved />);
		const tooltip = screen.getByRole("tooltip", { name: "Saved to drafts" });
		const modal = setup({ flags });
		const dialog = await modal.open();
		await expect.poll(() => isHiddenFromAssistiveTech(tooltip)).toBe(true);
		expect(isHiddenFromAssistiveTech(dialog)).toBe(false);
		await userEvent.keyboard("{Escape}");
		await expect.element(dialog).not.toBeInTheDocument();
		await expect.poll(() => isHiddenFromAssistiveTech(tooltip)).toBe(false);
	});

	referenceDefectTest(
		"disableEnforceFocus: Tab takes focus out of the content, and the page stays exposed to assistive tech",
		async () => {
			const modal = setup({ flags: { ...flags, disableEnforceFocus: true } });
			const dialog = await modal.open();
			await expect.element(dialog).toHaveFocus();
			await frames();
			expect(
				modal.page.map((element) => isHiddenFromAssistiveTech(element)),
			).toEqual([false, false, false]);
			button(dialog, "Done").focus();
			await userEvent.tab();
			await expect
				.poll(() => dialog.contains(document.activeElement))
				.toBe(false);
		},
	);

	referenceDefectTest(
		"disableEnforceFocus with hideBackdrop: a press on the page reaches it, and focus stays there",
		async () => {
			const modal = setup({
				flags: { ...flags, disableEnforceFocus: true, hideBackdrop: true },
			});
			const dialog = await modal.open();
			await expect.element(dialog).toHaveFocus();
			await modal.pressOutside();
			await expect.poll(() => modal.onPagePress.mock.calls.length).toBe(1);
			await frames();
			expect(document.activeElement).toBe(modal.pageAction);
			expect(dialog).toBeVisible();
		},
	);

	test("disableAutoFocus: focus isn't moved into the content, and Escape still reaches onClose", async () => {
		const modal = setup({ flags: { ...flags, disableAutoFocus: true } });
		const dialog = await modal.open();
		await frames();
		expect(dialog.contains(document.activeElement)).toBe(false);
		await userEvent.keyboard("{Escape}");
		await expect.poll(modal.reasons).toEqual(["escapeKeyDown"]);
	});

	(disablePortal ? test : referenceDefectTest)(
		"disableAutoFocus: focus stays on the element that had it",
		async () => {
			const modal = setup({ flags: { ...flags, disableAutoFocus: true } });
			await modal.open();
			await frames();
			expect(document.activeElement).toBe(modal.opener);
		},
	);

	test("disableRestoreFocus: focus doesn't return to the opener when it closes", async () => {
		const modal = setup({ flags: { ...flags, disableRestoreFocus: true } });
		const dialog = await modal.open();
		await expect.element(dialog).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await expect.element(dialog).not.toBeInTheDocument();
		await frames();
		expect(document.activeElement).not.toBe(modal.opener);
	});

	test("page scroll is locked while it's open, and free again once it closes", async () => {
		const modal = setup({ flags });
		const dialog = await modal.open();
		await expectScrollLocked(dialog);
		await userEvent.keyboard("{Escape}");
		await expect.element(dialog).not.toBeInTheDocument();
		await expectScrollFree(modal.opener);
	});

	test("disableScrollLock leaves the page scrollable while it's open", async () => {
		const modal = setup({ flags: { ...flags, disableScrollLock: true } });
		const dialog = await modal.open();
		await expectScrollFree(dialog);
	});

	test("keepMounted: closed, the content stays in the DOM, hidden from view and from assistive tech, and keeps its state", async () => {
		const modal = setup({
			flags: { ...flags, keepMounted: true },
			children: (
				<Fade timeout={60}>
					<Surface>
						<label>
							Project name <input />
						</label>
						<button type="button">Done</button>
					</Surface>
				</Fade>
			),
		});
		const surface = must(document.querySelector('[role="dialog"]'));
		expect(surface).not.toBeVisible();
		expect(screen.queryByRole("dialog")).toBeNull();

		const dialog = await modal.open();
		expect(dialog).toBe(surface);
		const field = within(dialog).getByRole<HTMLInputElement>("textbox", {
			name: "Project name",
		});
		await userEvent.fill(field, "Blue Glass");
		await userEvent.keyboard("{Escape}");
		await expect.element(dialog).not.toBeVisible();
		expect(dialog.isConnected).toBe(true);
		expect(screen.queryByRole("dialog")).toBeNull();
		await expect
			.poll(() =>
				modal.page.map((element) => isHiddenFromAssistiveTech(element)),
			)
			.toEqual([false, false, false]);
		expect(elementOver(modal.pageAction)).toBe(modal.pageAction);
		await expectScrollFree(modal.opener);

		await userEvent.click(modal.opener);
		await expect.element(dialog).toBeVisible();
		expect(screen.getByRole("dialog", { name: "Modal" })).toBe(dialog);
		expect(field.value).toBe("Blue Glass");
	});

	referenceDefectTest(
		"keepMounted with a child that isn't a transition: closed, the content is hidden and the page takes presses again",
		async () => {
			const modal = setup({ flags: { ...flags, keepMounted: true } });
			const dialog = await modal.open();
			await expect.element(dialog).toHaveFocus();
			await userEvent.keyboard("{Escape}");
			await expect.poll(modal.reasons).toEqual(["escapeKeyDown"]);
			await expect
				.poll(() => dialog.checkVisibility({ visibilityProperty: true }))
				.toBe(false);
			expect(dialog.isConnected).toBe(true);
			expect(elementOver(modal.pageAction)).toBe(modal.pageAction);
			await userEvent.click(modal.pageAction);
			expect(modal.onPagePress).toHaveBeenCalledTimes(1);
		},
	);

	test("without keepMounted, the content leaves the DOM when it closes and comes back fresh", async () => {
		const modal = setup({
			flags,
			children: (
				<Surface>
					<label>
						Project name <input />
					</label>
					<button type="button">Done</button>
				</Surface>
			),
		});
		const dialog = await modal.open();
		await userEvent.fill(
			within(dialog).getByRole("textbox", { name: "Project name" }),
			"Blue Glass",
		);
		await userEvent.keyboard("{Escape}");
		await expect.element(dialog).not.toBeInTheDocument();
		const reopened = await modal.open();
		expect(
			within(reopened).getByRole<HTMLInputElement>("textbox", {
				name: "Project name",
			}).value,
		).toBe("");
	});

	test("a transition child enters on open, and on close the content stays until its exit has run", async () => {
		const calls: Array<{ name: string; isConnected: boolean }> = [];
		const note = (name: string) => (node: HTMLElement) => {
			calls.push({ name, isConnected: node.isConnected });
		};

		const modal = setup({
			flags,
			children: (
				<Fade
					timeout={{ enter: 60, exit: 120 }}
					onEnter={note("enter")}
					onEntered={note("entered")}
					onExit={note("exit")}
					onExited={note("exited")}
				>
					<Surface />
				</Fade>
			),
		});
		const dialog = await modal.open();
		await expect
			.poll(() => calls.map((call) => call.name))
			.toEqual(["enter", "entered"]);
		await userEvent.keyboard("{Escape}");
		await expect
			.poll(() => calls.map((call) => call.name))
			.toEqual(["enter", "entered", "exit", "exited"]);
		expect(calls.at(-1)?.isConnected).toBe(true);
		await expect.element(dialog).not.toBeInTheDocument();
		await expect.element(modal.opener).toHaveFocus();
	});
});

type Layer = "outer" | "inner";

type NestedProps = {
	readonly placement: "inside" | "beside";
	readonly outerFlags?: Flags;
	readonly innerFlags?: Flags;
	readonly onClose: (layer: Layer, reason: ModalCloseReason) => void;
};

function Nested({ placement, outerFlags, innerFlags, onClose }: NestedProps) {
	const [isOuterOpen, setIsOuterOpen] = React.useState(false);
	const [isInnerOpen, setIsInnerOpen] = React.useState(false);
	const inner = (
		<Modal
			open={isInnerOpen}
			onClose={(_event, reason) => {
				onClose("inner", reason);
				setIsInnerOpen(false);
			}}
			{...innerFlags}
		>
			<Surface label="Nested" style={{ top: 440, left: 140 }}>
				<button type="button">Confirm</button>
				<button
					type="button"
					onClick={() => {
						setIsInnerOpen(false);
					}}
				>
					Close
				</button>
			</Surface>
		</Modal>
	);
	return (
		<>
			<button
				type="button"
				onClick={() => {
					setIsOuterOpen(true);
				}}
			>
				Open a modal
			</button>
			<button type="button">Page action</button>
			<Modal
				open={isOuterOpen}
				onClose={(_event, reason) => {
					onClose("outer", reason);
					setIsOuterOpen(false);
				}}
				{...outerFlags}
			>
				<Surface>
					<button
						type="button"
						onClick={() => {
							setIsInnerOpen(true);
						}}
					>
						Open nested
					</button>
					<button
						type="button"
						onClick={() => {
							setIsOuterOpen(false);
						}}
					>
						Done
					</button>
					{placement === "inside" ? inner : null}
				</Surface>
			</Modal>
			{placement === "beside" ? inner : null}
			<div style={{ height: 3000 }} />
		</>
	);
}

function setupNested(props: Omit<NestedProps, "onClose">) {
	const calls: string[] = [];
	render(
		<Nested
			{...props}
			onClose={(layer, reason) => {
				calls.push(`${layer}:${reason}`);
			}}
		/>,
	);
	const opener = screen.getByRole("button", { name: "Open a modal" });
	const pageAction = screen.getByRole("button", { name: "Page action" });
	return {
		calls,
		opener,
		pageAction,
		async openBoth() {
			await userEvent.click(opener);
			const outer = await screen.findByRole("dialog", { name: "Modal" });
			const openNested = button(outer, "Open nested");
			await userEvent.click(openNested);
			const inner = await screen.findByRole("dialog", { name: "Nested" });
			return { outer, inner, openNested };
		},
	};
}

describe.each([
	{ placement: "inside" as const, where: "inside the first one's content" },
	{ placement: "beside" as const, where: "beside the first one" },
])("a modal opened from another, $where", ({ placement }) => {
	test("only the top one reports Escape, Tab stays in it, and each close sends focus back to its opener", async () => {
		const nested = setupNested({ placement });
		const { outer, inner, openNested } = await nested.openBoth();
		await expect.element(inner).toHaveFocus();
		const confirm = button(inner, "Confirm");
		const close = button(inner, "Close");
		expect(await tabTrail(3)).toEqual([confirm, close, confirm]);

		await userEvent.keyboard("{Escape}");
		await expect.element(inner).not.toBeInTheDocument();
		expect(nested.calls).toEqual(["inner:escapeKeyDown"]);
		expect(outer).toBeVisible();
		await expect.element(openNested).toHaveFocus();

		await userEvent.keyboard("{Escape}");
		await expect.element(outer).not.toBeInTheDocument();
		expect(nested.calls).toEqual([
			"inner:escapeKeyDown",
			"outer:escapeKeyDown",
		]);
		await expect.element(nested.opener).toHaveFocus();
	});

	test("only the top one reports a press on the backdrop", async () => {
		const nested = setupNested({ placement });
		const { outer, inner } = await nested.openBoth();
		await expect.element(inner).toHaveFocus();
		await userEvent.click(nested.pageAction, { force: true });
		await expect.poll(() => nested.calls).toEqual(["inner:backdropClick"]);
		await expect.element(inner).not.toBeInTheDocument();
		await frames();
		expect(nested.calls).toEqual(["inner:backdropClick"]);
		expect(outer).toBeVisible();
	});

	test("a press that reaches a lower modal's backdrop isn't reported while one above is open", async () => {
		const nested = setupNested({
			placement,
			innerFlags: { hideBackdrop: true },
		});
		const { outer, inner } = await nested.openBoth();
		await expect.element(inner).toHaveFocus();
		await userEvent.click(nested.pageAction, { force: true });
		await frames();
		expect(nested.calls).toEqual([]);
		expect(inner).toBeVisible();
		expect(outer).toBeVisible();
	});

	test("while the second is open the first is hidden from assistive tech, and exposed again once the second closes", async () => {
		const nested = setupNested({ placement });
		const { outer, inner } = await nested.openBoth();
		await expect.poll(() => isHiddenFromAssistiveTech(outer)).toBe(true);
		expect(isHiddenFromAssistiveTech(inner)).toBe(false);
		expect(isHiddenFromAssistiveTech(nested.pageAction)).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expect.element(inner).not.toBeInTheDocument();
		await expect.poll(() => isHiddenFromAssistiveTech(outer)).toBe(false);
	});

	test.each([
		{ outer: "locks", inner: "locks", isLockedAfterInner: true },
		{ outer: "locks", inner: "doesn't lock", isLockedAfterInner: true },
		{ outer: "doesn't lock", inner: "locks", isLockedAfterInner: false },
	])(
		"the first $outer and the second $inner: the page stays locked until the last locking modal closes",
		async ({ outer: outerLock, inner: innerLock, isLockedAfterInner }) => {
			const nested = setupNested({
				placement,
				outerFlags: { disableScrollLock: outerLock !== "locks" },
				innerFlags: { disableScrollLock: innerLock !== "locks" },
			});
			const { outer, inner } = await nested.openBoth();
			await expect.element(inner).toHaveFocus();
			await expectScrollLocked(inner);

			await userEvent.keyboard("{Escape}");
			await expect.element(inner).not.toBeInTheDocument();
			await (isLockedAfterInner
				? expectScrollLocked(outer)
				: expectScrollFree(outer));

			await userEvent.keyboard("{Escape}");
			await expect.element(outer).not.toBeInTheDocument();
			await expectScrollFree(nested.opener);
		},
	);
});

test("a modal opened over an in-place one is exposed to assistive tech, and the in-place one is again once it closes", async () => {
	const nested = setupNested({
		placement: "inside",
		outerFlags: { disablePortal: true },
	});
	const { outer, inner } = await nested.openBoth();
	await expect.poll(() => isHiddenFromAssistiveTech(outer)).toBe(true);
	expect(isHiddenFromAssistiveTech(inner)).toBe(false);
	await userEvent.keyboard("{Escape}");
	await expect.element(inner).not.toBeInTheDocument();
	await expect.poll(() => isHiddenFromAssistiveTech(outer)).toBe(false);
	expect(nested.calls).toEqual(["inner:escapeKeyDown"]);
});
