import { cleanup, render, screen } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import { cdp } from "vitest/browser";
import "#ui/styles.css";
import { CssBaseline } from "#ui";

afterEach(async () => {
	cleanup();
	await emulateMedia([]);
});

/**
Emulates media features through Chromium's DevTools protocol; an empty list clears them.
*/
async function emulateMedia(
	features: Array<{ name: string; value: string }>,
): Promise<void> {
	const devtools: CDPSession = cdp();
	await devtools.send("Emulation.setEmulatedMedia", { media: "", features });
}

function styleOf(testId: string): CSSStyleDeclaration {
	return getComputedStyle(screen.getByTestId(testId));
}

function margins(testId: string): string[] {
	const style = styleOf(testId);
	return [
		style.marginTop,
		style.marginRight,
		style.marginBottom,
		style.marginLeft,
	];
}

const none = ["0px", "0px", "0px", "0px"];

const sheets = () =>
	document.styleSheets.length + document.adoptedStyleSheets.length;

/**
Plain elements that the user agent styles, and a CssBaseline that comes and goes beside
them, so the same elements are measured with and without the resets.
*/
function Page({ baseline }: { readonly baseline: boolean }) {
	return (
		<div
			style={{
				fontFamily: "Georgia, serif",
				fontSize: 13,
				color: "rgb(10, 20, 30)",
				letterSpacing: "1px",
			}}
		>
			{baseline ? <CssBaseline /> : null}
			<h1 data-testid="h1">Backend lead.</h1>
			<h2 data-testid="h2">What I bring to a team</h2>
			<h3 data-testid="h3">Data and cloud</h3>
			<h4 data-testid="h4">Review and CI</h4>
			<h5 data-testid="h5">Fine print</h5>
			<h6 data-testid="h6">Finer print</h6>
			<p data-testid="p">I work on backend services.</p>
			<figure data-testid="figure">A figure</figure>
			<blockquote data-testid="blockquote">A quote</blockquote>
			<dl data-testid="dl">
				<dt>Term</dt>
				<dd data-testid="dd">Definition</dd>
			</dl>
			<pre data-testid="pre">astro check</pre>
			<ul data-testid="ul">
				<li>Node.js</li>
			</ul>
			<ol data-testid="ol">
				<li>Domain</li>
			</ol>
			<menu data-testid="menu">
				<li>Copy</li>
			</menu>
			<img
				data-testid="img"
				alt="A dot"
				src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=="
			/>
			<button data-testid="button" type="button">
				Send
			</button>
			<input data-testid="input" aria-label="Name" />
			<select data-testid="select" aria-label="Topic">
				<option>Work</option>
			</select>
			<textarea data-testid="textarea" aria-label="Message" />
		</div>
	);
}

const marginTags = [
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"p",
	"figure",
	"blockquote",
	"dl",
	"dd",
	"pre",
];

const lists = ["ul", "ol", "menu"];

const controls = ["button", "input", "select", "textarea"];

test("it renders its children unchanged, with no wrapper", () => {
	const { container } = render(
		<CssBaseline>
			<p id="lede" className="text-lede">
				Node.js, TypeScript and AWS backends.
			</p>
		</CssBaseline>,
	);
	const lede = screen.getByText("Node.js, TypeScript and AWS backends.");
	expect(lede.parentElement).toBe(container);
	expect(lede.outerHTML).toBe(
		'<p id="lede" class="text-lede">Node.js, TypeScript and AWS backends.</p>',
	);
});

test("while it's mounted, headings, paragraphs, figures, quotes, definition lists and pre lose their margins", () => {
	const { rerender } = render(<Page baseline={false} />);
	for (const tag of marginTags) {
		expect(margins(tag), tag).not.toEqual(none);
	}

	rerender(<Page baseline />);
	for (const tag of marginTags) {
		expect(margins(tag), tag).toEqual(none);
	}

	rerender(<Page baseline={false} />);
	for (const tag of marginTags) {
		expect(margins(tag), tag).not.toEqual(none);
	}
});

test("while it's mounted, lists lose their bullets, indent and margins", () => {
	const { rerender } = render(<Page baseline={false} />);
	for (const tag of lists) {
		expect(styleOf(tag).paddingInlineStart, tag).not.toBe("0px");
	}

	expect(styleOf("ul").listStyleType).not.toBe("none");
	rerender(<Page baseline />);
	for (const tag of lists) {
		const style = styleOf(tag);
		expect(style.listStyleType, tag).toBe("none");
		expect(style.paddingInlineStart, tag).toBe("0px");
		expect(margins(tag), tag).toEqual(none);
	}

	rerender(<Page baseline={false} />);
	expect(styleOf("ul").listStyleType).not.toBe("none");
});

test("while it's mounted, form controls inherit the font and colour, and buttons lose their chrome", () => {
	const { rerender } = render(<Page baseline={false} />);
	expect(styleOf("button").fontFamily).not.toBe("Georgia, serif");
	rerender(<Page baseline />);
	for (const tag of controls) {
		const style = styleOf(tag);
		expect(style.fontFamily, tag).toBe("Georgia, serif");
		expect(style.fontSize, tag).toBe("13px");
		expect(style.color, tag).toBe("rgb(10, 20, 30)");
		expect(style.letterSpacing, tag).toBe("1px");
	}

	const button = styleOf("button");
	expect(button.backgroundColor).toBe("rgba(0, 0, 0, 0)");
	expect(button.borderTopWidth).toBe("0px");
	expect([
		button.paddingTop,
		button.paddingRight,
		button.paddingBottom,
		button.paddingLeft,
	]).toEqual(none);
	expect(button.cursor).toBe("pointer");
	rerender(<Page baseline={false} />);
	expect(styleOf("button").fontFamily).not.toBe("Georgia, serif");
});

test("while it's mounted, images are block-level", () => {
	const { rerender } = render(<Page baseline={false} />);
	expect(styleOf("img").display).toBe("inline");
	rerender(<Page baseline />);
	expect(styleOf("img").display).toBe("block");
	rerender(<Page baseline={false} />);
	expect(styleOf("img").display).toBe("inline");
});

test("while it's mounted, headings h1 to h4 balance and paragraphs wrap pretty", () => {
	const { rerender } = render(<Page baseline={false} />);
	const wrap = (testId: string) =>
		styleOf(testId).getPropertyValue("text-wrap-style");
	expect(wrap("h2")).not.toBe("balance");
	expect(wrap("p")).not.toBe("pretty");
	rerender(<Page baseline />);
	for (const tag of ["h1", "h2", "h3", "h4"]) {
		expect(wrap(tag), tag).toBe("balance");
	}

	expect(wrap("p")).toBe("pretty");
	rerender(<Page baseline={false} />);
	expect(wrap("h2")).not.toBe("balance");
});

test("the resets are added once per document and last until the last CssBaseline unmounts", () => {
	function Twice({
		first,
		second,
	}: {
		readonly first: boolean;
		readonly second: boolean;
	}) {
		return (
			<>
				{first ? <CssBaseline /> : null}
				{second ? <CssBaseline /> : null}
				<ul data-testid="ul">
					<li>Node.js</li>
				</ul>
			</>
		);
	}

	const before = sheets();
	const { rerender } = render(<Twice first={false} second={false} />);
	expect(styleOf("ul").listStyleType).not.toBe("none");
	rerender(<Twice first second={false} />);
	expect(styleOf("ul").listStyleType).toBe("none");
	const once = sheets();
	expect(once - before).toBeLessThanOrEqual(1);
	rerender(<Twice first second />);
	expect(sheets()).toBe(once);
	rerender(<Twice second first={false} />);
	expect(styleOf("ul").listStyleType).toBe("none");
	rerender(<Twice first={false} second={false} />);
	expect(styleOf("ul").listStyleType).not.toBe("none");
	expect(sheets()).toBe(before);
});

test("the resets sit in the gl-base layer, so your unlayered CSS and the components' layer both win", () => {
	// :where() has no specificity, so these rules win only through the cascade layers.
	render(
		<>
			<style>
				{`:where(.unlayered) { padding-inline-start: 9px; }
@layer gl-components { :where(.component) { padding-inline-start: 11px; } }`}
			</style>
			<CssBaseline />
			<ul data-testid="unlayered" className="unlayered">
				<li>Node.js</li>
			</ul>
			<ul data-testid="component" className="component">
				<li>AWS</li>
			</ul>
			<ul data-testid="plain">
				<li>PostgreSQL</li>
			</ul>
		</>,
	);
	expect(styleOf("plain").paddingInlineStart).toBe("0px");
	expect(styleOf("unlayered").paddingInlineStart).toBe("9px");
	expect(styleOf("component").paddingInlineStart).toBe("11px");
});

test("smooth scrolling is on while it's mounted, only when the reader allows motion", async () => {
	const scrolling = () =>
		getComputedStyle(document.documentElement).scrollBehavior;
	const motion = async (value: "reduce" | "no-preference") => {
		await emulateMedia([{ name: "prefers-reduced-motion", value }]);
	};

	await motion("no-preference");
	const { rerender } = render(<Page baseline={false} />);
	expect(scrolling()).toBe("auto");
	rerender(<Page baseline />);
	expect(scrolling()).toBe("smooth");
	await motion("reduce");
	expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
	expect(scrolling()).toBe("auto");
	await motion("no-preference");
	expect(scrolling()).toBe("smooth");
	rerender(<Page baseline={false} />);
	expect(scrolling()).toBe("auto");
});
