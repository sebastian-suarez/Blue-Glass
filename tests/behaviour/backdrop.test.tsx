import { cleanup, render, screen } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import "#ui/styles.css";
import { Backdrop, type BackdropProps } from "#ui";

afterEach(() => {
	cleanup();
	expect(document.body.childElementCount).toBe(0);
});

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

async function runningDurations(element: Element): Promise<number[]> {
	return vi.waitFor(
		() => {
			const durations = element
				.getAnimations()
				.map((animation) =>
					Math.round(Number(animation.effect?.getTiming().duration)),
				);
			expect(durations).not.toHaveLength(0);
			return [...new Set(durations)];
		},
		{ interval: 5, timeout: 2000 },
	);
}

async function atRest(element: Element): Promise<void> {
	await vi.waitFor(
		() => {
			expect(element.getAnimations()).toEqual([]);
		},
		{ interval: 5, timeout: 2000 },
	);
}

function alphaOf(color: string): number {
	const channels = color.match(/[\d.]+/gv) ?? [];
	return channels.length === 4 ? Number(channels[3]) : 1;
}

function resolvedColor(name: string): string {
	const probe = document.createElement("div");
	probe.style.backgroundColor = `var(${name})`;
	document.body.append(probe);
	const color = getComputedStyle(probe).backgroundColor;
	probe.remove();
	return color;
}

const cover: React.CSSProperties = { position: "absolute", zIndex: 2 };

type RegionProps = Omit<BackdropProps, "open"> & {
	readonly onPagePress?: () => void;
};

function Region({ onClick, onPagePress, ...props }: RegionProps) {
	const [isOpen, setIsOpen] = React.useState(true);
	return (
		<div style={{ position: "relative", height: 200, isolation: "isolate" }}>
			<button type="button" onClick={onPagePress}>
				Page action
			</button>
			<button
				type="button"
				onClick={() => {
					setIsOpen(true);
				}}
			>
				Show scrim
			</button>
			<Backdrop
				data-testid="scrim"
				style={cover}
				open={isOpen}
				onClick={(event) => {
					onClick?.(event);
					setIsOpen(false);
				}}
				{...props}
			/>
		</div>
	);
}

test("open shows it, fading in over 200 ms; closed, it fades out over 150 ms, then leaves the DOM", async () => {
	const ref = React.createRef<HTMLDivElement>();
	const { rerender } = render(<Backdrop ref={ref} open style={cover} />);
	const backdrop = must(ref.current);
	expect(await runningDurations(backdrop)).toEqual([200]);
	await expect.element(backdrop).toBeVisible();
	await expect.poll(() => getComputedStyle(backdrop).opacity).toBe("1");
	await atRest(backdrop);

	rerender(<Backdrop ref={ref} open={false} style={cover} />);
	expect(await runningDurations(backdrop)).toEqual([150]);
	await expect.element(backdrop).not.toBeInTheDocument();
});

test("closed from the start, nothing is rendered", () => {
	render(<Backdrop data-testid="scrim" open={false} />);
	expect(screen.queryByTestId("scrim")).toBeNull();
});

test.each([
	{ label: "120", transitionDuration: 120, enter: 120, exit: 120 },
	{
		label: "{ enter: 240, exit: 90 }",
		transitionDuration: { enter: 240, exit: 90 },
		enter: 240,
		exit: 90,
	},
	{
		label: "{ exit: 90 }",
		transitionDuration: { exit: 90 },
		enter: 200,
		exit: 90,
	},
])(
	"transitionDuration=$label: the fade takes $enter ms in and $exit ms out, a side left out keeping its default",
	async ({ transitionDuration, enter, exit }) => {
		const ref = React.createRef<HTMLDivElement>();
		const view = (isOpen: boolean) => (
			<Backdrop
				ref={ref}
				open={isOpen}
				transitionDuration={transitionDuration}
				style={cover}
			/>
		);
		const { rerender } = render(view(true));
		const backdrop = must(ref.current);
		expect(await runningDurations(backdrop)).toEqual([enter]);
		await atRest(backdrop);
		rerender(view(false));
		expect(await runningDurations(backdrop)).toEqual([exit]);
		await expect.element(backdrop).not.toBeInTheDocument();
	},
);

test("keepMounted: closed, it stays in the DOM, hidden, and the same element shows again when it opens", async () => {
	const ref = React.createRef<HTMLDivElement>();
	const view = (isOpen: boolean) => (
		<Backdrop
			ref={ref}
			keepMounted
			open={isOpen}
			transitionDuration={60}
			style={cover}
		/>
	);
	const { rerender } = render(view(false));
	const backdrop = must(ref.current);
	expect(backdrop).not.toBeVisible();

	rerender(view(true));
	await expect.element(backdrop).toBeVisible();
	await expect.poll(() => getComputedStyle(backdrop).opacity).toBe("1");

	rerender(view(false));
	await expect.element(backdrop).not.toBeVisible();
	expect(backdrop.isConnected).toBe(true);
	expect(ref.current).toBe(backdrop);

	rerender(view(true));
	await expect.element(backdrop).toBeVisible();
	expect(ref.current).toBe(backdrop);
});

test("a press on it calls onClick with the click's React event and doesn't reach the page under it, so a press can dismiss it", async () => {
	const presses: Array<{
		type: string;
		isMouseEvent: boolean;
		currentTarget: EventTarget;
	}> = [];
	const onPagePress = vi.fn<() => void>();
	render(
		<Region
			onPagePress={onPagePress}
			onClick={(event) => {
				presses.push({
					type: event.type,
					isMouseEvent: event.nativeEvent instanceof MouseEvent,
					currentTarget: event.currentTarget,
				});
			}}
		/>,
	);
	const scrim = screen.getByTestId("scrim");
	await userEvent.click(screen.getByRole("button", { name: "Page action" }), {
		force: true,
	});
	expect(presses).toEqual([
		{ type: "click", isMouseEvent: true, currentTarget: scrim },
	]);
	expect(onPagePress).not.toHaveBeenCalled();
	await expect.element(scrim).not.toBeInTheDocument();

	await userEvent.click(screen.getByRole("button", { name: "Page action" }));
	expect(onPagePress).toHaveBeenCalledTimes(1);
});

test("children render inside it and show: a status line for a loading cover", async () => {
	const ref = React.createRef<HTMLDivElement>();
	render(
		<Backdrop ref={ref} open style={cover}>
			<span>Publishing…</span>
		</Backdrop>,
	);
	const status = screen.getByText("Publishing…");
	expect(must(ref.current).contains(status)).toBe(true);
	await expect.element(status).toBeVisible();
});

test("invisible: the root takes gl-backdrop-invisible and shows nothing, yet still catches the press", async () => {
	const onClick = vi.fn<NonNullable<BackdropProps["onClick"]>>();
	const onPagePress = vi.fn<() => void>();
	render(<Region invisible onClick={onClick} onPagePress={onPagePress} />);
	const scrim = screen.getByTestId("scrim");
	expect(scrim).toHaveClass("gl-backdrop-invisible");
	const style = getComputedStyle(scrim);
	expect(alphaOf(style.backgroundColor)).toBe(0);
	expect(style.backdropFilter).toBe("none");

	await userEvent.click(screen.getByRole("button", { name: "Page action" }), {
		force: true,
	});
	expect(onClick).toHaveBeenCalledTimes(1);
	expect(onPagePress).not.toHaveBeenCalled();
});

test("by default the scrim token dims the page with a 6px blur, and the root doesn't take gl-backdrop-invisible", () => {
	render(<Region />);
	const scrim = screen.getByTestId("scrim");
	expect(scrim).not.toHaveClass("gl-backdrop-invisible");
	const style = getComputedStyle(scrim);
	expect(style.backgroundColor).toBe(resolvedColor("--scrim"));
	expect(alphaOf(style.backgroundColor)).toBeGreaterThan(0);
	expect(style.backdropFilter).toBe("blur(6px)");
});

test("the blur drops under reduced transparency", async () => {
	const session: CDPSession = cdp();
	render(<Region />);
	const scrim = screen.getByTestId("scrim");
	try {
		await session.send("Emulation.setEmulatedMedia", {
			features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
		});
		expect(matchMedia("(prefers-reduced-transparency: reduce)").matches).toBe(
			true,
		);
		await expect
			.poll(() => getComputedStyle(scrim).backdropFilter)
			.toBe("none");
		expect(alphaOf(getComputedStyle(scrim).backgroundColor)).toBeGreaterThan(0);
	} finally {
		await session.send("Emulation.setEmulatedMedia", { features: [] });
	}
});

test("the ref is the backdrop's element, which takes className, style and the other HTML attributes", () => {
	const ref = React.createRef<HTMLDivElement>();
	render(
		<Backdrop
			ref={ref}
			open
			id="publishing"
			className="publish-cover"
			data-testid="scrim"
			style={{ ...cover, cursor: "progress" }}
		/>,
	);
	const backdrop = screen.getByTestId("scrim");
	expect(ref.current).toBeInstanceOf(HTMLDivElement);
	expect(ref.current).toBe(backdrop);
	expect(backdrop).toHaveAttribute("id", "publishing");
	expect(backdrop).toHaveClass("publish-cover");
	const style = getComputedStyle(backdrop);
	expect(style.position).toBe("absolute");
	expect(style.cursor).toBe("progress");
});
