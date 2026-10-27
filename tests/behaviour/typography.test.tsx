import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import "#ui/styles.css";
import {
	type TypographyColor,
	type TypographyProps,
	type TypographyVariant,
	Typography,
} from "#ui";

afterEach(() => {
	cleanup();
});

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

function root(props: TypographyProps): HTMLElement {
	const ref = React.createRef<HTMLElement>();
	render(<Typography ref={ref} {...props} />);
	return current(ref);
}

function fontSizeOf(value: string): string {
	const probe = document.createElement("span");
	probe.style.fontSize = value;
	document.body.append(probe);
	const result = getComputedStyle(probe).fontSize;
	probe.remove();
	return result;
}

function px(value: string): number {
	if (!value.endsWith("px")) {
		throw new Error(`${value} is not a length in px`);
	}

	return Number(value.slice(0, -2));
}

function textWrapStyle(element: Element): string {
	return getComputedStyle(element).getPropertyValue("text-wrap-style");
}

const elements: Array<[TypographyVariant, string]> = [
	["display", "H1"],
	["title-xl", "H1"],
	["title-lg", "H2"],
	["title-md", "H2"],
	["heading", "H2"],
	["card-title", "H3"],
	["title-sm", "H3"],
	["subtitle", "H4"],
	["statement", "P"],
	["lede", "P"],
	["lede-sm", "P"],
	["body-lg", "P"],
	["body", "P"],
	["body-sm", "P"],
	["small", "P"],
	["code", "CODE"],
	["caption", "SPAN"],
	["micro", "SPAN"],
	["nano", "SPAN"],
	["button", "SPAN"],
	["kicker", "SPAN"],
	["label", "SPAN"],
	["name", "SPAN"],
	["diagram-node", "SPAN"],
	["diagram-label", "SPAN"],
];

test.each(elements)(
	"%s renders on a %s carrying its token class",
	(variant, tag) => {
		const element = root({ variant, children: "Text" });
		expect(element.tagName).toBe(tag);
		expect(element.classList.contains(`text-${variant}`)).toBe(true);
	},
);

test("the default variant is body, on a paragraph", () => {
	const element = root({ children: "I work on backend services." });
	expect(element.tagName).toBe("P");
	expect(element.classList.contains("text-body")).toBe(true);
});

test("heading variants are headings at their element's level", () => {
	render(
		<>
			<Typography variant="display">Backend lead.</Typography>
			<Typography variant="heading">What I bring to a team</Typography>
			<Typography variant="card-title">RS50 force-feedback bridge</Typography>
			<Typography variant="subtitle">Review and CI</Typography>
		</>,
	);
	expect(
		screen.getByRole("heading", { level: 1, name: "Backend lead." }),
	).toBeTruthy();
	expect(
		screen.getByRole("heading", { level: 2, name: "What I bring to a team" }),
	).toBeTruthy();
	expect(
		screen.getByRole("heading", {
			level: 3,
			name: "RS50 force-feedback bridge",
		}),
	).toBeTruthy();
	expect(
		screen.getByRole("heading", { level: 4, name: "Review and CI" }),
	).toBeTruthy();
});

test("component changes the element, and the variant's look stays", () => {
	render(
		<>
			<Typography variant="title-md" component="h3">
				Training PDFs. A shorter wait.
			</Typography>
			<Typography variant="display" component="p">
				Backend lead.
			</Typography>
		</>,
	);
	const heading = screen.getByRole("heading", {
		level: 3,
		name: "Training PDFs. A shorter wait.",
	});
	expect(heading.tagName).toBe("H3");
	expect(heading.classList.contains("text-title-md")).toBe(true);
	const paragraph = screen.getByText("Backend lead.");
	expect(paragraph.tagName).toBe("P");
	expect(paragraph.classList.contains("text-display")).toBe(true);
	expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
});

test("component takes a React component, which gets the className and the children", () => {
	function Plate({
		className,
		children,
	}: {
		readonly className?: string;
		readonly children?: React.ReactNode;
	}) {
		return (
			<section aria-label="Plate" className={className}>
				{children}
			</section>
		);
	}

	render(
		<Typography variant="caption" component={Plate}>
			Limber Health
		</Typography>,
	);
	const plate = screen.getByRole("region", { name: "Plate" });
	expect(plate.textContent).toBe("Limber Health");
	expect(plate.classList.contains("text-caption")).toBe(true);
});

const colors: TypographyColor[] = [
	"ink",
	"muted",
	"ink-soft",
	"accent",
	"link",
	"blue-deep",
	"danger",
	"warning",
	"success",
	"info",
];

test.each(colors)("color %s sets its colour token's class", (color) => {
	const element = root({ variant: "body-sm", color, children: color });
	expect(element.classList.contains(`gl-typography-${color}`)).toBe(true);
});

test("color is inherit by default, taking the parent's colour", () => {
	const ref = React.createRef<HTMLElement>();
	const inherited = React.createRef<HTMLElement>();
	render(
		<div style={{ color: "rgb(10, 20, 30)" }}>
			<Typography ref={ref} variant="small">
				Medellín, Colombia
			</Typography>
			<Typography ref={inherited} variant="small" color="inherit">
				Medellín, Colombia
			</Typography>
		</div>,
	);
	expect(getComputedStyle(current(ref)).color).toBe("rgb(10, 20, 30)");
	expect(getComputedStyle(current(inherited)).color).toBe("rgb(10, 20, 30)");
});

test.each(["left", "center", "right", "justify"] as const)(
	"align %s sets the text alignment",
	(align) => {
		const element = root({ variant: "small", align, children: "Medellín" });
		expect(getComputedStyle(element).textAlign).toBe(align);
	},
);

test("align is inherit by default, taking the parent's alignment", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<div style={{ textAlign: "center" }}>
			<Typography ref={ref} variant="small">
				Medellín, Colombia
			</Typography>
		</div>,
	);
	expect(getComputedStyle(current(ref)).textAlign).toBe("center");
});

test("headings h1 to h6 balance and paragraphs wrap pretty by default, whatever the variant", () => {
	render(
		<>
			<Typography variant="display">Display</Typography>
			<Typography variant="heading">Heading</Typography>
			<Typography variant="card-title">Card title</Typography>
			<Typography variant="subtitle">Subtitle</Typography>
			<Typography variant="micro" component="h5">
				Micro heading
			</Typography>
			<Typography variant="micro" component="h6">
				Smallest heading
			</Typography>
			<Typography variant="body">Body</Typography>
			<Typography variant="caption" component="p">
				Caption paragraph
			</Typography>
			<Typography variant="heading" component="span">
				Heading span
			</Typography>
			<Typography variant="micro">Micro</Typography>
		</>,
	);
	for (const text of [
		"Display",
		"Heading",
		"Card title",
		"Subtitle",
		"Micro heading",
		"Smallest heading",
	]) {
		expect(textWrapStyle(screen.getByText(text)), text).toBe("balance");
	}

	for (const text of ["Body", "Caption paragraph"]) {
		expect(textWrapStyle(screen.getByText(text)), text).toBe("pretty");
	}

	for (const text of ["Heading span", "Micro"]) {
		expect(textWrapStyle(screen.getByText(text)), text).not.toBe("balance");
		expect(textWrapStyle(screen.getByText(text)), text).not.toBe("pretty");
	}
});

test("textWrap overrides the line breaking: balance, pretty or plain wrap", () => {
	render(
		<>
			<Typography variant="title-sm" textWrap="wrap">
				Plain heading
			</Typography>
			<Typography variant="title-sm" textWrap="pretty">
				Pretty heading
			</Typography>
			<Typography variant="body" textWrap="balance">
				Balanced paragraph
			</Typography>
			<Typography variant="body" textWrap="wrap">
				Plain paragraph
			</Typography>
		</>,
	);
	expect(textWrapStyle(screen.getByText("Plain heading"))).toBe("auto");
	expect(textWrapStyle(screen.getByText("Pretty heading"))).toBe("pretty");
	expect(textWrapStyle(screen.getByText("Balanced paragraph"))).toBe("balance");
	expect(textWrapStyle(screen.getByText("Plain paragraph"))).toBe("auto");
});

test("noWrap keeps the text on one line, cut with an ellipsis", () => {
	const element = root({
		variant: "small",
		noWrap: true,
		style: { maxWidth: 120 },
		children:
			"Static Astro pages in a private S3 bucket behind CloudFront and Cloudflare.",
	});
	const style = getComputedStyle(element);
	expect(style.whiteSpace).toBe("nowrap");
	expect(style.overflow).toBe("hidden");
	expect(style.textOverflow).toBe("ellipsis");
	expect(element.scrollWidth).toBeGreaterThan(element.clientWidth);
	expect(element.getBoundingClientRect().height).toBeCloseTo(
		px(style.lineHeight),
		0,
	);
});

test("the root has no margin, and gutterBottom adds half an em below", () => {
	const plain = React.createRef<HTMLElement>();
	const gutter = React.createRef<HTMLElement>();
	render(
		<>
			<Typography ref={plain} variant="heading">
				What I bring to a team
			</Typography>
			<Typography ref={gutter} gutterBottom variant="heading">
				Experience
			</Typography>
		</>,
	);
	const plainStyle = getComputedStyle(current(plain));
	expect([
		plainStyle.marginTop,
		plainStyle.marginRight,
		plainStyle.marginBottom,
		plainStyle.marginLeft,
	]).toEqual(["0px", "0px", "0px", "0px"]);
	const gutterStyle = getComputedStyle(current(gutter));
	expect(gutterStyle.marginTop).toBe("0px");
	expect(px(gutterStyle.marginBottom)).toBeCloseTo(
		px(gutterStyle.fontSize) / 2,
		1,
	);
});

test("fluid sets the site's clamp() size on the display group, from display down to statement", () => {
	const display = root({ variant: "display", fluid: true, children: "Hero" });
	expect(getComputedStyle(display).fontSize).toBe(
		fontSizeOf("clamp(44px, 5.6vw, 80px)"),
	);
	cleanup();
	const statement = root({
		variant: "statement",
		fluid: true,
		children: "I draw the boundaries first.",
	});
	expect(getComputedStyle(statement).fontSize).toBe(
		fontSizeOf("clamp(26px, 3vw, 42px)"),
	);
});

test("without fluid the display group keeps its token size at any width", () => {
	const display = root({ variant: "display", children: "Hero" });
	expect(getComputedStyle(display).fontSize).toBe("80px");
});

test("fluid leaves a variant outside the display group at its token size", () => {
	const ref = React.createRef<HTMLElement>();
	const fluid = React.createRef<HTMLElement>();
	render(
		<>
			<Typography ref={ref} variant="body">
				Body
			</Typography>
			<Typography ref={fluid} fluid variant="body">
				Fluid body
			</Typography>
		</>,
	);
	expect(getComputedStyle(current(fluid)).fontSize).toBe(
		getComputedStyle(current(ref)).fontSize,
	);
});

test("the ref is the rendered element, and className and other attributes land on it", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<Typography
			ref={ref}
			variant="title-md"
			component="h3"
			id="ex-title"
			className="mine"
			data-testid="title"
			aria-describedby="ex-note"
		>
			Training PDFs. A shorter wait.
		</Typography>,
	);
	const element = current(ref);
	expect(element).toBeInstanceOf(HTMLHeadingElement);
	expect(screen.getByTestId("title")).toBe(element);
	expect(element.id).toBe("ex-title");
	expect(element.getAttribute("aria-describedby")).toBe("ex-note");
	expect(element.classList.contains("mine")).toBe(true);
	expect(element.classList.contains("text-title-md")).toBe(true);
});
