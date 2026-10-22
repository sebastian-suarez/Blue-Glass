// Behaviour specs for Snackbar, from design-system/components/Snackbar/README.md and api.d.ts: the
// controlled API (open, onClose and its reasons), the live region, the pause-aware timer, the
// edges, and a hosted Alert. The timers are the README's: short durations are passed as props,
// and elapsed times are taken before the action that starts them, so they can only run long.
// The window goes to the background for real: focus moves out of the test's frame to the page
// that hosts it.
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	Alert,
	Button,
	Dialog,
	DialogActions,
	DialogTitle,
	Snackbar,
	type DialogProps,
	type SnackbarProps,
} from "#ui";

const message = "Published to S3. CloudFront picks it up in about a minute.";

/**
Parks the pointer at the left of the page, mid-height. A snackbar that appears under a resting
pointer is pointed at, which pauses its timer, as the README says.
*/
async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; left: 0; top: 300px; width: 40px; height: 40px";
	document.body.append(spot);
	try {
		await userEvent.hover(spot);
	} finally {
		spot.remove();
	}
}

beforeEach(async () => {
	await parkPointer();
});

afterEach(() => {
	cleanup();
});

type OnClose = NonNullable<SnackbarProps["onClose"]>;

type PublishedProps = Omit<SnackbarProps, "open"> & {
	readonly open?: boolean;
	readonly ref?: React.Ref<HTMLDivElement>;
};

/**
The Default example's snackbar, with a "Before" button ahead of it and "Elsewhere" to point at,
both clear of the bottom edge it sits on.
*/
function Published({ open = true, ...props }: PublishedProps) {
	return (
		<>
			<button type="button">Before</button>
			<p
				style={{ position: "fixed", left: 0, top: 240, margin: 0, padding: 8 }}
			>
				Elsewhere
			</p>
			<Snackbar open={open} message={message} {...props} />
		</>
	);
}

/**
The same, closed by its parent for every reason but clickaway, as the preview does.
*/
function Closing({ onClose, ...props }: Omit<PublishedProps, "open">) {
	const [open, setOpen] = React.useState(true);
	return (
		<Published
			{...props}
			open={open}
			onClose={(event, reason) => {
				onClose?.(event, reason);
				if (reason !== "clickaway") {
					setOpen(false);
				}
			}}
		/>
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function undo(onClick?: () => void) {
	return (
		<Button variant="text" size="sm" onClick={onClick}>
			Undo
		</Button>
	);
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

/**
Whether the element is in the document and drawn: a box, and neither display none nor
visibility hidden on it or an ancestor.
*/
function isShown(element: Element): boolean {
	const { width, height } = box(element);
	return (
		element.isConnected &&
		width > 0 &&
		height > 0 &&
		element.checkVisibility({ visibilityProperty: true })
	);
}

function shownWith(text: string): HTMLElement[] {
	return screen.queryAllByText(text).filter((element) => isShown(element));
}

async function expectShown(text = message, timeout = 1500): Promise<void> {
	await expect.poll(() => shownWith(text).length, { timeout }).toBe(1);
}

async function expectGone(text = message, timeout = 1500): Promise<void> {
	await expect.poll(() => shownWith(text).length, { timeout }).toBe(0);
}

/**
Whether an aria-hidden or inert ancestor hides the element from assistive tech.
*/
function isHiddenFromAssistiveTech(element: Element): boolean {
	return element.closest('[aria-hidden="true"], [inert]') !== null;
}

async function pause(ms: number): Promise<void> {
	await new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

type AnyEvent = React.SyntheticEvent | Event | null | undefined;

/**
The native event of a documented callback's event, which may be a React event or a native one.
*/
function nativeOf(event: AnyEvent): Event | undefined {
	return event instanceof Event ? event : (event?.nativeEvent ?? undefined);
}

async function calls(
	onClose: ReturnType<typeof vi.fn<OnClose>>,
	count: number,
	timeout = 1500,
) {
	await expect.poll(() => onClose.mock.calls.length, { timeout }).toBe(count);
}

/**
Sends the test's window to the background, as switching to another window does: focus moves to
a button on the page that hosts the test's frame. The function it returns brings it back.
*/
async function toBackground(): Promise<() => Promise<void>> {
	window.focus();
	await expect.poll(() => document.hasFocus()).toBe(true);
	const host = window.parent.document;
	const away = host.createElement("button");
	away.textContent = "Another window";
	host.body.append(away);
	away.focus();
	await expect.poll(() => document.hasFocus()).toBe(false);
	return async () => {
		window.focus();
		away.remove();
		await expect.poll(() => document.hasFocus()).toBe(true);
	};
}

describe("Snackbar: what it shows and how it's read", () => {
	test("an open snackbar shows its message in a polite status region", async () => {
		render(<Published />);
		const region = screen.getByRole("status");
		await expectShown();
		expect(region).toContainElement(shownWith(message)[0]);
		// A role="status" is polite by itself; an explicit aria-live must say the same.
		expect(region.getAttribute("aria-live") ?? "polite").toBe("polite");
	});

	test("the live region is in the document while closed, and the message arrives in it", async () => {
		const { rerender } = render(<Published open={false} />);
		const region = screen.getByRole("status");
		expect(shownWith(message)).toHaveLength(0);
		rerender(<Published />);
		await expectShown();
		expect(screen.getByRole("status")).toBe(region);
		expect(region).toContainElement(shownWith(message)[0]);
	});

	test("role alert makes it an alert instead", async () => {
		render(<Published role="alert" />);
		await expectShown();
		const shown = shownWith(message)[0];
		expect(screen.getByRole("alert")).toContainElement(shown);
		for (const region of screen.queryAllByRole("status")) {
			expect(region).not.toContainElement(shown);
		}
	});

	test("action follows the message as a working button; without closable there's no close button", async () => {
		const onUndo = vi.fn<() => void>();
		render(<Published action={undo(onUndo)} />);
		await expectShown();
		const action = button("Undo");
		const region = screen.getByRole("status");
		expect(region).toContainElement(action);
		expect(
			// eslint-disable-next-line no-bitwise -- compareDocumentPosition returns a bitmask
			shownWith(message)[0].compareDocumentPosition(action) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		await userEvent.click(action);
		expect(onUndo).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
	});

	test("closable adds a Close button that asks to close with closeButton and the click; the parent decides", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Published closable onClose={onClose} />);
		const close = within(screen.getByRole("status")).getByRole("button", {
			name: "Close",
		});
		await userEvent.click(close);
		await calls(onClose, 1);
		const [event, reason] = onClose.mock.calls[0];
		expect(reason).toBe("closeButton");
		expect(nativeOf(event)).toBeInstanceOf(MouseEvent);
		// The open prop is still true, so it stays.
		await pause(300);
		expect(shownWith(message)).toHaveLength(1);
	});

	test("closeText names the close button", () => {
		render(<Published closable closeText="Dismiss" />);
		expect(button("Dismiss")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
	});

	test("changing message while it's open shows the new one in the same region", async () => {
		const { rerender } = render(<Published />);
		const region = screen.getByRole("status");
		await expectShown();
		rerender(<Published message="Publishing to S3…" />);
		await expectShown("Publishing to S3…");
		expect(shownWith(message)).toHaveLength(0);
		expect(screen.getByRole("status")).toBe(region);
		expect(region).toContainElement(shownWith("Publishing to S3…")[0]);
	});

	test("children replace the surface: a hosted Alert is read once, in the snackbar's region, and message, action and closable are ignored", async () => {
		render(
			<Snackbar
				open
				closable
				message="Ignored message"
				action={<Button>Ignored action</Button>}
			>
				<Alert severity="error">Couldn't reach the bucket. Try again.</Alert>
			</Snackbar>,
		);
		const region = screen.getByRole("status");
		await expectShown("Couldn't reach the bucket. Try again.");
		expect(region).toContainElement(
			shownWith("Couldn't reach the bucket. Try again.")[0],
		);
		// The Alert drops its own role, so the message isn't announced twice.
		expect(screen.queryByRole("alert")).toBeNull();
		expect(screen.queryByText("Ignored message")).toBeNull();
		expect(screen.queryByRole("button", { name: "Ignored action" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
	});

	test("the ref, className and other attributes go to the root, the live region", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Published
				ref={ref}
				id="publish-status"
				className="my-snackbar"
				aria-label="Publishing"
			/>,
		);
		const region = screen.getByRole("status", { name: "Publishing" });
		expect(ref.current).toBe(region);
		expect(region.id).toBe("publish-status");
		expect(region).toHaveClass("my-snackbar");
	});
});

describe("Snackbar: where it renders", () => {
	test.each([
		{ name: "by default", origin: undefined, edge: "bottom" },
		{
			name: "bottom left",
			origin: { vertical: "bottom", horizontal: "left" },
			edge: "bottom",
		},
		{
			name: "top right",
			origin: { vertical: "top", horizontal: "right" },
			edge: "top",
		},
		{
			name: "top center",
			origin: { vertical: "top", horizontal: "center" },
			edge: "top",
		},
	] as const)(
		"anchorOrigin $name puts it at the $edge edge of the screen",
		async ({ origin, edge }) => {
			render(<Published anchorOrigin={origin} />);
			await expectShown();
			await vi.waitFor(() => {
				const shown = box(shownWith(message)[0]);
				if (edge === "bottom") {
					expect(shown.bottom).toBeLessThanOrEqual(window.innerHeight);
					expect(shown.bottom).toBeGreaterThanOrEqual(window.innerHeight - 80);
				} else {
					expect(shown.top).toBeGreaterThanOrEqual(0);
					expect(shown.top).toBeLessThanOrEqual(80);
				}
			});
		},
	);

	test("it renders in document.body by default, and in place with disablePortal", () => {
		const { container, rerender } = render(<Published />);
		expect(container.contains(screen.getByRole("status"))).toBe(false);
		expect(document.body.contains(screen.getByRole("status"))).toBe(true);
		rerender(<Published disablePortal />);
		expect(container.contains(screen.getByRole("status"))).toBe(true);
	});

	test.each(["an element", "a function returning one"] as const)(
		"container takes %s as the mount point",
		(kind) => {
			const host = document.createElement("div");
			document.body.append(host);
			try {
				render(
					<Published container={kind === "an element" ? host : () => host} />,
				);
				expect(host).toContainElement(screen.getByRole("status"));
			} finally {
				cleanup();
				host.remove();
			}
		},
	);

	test("by default it takes 220ms to leave", async () => {
		const { rerender } = render(<Published />);
		await expectShown();
		const closing = performance.now();
		rerender(<Published open={false} />);
		await expectGone(message, 2000);
		expect(performance.now() - closing).toBeGreaterThanOrEqual(180);
	});

	test.each([800, { exit: 800 }])(
		"transitionDuration %j sets how long it takes to leave",
		async (transitionDuration) => {
			const { rerender } = render(
				<Published transitionDuration={transitionDuration} />,
			);
			await expectShown();
			const closing = performance.now();
			rerender(
				<Published open={false} transitionDuration={transitionDuration} />,
			);
			await expectGone(message, 3000);
			expect(performance.now() - closing).toBeGreaterThanOrEqual(700);
		},
	);
});

describe("Snackbar: closing", () => {
	test("autoHideDuration asks to close after that long, with timeout", async () => {
		const onClose = vi.fn<OnClose>();
		const start = performance.now();
		render(<Closing autoHideDuration={500} onClose={onClose} />);
		await calls(onClose, 1, 2500);
		expect(performance.now() - start).toBeGreaterThanOrEqual(450);
		const [event, reason] = onClose.mock.calls[0];
		expect(reason).toBe("timeout");
		// The documented union: a React event, a native one, or null.
		expect(event === null || nativeOf(event) instanceof Event).toBe(true);
		await expectGone();
	});

	test.each([undefined, null])(
		"with autoHideDuration %j it stays open",
		async (autoHideDuration) => {
			const onClose = vi.fn<OnClose>();
			render(
				<Published autoHideDuration={autoHideDuration} onClose={onClose} />,
			);
			await pause(1000);
			expect(onClose).not.toHaveBeenCalled();
			expect(shownWith(message)).toHaveLength(1);
		},
	);

	test("pointing at it pauses the timer; when the pointer leaves it asks to close after resumeHideDuration", async () => {
		const onClose = vi.fn<OnClose>();
		render(
			<Published
				autoHideDuration={800}
				resumeHideDuration={300}
				onClose={onClose}
			/>,
		);
		await userEvent.hover(screen.getByText(message));
		await pause(1200);
		expect(onClose).not.toHaveBeenCalled();
		const left = performance.now();
		await userEvent.hover(screen.getByText("Elsewhere"));
		await calls(onClose, 1, 2000);
		expect(performance.now() - left).toBeGreaterThanOrEqual(250);
		expect(onClose.mock.calls[0]?.[1]).toBe("timeout");
	});

	test("by default the time left after a pause is half of autoHideDuration", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Published autoHideDuration={3000} onClose={onClose} />);
		await userEvent.hover(screen.getByText(message));
		const left = performance.now();
		await userEvent.hover(screen.getByText("Elsewhere"));
		await calls(onClose, 1, 4000);
		const elapsed = performance.now() - left;
		expect(elapsed).toBeGreaterThanOrEqual(1400);
		// Well short of the full 3000, with room for a slow, busy machine.
		expect(elapsed).toBeLessThan(2700);
	});

	test("the action and the close button are in the tab order, and focus inside pauses the timer", async () => {
		const onClose = vi.fn<OnClose>();
		render(
			<Published
				closable
				autoHideDuration={800}
				action={undo()}
				onClose={onClose}
			/>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(button("Undo")).toHaveFocus();
		await userEvent.tab();
		expect(button("Close")).toHaveFocus();
		await pause(1200);
		expect(onClose).not.toHaveBeenCalled();
		await userEvent.tab({ shift: true });
		await userEvent.tab({ shift: true });
		expect(button("Before")).toHaveFocus();
		await calls(onClose, 1, 2000);
		expect(onClose.mock.calls[0]?.[1]).toBe("timeout");
	});

	test("the timer waits while the window is in the background, and runs on when it's back", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Published autoHideDuration={800} onClose={onClose} />);
		const comeBack = await toBackground();
		try {
			await pause(1200);
			expect(onClose).not.toHaveBeenCalled();
		} finally {
			await comeBack();
		}

		await calls(onClose, 1, 2000);
		expect(onClose.mock.calls[0]?.[1]).toBe("timeout");
	});

	test("disableWindowBlurListener keeps the timer running in the background", async () => {
		const onClose = vi.fn<OnClose>();
		render(
			<Published
				disableWindowBlurListener
				autoHideDuration={500}
				onClose={onClose}
			/>,
		);
		const comeBack = await toBackground();
		try {
			await calls(onClose, 1, 2500);
			expect(onClose.mock.calls[0]?.[1]).toBe("timeout");
		} finally {
			await comeBack();
		}
	});

	test("Escape asks to close an open snackbar, with escapeKeyDown and the KeyboardEvent; the parent decides", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Published onClose={onClose} />);
		button("Before").focus();
		await userEvent.keyboard("{Escape}");
		await calls(onClose, 1);
		const [event, reason] = onClose.mock.calls[0];
		expect(reason).toBe("escapeKeyDown");
		const native = nativeOf(event);
		expect(native).toBeInstanceOf(KeyboardEvent);
		expect((native as KeyboardEvent).key).toBe("Escape");
		await pause(300);
		expect(shownWith(message)).toHaveLength(1);
	});

	test("Escape closes it when the parent closes on onClose", async () => {
		render(<Closing />);
		button("Before").focus();
		await userEvent.keyboard("{Escape}");
		await expectGone();
	});

	test("Escape does nothing while it's closed", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Published open={false} onClose={onClose} />);
		button("Before").focus();
		await userEvent.keyboard("{Escape}");
		await pause(200);
		expect(onClose).not.toHaveBeenCalled();
	});

	test("a press outside asks to close with clickaway and the press; a press inside doesn't", async () => {
		const onClose = vi.fn<OnClose>();
		render(<Published action={undo()} onClose={onClose} />);
		await userEvent.click(button("Undo"));
		await userEvent.click(screen.getByText(message));
		await pause(200);
		expect(onClose).not.toHaveBeenCalled();
		await userEvent.click(button("Before"));
		await calls(onClose, 1);
		const [event, reason] = onClose.mock.calls[0];
		expect(reason).toBe("clickaway");
		const native = nativeOf(event);
		expect(native instanceof MouseEvent || native instanceof TouchEvent).toBe(
			true,
		);
		// The open prop is still true, so it stays.
		expect(shownWith(message)).toHaveLength(1);
	});
});

describe("Snackbar: with a dialog open", () => {
	afterEach(async () => {
		cleanup();
		// The dialog's scroll lock and hidden page are gone with it.
		await vi.waitFor(() => {
			expect(document.body.style.overflow).toBe("");
			expect(
				document.querySelector("[inert], body > [aria-hidden='true']"),
			).toBeNull();
		});
	});

	test("Escape with focus in an open dialog closes the dialog only; the next Escape closes the snackbar", async () => {
		const onSnackbarClose = vi.fn<OnClose>();
		const onDialogClose = vi.fn<NonNullable<DialogProps["onClose"]>>();
		function Page() {
			const [isOpen, setIsOpen] = React.useState(false);
			return (
				<>
					<Button
						onClick={() => {
							setIsOpen(true);
						}}
					>
						Delete draft
					</Button>
					<Dialog
						open={isOpen}
						onClose={(event, reason) => {
							onDialogClose(event, reason);
							setIsOpen(false);
						}}
					>
						<DialogTitle>Delete the draft?</DialogTitle>
						<DialogActions>
							<Button>Keep draft</Button>
						</DialogActions>
					</Dialog>
					<Snackbar open message="Draft saved." onClose={onSnackbarClose} />
				</>
			);
		}

		render(<Page />);
		// Opened from the keyboard, so no press reaches the snackbar's click-away.
		button("Delete draft").focus();
		await userEvent.keyboard("{Enter}");
		const dialog = await screen.findByRole("dialog", {
			name: "Delete the draft?",
		});
		await expect.poll(() => dialog.contains(document.activeElement)).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => onDialogClose.mock.calls.length).toBe(1);
		expect(onDialogClose.mock.calls[0]?.[1]).toBe("escapeKeyDown");
		expect(onSnackbarClose).not.toHaveBeenCalled();
		await expect.element(button("Delete draft")).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await calls(onSnackbarClose, 1);
		expect(onSnackbarClose.mock.calls[0]?.[1]).toBe("escapeKeyDown");
	});

	test('a role="alert" snackbar stays exposed while a dialog is open too', async () => {
		render(
			<>
				<Dialog open>
					<DialogTitle>Delete the draft?</DialogTitle>
					<DialogActions>
						<Button>Keep draft</Button>
					</DialogActions>
				</Dialog>
				<Snackbar open role="alert" message="The draft didn't save." />
			</>,
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Delete the draft?",
		});
		await expect.poll(() => dialog.contains(document.activeElement)).toBe(true);
		const region = screen.getByRole("alert");
		expect(isHiddenFromAssistiveTech(region)).toBe(false);
		expect(region).toContainElement(
			within(region).getByText("The draft didn't save."),
		);
	});

	test("while a dialog is open, the snackbar stays exposed and its action still works", async () => {
		const onUndo = vi.fn<() => void>();
		render(
			<>
				<Dialog open>
					<DialogTitle>Delete the draft?</DialogTitle>
					<DialogActions>
						<Button>Keep draft</Button>
					</DialogActions>
				</Dialog>
				<Snackbar open message="Draft deleted." action={undo(onUndo)} />
			</>,
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Delete the draft?",
		});
		await expect.poll(() => dialog.contains(document.activeElement)).toBe(true);
		const region = screen.getByRole("status");
		expect(isHiddenFromAssistiveTech(region)).toBe(false);
		expect(region).toContainElement(within(region).getByText("Draft deleted."));
		await userEvent.click(within(region).getByRole("button", { name: "Undo" }));
		expect(onUndo).toHaveBeenCalledTimes(1);
	});
});
