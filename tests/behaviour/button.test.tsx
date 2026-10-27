import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import { Button, Icon, type ButtonProps } from "#ui";

afterEach(() => {
	cleanup();
	window.history.replaceState(
		null,
		"",
		window.location.pathname + window.location.search,
	);
});

function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function height(element: Element): number {
	return Math.round(element.getBoundingClientRect().height);
}

function preventSubmit(event: React.SyntheticEvent) {
	event.preventDefault();
}

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

describe("element and ref", () => {
	test("renders a native button named by its label, and the ref is that button", () => {
		const ref = React.createRef<HTMLButtonElement | HTMLAnchorElement>();
		render(<Button ref={ref}>See the work</Button>);
		const element = button("See the work");
		expect(element).toBeInstanceOf(HTMLButtonElement);
		expect(ref.current).toBe(element);
	});

	test("href renders a link with the same look, and the ref is that anchor", () => {
		const ref = React.createRef<HTMLButtonElement | HTMLAnchorElement>();
		render(
			<Button
				ref={ref}
				variant="primary"
				href="#work"
				target="_blank"
				rel="noopener"
			>
				See the work
			</Button>,
		);
		const link = screen.getByRole("link", { name: "See the work" });
		expect(link).toBeInstanceOf(HTMLAnchorElement);
		expect(ref.current).toBe(link);
		expect(link).toHaveAttribute("href", "#work");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener");
		expect(link).toHaveClass("gl-button-primary");
		expect(screen.queryByRole("button")).toBeNull();
	});

	test("other button attributes and className reach the button", () => {
		render(
			<>
				<p id="draft-hint">Saves without publishing.</p>
				<Button
					id="save"
					name="intent"
					value="draft"
					title="Save the draft"
					aria-describedby="draft-hint"
					data-track="save"
					className="custom"
				>
					Save draft
				</Button>
			</>,
		);
		const element = button("Save draft");
		expect(element.id).toBe("save");
		expect(element).toHaveAttribute("name", "intent");
		expect(element).toHaveAttribute("value", "draft");
		expect(element).toHaveAttribute("title", "Save the draft");
		expect(element).toHaveAttribute("data-track", "save");
		expect(element).toHaveAccessibleDescription("Saves without publishing.");
		expect(element).toHaveClass("custom");
	});
});

describe("type and onClick", () => {
	test("type defaults to button, so a Button doesn't submit its form", async () => {
		const onSubmit = vi.fn(preventSubmit);
		render(
			<form onSubmit={onSubmit}>
				<Button>Save draft</Button>
			</form>,
		);
		expect(button("Save draft")).toHaveAttribute("type", "button");
		await userEvent.click(button("Save draft"));
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test('type="submit" submits its form, and type="reset" resets it', async () => {
		const onSubmit = vi.fn(preventSubmit);
		render(
			<form onSubmit={onSubmit}>
				<input aria-label="Title" defaultValue="Draft" />
				<Button type="reset">Reset</Button>
				<Button type="submit">Publish</Button>
			</form>,
		);
		await userEvent.click(button("Publish"));
		expect(onSubmit).toHaveBeenCalledTimes(1);
		const input = screen.getByRole("textbox", { name: "Title" });
		await userEvent.fill(input, "Changed");
		await userEvent.click(button("Reset"));
		expect(input).toHaveValue("Draft");
	});

	test("onClick gets the click event", async () => {
		const types: string[] = [];
		render(
			<Button
				onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
					types.push(event.type);
				}}
			>
				Email me
			</Button>,
		);
		await userEvent.click(button("Email me"));
		expect(types).toEqual(["click"]);
	});

	test("Enter and Space press it, as they press a native button", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<>
				<button type="button">Before</button>
				<Button onClick={onClick}>Email me</Button>
			</>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(button("Email me")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		expect(onClick).toHaveBeenCalledTimes(2);
	});
});

describe("variant, tone, size and fullWidth", () => {
	test("variant defaults to glass, and each variant puts its class on the root", () => {
		const variants = [
			"primary",
			"glass",
			"text",
		] as const satisfies ReadonlyArray<ButtonProps["variant"]>;
		render(
			<>
				<Button>Default</Button>
				{variants.map((variant) => (
					<Button key={variant} variant={variant}>
						{variant}
					</Button>
				))}
			</>,
		);
		expect(button("Default")).toHaveClass("gl-button-glass");
		for (const variant of variants) {
			expect(button(variant)).toHaveClass(`gl-button-${variant}`);
		}
	});

	test('tone="danger" puts the danger class on the root, and the default tone doesn\'t', () => {
		render(
			<>
				<Button tone="danger">Delete project</Button>
				<Button tone="default">Keep project</Button>
			</>,
		);
		expect(button("Delete project")).toHaveClass("gl-button-danger");
		expect(button("Keep project")).not.toHaveClass("gl-button-danger");
	});

	test("size: sm is 36px, md (the default) 46px and lg 54px tall, and the text variant keeps 32px", () => {
		render(
			<>
				<Button size="sm">Small</Button>
				<Button>Medium</Button>
				<Button size="md">Also medium</Button>
				<Button size="lg">Large</Button>
				<Button variant="text">Repository</Button>
			</>,
		);
		expect(height(button("Small"))).toBe(36);
		expect(height(button("Medium"))).toBe(46);
		expect(height(button("Also medium"))).toBe(46);
		expect(height(button("Large"))).toBe(54);
		expect(height(button("Repository"))).toBe(32);
		expect(button("Small")).toHaveClass("gl-button-sm");
		expect(button("Large")).toHaveClass("gl-button-lg");
	});

	test("fullWidth stretches it to the container width", () => {
		render(
			<div style={{ width: 300 }}>
				<Button fullWidth>Continue</Button>
			</div>,
		);
		const { width } = button("Continue").getBoundingClientRect();
		expect(Math.round(width)).toBe(300);
	});
});

describe("disabled", () => {
	test("disabled disables the button, and clicking it does nothing", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Button disabled onClick={onClick}>
				Publish
			</Button>,
		);
		expect(isDisabled(button("Publish"))).toBe(true);
		await userEvent.click(button("Publish"), { force: true });
		expect(onClick).not.toHaveBeenCalled();
	});

	test("a disabled link Button is aria-disabled and neither follows its href nor calls onClick", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Button disabled href="#disabled-target" onClick={onClick}>
				See the work
			</Button>,
		);
		const link = screen.getByRole("link", { name: "See the work" });
		expect(link).toHaveAttribute("aria-disabled", "true");
		await userEvent.click(link, { force: true });
		expect(onClick).not.toHaveBeenCalled();
		expect(window.location.hash).toBe("");
	});
});

describe("loading", () => {
	test("loading keeps the label, sets aria-busy and blocks clicks and key presses", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Button loading onClick={onClick}>
				Saving
			</Button>,
		);
		const element = button("Saving");
		expect(element).toHaveAttribute("aria-busy", "true");
		await userEvent.click(element, { force: true });
		element.focus();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		expect(onClick).not.toHaveBeenCalled();
	});

	test("loading blocks only clicks: the Button keeps focus and its other handlers", async () => {
		const onKeyDown = vi.fn<() => void>();
		const onPointerDown = vi.fn<() => void>();
		render(
			<Button loading onKeyDown={onKeyDown} onPointerDown={onPointerDown}>
				Saving
			</Button>,
		);
		const element = button("Saving");
		await userEvent.click(element, { force: true });
		expect(onPointerDown).toHaveBeenCalled();
		element.focus();
		expect(element).toHaveFocus();
		await userEvent.keyboard("{Escape}");
		expect(onKeyDown).toHaveBeenCalled();
	});

	test("a loading submit Button doesn't submit its form", async () => {
		const onSubmit = vi.fn(preventSubmit);
		render(
			<form onSubmit={onSubmit}>
				<Button loading type="submit">
					Sending
				</Button>
			</form>,
		);
		await userEvent.click(button("Sending"), { force: true });
		expect(onSubmit).not.toHaveBeenCalled();
	});

	test("a loading link Button sets aria-busy and neither follows its href nor calls onClick", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Button loading href="#loading-target" onClick={onClick}>
				Opening
			</Button>,
		);
		const link = screen.getByRole("link", { name: "Opening" });
		expect(link).toHaveAttribute("aria-busy", "true");
		await userEvent.click(link, { force: true });
		expect(onClick).not.toHaveBeenCalled();
		expect(window.location.hash).toBe("");
	});

	test("without loading there is no aria-busy", () => {
		render(<Button>Email me</Button>);
		expect(button("Email me")).not.toHaveAttribute("aria-busy", "true");
	});
});

describe("icons", () => {
	test("startIcon comes before the label and endIcon after it, inside the button", () => {
		render(
			<Button
				startIcon={<span data-testid="start-icon" />}
				endIcon={<span data-testid="end-icon" />}
			>
				Download
			</Button>,
		);
		const element = button("Download");
		const start = within(element).getByTestId("start-icon");
		const end = within(element).getByTestId("end-icon");
		const label = textNode(element, "Download");
		expect(start.compareDocumentPosition(label)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
		expect(label.compareDocumentPosition(end)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
	});

	test("an Icon inside the pill is drawn at 16px", () => {
		const start = React.createRef<SVGSVGElement>();
		const end = React.createRef<SVGSVGElement>();
		render(
			<Button
				startIcon={<Icon ref={start} name="download" />}
				endIcon={<Icon ref={end} name="arrow-ne" />}
			>
				Download
			</Button>,
		);
		for (const icon of [start.current, end.current]) {
			const box = icon?.getBoundingClientRect();
			expect([box?.width, box?.height]).toEqual([16, 16]);
		}
	});
});
