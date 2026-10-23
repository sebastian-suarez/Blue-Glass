import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/NoSsr/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row } from "../../../stories/blocks/preview-kit.js";
import { Paper } from "../Paper/index.js";
import { NoSsr } from "./NoSsr.js";

const meta = {
	title: "Utils/NoSsr",
	component: NoSsr,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof NoSsr>;

export default meta;

type Story = StoryObj<typeof meta>;

function FrameWidth() {
	return (
		<span className="text-body">
			This frame is {globalThis.innerWidth}px wide.
		</span>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"Children render only in the browser, after mount: safe for anything that reads window or the DOM.",
			},
		},
	},
	render: () => (
		<Paper style={{ padding: 22, maxWidth: 520 }}>
			<NoSsr
				fallback={
					<span className="text-body" style={{ color: "var(--color-muted)" }}>
						Measuring…
					</span>
				}
			>
				<FrameWidth />
			</NoSsr>
		</Paper>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"defer waits one more animation frame, for heavy children that shouldn't block first paint.",
			},
		},
	},
	render: () => (
		<Row>
			<NoSsr defer fallback={<Caption>deferred…</Caption>}>
				<Caption>Rendered a frame after mount.</Caption>
			</NoSsr>
		</Row>
	),
};
