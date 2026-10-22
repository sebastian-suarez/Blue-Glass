import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import readme from "../../../design-system/components/TimingChart/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack } from "../../../stories/blocks/preview-kit.js";
import { Paper } from "../Paper/index.js";
import { TimingChart, type TimingData } from "./TimingChart.js";

// The preview's datasets. "10–20 ms" keeps its word joiner, so the range never breaks.
const pdfTiming: TimingData = {
	id: "pdf-timing",
	label: "PDF generation time, before and after the rework",
	description:
		"Before the rework, generating a training specification PDF took about 6 seconds. After it, 10 to 20 milliseconds.",
	axisMax: 6000,
	ticks: [
		{ value: 0, text: "0 s" },
		{ value: 2000, text: "2 s" },
		{ value: 4000, text: "4 s" },
		{ value: 6000, text: "6 s" },
	],
	rows: [
		{ name: "Before", value: 6000, text: "about 6 s" },
		{ name: "After", value: 20, text: "10–⁠20 ms", tone: "accent" },
	],
};

const payloadSize: TimingData = {
	id: "payload-size",
	label: "Response payload size, before and after the pipeline change",
	description:
		"Changes to the processing pipeline cut the response payload to 90% of its previous size, a 10% reduction.",
	axisMax: 100,
	ticks: [
		{ value: 0, text: "0%" },
		{ value: 25, text: "25%" },
		{ value: 50, text: "50%" },
		{ value: 75, text: "75%" },
		{ value: 100, text: "100%" },
	],
	rows: [
		{ name: "Before", value: 100, text: "100%" },
		{ name: "After", value: 90, text: "90%", tone: "accent" },
	],
};

/**
The inset well the README puts a chart in: an inset Paper as a figure, with a text-micro caption.
*/
function Figure({
	caption,
	maxWidth,
	children,
}: {
	readonly caption: ReactNode;
	readonly maxWidth?: CSSProperties["maxWidth"];
	readonly children: ReactNode;
}) {
	return (
		<Paper
			variant="inset"
			component="figure"
			style={{ margin: 0, padding: 22, maxWidth, minWidth: 0 }}
		>
			{children}
			<figcaption
				className="text-micro"
				style={{ marginTop: 14, color: "var(--color-muted)" }}
			>
				{caption}
			</figcaption>
		</Paper>
	);
}

const meta = {
	title: "Charts/TimingChart",
	component: TimingChart,
	parameters: { docs: { page: componentDocs(readme) } },
	args: { data: pdfTiming, minScale: 0.6 },
} satisfies Meta<typeof TimingChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Limber Health's PDF generation: about 6 seconds before, 10–20 ms after, on a linear axis so the gap reads true.",
			},
		},
	},
	render: (args) => (
		<Figure caption="PDF generation for one training specification, on a linear scale.">
			<TimingChart {...args} />
		</Figure>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Any unit on the axis; the accent row is the one the story is about. Muted bars sit under 3:1, so every bar carries its value.",
			},
		},
	},
	render: () => (
		<>
			<Stack gap={8}>
				<Figure caption="Intive: response payload size after the pipeline change, indexed to the old one: −10%.">
					<TimingChart data={payloadSize} minScale={0.6} />
				</Figure>
				<Caption>percent axis · accent on the after row</Caption>
			</Stack>
			<Stack gap={8} style={{ width: 340, maxWidth: "100%" }}>
				<Figure caption="PDF generation, before and after.">
					<TimingChart data={pdfTiming} minScale={0.6} />
				</Figure>
				<Caption>
					minScale 0.6 in a narrow host: it scrolls, with the hint
				</Caption>
			</Stack>
		</>
	),
};

export const Example: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The client-work panel: the outcome in words, then the chart that proves it.",
			},
		},
	},
	render: () => (
		<Paper
			component="article"
			style={{ padding: "40px 5%", display: "grid", gap: 24 }}
		>
			<div
				style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}
			>
				<span
					aria-hidden="true"
					style={{
						width: 18,
						height: 18,
						borderRadius: "50%",
						background: "linear-gradient(135deg, #f1f8ff, #77a5d8)",
						boxShadow: "inset 0 0 1px #fff, 0 1px 4px #546b8e25",
					}}
				/>
				Limber Health
			</div>
			<div style={{ display: "grid", gap: 10 }}>
				<h3
					className="text-title-md"
					style={{ margin: 0, fontSize: 40, maxWidth: "16ch" }}
				>
					Training PDFs.
					<br />A shorter wait.
				</h3>
				<p className="text-caption" style={{ margin: 0 }}>
					Full Stack Software Engineer{" "}
					<span style={{ color: "var(--color-muted)" }}>
						· Aug 2022 – Jun 2023
					</span>
				</p>
			</div>
			<div
				style={{
					borderTop: "1px solid var(--color-line)",
					paddingTop: 20,
					maxWidth: "61ch",
				}}
			>
				<span
					className="text-nano"
					style={{
						color: "var(--color-muted)",
						display: "block",
						marginBottom: 8,
					}}
				>
					Outcome
				</span>
				<p className="text-body-lg" style={{ margin: 0 }}>
					{
						"Cut PDF generation time from about 6 seconds to 10–⁠20 milliseconds."
					}
				</p>
			</div>
			<Figure caption="PDF generation for one training specification, on a linear scale.">
				<TimingChart data={pdfTiming} minScale={0.6} />
			</Figure>
		</Paper>
	),
};
