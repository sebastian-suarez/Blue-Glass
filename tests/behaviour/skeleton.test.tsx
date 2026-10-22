import { cleanup, render, screen } from "@testing-library/react";
import type { CDPSession } from "@vitest/browser-playwright";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { cdp } from "vitest/browser";
import "#ui/styles.css";
import { Skeleton, type SkeletonProps } from "#ui";

afterEach(() => {
	cleanup();
});

function must<T>(value: T | null | undefined): T {
	if (value === null || value === undefined) {
		throw new Error("expected a value");
	}

	return value;
}

function box(element: Element): { width: number; height: number } {
	const rect = element.getBoundingClientRect();
	return { width: rect.width, height: rect.height };
}

function size(element: Element): [number, number] {
	const { width, height } = box(element);
	return [Math.round(width), Math.round(height)];
}

/**
The CSS properties the animations running on the element or inside it (pseudo-elements too)
change.
*/
function animatedProperties(element: Element): string[] {
	const meta = new Set(["offset", "computedOffset", "easing", "composite"]);
	return [
		...new Set(
			element
				.getAnimations({ subtree: true })
				.flatMap(
					(animation) =>
						(animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [],
				)
				.flatMap((keyframe) => Object.keys(keyframe))
				.filter((property) => !meta.has(property)),
		),
	].toSorted();
}

async function emulateMedia(
	features: Array<{ name: string; value: string }>,
): Promise<void> {
	const session: CDPSession = cdp();
	await session.send("Emulation.setEmulatedMedia", { features });
}

const variants = [
	"text",
	"rectangular",
	"rounded",
	"circular",
] as const satisfies ReadonlyArray<SkeletonProps["variant"]>;

/**
The preview's three animations side by side, plus one with animation left unset.
*/
function renderAnimations() {
	const refs = {
		unset: React.createRef<HTMLSpanElement>(),
		pulse: React.createRef<HTMLSpanElement>(),
		wave: React.createRef<HTMLSpanElement>(),
		still: React.createRef<HTMLSpanElement>(),
	};
	render(
		<>
			<Skeleton ref={refs.unset} variant="rounded" width={150} height={46} />
			<Skeleton
				ref={refs.pulse}
				variant="rounded"
				width={150}
				height={46}
				animation="pulse"
			/>
			<Skeleton
				ref={refs.wave}
				variant="rounded"
				width={150}
				height={46}
				animation="wave"
			/>
			<Skeleton
				ref={refs.still}
				variant="rounded"
				width={150}
				height={46}
				animation={false}
			/>
		</>,
	);
	return {
		unset: must(refs.unset.current),
		pulse: must(refs.pulse.current),
		wave: must(refs.wave.current),
		still: must(refs.still.current),
	};
}

describe("Skeleton", () => {
	test("renders a span, always aria-hidden, holding className, style, the ref and other attributes", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<Skeleton
				ref={ref}
				id="title-line"
				className="custom"
				style={{ marginTop: 4 }}
			/>,
		);
		const root = must(ref.current);
		expect(root).toBeInstanceOf(HTMLSpanElement);
		expect(root).toHaveAttribute("aria-hidden", "true");
		expect(root).toHaveAttribute("id", "title-line");
		expect(root).toHaveClass("custom");
		expect(getComputedStyle(root).marginTop).toBe("4px");
	});

	test.each(variants)(
		"the %s variant is aria-hidden too, and puts its class on the root",
		(variant) => {
			const ref = React.createRef<HTMLSpanElement>();
			render(<Skeleton ref={ref} variant={variant} width={40} height={40} />);
			expect(ref.current).toHaveAttribute("aria-hidden", "true");
			expect(ref.current).toHaveClass(`gl-skeleton-${variant}`);
			for (const other of variants) {
				if (other !== variant) {
					expect(ref.current).not.toHaveClass(`gl-skeleton-${other}`);
				}
			}
		},
	);

	test("variant is text by default", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(<Skeleton ref={ref} />);
		expect(ref.current).toHaveClass("gl-skeleton-text");
	});

	test("text fills the line and takes its height from the font: a line at 60% of the line box", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<div style={{ width: 300, fontSize: 20, lineHeight: 1.5 }}>
				<Skeleton ref={ref} />
			</div>,
		);
		const { width, height } = box(must(ref.current));
		expect(width).toBeCloseTo(300, 0);
		// A 30px line box (20px at 1.5), squeezed to 60%.
		expect(Math.abs(height - 18)).toBeLessThanOrEqual(1);
	});

	test("width and height take a number of px or any CSS length", () => {
		const numbers = React.createRef<HTMLSpanElement>();
		const lengths = React.createRef<HTMLSpanElement>();
		render(
			<div style={{ width: 300, fontSize: 10 }}>
				<Skeleton ref={numbers} variant="rectangular" width={120} height={72} />
				<Skeleton ref={lengths} variant="rounded" width="50%" height="3em" />
			</div>,
		);
		expect(size(must(numbers.current))).toEqual([120, 72]);
		expect(size(must(lengths.current))).toEqual([150, 30]);
	});

	test("without a size the other variants fill the line and are 1.2em tall", () => {
		const refs = new Map(
			(["rectangular", "rounded", "circular"] as const).map((variant) => [
				variant,
				React.createRef<HTMLSpanElement>(),
			]),
		);
		render(
			<div style={{ width: 300, fontSize: 20 }}>
				{[...refs].map(([variant, ref]) => (
					<Skeleton key={variant} ref={ref} variant={variant} />
				))}
			</div>,
		);
		for (const ref of refs.values()) {
			const { width, height } = box(must(ref.current));
			expect(width).toBeCloseTo(300, 0);
			expect(height).toBeCloseTo(24, 0);
		}
	});

	test("children size it, and stay invisible and hidden from assistive tech", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<div style={{ width: 300 }}>
				<Skeleton ref={ref} variant="rounded">
					<h3
						style={{
							display: "inline-block",
							width: 120,
							height: 40,
							margin: 0,
						}}
					>
						Project title
					</h3>
				</Skeleton>
			</div>,
		);
		expect(size(must(ref.current))).toEqual([120, 40]);
		expect(screen.getByText("Project title")).not.toBeVisible();
		expect(screen.queryByRole("heading")).toBeNull();
	});

	test("with children, width and height still win", () => {
		const ref = React.createRef<HTMLSpanElement>();
		render(
			<div style={{ width: 300 }}>
				<Skeleton ref={ref} variant="rectangular" width={200} height={50}>
					<span style={{ display: "inline-block", width: 120, height: 40 }}>
						Avatar
					</span>
				</Skeleton>
			</div>,
		);
		expect(size(must(ref.current))).toEqual([200, 50]);
		expect(screen.getByText("Avatar")).not.toBeVisible();
	});

	test("animation: pulse (the default) is an opacity breath, wave moves a sheen across, false keeps it still", () => {
		const { unset, pulse, wave, still } = renderAnimations();
		for (const breathing of [unset, pulse]) {
			expect(breathing).toHaveClass("gl-skeleton-pulse");
			expect(animatedProperties(breathing)).toEqual(["opacity"]);
			// The skeleton itself breathes.
			expect(breathing.getAnimations()).not.toHaveLength(0);
		}

		expect(wave).toHaveClass("gl-skeleton-wave");
		expect(wave).not.toHaveClass("gl-skeleton-pulse");
		expect(animatedProperties(wave)).toContain("transform");

		expect(still).not.toHaveClass("gl-skeleton-pulse");
		expect(still).not.toHaveClass("gl-skeleton-wave");
		expect(still.getAnimations({ subtree: true })).toEqual([]);
	});
});

describe("Skeleton under reduced motion", () => {
	beforeEach(async () => {
		await emulateMedia([{ name: "prefers-reduced-motion", value: "reduce" }]);
		expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
	});

	afterEach(async () => {
		await emulateMedia([]);
	});

	test("every skeleton is still", () => {
		for (const skeleton of Object.values(renderAnimations())) {
			expect(skeleton.getAnimations({ subtree: true })).toEqual([]);
		}
	});
});
