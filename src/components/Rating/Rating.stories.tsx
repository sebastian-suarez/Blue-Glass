import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Rating/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import { Row, Caption, Labelled } from "../../../stories/blocks/preview-kit.js";
import { Rating, Paper } from "../../index.js";
import type { RatingProps } from "./Rating.js";

const meta = {
	title: "Inputs/Rating",
	component: Rating,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Rating>;
export default meta;
type Story = StoryObj<Partial<RatingProps>>;
const q: Record<number, string> = {
	1: "Not useful",
	2: "Somewhat useful",
	3: "Useful",
	4: "Very useful",
	5: "Saved me a weekend",
};
function PreviewB() {
	const [exampleState1, setExampleState1] = React.useState<number | null>(4);
	const [exampleState2, setExampleState2] = React.useState(-1);
	const d = exampleState2 === -1 ? exampleState1 : exampleState2;
	return (
		<Paper style={{ padding: 24, maxWidth: 560, display: "grid", gap: 12 }}>
			<div style={{ display: "grid", gap: 4 }}>
				<span className="text-subtitle">RS50 force-feedback bridge</span>
				<span className="text-small" style={{ color: "var(--color-muted)" }}>
					A Rust daemon that drives a sim-racing wheel under Wine on macOS.
				</span>
			</div>
			<span id="rate-question" className="text-label">
				How useful was the write-up?
			</span>
			<Rating
				size="lg"
				value={exampleState1}
				aria-labelledby="rate-question"
				label={
					d !== null && d !== 0 && !Number.isNaN(d) ? q[d] : "Not rated yet"
				}
				onChange={(u, s) => {
					setExampleState1(s);
				}}
				onChangeActive={(u, s) => {
					setExampleState2(s);
				}}
			/>
			<Caption>
				Hover to preview, press to rate, press the same star again to clear.
			</Caption>
		</Paper>
	);
}

function DefaultWithArgs(
	args: Partial<RatingProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<RatingProps>>();
	return (
		<LiveArg
			value={args.value}
			fixed={viewMode === "docs"}
			onChange={(value) => {
				updateArgs({ value });
			}}
		>
			{(value, setValue) => (
				<Rating
					{...args}
					value={value}
					onChange={(event, next) => {
						args.onChange?.(event, next);
						setValue(next);
					}}
				/>
			)}
		</LiveArg>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		value: 4,
		"aria-label": "Rate the Clean Architecture template",
		onChange: fn<() => void>(),
		onChangeActive: fn<() => void>(),
	},
	argTypes: {
		value: { control: { type: "number", min: 0, max: 5, step: 1 } },
		"aria-label": { control: "text" },
	},
	parameters: {
		controls: { disable: false, include: ["value", "aria-label"] },
		docs: {
			description: {
				story:
					"Five stars over hidden native radios. Filled stars are color-blue marks; empty ones a dg-edge outline.",
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
					"Half stars clip the filled glyph over the outline. read-only becomes one image named by its value.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={28} align="flex-start">
				<Labelled label="sm">
					<Rating size="sm" defaultValue={3} aria-label="Small rating" />
				</Labelled>
				<Labelled label="md">
					<Rating defaultValue={3} aria-label="Medium rating" />
				</Labelled>
				<Labelled label="lg">
					<Rating size="lg" defaultValue={3} aria-label="Large rating" />
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="precision 0.5">
					<Rating
						precision={0.5}
						defaultValue={3.5}
						aria-label="Half-star rating"
					/>
				</Labelled>
				<Labelled label="read-only · label">
					<Rating
						readOnly
						precision={0.5}
						value={4.5}
						label="4.5"
						aria-label="VSebCode"
					/>
				</Labelled>
				<Labelled label="no rating yet">
					<Rating defaultValue={null} label="Not rated" aria-label="Unrated" />
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="disabled">
					<Rating disabled defaultValue={2} aria-label="Disabled rating" />
				</Labelled>
				<Labelled label="max 10 · sm">
					<Rating
						size="sm"
						max={10}
						defaultValue={7}
						label="7 / 10"
						aria-label="Score out of ten"
					/>
				</Labelled>
			</Row>
		</>
	),
};
export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"onChangeActive feeds the words beside the stars while the mouse previews a value.",
			},
		},
	},
	render: () => <PreviewB />,
};
