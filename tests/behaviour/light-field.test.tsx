import { cleanup, render, screen } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import "#ui/styles.css";
import { type LightFieldProps, LightField } from "#ui";

afterEach(async () => {
	cleanup();
	await emulateMedia("", []);
});

/**
Emulates a media type and media features through Chromium's DevTools protocol; empty values clear them.
*/
async function emulateMedia(
	media: string,
	features: Array<{ name: string; value: string }>,
): Promise<void> {
	const devtools: CDPSession = cdp();
	await devtools.send("Emulation.setEmulatedMedia", { media, features });
}

function current<T>(ref: React.RefObject<T | null>): T {
	if (ref.current === null) {
		throw new Error("the ref is empty");
	}

	return ref.current;
}

// What the README asks of the container: position relative, isolation isolate, overflow clip.
const box: React.CSSProperties = {
	position: "relative",
	isolation: "isolate",
	overflow: "clip",
	width: 320,
	height: 200,
};

/**
Renders a field in the documented container and returns both, through the refs.
*/
function field(props: LightFieldProps = {}): {
	container: HTMLElement;
	field: HTMLDivElement;
} {
	const container = React.createRef<HTMLDivElement>();
	const ref = React.createRef<HTMLDivElement>();
	render(
		<div ref={container} style={box}>
			<LightField ref={ref} {...props} />
			<p>Content over the field</p>
		</div>,
	);
	return { container: current(container), field: current(ref) };
}

test("the field is decorative: aria-hidden, so it carries no meaning", () => {
	const { field: element } = field({ variant: "compact" });
	expect(element.getAttribute("aria-hidden")).toBe("true");
});

test("the ref is the field's div, which takes className and other attributes", () => {
	const { field: element } = field({ className: "mine", id: "hero-field" });
	expect(element).toBeInstanceOf(HTMLDivElement);
	expect(element.classList.contains("mine")).toBe(true);
	expect(element.id).toBe("hero-field");
});

// The api lists no default; the reference uses top, the hero's placement, and lists it first.
test("the placement is top by default", () => {
	const { field: element } = field();
	expect(element.classList.contains("gl-light-field-top")).toBe(true);
});

test.each(["top", "middle", "bottom", "compact"] as const)(
	"variant %s sets that placement's class on the root",
	(variant) => {
		const { field: element } = field({ variant });
		expect(element.classList.contains(`gl-light-field-${variant}`)).toBe(true);
	},
);

test("it paints behind the container's content and lets clicks through to it", async () => {
	const onClick = vi.fn<(event: React.MouseEvent<HTMLButtonElement>) => void>();
	const ref = React.createRef<HTMLDivElement>();
	render(
		<div style={box}>
			<LightField ref={ref} variant="compact" />
			<button type="button" onClick={onClick}>
				See the work
			</button>
		</div>,
	);
	expect(getComputedStyle(current(ref)).zIndex).toBe("-1");
	const button = screen.getByRole("button", { name: "See the work" });
	const { left, right, top, bottom } = button.getBoundingClientRect();
	expect(
		document.elementFromPoint((left + right) / 2, (top + bottom) / 2),
	).toBe(button);
	await userEvent.click(button);
	expect(onClick).toHaveBeenCalledTimes(1);
});

test("compact fills the box it sits in", () => {
	const { container, field: element } = field({ variant: "compact" });
	const outer = container.getBoundingClientRect();
	const inner = element.getBoundingClientRect();
	expect([inner.left, inner.top, inner.width, inner.height]).toEqual([
		outer.left,
		outer.top,
		outer.width,
		outer.height,
	]);
});

test("under reduced transparency it drops to 40% opacity", async () => {
	const { field: element } = field({ variant: "compact" });
	expect(getComputedStyle(element).opacity).toBe("1");
	await emulateMedia("", [
		{ name: "prefers-reduced-transparency", value: "reduce" },
	]);
	expect(matchMedia("(prefers-reduced-transparency: reduce)").matches).toBe(
		true,
	);
	expect(getComputedStyle(element).opacity).toBe("0.4");
});

test("it is hidden in print", async () => {
	const { field: element } = field({ variant: "top" });
	expect(getComputedStyle(element).display).not.toBe("none");
	await emulateMedia("print", []);
	expect(matchMedia("print").matches).toBe(true);
	expect(getComputedStyle(element).display).toBe("none");
});
