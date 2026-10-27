import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import "#ui/styles.css";
import { Fab, type FabProps, Icon, Zoom } from "#ui";

function px(value: string): number {
	return Number(value.replace(/px$/v, ""));
}

async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; left: 0; bottom: 0; width: 8px; height: 8px";
	document.body.append(spot);
	try {
		await userEvent.hover(spot);
	} finally {
		spot.remove();
	}
}

beforeEach(async () => {
	await parkPointer();
});

afterEach(() => {
	cleanup();
	window.history.replaceState(
		null,
		"",
		window.location.pathname + window.location.search,
	);
});

type OnClick = (event: React.MouseEvent<HTMLButtonElement>) => void;
type Size = NonNullable<FabProps["size"]>;

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function dimensions(element: Element): [number, number] {
	const { width, height } = box(element);
	return [Math.round(width), Math.round(height)];
}

function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

function resolved(
	property:
		| "backgroundColor"
		| "color"
		| "boxShadow"
		| "backdropFilter"
		| "borderTopLeftRadius"
		| "transitionDuration"
		| "zIndex",
	token: string,
): string {
	const probe = document.createElement("div");
	probe.style.position = "relative";
	probe.style[property] =
		property === "backdropFilter" ? `blur(var(${token}))` : `var(${token})`;
	document.body.append(probe);
	const value = getComputedStyle(probe)[property];
	probe.remove();
	return value;
}

function alphaOf(color: string): number {
	const channels = color.match(/[\d.]+/gv) ?? [];
	return channels.length === 4 ? Number(channels[3]) : 1;
}

function textNode(element: Element, text: string): Node {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if (node.textContent?.includes(text)) {
			return node;
		}
	}

	throw new Error(`No text "${text}" in the element`);
}

function transitionsOf(element: Element): Map<string, string> {
	const style = getComputedStyle(element);
	const properties = style.transitionProperty.split(", ");
	const durations = style.transitionDuration.split(", ");
	return new Map(
		properties.map((property, index) => [
			property,
			durations[index % durations.length],
		]),
	);
}

function inputPoint(element: Element): { x: number; y: number } {
	const frame = window.frameElement;
	const offset = frame ? box(frame) : { left: 0, top: 0 };
	const scale = frame ? new DOMMatrix(getComputedStyle(frame).transform).a : 1;
	const { left, top, width, height } = box(element);
	const halfWidth = width / 2;
	const halfHeight = height / 2;
	const scaledX = scale * (left + halfWidth);
	const scaledY = scale * (top + halfHeight);
	return {
		x: offset.left + scaledX,
		y: offset.top + scaledY,
	};
}

async function press(
	element: Element,
	whilePressed: () => Promise<void>,
): Promise<void> {
	const { x, y } = inputPoint(element);
	const mouse = { x, y, button: "left", clickCount: 1 } as const;
	await cdp().send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
	await cdp().send("Input.dispatchMouseEvent", {
		type: "mousePressed",
		...mouse,
	});
	try {
		await whilePressed();
	} finally {
		await cdp().send("Input.dispatchMouseEvent", {
			type: "mouseReleased",
			...mouse,
		});
	}
}

function Around({ children }: { readonly children: React.ReactNode }) {
	return (
		<>
			<button type="button">Before</button>
			{children}
			<button type="button">After</button>
		</>
	);
}

async function entered(fab: HTMLElement): Promise<void> {
	await expect
		.poll(() => {
			const style = getComputedStyle(fab);
			return [style.visibility, style.opacity, style.transform];
		})
		.toEqual(["visible", "1", "none"]);
}

const sizes = [
	["sm", 36, 16],
	["md", 46, 18],
	["lg", 56, 20],
] as const satisfies ReadonlyArray<readonly [Size, number, number]>;

describe("Fab: element, name and ref", () => {
	test('it renders a native button of type "button", named by aria-label when it shows only an icon, and the ref is that button', () => {
		const ref = React.createRef<HTMLButtonElement | HTMLAnchorElement>();
		render(
			<Fab ref={ref} aria-label="Email me">
				<Icon name="mail" />
			</Fab>,
		);
		const fab = button("Email me");
		expect(fab).toBeInstanceOf(HTMLButtonElement);
		expect(fab).toHaveAttribute("type", "button");
		expect(ref.current).toBe(fab);
	});

	test('so by default it doesn\'t submit its form; type="submit" submits it, and type="reset" resets it', async () => {
		const onSubmit = vi.fn((event: React.SubmitEvent) => {
			event.preventDefault();
		});
		render(
			<form onSubmit={onSubmit}>
				<input aria-label="Message" defaultValue="Hello" />
				<Fab aria-label="Add">
					<Icon name="plus" />
				</Fab>
				<Fab type="reset" aria-label="Clear">
					<Icon name="close" />
				</Fab>
				<Fab type="submit" aria-label="Send">
					<Icon name="send" />
				</Fab>
			</form>,
		);
		await userEvent.click(button("Add"));
		expect(onSubmit).not.toHaveBeenCalled();
		await userEvent.click(button("Send"));
		expect(onSubmit).toHaveBeenCalledTimes(1);
		const input = screen.getByRole("textbox", { name: "Message" });
		await userEvent.fill(input, "Changed");
		await userEvent.click(button("Clear"));
		expect(input).toHaveValue("Hello");
	});

	test("href renders a link with the same look, with its target and rel, className and style, and the ref is that anchor", () => {
		const ref = React.createRef<HTMLButtonElement | HTMLAnchorElement>();
		render(
			<>
				<Fab aria-label="Email me as a button">
					<Icon name="mail" />
				</Fab>
				<Fab
					ref={ref}
					href="mailto:contact@sebastiansuarez.dev"
					target="_blank"
					rel="noopener"
					className="pinned"
					style={{ marginLeft: 12 }}
					aria-label="Email me"
				>
					<Icon name="mail" />
				</Fab>
			</>,
		);
		const link = screen.getByRole("link", { name: "Email me" });
		expect(link).toBeInstanceOf(HTMLAnchorElement);
		expect(ref.current).toBe(link);
		expect(link).toHaveAttribute("href", "mailto:contact@sebastiansuarez.dev");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener");
		expect(link).toHaveClass("pinned");
		expect(getComputedStyle(link).marginLeft).toBe("12px");
		const asLink = getComputedStyle(link);
		const asButton = getComputedStyle(button("Email me as a button"));
		expect(dimensions(link)).toEqual(
			dimensions(button("Email me as a button")),
		);
		expect(asLink.backgroundColor).toBe(asButton.backgroundColor);
		expect(asLink.color).toBe(asButton.color);
		expect(asLink.borderTopLeftRadius).toBe(asButton.borderTopLeftRadius);
		expect(asLink.boxShadow).toBe(asButton.boxShadow);
	});

	test("an extended Fab is named by its label, and shows the icon, then the label", () => {
		const icon = React.createRef<SVGSVGElement>();
		render(
			<Fab extended>
				<Icon ref={icon} name="mail" />
				Email me
			</Fab>,
		);
		const fab = button("Email me");
		const glyph = must(icon.current);
		const label = textNode(fab, "Email me");
		expect(fab.contains(glyph)).toBe(true);
		expect(glyph.compareDocumentPosition(label)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		);
		const range = document.createRange();
		range.selectNodeContents(label);
		const text = range.getBoundingClientRect();
		expect(text.width).toBeGreaterThan(0);
		expect(text.left).toBeGreaterThanOrEqual(box(glyph).right);
		expect(text.right).toBeLessThanOrEqual(box(fab).right);
	});

	test("className, style and the other button attributes reach the button", () => {
		render(
			<>
				<p id="fab-hint">Opens your mail app.</p>
				<form id="contact" />
				<Fab
					id="email"
					name="intent"
					value="email"
					form="contact"
					title="Email me"
					aria-label="Email me"
					aria-describedby="fab-hint"
					data-track="email"
					className="pinned"
					style={{ marginLeft: 12 }}
				>
					<Icon name="mail" />
				</Fab>
			</>,
		);
		const fab = button("Email me");
		expect(fab.id).toBe("email");
		expect(fab).toHaveAttribute("name", "intent");
		expect(fab).toHaveAttribute("value", "email");
		expect((fab as HTMLButtonElement).form).toBe(
			document.querySelector("#contact"),
		);
		expect(fab).toHaveAttribute("title", "Email me");
		expect(fab).toHaveAccessibleDescription("Opens your mail app.");
		expect(fab).toHaveAttribute("data-track", "email");
		expect(fab).toHaveClass("pinned");
		expect(getComputedStyle(fab).marginLeft).toBe("12px");
	});

	test("onClick gets the click event", async () => {
		const onClick = vi.fn<OnClick>();
		render(
			<Fab aria-label="Email me" onClick={onClick}>
				<Icon name="mail" />
			</Fab>,
		);
		await userEvent.click(button("Email me"));
		expect(onClick).toHaveBeenCalledTimes(1);
		const [event] = onClick.mock.calls[0] ?? [];
		expect(event?.type).toBe("click");
		expect(event?.nativeEvent).toBeInstanceOf(MouseEvent);
	});

	test("it doesn't position itself, and the README's pinning puts it 16px from the viewport's bottom-right corner, at z-fab", () => {
		render(
			<>
				<Fab aria-label="In the flow">
					<Icon name="mail" />
				</Fab>
				<Fab
					aria-label="Pinned"
					style={{
						position: "fixed",
						right: "calc(var(--space-md) + env(safe-area-inset-right, 0px))",
						bottom: "calc(var(--space-md) + env(safe-area-inset-bottom, 0px))",
						zIndex: "var(--z-fab)",
					}}
				>
					<Icon name="mail" />
				</Fab>
			</>,
		);
		expect(getComputedStyle(button("In the flow")).position).not.toMatch(
			/^(?:fixed|absolute|sticky)$/v,
		);
		const pinned = box(button("Pinned"));
		expect(
			Math.round(document.documentElement.clientWidth - pinned.right),
		).toBe(16);
		expect(Math.round(window.innerHeight - pinned.bottom)).toBe(16);
		expect(getComputedStyle(button("Pinned")).zIndex).toBe(
			resolved("zIndex", "--z-fab"),
		);
	});
});

describe("Fab: keyboard", () => {
	test("Tab reaches it, and Enter and Space activate it, as any button", async () => {
		const onClick = vi.fn<OnClick>();
		render(
			<Around>
				<Fab variant="glass" aria-label="Back to top" onClick={onClick}>
					<Icon name="arrow-up" />
				</Fab>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("Back to top")).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		await userEvent.keyboard(" ");
		expect(onClick).toHaveBeenCalledTimes(2);
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
	});

	test("Tab reaches a link Fab, and Enter follows it", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Around>
				<Fab
					href="#top"
					variant="glass"
					aria-label="Back to top"
					onClick={onClick}
				>
					<Icon name="arrow-up" />
				</Fab>
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		const link = screen.getByRole("link", { name: "Back to top" });
		await expect.element(link).toHaveFocus();
		await userEvent.keyboard("{Enter}");
		expect(onClick).toHaveBeenCalledTimes(1);
		await expect.poll(() => window.location.hash).toBe("#top");
	});
});

describe("Fab: variant and size", () => {
	test("variant primary, the default, is the ink circle: color-ink fill, on-ink content and the primary shadow", async () => {
		render(
			<>
				<Fab aria-label="Default">
					<Icon name="mail" />
				</Fab>
				<Fab variant="primary" aria-label="Primary">
					<Icon name="mail" />
				</Fab>
			</>,
		);
		for (const name of ["Default", "Primary"]) {
			// eslint-disable-next-line no-await-in-loop -- each one settles on its own
			await expect
				.poll(() => getComputedStyle(button(name)).backgroundColor)
				.toBe(resolved("backgroundColor", "--color-ink"));
			const style = getComputedStyle(button(name));
			expect(style.color).toBe(resolved("color", "--on-ink"));
			expect(style.boxShadow).toBe(resolved("boxShadow", "--shadow-primary"));
		}
	});

	test("under a fine pointer, primary turns ink-hover", async () => {
		render(
			<Fab aria-label="Email me">
				<Icon name="mail" />
			</Fab>,
		);
		await userEvent.hover(button("Email me"));
		await expect
			.poll(() => getComputedStyle(button("Email me")).backgroundColor)
			.toBe(resolved("backgroundColor", "--ink-hover"));
	});

	test("variant glass is the frosted circle: the control shadow and blur over white at 0.5, which rises to 0.75 under a fine pointer", async () => {
		render(
			<Fab variant="glass" aria-label="Back to top">
				<Icon name="arrow-up" />
			</Fab>,
		);
		const fab = button("Back to top");
		const style = getComputedStyle(fab);
		expect(style.boxShadow).toBe(resolved("boxShadow", "--shadow-control"));
		expect(style.backdropFilter).toBe(
			resolved("backdropFilter", "--blur-control"),
		);
		await expect
			.poll(() => alphaOf(getComputedStyle(fab).backgroundColor))
			.toBe(0.5);
		await userEvent.hover(fab);
		await expect
			.poll(() => alphaOf(getComputedStyle(fab).backgroundColor))
			.toBe(0.75);
	});

	test("the default size is md, the 46px circle", () => {
		render(
			<Fab aria-label="Email me">
				<Icon name="mail" />
			</Fab>,
		);
		expect(dimensions(button("Email me"))).toEqual([46, 46]);
	});

	test.each(sizes)("size %s is a %ipx circle", (size, side) => {
		render(
			<Fab size={size} aria-label="Email me">
				<Icon name="mail" />
			</Fab>,
		);
		const fab = button("Email me");
		expect(dimensions(fab)).toEqual([side, side]);
		expect(
			px(getComputedStyle(fab).borderTopLeftRadius),
		).toBeGreaterThanOrEqual(side / 2);
	});

	test.each(sizes)(
		"at size %s (%ipx) its Icon is drawn at %ipx",
		(size, _side, iconSide) => {
			const icon = React.createRef<SVGSVGElement>();
			render(
				<Fab size={size} aria-label="Email me">
					<Icon ref={icon} name="mail" />
				</Fab>,
			);
			expect(dimensions(must(icon.current))).toEqual([iconSide, iconSide]);
		},
	);

	test.each(sizes)(
		"extended at size %s is a pill %ipx tall, wider than tall, with pill corners",
		(size, side) => {
			render(
				<Fab extended size={size}>
					<Icon name="mail" />
					Email me
				</Fab>,
			);
			const fab = button("Email me");
			const [width, height] = dimensions(fab);
			expect(height).toBe(side);
			expect(width).toBeGreaterThan(height * 2);
			expect(getComputedStyle(fab).borderTopLeftRadius).toBe(
				resolved("borderTopLeftRadius", "--radius-pill"),
			);
		},
	);
});

describe("Fab: disabled", () => {
	test("disabled disables it, and a click does nothing", async () => {
		const onClick = vi.fn<OnClick>();
		render(
			<Fab disabled aria-label="Email me" onClick={onClick}>
				<Icon name="mail" />
			</Fab>,
		);
		expect(isDisabled(button("Email me"))).toBe(true);
		await userEvent.click(button("Email me"), { force: true });
		expect(onClick).not.toHaveBeenCalled();
	});

	test("a disabled link Fab is aria-disabled, and neither follows its href nor calls onClick", async () => {
		const onClick = vi.fn<() => void>();
		render(
			<Fab disabled href="#top" aria-label="Back to top" onClick={onClick}>
				<Icon name="arrow-up" />
			</Fab>,
		);
		const link = screen.getByRole("link", { name: "Back to top" });
		expect(link).toHaveAttribute("aria-disabled", "true");
		await userEvent.click(link, { force: true });
		expect(onClick).not.toHaveBeenCalled();
		expect(window.location.hash).toBe("");
	});
});

describe("Fab: inside Zoom", () => {
	test("inside Zoom it's hidden while in is false, and shown once in turns true", async () => {
		const view = (isIn: boolean) => (
			<Zoom in={isIn}>
				<Fab variant="glass" aria-label="Back to top">
					<Icon name="arrow-up" />
				</Fab>
			</Zoom>
		);
		const { rerender } = render(view(false));
		expect(screen.queryByRole("button", { name: "Back to top" })).toBeNull();
		rerender(view(true));
		await entered(await screen.findByRole("button", { name: "Back to top" }));
		rerender(view(false));
		await expect
			.poll(() => screen.queryByRole("button", { name: "Back to top" }))
			.toBeNull();
	});

	test("inside Zoom its ref, className and style still land on the button", async () => {
		const ref = React.createRef<HTMLButtonElement | HTMLAnchorElement>();
		render(
			<Zoom in>
				<Fab
					ref={ref}
					className="pinned"
					style={{ marginLeft: 12 }}
					aria-label="Back to top"
				>
					<Icon name="arrow-up" />
				</Fab>
			</Zoom>,
		);
		const fab = button("Back to top");
		await entered(fab);
		expect(ref.current).toBe(fab);
		expect(fab).toHaveClass("pinned");
		expect(getComputedStyle(fab).marginLeft).toBe("12px");
	});

	test("it keeps its own hover and press transitions when Zoom sets transition inline", async () => {
		render(
			<>
				<Fab aria-label="Alone">
					<Icon name="arrow-up" />
				</Fab>
				<Zoom in>
					<Fab aria-label="Zoomed">
						<Icon name="arrow-up" />
					</Fab>
				</Zoom>
			</>,
		);
		const alone = transitionsOf(button("Alone"));
		const hover = resolved("transitionDuration", "--duration-hover");
		const pressDuration = resolved("transitionDuration", "--duration-press");
		expect(alone.get("background-color")).toBe(hover);
		expect(alone.get("box-shadow")).toBe(hover);
		expect(alone.get("color")).toBe(hover);
		expect(alone.get("scale")).toBe(pressDuration);

		const zoomed = button("Zoomed");
		await entered(zoomed);
		const both = transitionsOf(zoomed);
		for (const [property, duration] of alone) {
			expect(both.get(property)).toBe(duration);
		}

		expect(both.has("opacity")).toBe(true);
		expect(both.has("transform")).toBe(true);
	});

	test("a press scales it through the scale property, so Zoom's transform stays as it is", async () => {
		render(
			<Zoom in>
				<Fab aria-label="Back to top">
					<Icon name="arrow-up" />
				</Fab>
			</Zoom>,
		);
		const fab = button("Back to top");
		await entered(fab);
		await press(fab, async () => {
			await expect
				.poll(() => Number(getComputedStyle(fab).scale))
				.toBeLessThan(1);
			expect(getComputedStyle(fab).transform).toBe("none");
			expect(getComputedStyle(fab).opacity).toBe("1");
		});
		await expect.poll(() => getComputedStyle(fab).scale).toBe("none");
	});
});
