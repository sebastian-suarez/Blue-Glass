import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/TransferList/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Row, Stack, Caption } from "../../../stories/blocks/preview-kit.js";
import { TransferList, Paper, Button, Icon } from "../../index.js";
import type { TransferListProps } from "./TransferList.js";

const meta = {
	title: "Inputs/TransferList",
	component: TransferList,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof TransferList>;
export default meta;
type Story = StoryObj<Partial<TransferListProps>>;
const B = {
	left: ["MongoDB", "React", "Rust", "Terraform", "Cloudflare"],
	right: ["Node.js", "TypeScript", "AWS", "PostgreSQL"],
};
function PreviewD() {
	const [exampleState1, setExampleState1] = React.useState<
		NonNullable<TransferListProps["value"]>
	>({
		left: ["React", "Rust", "Terraform", "Cloudflare", "MongoDB"],
		right: [
			{
				value: "Node.js",
				label: "Node.js",
				secondary: "Every backend I’ve led",
				disabled: true,
			},
			"TypeScript",
			"AWS",
			"PostgreSQL",
		],
	});
	const [isExampleState2, setIsExampleState2] = React.useState(false);
	const n = exampleState1.right.map((s) =>
		typeof s === "string" ? s : s.value,
	);
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 18 }}>
			<div style={{ display: "grid", gap: 6 }}>
				<h3 className="text-title-sm" style={{ margin: 0 }}>
					Tailor the résumé
				</h3>
				<p
					className="text-body-sm"
					style={{ margin: 0, color: "var(--color-muted)" }}
				>
					Move the skills this role cares about into the highlights. Node.js
					stays: it’s locked.
				</p>
			</div>
			<TransferList
				value={exampleState1}
				leftTitle="Stack"
				rightTitle="Highlights"
				listHeight={240}
				onChange={(s, d) => {
					setExampleState1(d);
					setIsExampleState2(false);
				}}
			/>
			<Row>
				<Button
					variant="primary"
					startIcon={<Icon name={isExampleState2 ? "check" : "download"} />}
					onClick={() => {
						setIsExampleState2(true);
					}}
				>
					{isExampleState2 ? "Saved" : "Save this version"}
				</Button>
				<Caption>{`${n.length} highlights: ${n.join(", ")}`}</Caption>
			</Row>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		leftTitle: "Stack",
		rightTitle: "On the résumé",
		showMoveAll: true,
		listHeight: 232,
		disabled: false,
		onChange: fn<() => void>(),
		onSelectionChange: fn<() => void>(),
	},
	argTypes: { leftTitle: { control: "text" }, rightTitle: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: [
				"leftTitle",
				"rightTitle",
				"showMoveAll",
				"listHeight",
				"disabled",
			],
		},
		docs: {
			description: {
				story:
					"Select rows in either well (Space or a click), then move them. The count follows the selection.",
			},
		},
	},
	render: (args) => (
		<TransferList
			defaultValue={B}
			defaultSelected={{ left: ["Rust", "Terraform"] }}
			{...args}
		/>
	),
};
export const DefaultOnPhone: Story = {
	...Default,
	name: "Default on a phone",
	tags: ["!autodocs"],
	globals: { viewport: { value: "phone", isRotated: false } },
	parameters: { ...Default.parameters, controls: { disable: true } },
};
export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Disabled rows stay put. An empty well says so. Narrow containers stack the wells and turn the arrows down and up.",
			},
		},
	},
	render: () => (
		<>
			<Stack gap={8}>
				<TransferList
					defaultValue={{
						left: [
							{
								value: "vsebcode",
								label: "VSebCode",
								secondary: "My fork of VS Code",
							},
							{
								value: "clean",
								label: "Clean Architecture template",
								secondary: "A template repository",
							},
						],
						right: [
							{
								value: "rs50",
								label: "RS50 force-feedback bridge",
								secondary: "Pinned to the top",
								disabled: true,
							},
						],
					}}
					defaultSelected={{ left: ["vsebcode"] }}
					leftTitle="Projects"
					rightTitle="Featured"
					listHeight={150}
				/>
				<Caption>secondary lines · a disabled row</Caption>
			</Stack>
			<Stack gap={8} style={{ maxWidth: 320 }}>
				<TransferList
					defaultValue={{
						left: ["Globant", "PayPal", "Gorilla Logic"],
						right: [],
					}}
					leftTitle="Employers"
					rightTitle="References"
					showMoveAll={false}
					listHeight={130}
					emptyText="Nothing here yet"
				/>
				<Caption>
					narrow container: stacked · an empty well · no move-all buttons
				</Caption>
			</Stack>
			<Stack gap={8}>
				<TransferList
					disabled
					defaultValue={{ left: ["SunDevs", "Globant"], right: ["EPAM"] }}
					leftTitle="Employers"
					rightTitle="References"
					listHeight={100}
				/>
				<Caption>disabled</Caption>
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
					"Tailoring the résumé for a role: the chosen side drives the summary.",
			},
		},
	},
	render: () => <PreviewD />,
};
