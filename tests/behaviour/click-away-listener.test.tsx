// Behaviour specs for ClickAwayListener, from design-system/components/ClickAwayListener/README.md
// and api.d.ts: a press outside its one child calls onClickAway with the DOM event that counts.
// Vitest's userEvent has no touch, so the touch specs dispatch TouchEvents on the page.
import { act, cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { createPortal } from "react-dom";
import { afterEach, describe, expect, type Mock, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import { ClickAwayListener, type ClickAwayListenerProps } from "#ui";

afterEach(() => {
	cleanup();
});

type OnClickAway = ClickAwayListenerProps["onClickAway"];

/**
A button outside, and the listener around a panel with a button and some text inside.
*/
function Panel(props: Omit<ClickAwayListenerProps, "children">) {
	return (
		<>
			<button type="button">Outside</button>
			<ClickAwayListener {...props}>
				<div role="group" aria-label="Panel" style={{ padding: 16 }}>
					<span>Press outside to close.</span>
					<button type="button">Inside</button>
				</div>
			</ClickAwayListener>
		</>
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

/**
A touch on the page, as a finger's touchstart or touchend reaches it.
*/
function touch(target: Element, type: "touchstart" | "touchend"): void {
	act(() => {
		target.dispatchEvent(
			new TouchEvent(type, { bubbles: true, cancelable: true, composed: true }),
		);
	});
}

/**
The event onClickAway got on its only call.
*/
function onlyEvent(onClickAway: Mock<OnClickAway>) {
	expect(onClickAway).toHaveBeenCalledTimes(1);
	const [event] = onClickAway.mock.calls[0] ?? [];
	if (event === undefined) {
		throw new Error("onClickAway got no event");
	}

	return event;
}

describe("the mouse", () => {
	test("a press outside the child calls onClickAway with the pointerdown, the default mouseEvent", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		render(<Panel onClickAway={onClickAway} />);
		await userEvent.click(button("Outside"));
		const event = onlyEvent(onClickAway);
		expect(event).toBeInstanceOf(PointerEvent);
		expect(event.type).toBe("pointerdown");
	});

	test("presses on the child or anything inside it don't call onClickAway", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		render(<Panel onClickAway={onClickAway} />);
		await userEvent.click(screen.getByRole("group", { name: "Panel" }));
		await userEvent.click(button("Inside"));
		await userEvent.click(screen.getByText("Press outside to close."));
		expect(onClickAway).not.toHaveBeenCalled();
		// It was listening all along: a press outside still counts.
		await userEvent.click(button("Outside"));
		expect(onClickAway).toHaveBeenCalledTimes(1);
	});

	test.each([
		["onClick", "click"],
		["onPointerDown", "pointerdown"],
		["onPointerUp", "pointerup"],
		["onMouseDown", "mousedown"],
		["onMouseUp", "mouseup"],
	] as const)(
		"mouseEvent %s counts the %s of a press outside, once",
		async (mouseEvent, type) => {
			const onClickAway = vi.fn<OnClickAway>();
			render(<Panel mouseEvent={mouseEvent} onClickAway={onClickAway} />);
			await userEvent.click(button("Outside"));
			const event = onlyEvent(onClickAway);
			expect(event).toBeInstanceOf(MouseEvent);
			expect(event.type).toBe(type);
		},
	);

	test.each([
		["onPointerDown", ["away", "click"]],
		["onClick", ["click", "away"]],
	] as const)(
		"mouseEvent %s: onPointerDown answers on press, before the click lands; onClick waits for the release",
		async (mouseEvent, order) => {
			const seen: string[] = [];
			render(
				<>
					<button
						type="button"
						onClick={() => {
							seen.push("click");
						}}
					>
						Outside
					</button>
					<ClickAwayListener
						mouseEvent={mouseEvent}
						onClickAway={() => {
							seen.push("away");
						}}
					>
						<div role="group" aria-label="Panel">
							Panel
						</div>
					</ClickAwayListener>
				</>,
			);
			await userEvent.click(button("Outside"));
			expect(seen).toEqual(order);
		},
	);

	test("mouseEvent={false} ignores the mouse", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		render(<Panel mouseEvent={false} onClickAway={onClickAway} />);
		await userEvent.click(button("Outside"));
		expect(onClickAway).not.toHaveBeenCalled();
		// Touch still counts, so the listener is there.
		touch(button("Outside"), "touchend");
		expect(onClickAway).toHaveBeenCalledTimes(1);
	});
});

describe("touch", () => {
	test("touchEvent onTouchEnd, the default, counts a touch that ends outside, not one that starts there or lands inside", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		render(<Panel mouseEvent={false} onClickAway={onClickAway} />);
		// Listening starts a tick after mounting; a real press lets it pass, and shows the mouse is
		// ignored.
		await userEvent.click(button("Outside"));
		touch(button("Outside"), "touchstart");
		touch(button("Inside"), "touchend");
		expect(onClickAway).not.toHaveBeenCalled();
		touch(button("Outside"), "touchend");
		const event = onlyEvent(onClickAway);
		expect(event).toBeInstanceOf(TouchEvent);
		expect(event.type).toBe("touchend");
	});

	test("touchEvent onTouchStart counts a touch that starts outside, not one that ends there", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		render(
			<Panel
				mouseEvent={false}
				touchEvent="onTouchStart"
				onClickAway={onClickAway}
			/>,
		);
		await userEvent.click(button("Outside"));
		touch(button("Outside"), "touchend");
		touch(button("Inside"), "touchstart");
		expect(onClickAway).not.toHaveBeenCalled();
		touch(button("Outside"), "touchstart");
		const event = onlyEvent(onClickAway);
		expect(event).toBeInstanceOf(TouchEvent);
		expect(event.type).toBe("touchstart");
	});

	test("touchEvent={false} ignores touch", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		render(<Panel touchEvent={false} onClickAway={onClickAway} />);
		// The mouse still counts, so the listener is there.
		await userEvent.click(button("Outside"));
		expect(onClickAway).toHaveBeenCalledTimes(1);
		touch(button("Outside"), "touchstart");
		touch(button("Outside"), "touchend");
		expect(onClickAway).toHaveBeenCalledTimes(1);
	});
});

describe("the notes", () => {
	test("the press that mounts the listener never calls onClickAway: listening starts a tick later", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		function Reveal() {
			const [isShown, setIsShown] = React.useState(false);
			return (
				<>
					<button
						type="button"
						onClick={() => {
							setIsShown(true);
						}}
					>
						Show the panel
					</button>
					{isShown ? (
						// With onClick, the very click that mounts it would reach it without the tick.
						<ClickAwayListener mouseEvent="onClick" onClickAway={onClickAway}>
							<div role="group" aria-label="Panel">
								Panel
							</div>
						</ClickAwayListener>
					) : null}
				</>
			);
		}

		render(<Reveal />);
		await userEvent.click(button("Show the panel"));
		expect(screen.getByRole("group", { name: "Panel" })).toBeInTheDocument();
		expect(onClickAway).not.toHaveBeenCalled();
		// The next press outside counts.
		await userEvent.click(button("Show the panel"));
		expect(onClickAway).toHaveBeenCalledTimes(1);
	});

	test("a press inside a portal the child renders is outside it, as far as the DOM is concerned", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		render(
			<ClickAwayListener onClickAway={onClickAway}>
				<div role="group" aria-label="Panel">
					Panel
					{createPortal(
						<button type="button">In a portal</button>,
						document.body,
					)}
				</div>
			</ClickAwayListener>,
		);
		await userEvent.click(button("In a portal"));
		expect(onClickAway).toHaveBeenCalledTimes(1);
	});

	test("a component that takes a ref works as the child, and keeps its own ref", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		const ref = React.createRef<HTMLDivElement>();
		function Card({
			children,
			ref: cardRef,
		}: {
			readonly children: React.ReactNode;
			readonly ref?: React.Ref<HTMLDivElement>;
		}) {
			return (
				<div ref={cardRef} role="group" aria-label="Card">
					{children}
				</div>
			);
		}

		render(
			<>
				<button type="button">Outside</button>
				<ClickAwayListener onClickAway={onClickAway}>
					<Card ref={ref}>
						<button type="button">Inside</button>
					</Card>
				</ClickAwayListener>
			</>,
		);
		expect(ref.current).toBe(screen.getByRole("group", { name: "Card" }));
		await userEvent.click(button("Inside"));
		expect(onClickAway).not.toHaveBeenCalled();
		await userEvent.click(button("Outside"));
		expect(onClickAway).toHaveBeenCalledTimes(1);
	});

	test("once it unmounts, presses outside call nothing", async () => {
		const onClickAway = vi.fn<OnClickAway>();
		function Toggle({ isListening }: { readonly isListening: boolean }) {
			const panel = (
				<div role="group" aria-label="Panel">
					Panel
				</div>
			);
			return (
				<>
					<button type="button">Outside</button>
					{isListening ? (
						<ClickAwayListener onClickAway={onClickAway}>
							{panel}
						</ClickAwayListener>
					) : (
						panel
					)}
				</>
			);
		}

		const view = render(<Toggle isListening />);
		await userEvent.click(button("Outside"));
		expect(onClickAway).toHaveBeenCalledTimes(1);
		view.rerender(<Toggle isListening={false} />);
		await userEvent.click(button("Outside"));
		expect(onClickAway).toHaveBeenCalledTimes(1);
	});
});
