// Behaviour specs for Dialog, DialogTitle, DialogContent, DialogContentText and DialogActions,
// from design-system/components/Dialog/README.md and api.d.ts. Dialog sits on Modal and takes its
// flags, with deviations 7 and 8 (docs/deviations.md): while focus is kept in, the rest of the
// page is hidden from assistive tech, never made inert. Modal's own spec covers its flag matrix;
// these check that Dialog passes each flag on. They run at the default test viewport (414 by 896),
// where a dialog fills the width less its side margins: the width caps are measured in a wider
// in-place Stage, as the preview shows them. fullScreen="phone" is the layout gate's.
import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import {
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	type DialogProps,
	Modal,
	type ModalCloseReason,
} from "#ui";

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
	reason: ModalCloseReason;
};

const title = "Delete the RS50 bridge draft?";
const description =
	"The write-up and its two capture files go. The repository on GitHub stays as it is.";

/**
The preview's destructive confirm: the title asks, the text says what goes and what stays, and
the safe action comes before the danger one.
*/
function DraftConfirm({
	focusSafeAction = false,
}: {
	readonly focusSafeAction?: boolean;
}) {
	return (
		<>
			<DialogTitle>{title}</DialogTitle>
			<DialogContent>
				<DialogContentText>{description}</DialogContentText>
			</DialogContent>
			<DialogActions>
				<button type="button" data-autofocus={focusSafeAction ? "" : undefined}>
					Keep draft
				</button>
				<button type="button">Delete draft</button>
			</DialogActions>
		</>
	);
}

type PageProps = Omit<DialogProps, "open" | "onClose"> & {
	readonly calls?: CloseCall[];
	/**
	Whether onClose sets open to false: the parent decides.
	*/
	readonly closes?: boolean;
};

/**
A page holding the dialog's open state: the button that opens it, a button of its own at the top
(outside the centred surface), and the dialog.
*/
function Page({ calls, closes = true, children, ...props }: PageProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	return (
		<>
			<button
				type="button"
				onClick={() => {
					setIsOpen(true);
				}}
			>
				Delete draft…
			</button>
			<button type="button">Page button</button>
			<Dialog
				open={isOpen}
				onClose={(event, reason) => {
					calls?.push({ event, reason });
					if (closes) {
						setIsOpen(false);
					}
				}}
				{...props}
			>
				{children ?? <DraftConfirm />}
			</Dialog>
		</>
	);
}

/**
Clicks the page's opener and waits for the dialog. Returns the opener, which keeps focus.
*/
async function open(name = title) {
	const opener = screen.getByRole("button", { name: "Delete draft…" });
	await userEvent.click(opener);
	const dialog = await screen.findByRole("dialog", { name });
	return { opener, dialog };
}

async function expectClosed(role = "dialog") {
	await expect.poll(() => screen.queryByRole(role)).toBeNull();
}

/**
Hidden from assistive tech: under aria-hidden (deviation 7) or inert (the reference).
*/
function isHiddenFromAssistiveTech(element: Element) {
	return element.closest('[aria-hidden="true"], [inert]') !== null;
}

function expectReactEvent(event: React.SyntheticEvent | KeyboardEvent) {
	// A React event (or one shaped like it), not a native one.
	expect(event).not.toBeInstanceOf(Event);
	expect((event as React.SyntheticEvent).nativeEvent).toBeInstanceOf(
		MouseEvent,
	);
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

describe("open and onClose", () => {
	test("open shows the dialog; when it turns false the dialog goes and leaves the DOM", async () => {
		const view = render(
			<Dialog open={false}>
				<DraftConfirm />
			</Dialog>,
		);
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(screen.queryByText(title)).toBeNull();

		view.rerender(
			<Dialog open>
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		await expect.element(dialog).toBeVisible();

		view.rerender(
			<Dialog open={false}>
				<DraftConfirm />
			</Dialog>,
		);
		await expect.poll(() => dialog.isConnected).toBe(false);
	});

	test("Escape calls onClose with escapeKeyDown and the native KeyboardEvent", async () => {
		const calls: CloseCall[] = [];
		render(<Page calls={calls} />);
		const { dialog } = await open();
		await expect.element(dialog).toHaveFocus();

		await userEvent.keyboard("{Escape}");
		expect(calls.map((call) => call.reason)).toEqual(["escapeKeyDown"]);
		expect(calls[0]?.event).toBeInstanceOf(KeyboardEvent);
		expect((calls[0]?.event as KeyboardEvent).key).toBe("Escape");
		await expectClosed();
	});

	test("a press on the scrim calls onClose with backdropClick and the React event; a press on the surface doesn't", async () => {
		const calls: CloseCall[] = [];
		render(<Page calls={calls} />);
		const pageButton = screen.getByRole("button", { name: "Page button" });
		const { dialog } = await open();

		await userEvent.click(within(dialog).getByText(description));
		expect(calls).toEqual([]);

		// The page button sits above the centred surface, so a press there lands on the scrim.
		await userEvent.click(pageButton, { force: true });
		expect(calls.map((call) => call.reason)).toEqual(["backdropClick"]);
		expectReactEvent(calls[0].event);
		await expectClosed();
	});

	test("onClose only reports: the dialog stays open until the parent sets open to false", async () => {
		const calls: CloseCall[] = [];
		render(<Page calls={calls} closes={false} />);
		const pageButton = screen.getByRole("button", { name: "Page button" });
		const { dialog } = await open();
		await expect.element(dialog).toHaveFocus();

		await userEvent.keyboard("{Escape}");
		await userEvent.click(pageButton, { force: true });
		await userEvent.keyboard("{Escape}");
		// Still open each time, so each one reports again.
		expect(calls.map((call) => call.reason)).toEqual([
			"escapeKeyDown",
			"backdropClick",
			"escapeKeyDown",
		]);
		expect(dialog.isConnected).toBe(true);
		await expect.element(dialog).toBeVisible();
	});
});

describe("parts and ARIA", () => {
	test("the surface is a modal dialog named by DialogTitle, an h2, through aria-labelledby", async () => {
		render(
			<Dialog open>
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(dialog).toHaveAttribute("aria-modal", "true");
		const heading = within(dialog).getByRole("heading", {
			level: 2,
			name: title,
		});
		expect(heading.id).not.toBe("");
		expect(dialog).toHaveAttribute("aria-labelledby", heading.id);
	});

	test("DialogContentText describes the dialog through aria-describedby", async () => {
		render(
			<Dialog open>
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		const text = within(dialog).getByText(description);
		expect(text.id).not.toBe("");
		expect(dialog.getAttribute("aria-describedby")?.split(" ")).toContain(
			text.id,
		);
		await expect.element(dialog).toHaveAccessibleDescription(description);
	});

	test("the title's and the text's own ids are the ones the surface points at", async () => {
		render(
			<Dialog open>
				<DialogTitle id="draft-title">{title}</DialogTitle>
				<DialogContent>
					<DialogContentText id="draft-text">{description}</DialogContentText>
				</DialogContent>
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(dialog).toHaveAttribute("aria-labelledby", "draft-title");
		expect(dialog.getAttribute("aria-describedby")?.split(" ")).toContain(
			"draft-text",
		);
		await expect.element(dialog).toHaveAccessibleDescription(description);
	});

	test('role="alertdialog" makes the surface an alert dialog', async () => {
		render(
			<Dialog open role="alertdialog">
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("alertdialog", { name: title });
		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	test("className, style and the ref go to the modal layer; every other attribute goes to the surface", async () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Dialog
				ref={ref}
				open
				className="publish-layer"
				style={{ color: "rgb(1, 2, 3)" }}
				id="publish-dialog"
				title="Publishing"
			>
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(dialog.id).toBe("publish-dialog");
		expect(dialog).toHaveAttribute("title", "Publishing");
		expect(dialog).not.toHaveClass("publish-layer");

		const layer = ref.current;
		expect(layer).toBeInstanceOf(HTMLDivElement);
		expect(layer).not.toBe(dialog);
		expect(layer?.contains(dialog)).toBe(true);
		expect(layer).toHaveClass("publish-layer");
		expect(layer?.style.color).toBe("rgb(1, 2, 3)");
	});

	test("each part takes a ref and its attributes: the title's h2, the content's box, the text's paragraph and the actions' row", async () => {
		const titleRef = React.createRef<HTMLHeadingElement>();
		const contentRef = React.createRef<HTMLDivElement>();
		const textRef = React.createRef<HTMLParagraphElement>();
		const actionsRef = React.createRef<HTMLDivElement>();
		render(
			<Dialog open>
				<DialogTitle ref={titleRef} className="draft-title">
					{title}
				</DialogTitle>
				<DialogContent ref={contentRef} className="draft-content">
					<DialogContentText ref={textRef} className="draft-text">
						{description}
					</DialogContentText>
				</DialogContent>
				<DialogActions ref={actionsRef} className="draft-actions">
					<button type="button">Keep draft</button>
				</DialogActions>
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(titleRef.current).toBe(
			within(dialog).getByRole("heading", { level: 2 }),
		);
		expect(titleRef.current).toHaveClass("draft-title");
		expect(textRef.current).toBeInstanceOf(HTMLParagraphElement);
		expect(textRef.current).toBe(within(dialog).getByText(description));
		expect(textRef.current).toHaveClass("draft-text");
		expect(contentRef.current).toBeInstanceOf(HTMLDivElement);
		expect(contentRef.current?.contains(textRef.current)).toBe(true);
		expect(contentRef.current).toHaveClass("draft-content");
		expect(actionsRef.current).toBeInstanceOf(HTMLDivElement);
		expect(
			actionsRef.current?.contains(
				within(dialog).getByRole("button", { name: "Keep draft" }),
			),
		).toBe(true);
		expect(actionsRef.current).toHaveClass("draft-actions");
	});

	test("DialogContent's dividers draw hairlines above and below it", async () => {
		const contentRef = React.createRef<HTMLDivElement>();
		const draft = (hasDividers: boolean) => (
			<Dialog open>
				<DialogTitle>{title}</DialogTitle>
				<DialogContent ref={contentRef} dividers={hasDividers}>
					<DialogContentText>{description}</DialogContentText>
				</DialogContent>
			</Dialog>
		);
		const hairlines = () => {
			const style = getComputedStyle(contentRef.current!);
			return [
				style.borderTopStyle,
				style.borderTopWidth,
				style.borderBottomStyle,
				style.borderBottomWidth,
			];
		};

		const view = render(draft(false));
		await screen.findByRole("dialog", { name: title });
		expect(hairlines()).toEqual(["none", "0px", "none", "0px"]);
		view.rerender(draft(true));
		expect(hairlines()).toEqual(["solid", "1px", "solid", "1px"]);
	});

	test("PaperProps go to the surface, the element with the role", async () => {
		render(
			<Dialog
				open
				PaperProps={{ id: "draft-surface", className: "draft-surface" }}
			>
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(dialog.id).toBe("draft-surface");
		expect(dialog).toHaveClass("draft-surface");
	});
});

describe("focus and the keyboard", () => {
	test("focus moves to the surface when the dialog opens, so its name is read", async () => {
		render(<Page />);
		const { dialog } = await open();
		await expect.element(dialog).toHaveFocus();
	});

	test("data-autofocus picks the element that takes focus: the safe action in a destructive confirm", async () => {
		render(
			<Page>
				<DraftConfirm focusSafeAction />
			</Page>,
		);
		const { dialog } = await open();
		await expect
			.element(within(dialog).getByRole("button", { name: "Keep draft" }))
			.toHaveFocus();
	});

	test("Tab and Shift+Tab cycle through the dialog's controls", async () => {
		render(<Page />);
		const { dialog } = await open();
		await expect.element(dialog).toHaveFocus();
		const keep = within(dialog).getByRole("button", { name: "Keep draft" });
		const remove = within(dialog).getByRole("button", { name: "Delete draft" });

		expect(await tabTrail(3)).toEqual([keep, remove, keep]);
		expect(await tabTrail(3, true)).toEqual([remove, keep, remove]);
	});

	test("Escape closes it, and focus returns to the element that opened it", async () => {
		render(<Page />);
		const { opener, dialog } = await open();
		await expect.element(dialog).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.element(opener).toHaveFocus();
	});

	test("focus also returns to the opener after a press on the scrim closes it", async () => {
		render(<Page />);
		const pageButton = screen.getByRole("button", { name: "Page button" });
		const { opener } = await open();
		await userEvent.click(pageButton, { force: true });
		await expectClosed();
		await expect.element(opener).toHaveFocus();
	});

	test("while it's open the rest of the page is hidden from assistive tech, and exposed again once it closes", async () => {
		render(<Page />);
		const pageButton = screen.getByRole("button", { name: "Page button" });
		const { dialog } = await open();
		await expect.poll(() => isHiddenFromAssistiveTech(pageButton)).toBe(true);
		expect(isHiddenFromAssistiveTech(dialog)).toBe(false);

		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.poll(() => isHiddenFromAssistiveTech(pageButton)).toBe(false);
	});

	test("a confirmation opened from a dialog takes Escape first, and closing it returns focus to the first dialog", async () => {
		const calls: string[] = [];
		function Publish() {
			const [isOpen, setIsOpen] = React.useState(false);
			const [isConfirming, setIsConfirming] = React.useState(false);
			return (
				<>
					<button
						type="button"
						onClick={() => {
							setIsOpen(true);
						}}
					>
						Publish…
					</button>
					<Dialog
						open={isOpen}
						onClose={(_event, reason) => {
							calls.push(`publish ${reason}`);
							setIsOpen(false);
						}}
					>
						<DialogTitle>Publish to production</DialogTitle>
						<DialogActions>
							<button
								type="button"
								onClick={() => {
									setIsConfirming(true);
								}}
							>
								Publish
							</button>
						</DialogActions>
						<Dialog
							open={isConfirming}
							role="alertdialog"
							onClose={(_event, reason) => {
								calls.push(`confirm ${reason}`);
								setIsConfirming(false);
							}}
						>
							<DialogTitle>Publish v2.4 now?</DialogTitle>
							<DialogActions>
								<button type="button" data-autofocus="">
									Not yet
								</button>
								<button type="button">Publish now</button>
							</DialogActions>
						</Dialog>
					</Dialog>
				</>
			);
		}

		render(<Publish />);
		const opener = screen.getByRole("button", { name: "Publish…" });
		await userEvent.click(opener);
		const first = await screen.findByRole("dialog", {
			name: "Publish to production",
		});
		const publish = within(first).getByRole("button", { name: "Publish" });
		await userEvent.click(publish);
		const confirm = await screen.findByRole("alertdialog", {
			name: "Publish v2.4 now?",
		});
		await expect
			.element(within(confirm).getByRole("button", { name: "Not yet" }))
			.toHaveFocus();

		await userEvent.keyboard("{Escape}");
		expect(calls).toEqual(["confirm escapeKeyDown"]);
		await expectClosed("alertdialog");
		await expect.element(publish).toHaveFocus();
		await expect.element(first).toBeVisible();

		await userEvent.keyboard("{Escape}");
		expect(calls).toEqual(["confirm escapeKeyDown", "publish escapeKeyDown"]);
		await expectClosed();
		await expect.element(opener).toHaveFocus();
	});
});

const notes = Array.from(
	{ length: 60 },
	(_, index) =>
		`Release note ${index + 1}: the tabs crossfade instead of jumping.`,
);

/**
The preview's release notes, made long enough to overflow the 896px viewport.
*/
function ReleaseNotes(props: Omit<DialogProps, "open" | "children">) {
	return (
		<Dialog open {...props}>
			<DialogTitle>What changed in v2.4</DialogTitle>
			<DialogContent>
				<ul>
					{notes.map((note) => (
						<li key={note}>{note}</li>
					))}
				</ul>
			</DialogContent>
			<DialogActions>
				<button type="button">Done</button>
			</DialogActions>
		</Dialog>
	);
}

describe("DialogContent and scroll", () => {
	test("when the content scrolls and holds nothing focusable, Tab reaches it and the arrow keys scroll it", async () => {
		render(<ReleaseNotes />);
		const dialog = await screen.findByRole("dialog", {
			name: "What changed in v2.4",
		});
		await expect.element(dialog).toHaveFocus();
		const done = within(dialog).getByRole("button", { name: "Done" });

		await userEvent.tab();
		const content = document.activeElement as HTMLElement;
		// In the tab order by its own tabindex: some browsers make any scroller focusable, not all.
		expect(content.getAttribute("tabindex")).toBe("0");
		// The content itself: it holds the notes, but not the title or the actions.
		expect(content.contains(screen.getByText(notes[0]))).toBe(true);
		expect(content.contains(within(dialog).getByRole("heading"))).toBe(false);
		expect(content.contains(done)).toBe(false);
		expect(content.scrollTop).toBe(0);

		await userEvent.keyboard("{ArrowDown}");
		await expect.poll(() => content.scrollTop).toBeGreaterThan(0);

		await userEvent.tab();
		await expect.element(done).toHaveFocus();
	});

	test('scroll="paper" (the default): the content scrolls between a title and actions that stay in view', async () => {
		render(<ReleaseNotes />);
		const dialog = await screen.findByRole("dialog", {
			name: "What changed in v2.4",
		});
		const heading = within(dialog).getByRole("heading");
		const done = within(dialog).getByRole("button", { name: "Done" });
		const last = screen.getByText(notes.at(-1)!);
		await expect.element(heading).toBeInViewport({ ratio: 1 });
		await expect.element(done).toBeInViewport({ ratio: 1 });
		await expect.element(last).not.toBeInViewport();

		await userEvent.wheel(screen.getByText(notes[0]), { delta: { y: 5000 } });
		await expect.element(last).toBeInViewport({ ratio: 1 });
		await expect.element(heading).toBeInViewport({ ratio: 1 });
		await expect.element(done).toBeInViewport({ ratio: 1 });
	});

	test('scroll="body": the whole dialog scrolls in its layer', async () => {
		render(<ReleaseNotes scroll="body" />);
		const dialog = await screen.findByRole("dialog", {
			name: "What changed in v2.4",
		});
		const heading = within(dialog).getByRole("heading");
		const done = within(dialog).getByRole("button", { name: "Done" });
		// The surface grows with its content, past the bottom of the screen.
		expect(dialog.offsetHeight).toBeGreaterThan(window.innerHeight);
		await expect.element(heading).toBeInViewport({ ratio: 1 });
		await expect.element(done).not.toBeInViewport();

		await userEvent.wheel(heading, { delta: { y: 5000 } });
		await expect.element(done).toBeInViewport({ ratio: 1 });
		await expect.element(heading).not.toBeInViewport();
	});

	test("a form in DialogContent submits with Enter in a field and with a submit button in DialogActions", async () => {
		const submitted: unknown[] = [];
		render(
			<Dialog open fullWidth>
				<DialogTitle>Publish to production</DialogTitle>
				<DialogContent>
					<form
						id="publish-form"
						onSubmit={(event) => {
							event.preventDefault();
							submitted.push(new FormData(event.currentTarget).get("name"));
						}}
					>
						<DialogContentText>
							The build goes to the private S3 bucket.
						</DialogContentText>
						<label htmlFor="release-name">Release name</label>
						<input
							id="release-name"
							name="name"
							defaultValue="v2.4"
							data-autofocus=""
						/>
					</form>
				</DialogContent>
				<DialogActions>
					<button type="button">Cancel</button>
					<button type="submit" form="publish-form">
						Publish
					</button>
				</DialogActions>
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Publish to production",
		});
		// The text inside the form still describes the dialog.
		await expect
			.element(dialog)
			.toHaveAccessibleDescription("The build goes to the private S3 bucket.");
		const field = within(dialog).getByRole("textbox", { name: "Release name" });
		await expect.element(field).toHaveFocus();

		await userEvent.keyboard("{Enter}");
		expect(submitted).toEqual(["v2.4"]);
		await userEvent.click(
			within(dialog).getByRole("button", { name: "Publish" }),
		);
		expect(submitted).toEqual(["v2.4", "v2.4"]);
	});
});

/**
A box wider than the viewport that the in-place layer fills, as the preview's Stage does: its
transform makes it the containing block of the fixed layer.
*/
function Stage({ children }: { readonly children: React.ReactNode }) {
	return (
		<div
			style={{
				position: "relative",
				width: 1000,
				height: 640,
				transform: "translateZ(0)",
				overflow: "hidden",
			}}
		>
			{children}
		</div>
	);
}

function Rename(props: Omit<DialogProps, "open" | "children">) {
	return (
		<Dialog open disablePortal {...props}>
			<DialogTitle>Rename the draft?</DialogTitle>
			<DialogActions>
				<button type="button">Rename</button>
			</DialogActions>
		</Dialog>
	);
}

describe("size: maxWidth, fullWidth and fullScreen", () => {
	test.each([
		{ maxWidth: "xs", width: 444 },
		{ maxWidth: "sm", width: 600 },
		{ maxWidth: "md", width: 900 },
	] as const)(
		"maxWidth $maxWidth caps the surface at $width px",
		async ({ maxWidth, width }) => {
			render(
				<Stage>
					<Rename fullWidth maxWidth={maxWidth} />
				</Stage>,
			);
			const dialog = await screen.findByRole("dialog", {
				name: "Rename the draft?",
			});
			// The offsetWidth is the laid-out width, whatever scale the open transition is at.
			expect(dialog.offsetWidth).toBe(width);
		},
	);

	test("maxWidth is sm (600px) by default, and false sets no cap", async () => {
		const view = render(
			<Stage>
				<Rename fullWidth />
			</Stage>,
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Rename the draft?",
		});
		expect(dialog.offsetWidth).toBe(600);

		view.rerender(
			<Stage>
				<Rename fullWidth maxWidth={false} />
			</Stage>,
		);
		expect(
			screen.getByRole("dialog", { name: "Rename the draft?" }).offsetWidth,
		).toBeGreaterThan(900);
	});

	test("fullWidth takes the whole maxWidth; without it the surface fits its content", async () => {
		const view = render(
			<Stage>
				<Rename maxWidth="sm" />
			</Stage>,
		);
		const dialog = await screen.findByRole("dialog", {
			name: "Rename the draft?",
		});
		expect(dialog.offsetWidth).toBeLessThan(600);

		view.rerender(
			<Stage>
				<Rename fullWidth maxWidth="sm" />
			</Stage>,
		);
		expect(
			screen.getByRole("dialog", { name: "Rename the draft?" }).offsetWidth,
		).toBe(600);
	});

	test("on a screen narrower than maxWidth, fullWidth fills it less equal side margins", async () => {
		const view = render(<Rename disablePortal={false} />);
		await screen.findByRole("dialog", { name: "Rename the draft?" });
		const margins = async () => {
			const dialog = screen.getByRole("dialog", { name: "Rename the draft?" });
			// Wait for the open transition to finish scaling the surface.
			await expect
				.poll(() => Math.round(dialog.getBoundingClientRect().width))
				.toBe(dialog.offsetWidth);
			const rect = dialog.getBoundingClientRect();
			return {
				left: rect.left,
				right: document.documentElement.clientWidth - rect.right,
			};
		};

		const fitted = await margins();
		view.rerender(<Rename fullWidth disablePortal={false} />);
		const full = await margins();
		expect(full.left).toBeGreaterThan(0);
		expect(full.left).toBeLessThan(fitted.left);
		expect(Math.abs(full.left - full.right)).toBeLessThan(1);
	});

	test("fullScreen fills the viewport with square corners", async () => {
		const view = render(
			<Dialog open>
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(getComputedStyle(dialog).borderTopLeftRadius).not.toBe("0px");

		view.rerender(
			<Dialog open fullScreen>
				<DraftConfirm />
			</Dialog>,
		);
		const box = () => {
			const rect = screen.getByRole("dialog").getBoundingClientRect();
			return [rect.left, rect.top, rect.width, rect.height].map((value) =>
				Math.round(value),
			);
		};

		await expect
			.poll(box)
			.toEqual([
				0,
				0,
				document.documentElement.clientWidth,
				document.documentElement.clientHeight,
			]);
		const style = getComputedStyle(screen.getByRole("dialog"));
		expect([
			style.borderTopLeftRadius,
			style.borderTopRightRadius,
			style.borderBottomRightRadius,
			style.borderBottomLeftRadius,
		]).toEqual(["0px", "0px", "0px", "0px"]);
	});

	test('fullScreen="phone" fills a phone\'s viewport with square corners', async () => {
		render(
			<Dialog open fullScreen="phone">
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		await expect
			.poll(() => {
				const rect = dialog.getBoundingClientRect();
				return [rect.left, rect.top, rect.width, rect.height].map((value) =>
					Math.round(value),
				);
			})
			.toEqual([
				0,
				0,
				document.documentElement.clientWidth,
				document.documentElement.clientHeight,
			]);
		expect(getComputedStyle(dialog).borderTopLeftRadius).toBe("0px");
	});
});

describe('fullScreen="phone" above 700px', () => {
	beforeEach(async () => {
		await page.viewport(1280, 900);
	});

	afterEach(async () => {
		await page.viewport(414, 896);
	});

	test("the dialog keeps its rounded corners and its width cap", async () => {
		render(
			<Dialog open fullScreen="phone">
				<DraftConfirm />
			</Dialog>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(getComputedStyle(dialog).borderTopLeftRadius).not.toBe("0px");
		await expect
			.poll(() => Math.round(dialog.getBoundingClientRect().width))
			.toBeLessThanOrEqual(600);
	});
});

describe("Modal's flags, passed on", () => {
	test("by default the dialog portals into document.body, out of its parent", async () => {
		render(
			<section id="host">
				<Dialog open>
					<DraftConfirm />
				</Dialog>
			</section>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(document.querySelector("#host")?.contains(dialog)).toBe(false);
		expect(document.body.contains(dialog)).toBe(true);
	});

	test("disablePortal renders the dialog in place", async () => {
		render(
			<section id="host">
				<Dialog open disablePortal>
					<DraftConfirm />
				</Dialog>
			</section>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		expect(document.querySelector("#host")?.contains(dialog)).toBe(true);
	});

	test("container picks where the portal mounts: an element, or a function that returns one", async () => {
		const target = document.createElement("div");
		document.body.append(target);
		try {
			const isInTarget = () => {
				const dialog = screen.queryByRole("dialog", { name: title });
				return dialog !== null && target.contains(dialog);
			};

			const view = render(
				<Dialog open container={target}>
					<DraftConfirm />
				</Dialog>,
			);
			await expect.poll(isInTarget).toBe(true);
			view.unmount();

			render(
				<Dialog open container={() => target}>
					<DraftConfirm />
				</Dialog>,
			);
			await expect.poll(isInTarget).toBe(true);
		} finally {
			cleanup();
			target.remove();
		}
	});

	test("keepMounted keeps the closed dialog in the DOM, out of sight, with its state", async () => {
		render(
			<Page keepMounted>
				<DialogTitle>Rename the draft</DialogTitle>
				<DialogContent>
					<label>
						Draft name <input />
					</label>
				</DialogContent>
			</Page>,
		);
		await open("Rename the draft");
		const field = screen.getByRole("textbox", { name: "Draft name" });
		await userEvent.fill(field, "RS50 bridge, take two");
		await userEvent.keyboard("{Escape}");
		await expectClosed();

		expect(field.isConnected).toBe(true);
		await expect.element(field).not.toBeVisible();

		await open("Rename the draft");
		expect(screen.getByRole("textbox", { name: "Draft name" })).toBe(field);
		expect(field).toHaveValue("RS50 bridge, take two");
	});

	test("hideBackdrop: no scrim, and a press outside the surface still calls onClose with backdropClick", async () => {
		const calls: CloseCall[] = [];
		render(<Page hideBackdrop calls={calls} />);
		const pageButton = screen.getByRole("button", { name: "Page button" });
		await open();
		await userEvent.click(pageButton, { force: true });
		expect(calls.map((call) => call.reason)).toEqual(["backdropClick"]);
		await expectClosed();
	});

	test("disableEscapeKeyDown: Escape does nothing", async () => {
		const calls: CloseCall[] = [];
		render(<Page disableEscapeKeyDown calls={calls} />);
		const { dialog } = await open();
		await expect.element(dialog).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		expect(calls).toEqual([]);
		await expect.element(dialog).toBeVisible();
	});

	test("disableAutoFocus doesn't move focus into the dialog when it opens", async () => {
		render(<Page disableAutoFocus />);
		const { dialog } = await open();
		await frames();
		expect(dialog.contains(document.activeElement)).toBe(false);
	});

	referenceDefectTest(
		"disableEnforceFocus lets Tab leave the dialog for the page, which stays exposed to assistive tech",
		async () => {
			render(
				<>
					<button type="button">Before</button>
					<Dialog open disableEnforceFocus>
						<DraftConfirm />
					</Dialog>
					<button type="button">After</button>
				</>,
			);
			const before = screen.getByRole("button", {
				name: "Before",
				hidden: true,
			});
			const after = screen.getByRole("button", { name: "After", hidden: true });
			const dialog = await screen.findByRole("dialog", { name: title });
			await expect.element(dialog).toHaveFocus();

			const trail = await tabTrail(5);
			expect(
				trail.some((element) => element === before || element === after),
			).toBe(true);
			expect(isHiddenFromAssistiveTech(before)).toBe(false);
			expect(isHiddenFromAssistiveTech(after)).toBe(false);
		},
	);

	test("disableRestoreFocus doesn't send focus back to the opener", async () => {
		render(<Page disableRestoreFocus />);
		const { opener, dialog } = await open();
		await expect.element(dialog).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await expectClosed();
		await expect.poll(() => dialog.isConnected).toBe(false);
		expect(document.activeElement).not.toBe(opener);
	});

	test("by default the page under an open dialog doesn't scroll", async () => {
		render(
			<>
				<div style={{ height: 3000 }} />
				<Dialog open>
					<DraftConfirm />
				</Dialog>
			</>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		await userEvent.wheel(within(dialog).getByRole("heading"), {
			delta: { y: 600 },
		});
		await frames(8);
		expect(window.scrollY).toBe(0);
	});

	test("disableScrollLock leaves the page scrollable under the open dialog", async () => {
		render(
			<>
				<div style={{ height: 3000 }} />
				<Dialog open disableScrollLock>
					<DraftConfirm />
				</Dialog>
			</>,
		);
		const dialog = await screen.findByRole("dialog", { name: title });
		await userEvent.wheel(within(dialog).getByRole("heading"), {
			delta: { y: 600 },
		});
		await expect.poll(() => window.scrollY).toBeGreaterThan(0);
	});

	test("transitionDuration sets how long the dialog takes to leave", async () => {
		render(<Page transitionDuration={{ exit: 600 }} />);
		const { dialog } = await open();
		await expect.element(dialog).toHaveFocus();

		const closedAt = performance.now();
		await userEvent.keyboard("{Escape}");
		// Well before 600ms it's still on its way out...
		expect(dialog.isConnected).toBe(true);
		// ...and it's gone once the exit has run.
		await expect.poll(() => dialog.isConnected, { timeout: 3000 }).toBe(false);
		expect(performance.now() - closedAt).toBeGreaterThanOrEqual(500);
	});
});

describe("a Modal opened over the dialog", () => {
	test("with no backdrop of its own, a press outside both surfaces doesn't close the dialog: only the top layer reports presses", async () => {
		const reasons: string[] = [];
		function Over() {
			const [isOpen, setIsOpen] = React.useState(false);
			return (
				<Dialog
					open
					onClose={(_event, reason) => {
						reasons.push(reason);
					}}
				>
					<DialogTitle>{title}</DialogTitle>
					<DialogActions>
						<button
							type="button"
							onClick={() => {
								setIsOpen(true);
							}}
						>
							Rename
						</button>
					</DialogActions>
					<Modal hideBackdrop open={isOpen}>
						<div
							role="dialog"
							aria-label="Rename the draft"
							style={{
								position: "fixed",
								left: 150,
								top: 300,
								width: 120,
								height: 60,
							}}
						>
							A new name
						</div>
					</Modal>
				</Dialog>
			);
		}

		render(<Over />);
		await userEvent.click(
			await screen.findByRole("button", { name: "Rename" }),
		);
		await screen.findByRole("dialog", { name: "Rename the draft" });
		// Near the corner, outside both surfaces.
		await userEvent.click(document.documentElement, {
			force: true,
			position: { x: 5, y: 5 },
		});
		expect(reasons).toEqual([]);
	});
});
