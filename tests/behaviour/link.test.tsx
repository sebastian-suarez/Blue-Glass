import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import { Icon, Link, type LinkProps } from "#ui";

afterEach(() => {
	cleanup();
	// The keyboard tests follow hash hrefs; clear the hash so no test sees another's.
	window.history.replaceState(
		null,
		"",
		window.location.pathname + window.location.search,
	);
});

function link(name: string): HTMLElement {
	return screen.getByRole("link", { name });
}

/**
The markup of a glyph as Icon draws it, to compare with what a component shows.
*/
function glyph(name: string): string {
	const { container, unmount } = render(<Icon name={name} />);
	const markup = container.querySelector("svg")?.getHTML() ?? "";
	unmount();
	return markup;
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

/**
Whether an svg drawing the glyph sits inside the element, after the text.
*/
function hasGlyphAfterText(element: HTMLElement, text: string, name: string) {
	const markup = glyph(name);
	const label = textNode(element, text);
	return [...element.querySelectorAll("svg")].some(
		(svg) =>
			svg.getHTML() === markup &&
			label.compareDocumentPosition(svg) === Node.DOCUMENT_POSITION_FOLLOWING,
	);
}

function focusBefore() {
	screen.getByRole("button", { name: "Before" }).focus();
}

/**
Stands in for a router's link component.
*/
function RouterLink({ children, ...props }: React.ComponentProps<"a">) {
	return (
		<a {...props} data-router="">
			{children}
		</a>
	);
}

describe("element and ref", () => {
	test("renders an anchor with its href and text, and the ref is that anchor", () => {
		const ref = React.createRef<HTMLAnchorElement>();
		render(
			<Link ref={ref} href="#work" className="custom">
				Work
			</Link>,
		);
		const anchor = link("Work");
		expect(anchor).toBeInstanceOf(HTMLAnchorElement);
		expect(ref.current).toBe(anchor);
		expect(anchor).toHaveAttribute("href", "#work");
		expect(anchor).toHaveClass("custom");
	});

	test("component renders another element, which receives className, href and the rest", () => {
		render(
			<Link
				component={RouterLink}
				href="/work"
				className="custom"
				title="Work"
				underline="hover"
			>
				Work
			</Link>,
		);
		// RouterLink renders only the props it gets, so what reaches the anchor came through them.
		const anchor = link("Work");
		expect(anchor).toHaveAttribute("data-router");
		expect(anchor).toHaveAttribute("href", "/work");
		expect(anchor).toHaveAttribute("title", "Work");
		expect(anchor).toHaveClass("custom");
		expect(anchor).toHaveClass("gl-link-underline-hover");
	});

	test('component="button" renders a button', () => {
		render(<Link component="button">Copy page link</Link>);
		expect(
			screen.getByRole("button", { name: "Copy page link" }),
		).toBeInstanceOf(HTMLButtonElement);
		expect(screen.queryByRole("link")).toBeNull();
	});
});

describe("underline and color", () => {
	test("underline is always by default, and each value puts its class on the root", () => {
		const values = ["always", "hover", "none"] as const satisfies ReadonlyArray<
			LinkProps["underline"]
		>;
		render(
			<>
				<Link href="#default">Default</Link>
				{values.map((underline) => (
					<Link key={underline} href={`#${underline}`} underline={underline}>
						{underline}
					</Link>
				))}
			</>,
		);
		expect(link("Default")).toHaveClass("gl-link-underline-always");
		for (const underline of values) {
			expect(link(underline)).toHaveClass(`gl-link-underline-${underline}`);
		}
	});

	test("always is underlined at rest and thicker under the pointer, hover only under the pointer, and none never", async () => {
		render(
			<>
				<p>Away from the links</p>
				<Link href="#always">Always</Link>{" "}
				<Link href="#hover" underline="hover">
					Hover
				</Link>{" "}
				<Link href="#none" underline="none">
					None
				</Link>
			</>,
		);
		const decoration = (name: string) =>
			getComputedStyle(link(name)).textDecorationLine;
		await userEvent.hover(screen.getByText("Away from the links"));
		expect(decoration("Always")).toBe("underline");
		expect(decoration("Hover")).toBe("none");
		expect(decoration("None")).toBe("none");
		const resting = getComputedStyle(link("Always")).textDecorationThickness;
		await userEvent.hover(link("Always"));
		await expect
			.poll(() => getComputedStyle(link("Always")).textDecorationThickness)
			.toBe("2px");
		expect(resting).not.toBe("2px");
		await userEvent.hover(link("Hover"));
		await expect.poll(() => decoration("Hover")).toBe("underline");
		await userEvent.hover(link("None"));
		expect(decoration("None")).toBe("none");
		await userEvent.hover(screen.getByText("Away from the links"));
	});

	test("a go link keeps its 32px tap target", () => {
		render(
			<Link href="#services" underline="hover">
				See every service
			</Link>,
		);
		const { height } = link("See every service").getBoundingClientRect();
		expect(Math.round(height)).toBe(32);
	});

	test("color is link for always and ink otherwise, unless set", () => {
		render(
			<>
				<Link href="#a">Prose</Link>
				<Link href="#b" underline="hover">
					Go
				</Link>
				<Link href="#c" underline="none">
					Card
				</Link>
				<Link href="#d" color="muted">
					Muted
				</Link>
				<Link href="#e" underline="hover" color="link">
					Blue go
				</Link>
				<Link href="#f" color="ink">
					Ink prose
				</Link>
			</>,
		);
		expect(link("Prose")).toHaveClass("gl-link-color-link");
		expect(link("Go")).toHaveClass("gl-link-color-ink");
		expect(link("Card")).toHaveClass("gl-link-color-ink");
		expect(link("Muted")).toHaveClass("gl-link-color-muted");
		expect(link("Blue go")).toHaveClass("gl-link-color-link");
		expect(link("Ink prose")).toHaveClass("gl-link-color-ink");
	});

	test('color="inherit" takes the colour of the text around it', () => {
		render(
			<p style={{ color: "rgb(120, 30, 60)" }}>
				As of 21 Oct,{" "}
				<Link href="#source" color="inherit">
					per the source
				</Link>
				.
			</p>,
		);
		expect(getComputedStyle(link("per the source")).color).toBe(
			"rgb(120, 30, 60)",
		);
	});
});

describe("external", () => {
	test("external opens in a new tab, with noopener noreferrer, the arrow and a hidden note", () => {
		render(
			<Link external href="https://github.com/sebastian-suarez">
				Repository
			</Link>,
		);
		const anchor = link("Repository (opens in a new tab)");
		expect(anchor).toHaveAttribute("target", "_blank");
		const rel = (anchor.getAttribute("rel") ?? "").split(/\s+/v);
		expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
		expect(hasGlyphAfterText(anchor, "Repository", "arrow-ne")).toBe(true);
		const note = within(anchor).getByText("(opens in a new tab)");
		const box = note.getBoundingClientRect();
		expect(box.width).toBeLessThanOrEqual(1);
		expect(box.height).toBeLessThanOrEqual(1);
	});

	test('target="_blank" alone makes it external', () => {
		render(
			<Link href="https://github.com/sebastian-suarez" target="_blank">
				Repository
			</Link>,
		);
		const anchor = link("Repository (opens in a new tab)");
		const rel = (anchor.getAttribute("rel") ?? "").split(/\s+/v);
		expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer"]));
		expect(hasGlyphAfterText(anchor, "Repository", "arrow-ne")).toBe(true);
	});

	test("a same-tab link has no new-tab note and no arrow of its own", () => {
		render(<Link href="#work">Work</Link>);
		const anchor = link("Work");
		expect(anchor).not.toHaveAttribute("target");
		expect(anchor.querySelector("svg")).toBeNull();
	});

	test("newTabLabel replaces the note", () => {
		render(
			<Link external newTabLabel="(new tab)" href="https://example.com">
				Repository
			</Link>,
		);
		expect(link("Repository (new tab)")).toBeInTheDocument();
	});

	test("aria-label replaces the new-tab note on an external link", () => {
		render(
			<Link
				external
				aria-label="VSebCode: repository on GitHub, opens in a new tab"
				href="https://github.com/sebastian-suarez/vsebcode"
			>
				Repository
			</Link>,
		);
		expect(
			link("VSebCode: repository on GitHub, opens in a new tab"),
		).toHaveAttribute("target", "_blank");
	});

	test("endIcon comes after the text, and external uses it instead of the arrow", () => {
		render(
			<>
				<Link
					href="#services"
					underline="hover"
					endIcon={<Icon name="arrow-right" />}
				>
					See every service
				</Link>
				<Link
					external
					href="https://example.com"
					endIcon={<Icon name="arrow-right" />}
				>
					Example
				</Link>
			</>,
		);
		const same = link("See every service");
		expect(hasGlyphAfterText(same, "See every service", "arrow-right")).toBe(
			true,
		);
		const external = link("Example (opens in a new tab)");
		expect(hasGlyphAfterText(external, "Example", "arrow-right")).toBe(true);
		expect(hasGlyphAfterText(external, "Example", "arrow-ne")).toBe(false);
	});
});

describe("keyboard", () => {
	test("Tab focuses the link and Enter follows it", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Link href="#follow-target">Work</Link>
			</>,
		);
		focusBefore();
		await userEvent.tab();
		expect(link("Work")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		expect(window.location.hash).toBe("#follow-target");
	});

	test('with component="button", Enter and Space activate it', async () => {
		const onClick = vi.fn<() => void>();
		render(
			<>
				<button type="button">Before</button>
				<Link component="button" onClick={onClick}>
					Copy page link
				</Link>
			</>,
		);
		focusBefore();
		await userEvent.tab();
		expect(
			screen.getByRole("button", { name: "Copy page link" }),
		).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		expect(onClick).toHaveBeenCalledTimes(2);
	});

	test("the focus ring is 3px, offset 2px on prose links and 5px on go links", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Link href="#always">Prose</Link>
				<Link href="#none" underline="none">
					Card
				</Link>
				<Link href="#hover" underline="hover">
					Go
				</Link>
			</>,
		);
		const ring = (name: string) => {
			const style = getComputedStyle(link(name));
			return [style.outlineStyle, style.outlineWidth, style.outlineOffset];
		};

		focusBefore();
		await userEvent.tab();
		expect(link("Prose")).toHaveFocus();
		expect(ring("Prose")).toEqual(["solid", "3px", "2px"]);
		await userEvent.tab();
		expect(ring("Card")).toEqual(["solid", "3px", "2px"]);
		await userEvent.tab();
		expect(ring("Go")).toEqual(["solid", "3px", "5px"]);
	});
});
