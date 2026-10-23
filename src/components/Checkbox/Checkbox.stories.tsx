import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Checkbox/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Row,
	Stack,
	Caption,
	Labelled,
} from "../../../stories/blocks/preview-kit.js";
import { Checkbox, Paper, Button } from "../../index.js";
import type { CheckboxProps } from "./Checkbox.js";

const meta = {
	title: "Inputs/Checkbox",
	component: Checkbox,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<Partial<CheckboxProps>>;
const w = [
	{
		id: "rs50",
		label: "RS50 force-feedback bridge",
		helper: "Releases of the Rust daemon for my wheel under Wine on macOS",
	},
	{
		id: "vsebcode",
		label: "VSebCode",
		helper: "New builds of my fork of VS Code",
	},
	{
		id: "template",
		label: "Clean Architecture template",
		helper: "Breaking changes and new layers",
	},
];
function PreviewJ() {
	const [exampleState1, setExampleState1] = React.useState(["rs50"]);
	const [isExampleState2, setIsExampleState2] = React.useState(false);
	const [isExampleState3, setIsExampleState3] = React.useState(false);
	const isP = exampleState1.length === w.length;
	const isG = exampleState1.length > 0 && !isP;
	const isX = exampleState1.length === 0 && !isExampleState2;
	const toggleProject = (a: string, isM: boolean) => {
		setIsExampleState3(false);
		setExampleState1((h) => (isM ? [...h, a] : h.filter((B) => B !== a)));
	};

	return (
		<Paper style={{ padding: 24, maxWidth: 560, display: "grid", gap: 14 }}>
			<div style={{ display: "grid", gap: 4 }}>
				<span id="notify-title" className="text-subtitle">
					Notify me about
				</span>
				<span className="text-small" style={{ color: "var(--color-muted)" }}>
					One email a month at most. Unsubscribe from any of them.
				</span>
			</div>
			<div
				role="group"
				aria-labelledby="notify-title"
				style={{ display: "grid" }}
			>
				<Checkbox
					label="All projects"
					checked={isP}
					indeterminate={isG}
					onChange={(a, m) => {
						setIsExampleState3(false);
						setExampleState1(m ? w.map((h) => h.id) : []);
					}}
				/>
				<div
					role="group"
					aria-label="Projects"
					style={{ display: "grid", paddingInlineStart: 30 }}
				>
					{w.map((a) => (
						<Checkbox
							key={a.id}
							label={a.label}
							helperText={a.helper}
							checked={exampleState1.includes(a.id)}
							onChange={(m, h) => {
								toggleProject(a.id, h);
							}}
						/>
					))}
				</div>
				<Checkbox
					label="Write-ups"
					checked={isExampleState2}
					error={isX}
					helperText={
						isX
							? "Pick at least one, or there is nothing to send."
							: "Long-form notes on what I built and why."
					}
					onChange={(a, m) => {
						setIsExampleState3(false);
						setIsExampleState2(m);
					}}
				/>
			</div>
			<Row>
				<Button
					variant="primary"
					size="sm"
					disabled={isX}
					onClick={() => {
						setIsExampleState3(true);
					}}
				>
					Save
				</Button>
				<span
					role="status"
					className="text-micro"
					style={{ color: "var(--color-muted)" }}
				>
					{isExampleState3 ? "Saved. See you next month." : ""}
				</span>
			</Row>
		</Paper>
	);
}

function DefaultWithArgs(
	args: Partial<CheckboxProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<CheckboxProps>>();
	return (
		<LiveArg
			value={args.checked}
			fixed={viewMode === "docs"}
			onChange={(checked) => {
				updateArgs({ checked });
			}}
		>
			{(value, setValue) => (
				<Checkbox
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
	args: {
		checked: true,
		label: "Email me when a new release ships",
		onChange: fn<() => void>(),
	},
	argTypes: { label: { control: "text" } },
	parameters: {
		controls: { disable: false, include: ["checked", "label"] },
		docs: {
			description: {
				story:
					"A native checkbox in a 20px box. The whole row is the label and the tap target.",
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
					"Checked and mixed fill with ink; the dg-edge outline keeps 3:1 on glass. sm draws a 16px box.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={28} align="flex-start">
				<Labelled label="unchecked">
					<Checkbox label="Remote" />
				</Labelled>
				<Labelled label="checked">
					<Checkbox defaultChecked label="Remote" />
				</Labelled>
				<Labelled label="indeterminate">
					<Checkbox indeterminate label="All projects" />
				</Labelled>
				<Labelled label="no label: aria-label">
					<Checkbox defaultChecked aria-label="Select VSebCode" />
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="sm · unchecked">
					<Checkbox size="sm" label="Remote" />
				</Labelled>
				<Labelled label="sm · checked">
					<Checkbox defaultChecked size="sm" label="Remote" />
				</Labelled>
				<Labelled label="sm · indeterminate">
					<Checkbox indeterminate size="sm" label="All projects" />
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="helper text">
					<Checkbox
						defaultChecked
						label="US-hours overlap"
						helperText="At least four hours with US Eastern"
					/>
				</Labelled>
				<Labelled label="error · required">
					<Checkbox
						required
						error
						label="You can email me about this role"
						helperText="Tick this so I can reply."
					/>
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="disabled">
					<Checkbox disabled label="Contract roles" />
				</Labelled>
				<Labelled label="disabled · checked">
					<Checkbox disabled defaultChecked label="Remote" />
				</Labelled>
				<Labelled label="disabled · indeterminate">
					<Checkbox disabled indeterminate label="All projects" />
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
					"A parent checkbox that goes mixed when some of its children are checked, with an error when nothing is left to send.",
			},
		},
	},
	render: () => (
		<Stack>
			<PreviewJ />
		</Stack>
	),
};
