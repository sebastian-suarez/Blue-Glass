import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/Divider/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row, Stack } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import {
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
} from "../List/index.js";
import { Paper } from "../Paper/index.js";
import { Typography } from "../Typography/index.js";
import { Divider } from "./Divider.js";

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

// Two specimens a row, each at least 220px wide.
const specimens = {
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
	gap: 20,
} as const;

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"inset lines up with list text after an icon; middle stops 16px short of both ends.",
			},
		},
		// The preview's <Divider component="li"> puts an li with role="separator" in a ul, as
		// tests/behaviour/divider.test.tsx requires, and axe's list rule wants only list items
		// there. The reference's preview fails the same rule; this story stays faithful to it.
		a11y: { config: { rules: [{ id: "list", enabled: false }] } },
	},
	render: () => (
		<>
			<div style={specimens}>
				<Stack gap={8}>
					<Paper variant="inset" style={{ padding: 7 }}>
						<List>
							<ListItem>
								<ListItemIcon>
									<Icon name="mail" />
								</ListItemIcon>
								<ListItemText primary="Email" />
							</ListItem>
							<Divider component="li" variant="inset" />
							<ListItem>
								<ListItemIcon>
									<Icon name="code" />
								</ListItemIcon>
								<ListItemText primary="GitHub" />
							</ListItem>
							<Divider component="li" variant="inset" />
							<ListItem>
								<ListItemIcon>
									<Icon name="globe" />
								</ListItemIcon>
								<ListItemText primary="Medellín, Colombia" />
							</ListItem>
						</List>
					</Paper>
					<Caption>inset, in a list (component=&quot;li&quot;)</Caption>
				</Stack>
				<Stack gap={8}>
					<Paper
						variant="inset"
						style={{ padding: "12px 0 18px", display: "grid", gap: 12 }}
					>
						{(["full", "middle", "inset"] as const).map((variant) => (
							<div key={variant} style={{ display: "grid", gap: 8 }}>
								<Typography
									variant="micro"
									color="muted"
									style={{ paddingInline: 16 }}
								>
									{variant}
								</Typography>
								<Divider variant={variant} />
							</div>
						))}
					</Paper>
					<Caption>each variant against the well&apos;s edges</Caption>
				</Stack>
			</div>
			<Row gap={28} align="flex-start">
				<Stack gap={8}>
					<Row gap={12}>
						<Typography variant="caption">Node.js</Typography>
						<Divider orientation="vertical" />
						<Typography variant="caption">TypeScript</Typography>
						<Divider orientation="vertical" />
						<Typography variant="caption">AWS</Typography>
					</Row>
					<Caption>vertical: one text line tall</Caption>
				</Stack>
				<Stack gap={8}>
					<Row gap={12} align="stretch" wrap={false}>
						<Button size="sm">Download</Button>
						<Divider flexItem orientation="vertical" />
						<Button size="sm">Share</Button>
					</Row>
					<Caption>vertical · flexItem: full row height</Caption>
				</Stack>
				<Stack gap={8}>
					<Row gap={12} align="stretch" wrap={false}>
						<Button size="sm">Download</Button>
						<Divider flexItem orientation="vertical" variant="middle" />
						<Button size="sm">Share</Button>
					</Row>
					<Caption>flexItem · middle</Caption>
				</Stack>
			</Row>
			<div style={specimens}>
				<Stack gap={8}>
					<Divider>Earlier roles</Divider>
					<Caption>label, centred</Caption>
				</Stack>
				<Stack gap={8}>
					<Divider textAlign="left">Earlier roles</Divider>
					<Caption>label, at the start</Caption>
				</Stack>
			</div>
		</>
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
