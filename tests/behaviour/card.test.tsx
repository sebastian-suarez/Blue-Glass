import { cleanup, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import {
	Card,
	CardActionArea,
	CardActions,
	CardContent,
	CardHeader,
	CardMedia,
} from "#ui";

afterEach(() => {
	cleanup();
});

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

/**
A disabled native button, or an element marked aria-disabled: either way it's disabled.
*/
function isDisabled(element: Element): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

/**
True when `second` comes after `first` in the document, and neither holds the other.
*/
function isInOrder(first: Node, second: Node): boolean {
	return (
		first.compareDocumentPosition(second) === Node.DOCUMENT_POSITION_FOLLOWING
	);
}

// A 4×4 SVG, so the image needs no network.
const image =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'/%3E";

describe("Card", () => {
	test("renders a div by default, or the element component names, with the ref on it", () => {
		const ref = React.createRef<HTMLElement>();
		const articleRef = React.createRef<HTMLElement>();
		render(
			<>
				<Card ref={ref}>Plain</Card>
				<Card ref={articleRef} component="article" aria-label="VSebCode">
					<CardHeader title="VSebCode" />
				</Card>
			</>,
		);
		expect(ref.current?.tagName).toBe("DIV");
		expect(ref.current).toHaveTextContent("Plain");
		expect(screen.getByRole("article", { name: "VSebCode" })).toBe(
			articleRef.current,
		);
	});

	test("variant puts its class on the card: glass by default, outlined or inset", () => {
		const glass = React.createRef<HTMLElement>();
		const outlined = React.createRef<HTMLElement>();
		const inset = React.createRef<HTMLElement>();
		render(
			<>
				<Card ref={glass}>Glass</Card>
				<Card ref={outlined} variant="outlined">
					Outlined
				</Card>
				<Card ref={inset} variant="inset">
					Inset
				</Card>
			</>,
		);
		expect(glass.current).toHaveClass("gl-card-glass");
		expect(outlined.current).toHaveClass("gl-card-outlined");
		expect(outlined.current).not.toHaveClass("gl-card-glass");
		expect(inset.current).toHaveClass("gl-card-inset");
		expect(inset.current).not.toHaveClass("gl-card-glass");
	});
});

describe("CardHeader", () => {
	test("title is a level-3 heading by default, with the subheader after it", () => {
		render(
			<Card>
				<CardHeader
					title="RS50 force-feedback bridge"
					subheader="Force feedback for a Logitech RS50 under Wine on Apple Silicon."
				/>
			</Card>,
		);
		const title = screen.getByRole("heading", {
			level: 3,
			name: "RS50 force-feedback bridge",
		});
		expect(
			isInOrder(
				title,
				screen.getByText(
					"Force feedback for a Logitech RS50 under Wine on Apple Silicon.",
				),
			),
		).toBe(true);
	});

	test("headingLevel sets the title's heading level, from 2 to 6", () => {
		render(
			<Card>
				<CardHeader title="Level 2" headingLevel={2} />
				<CardHeader title="Level 4" headingLevel={4} />
				<CardHeader title="Level 5" headingLevel={5} />
				<CardHeader title="Level 6" headingLevel={6} />
			</Card>,
		);
		for (const level of [2, 4, 5, 6]) {
			expect(
				screen.getByRole("heading", { level, name: `Level ${level}` }),
			).toBeVisible();
		}
	});

	test("avatar comes before the text and action after it, all inside the header, which holds the ref", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Card>
				<CardHeader
					ref={ref}
					avatar={<span>Orb</span>}
					title="This portfolio"
					subheader="Static Astro pages in a private S3 bucket."
					action={<a href="#how-it-works">How it works</a>}
				/>
			</Card>,
		);
		const header = must(ref.current);
		expect(header).toBeInstanceOf(HTMLDivElement);
		const avatar = within(header).getByText("Orb");
		const title = within(header).getByRole("heading", {
			name: "This portfolio",
		});
		const subheader = within(header).getByText(
			"Static Astro pages in a private S3 bucket.",
		);
		const action = within(header).getByRole("link", { name: "How it works" });
		expect(isInOrder(avatar, title)).toBe(true);
		expect(isInOrder(title, subheader)).toBe(true);
		expect(isInOrder(subheader, action)).toBe(true);
	});
});

describe("CardMedia", () => {
	test("image renders an img with its alt text", () => {
		render(
			<Card>
				<CardMedia image={image} alt="Request path: browser to S3" />
			</Card>,
		);
		const img = screen.getByRole("img", {
			name: "Request path: browser to S3",
		});
		expect(img.tagName).toBe("IMG");
		expect(img).toHaveAttribute("src", image);
	});

	test('alt="" makes the image decorative', () => {
		const ref = React.createRef<HTMLElement>();
		render(
			<Card>
				<CardMedia ref={ref} image={image} alt="" />
			</Card>,
		);
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		const img = must(ref.current?.querySelector("img"));
		expect(img).toHaveAttribute("alt", "");
		expect(img).toHaveAttribute("src", image);
	});

	test("height sets the well's minimum height: px for a number, or any CSS length", () => {
		const inPx = React.createRef<HTMLElement>();
		const inEm = React.createRef<HTMLElement>();
		render(
			<Card>
				<CardMedia ref={inPx} height={96}>
					<span>Diagram</span>
				</CardMedia>
				<CardMedia ref={inEm} height="10em">
					<span>Figure</span>
				</CardMedia>
			</Card>,
		);
		const well = must(inPx.current);
		expect(getComputedStyle(well).minHeight).toBe("96px");
		expect(well.getBoundingClientRect().height).toBeGreaterThanOrEqual(96);
		const style = getComputedStyle(must(inEm.current));
		const fontSize = Number(style.fontSize.replace("px", ""));
		expect(style.minHeight).toBe(`${10 * fontSize}px`);
	});

	test("disablePadding takes the well's padding away, so an image can bleed", () => {
		const padded = React.createRef<HTMLElement>();
		const flush = React.createRef<HTMLElement>();
		render(
			<Card>
				<CardMedia ref={padded}>
					<span>Padded</span>
				</CardMedia>
				<CardMedia ref={flush} disablePadding>
					<span>Flush</span>
				</CardMedia>
			</Card>,
		);
		// The preview never sets disablePadding, so parity can't see it: read the padding.
		expect(getComputedStyle(must(flush.current)).padding).toBe("0px");
		expect(getComputedStyle(must(padded.current)).paddingTop).not.toBe("0px");
	});

	test("component renders the well as another element, around its children", () => {
		const ref = React.createRef<HTMLElement>();
		render(
			<Card>
				<CardMedia ref={ref} component="figure">
					<svg role="img" aria-label="Review gate" viewBox="0 0 10 10" />
				</CardMedia>
			</Card>,
		);
		const figure = screen.getByRole("figure");
		expect(figure.tagName).toBe("FIGURE");
		expect(ref.current).toBe(figure);
		expect(figure).toContainElement(
			screen.getByRole("img", { name: "Review gate" }),
		);
	});
});

describe("CardContent", () => {
	test("renders its children in a div, or the element component names, with the ref on it", () => {
		const ref = React.createRef<HTMLDivElement>();
		const sectionRef = React.createRef<HTMLDivElement>();
		render(
			<Card>
				<CardContent ref={ref}>
					<p>Panels and cards on the light field.</p>
				</CardContent>
				<CardContent ref={sectionRef} component="section">
					A hairline in color-line, no fill.
				</CardContent>
			</Card>,
		);
		expect(ref.current?.tagName).toBe("DIV");
		expect(ref.current).toContainElement(
			screen.getByText("Panels and cards on the light field."),
		);
		expect(sectionRef.current?.tagName).toBe("SECTION");
		expect(sectionRef.current).toHaveTextContent(
			"A hairline in color-line, no fill.",
		);
	});
});

describe("CardActions", () => {
	test("chips render as a list named by chipsLabel, Tags by default", () => {
		render(
			<>
				<Card>
					<CardActions chips={["Rust", "hidapi", "Wine"]} chipsLabel="Stack" />
				</Card>
				<Card>
					<CardActions chips={["Astro", "CloudFront"]} />
				</Card>
			</>,
		);
		const stack = screen.getByRole("list", { name: "Stack" });
		expect(
			within(stack)
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual(["Rust", "hidapi", "Wine"]);
		const tags = screen.getByRole("list", { name: "Tags" });
		expect(
			within(tags)
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual(["Astro", "CloudFront"]);
	});

	test("element chips render as given, and the links render beside the chip list in the footer, which holds the ref", () => {
		const ref = React.createRef<HTMLDivElement>();
		render(
			<Card>
				<CardActions
					ref={ref}
					chips={[
						"TypeScript",
						<a key="private" href="#private">
							Private
						</a>,
					]}
					chipsLabel="Stack"
				>
					<a href="#repo">Repository</a>
				</CardActions>
			</Card>,
		);
		const footer = must(ref.current);
		expect(footer).toBeInstanceOf(HTMLDivElement);
		const chips = within(footer).getByRole("list", { name: "Stack" });
		expect(within(chips).getAllByRole("listitem")).toHaveLength(2);
		expect(within(chips).getByRole("link", { name: "Private" })).toBeVisible();
		const repository = within(footer).getByRole("link", {
			name: "Repository",
		});
		expect(chips.contains(repository)).toBe(false);
	});
});

describe("CardActionArea", () => {
	test("with href it's a link (with target and rel), without it a button whose onClick gets the click event; the ref lands on each", async () => {
		const linkRef = React.createRef<HTMLElement>();
		const buttonRef = React.createRef<HTMLElement>();
		const types: string[] = [];
		const onClick = vi.fn((event: React.MouseEvent<HTMLElement>) => {
			types.push(event.type);
		});
		render(
			<>
				<Card>
					<CardHeader
						title={
							<CardActionArea
								ref={linkRef}
								href="#vsebcode"
								target="_blank"
								rel="noreferrer"
							>
								VSebCode
							</CardActionArea>
						}
					/>
				</Card>
				<Card>
					<CardHeader
						title={
							<CardActionArea ref={buttonRef} onClick={onClick}>
								Clean Architecture template
							</CardActionArea>
						}
					/>
				</Card>
			</>,
		);
		const link = screen.getByRole("link", { name: "VSebCode" });
		expect(link).toBeInstanceOf(HTMLAnchorElement);
		expect(link).toHaveAttribute("href", "#vsebcode");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noreferrer");
		expect(linkRef.current).toBe(link);

		const button = screen.getByRole("button", {
			name: "Clean Architecture template",
		});
		expect(button).toBeInstanceOf(HTMLButtonElement);
		expect(buttonRef.current).toBe(button);
		await userEvent.click(button);
		expect(types).toEqual(["click"]);
	});

	test("wrapping the title, it keeps the heading's role and level", () => {
		render(
			<Card>
				<CardHeader
					title={<CardActionArea href="#vsebcode">VSebCode</CardActionArea>}
					subheader="A fork of microsoft/vscode."
				/>
			</Card>,
		);
		const heading = screen.getByRole("heading", { level: 3, name: "VSebCode" });
		expect(heading).toContainElement(
			screen.getByRole("link", { name: "VSebCode" }),
		);
	});

	test("its hit area covers the card, while the links in CardActions stay their own targets", async () => {
		const onCard = vi.fn<(event: React.MouseEvent<HTMLElement>) => void>();
		const onRepository = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => {
			event.preventDefault();
		});
		render(
			<Card component="article" aria-label="Clean Architecture template">
				<CardHeader
					title={
						<CardActionArea onClick={onCard}>
							Clean Architecture template
						</CardActionArea>
					}
					subheader="A Clean Architecture and DDD template with an AGENTS.md kernel."
				/>
				<CardActions chips={["TypeScript", "Node.js"]} chipsLabel="Stack">
					<a href="#repo" onClick={onRepository}>
						Repository
					</a>
				</CardActions>
			</Card>,
		);
		const card = screen.getByRole("article", {
			name: "Clean Architecture template",
		});
		const { width, height } = card.getBoundingClientRect();
		// Points in the card's own padding, far from the title: only the stretched hit area is there.
		await userEvent.click(card, { position: { x: 8, y: height / 2 } });
		await userEvent.click(card, { position: { x: width / 2, y: height - 8 } });
		expect(onCard).toHaveBeenCalledTimes(2);

		await userEvent.click(screen.getByRole("link", { name: "Repository" }));
		expect(onRepository).toHaveBeenCalledTimes(1);
		expect(onCard).toHaveBeenCalledTimes(2);
	});

	test("it is one Tab stop, and the links in CardActions follow it", async () => {
		render(
			<>
				<button type="button">Before</button>
				<Card component="article">
					<CardHeader
						title={<CardActionArea href="#vsebcode">VSebCode</CardActionArea>}
						subheader="A fork of microsoft/vscode following VSCodium's patch set."
					/>
					<CardActions chips={["TypeScript", "Electron"]} chipsLabel="Stack">
						<a href="#vsebcode-repo">Repository</a>
						<a href="#vsebcode-docs">Docs</a>
					</CardActions>
				</Card>
			</>,
		);
		screen.getByRole("button", { name: "Before" }).focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("link", { name: "VSebCode" }),
		);
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("link", { name: "Repository" }),
		);
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("link", { name: "Docs" }),
		);
	});

	test("disabled: the card dims, and neither a press nor Enter activates it, as a button or a link", async () => {
		const onClick = vi.fn<(event: React.MouseEvent<HTMLElement>) => void>();
		const before = window.location.href;
		render(
			<>
				<Card component="article" aria-label="Button card">
					<CardHeader
						title={
							<CardActionArea disabled onClick={onClick}>
								Résumé
							</CardActionArea>
						}
					/>
				</Card>
				<Card component="article" aria-label="Link card">
					<CardHeader
						title={
							<CardActionArea disabled href="#cv" onClick={onClick}>
								CV
							</CardActionArea>
						}
					/>
				</Card>
				<Card component="article" aria-label="Live card">
					<CardHeader
						title={<CardActionArea href="#live">Live</CardActionArea>}
					/>
				</Card>
			</>,
		);
		const button = screen.getByRole("button", { name: "Résumé" });
		const link = screen.getByRole("link", { name: "CV" });
		expect(isDisabled(button)).toBe(true);
		expect(link).toHaveAttribute("aria-disabled", "true");
		// Playwright waits for a disabled element to enable; force the presses.
		await userEvent.click(button, { force: true });
		await userEvent.click(link, { force: true });
		for (const target of [button, link]) {
			// Something that stays focusable while disabled must still ignore the key.
			target.focus();
			// eslint-disable-next-line no-await-in-loop -- one key per target, in turn
			await userEvent.keyboard("{Enter}");
		}

		expect(onClick).not.toHaveBeenCalled();
		expect(window.location.href).toBe(before);
		const opacity = (name: string) =>
			Number(getComputedStyle(screen.getByRole("article", { name })).opacity);
		await expect.poll(() => opacity("Button card")).toBeLessThan(1);
		await expect.poll(() => opacity("Link card")).toBeLessThan(1);
		expect(opacity("Live card")).toBe(1);
	});
});
