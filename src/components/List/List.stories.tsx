import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import readme from "../../../design-system/components/List/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack } from "../../../stories/blocks/preview-kit.js";
import { Avatar } from "../Avatar/index.js";
import { Button } from "../Button/index.js";
import { Chip } from "../Chip/index.js";
import { Divider } from "../Divider/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Typography } from "../Typography/index.js";
import {
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
} from "./List.js";

const meta = {
	title: "Data display/List",
	component: List,
	subcomponents: {
		ListItem,
		ListItemButton,
		ListItemIcon,
		ListItemText,
		ListSubheader,
	},
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof List>;

export default meta;

type Story = StoryObj<typeof meta>;

const roles = [
	{
		employer: "EPAM",
		title: "Frontend Software Engineer",
		dates: "Mar 2026 – Present",
	},
	{
		employer: "Intive",
		title: "Senior Software Engineer",
		dates: "Started Jul 2025",
	},
	{
		employer: "Globant",
		title: "Senior Software Engineer",
		dates: "Jun 2023 – Dec 2024",
	},
];

// "10–20 milliseconds" keeps the preview's word joiner (U+2060), so the range never breaks.
const projects = [
	{
		id: "limber-health-pdf",
		company: "Limber Health",
		initials: "LH",
		title: "Training PDFs. A shorter wait.",
		period: "Aug 2022 – Jun 2023",
		summary:
			"Worked on provider web and patient mobile apps for remote therapeutic monitoring and home exercises.",
		result:
			"Cut PDF generation time from about 6 seconds to 10–⁠20 milliseconds.",
	},
	{
		id: "intive-cms-mobile",
		company: "Intive",
		initials: "IN",
		title: "CMS content, ready for mobile.",
		period: "Started Jul 2025",
		summary:
			"Owned two microservices: one retrieved CMS data, and the other transformed it for mobile apps.",
		result: "Reduced response payload size by 10%.",
	},
	{
		id: "sundevs-fitness",
		company: "SunDevs",
		initials: "SD",
		title: "A fitness app. Built together.",
		period: "May 2021 – Nov 2022",
		summary:
			"Led two frontend developers and one backend developer to launch a fitness app for 1,000 existing gym clients.",
		result:
			"Launched a fitness app for 1,000 existing gym clients with access tied to subscription payment status.",
	},
];

/**
The preview's nav list: links on the side selector's glass beside the chosen project.
*/
function ClientWorkNav() {
	const [current, setCurrent] = React.useState(0);
	const project = projects[current];
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "flex-start",
				gap: 16,
			}}
		>
			<Paper
				variant="inset"
				component="nav"
				aria-label="Client work"
				style={{ flex: "1 1 214px", maxWidth: 260, padding: 7 }}
			>
				<List>
					{projects.map((item, index) => (
						<ListItemButton
							key={item.id}
							href={`#${item.id}`}
							selected={index === current}
							end={
								index === current ? <Icon name="arrow-ne" size={15} /> : null
							}
							onClick={(event) => {
								event.preventDefault();
								setCurrent(index);
							}}
						>
							<ListItemIcon>
								{/* Three projects, one orb each. */}
								<Avatar size="xs" orb={index as 0 | 1 | 2} aria-hidden="true">
									{item.initials}
								</Avatar>
							</ListItemIcon>
							<ListItemText primary={item.company} />
						</ListItemButton>
					))}
				</List>
			</Paper>
			<Paper
				component="article"
				id={project.id}
				aria-labelledby={`${project.id}-t`}
				style={{
					flex: "999 1 300px",
					minWidth: 0,
					padding: 28,
					display: "grid",
					gap: 10,
				}}
			>
				<Typography variant="micro" color="muted" component="p">
					{project.company} · {project.period}
				</Typography>
				<Typography variant="card-title" component="h3" id={`${project.id}-t`}>
					{project.title}
				</Typography>
				<Typography variant="small" color="muted">
					{project.summary}
				</Typography>
				<Divider style={{ margin: "6px 0 2px" }} />
				<Typography variant="nano" color="muted" component="p">
					Outcome
				</Typography>
				<Typography variant="body-lg">{project.result}</Typography>
			</Paper>
		</div>
	);
}

export const Default: Story = {
	name: "Default",
	args: { dense: false, divided: false },
	parameters: {
		controls: { disable: false, include: ["dense", "divided"] },
		docs: {
			description: {
				story:
					"Static rows: primary text over a muted secondary line, on the option row's geometry (40px, 13px in).",
			},
		},
	},
	render: (args) => (
		<Paper style={{ padding: 7, maxWidth: 520 }}>
			<List {...args}>
				<ListItem>
					<ListItemText
						primary="Backend"
						secondary="Node.js and TypeScript services with Clean Architecture boundaries."
					/>
				</ListItem>
				<ListItem>
					<ListItemText
						primary="Data & cloud"
						secondary="PostgreSQL and MongoDB schemas modeled around real access patterns."
					/>
				</ListItem>
				<ListItem>
					<ListItemText
						primary="Delivery"
						secondary="GitHub Actions pipelines, automated tests and OpenAPI contracts."
					/>
				</ListItem>
			</List>
		</Paper>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"divided is the career list (.career-row). Interactive rows are buttons or links on .gl-option; selected is the raised tab.",
			},
		},
		// The preview names its "Repo" link "VSebCode repository", which leaves out the visible label
		// (axe's label-content-name-mismatch, WCAG 2.5.3). The reference's preview fails the same
		// rule; this story stays faithful to it.
		a11y: {
			config: {
				rules: [{ id: "label-content-name-mismatch", enabled: false }],
			},
		},
	},
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
				gap: 20,
				alignItems: "start",
			}}
		>
			<Stack gap={8}>
				<Paper style={{ padding: "4px 22px" }}>
					<List divided aria-label="Recent roles">
						{roles.map((role) => (
							<ListItem
								key={role.employer + role.dates}
								disableGutters
								secondaryAction={role.dates}
								style={{ minHeight: 64 }}
							>
								<ListItemText
									primary={
										<span className="text-body-lg">{role.employer}</span>
									}
									secondary={role.title}
								/>
							</ListItem>
						))}
					</List>
				</Paper>
				<Caption>divided · disableGutters · secondaryAction as meta</Caption>
			</Stack>
			<Stack gap={8}>
				<Paper variant="inset" style={{ padding: 7 }}>
					<List aria-label="Sections">
						<ListItemButton selected end="4">
							<ListItemIcon>
								<Icon name="folder" />
							</ListItemIcon>
							<ListItemText primary="Own projects" />
						</ListItemButton>
						<ListItemButton selected={false} end="3">
							<ListItemIcon>
								<Icon name="layers" />
							</ListItemIcon>
							<ListItemText primary="Client work" />
						</ListItemButton>
						<ListItemButton selected={false}>
							<ListItemIcon>
								<Icon name="calendar" />
							</ListItemIcon>
							<ListItemText
								primary="Experience"
								secondary="10 roles since 2017"
							/>
						</ListItemButton>
						<ListItemButton disabled>
							<ListItemIcon>
								<Icon name="file" />
							</ListItemIcon>
							<ListItemText primary="Résumé" secondary="PDF, October 2026" />
						</ListItemButton>
					</List>
				</Paper>
				<Caption>ListItemButton · selected · end · disabled</Caption>
			</Stack>
			<Stack gap={8}>
				<Paper variant="inset" style={{ padding: 7 }}>
					<List dense aria-label="Services">
						<ListSubheader>Develop</ListSubheader>
						<ListItem>
							<ListItemText
								primary="Astro 7"
								secondary="builds static HTML and CSS"
							/>
						</ListItem>
						<ListItem>
							<ListItemText
								primary="TypeScript"
								secondary="types, checked by astro check"
							/>
						</ListItem>
						<ListSubheader>Serve</ListSubheader>
						<ListItem>
							<ListItemText
								primary="Cloudflare"
								secondary="registrar, DNS with DNSSEC, proxy and TLS"
							/>
						</ListItem>
						<ListItem>
							<ListItemText
								primary="CloudFront"
								secondary="CDN, viewer-request function, origin access control"
							/>
						</ListItem>
					</List>
				</Paper>
				<Caption>dense · ListSubheader</Caption>
			</Stack>
			<Stack gap={8}>
				<Paper variant="inset" style={{ padding: 7 }}>
					<List aria-label="Own projects">
						<ListItem
							secondaryAction={
								<Button
									size="sm"
									variant="text"
									href="#vsebcode-repo"
									aria-label="VSebCode repository"
									endIcon={<Icon name="arrow-ne" />}
								>
									Repo
								</Button>
							}
						>
							<ListItemButton>
								<ListItemIcon>
									<Icon name="code" />
								</ListItemIcon>
								<ListItemText
									primary="VSebCode"
									secondary="A fork of microsoft/vscode"
								/>
							</ListItemButton>
						</ListItem>
						<ListItem secondaryAction={<Chip size="sm" label="Private" />}>
							<ListItemButton>
								<ListItemIcon>
									<Icon name="server" />
								</ListItemIcon>
								<ListItemText
									primary="RS50 force-feedback bridge"
									secondary="Rust daemon, GPL-2.0"
								/>
							</ListItemButton>
						</ListItem>
						<ListItem>
							<ListItemText
								inset
								primary="Clean Architecture template"
								secondary="inset: no icon, text still lines up"
							/>
						</ListItem>
					</List>
				</Paper>
				<Caption>secondaryAction over an interactive row · inset text</Caption>
			</Stack>
		</div>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"A nav list on the side selector's glass: links with aria-current, the ↗ mark on the current one.",
			},
		},
	},
	render: () => <ClientWorkNav />,
};
