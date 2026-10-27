// Behaviour specs for Switch, from design-system/components/Switch/README.md and api.d.ts. The
// reference draws a track and a thumb under a transparent native checkbox with role="switch"; the
// package draws Base UI's switch, a span with the role beside a hidden input (docs/deviations.md,
// 1 to 4). So the specs find the switch by role and name, read the input through the ref, find
// the drawn track by its place, and find the thumb, which has no role, as the element that moves
// when the switch turns on.
import { cleanup, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { cdp, userEvent } from "vitest/browser";
import { referenceDefectTest } from "./reference-defect.js";
import "#ui/styles.css";
import { Switch, type SwitchProps } from "#ui";

afterEach(() => {
	cleanup();
});

/**
A computed length without its px unit.
*/
function px(value: string): number {
	return Number(value.replace(/px$/v, ""));
}

type OnChange = NonNullable<SwitchProps["onChange"]>;

type Change = {
	type: string;
	target: EventTarget;
	inputChecked: boolean | undefined;
	checked: boolean;
};

/**
Records what onChange saw at call time: the event's type and target, the input's checked state
then, and the second argument.
*/
function recorder() {
	const calls: Change[] = [];
	const onChange = vi.fn<OnChange>((event, checked) => {
		const { target } = event;
		calls.push({
			type: event.type,
			target,
			inputChecked:
				target instanceof HTMLInputElement ? target.checked : undefined,
			checked,
		});
	});
	return { calls, onChange };
}

function control(name: string): HTMLElement {
	return screen.getByRole("switch", { name });
}

function button(name: string): HTMLElement {
	return screen.getByRole("button", { name });
}

/**
Disabled natively, or through aria-disabled.
*/
function isDisabled(element: HTMLElement): boolean {
	return (
		element.matches(":disabled") ||
		element.getAttribute("aria-disabled") === "true"
	);
}

/**
Whether focus is on the control or inside it.
*/
function hasFocus(element: HTMLElement): boolean {
	return (
		element === document.activeElement ||
		element.contains(document.activeElement)
	);
}

function box(element: Element): DOMRect {
	return element.getBoundingClientRect();
}

function size(element: Element): [number, number] {
	const { width, height } = box(element);
	return [Math.round(width), Math.round(height)];
}

/**
The opacity the element is drawn with: its own times every ancestor's.
*/
function opacityOf(element: Element): number {
	let opacity = 1;
	for (
		let node: Element | null = element;
		node !== null;
		node = node.parentElement
	) {
		opacity *= Number(getComputedStyle(node).opacity);
	}

	return opacity;
}

/**
The track drawn for the switch: the element with a border that covers it exactly. The package's
switch draws itself; the reference's transparent input lies over a drawn track.
*/
function drawnTrack(element: HTMLElement): HTMLElement {
	const target = box(element);
	const drawn = [
		element,
		...document.querySelectorAll<HTMLElement>("body *"),
	].find((candidate) => {
		const { left, top, width, height } = box(candidate);
		const style = getComputedStyle(candidate);
		return (
			style.borderTopStyle !== "none" &&
			px(style.borderTopWidth) > 0 &&
			Math.abs(left - target.left) < 0.5 &&
			Math.abs(top - target.top) < 0.5 &&
			Math.abs(width - target.width) < 0.5 &&
			Math.abs(height - target.height) < 0.5
		);
	});
	if (drawn === undefined) {
		throw new Error("no bordered track covers the switch");
	}

	return drawn;
}

/**
What a CSS value, a token or a literal, resolves to for one property, read from a probe element.
*/
function resolved(property: string, value: string): string {
	const probe = document.createElement("div");
	probe.style.borderStyle = "solid";
	probe.style.setProperty(property, value);
	document.body.append(probe);
	const result = getComputedStyle(probe).getPropertyValue(property);
	probe.remove();
	return result;
}

/**
Moves the pointer to the page's bottom-left corner, clear of everything the specs render, so no
hover style lingers on a control from an earlier click.
*/
async function parkPointer(): Promise<void> {
	const spot = document.createElement("div");
	spot.style.cssText =
		"position: fixed; left: 0; bottom: 0; width: 40px; height: 40px";
	document.body.append(spot);
	try {
		await userEvent.hover(spot);
	} finally {
		spot.remove();
	}
}

/**
Waits for every running animation and transition on the page to finish.
*/
async function settle(): Promise<void> {
	await Promise.allSettled(
		document.getAnimations().map(async (animation) => animation.finished),
	);
}

async function nextFrame(): Promise<void> {
	await new Promise((resolve) => {
		requestAnimationFrame(resolve);
	});
}

/**
Turns the switch on with Space, waits for it to come to rest, and finds its thumb: the outermost
element in the switch's root whose box moved sideways. Returns the thumb and its box while off.
*/
async function turnOnAndFindThumb(
	root: Element,
	element: HTMLElement,
): Promise<{ thumb: HTMLElement; off: DOMRect }> {
	const before = new Map(
		[...root.querySelectorAll<HTMLElement>("*")].map((candidate) => [
			candidate,
			box(candidate),
		]),
	);
	element.focus();
	await userEvent.keyboard(" ");
	await expect.element(element).toBeChecked();
	await settle();
	const moved = [...before]
		.filter(
			([candidate, rect]) => Math.abs(box(candidate).left - rect.left) > 2,
		)
		.map(([candidate]) => candidate);
	const outermost = moved.filter(
		(candidate) =>
			candidate.parentElement === null ||
			!moved.includes(candidate.parentElement),
	);
	expect(outermost).toHaveLength(1);
	const [thumb] = outermost;
	const off = before.get(thumb);
	if (off === undefined) {
		throw new Error("nothing moved when the switch turned on");
	}

	return { thumb, off };
}

type Timing = { duration: number; easing: string };

/**
Records the thumb's left edge, and the timing of every animation running on it, at each frame
while the action runs and until the page comes to rest.
*/
async function sampleThumb(
	thumb: HTMLElement,
	action: () => Promise<void>,
): Promise<{ lefts: number[]; timings: Timing[] }> {
	const lefts: number[] = [];
	const timings: Timing[] = [];
	let isSampling = true;
	const sample = () => {
		lefts.push(box(thumb).left);
		for (const animation of thumb.getAnimations()) {
			const timing = animation.effect?.getTiming();
			timings.push({
				duration: Number(timing?.duration),
				easing: String(timing?.easing),
			});
		}

		if (isSampling) {
			requestAnimationFrame(sample);
		}
	};

	requestAnimationFrame(sample);
	try {
		await action();
		await settle();
		await nextFrame();
		await nextFrame();
	} finally {
		isSampling = false;
	}

	return { lefts, timings };
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

describe("Switch: what it shows", () => {
	test("label names a switch, which reads as off by default", () => {
		render(
			<Switch
				label={
					<>
						Remote <em>only</em>
					</>
				}
			/>,
		);
		expect(control("Remote only")).not.toBeChecked();
	});

	test("aria-label names it when there's no label", () => {
		render(<Switch defaultChecked aria-label="Weekly digest" />);
		expect(control("Weekly digest")).toBeChecked();
	});

	// The docs don't say; the reference's row is a <label> (reference.tsx, line 83), so a click on
	// the label text toggles the switch, as on a native one.
	test("a click on its label toggles it, as one on the switch does", async () => {
		render(<Switch label="Remote only" />);
		await userEvent.click(screen.getByText("Remote only"));
		await expect.element(control("Remote only")).toBeChecked();
		await userEvent.click(screen.getByText("Remote only"));
		await expect.element(control("Remote only")).not.toBeChecked();
	});

	test("labelPlacement: the label follows the switch by default; start puts it first and, with width: 100%, the switch at the far end", () => {
		render(
			<div data-testid="settings" style={{ width: 360 }}>
				<Switch label="Remote only" />
				<Switch labelPlacement="end" label="Contract roles" />
				<Switch
					labelPlacement="start"
					style={{ width: "100%" }}
					label="US-hours overlap"
				/>
			</div>,
		);
		const settings = box(screen.getByTestId("settings"));
		for (const name of ["Remote only", "Contract roles"]) {
			expect(box(screen.getByText(name)).left).toBeGreaterThanOrEqual(
				box(control(name)).right,
			);
		}

		const start = box(control("US-hours overlap"));
		const text = box(screen.getByText("US-hours overlap"));
		expect(text.left).toBeCloseTo(settings.left, 0);
		expect(text.right).toBeLessThanOrEqual(start.left);
		expect(start.right).toBeCloseTo(settings.right, 0);
	});

	test("helperText describes the switch through aria-describedby, on a line under the label, and aria-describedby adds descriptions", () => {
		render(
			<>
				<p id="digest-note">Sent from my own address.</p>
				<Switch
					aria-describedby="digest-note"
					label="Weekly digest"
					helperText="One email on Mondays"
				/>
				<Switch label="Contract roles" helperText="Three months or longer." />
			</>,
		);
		expect(control("Weekly digest")).toHaveAccessibleDescription(
			"Sent from my own address. One email on Mondays",
		);
		expect(control("Contract roles")).toHaveAccessibleDescription(
			"Three months or longer.",
		);
		expect(
			box(screen.getByText("Three months or longer.")).top,
		).toBeGreaterThanOrEqual(
			box(screen.getByText("Contract roles")).bottom - 0.5,
		);
	});

	test("size: md (the default) is a 40 × 24 track, sm a 32 × 20 one", () => {
		render(
			<>
				<Switch label="Default" />
				<Switch size="md" label="Medium" />
				<Switch size="sm" label="Small" />
			</>,
		);
		const defaultControl = control("Default");
		const smallControl = control("Small");
		expect(size(defaultControl)).toEqual([40, 24]);
		expect(size(drawnTrack(defaultControl))).toEqual([40, 24]);
		expect(size(control("Medium"))).toEqual([40, 24]);
		expect(size(smallControl)).toEqual([32, 20]);
		expect(size(drawnTrack(smallControl))).toEqual([32, 20]);
	});

	test("the track is a radius-pill: off, glass-control with a 1px dg-edge border; on, color-ink", async () => {
		await parkPointer();
		render(
			<>
				<Switch label="Contract roles" />
				<Switch defaultChecked label="Remote only" />
			</>,
		);
		const off = getComputedStyle(drawnTrack(control("Contract roles")));
		expect(off.borderTopLeftRadius).toBe(
			resolved("border-top-left-radius", "var(--radius-pill)"),
		);
		expect(off.borderTopWidth).toBe(resolved("border-top-width", "1px"));
		expect(off.borderTopColor).toBe(resolved("color", "var(--dg-edge)"));
		expect(off.backgroundColor).toBe(resolved("color", "var(--glass-control)"));
		const on = getComputedStyle(drawnTrack(control("Remote only")));
		const ink = resolved("color", "var(--color-ink)");
		expect(on.backgroundColor).toBe(ink);
		expect(on.borderTopColor).toBe(ink);
	});

	test("the thumb is white on shadow-raised with a color-line hairline, at the track's start when off and at its end when on", async () => {
		await parkPointer();
		const { container } = render(<Switch label="Remote only" />);
		const root = container.firstElementChild;
		if (!root) {
			throw new Error("nothing rendered");
		}

		const track = box(control("Remote only"));
		const { thumb, off } = await turnOnAndFindThumb(
			root,
			control("Remote only"),
		);
		const on = box(thumb);
		const style = getComputedStyle(thumb);
		expect(style.backgroundColor).toBe(resolved("background-color", "white"));
		expect(style.boxShadow).toContain(
			resolved("box-shadow", "var(--shadow-raised)"),
		);
		expect(`${style.boxShadow} ${style.borderTopColor}`).toContain(
			resolved("color", "var(--color-line)"),
		);
		const halfTrack = track.width / 2;
		const middle = track.left + halfTrack;
		const halfOff = off.width / 2;
		const halfOn = on.width / 2;
		expect(off.left + halfOff).toBeLessThan(middle);
		expect(on.left + halfOn).toBeGreaterThan(middle);
		// As far from the track's start when off as from its end when on.
		const startGap = off.left - track.left;
		expect(startGap).toBeGreaterThan(0);
		expect(Math.abs(track.right - on.right - startGap)).toBeLessThanOrEqual(
			0.5,
		);
		expect(on.width).toBeCloseTo(off.width, 1);
		const halfOnHeight = on.height / 2;
		const halfTrackHeight = track.height / 2;
		expect(on.top + halfOnHeight).toBeCloseTo(track.top + halfTrackHeight, 0);
	});

	test("the thumb slides between the ends over duration-state with ease-out-quint", async () => {
		await parkPointer();
		const { container } = render(<Switch label="Remote only" />);
		const root = container.firstElementChild;
		if (!root) {
			throw new Error("nothing rendered");
		}

		const element = control("Remote only");
		const { thumb, off } = await turnOnAndFindThumb(root, element);
		const on = box(thumb);
		const { lefts, timings } = await sampleThumb(thumb, async () => {
			await userEvent.keyboard(" ");
			await expect.element(element).not.toBeChecked();
		});
		const between = lefts.filter(
			(left) => left > off.left + 0.5 && left < on.left - 0.5,
		);
		expect(between.length).toBeGreaterThan(0);
		expect(lefts.at(-1)).toBeCloseTo(off.left, 1);
		const seconds = resolved("transition-duration", "var(--duration-state)");
		const duration = Number(seconds.replace(/s$/v, "")) * 1000;
		expect(timings).toContainEqual({
			duration,
			easing: resolved("transition-timing-function", "var(--ease-out-quint)"),
		});
	});

	test("under reduced motion the thumb jumps between the ends", async () => {
		await cdp().send("Emulation.setEmulatedMedia", {
			features: [{ name: "prefers-reduced-motion", value: "reduce" }],
		});
		try {
			await parkPointer();
			const { container } = render(<Switch label="Remote only" />);
			const root = container.firstElementChild;
			if (!root) {
				throw new Error("nothing rendered");
			}

			const element = control("Remote only");
			const { thumb, off } = await turnOnAndFindThumb(root, element);
			const on = box(thumb);
			const { lefts, timings } = await sampleThumb(thumb, async () => {
				await userEvent.keyboard(" ");
				await expect.element(element).not.toBeChecked();
			});
			expect(
				lefts.filter((left) => left > off.left + 0.5 && left < on.left - 0.5),
			).toEqual([]);
			expect(lefts.at(-1)).toBeCloseTo(off.left, 1);
			expect(timings).toEqual([]);
		} finally {
			await cdp().send("Emulation.setEmulatedMedia", { features: [] });
		}
	});

	test("disabled disables the input and dims the row, and neither a press nor Tab reaches it", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const onChange = vi.fn<OnChange>();
		render(
			<Around>
				<Switch ref={ref} disabled label="Relocation" onChange={onChange} />
			</Around>,
		);
		const element = control("Relocation");
		expect(ref.current?.disabled).toBe(true);
		expect(isDisabled(element)).toBe(true);
		expect(opacityOf(screen.getByText("Relocation"))).toBeCloseTo(0.5, 2);
		expect(opacityOf(drawnTrack(element))).toBeCloseTo(0.5, 2);
		await userEvent.click(element, { force: true });
		await userEvent.click(screen.getByText("Relocation"), { force: true });
		expect(onChange).not.toHaveBeenCalled();
		expect(ref.current?.checked).toBe(false);
		button("Before").focus();
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
	});

	test("className and style go to the root wrapper, around the switch and its label", () => {
		const { container } = render(
			<Switch className="custom" style={{ width: 300 }} label="Remote only" />,
		);
		const root = container.firstElementChild;
		if (!(root instanceof HTMLElement)) {
			throw new TypeError("nothing rendered");
		}

		expect(root).toHaveClass("custom");
		expect(root.style.width).toBe("300px");
		expect(Math.round(box(root).width)).toBe(300);
		expect(root.contains(control("Remote only"))).toBe(true);
		expect(root.contains(screen.getByText("Remote only"))).toBe(true);
		expect(control("Remote only")).not.toHaveClass("custom");
	});
});

describe("Switch: the input and its attributes", () => {
	test("the ref is the input, and name, value, required, readOnly, id and form reach it; aria-*, data-* and title reach the switch", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(
			<>
				<form id="alerts" aria-label="Alerts" />
				<Switch
					ref={ref}
					required
					readOnly
					name="remote"
					value="yes"
					id="remote-input"
					form="alerts"
					aria-controls="remote-note"
					data-testid="remote"
					title="Only remote roles"
					label="Remote only"
				/>
				<p id="remote-note">I work from Medellín, Colombia.</p>
			</>,
		);
		const input = ref.current;
		expect(input).toBeInstanceOf(HTMLInputElement);
		expect(input?.name).toBe("remote");
		expect(input?.value).toBe("yes");
		expect(input?.required).toBe(true);
		expect(input?.readOnly).toBe(true);
		expect(input?.id).toBe("remote-input");
		expect(input?.form).toBe(screen.getByRole("form", { name: "Alerts" }));
		const element = control("Remote only");
		expect(element).toHaveAttribute("aria-controls", "remote-note");
		expect(screen.getByTestId("remote")).toBe(element);
		expect(element).toHaveAttribute("title", "Only remote roles");
	});

	test("id is the input's, generated and unique when omitted, and a label elsewhere can point at it", async () => {
		const first = React.createRef<HTMLInputElement>();
		const second = React.createRef<HTMLInputElement>();
		const own = React.createRef<HTMLInputElement>();
		render(
			<>
				<Switch ref={first} label="Remote only" />
				<Switch ref={second} label="Contract roles" />
				<label htmlFor="digest-input">Weekly digest</label>
				<Switch ref={own} id="digest-input" />
			</>,
		);
		expect(first.current?.id).toMatch(/\S/v);
		expect(second.current?.id).toMatch(/\S/v);
		expect(second.current?.id).not.toBe(first.current?.id);
		expect(own.current?.id).toBe("digest-input");
		await userEvent.click(screen.getByText("Weekly digest"));
		expect(own.current?.checked).toBe(true);
	});

	test("ref.current.focus() moves focus into the switch", () => {
		const ref = React.createRef<HTMLInputElement>();
		render(<Switch ref={ref} label="Remote only" />);
		ref.current?.focus();
		expect(hasFocus(control("Remote only"))).toBe(true);
	});

	test("onFocus and onBlur are called as focus arrives and leaves", async () => {
		const onFocus = vi.fn<() => void>();
		const onBlur = vi.fn<() => void>();
		render(
			<Around>
				<Switch label="Remote only" onFocus={onFocus} onBlur={onBlur} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onBlur).not.toHaveBeenCalled();
		await userEvent.tab();
		expect(onBlur).toHaveBeenCalledTimes(1);
	});
});

describe("Switch: checked and onChange", () => {
	test("uncontrolled: defaultChecked starts it on, and each press toggles it", async () => {
		render(
			<>
				<Switch label="Contract roles" />
				<Switch defaultChecked label="Remote only" />
			</>,
		);
		const contract = control("Contract roles");
		const remote = control("Remote only");
		expect(remote).toBeChecked();
		await userEvent.click(contract);
		await expect.element(contract).toBeChecked();
		await userEvent.click(contract);
		await expect.element(contract).not.toBeChecked();
		await userEvent.click(remote);
		await expect.element(remote).not.toBeChecked();
	});

	test("onChange gets a change event on the input, which already holds the new state, and the new state", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const { calls, onChange } = recorder();
		render(<Switch ref={ref} label="Remote only" onChange={onChange} />);
		await userEvent.click(control("Remote only"));
		await userEvent.click(control("Remote only"));
		expect(
			calls.map((call) => [call.type, call.inputChecked, call.checked]),
		).toEqual([
			["change", true, true],
			["change", false, false],
		]);
		for (const call of calls) {
			expect(call.target).toBe(ref.current);
		}
	});

	test("controlled: checked decides, a press only calls onChange, and a new checked moves it", async () => {
		const { calls, onChange } = recorder();
		function Controlled() {
			const [checked, setChecked] = React.useState(false);
			return (
				<>
					<Switch checked={false} label="Fixed" onChange={onChange} />
					<Switch
						checked={checked}
						label="Live"
						onChange={(_event, isChecked) => {
							setChecked(isChecked);
						}}
					/>
				</>
			);
		}

		render(<Controlled />);
		await userEvent.click(control("Fixed"));
		expect(calls.map((call) => call.checked)).toEqual([true]);
		expect(control("Fixed")).not.toBeChecked();
		await userEvent.click(control("Live"));
		await expect.element(control("Live")).toBeChecked();
		await userEvent.click(control("Live"));
		await expect.element(control("Live")).not.toBeChecked();
	});

	test("preventDefault() in onChange cancels the change", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const onChange = vi.fn<OnChange>((event) => {
			event.preventDefault();
		});
		render(<Switch ref={ref} label="Remote only" onChange={onChange} />);
		await userEvent.click(control("Remote only"));
		expect(onChange.mock.calls.map((call) => call[1])).toEqual([true]);
		expect(control("Remote only")).not.toBeChecked();
		expect(ref.current?.checked).toBe(false);
	});

	// The reference sets its state before onChange runs (reference.tsx, lines 45 to 49): the
	// browser puts the switch back, but React already holds it on, and the next press goes
	// unreported.
	referenceDefectTest(
		"after a cancelled press, the next press is reported to onChange and can be cancelled too",
		async () => {
			const ref = React.createRef<HTMLInputElement>();
			const onChange = vi.fn<OnChange>((event) => {
				event.preventDefault();
			});
			render(<Switch ref={ref} label="Remote only" onChange={onChange} />);
			await userEvent.click(control("Remote only"));
			await userEvent.click(control("Remote only"));
			expect(onChange.mock.calls.map((call) => call[1])).toEqual([true, true]);
			expect(control("Remote only")).not.toBeChecked();
			expect(ref.current?.checked).toBe(false);
		},
	);
});

describe("Switch: keyboard", () => {
	test("Tab reaches the switch, and the next Tab leaves it", async () => {
		render(
			<Around>
				<Switch label="Remote only" />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		expect(hasFocus(control("Remote only"))).toBe(true);
		await userEvent.tab();
		await expect.element(button("After")).toHaveFocus();
		await userEvent.tab({ shift: true });
		expect(hasFocus(control("Remote only"))).toBe(true);
		await userEvent.tab({ shift: true });
		await expect.element(button("Before")).toHaveFocus();
	});

	test("Space toggles it, with a change event each time", async () => {
		const ref = React.createRef<HTMLInputElement>();
		const { calls, onChange } = recorder();
		render(
			<Around>
				<Switch ref={ref} label="Remote only" onChange={onChange} />
			</Around>,
		);
		button("Before").focus();
		await userEvent.tab();
		await userEvent.keyboard(" ");
		await expect.element(control("Remote only")).toBeChecked();
		await userEvent.keyboard(" ");
		await expect.element(control("Remote only")).not.toBeChecked();
		expect(
			calls.map((call) => [call.type, call.inputChecked, call.checked]),
		).toEqual([
			["change", true, true],
			["change", false, false],
		]);
		expect(calls[0]?.target).toBe(ref.current);
	});
});

describe("Switch: readOnly", () => {
	test("readOnly reaches the input and, as on a native checkbox, doesn't stop a press: it toggles and onChange reports it", async () => {
		const onChange = vi.fn<OnChange>();
		render(<Switch readOnly label="Remote only" onChange={onChange} />);
		await userEvent.click(control("Remote only"));
		await expect.element(control("Remote only")).toBeChecked();
		expect(onChange).toHaveBeenCalledTimes(1);
	});
});
