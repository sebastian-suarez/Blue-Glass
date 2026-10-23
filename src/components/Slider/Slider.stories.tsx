import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Slider/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Row,
	Stack,
	Caption,
	Tiles,
} from "../../../stories/blocks/preview-kit.js";
import { Slider, Paper, Button, Icon } from "../../index.js";
import type { SliderProps } from "./Slider.js";

const meta = {
	title: "Inputs/Slider",
	component: Slider,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Slider>;
export default meta;
type Story = StoryObj<Partial<SliderProps>>;
const y = (t: number | number[]) => `${String(t)} ms`;
const g = (t: number | number[]) => `${String(t)}%`;
const h = (t: number | number[]) => `${String(t)}°`;
const D = [360, 540, 900, 1080].map((t) => ({ value: t, label: h(t) }));
function PreviewC({
	id: t,
	label: n,
	value: a,
	children: r,
}: {
	readonly id: string;
	readonly label: React.ReactNode;
	readonly value: React.ReactNode;
	readonly children: React.ReactNode;
}) {
	return (
		<div style={{ display: "grid", gap: 2, minWidth: 0 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "baseline",
					gap: 12,
				}}
			>
				<span id={t} className="text-label">
					{n}
				</span>
				<span
					className="text-caption"
					style={{
						color: "var(--color-muted)",
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{a}
				</span>
			</div>
			{r}
		</div>
	);
}

function PreviewV({
	id: t,
	label: n,
	initial: a,
	format: r,
	...p
}: Omit<SliderProps, "id"> & {
	readonly id: string;
	readonly label: string;
	readonly initial: number | number[];
	readonly format: (value: number) => string;
}) {
	const [exampleState1, setExampleState1] = React.useState(a);
	const l = Array.isArray(exampleState1)
		? `${r(exampleState1[0])} – ${r(exampleState1[1])}`
		: r(exampleState1);
	return (
		<PreviewC id={t} label={n} value={l}>
			<Slider
				aria-labelledby={t}
				value={exampleState1}
				valueLabelFormat={r}
				onChange={(K, T) => {
					setExampleState1(T);
				}}
				{...p}
			/>
		</PreviewC>
	);
}

function PreviewK({
	label: t,
	initial: n,
}: {
	readonly label: string;
	readonly initial: number;
}) {
	const [exampleState2, setExampleState2] = React.useState<number | number[]>(
		n,
	);
	return (
		<div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
			<div style={{ height: 140 }}>
				<Slider
					orientation="vertical"
					aria-label={t}
					value={exampleState2}
					valueLabelFormat={g}
					onChange={(p, s) => {
						setExampleState2(s);
					}}
				/>
			</div>
			<span
				className="text-micro"
				style={{ color: "var(--color-ink)", fontWeight: 600 }}
			>
				{t}
			</span>
			<span
				className="text-micro"
				style={{
					color: "var(--color-muted)",
					fontVariantNumeric: "tabular-nums",
				}}
			>
				{g(exampleState2)}
			</span>
		</div>
	);
}

function PreviewJ() {
	const t = { strength: 72, damping: 30, rotation: 900 };
	const [exampleState3, setExampleState3] = React.useState(t);
	const [exampleState4, setExampleState4] = React.useState(
		"Drag a thumb or use the arrow keys; the wheel gets the value when you let go.",
	);
	const s = (d: string, l: string) => {
		setExampleState4(`Sent to the wheel: ${d} ${l}.`);
	};

	return (
		<Paper style={{ padding: 28, display: "grid", gap: 22, maxWidth: 600 }}>
			<div style={{ display: "grid", gap: 6 }}>
				<h3 className="text-title-sm" style={{ margin: 0 }}>
					RS50 force-feedback bridge
				</h3>
				<p
					className="text-body-sm"
					style={{ margin: 0, color: "var(--color-muted)" }}
				>
					A Rust daemon for a sim-racing wheel under Wine on macOS. Tune it
					while you drive.
				</p>
			</div>
			<PreviewC
				id="ffb-strength"
				label="Strength"
				value={g(exampleState3.strength)}
			>
				<Slider
					aria-labelledby="ffb-strength"
					value={exampleState3.strength}
					valueLabelFormat={g}
					onChange={(d, l) => {
						setExampleState3({ ...exampleState3, strength: Number(l) });
					}}
					onChangeCommitted={(d, l) => {
						s("strength", g(l));
					}}
				/>
			</PreviewC>
			<PreviewC
				id="ffb-damping"
				label="Damping"
				value={g(exampleState3.damping)}
			>
				<Slider
					aria-labelledby="ffb-damping"
					value={exampleState3.damping}
					valueLabelFormat={g}
					onChange={(d, l) => {
						setExampleState3({ ...exampleState3, damping: Number(l) });
					}}
					onChangeCommitted={(d, l) => {
						s("damping", g(l));
					}}
				/>
			</PreviewC>
			<PreviewC
				id="ffb-rotation"
				label="Rotation"
				value={h(exampleState3.rotation)}
			>
				<Slider
					aria-labelledby="ffb-rotation"
					value={exampleState3.rotation}
					min={360}
					max={1080}
					step={null}
					marks={D}
					valueLabelFormat={h}
					onChange={(d, l) => {
						setExampleState3({ ...exampleState3, rotation: Number(l) });
					}}
					onChangeCommitted={(d, l) => {
						s("rotation", h(l));
					}}
				/>
			</PreviewC>
			<Row>
				<Button
					variant="primary"
					startIcon={<Icon name="check" />}
					onClick={() => {
						setExampleState4("Saved as the default profile.");
					}}
				>
					Save profile
				</Button>
				<Button
					startIcon={<Icon name="refresh" />}
					onClick={() => {
						setExampleState3(t);
						setExampleState4("Back to the saved profile.");
					}}
				>
					Reset
				</Button>
			</Row>
			<span
				role="status"
				className="text-micro"
				style={{ color: "var(--color-muted)" }}
			>
				{exampleState4}
			</span>
		</Paper>
	);
}

function DefaultWithArgs(
	args: Partial<SliderProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<SliderProps>>();
	return (
		<LiveArg
			value={args.value}
			fixed={viewMode === "docs"}
			onChange={(value) => {
				updateArgs({ value });
			}}
		>
			{(value, setValue) => (
				<div style={{ maxWidth: 520 }}>
					<PreviewC
						id="sl-default"
						label="Latency budget"
						value={y(Array.isArray(value) ? value[0] : (value ?? 0))}
					>
						<Slider
							aria-labelledby="sl-default"
							valueLabelFormat={y}
							{...args}
							value={value}
							onChange={(event, next, index) => {
								args.onChange?.(event, next, index);
								setValue(next);
							}}
						/>
					</PreviewC>
				</div>
			)}
		</LiveArg>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		value: 120,
		min: 0,
		max: 500,
		step: 10,
		onChange: fn<() => void>(),
		onChangeCommitted: fn<() => void>(),
	},
	argTypes: { value: { control: "number" }, step: { control: "number" } },
	parameters: {
		controls: { disable: false, include: ["value", "min", "max", "step"] },
		docs: {
			description: {
				story:
					"A 4px track: the filled part in color-blue, a white thumb with a 3:1 edge. The ink value pill shows while you drag, hover or tab to it.",
			},
		},
	},
	render: DefaultWithArgs,
};
export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"A range has a thumb per end and one tab stop each. step={null} snaps to the marks.",
			},
		},
	},
	render: () => (
		<>
			<Tiles min={280} gap={28}>
				<Stack gap={8}>
					<div style={{ paddingTop: 30 }}>
						<Slider
							aria-label="p95 target"
							defaultValue={180}
							max={500}
							step={10}
							valueLabelDisplay="on"
							valueLabelFormat={y}
						/>
					</div>
					<Caption>value label always on</Caption>
				</Stack>
				<Stack gap={8}>
					<PreviewV
						id="sl-range"
						label="Response window"
						initial={[80, 240]}
						format={y}
						max={500}
						step={10}
						getAriaLabel={(t) =>
							t !== 0 && !Number.isNaN(t)
								? "Slowest acceptable"
								: "Fastest expected"
						}
					/>
					<Caption>range</Caption>
				</Stack>
				<Stack gap={8}>
					<PreviewV
						id="sl-rotation"
						label="Rotation"
						initial={900}
						format={h}
						min={360}
						max={1080}
						step={null}
						marks={D}
					/>
					<Caption>labelled marks · step null</Caption>
				</Stack>
				<Stack gap={8}>
					<PreviewV
						marks
						id="sl-retries"
						label="Retries"
						initial={2}
						format={String}
						min={0}
						max={6}
					/>
					<Caption>a dot per step</Caption>
				</Stack>
				<Stack gap={8}>
					<PreviewV
						id="sl-alert"
						label="Alert when p99 is above"
						initial={300}
						format={y}
						max={500}
						step={10}
						track="inverted"
					/>
					<Caption>inverted track</Caption>
				</Stack>
				<Stack gap={8}>
					<PreviewC id="sl-disabled" label="Sample rate" value="1 kHz">
						<Slider disabled aria-labelledby="sl-disabled" defaultValue={60} />
					</PreviewC>
					<Caption>disabled</Caption>
				</Stack>
			</Tiles>
			<Stack gap={8}>
				<Row gap={36} align="flex-start">
					<PreviewK label="Strength" initial={72} />
					<PreviewK label="Damper" initial={30} />
					<PreviewK label="Spring" initial={45} />
				</Row>
				<Caption>vertical</Caption>
			</Stack>
		</>
	),
};
export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"Force-feedback settings for the RS50 bridge; onChangeCommitted reports when a drag ends.",
			},
		},
	},
	render: () => <PreviewJ />,
};
