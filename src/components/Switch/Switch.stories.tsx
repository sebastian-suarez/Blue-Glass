import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Switch/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import { Row, Caption, Labelled } from "../../../stories/blocks/preview-kit.js";
import { Switch, Paper } from "../../index.js";
import type { SwitchProps } from "./Switch.js";

const meta = {
	title: "Inputs/Switch",
	component: Switch,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<Partial<SwitchProps>>;
const f = [
	{
		id: "remote",
		label: "Remote only",
		helper: "I work from Medellín, Colombia.",
		on: true,
	},
	{
		id: "overlap",
		label: "US-hours overlap",
		helper: "Roles that need four or more hours with US Eastern.",
		on: true,
	},
	{
		id: "contract",
		label: "Contract roles",
		helper: "Three months or longer.",
		on: false,
	},
	{
		id: "digest",
		label: "Weekly digest",
		helper: "One email on Mondays instead of one per role.",
		on: false,
	},
];
function PreviewU() {
	const [exampleState1, setExampleState1] = React.useState<
		Record<string, boolean>
	>(() =>
		Object.fromEntries(f.map((option) => [option.id, option.on] as const)),
	);
	const r = f.filter((i) => exampleState1[i.id]).length;
	return (
		<Paper style={{ padding: "22px 24px 12px", maxWidth: 560 }}>
			<div
				style={{
					display: "flex",
					alignItems: "baseline",
					justifyContent: "space-between",
					gap: 12,
					flexWrap: "wrap",
					paddingBottom: 6,
				}}
			>
				<span className="text-subtitle">Job alerts</span>
				<span
					role="status"
					className="text-micro"
					style={{ color: "var(--color-muted)" }}
				>
					{r}
					{" of "}
					{f.length}
					{" on"}
				</span>
			</div>
			{f.map((i, d) => (
				<div
					key={i.id}
					style={{
						padding: "10px 0",
						borderTop: d === 0 ? undefined : "1px solid var(--color-line)",
					}}
				>
					<Switch
						label={i.label}
						helperText={i.helper}
						labelPlacement="start"
						checked={exampleState1[i.id]}
						style={{ width: "100%" }}
						onChange={(g, s) => {
							setExampleState1((p) => ({ ...p, [i.id]: s }));
						}}
					/>
				</div>
			))}
		</Paper>
	);
}

function DefaultWithArgs(
	args: Partial<SwitchProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<SwitchProps>>();
	return (
		<LiveArg
			value={args.checked}
			fixed={viewMode === "docs"}
			onChange={(checked) => {
				updateArgs({ checked });
			}}
		>
			{(value, setValue) => (
				<Switch
					{...args}
					checked={value}
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
	args: { checked: true, label: "Remote only", onChange: fn<() => void>() },
	argTypes: { label: { control: "text" } },
	parameters: {
		controls: { disable: false, include: ["checked", "label"] },
		docs: {
			description: {
				story:
					"An on/off setting that applies at once: role=switch on a native checkbox, a 40 × 24 pill.",
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
					"Off is glass with a dg-edge border (3:1); on fills with ink. The thumb slides over duration-state, or jumps under reduced motion.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={28} align="flex-start">
				<Labelled label="off">
					<Switch label="Contract roles" />
				</Labelled>
				<Labelled label="on">
					<Switch defaultChecked label="Remote only" />
				</Labelled>
				<Labelled label="no label: aria-label">
					<Switch defaultChecked aria-label="Weekly digest" />
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="sm · off">
					<Switch size="sm" label="Contract roles" />
				</Labelled>
				<Labelled label="sm · on">
					<Switch defaultChecked size="sm" label="Remote only" />
				</Labelled>
				<Labelled label="label start">
					<Switch
						defaultChecked
						labelPlacement="start"
						label="US-hours overlap"
					/>
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="helper text">
					<Switch label="Weekly digest" helperText="One email on Mondays" />
				</Labelled>
				<Labelled label="disabled">
					<Switch disabled label="Relocation" />
				</Labelled>
				<Labelled label="disabled · on">
					<Switch disabled defaultChecked label="Remote only" />
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
					"A settings list: label first, the switch at the far end of a full-width row, a live count.",
			},
		},
	},
	render: () => <PreviewU />,
};
