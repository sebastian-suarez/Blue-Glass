import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { Avatar, Chip, Icon, type ChipTone } from "#ui";

afterEach(() => {
	cleanup();
	// Link chips follow hash hrefs; clear the hash so no test sees another's.
	window.history.replaceState(
		null,
		"",
		window.location.pathname + window.location.search,
	);
});

/**
Disabled natively, or through aria-disabled, which keeps the element focusable.
*/
function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function size(element: Element): [number, number] {
	const box = element.getBoundingClientRect();
	return [Math.round(box.width), Math.round(box.height)];
}

/**
Records the type of every event onDelete gets.
*/
function deleteRecorder() {
	const types: string[] = [];
	const onDelete = vi.fn((event: React.SyntheticEvent) => {
		types.push(event.type);
	});
	return { types, onDelete };
}

function focusBefore() {
	button("Before").focus();
}

/**
The first text node inside the element that holds the text, wherever the port wraps it.
*/
function textNode(element: Element, text: string): Node {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	let node = walker.nextNode();
	while (node) {
		if (node.textContent?.includes(text)) {
			return node;
		}

		node = walker.nextNode();
	}

	throw new Error(`No text "${text}" in the element`);
}

describe("a static chip", () => {
	test("is a span holding its label, and the ref is that element", () => {
		const ref = React.createRef<HTMLElement>();
		render(<Chip ref={ref} label="Rust" className="custom" />);
		expect(ref.current).toBeInstanceOf(HTMLSpanElement);
		expect(ref.current).toHaveTextContent("Rust");
		expect(ref.current).toHaveClass("custom");
		expect(screen.queryByRole("button")).toBeNull();
		expect(screen.queryByRole("link")).toBeNull();
	});

	test('component sets the element, e.g. "li" for chips in a list', () => {
		const ref = React.createRef<HTMLElement>();
		render(
			<ul aria-label="Stack">
				<Chip ref={ref} component="li" label="Rust" />
				<Chip component="li" label="Wine" />
			</ul>,
		);
		const items = within(
			screen.getByRole("list", { name: "Stack" }),
		).getAllByRole("listitem");
		expect(items.map((item) => item.textContent)).toEqual(["Rust", "Wine"]);
		expect(ref.current).toBe(items[0]);
	});

	test("variant, size and tone put their classes on the root", () => {
		const fallback = React.createRef<HTMLElement>();
		const plate = React.createRef<HTMLElement>();
		const small = React.createRef<HTMLElement>();
		render(
			<>
				<Chip ref={fallback} label="Default" />
				<Chip ref={plate} variant="plate" label="Limber Health" />
				<Chip ref={small} size="sm" label="PostgreSQL" />
			</>,
		);
		expect(plate.current).toHaveClass("gl-chip-plate");
		expect(small.current).toHaveClass("gl-chip-sm");
		expect(fallback.current).not.toHaveClass("gl-chip-plate");
		expect(fallback.current).not.toHaveClass("gl-chip-sm");
		cleanup();

		const tones = [
			"accent",
			"danger",
			"warning",
			"success",
			"info",
		] as const satisfies readonly ChipTone[];
		for (const tone of tones) {
			const ref = React.createRef<HTMLElement>();
			const { unmount } = render(<Chip ref={ref} tone={tone} label={tone} />);
			expect(ref.current).toHaveClass(`gl-chip-${tone}`);
			unmount();
		}
	});

	test("icon and avatar come before the label", () => {
		const { container } = render(
			<>
				<Chip icon={<span data-testid="icon" />} label="Medellín" />
				<Chip avatar={<span data-testid="avatar" />} label="Sebastian Suarez" />
			</>,
		);
		expect(
			screen
				.getByTestId("icon")
				.compareDocumentPosition(textNode(container, "Medellín")),
		).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
		expect(
			screen
				.getByTestId("avatar")
				.compareDocumentPosition(textNode(container, "Sebastian Suarez")),
		).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
	});

	test("an Icon is drawn at 14px, and at 12px when size is sm", () => {
		const medium = React.createRef<SVGSVGElement>();
		const small = React.createRef<SVGSVGElement>();
		render(
			<>
				<Chip icon={<Icon ref={medium} name="globe" />} label="Medellín" />
				<Chip
					size="sm"
					icon={<Icon ref={small} name="globe" />}
					label="Medellín"
				/>
			</>,
		);
		expect(medium.current && size(medium.current)).toEqual([14, 14]);
		expect(small.current && size(small.current)).toEqual([12, 12]);
	});

	test("an Avatar is shrunk to 20px", () => {
		const avatar = React.createRef<HTMLSpanElement>();
		render(
			<Chip
				avatar={
					<Avatar ref={avatar} aria-hidden="true">
						SS
					</Avatar>
				}
				label="Sebastian Suarez"
			/>,
		);
		expect(avatar.current && size(avatar.current)).toEqual([20, 20]);
	});

	// The api.d.ts doc of clickable: "hover and press styling without onClick, e.g. inside your own button".
	// The reference renders a button instead (docs/reference-defects.md).
	referenceDefectTest(
		"clickable gives the clickable styling without making the chip a button, so it can sit inside your own",
		() => {
			const ref = React.createRef<HTMLElement>();
			render(
				<button type="button">
					<Chip ref={ref} clickable label="Rust" />
				</button>,
			);
			expect(screen.getAllByRole("button")).toHaveLength(1);
			expect(ref.current).not.toBeInstanceOf(HTMLButtonElement);
			expect(ref.current).toHaveClass("gl-chip-clickable");
		},
	);
});

describe("a clickable chip", () => {
	test("onClick makes it a button named by its label, the ref is that button, and a click calls onClick", async () => {
		const ref = React.createRef<HTMLElement>();
		const types: string[] = [];
		render(
			<Chip
				ref={ref}
				label="Rust"
				onClick={(event: React.MouseEvent<HTMLElement>) => {
					types.push(event.type);
				}}
			/>,
		);
		const chip = button("Rust");
		expect(chip).toBeInstanceOf(HTMLButtonElement);
		expect(ref.current).toBe(chip);
		await userEvent.click(chip);
		expect(types).toEqual(["click"]);
	});

	test("href makes it a link, with target and rel, and the ref is that link", () => {
		const ref = React.createRef<HTMLElement>();
		render(
			<Chip
				ref={ref}
				variant="plate"
				href="#pipeline"
				target="_blank"
				rel="noopener"
				label="From an edit to production"
			/>,
		);
		const link = screen.getByRole("link", {
			name: "From an edit to production",
		});
		expect(link).toBeInstanceOf(HTMLAnchorElement);
		expect(ref.current).toBe(link);
		expect(link).toHaveAttribute("href", "#pipeline");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener");
	});

	test("selected sets aria-pressed on a button chip, and an unselected toggle reads false", () => {
		const onClick = vi.fn<() => void>();
		render(
			<>
				<Chip selected label="Rust" onClick={onClick} />
				<Chip selected={false} label="Wine" onClick={onClick} />
				<Chip label="Reset" onClick={onClick} />
			</>,
		);
		expect(button("Rust")).toHaveAttribute("aria-pressed", "true");
		expect(button("Wine")).toHaveAttribute("aria-pressed", "false");
		// Without selected, a chip is an action, not a toggle.
		expect(button("Reset")).not.toHaveAttribute("aria-pressed");
	});

	test("selected sets aria-current on a link chip", () => {
		render(
			<>
				<Chip selected href="#work" label="Work" />
				<Chip href="#contact" label="Contact" />
			</>,
		);
		const current = screen.getByRole("link", { name: "Work" });
		expect(current).toHaveAttribute("aria-current");
		expect(current).not.toHaveAttribute("aria-current", "false");
		expect(
			screen
				.getByRole("link", { name: "Contact" })
				.getAttribute("aria-current") ?? "false",
		).toBe("false");
	});

	test("Tab reaches it, and Enter or Space activates it", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<>
				<button type="button">Before</button>
				<Chip label="Rust" onClick={onClick} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		expect(button("Rust")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	test("Escape lets go of focus", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Chip label="Rust" onClick={vi.fn<() => void>()} />
				<Chip href="#work" label="Work" />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		expect(button("Rust")).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => document.activeElement).toBe(document.body);
		screen.getByRole("link", { name: "Work" }).focus();
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => document.activeElement).toBe(document.body);
	});

	test("disabled: a button chip is disabled, and a click does nothing", async () => {
		const onClick = vi.fn<() => void>();
		render(<Chip disabled label="Rust" onClick={onClick} />);
		expect(isDisabled(button("Rust"))).toBe(true);
		await userEvent.click(button("Rust"), { force: true });
		expect(onClick).not.toHaveBeenCalled();
	});

	test("disabled: a link chip is aria-disabled, and a click neither follows it nor calls onClick", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Chip disabled href="#disabled-chip" label="Work" onClick={onClick} />,
		);
		const link = screen.getByRole("link", { name: "Work" });
		expect(link).toHaveAttribute("aria-disabled", "true");
		await userEvent.click(link, { force: true });
		expect(onClick).not.toHaveBeenCalled();
		expect(window.location.hash).toBe("");
	});
});

describe("a deletable chip", () => {
	test('onDelete adds a close button named "Remove {label}", and a click on it calls onDelete', async () => {
		const { types, onDelete } = deleteRecorder();
		render(<Chip label="Rust" onDelete={onDelete} />);
		await userEvent.click(button("Remove Rust"));
		expect(types).toEqual(["click"]);
	});

	test("the close button is 18px, with a 30px hit area", async () => {
		const { types, onDelete } = deleteRecorder();
		render(<Chip label="Rust" onDelete={onDelete} />);
		const close = button("Remove Rust");
		expect(size(close)).toEqual([18, 18]);
		// 13px right of the centre is outside the 18px button but inside its 30px hit area.
		const box = close.getBoundingClientRect();
		const halfWidth = box.width / 2;
		const halfHeight = box.height / 2;
		const hit = document.elementFromPoint(
			box.left + halfWidth + 13,
			box.top + halfHeight,
		);
		expect(close.contains(hit)).toBe(true);
		await userEvent.click(close, { position: { x: 9 + 13, y: 9 } });
		expect(types).toEqual(["click"]);
	});

	test("deleteLabel names the close button, and deleteIcon replaces its glyph", () => {
		render(
			<Chip
				label="Rust"
				deleteLabel="Remove the Rust tag"
				deleteIcon={<span data-testid="glyph">x</span>}
				onDelete={vi.fn<() => void>()}
			/>,
		);
		const close = button("Remove the Rust tag");
		expect(within(close).getByTestId("glyph")).toBeVisible();
		// The default glyph is an Icon, an svg; the replacement leaves none behind.
		expect(close.querySelector("svg")).toBeNull();
	});

	test("Backspace and Delete on the chip call onDelete", async () => {
		const { types, onDelete } = deleteRecorder();
		render(
			<>
				<button type="button">Before</button>
				<Chip label="Rust" onDelete={onDelete} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		expect(button("Remove Rust")).toHaveFocus();
		await userEvent.keyboard("{Backspace}");
		await userEvent.keyboard("{Delete}");
		expect(types).toEqual(["keydown", "keydown"]);
	});

	test("Escape on the close button lets go of focus", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Chip label="Rust" onDelete={vi.fn<() => void>()} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		expect(button("Remove Rust")).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		await expect.poll(() => document.activeElement).toBe(document.body);
	});

	test("a clickable, deletable chip renders two sibling buttons, each a tab stop", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Chip
					label="Wine"
					onClick={vi.fn<() => void>()}
					onDelete={vi.fn<() => void>()}
				/>
				<button type="button">After</button>
			</>,
		);
		const action = button("Wine");
		const close = button("Remove Wine");
		expect(action.contains(close)).toBe(false);
		expect(close.contains(action)).toBe(false);
		focusBefore();
		await userEvent.tab();
		expect(action).toHaveFocus();
		await userEvent.tab();
		expect(close).toHaveFocus();
		await userEvent.tab();
		expect(button("After")).toHaveFocus();
	});

	test("Enter or Space activates either button, and the close button doesn't call onClick", async () => {
		const onClick = vi.fn<() => void>();
		const { types, onDelete } = deleteRecorder();
		render(
			<>
				<button type="button">Before</button>
				<Chip label="Wine" onClick={onClick} onDelete={onDelete} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		expect(onClick).toHaveBeenCalledTimes(2);
		expect(onDelete).not.toHaveBeenCalled();
		await userEvent.tab();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		await userEvent.click(button("Remove Wine"));
		expect(types).toEqual(["click", "click", "click"]);
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	test("Backspace or Delete on the clickable part calls onDelete, not onClick", async () => {
		const onClick = vi.fn<() => void>();
		const { types, onDelete } = deleteRecorder();
		render(
			<>
				<button type="button">Before</button>
				<Chip label="Wine" onClick={onClick} onDelete={onDelete} />
			</>,
		);
		focusBefore();
		await userEvent.tab();
		expect(button("Wine")).toHaveFocus();
		await userEvent.keyboard("{Backspace}");
		await userEvent.keyboard("{Delete}");
		expect(types).toEqual(["keydown", "keydown"]);
		expect(onClick).not.toHaveBeenCalled();
	});

	test("disabled disables the close button, and a click on it does nothing", async () => {
		const onClick = vi.fn<() => void>();
		const onDelete = vi.fn<() => void>();
		render(
			<>
				<Chip disabled label="Rust" onDelete={onDelete} />
				<Chip disabled label="Wine" onClick={onClick} onDelete={onDelete} />
			</>,
		);
		for (const name of ["Remove Rust", "Wine", "Remove Wine"]) {
			expect(isDisabled(button(name))).toBe(true);
		}

		await userEvent.click(button("Remove Rust"), { force: true });
		await userEvent.click(button("Remove Wine"), { force: true });
		await userEvent.click(button("Wine"), { force: true });
		expect(onDelete).not.toHaveBeenCalled();
		expect(onClick).not.toHaveBeenCalled();
	});
});
