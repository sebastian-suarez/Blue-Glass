import { act, cleanup, render, screen } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, test } from "vitest";
import { cdp, page } from "vitest/browser";
import "#ui/styles.css";
import { type UseMediaQueryOptions, media, useMediaQuery } from "#ui";

const frame = { width: window.innerWidth, height: window.innerHeight };

afterEach(async () => {
	cleanup();
	await emulateMedia([]);
	await page.viewport(frame.width, frame.height);
});

async function emulateMedia(
	features: Array<{ name: string; value: string }>,
): Promise<void> {
	const devtools: CDPSession = cdp();
	await devtools.send("Emulation.setEmulatedMedia", { media: "", features });
}

type MediaName = keyof typeof media;

const names = Object.keys(media) as MediaName[];

function Probe({
	name,
	query,
	options,
}: {
	readonly name: string;
	readonly query: string;
	readonly options?: UseMediaQueryOptions;
}) {
	const isMatching = useMediaQuery(query, options);
	return <span data-testid={name}>{String(isMatching)}</span>;
}

function values(list: readonly MediaName[]): Record<string, string | null> {
	return Object.fromEntries(
		list.map((name) => [name, screen.getByTestId(name).textContent]),
	);
}

async function settle(
	list: readonly MediaName[],
	expected: Record<string, string>,
): Promise<void> {
	await expect.poll(() => values(list)).toEqual(expected);
}

function value(): string | null {
	return screen.getByTestId("value").textContent;
}

test("media holds the site's breakpoints and the input and preference queries it gates on", () => {
	expect(media).toEqual({
		tiny: "(max-width: 360px)",
		phone: "(max-width: 700px)",
		tablet: "(max-width: 899px)",
		desktop: "(min-width: 900px)",
		compact: "(max-width: 1000px)",
		hover: "(hover: hover) and (pointer: fine)",
		reducedMotion: "(prefers-reduced-motion: reduce)",
		reducedTransparency: "(prefers-reduced-transparency: reduce)",
	});
});

test("it returns whether each query matches now", () => {
	render(
		<>
			{names.map((name) => (
				<Probe key={name} name={name} query={media[name]} />
			))}
		</>,
	);
	for (const name of names) {
		expect(screen.getByTestId(name).textContent, name).toBe(
			String(matchMedia(media[name]).matches),
		);
	}
});

test("it re-renders with the new value when the viewport crosses a breakpoint", async () => {
	const breakpoints = [
		"tiny",
		"phone",
		"tablet",
		"desktop",
		"compact",
	] as const satisfies MediaName[];
	render(
		<>
			{breakpoints.map((name) => (
				<Probe key={name} name={name} query={media[name]} />
			))}
		</>,
	);
	await page.viewport(600, 800);
	await settle(breakpoints, {
		tiny: "false",
		phone: "true",
		tablet: "true",
		desktop: "false",
		compact: "true",
	});
	await page.viewport(1280, 800);
	await settle(breakpoints, {
		tiny: "false",
		phone: "false",
		tablet: "false",
		desktop: "true",
		compact: "false",
	});
	await page.viewport(950, 800);
	await settle(breakpoints, {
		tiny: "false",
		phone: "false",
		tablet: "false",
		desktop: "true",
		compact: "true",
	});
	await page.viewport(360, 800);
	await settle(breakpoints, {
		tiny: "true",
		phone: "true",
		tablet: "true",
		desktop: "false",
		compact: "true",
	});
});

test("it follows the reader's preferences live: reduced motion and reduced transparency", async () => {
	const preferences = [
		"reducedMotion",
		"reducedTransparency",
	] as const satisfies MediaName[];
	await emulateMedia([
		{ name: "prefers-reduced-motion", value: "no-preference" },
		{ name: "prefers-reduced-transparency", value: "no-preference" },
	]);
	render(
		<>
			{preferences.map((name) => (
				<Probe key={name} name={name} query={media[name]} />
			))}
		</>,
	);
	expect(values(preferences)).toEqual({
		reducedMotion: "false",
		reducedTransparency: "false",
	});
	await emulateMedia([
		{ name: "prefers-reduced-motion", value: "reduce" },
		{ name: "prefers-reduced-transparency", value: "reduce" },
	]);
	await settle(preferences, {
		reducedMotion: "true",
		reducedTransparency: "true",
	});
	await emulateMedia([
		{ name: "prefers-reduced-motion", value: "no-preference" },
		{ name: "prefers-reduced-transparency", value: "reduce" },
	]);
	await settle(preferences, {
		reducedMotion: "false",
		reducedTransparency: "true",
	});
});

test("a new query takes over on the next render, and stays live", async () => {
	const { rerender } = render(<Probe name="value" query="(min-width: 1px)" />);
	expect(value()).toBe("true");
	rerender(<Probe name="value" query="(max-width: 1px)" />);
	expect(value()).toBe("false");
	rerender(<Probe name="value" query="(min-width: 500px)" />);
	expect(value()).toBe(String(matchMedia("(min-width: 500px)").matches));
	await page.viewport(800, 800);
	await expect.poll(value).toBe("true");
	await page.viewport(400, 800);
	await expect.poll(value).toBe("false");
});

test("on a client render, the first render already has the live value, whatever defaultMatches says", () => {
	const seen: boolean[] = [];
	function Recorder({
		query,
		options,
	}: {
		readonly query: string;
		readonly options?: UseMediaQueryOptions;
	}) {
		seen.push(useMediaQuery(query, options));
		return null;
	}

	render(
		<Recorder query="(max-width: 1px)" options={{ defaultMatches: true }} />,
	);
	expect(seen.length).toBeGreaterThan(0);
	expect(seen.every((matches) => !matches)).toBe(true);
	cleanup();
	seen.length = 0;
	render(<Recorder query="(min-width: 1px)" />);
	expect(seen.length).toBeGreaterThan(0);
	expect(seen.every(Boolean)).toBe(true);
});

test("defaultMatches is the value in server HTML, false unless it's set", () => {
	const matching = "(min-width: 1px)";
	const failing = "(max-width: 1px)";
	const html = (element: React.ReactElement) => {
		const host = document.createElement("div");
		host.innerHTML = renderToString(element);
		return host.textContent;
	};

	expect(html(<Probe name="value" query={matching} />)).toBe("false");
	expect(
		html(
			<Probe
				name="value"
				query={matching}
				options={{ defaultMatches: false }}
			/>,
		),
	).toBe("false");
	expect(
		html(
			<Probe name="value" query={failing} options={{ defaultMatches: true }} />,
		),
	).toBe("true");
});

test("hydration starts from defaultMatches, then moves to the live value without errors", async () => {
	const tree = <Probe name="value" query="(min-width: 1px)" />;
	const host = document.createElement("div");
	document.body.append(host);
	const errors: unknown[] = [];
	let root: ReturnType<typeof hydrateRoot> | undefined;
	try {
		host.innerHTML = renderToString(tree);
		expect(host.textContent).toBe("false");
		await act(async () => {
			root = hydrateRoot(host, tree, {
				onRecoverableError(error) {
					errors.push(error);
				},
			});
		});
		await expect.poll(() => host.textContent).toBe("true");
		expect(errors).toEqual([]);
	} finally {
		act(() => {
			root?.unmount();
		});
		host.remove();
	}
});
