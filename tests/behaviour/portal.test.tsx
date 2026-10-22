// Behaviour specs for Portal, from design-system/components/Portal/README.md and api.d.ts. What
// it renders without a DOM (nothing, on the server) is the server-HTML gate's.
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import "#ui/styles.css";
import { Portal, type PortalProps } from "#ui";

afterEach(() => {
	cleanup();
	// Nothing a Portal rendered outlives it.
	expect(document.body.childElementCount).toBe(0);
});

const childText = "I'm the portal's child";

function child(): HTMLElement {
	return screen.getByText(childText);
}

/**
The preview's two places: where the Portal is written, and a container next to it.
*/
function Places({
	isShown = true,
	...props
}: Omit<PortalProps, "children"> & { readonly isShown?: boolean }) {
	return (
		<>
			<section data-testid="written">
				{isShown ? (
					<Portal {...props}>
						<span>{childText}</span>
					</Portal>
				) : null}
			</section>
			<section data-testid="target" />
		</>
	);
}

function place(name: "written" | "target"): HTMLElement {
	return screen.getByTestId(name);
}

test("children render into document.body by default, outside the element the Portal is written in", () => {
	render(<Places />);
	expect(place("written").contains(child())).toBe(false);
	expect(child().parentElement).toBe(document.body);
});

test("container: the children render into the element you pass", () => {
	const { rerender } = render(<Places />);
	rerender(<Places container={place("target")} />);
	expect(child().parentElement).toBe(place("target"));
});

test("container: a function that returns the element works the same", () => {
	const { rerender } = render(<Places />);
	const target = place("target");
	rerender(<Places container={() => target} />);
	expect(child().parentElement).toBe(target);
});

test.each([
	{ kind: "null", container: null },
	{ kind: "a function that returns null", container: () => null },
])("container $kind means document.body", ({ container }) => {
	render(<Places container={container} />);
	expect(child().parentElement).toBe(document.body);
});

test("disablePortal renders the children in place", () => {
	render(<Places disablePortal />);
	expect(child().parentElement).toBe(place("written"));
});

test("the children follow container and disablePortal as they change", () => {
	// The preview's container is a ref's element, so it arrives after the first render.
	const { rerender } = render(<Places container={null} />);
	expect(child().parentElement).toBe(document.body);
	const target = place("target");
	rerender(<Places container={target} />);
	expect(child().parentElement).toBe(target);
	rerender(<Places disablePortal container={target} />);
	expect(child().parentElement).toBe(place("written"));
	rerender(<Places container={target} />);
	expect(child().parentElement).toBe(target);
	expect(screen.getAllByText(childText)).toHaveLength(1);
});

test("React context flows from where the Portal is written", () => {
	const ThemeContext = React.createContext("plain");
	function Reader() {
		return <span>{`Theme: ${React.use(ThemeContext)}`}</span>;
	}

	render(
		<ThemeContext value="glass">
			<section data-testid="written">
				<Portal>
					<Reader />
				</Portal>
			</section>
		</ThemeContext>,
	);
	const reader = screen.getByText("Theme: glass");
	expect(place("written").contains(reader)).toBe(false);
});

test("React events bubble from the children to where the Portal is written", async () => {
	const onClick = vi.fn<(event: React.MouseEvent<HTMLElement>) => void>();
	render(
		<section data-testid="written" onClick={onClick}>
			<Portal>
				<button type="button">Copy link</button>
			</Portal>
		</section>,
	);
	const copy = screen.getByRole("button", { name: "Copy link" });
	expect(place("written").contains(copy)).toBe(false);
	await userEvent.click(copy);
	expect(onClick).toHaveBeenCalledTimes(1);
	expect(onClick.mock.calls[0][0].target).toBe(copy);
});

test("unmounting removes the children from the container", () => {
	const { rerender } = render(<Places />);
	const target = place("target");
	rerender(<Places container={target} />);
	expect(target.contains(child())).toBe(true);
	rerender(<Places isShown={false} container={target} />);
	expect(place("target")).toBe(target);
	expect(screen.queryByText(childText)).toBeNull();
	expect(target.childElementCount).toBe(0);
});
