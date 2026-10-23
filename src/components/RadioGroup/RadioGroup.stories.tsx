import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/RadioGroup/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import { Row, Tiles } from "../../../stories/blocks/preview-kit.js";
import { RadioGroup, Paper, Radio, Button } from "../../index.js";
import type { RadioGroupProps } from "./RadioGroup.js";

const meta = {
	title: "Inputs/RadioGroup",
	component: RadioGroup,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<Partial<RadioGroupProps>>;
function PreviewE() {
	const [exampleState1, setExampleState1] = React.useState<string | null>(null);
	const [exampleState2, setExampleState2] = React.useState("full");
	const [isExampleState3, setIsExampleState3] = React.useState(false);
	const isD =
		isExampleState3 && (exampleState1 === null || exampleState1 === undefined);
	return (
		<Paper style={{ padding: 24, maxWidth: 560, display: "grid", gap: 20 }}>
			<div style={{ display: "grid", gap: 4 }}>
				<span className="text-subtitle">What are you hiring for?</span>
				<span className="text-small" style={{ color: "var(--color-muted)" }}>
					Remote from Medellín, Colombia, with full US-hours overlap.
				</span>
			</div>
			<RadioGroup
				required
				label="Role"
				value={exampleState1}
				error={isD}
				helperText={
					isD
						? "Pick a role so I can reply with the right examples."
						: undefined
				}
				onChange={(s, c) => {
					setExampleState1(c);
				}}
			>
				<Radio
					value="lead"
					label="Backend lead"
					helperText="Own the architecture and grow the team"
				/>
				<Radio
					value="architect"
					label="Software architect"
					helperText="Systems on AWS, Node.js and PostgreSQL"
				/>
				<Radio
					value="senior"
					label="Senior backend engineer"
					helperText="Ship services inside an existing team"
				/>
			</RadioGroup>
			<RadioGroup
				row
				label="Engagement"
				value={exampleState2}
				onChange={(s, c) => {
					setExampleState2(c);
				}}
			>
				<Radio value="full" label="Full-time" />
				<Radio value="contract" label="Contract" />
			</RadioGroup>
			<Row>
				<Button
					variant="primary"
					size="sm"
					onClick={() => {
						setIsExampleState3(true);
					}}
				>
					Continue
				</Button>
				<span
					role="status"
					className="text-micro"
					style={{ color: "var(--color-muted)" }}
				>
					{isExampleState3 && exampleState1 !== null && exampleState1 !== ""
						? "Thanks. I reply within two working days."
						: ""}
				</span>
			</Row>
		</Paper>
	);
}

function DefaultWithArgs(
	args: Partial<RadioGroupProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<RadioGroupProps>>();
	return (
		<LiveArg
			value={args.value}
			fixed={viewMode === "docs"}
			onChange={(value) => {
				updateArgs({ value });
			}}
		>
			{(value, setValue) => (
				<RadioGroup
					{...args}
					value={value}
					onChange={(event, next) => {
						args.onChange?.(event, next);
						setValue(next);
					}}
				>
					<Radio value="node" label="Node.js and TypeScript" />
					<Radio value="rust" label="Rust" />
					<Radio value="react" label="React and Next.js" />
				</RadioGroup>
			)}
		</LiveArg>
	);
}

export const Default: Story = {
	name: "Default",
	args: { value: "node", label: "Preferred stack", onChange: fn<() => void>() },
	argTypes: {
		label: { control: "text" },
		value: { control: "inline-radio", options: ["node", "rust", "react"] },
	},
	parameters: {
		controls: { disable: false, include: ["value", "label"] },
		docs: {
			description: {
				story:
					"A labelled radiogroup of native radios: Tab reaches the chosen one, arrow keys move the choice.",
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
					"Chosen is an ink ring around an 8px ink dot; the dg-edge outline keeps 3:1. row wraps; sm draws 16px circles.",
			},
		},
	},
	render: () => (
		<Tiles min={220} gap={24}>
			<RadioGroup row label="Database" defaultValue="postgres">
				<Radio value="postgres" label="PostgreSQL" />
				<Radio value="mongo" label="MongoDB" />
			</RadioGroup>
			<RadioGroup label="Cloud · sm" size="sm" defaultValue="aws">
				<Radio value="aws" label="AWS" />
				<Radio value="cloudflare" label="Cloudflare" />
			</RadioGroup>
			<RadioGroup label="Engagement" defaultValue="full">
				<Radio
					value="full"
					label="Full-time"
					helperText="Backend lead or architect"
				/>
				<Radio
					value="contract"
					label="Contract"
					helperText="Three months or longer"
				/>
			</RadioGroup>
			<RadioGroup
				required
				error
				label="Time zone overlap"
				helperText="Pick one to continue."
			>
				<Radio value="full" label="Full US hours" />
				<Radio value="half" label="Half a day" />
			</RadioGroup>
			<RadioGroup label="Infrastructure as code" defaultValue="terraform">
				<Radio value="terraform" label="Terraform" />
				<Radio disabled value="cdk" label="AWS CDK" />
			</RadioGroup>
			<RadioGroup disabled label="Office" defaultValue="remote">
				<Radio value="remote" label="Remote" />
				<Radio value="medellin" label="Medellín" />
			</RadioGroup>
		</Tiles>
	),
};
export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"A required choice that reports its error only after Continue, with a row group beside it.",
			},
		},
	},
	render: () => <PreviewE />,
};
