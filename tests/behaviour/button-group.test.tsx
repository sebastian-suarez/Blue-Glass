import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import { Button, ButtonGroup, type ButtonGroupProps } from "#ui";

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

function group(name: string): HTMLElement {
	return screen.getByRole("group", { name });
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function height(element: Element): number {
	return Math.round(box(element).height);
}

function resolvedRadius(token: string): string {
	const probe = document.createElement("div");
	probe.style.borderRadius = `var(${token})`;
	document.body.append(probe);
	const radius = getComputedStyle(probe).borderTopLeftRadius;
	probe.remove();
	return radius;
}

describe("the group", () => {
	test("renders role group named by aria-label, and the ref is its div", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<ButtonGroup ref={ref} aria-label="Zoom" className="custom" id="zoom">
				<Button>Zoom out</Button>
				<Button>Zoom in</Button>
			</ButtonGroup>,
		);
		const element = group("Zoom");
		expect(element).toBeInstanceOf(HTMLDivElement);
		expect(ref.current).toBe(element);
		expect(element).toHaveClass("custom");
		expect(element.id).toBe("zoom");
		expect(within(element).getAllByRole("button")).toHaveLength(2);
	});

	test("aria-labelledby names the group", () => {
		render(
			<>
				<h3 id="export-title">Export the diagram</h3>
				<ButtonGroup aria-labelledby="export-title">
					<Button>SVG</Button>
					<Button>PNG</Button>
				</ButtonGroup>
			</>,
		);
		expect(group("Export the diagram")).toBeInTheDocument();
	});
});

describe("variant and size", () => {
	test("variant defaults to glass; the group carries its class and sets it on every Button", () => {
		const variants = [
			"glass",
			"primary",
			"text",
		] as const satisfies ReadonlyArray<ButtonGroupProps["variant"]>;
		render(
			<>
				<ButtonGroup aria-label="Default">
					<Button>One</Button>
					<Button>Two</Button>
				</ButtonGroup>
				{variants.map((variant) => (
					<ButtonGroup key={variant} variant={variant} aria-label={variant}>
						<Button>One</Button>
						<Button href="#two">Two</Button>
					</ButtonGroup>
				))}
			</>,
		);
		expect(group("Default")).toHaveClass("gl-button-group-glass");
		for (const item of within(group("Default")).getAllByRole("button")) {
			expect(item).toHaveClass("gl-button-glass");
		}

		for (const variant of variants) {
			const element = group(variant);
			expect(element).toHaveClass(`gl-button-group-${variant}`);
			const one = within(element).getByRole("button", { name: "One" });
			const two = within(element).getByRole("link", { name: "Two" });
			expect(one).toHaveClass(`gl-button-${variant}`);
			expect(two).toHaveClass(`gl-button-${variant}`);
		}
	});

	test("size: the track is 36px, 46px (the default) or 54px tall, and the group sets the size on every Button", () => {
		const sizes = ["sm", "md", "lg"] as const satisfies ReadonlyArray<
			ButtonGroupProps["size"]
		>;
		const heights = { sm: 36, md: 46, lg: 54 };
		render(
			<>
				<ButtonGroup aria-label="Default">
					<Button>One</Button>
				</ButtonGroup>
				{sizes.map((size) => (
					<React.Fragment key={size}>
						<ButtonGroup size={size} aria-label={`glass ${size}`}>
							<Button>One</Button>
							<Button>Two</Button>
						</ButtonGroup>
						<ButtonGroup
							size={size}
							variant="primary"
							aria-label={`primary ${size}`}
						>
							<Button>One</Button>
							<Button>Two</Button>
						</ButtonGroup>
					</React.Fragment>
				))}
			</>,
		);
		expect(height(group("Default"))).toBe(46);
		for (const size of sizes) {
			for (const variant of ["glass", "primary"]) {
				const element = group(`${variant} ${size}`);
				expect(height(element)).toBe(heights[size]);
				expect(element).toHaveClass(`gl-button-group-${size}`);
			}
		}

		for (const size of ["sm", "lg"]) {
			for (const item of within(group(`glass ${size}`)).getAllByRole(
				"button",
			)) {
				expect(item).toHaveClass(`gl-button-${size}`);
			}
		}
	});
});

describe("orientation and fullWidth", () => {
	test("the buttons sit in a row by default, and in a column with the track's radius-well when vertical", () => {
		render(
			<>
				<ButtonGroup aria-label="Row">
					<Button>Read résumé</Button>
					<Button>Download PDF</Button>
				</ButtonGroup>
				<ButtonGroup orientation="vertical" aria-label="Column">
					<Button>Read résumé</Button>
					<Button>Download PDF</Button>
				</ButtonGroup>
			</>,
		);
		const [rowFirst, rowSecond] = within(group("Row")).getAllByRole("button");
		expect(box(rowSecond).left).toBeGreaterThanOrEqual(box(rowFirst).right);
		expect(Math.round(box(rowSecond).top)).toBe(Math.round(box(rowFirst).top));

		const [first, second] = within(group("Column")).getAllByRole("button");
		expect(box(second).top).toBeGreaterThanOrEqual(box(first).bottom);
		expect(Math.round(box(second).left)).toBe(Math.round(box(first).left));
		expect(getComputedStyle(group("Column")).borderTopLeftRadius).toBe(
			resolvedRadius("--radius-well"),
		);
	});

	test("fullWidth fills the container, and the buttons share it equally", () => {
		render(
			<div style={{ width: 360 }}>
				<ButtonGroup fullWidth aria-label="Period">
					<Button>Last week</Button>
					<Button>Last month</Button>
					<Button>This year, so far</Button>
				</ButtonGroup>
			</div>,
		);
		const { width: trackWidth } = box(group("Period"));
		expect(Math.round(trackWidth)).toBe(360);
		const widths = within(group("Period"))
			.getAllByRole("button")
			.map((item) => box(item).width);
		for (const width of widths) {
			expect(width).toBeCloseTo(widths[0], 0);
		}
	});
});

describe("disabled", () => {
	test("disabled disables every button, and the track dims once rather than each button", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<ButtonGroup disabled aria-label="Draft">
				<Button onClick={onClick}>Save draft</Button>
				<Button onClick={onClick}>Publish</Button>
			</ButtonGroup>,
		);
		for (const item of within(group("Draft")).getAllByRole("button")) {
			expect(isDisabled(item)).toBe(true);
			expect(getComputedStyle(item).opacity).toBe("1");
		}

		expect(getComputedStyle(group("Draft")).opacity).toBe("0.5");
		await userEvent.click(button("Save draft"), { force: true });
		await userEvent.click(button("Publish"), { force: true });
		expect(onClick).not.toHaveBeenCalled();
	});

	test("a child's own disabled still disables it inside an enabled group", async () => {
		const onSave = vi.fn<() => void>();
		render(
			<ButtonGroup aria-label="Draft">
				<Button onClick={onSave}>Save draft</Button>
				<Button disabled>Publish</Button>
			</ButtonGroup>,
		);
		expect(isDisabled(button("Publish"))).toBe(true);
		expect(isDisabled(button("Save draft"))).toBe(false);
		await userEvent.click(button("Save draft"));
		expect(onSave).toHaveBeenCalledTimes(1);
	});
});

describe("keyboard", () => {
	test("Tab moves through the buttons one by one, links included", async () => {
		render(
			<>
				<button type="button">Before</button>
				<ButtonGroup aria-label="Draft">
					<Button>Save draft</Button>
					<Button>Publish</Button>
					<Button href="#preview">Preview</Button>
				</ButtonGroup>
				<button type="button">After</button>
			</>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(button("Save draft")).toHaveFocus();
		await userEvent.tab();
		expect(button("Publish")).toHaveFocus();
		await userEvent.tab();
		expect(screen.getByRole("link", { name: "Preview" })).toHaveFocus();
		await userEvent.tab();
		expect(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		expect(screen.getByRole("link", { name: "Preview" })).toHaveFocus();
	});

	test("Enter and Space press the focused button, and Enter follows a link", async () => {
		const onSave = vi.fn<() => void>();
		const onPublish = vi.fn<() => void>();
		render(
			<>
				<button type="button">Before</button>
				<ButtonGroup aria-label="Draft">
					<Button onClick={onSave}>Save draft</Button>
					<Button onClick={onPublish}>Publish</Button>
					<Button href="#group-preview">Preview</Button>
				</ButtonGroup>
			</>,
		);
		button("Before").focus();
		await userEvent.tab();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		expect(onSave).toHaveBeenCalledTimes(2);
		await userEvent.tab();
		await userEvent.keyboard(" ");
		await userEvent.keyboard("{Enter}");
		expect(onPublish).toHaveBeenCalledTimes(2);
		await userEvent.tab();
		await userEvent.keyboard("{Enter}");
		expect(window.location.hash).toBe("#group-preview");
	});
});
