import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/CssBaseline/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row, Stack } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Paper } from "../Paper/index.js";
import { CssBaseline } from "./CssBaseline.js";

const meta = {
	title: "Utils/CssBaseline",
	component: CssBaseline,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof CssBaseline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"bundle.css sets the body on tokens (color-canvas, color-ink, the system stack at 16/1.6). CssBaseline adds the element resets the site gets from Tailwind's preflight.",
			},
		},
	},
	render: () => (
		<CssBaseline>
			<Paper style={{ padding: 28, display: "grid", gap: 12, maxWidth: 560 }}>
				<h3 className="text-heading">
					Headings balance, paragraphs wrap pretty
				</h3>
				<p className="text-body" style={{ color: "var(--color-muted)" }}>
					Margins are reset, lists lose their bullets, form controls inherit the
					font, and images are block-level.
				</p>
				<ul style={{ display: "grid", gap: 4 }}>
					<li className="text-small">A list with no bullets by default</li>
					<li className="text-small">
						Spacing comes from the component, not the user agent
					</li>
				</ul>
			</Paper>
		</CssBaseline>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The base layer's two global states: the focus ring and the text selection.",
			},
		},
	},
	render: () => (
		<CssBaseline>
			<Row gap={28} align="flex-start">
				<Stack gap={8}>
					<Button
						style={{ outline: "3px solid var(--focus)", outlineOffset: 5 }}
					>
						Focused
					</Button>
					<Caption>focus: 3px solid, 5px offset</Caption>
				</Stack>
				<Stack gap={8}>
					<span
						className="text-body"
						style={{
							padding: "2px 4px",
							background: "var(--selection)",
							color: "var(--on-selection)",
							justifySelf: "start",
						}}
					>
						Selected text
					</span>
					<Caption>selection on on-selection</Caption>
				</Stack>
			</Row>
		</CssBaseline>
	),
};
