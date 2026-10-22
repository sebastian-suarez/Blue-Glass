import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import readme from "../../../design-system/components/Paper/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack, Tiles } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "./Paper.js";

const meta = {
	title: "Surfaces/Paper",
	component: Paper,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Paper>;

export default meta;

type Story = StoryObj<typeof meta>;

// A specimen tile: tall enough to show the surface, with its label at the bottom.
const tile: CSSProperties = {
	padding: 22,
	minHeight: 120,
	display: "grid",
	alignContent: "end",
};

export const Default: Story = {
	name: "Default",
	args: { variant: "glass" },
	parameters: {
		controls: { disable: false, include: ["variant"] },
		docs: {
			description: {
				story:
					"Glass: translucent white over the light field, blurred, with a 1px highlight and a soft drop.",
			},
		},
	},
	render: (args) => (
		<Paper {...args} style={{ padding: 28, maxWidth: 520 }}>
			<p className="text-body" style={{ margin: 0 }}>
				Every panel on the site is cut from this.
			</p>
		</Paper>
	),
};

export const Variants: Story = {
	name: "Variants",
	render: () => (
		<>
			<Tiles min={160}>
				<Stack gap={8}>
					<Paper style={tile}>
						<span className="text-caption">glass</span>
					</Paper>
					<Caption>panels, cards, dialogs</Caption>
				</Stack>
				<Stack gap={8}>
					<Paper variant="inset" style={tile}>
						<span className="text-caption">inset</span>
					</Paper>
					<Caption>a well inside a panel</Caption>
				</Stack>
				<Stack gap={8}>
					<Paper variant="solid" style={tile}>
						<span className="text-caption">solid</span>
					</Paper>
					<Caption>stacked on glass</Caption>
				</Stack>
				<Stack gap={8}>
					<Paper variant="outlined" style={tile}>
						<span className="text-caption">outlined</span>
					</Paper>
					<Caption>hairline only</Caption>
				</Stack>
			</Tiles>
			<Tiles min={160}>
				<Stack gap={8}>
					<Paper elevation={0} style={tile}>
						<span className="text-caption">elevation 0</span>
					</Paper>
				</Stack>
				<Stack gap={8}>
					<Paper elevation={1} style={tile}>
						<span className="text-caption">elevation 1</span>
					</Paper>
				</Stack>
				<Stack gap={8}>
					<Paper elevation={2} style={tile}>
						<span className="text-caption">elevation 2</span>
					</Paper>
				</Stack>
			</Tiles>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"The hero figure: a glass panel holding an inset well and a caption.",
			},
		},
	},
	render: () => (
		<Paper component="figure" style={{ margin: 0, padding: 28, maxWidth: 560 }}>
			<Paper
				variant="inset"
				style={{
					height: 150,
					display: "grid",
					placeItems: "center",
					color: "var(--color-muted)",
				}}
			>
				<span className="text-caption">diagram</span>
			</Paper>
			<figcaption
				className="text-micro"
				style={{ marginTop: 14, color: "var(--color-muted)" }}
			>
				How this site works: a merged pull request publishes to a private S3
				bucket, and CloudFront serves it to you through Cloudflare.
				<span style={{ display: "block", marginTop: 4 }}>
					<Button
						variant="text"
						href="#how-it-works"
						endIcon={<Icon name="arrow-ne" />}
					>
						See every service
					</Button>
				</span>
			</figcaption>
		</Paper>
	),
};
