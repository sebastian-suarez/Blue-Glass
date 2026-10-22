import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/TextareaAutosize/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row, Stack } from "../../../stories/blocks/preview-kit.js";
import { Paper } from "../Paper/index.js";
import { TextareaAutosize } from "./TextareaAutosize.js";

const meta = {
	title: "Utils/TextareaAutosize",
	component: TextareaAutosize,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof TextareaAutosize>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
The preview's field look, since TextareaAutosize has none of its own.
*/
const field: CSSProperties = {
	width: "100%",
	padding: "10px 14px",
	borderRadius: "var(--radius-control)",
	border: "1px solid var(--dg-edge)",
	background: "var(--glass-control)",
	color: "var(--color-ink)",
	font: "inherit",
	fontSize: 15,
	lineHeight: 1.6,
};

export const Default: Story = {
	name: "Default",
	args: {
		minRows: 2,
		placeholder: "Type a few lines…",
		onChange: fn<() => void>(),
	},
	argTypes: { placeholder: { control: "text" } },
	parameters: {
		controls: { disable: false, include: ["minRows", "placeholder"] },
		docs: {
			description: {
				story:
					"Unstyled on its own (TextField's multiline mode styles it). It grows with its content from minRows.",
			},
		},
	},
	render: (args) => (
		<div style={{ maxWidth: 460 }}>
			<TextareaAutosize aria-label="Notes" style={field} {...args} />
		</div>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story: "maxRows caps the height; past it the textarea scrolls.",
			},
		},
	},
	render: () => (
		<Row gap={20} align="flex-start">
			<Stack gap={6} style={{ flex: "1 1 220px" }}>
				<TextareaAutosize
					aria-label="One row"
					minRows={1}
					defaultValue="minRows 1"
					style={field}
				/>
				<Caption>minRows 1</Caption>
			</Stack>
			<Stack gap={6} style={{ flex: "1 1 220px" }}>
				<TextareaAutosize
					aria-label="Capped"
					minRows={2}
					maxRows={4}
					defaultValue={
						"maxRows 4\nline two\nline three\nline four\nline five scrolls"
					}
					style={field}
				/>
				<Caption>minRows 2 · maxRows 4</Caption>
			</Stack>
		</Row>
	),
};

export const Example: Story = {
	name: "Example",
	render: () => (
		<Paper style={{ padding: 22, display: "grid", gap: 10, maxWidth: 520 }}>
			<label htmlFor="ta-msg" className="text-label">
				Message
			</label>
			<TextareaAutosize
				id="ta-msg"
				minRows={3}
				maxRows={8}
				defaultValue="Hi Sebastian, we're hiring a backend lead for a product team."
				style={field}
			/>
		</Paper>
	),
};
