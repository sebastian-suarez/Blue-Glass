/*
The popup layer that Popover and Menu share (popup-layer.tsx), for what their behaviour specs
don't reach: a layer stacked with Modal's, Menu's own modal layer, the whole-pixel offsets
against the reference's computePosition, and focus moving in within the opening task.
*/
import { Popover as BasePopover } from "@base-ui/react/popover";
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { computePosition } from "../../design-system/shared/position.js";
// The real overlay layout: .gl-modal and .gl-backdrop cover the viewport.
import "../styles/index.css";
import { Menu, MenuItem } from "../components/Menu/Menu.js";
import { Modal } from "../components/Modal/Modal.js";
import { Popover } from "../components/Popover/Popover.js";
import {
	type Placement,
	positionerVariables,
	toPositionerProps,
	toWholePixelOffsets,
} from "./anchor.js";

afterEach(() => {
	cleanup();
});

type OnClose = (event: unknown, reason: string) => void;

function isHidden(element: Element): boolean {
	return element.closest('[aria-hidden="true"], [inert]') !== null;
}

function isScrollLocked(): boolean {
	return getComputedStyle(document.body).overflowY === "hidden";
}

describe("stacked with a Modal", () => {
	/**
	A Modal holding a button that opens a Popover over it, as a share task inside a dialog would.
	*/
	function SharingDialog({
		onModalClose,
		onPopoverClose,
	}: {
		readonly onModalClose: OnClose;
		readonly onPopoverClose: OnClose;
	}) {
		const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
		const [isSharing, setIsSharing] = React.useState(false);
		return (
			<Modal open onClose={onModalClose}>
				<div role="dialog" aria-label="Project" style={{ padding: 40 }}>
					<button
						ref={setAnchor}
						type="button"
						onClick={() => {
							setIsSharing(true);
						}}
					>
						Share
					</button>
					<Popover
						open={isSharing}
						anchorEl={anchor}
						role="dialog"
						aria-label="Share this project"
						onClose={(event, reason) => {
							onPopoverClose(event, reason);
							setIsSharing(false);
						}}
					>
						<button type="button">Copy link</button>
					</Popover>
				</div>
			</Modal>
		);
	}

	test("only the Popover on top hears Escape and a press outside, and the Modal does once it's gone", async () => {
		const onModalClose = vi.fn<OnClose>();
		const onPopoverClose = vi.fn<OnClose>();
		render(
			<SharingDialog
				onModalClose={onModalClose}
				onPopoverClose={onPopoverClose}
			/>,
		);
		const share = await vi.waitFor(() =>
			screen.getByRole("button", { name: "Share" }),
		);
		// Focus moves into the popover (to its surface, with nothing marked data-autofocus).
		const isInPopover = () =>
			screen
				.queryByRole("dialog", { name: "Share this project" })
				?.contains(document.activeElement) ?? false;
		await userEvent.click(share);
		await expect.poll(isInPopover).toBe(true);
		await userEvent.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(onPopoverClose).toHaveBeenCalledWith(
				expect.anything(),
				"escapeKeyDown",
			);
		});
		expect(onModalClose).not.toHaveBeenCalled();
		// Focus is back on Share, in the Modal, which now takes Escape.
		await expect.element(share).toHaveFocus();
		await userEvent.click(share);
		await expect.poll(isInPopover).toBe(true);
		await userEvent.click(document.body, {
			force: true,
			position: { x: 4, y: 4 },
		});
		await vi.waitFor(() => {
			expect(onPopoverClose).toHaveBeenLastCalledWith(
				expect.anything(),
				"backdropClick",
			);
		});
		expect(onModalClose).not.toHaveBeenCalled();
		await expect.element(share).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await vi.waitFor(() => {
			expect(onModalClose).toHaveBeenCalledWith(
				expect.anything(),
				"escapeKeyDown",
			);
		});
		expect(onPopoverClose).toHaveBeenCalledTimes(2);
	});
});

describe("Menu's modal layer", () => {
	function ProjectPage({
		disableEnforceFocus,
	}: {
		readonly disableEnforceFocus?: boolean;
	}) {
		const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
		const [isOpen, setIsOpen] = React.useState(false);
		return (
			<>
				<p>VSebCode, a fork of VS Code.</p>
				<button
					ref={setAnchor}
					id="project-actions"
					type="button"
					onClick={() => {
						setIsOpen(true);
					}}
				>
					Project actions
				</button>
				<Menu
					open={isOpen}
					anchorEl={anchor}
					disableEnforceFocus={disableEnforceFocus}
					onClose={() => {
						setIsOpen(false);
					}}
				>
					<MenuItem>Copy link</MenuItem>
					<MenuItem>Share</MenuItem>
				</Menu>
			</>
		);
	}

	test("while it keeps focus in, the page is hidden from assistive tech and doesn't scroll; both come back when it closes", async () => {
		render(<ProjectPage />);
		const text = screen.getByText("VSebCode, a fork of VS Code.");
		await userEvent.click(
			screen.getByRole("button", { name: "Project actions" }),
		);
		await expect.poll(() => isHidden(text)).toBe(true);
		expect(isScrollLocked()).toBe(true);
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => isHidden(text)).toBe(false);
		await expect.poll(() => isScrollLocked()).toBe(false);
	});

	test("disableEnforceFocus leaves the page exposed", async () => {
		render(<ProjectPage disableEnforceFocus />);
		const text = screen.getByText("VSebCode, a fork of VS Code.");
		await userEvent.click(
			screen.getByRole("button", { name: "Project actions" }),
		);
		await vi.waitFor(() =>
			screen.getByRole("menu", { name: "Project actions" }),
		);
		expect(isHidden(text)).toBe(false);
	});

	test("focus is on the first item by the end of the opening press, so a key right after it moves on", async () => {
		render(<ProjectPage />);
		await userEvent.click(
			screen.getByRole("button", { name: "Project actions" }),
		);
		// No wait for the menu: the reference moves focus in an effect of the opening update.
		await userEvent.keyboard("{ArrowDown}");
		await expect
			.element(screen.getByRole("menuitem", { name: "Share" }))
			.toHaveFocus();
	});
});

describe("whole-pixel offsets", () => {
	type Case = {
		placement: Placement;
		// A fractional size, as text with a fractional line height gives.
		size: { width: number; height: number };
	};

	const anchorBox = { left: 400.25, top: 300.4, width: 120.6, height: 36.3 };

	function Anchored({
		anchor,
		placement,
		size,
	}: Case & { readonly anchor: HTMLElement }) {
		return (
			<BasePopover.Root open>
				<BasePopover.Portal>
					<BasePopover.Positioner
						data-positioner
						anchor={anchor}
						style={positionerVariables}
						{...toPositionerProps({ placement })}
						{...toWholePixelOffsets()}
					>
						<BasePopover.Popup
							initialFocus={false}
							style={{ boxSizing: "border-box", padding: 0, ...size }}
						/>
					</BasePopover.Positioner>
				</BasePopover.Portal>
			</BasePopover.Root>
		);
	}

	test.each<Case>([
		{ placement: "top-start", size: { width: 180, height: 64.4 } },
		{ placement: "top", size: { width: 180.7, height: 64.6 } },
		{ placement: "bottom-end", size: { width: 180.3, height: 64.6 } },
		{ placement: "left", size: { width: 150.6, height: 64.3 } },
		{ placement: "right-end", size: { width: 150.2, height: 64.7 } },
	])(
		"$placement lands where the reference's computePosition puts it, to the pixel",
		async ({ placement, size }) => {
			const anchor = document.createElement("button");
			Object.assign(anchor.style, {
				position: "fixed",
				margin: "0",
				left: `${anchorBox.left}px`,
				top: `${anchorBox.top}px`,
				width: `${anchorBox.width}px`,
				height: `${anchorBox.height}px`,
			});
			document.body.append(anchor);
			try {
				render(<Anchored anchor={anchor} placement={placement} size={size} />);
				const positioner = await vi.waitFor(() => {
					const element = document.querySelector<HTMLElement>(
						"[data-positioner]",
					);
					expect(element).not.toBeNull();
					return element!;
				});
				// The reference measures the popup in whole pixels.
				const expected = computePosition(
					anchor.getBoundingClientRect(),
					{ width: positioner.offsetWidth, height: positioner.offsetHeight },
					{ placement, offset: 8 },
				);
				await expect
					.poll(() => {
						const box = positioner.getBoundingClientRect();
						return { x: box.x, y: box.y };
					})
					.toEqual({ x: expected.x, y: expected.y });
			} finally {
				cleanup();
				anchor.remove();
			}
		},
	);
});
