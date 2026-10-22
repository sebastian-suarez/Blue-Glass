import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/Divider/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Row } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Typography } from "../Typography/index.js";
import { Divider } from "./Divider.js";

// The preview's Variants section is left out until List is ported: its first specimen is an
// inset divider between ListItems.

const meta = {
	title: "Data display/Divider",
	component: Divider,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Divider>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
The site's background section: a full rule under the intro, a vertical rule between the two
columns, and a start label over the links.
*/
function Background() {
	return (
		<Paper
			component="section"
			aria-labelledby="bg-title"
			style={{ padding: 28, display: "grid", gap: 22, maxWidth: 640 }}
		>
			<Typography variant="title-sm" component="h3" id="bg-title">
				A little background
			</Typography>
			<Typography variant="body-lg" style={{ maxWidth: "48ch" }}>
				I work on backend services and web and mobile apps. Node.js and React
				are my main tools.
			</Typography>
			<Divider />
			<div style={{ display: "flex", gap: 24 }}>
				<div style={{ flex: "1 1 0", minWidth: 0 }}>
					<Typography gutterBottom variant="label" component="h4">
						Education
					</Typography>
					<Typography variant="caption" color="muted" component="p">
						Bachelor of Science in Systems Engineering, Institución
						Universitaria Salazar y Herrera. Jan 2020.
					</Typography>
				</div>
				<Divider flexItem orientation="vertical" />
				<div style={{ flex: "1 1 0", minWidth: 0 }}>
					<Typography gutterBottom variant="label" component="h4">
						Languages
					</Typography>
					<Typography variant="caption" color="muted" component="p">
						Spanish: Native
					</Typography>
					<Typography variant="caption" color="muted" component="p">
						English: Full professional proficiency
					</Typography>
				</div>
			</div>
			<Divider textAlign="left">Elsewhere</Divider>
			<Row gap={10}>
				<Button
					variant="text"
					size="sm"
					href="#github"
					endIcon={<Icon name="arrow-ne" />}
				>
					GitHub
				</Button>
				<Divider orientation="vertical" />
				<Button
					variant="text"
					size="sm"
					href="#linkedin"
					endIcon={<Icon name="arrow-ne" />}
				>
					LinkedIn
				</Button>
				<Divider orientation="vertical" />
				<Button
					variant="text"
					size="sm"
					href="#resume"
					endIcon={<Icon name="arrow-ne" />}
				>
					Résumé
				</Button>
			</Row>
		</Paper>
	);
}

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"A 1px color-line hairline, the rule between the site's rows, strips and footer.",
			},
		},
	},
	render: () => (
		<Paper
			style={{ padding: "20px 28px", maxWidth: 560, display: "grid", gap: 16 }}
		>
			<Typography variant="small">
				I&apos;ve led small teams and still spend my time writing code.
			</Typography>
			<Divider />
			<Typography variant="small" color="muted">
				Some dates overlap because I also held a side job.
			</Typography>
		</Paper>
	),
};

export const Example: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The background section: a full rule, a vertical rule between columns, a start label over the links.",
			},
		},
	},
	render: () => <Background />,
};
