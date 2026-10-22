import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import { AppBar, Toolbar } from "#ui";

afterEach(() => {
	cleanup();
});

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

const links = ["Work", "Projects", "Experience", "Contact"];

/**
The site's identity strip, composed from the documented parts: the brand, the nav pill and
the action.
*/
function IdentityStrip({ current }: { current?: string }) {
	return (
		<>
			<a className="gl-app-bar-brand" href="#top">
				<span className="gl-app-bar-monogram" aria-hidden="true">
					ss
				</span>
				<span className="gl-app-bar-text">
					<strong className="gl-app-bar-title">Sebastian Suarez</strong>
					<span className="gl-app-bar-subtitle">
						Backend lead and architect
					</span>
				</span>
			</a>
			<nav className="gl-app-bar-nav" aria-label="Main navigation">
				{links.map((label) => (
					<a
						key={label}
						className="gl-app-bar-link"
						href={`#${label.toLowerCase()}`}
						aria-current={label === current ? "page" : undefined}
					>
						{label}
					</a>
				))}
			</nav>
			<a className="gl-app-bar-action" href="#resume">
				Read résumé
			</a>
		</>
	);
}

/**
A 200px scroll container with a bar at its top and a long page under it. A transformed
container is the containing block of a fixed bar, as in the preview's frame.
*/
function ScrollingPage({
	scrollerRef,
	barRef,
	position,
	elevateOnScroll,
}: {
	scrollerRef: React.Ref<HTMLDivElement>;
	barRef: React.Ref<HTMLElement>;
	position?: "static" | "sticky" | "fixed";
	elevateOnScroll?: boolean;
}) {
	return (
		<div
			ref={scrollerRef}
			style={{
				height: 200,
				overflowY: "auto",
				transform: position === "fixed" ? "translateZ(0)" : undefined,
			}}
		>
			<AppBar
				ref={barRef}
				position={position}
				elevateOnScroll={elevateOnScroll}
			>
				<Toolbar variant="dense">Sebastian Suarez</Toolbar>
			</AppBar>
			<div style={{ height: 1000 }}>
				Backend lead. Builds the whole machine.
			</div>
		</div>
	);
}

describe("AppBar", () => {
	test("renders a header by default, or the element component names, with the ref on it", () => {
		const header = React.createRef<HTMLElement>();
		const div = React.createRef<HTMLElement>();
		render(
			<>
				<AppBar ref={header}>
					<Toolbar>
						<IdentityStrip />
					</Toolbar>
				</AppBar>
				<AppBar ref={div} component="div">
					<Toolbar>Plain bar</Toolbar>
				</AppBar>
			</>,
		);
		expect(header.current?.tagName).toBe("HEADER");
		expect(header.current).toContainElement(
			screen.getByRole("navigation", { name: "Main navigation" }),
		);
		expect(div.current?.tagName).toBe("DIV");
		expect(div.current).toHaveTextContent("Plain bar");
	});

	test("position puts its class on the bar: static by default, sticky or fixed, and those two sit at z-app-bar", () => {
		const bars = {
			static: React.createRef<HTMLElement>(),
			sticky: React.createRef<HTMLElement>(),
			fixed: React.createRef<HTMLElement>(),
		};
		render(
			<div style={{ transform: "translateZ(0)" }}>
				<AppBar ref={bars.static}>
					<Toolbar>Static</Toolbar>
				</AppBar>
				<AppBar ref={bars.sticky} position="sticky">
					<Toolbar>Sticky</Toolbar>
				</AppBar>
				<AppBar ref={bars.fixed} position="fixed">
					<Toolbar>Fixed</Toolbar>
				</AppBar>
			</div>,
		);
		const positions = ["static", "sticky", "fixed"] as const;
		for (const position of positions) {
			for (const other of positions) {
				const bar = expect(bars[position].current);
				if (other === position) {
					bar.toHaveClass(`gl-app-bar-${other}`);
				} else {
					bar.not.toHaveClass(`gl-app-bar-${other}`);
				}
			}
		}

		const zAppBar = getComputedStyle(document.documentElement)
			.getPropertyValue("--z-app-bar")
			.trim();
		expect(zAppBar).not.toBe("");
		expect(getComputedStyle(must(bars.sticky.current)).zIndex).toBe(zAppBar);
		expect(getComputedStyle(must(bars.fixed.current)).zIndex).toBe(zAppBar);
	});

	test("a fixed bar leaves the flow and spans the top of its containing block, here a transformed frame", () => {
		const frame = React.createRef<HTMLDivElement>();
		const bar = React.createRef<HTMLElement>();
		render(
			<div
				ref={frame}
				style={{ transform: "translateZ(0)", height: 300, overflow: "hidden" }}
			>
				<p style={{ height: 100, margin: 0 }}>Intro</p>
				<AppBar ref={bar} position="fixed">
					<Toolbar variant="dense">Sebastian Suarez</Toolbar>
				</AppBar>
			</div>,
		);
		const frameBox = must(frame.current).getBoundingClientRect();
		const barBox = must(bar.current).getBoundingClientRect();
		expect(barBox.top).toBeCloseTo(frameBox.top, 0);
		expect(barBox.left).toBeCloseTo(frameBox.left, 0);
		expect(barBox.width).toBeCloseTo(frameBox.width, 0);
	});

	test("a sticky bar stays at the top of its scroll container, where a static one scrolls away", () => {
		const scroller = React.createRef<HTMLDivElement>();
		const bar = React.createRef<HTMLElement>();
		const staticScroller = React.createRef<HTMLDivElement>();
		const staticBar = React.createRef<HTMLElement>();
		render(
			<>
				<ScrollingPage scrollerRef={scroller} barRef={bar} position="sticky" />
				<ScrollingPage scrollerRef={staticScroller} barRef={staticBar} />
			</>,
		);
		for (const box of [scroller, staticScroller]) {
			must(box.current).scrollTop = 300;
			expect(must(box.current).scrollTop).toBe(300);
		}

		const top = (ref: React.RefObject<HTMLElement | null>) =>
			must(ref.current).getBoundingClientRect().top;
		expect(top(bar)).toBeCloseTo(top(scroller), 0);
		expect(
			must(staticBar.current).getBoundingClientRect().bottom,
		).toBeLessThanOrEqual(top(staticScroller));
	});

	test.each(["sticky", "fixed"] as const)(
		"elevateOnScroll: a %s bar is flat at the top of its container, lifts once it scrolls, and settles back at the top",
		async (position) => {
			const scroller = React.createRef<HTMLDivElement>();
			const bar = React.createRef<HTMLElement>();
			render(
				<ScrollingPage
					elevateOnScroll
					scrollerRef={scroller}
					barRef={bar}
					position={position}
				/>,
			);
			const shadow = () => getComputedStyle(must(bar.current)).boxShadow;
			await expect.poll(shadow).toBe("none");
			must(scroller.current).scrollTop = 150;
			await expect.poll(shadow).not.toBe("none");
			must(scroller.current).scrollTop = 0;
			await expect.poll(shadow).toBe("none");
		},
	);
});

describe("Toolbar", () => {
	test("renders a div by default, or the element component names, with the ref on it", () => {
		const div = React.createRef<HTMLElement>();
		const nav = React.createRef<HTMLElement>();
		render(
			<AppBar>
				<Toolbar ref={div}>Row</Toolbar>
				<Toolbar ref={nav} component="nav" aria-label="Sections">
					Second row
				</Toolbar>
			</AppBar>,
		);
		expect(div.current?.tagName).toBe("DIV");
		expect(div.current).toHaveTextContent("Row");
		expect(screen.getByRole("navigation", { name: "Sections" })).toBe(
			nav.current,
		);
	});

	test('variant="dense" and disableGutters put their classes on the toolbar', () => {
		const regular = React.createRef<HTMLElement>();
		const dense = React.createRef<HTMLElement>();
		const flush = React.createRef<HTMLElement>();
		render(
			<AppBar>
				<Toolbar ref={regular} variant="regular">
					Regular
				</Toolbar>
				<Toolbar ref={dense} variant="dense">
					Dense
				</Toolbar>
				<Toolbar ref={flush} disableGutters>
					Flush
				</Toolbar>
			</AppBar>,
		);
		expect(dense.current).toHaveClass("gl-toolbar-dense");
		expect(flush.current).toHaveClass("gl-toolbar-flush");
		expect(regular.current).not.toHaveClass("gl-toolbar-dense");
		expect(regular.current).not.toHaveClass("gl-toolbar-flush");
		expect(dense.current).not.toHaveClass("gl-toolbar-flush");
	});
});

describe("Keyboard", () => {
	test("Tab moves brand, links, then the action, in reading order, and the links keep a 2px focus offset", async () => {
		render(
			<>
				<button type="button">Before</button>
				<AppBar>
					<Toolbar>
						<IdentityStrip current="Work" />
					</Toolbar>
				</AppBar>
			</>,
		);
		screen.getByRole("button", { name: "Before" }).focus();
		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("link", { name: /^Sebastian Suarez/v }),
		);

		await userEvent.tab();
		const work = screen.getByRole("link", { name: "Work" });
		expect(document.activeElement).toBe(work);
		expect(work).toHaveAttribute("aria-current", "page");
		expect(work.matches(":focus-visible")).toBe(true);
		expect(getComputedStyle(work).outlineOffset).toBe("2px");

		for (const label of links.slice(1)) {
			// eslint-disable-next-line no-await-in-loop -- each Tab moves on from the last
			await userEvent.tab();
			expect(document.activeElement).toBe(
				screen.getByRole("link", { name: label }),
			);
		}

		await userEvent.tab();
		expect(document.activeElement).toBe(
			screen.getByRole("link", { name: "Read résumé" }),
		);
	});
});
