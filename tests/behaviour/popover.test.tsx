import { act, cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, type Mock, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { type Placement, Popover, type PopoverProps } from "#ui";

afterEach(async () => {
	cleanup();
	await expect.poll(() => isScrollLocked()).toBe(false);
	await expect
		.poll(
			() => document.querySelectorAll('[aria-hidden="true"], [inert]').length,
		)
		.toBe(0);
});

type OnClose = NonNullable<PopoverProps["onClose"]>;

type Box = { left: number; top: number; width: number; height: number };

const shareName = "Share this project";

const middle: Box = { left: 157, top: 430, width: 100, height: 36 };

type SharePageProps = Omit<PopoverProps, "open" | "anchorEl" | "onClose"> & {
	readonly onClose?: OnClose;
	readonly closes?: boolean;
	readonly at?: Box;
	readonly onAfter?: () => void;
	readonly ref?: React.Ref<HTMLDivElement>;
};

const shareButtonAt = { left: 150, top: 240, width: 100, height: 36 };

function SharePage({
	onClose,
	closes = true,
	at = shareButtonAt,
	onAfter,
	children,
	...props
}: SharePageProps) {
	const [anchor, setAnchor] = React.useState<HTMLButtonElement | null>(null);
	const [open, setOpen] = React.useState(false);
	return (
		<>
			<p>Pick how to share VSebCode.</p>
			<button type="button">Before</button>
			<button
				ref={setAnchor}
				type="button"
				aria-haspopup="dialog"
				aria-expanded={open}
				style={{ position: "fixed", margin: 0, ...at }}
				onClick={() => {
					setOpen(true);
				}}
			>
				Share
			</button>
			<button type="button" onClick={onAfter}>
				After
			</button>
			<Popover
				open={open}
				anchorEl={anchor}
				role="dialog"
				aria-label={shareName}
				onClose={(event, reason) => {
					onClose?.(event, reason);
					if (closes) {
						setOpen(false);
					}
				}}
				{...props}
			>
				{children ?? <ShareActions />}
			</Popover>
		</>
	);
}

function ShareActions({ isMarked = false }: { readonly isMarked?: boolean }) {
	return (
		<>
			<span>Link to this project</span>
			<button type="button" data-autofocus={isMarked ? "" : undefined}>
				Copy link
			</button>
			<button type="button">Email link</button>
		</>
	);
}

async function openPopover(): Promise<{
	anchor: HTMLElement;
	surface: HTMLElement;
}> {
	const anchor = screen.getByRole("button", { name: "Share" });
	await userEvent.click(anchor);
	const surface = await vi.waitFor(() =>
		screen.getByRole("dialog", { name: shareName }),
	);
	return { anchor, surface };
}

async function expectClosed(): Promise<void> {
	await expect
		.poll(() => screen.queryByRole("dialog", { name: shareName }))
		.toBeNull();
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function nativeOf(event: React.SyntheticEvent | Event): Event {
	return event instanceof Event ? event : event.nativeEvent;
}

function onlyClose(
	onClose: Mock<OnClose>,
): [React.SyntheticEvent | KeyboardEvent, string] {
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

function isHiddenFromAssistiveTech(element: Element): boolean {
	return element.closest('[aria-hidden="true"], [inert]') !== null;
}

async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- frames run one after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

const tolerance = 1.5;

function misplacement(
	anchor: { getBoundingClientRect(): DOMRect },
	surface: Element,
	placement: Placement,
	gap = 8,
): string[] {
	const a = anchor.getBoundingClientRect();
	const s = surface.getBoundingClientRect();
	const [side, align = "center"] = placement.split("-", 2);
	const problems: string[] = [];
	const near = (what: string, actual: number, expected: number) => {
		if (Math.abs(actual - expected) > tolerance) {
			problems.push(
				`${what} at ${actual.toFixed(1)}, not ${expected.toFixed(1)}`,
			);
		}
	};

	switch (side) {
		case "top": {
			near("bottom edge", s.bottom, a.top - gap);
			break;
		}

		case "bottom": {
			near("top edge", s.top, a.bottom + gap);
			break;
		}

		case "left": {
			near("right edge", s.right, a.left - gap);
			break;
		}

		default: {
			near("left edge", s.left, a.right + gap);
		}
	}

	const isTopOrBottom = side === "top" || side === "bottom";
	if (align === "start") {
		near(
			"start edge",
			isTopOrBottom ? s.left : s.top,
			isTopOrBottom ? a.left : a.top,
		);
	} else if (align === "end") {
		near(
			"end edge",
			isTopOrBottom ? s.right : s.bottom,
			isTopOrBottom ? a.right : a.bottom,
		);
	} else if (isTopOrBottom) {
		near("centre", (s.left + s.right) / 2, (a.left + a.right) / 2);
	} else {
		near("centre", (s.top + s.bottom) / 2, (a.top + a.bottom) / 2);
	}

	return problems;
}

const placements = [
	"top",
	"top-start",
	"top-end",
	"bottom",
	"bottom-start",
	"bottom-end",
	"left",
	"left-start",
	"left-end",
	"right",
	"right-start",
	"right-end",
] as const satisfies readonly Placement[];

const card: React.CSSProperties = { width: 120, height: 64 };

describe("the surface", () => {
	test("open shows it, and the ref, role, aria-label, className and other attributes land on it, around the children", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<SharePage
				ref={ref}
				className="share-popover"
				id="share-popover"
				style={{ width: 260 }}
			/>,
		);
		expect(screen.queryByRole("dialog", { name: shareName })).toBeNull();
		const { surface } = await openPopover();
		expect(surface).toBeVisible();
		expect(surface).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(surface);
		expect(surface).toHaveClass("share-popover");
		expect(surface).toHaveAttribute("id", "share-popover");
		expect(within(surface).getByText("Link to this project")).toBeVisible();
		expect(
			within(surface).getByRole("button", { name: "Copy link" }),
		).toBeVisible();
		await expect
			.poll(() => Math.round(surface.getBoundingClientRect().width))
			.toBe(260);
	});

	test.each([
		["md, the default", undefined, "gl-popover-pad-md"],
		["sm", "sm", "gl-popover-pad-sm"],
		["none", "none", "gl-popover-pad-none"],
	] as const)(
		"padding %s gives the surface its padding class",
		async (_name, padding, className) => {
			render(<SharePage padding={padding} />);
			const { surface } = await openPopover();
			expect(surface).toHaveClass(className);
		},
	);

	test.each([
		["sm", "7px"],
		["none", "0px"],
	] as const)("padding %s pads the surface %s", async (padding, size) => {
		render(<SharePage padding={padding} />);
		const { surface } = await openPopover();
		expect(getComputedStyle(surface).paddingTop).toBe(size);
		expect(getComputedStyle(surface).paddingLeft).toBe(size);
	});
});

describe("placement", () => {
	test("by default it opens below the anchor, 8px away, with their left edges lined up (bottom-start)", async () => {
		render(<SharePage at={middle} style={card} />);
		const { anchor, surface } = await openPopover();
		await expect
			.poll(() => misplacement(anchor, surface, "bottom-start"))
			.toEqual([]);
	});

	test.each(placements)(
		"%s puts it on that side of the anchor, 8px away, lined up as named",
		async (placement) => {
			render(
				<SharePage
					at={middle}
					placement={placement}
					style={card}
					padding="none"
				>
					Shared
				</SharePage>,
			);
			const { anchor, surface } = await openPopover();
			await expect
				.poll(() => misplacement(anchor, surface, placement))
				.toEqual([]);
		},
	);

	test("offset sets the gap to the anchor", async () => {
		render(<SharePage at={middle} style={card} offset={24} />);
		const { anchor, surface } = await openPopover();
		await expect
			.poll(() => misplacement(anchor, surface, "bottom-start", 24))
			.toEqual([]);
	});

	test.each([
		["bottom-start", "below", "top-start", 848],
		["top", "above", "bottom", 12],
	] as const)(
		"%s flips to the other side when there's no room %s the anchor",
		async (placement, _where, landing, top) => {
			render(
				<SharePage
					at={{ ...middle, top }}
					placement={placement}
					style={card}
					padding="none"
				>
					Shared
				</SharePage>,
			);
			const { anchor, surface } = await openPopover();
			await expect
				.poll(() => misplacement(anchor, surface, landing))
				.toEqual([]);
		},
	);

	test("right flips to the left when there's no room at the right edge", async () => {
		render(
			<SharePage
				at={{ ...middle, left: 302 }}
				placement="right"
				style={card}
				padding="none"
			>
				Shared
			</SharePage>,
		);
		const { anchor, surface } = await openPopover();
		await expect.poll(() => misplacement(anchor, surface, "left")).toEqual([]);
	});

	test("near the right edge it stays on screen, still below the anchor", async () => {
		render(
			<SharePage
				at={{ left: 330, top: 300, width: 60, height: 36 }}
				style={{ width: 200, height: 64 }}
			/>,
		);
		const { anchor, surface } = await openPopover();
		await expect
			.poll(() => {
				const a = anchor.getBoundingClientRect();
				const s = surface.getBoundingClientRect();
				return {
					isOnScreen: s.left >= 0 && s.right <= window.innerWidth,
					isBelow: Math.abs(s.top - (a.bottom + 8)) <= tolerance,
				};
			})
			.toEqual({ isOnScreen: true, isBelow: true });
	});

	test.each([
		[true, "at least as wide as the anchor"],
		[false, "as wide as its content, here narrower than the anchor"],
	] as const)(
		"matchWidth %s: the surface is %s",
		async (matchWidth, _width) => {
			render(
				<SharePage
					at={{ left: 60, top: 240, width: 280, height: 36 }}
					matchWidth={matchWidth}
				>
					Shared
				</SharePage>,
			);
			const { anchor, surface } = await openPopover();
			const isAsWide = () =>
				surface.getBoundingClientRect().width >=
				anchor.getBoundingClientRect().width - 0.5;
			await expect.poll(isAsWide).toBe(matchWidth);
		},
	);

	test.each(["a function returning the element", "a virtual element"] as const)(
		"anchorEl can be %s",
		async (kind) => {
			const point = new DOMRect(120, 200, 0, 0);
			function Anchored() {
				const anchorRef = React.useRef<HTMLButtonElement>(null);
				const [open, setOpen] = React.useState(false);
				const anchorElement =
					kind === "a virtual element"
						? { getBoundingClientRect: () => point }
						: () => anchorRef.current;
				return (
					<>
						<button
							ref={anchorRef}
							type="button"
							style={{ position: "fixed", margin: 0, ...middle }}
							onClick={() => {
								setOpen(true);
							}}
						>
							Share
						</button>
						<Popover
							open={open}
							anchorEl={anchorElement}
							role="dialog"
							aria-label={shareName}
							style={card}
							onClose={() => {
								setOpen(false);
							}}
						>
							Shared
						</Popover>
					</>
				);
			}

			render(<Anchored />);
			const { anchor, surface } = await openPopover();
			const target =
				kind === "a virtual element"
					? { getBoundingClientRect: () => point }
					: anchor;
			await expect
				.poll(() => misplacement(target, surface, "bottom-start"))
				.toEqual([]);
		},
	);
});

describe("closing", () => {
	test("Escape calls onClose with the Escape keydown and escapeKeyDown; once closed, focus is back on the anchor", async () => {
		const onClose = vi.fn<OnClose>();
		render(<SharePage onClose={onClose} />);
		const { anchor } = await openPopover();
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
		await expect.element(anchor).toHaveFocus();
	});

	test("a press outside calls onClose with the press and backdropClick, without reaching the page; once closed, focus is back on the anchor", async () => {
		const onClose = vi.fn<OnClose>();
		const onAfter = vi.fn<() => void>();
		render(<SharePage onClose={onClose} onAfter={onAfter} />);
		const after = button("After");
		const { anchor } = await openPopover();
		await userEvent.click(after, { force: true });
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalled();
		});
		const [event, reason] = onlyClose(onClose);
		expect(reason).toBe("backdropClick");
		expect(nativeOf(event)).toBeInstanceOf(MouseEvent);
		expect(onAfter).not.toHaveBeenCalled();
		await expectClosed();
		await expect.element(anchor).toHaveFocus();
	});

	test("a press inside doesn't close it", async () => {
		const onClose = vi.fn<OnClose>();
		render(<SharePage onClose={onClose} />);
		const { surface } = await openPopover();
		await userEvent.click(within(surface).getByText("Link to this project"));
		await userEvent.click(
			within(surface).getByRole("button", { name: "Email link" }),
		);
		expect(onClose).not.toHaveBeenCalled();
		expect(surface).toBeVisible();
	});

	test("onClose only asks: while open stays true it stays open, and Tab still cycles inside", async () => {
		const onClose = vi.fn<OnClose>();
		render(
			<SharePage closes={false} onClose={onClose}>
				<ShareActions isMarked />
			</SharePage>,
		);
		const { surface } = await openPopover();
		await expect.element(button("Copy link")).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(onClose).toHaveBeenCalledWith(expect.anything(), "escapeKeyDown");
		});
		await userEvent.tab();
		await expect.element(button("Email link")).toHaveFocus();
		expect(surface).toBeVisible();
	});
});

describe("focus", () => {
	test("focus moves into the surface when it opens", async () => {
		render(<SharePage />);
		const { surface } = await openPopover();
		await expect
			.poll(() => surface.contains(document.activeElement))
			.toBe(true);
	});

	test("an element marked data-autofocus takes focus when it opens", async () => {
		render(
			<SharePage>
				<ShareActions isMarked />
			</SharePage>,
		);
		await openPopover();
		await expect.element(button("Copy link")).toHaveFocus();
	});

	test("Tab and Shift+Tab cycle through the content", async () => {
		render(
			<SharePage>
				<ShareActions isMarked />
			</SharePage>,
		);
		await openPopover();
		await expect.element(button("Copy link")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("Email link")).toHaveFocus();
		await userEvent.tab();
		await expect.element(button("Copy link")).toHaveFocus();
		await userEvent.tab({ shift: true });
		await expect.element(button("Email link")).toHaveFocus();
	});

	test("focus stays in: moving it to the page from a script brings it back into the surface", async () => {
		render(<SharePage />);
		const before = button("Before");
		const { surface } = await openPopover();
		await expect
			.poll(() => surface.contains(document.activeElement))
			.toBe(true);
		act(() => {
			before.focus();
		});
		await expect
			.poll(() => surface.contains(document.activeElement))
			.toBe(true);
	});

	test("disableAutoFocus leaves focus out of the surface when it opens", async () => {
		render(<SharePage disableAutoFocus />);
		const { surface } = await openPopover();
		await frames();
		expect(surface).toBeVisible();
		expect(surface.contains(document.activeElement)).toBe(false);
	});

	test("disableAutoFocus with disablePortal, as the preview stages it, keeps focus on the anchor", async () => {
		render(<SharePage disableAutoFocus disablePortal />);
		const { anchor, surface } = await openPopover();
		await frames();
		expect(surface).toBeVisible();
		expect(anchor).toHaveFocus();
	});

	test("disableRestoreFocus leaves focus off the anchor once it closes", async () => {
		render(<SharePage disableRestoreFocus />);
		const { anchor, surface } = await openPopover();
		await expect
			.poll(() => surface.contains(document.activeElement))
			.toBe(true);
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => surface.isConnected).toBe(false);
		expect(anchor).not.toHaveFocus();
	});

	referenceDefectTest(
		"disableEnforceFocus lets focus leave for the page, which stays exposed, while the popover stays open",
		async () => {
			render(<SharePage disableEnforceFocus />);
			const after = button("After");
			const { surface } = await openPopover();
			await expect
				.poll(() => surface.contains(document.activeElement))
				.toBe(true);
			act(() => {
				after.focus();
			});
			await frames();
			expect(after).toHaveFocus();
			expect(isHiddenFromAssistiveTech(after)).toBe(false);
			expect(surface).toBeVisible();
		},
	);
});

describe("the modal layer", () => {
	test("while it's open the rest of the page is hidden from assistive tech, and exposed again once it closes", async () => {
		render(<SharePage />);
		const text = screen.getByText("Pick how to share VSebCode.");
		expect(isHiddenFromAssistiveTech(text)).toBe(false);
		await openPopover();
		await expect.poll(() => isHiddenFromAssistiveTech(text)).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.poll(() => isHiddenFromAssistiveTech(text)).toBe(false);
	});

	test("while it's open the page doesn't scroll, and scrolls again once it closes", async () => {
		render(<SharePage />);
		expect(isScrollLocked()).toBe(false);
		await openPopover();
		await expect.poll(() => isScrollLocked()).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.poll(() => isScrollLocked()).toBe(false);
	});

	test("disableScrollLock leaves the page scrolling while it's open", async () => {
		render(<SharePage disableScrollLock />);
		await openPopover();
		await frames();
		expect(isScrollLocked()).toBe(false);
	});
});

describe("mounting", () => {
	test("it renders into document.body, outside its parent; disablePortal renders it in place", async () => {
		function Stage({ disablePortal }: { readonly disablePortal: boolean }) {
			return (
				<section aria-label="Stage">
					<SharePage disablePortal={disablePortal} />
				</section>
			);
		}

		const view = render(<Stage disablePortal={false} />);
		const stage = screen.getByRole("region", { name: "Stage" });
		const portalled = await openPopover();
		expect(stage.contains(portalled.surface)).toBe(false);
		expect(document.body.contains(portalled.surface)).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		view.unmount();
		render(<Stage disablePortal />);
		const inPlace = screen.getByRole("region", { name: "Stage" });
		const { surface } = await openPopover();
		expect(inPlace.contains(surface)).toBe(true);
	});

	test.each(["an element", "a function returning it"] as const)(
		"container takes %s and renders it there",
		async (kind) => {
			const host = document.createElement("div");
			document.body.append(host);
			try {
				render(
					<SharePage container={kind === "an element" ? host : () => host} />,
				);
				const { surface } = await openPopover();
				expect(host.contains(surface)).toBe(true);
			} finally {
				cleanup();
				host.remove();
			}
		},
	);

	test("keepMounted keeps the content in the document while closed, hidden, and opens it again", async () => {
		render(<SharePage keepMounted />);
		const content = screen.getByText("Link to this project");
		expect(content).not.toBeVisible();
		expect(screen.queryByRole("dialog", { name: shareName })).toBeNull();
		const { anchor, surface } = await openPopover();
		expect(surface.contains(content)).toBe(true);
		await expect.element(content).toBeVisible();
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.element(content).not.toBeVisible();
		expect(content.isConnected).toBe(true);
		await userEvent.click(anchor);
		await expect.element(content).toBeVisible();
	});

	test("without keepMounted the content leaves the document once it closes", async () => {
		render(<SharePage />);
		expect(screen.queryByText("Link to this project")).toBeNull();
		const { surface } = await openPopover();
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => surface.isConnected).toBe(false);
		expect(screen.queryByText("Link to this project")).toBeNull();
	});
});
