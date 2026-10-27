import { cleanup, render, screen } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { afterEach, expect, test } from "vitest";
import { cdp } from "vitest/browser";
import "#ui/styles.css";
import { type PaperProps, Paper } from "#ui";

afterEach(async () => {
	cleanup();
	await emulateMedia([]);
});

async function emulateMedia(
	features: Array<{ name: string; value: string }>,
): Promise<void> {
	const devtools: CDPSession = cdp();
	await devtools.send("Emulation.setEmulatedMedia", { media: "", features });
}

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

function root(props: PaperProps): HTMLElement {
	const ref = React.createRef<HTMLElement>();
	render(<Paper ref={ref} {...props} />);
	return current(ref);
}

type Variant = NonNullable<PaperProps["variant"]>;
type Elevation = NonNullable<PaperProps["elevation"]>;
type Radius = NonNullable<PaperProps["radius"]>;

function resolvedRadius(token: string): string {
	const probe = document.createElement("div");
	probe.style.borderRadius = `var(${token})`;
	document.body.append(probe);
	const radius = getComputedStyle(probe).borderTopLeftRadius;
	probe.remove();
	return radius;
}

test("the variant is glass by default", () => {
	expect(root({ children: "Panel" }).classList.contains("gl-paper-glass")).toBe(
		true,
	);
});

test.each(["glass", "inset", "solid", "outlined"] as const satisfies Variant[])(
	"variant %s sets its surface class on the root",
	(variant) => {
		const element = root({ variant, children: variant });
		expect(element.classList.contains(`gl-paper-${variant}`)).toBe(true);
	},
);

test.each([
	["glass", 2],
	["solid", 1],
	["inset", 0],
	["outlined", 0],
] as const satisfies Array<[Variant, Elevation]>)(
	"elevation defaults to %s's own: %i",
	(variant, elevation) => {
		const element = root({ variant, children: variant });
		for (const level of [0, 1, 2]) {
			expect(element.classList.contains(`gl-elevation-${level}`)).toBe(
				level === elevation,
			);
		}
	},
);

test.each([
	["glass", 0],
	["glass", 1],
	["inset", 2],
	["outlined", 1],
	["solid", 2],
] as const satisfies Array<[Variant, Elevation]>)(
	"elevation overrides the default: %s at %i",
	(variant, elevation) => {
		const element = root({ variant, elevation, children: variant });
		for (const level of [0, 1, 2]) {
			expect(element.classList.contains(`gl-elevation-${level}`)).toBe(
				level === elevation,
			);
		}
	},
);

test.each([
	["glass", "panel"],
	["solid", "panel"],
	["inset", "well"],
	["outlined", "pane"],
] as const satisfies Array<[Variant, Radius]>)(
	"radius defaults to %s's own: %s",
	(variant, radius) => {
		const element = root({ variant, children: variant });
		expect(element.classList.contains(`gl-radius-${radius}`)).toBe(true);
	},
);

test.each(["panel", "pane", "well", "control", "none"] as const)(
	"radius %s rounds the root's corners with that token",
	(radius) => {
		const element = root({ variant: "inset", radius, children: radius });
		const token =
			radius === "panel" && matchMedia("(max-width: 700px)").matches
				? "--radius-panel-sm"
				: `--radius-${radius}`;
		expect(getComputedStyle(element).borderTopLeftRadius).toBe(
			radius === "none" ? "0px" : resolvedRadius(token),
		);
		if (radius !== "well") {
			expect(element.classList.contains("gl-radius-well")).toBe(false);
		}
	},
);

test("component renders the surface as another element", () => {
	render(
		<>
			<Paper component="section" aria-label="Contact">
				Write to me
			</Paper>
			<Paper component="figure" aria-label="Diagram">
				A diagram
			</Paper>
			<Paper component="article" aria-label="Project">
				A project
			</Paper>
		</>,
	);
	expect(screen.getByRole("region", { name: "Contact" }).tagName).toBe(
		"SECTION",
	);
	expect(screen.getByRole("figure", { name: "Diagram" }).tagName).toBe(
		"FIGURE",
	);
	expect(screen.getByRole("article", { name: "Project" }).tagName).toBe(
		"ARTICLE",
	);
});

test("the ref is the root, which renders the children and takes className and other attributes", () => {
	const ref = React.createRef<HTMLElement>();
	render(
		<Paper ref={ref} className="mine" data-testid="panel" id="contact">
			<p>Write to me</p>
		</Paper>,
	);
	const element = current(ref);
	expect(element).toBeInstanceOf(HTMLElement);
	expect(screen.getByTestId("panel")).toBe(element);
	expect(element.id).toBe("contact");
	expect(element.classList.contains("mine")).toBe(true);
	expect(element.contains(screen.getByText("Write to me"))).toBe(true);
});

test("glass falls back to the solid surface, without blur, when the reader prefers reduced transparency", async () => {
	const glass = React.createRef<HTMLElement>();
	const solid = React.createRef<HTMLElement>();
	render(
		<>
			<Paper ref={glass}>Glass</Paper>
			<Paper ref={solid} variant="solid">
				Solid
			</Paper>
		</>,
	);
	expect(getComputedStyle(current(glass)).backdropFilter).not.toBe("none");
	await emulateMedia([
		{ name: "prefers-reduced-transparency", value: "reduce" },
	]);
	expect(matchMedia("(prefers-reduced-transparency: reduce)").matches).toBe(
		true,
	);
	const style = getComputedStyle(current(glass));
	expect(style.backdropFilter).toBe("none");
	expect(style.backgroundColor).toBe(
		getComputedStyle(current(solid)).backgroundColor,
	);
});
