import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import { TextareaAutosize, type TextareaAutosizeProps } from "#ui";

afterEach(() => {
	cleanup();
});

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

// One row is one 20px line; no padding or border, so the height counts rows alone.
const line = 20;
const bare: React.CSSProperties = {
	width: 240,
	padding: 0,
	border: 0,
	font: `16px/${line}px monospace`,
};

function textbox(name: string): HTMLTextAreaElement {
	const element = screen.getByRole("textbox", { name });
	expect(element).toBeInstanceOf(HTMLTextAreaElement);
	return element as HTMLTextAreaElement;
}

function height(element: Element): number {
	return element.getBoundingClientRect().height;
}

/**
Waits until the element is that many rows tall, plus its padding and border, give or take a
pixel. A failure shows the height it had.
*/
async function expectRows(
	element: Element,
	rows: number,
	frame = 0,
): Promise<void> {
	const rowsHeight = rows * line;
	const expected = rowsHeight + frame;
	await expect
		.poll(() => {
			const measured = height(element);
			return Math.abs(measured - expected) <= 1 ? expected : measured;
		})
		.toBe(expected);
}

function lines(count: number): string {
	return Array.from({ length: count }, (_, index) => `line ${index + 1}`).join(
		"\n",
	);
}

/**
Types at the end of the text: focus alone leaves the caret at the start.
*/
async function typeAtEnd(element: HTMLTextAreaElement, text: string) {
	element.focus();
	element.setSelectionRange(element.value.length, element.value.length);
	await userEvent.keyboard(text);
}

/**
Whether the textarea's content scrolls: there is more of it than shows, and it moves when
scrolled.
*/
function canScroll(element: HTMLTextAreaElement): boolean {
	if (element.scrollHeight <= element.clientHeight + 1) {
		return false;
	}

	const before = element.scrollTop;
	element.scrollTop = element.scrollHeight;
	const hasMoved = element.scrollTop > before;
	element.scrollTop = before;
	return hasMoved && getComputedStyle(element).overflowY !== "hidden";
}

describe("TextareaAutosize", () => {
	test("renders a plain textarea holding the ref, className, style and any textarea attribute", () => {
		const ref = React.createRef<HTMLTextAreaElement>();
		render(
			<>
				<label htmlFor="message">Message</label>
				<TextareaAutosize
					ref={ref}
					id="message"
					className="custom"
					placeholder="Type a few lines…"
					maxLength={500}
					style={{ ...bare, color: "rgb(1, 2, 3)" }}
				/>
			</>,
		);
		const message = textbox("Message");
		expect(ref.current).toBe(message);
		expect(screen.getByLabelText("Message")).toBe(message);
		expect(message).toHaveClass("custom");
		expect(message).toHaveAttribute("placeholder", "Type a few lines…");
		expect(message).toHaveAttribute("maxlength", "500");
		expect(getComputedStyle(message).color).toBe("rgb(1, 2, 3)");
	});

	test("minRows sets the height floor, 1 row by default", async () => {
		render(
			<>
				<TextareaAutosize aria-label="Default" style={bare} />
				<TextareaAutosize aria-label="Three" minRows={3} style={bare} />
			</>,
		);
		await expectRows(textbox("Default"), 1);
		await expectRows(textbox("Three"), 3);
	});

	test("it grows a row for each line typed, and shrinks back to minRows when cleared", async () => {
		render(<TextareaAutosize aria-label="Notes" minRows={2} style={bare} />);
		const notes = textbox("Notes");
		await expectRows(notes, 2);
		await typeAtEnd(notes, "one{Enter}two");
		await expectRows(notes, 2);
		await typeAtEnd(notes, "{Enter}three");
		await expectRows(notes, 3);
		await typeAtEnd(notes, "{Enter}four");
		await expectRows(notes, 4);
		await userEvent.clear(notes);
		await expectRows(notes, 2);
	});

	test("maxRows caps the height, and past it the textarea scrolls", async () => {
		render(
			<TextareaAutosize
				aria-label="Capped"
				minRows={2}
				maxRows={4}
				style={bare}
			/>,
		);
		const capped = textbox("Capped");
		await typeAtEnd(capped, "one{Enter}two{Enter}three");
		await expectRows(capped, 3);
		expect(canScroll(capped)).toBe(false);
		await typeAtEnd(capped, "{Enter}four{Enter}five{Enter}six");
		await expectRows(capped, 4);
		expect(canScroll(capped)).toBe(true);
	});

	test("uncontrolled: defaultValue sets the first height, and typing grows it", async () => {
		render(
			<TextareaAutosize
				aria-label="Message"
				minRows={1}
				defaultValue={lines(3)}
				style={bare}
			/>,
		);
		const message = textbox("Message");
		await expectRows(message, 3);
		expect(message).toHaveValue(lines(3));
		await typeAtEnd(message, "{Enter}line 4");
		await expectRows(message, 4);
		expect(message).toHaveValue(lines(4));
	});

	test("a defaultValue past maxRows starts capped and scrolling", async () => {
		render(
			<TextareaAutosize
				aria-label="Capped"
				minRows={2}
				maxRows={4}
				defaultValue={lines(5)}
				style={bare}
			/>,
		);
		const capped = textbox("Capped");
		await expectRows(capped, 4);
		expect(canScroll(capped)).toBe(true);
	});

	test("controlled: the height follows value as it changes", async () => {
		const view = (value: string) => (
			<TextareaAutosize
				aria-label="Summary"
				value={value}
				minRows={1}
				maxRows={6}
				style={bare}
				onChange={() => undefined}
			/>
		);
		const { rerender } = render(view(lines(1)));
		const summary = textbox("Summary");
		await expectRows(summary, 1);
		rerender(view(lines(4)));
		await expectRows(summary, 4);
		rerender(view(lines(2)));
		await expectRows(summary, 2);
		rerender(view(lines(9)));
		await expectRows(summary, 6);
		expect(canScroll(summary)).toBe(true);
	});

	test("controlled: typing goes through onChange, and the textarea grows as value follows", async () => {
		const changes: Array<{ type: string; target: EventTarget; value: string }> =
			[];
		function Controlled(props: TextareaAutosizeProps) {
			const [value, setValue] = React.useState("");
			return (
				<TextareaAutosize
					{...props}
					value={value}
					onChange={(event) => {
						changes.push({
							type: event.type,
							target: event.target,
							value: event.target.value,
						});
						setValue(event.target.value);
					}}
				/>
			);
		}

		render(<Controlled aria-label="Reply" minRows={1} style={bare} />);
		const reply = textbox("Reply");
		await typeAtEnd(reply, "a{Enter}b");
		await expectRows(reply, 2);
		expect(reply).toHaveValue("a\nb");
		expect(changes.map((change) => change.value)).toEqual(["a", "a\n", "a\nb"]);
		for (const change of changes) {
			expect(change.type).toBe("change");
			expect(change.target).toBe(reply);
		}
	});

	test("a controlled value that onChange doesn't take keeps the text and the height", async () => {
		render(
			<TextareaAutosize
				aria-label="Locked"
				value="fixed"
				minRows={1}
				style={bare}
				onChange={() => undefined}
			/>,
		);
		const locked = textbox("Locked");
		await typeAtEnd(locked, "{Enter}{Enter}");
		expect(locked).toHaveValue("fixed");
		await expectRows(locked, 1);
	});

	test("padding and a border add to the height around the rows of text", async () => {
		render(
			<TextareaAutosize
				aria-label="Padded"
				minRows={2}
				maxRows={4}
				style={{ ...bare, padding: "10px 14px", border: "1px solid" }}
			/>,
		);
		const padded = textbox("Padded");
		const paddings = 10 * 2;
		const borders = 1 * 2;
		const frame = paddings + borders;
		await expectRows(padded, 2, frame);
		await typeAtEnd(padded, "one{Enter}two{Enter}three");
		await expectRows(padded, 3, frame);
		await typeAtEnd(padded, "{Enter}four{Enter}five");
		await expectRows(padded, 4, frame);
		expect(canScroll(padded)).toBe(true);
	});

	test("it rewraps when its width changes: narrower, a long line takes more rows", async () => {
		const box = React.createRef<HTMLDivElement>();
		render(
			<div ref={box} style={{ width: 480 }}>
				<TextareaAutosize
					aria-label="Wrapped"
					defaultValue={"word ".repeat(16).trim()}
					style={{ ...bare, width: "100%" }}
				/>
			</div>,
		);
		const wrapped = textbox("Wrapped");
		await expectRows(wrapped, 2);
		must(box.current).style.width = "160px";
		await expect.poll(() => height(wrapped)).toBeGreaterThan(3 * line);
		expect(wrapped.scrollHeight).toBeLessThanOrEqual(wrapped.clientHeight + 1);
	});
});
