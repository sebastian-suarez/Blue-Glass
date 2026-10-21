import { act, cleanup, render } from "@testing-library/react";
import * as React from "react";
import { createPortal } from "react-dom";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
// The real overlay layout: .gl-modal and .gl-backdrop cover the viewport.
import "../styles/index.css";
import {
	type ModalCloseReason,
	type ModalLayerProps,
	ModalLayer,
	resolveModalBehaviour,
} from "./modal.js";
import { type TransitionOptions, useTransition } from "./transition.js";

type Flags = Omit<ModalLayerProps, "open" | "onClose" | "children">;
type CloseCall = {
	reason: ModalCloseReason;
	event: React.SyntheticEvent | KeyboardEvent;
};

afterEach(() => {
	cleanup();
	window.scrollTo(0, 0);
});

async function frames(count = 3) {
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- frames run one after another
		await new Promise((resolve) => {
			requestAnimationFrame(resolve);
		});
	}
}

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
	const element = document.querySelector<T>(`#${id}`);
	if (!element) {
		throw new Error(`#${id} is missing`);
	}

	return element;
}

function Surface({ children }: { readonly children?: React.ReactNode }) {
	return (
		<div
			id="surface"
			role="dialog"
			aria-modal="true"
			aria-label="Surface"
			style={{
				position: "fixed",
				top: 200,
				left: 100,
				width: 200,
				background: "white",
			}}
		>
			{children ?? (
				<>
					<button type="button" id="first">
						First
					</button>
					<button type="button" id="last">
						Last
					</button>
				</>
			)}
		</div>
	);
}

function setup(flags: Flags = {}, surface: React.ReactElement = <Surface />) {
	const calls: CloseCall[] = [];
	const pageClicks: string[] = [];
	const onClose = vi.fn(
		(event: React.SyntheticEvent | KeyboardEvent, reason: ModalCloseReason) => {
			calls.push({ event, reason });
		},
	);
	function Page({ open }: { readonly open: boolean }) {
		return (
			<div>
				<button type="button" id="opener">
					Open
				</button>
				<button
					type="button"
					id="page-button"
					onClick={() => {
						pageClicks.push("page-button");
					}}
				>
					Page
				</button>
				<div style={{ height: 3000 }} />
				<ModalLayer open={open} onClose={onClose} {...flags}>
					{surface}
				</ModalLayer>
				<button type="button" id="after">
					After
				</button>
			</div>
		);
	}

	const view = render(<Page open={false} />);
	return {
		calls,
		pageClicks,
		onClose,
		async open() {
			await userEvent.click(byId("opener"));
			view.rerender(<Page open />);
			await frames();
		},
		async close() {
			view.rerender(<Page open={false} />);
			await frames();
		},
		root() {
			const root = document.querySelector<HTMLElement>(".gl-modal");
			if (!root) {
				throw new Error("the layer's root is missing");
			}

			return root;
		},
	};
}

function isInsideLayer(element: Element | null) {
	const root = document.querySelector(".gl-modal");
	return root !== null && element !== null && root.contains(element);
}

async function tabTrail(count: number) {
	const trail: Array<Element | null> = [];
	for (let index = 0; index < count; index++) {
		// eslint-disable-next-line no-await-in-loop -- each Tab depends on the previous one
		await userEvent.tab();
		trail.push(document.activeElement);
	}

	return trail;
}

test("resolveModalBehaviour maps each flag on its own", () => {
	expect(resolveModalBehaviour({})).toEqual({
		modal: "trap-focus",
		shouldEnforceFocus: true,
		shouldLockScroll: true,
		backdrop: "visible",
		shouldCloseOnEscape: true,
		shouldAutoFocus: true,
		shouldRestoreFocus: true,
	});
	expect(
		resolveModalBehaviour({
			disableEnforceFocus: true,
			disableScrollLock: true,
			hideBackdrop: true,
			disableEscapeKeyDown: true,
			disableAutoFocus: true,
			disableRestoreFocus: true,
		}),
	).toEqual({
		modal: false,
		shouldEnforceFocus: false,
		shouldLockScroll: false,
		backdrop: "none",
		shouldCloseOnEscape: false,
		shouldAutoFocus: false,
		shouldRestoreFocus: false,
	});
	expect(resolveModalBehaviour({ invisibleBackdrop: true }).backdrop).toBe(
		"invisible",
	);
	expect(
		resolveModalBehaviour({ invisibleBackdrop: true, hideBackdrop: true })
			.backdrop,
	).toBe("none");
});

// Every combination, through Base UI's portal and rendered in place, which has its own path.
const combinations = [false, true].flatMap((disablePortal) =>
	[false, true].flatMap((disableEnforceFocus) =>
		[false, true].flatMap((disableScrollLock) =>
			[false, true].map((hideBackdrop) => ({
				disablePortal,
				disableEnforceFocus,
				disableScrollLock,
				hideBackdrop,
			})),
		),
	),
);

describe.each(combinations)(
	"disablePortal=$disablePortal disableEnforceFocus=$disableEnforceFocus disableScrollLock=$disableScrollLock hideBackdrop=$hideBackdrop",
	(flags) => {
		test("focus, Tab, scroll, outside clicks, Escape and focus return follow the flags", async () => {
			const modal = setup(flags);
			await modal.open();

			// Focus moves in, to the surface.
			expect(document.activeElement).toBe(byId("surface"));

			// The page is hidden from assistive tech while focus is enforced, and never inert.
			const pageButton = byId("page-button");
			expect(pageButton.closest('[aria-hidden="true"]') !== null).toBe(
				!flags.disableEnforceFocus,
			);
			expect(pageButton.closest("[inert]")).toBeNull();

			// Tab: kept in the content, or let out.
			const trail = await tabTrail(4);
			if (flags.disableEnforceFocus) {
				expect(trail).toContain(byId("after"));
			} else {
				expect(trail.map((element) => element?.id)).toEqual([
					"first",
					"last",
					"first",
					"last",
				]);
			}

			// Tabbing out may have scrolled the page to #after; start the scroll check from the top.
			byId("first").focus();
			window.scrollTo(0, 0);

			// Page scroll: locked (overflow hidden on body) or free.
			expect(document.body.style.overflow).toBe(
				flags.disableScrollLock ? "" : "hidden",
			);
			await userEvent.wheel(byId("surface"), { delta: { y: 400 } });
			if (flags.disableScrollLock) {
				await expect.poll(() => window.scrollY).toBeGreaterThan(0);
			} else {
				await frames(6);
				expect(window.scrollY).toBe(0);
			}

			window.scrollTo(0, 0);
			byId("first").focus();

			// An outside press: the backdrop catches it, or the page gets it.
			await userEvent.click(byId("page-button"), { force: true });
			if (flags.hideBackdrop) {
				expect(modal.pageClicks).toEqual(["page-button"]);
				expect(modal.onClose).not.toHaveBeenCalled();
			} else {
				expect(modal.pageClicks).toEqual([]);
				expect(modal.calls.map((call) => call.reason)).toEqual([
					"backdropClick",
				]);
			}

			// Focus after that press: kept in, unless focus is free.
			if (flags.disableEnforceFocus) {
				expect(isInsideLayer(document.activeElement)).toBe(false);
			} else {
				expect(isInsideLayer(document.activeElement)).toBe(true);
			}

			// Escape reports escapeKeyDown with the KeyboardEvent, wherever focus is.
			modal.calls.length = 0;
			await userEvent.keyboard("{Escape}");
			expect(modal.calls.map((call) => call.reason)).toEqual(["escapeKeyDown"]);
			expect(modal.calls[0]?.event).toBeInstanceOf(KeyboardEvent);

			// Closing returns focus to the opener and releases the page.
			await modal.close();
			await expect.poll(() => document.activeElement).toBe(byId("opener"));
			expect(document.body.style.overflow).toBe("");
		});
	},
);

// The in-place path has its own Escape, focus and keepMounted code, so these run on both.
describe.each([false, true])(
	"the remaining flags, disablePortal=%s",
	(disablePortal) => {
		test("disableEscapeKeyDown: Escape reports nothing and keeps propagating", async () => {
			const modal = setup({ disableEscapeKeyDown: true, disablePortal });
			await modal.open();
			const seen: KeyboardEvent[] = [];
			const listener = (event: KeyboardEvent) => {
				seen.push(event);
			};

			document.addEventListener("keydown", listener);
			try {
				await userEvent.keyboard("{Escape}");
			} finally {
				document.removeEventListener("keydown", listener);
			}

			expect(modal.onClose).not.toHaveBeenCalled();
			expect(seen.map((event) => [event.key, event.defaultPrevented])).toEqual([
				["Escape", false],
			]);
		});

		test("Escape is handled once and stops there", async () => {
			const modal = setup({ disablePortal });
			await modal.open();
			const seen: string[] = [];
			const listener = (event: KeyboardEvent) => {
				seen.push(event.key);
			};

			document.addEventListener("keydown", listener);
			try {
				await userEvent.keyboard("{Escape}");
			} finally {
				document.removeEventListener("keydown", listener);
			}

			expect(modal.calls.map((call) => call.reason)).toEqual(["escapeKeyDown"]);
			expect(seen).toEqual([]);
		});

		test("a backdrop click reports backdropClick with the React event", async () => {
			const modal = setup({ disablePortal });
			await modal.open();
			const backdrop = document.querySelector<HTMLElement>(".gl-backdrop");
			expect(backdrop).not.toBeNull();
			await userEvent.click(backdrop!, { position: { x: 20, y: 20 } });
			expect(modal.calls).toHaveLength(1);
			const [call] = modal.calls;
			expect(call?.reason).toBe("backdropClick");
			expect(call?.event).not.toBeInstanceOf(Event);
			expect((call?.event as React.MouseEvent).nativeEvent).toBeInstanceOf(
				MouseEvent,
			);
			expect((call?.event as React.MouseEvent).target).toBe(backdrop);
		});

		test("invisibleBackdrop: transparent, and still catches outside presses", async () => {
			const modal = setup({ invisibleBackdrop: true, disablePortal });
			await modal.open();
			const backdrop = document.querySelector<HTMLElement>(".gl-backdrop");
			expect(backdrop?.classList.contains("gl-backdrop-invisible")).toBe(true);
			expect(getComputedStyle(backdrop!).backgroundColor).toBe(
				"rgba(0, 0, 0, 0)",
			);
			await userEvent.click(byId("page-button"), { force: true });
			expect(modal.pageClicks).toEqual([]);
			expect(modal.calls.map((call) => call.reason)).toEqual(["backdropClick"]);
		});

		test("BackdropProps reach the backdrop, and its handlers still run", async () => {
			const onClick =
				vi.fn<(event: React.MouseEvent<HTMLDivElement>) => void>();
			const modal = setup({
				BackdropProps: { className: "extra", "data-test": "backdrop", onClick },
				disablePortal,
			} as Flags);
			await modal.open();
			const backdrop = document.querySelector<HTMLElement>(".gl-backdrop");
			expect(backdrop?.classList.contains("extra")).toBe(true);
			expect(backdrop?.dataset.test).toBe("backdrop");
			await userEvent.click(backdrop!, { position: { x: 20, y: 20 } });
			expect(onClick).toHaveBeenCalledTimes(1);
			expect(modal.calls.map((call) => call.reason)).toEqual(["backdropClick"]);
		});

		test("disableAutoFocus: focus stays where it was", async () => {
			const modal = setup({ disableAutoFocus: true, disablePortal });
			await modal.open();
			await frames(3);
			expect(document.activeElement).toBe(byId("opener"));
		});

		test("data-autofocus marks the element that takes focus", async () => {
			const modal = setup(
				{ disablePortal },
				<Surface>
					<button type="button" id="first">
						First
					</button>
					<button data-autofocus type="button" id="marked">
						Marked
					</button>
				</Surface>,
			);
			await modal.open();
			expect(document.activeElement).toBe(byId("marked"));
		});

		test("the surface gets tabindex -1 when it takes focus", async () => {
			const modal = setup({ disablePortal });
			await modal.open();
			expect(byId("surface").getAttribute("tabindex")).toBe("-1");
			expect(document.activeElement).toBe(byId("surface"));
		});

		test("disableRestoreFocus: focus doesn't go back to the opener", async () => {
			const modal = setup({ disableRestoreFocus: true, disablePortal });
			await modal.open();
			await modal.close();
			await frames(3);
			expect(document.activeElement).not.toBe(byId("opener"));
		});

		test("keepMounted: the content stays in the DOM, hidden, and keeps its state", async () => {
			const modal = setup(
				{ keepMounted: true, disablePortal },
				<Surface>
					<input id="field" aria-label="Field" />
				</Surface>,
			);
			await modal.open();
			await userEvent.fill(byId("field"), "kept");
			await modal.close();
			expect(byId("surface").isConnected).toBe(true);
			expect(byId("surface").checkVisibility()).toBe(false);
			expect(modal.root().classList.contains("gl-modal-hidden")).toBe(true);
			await modal.open();
			expect(byId<HTMLInputElement>("field").value).toBe("kept");
			expect(modal.root().classList.contains("gl-modal-hidden")).toBe(false);
		});

		test("without keepMounted the content leaves the DOM when closed", async () => {
			const modal = setup({ disablePortal });
			await modal.open();
			await modal.close();
			expect(document.querySelector("#surface")).toBeNull();
		});
	},
);

describe("where the layer renders", () => {
	test("disablePortal: the layer renders in place", async () => {
		const calls: string[] = [];
		render(
			<section id="host">
				<ModalLayer
					open
					disablePortal
					onClose={(_event, reason) => {
						calls.push(reason);
					}}
				>
					<Surface />
				</ModalLayer>
			</section>,
		);
		await frames();
		expect(byId("host").contains(document.querySelector(".gl-modal"))).toBe(
			true,
		);
	});

	test("container: an element or a function that returns one", async () => {
		const target = document.createElement("div");
		target.id = "target";
		document.body.append(target);
		try {
			const view = render(
				<ModalLayer open container={target}>
					<Surface />
				</ModalLayer>,
			);
			await frames();
			expect(target.querySelector(".gl-modal")).not.toBeNull();
			view.rerender(
				<ModalLayer open container={() => target}>
					<Surface />
				</ModalLayer>,
			);
			await frames();
			expect(target.querySelector(".gl-modal")).not.toBeNull();
			view.unmount();
			render(
				<ModalLayer open container={null}>
					<Surface />
				</ModalLayer>,
			);
			await frames();
			expect(document.querySelector(".gl-modal")?.parentElement).toBe(
				document.body,
			);
		} finally {
			target.remove();
		}
	});

	test("the ref, className, style and zIndex go to the root", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<ModalLayer
				ref={ref}
				open
				className="extra"
				style={{ color: "rgb(1, 2, 3)" }}
			>
				<Surface />
			</ModalLayer>,
		);
		await frames();
		const root = document.querySelector<HTMLElement>(".gl-modal");
		expect(ref.current).toBe(root);
		expect(root?.classList.contains("extra")).toBe(true);
		expect(root?.style.color).toBe("rgb(1, 2, 3)");
		expect(getComputedStyle(root!).zIndex).toBe("1300");
		cleanup();
		render(
			<ModalLayer open zIndex={42}>
				<Surface />
			</ModalLayer>,
		);
		await frames();
		expect(getComputedStyle(document.querySelector(".gl-modal")!).zIndex).toBe(
			"42",
		);
	});
});

describe("scroll lock", () => {
	test("pads body by the scrollbar's width, and restores it", async () => {
		// Headless Chromium hides scrollbars, so the test fakes one 15px wide.
		const innerWidth = vi
			.spyOn(window, "innerWidth", "get")
			.mockReturnValue(document.documentElement.clientWidth + 15);
		document.body.style.paddingRight = "5px";
		try {
			const modal = setup();
			await modal.open();
			expect(document.body.style.overflow).toBe("hidden");
			expect(document.body.style.paddingRight).toBe("20px");
			await modal.close();
			expect(document.body.style.overflow).toBe("");
			expect(document.body.style.paddingRight).toBe("5px");
		} finally {
			innerWidth.mockRestore();
			document.body.style.paddingRight = "";
		}
	});

	test("adds no padding without a scrollbar", async () => {
		const modal = setup();
		await modal.open();
		expect(document.body.style.overflow).toBe("hidden");
		expect(document.body.style.paddingRight).toBe("");
	});
});

describe("stacked layers", () => {
	function Stack({
		inner,
		onClose,
	}: {
		readonly inner: boolean;
		readonly onClose: (name: string, reason: ModalCloseReason) => void;
	}) {
		return (
			<ModalLayer
				open
				onClose={(_event, reason) => {
					onClose("outer", reason);
				}}
			>
				<div
					id="outer"
					role="dialog"
					aria-label="Outer"
					style={{ position: "fixed", top: 100, left: 100 }}
				>
					<button type="button" id="outer-button">
						Outer
					</button>
					<ModalLayer
						disableScrollLock
						hideBackdrop
						open={inner}
						onClose={(_event, reason) => {
							onClose("inner", reason);
						}}
					>
						<div
							id="inner"
							role="dialog"
							aria-label="Inner"
							style={{ position: "fixed", top: 300, left: 300 }}
						>
							<button type="button" id="inner-button">
								Inner
							</button>
						</div>
					</ModalLayer>
				</div>
			</ModalLayer>
		);
	}

	test("only the top layer reports Escape and backdrop clicks; the lock lasts until the last locking layer closes", async () => {
		const calls: string[] = [];
		const onClose = (name: string, reason: ModalCloseReason) => {
			calls.push(`${name}:${reason}`);
		};

		const view = render(<Stack inner={false} onClose={onClose} />);
		await frames();
		view.rerender(<Stack inner onClose={onClose} />);
		await frames();
		expect(document.activeElement).toBe(byId("inner"));

		// Base UI renders the inner layer inside the outer one's portal, not straight into body.
		const outerRoot = byId("outer").closest(".gl-modal");
		const innerRoot = byId("inner").closest(".gl-modal");
		expect(outerRoot?.parentElement).toBe(document.body);
		expect(innerRoot?.parentElement?.closest(".gl-modal")).toBe(outerRoot);

		await userEvent.keyboard("{Escape}");
		expect(calls).toEqual(["inner:escapeKeyDown"]);

		// The inner layer has no backdrop: the press lands on the outer one, which isn't on top.
		calls.length = 0;
		const outerBackdrop = document.querySelector<HTMLElement>(".gl-backdrop");
		await userEvent.click(outerBackdrop!, {
			force: true,
			position: { x: 10, y: 10 },
		});
		expect(calls).toEqual([]);

		// The outer layer still locks scroll after the inner one closes.
		view.rerender(<Stack inner={false} onClose={onClose} />);
		await frames();
		expect(document.body.style.overflow).toBe("hidden");
		await userEvent.keyboard("{Escape}");
		expect(calls).toEqual(["outer:escapeKeyDown"]);
		view.unmount();
		expect(document.body.style.overflow).toBe("");
	});
});

describe("disablePortal on the server", () => {
	test("the server HTML holds the open layer in place, hydrates without errors, and then works", async () => {
		const calls: ModalCloseReason[] = [];
		const tree = (
			<section id="host">
				<button type="button" id="before">
					Before
				</button>
				<ModalLayer
					disablePortal
					open
					onClose={(_event, reason) => {
						calls.push(reason);
					}}
				>
					<Surface />
				</ModalLayer>
			</section>
		);
		const host = document.createElement("div");
		document.body.append(host);
		const errors: unknown[] = [];
		let root: ReturnType<typeof hydrateRoot> | undefined;
		try {
			host.innerHTML = renderToString(tree);
			const serverSurface = host.querySelector("#surface");
			expect(serverSurface).not.toBeNull();
			await act(async () => {
				root = hydrateRoot(host, tree, {
					onRecoverableError(error) {
						errors.push(error);
					},
				});
			});
			await frames();
			expect(errors).toEqual([]);
			// Adopted, not rendered again.
			expect(host.querySelector("#surface")).toBe(serverSurface);
			expect(document.activeElement).toBe(serverSurface);
			await userEvent.keyboard("{Escape}");
			expect(calls).toEqual(["escapeKeyDown"]);
		} finally {
			act(() => {
				root?.unmount();
			});
			host.remove();
		}
	});
});

describe("focus in content rendered elsewhere", () => {
	function PortaledButton() {
		return createPortal(
			<button
				type="button"
				id="portaled"
				style={{ position: "fixed", top: 0, right: 0, zIndex: 1500 }}
			>
				Portaled
			</button>,
			document.body,
		);
	}

	test.each([false, true])(
		"disablePortal=%s: focus may move into a popup the content portals to body",
		async (disablePortal) => {
			const modal = setup(
				{ disablePortal },
				<Surface>
					<button type="button" id="first">
						First
					</button>
					<PortaledButton />
				</Surface>,
			);
			await modal.open();
			byId("portaled").focus();
			await frames();
			expect(document.activeElement).toBe(byId("portaled"));
			await userEvent.click(byId("portaled"));
			await frames();
			expect(document.activeElement).toBe(byId("portaled"));
			// Focus on the page itself still comes back.
			byId("page-button").focus();
			expect(document.activeElement).not.toBe(byId("page-button"));
		},
	);
});

describe("exit transitions", () => {
	const exitMs = 120;

	// The reference's transition contract: Modal drives `in` and waits for onExited.
	const TestFade = Object.assign(
		(props: TransitionOptions & { readonly children: React.ReactNode }) => {
			const nodeRef = React.useRef<HTMLDivElement | null>(null);
			const status = useTransition(props, nodeRef, {
				enter: 60,
				exit: exitMs,
			});
			return (
				<div ref={nodeRef} id="transition" data-transition={status}>
					{props.children}
				</div>
			);
		},
		{ __glTransition: true },
	);

	function Harness({
		flags,
		onExited,
	}: {
		readonly flags: Flags;
		readonly onExited: () => void;
	}) {
		const [isOpen, setIsOpen] = React.useState(false);
		return (
			<>
				<button
					type="button"
					id="opener"
					onClick={() => {
						setIsOpen(true);
					}}
				>
					Open
				</button>
				<button
					type="button"
					id="close"
					onClick={() => {
						setIsOpen(false);
					}}
				>
					Close
				</button>
				<ModalLayer
					open={isOpen}
					onClose={() => {
						setIsOpen(false);
					}}
					{...flags}
				>
					<TestFade onExited={onExited}>
						<Surface />
					</TestFade>
				</ModalLayer>
			</>
		);
	}

	type Close = "controlled" | "backdrop" | "escape";

	async function close(how: Close) {
		switch (how) {
			case "controlled": {
				// A close from outside the layer, as a timer or another control would.
				act(() => {
					byId("close").click();
				});
				break;
			}

			case "backdrop": {
				const backdrop = document.querySelector<HTMLElement>(".gl-backdrop");
				await userEvent.click(backdrop!, { position: { x: 10, y: 10 } });
				break;
			}

			case "escape": {
				await userEvent.keyboard("{Escape}");
				break;
			}
		}
	}

	const cases = (["controlled", "backdrop", "escape"] as const).flatMap((how) =>
		[false, true].flatMap((disablePortal) =>
			[false, true].map((keepMounted) => ({
				how,
				disablePortal,
				keepMounted,
			})),
		),
	);

	test.each(cases)(
		"close=$how disablePortal=$disablePortal keepMounted=$keepMounted: the layer stays until the child has exited",
		async ({ how, disablePortal, keepMounted }) => {
			const onExited = vi.fn<() => void>();
			render(
				<Harness flags={{ disablePortal, keepMounted }} onExited={onExited} />,
			);
			await userEvent.click(byId("opener"));
			await expect
				.poll(() => byId("transition").dataset.transition)
				.toBe("entered");
			// Kept mounted, the closed child mounted at exited, which already reported onExited.
			const exitsBefore = onExited.mock.calls.length;
			expect(exitsBefore).toBe(keepMounted ? 1 : 0);

			await close(how);
			// Closing: the child runs its exit inside the layer, which is still there.
			expect(byId("transition").dataset.transition).toBe("exiting");
			expect(document.querySelector(".gl-modal")).not.toBeNull();
			expect(
				document
					.querySelector(".gl-modal")
					?.classList.contains("gl-modal-hidden"),
			).toBe(false);

			await expect.poll(() => onExited.mock.calls.length).toBe(exitsBefore + 1);
			await frames();
			if (keepMounted) {
				expect(byId("transition").dataset.transition).toBe("exited");
				expect(
					document
						.querySelector(".gl-modal")
						?.classList.contains("gl-modal-hidden"),
				).toBe(true);
			} else {
				expect(document.querySelector(".gl-modal")).toBeNull();
				expect(document.querySelector("#transition")).toBeNull();
			}

			expect(document.activeElement).toBe(byId("opener"));
		},
	);
});
