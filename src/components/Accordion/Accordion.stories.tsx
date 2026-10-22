import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import readme from "../../../design-system/components/Accordion/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack } from "../../../stories/blocks/preview-kit.js";
import { Icon } from "../Icon/index.js";
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	PaneAccordion,
	type PaneAccordionItem,
} from "./Accordion.js";

const meta = {
	title: "Surfaces/Accordion",
	component: Accordion,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

type Role = {
	employer: string;
	title: string;
	dates: string;
	location: string;
	paragraphs: string[];
};

const roles: Role[] = [
	{
		employer: "EPAM",
		title: "Frontend Software Engineer",
		dates: "Mar 2026 – Present",
		location: "Remote",
		paragraphs: [
			"I'm part of the frontend team on a Johnson & Johnson project. The tools let surgeons and physicians study cases they led or were involved in. We're bringing the service to a subplatform called Monarch, which has a different mix of features. Feature flags and permissions control what's available.",
		],
	},
	{
		employer: "Intive",
		title: "Senior Software Engineer",
		dates: "Started Jul 2025",
		location: "Remote",
		paragraphs: [
			"There were two microservices to look after: one pulled data from the CMS, and one transformed it for the mobile apps. I owned both services.",
			"Changes to the processing pipeline cut response payload size by 10%. I worked with Node.js, PostgreSQL, AWS, Docker, and GitHub Actions.",
		],
	},
	{
		employer: "EPAM",
		title: "Lead Software Engineer",
		dates: "Dec 2024 – Apr 2025",
		location: "Remote",
		paragraphs: [
			"During this earlier period, I wasn't assigned to a client project.",
		],
	},
	{
		employer: "Globant",
		title: "Senior Software Engineer",
		dates: "Jun 2023 – Dec 2024",
		location: "Medellín, Colombia",
		paragraphs: [
			"At Globant I worked on Nike's CMS, mainly localization and translation. The publishing changes cut the time from content creation to live publication by 5%.",
		],
	},
	{
		employer: "Limber Health",
		title: "Full Stack Software Engineer",
		dates: "Aug 2022 – Jun 2023",
		location: "Remote",
		paragraphs: [
			"I worked on the web app for providers and the mobile app for patients, on a product for remote therapeutic monitoring and home exercises.",
			// A word joiner keeps "10–20" on one line.
			"I reworked PDF generation for training specifications. Before: about 6 seconds. After: 10–⁠20 milliseconds.",
		],
	},
	{
		employer: "SunDevs",
		title: "Lead Software Engineer",
		dates: "May 2021 – Nov 2022",
		location: "Remote",
		paragraphs: [
			"I led two frontend developers and one backend developer. We launched a fitness app for 1,000 existing gym clients, with Stripe checkout and webhooks deciding app access.",
		],
	},
];

const capabilities: PaneAccordionItem[] = [
	{
		title: "Backend",
		tone: "default",
		text: "Node.js and TypeScript services with Clean Architecture boundaries and DDD vocabulary. Java and Spring before that.",
		chips: [
			"Node.js",
			"TypeScript",
			"Express.js",
			"NestJS",
			"REST APIs",
			"DDD",
		],
	},
	{
		title: "Frontend & mobile",
		tone: "alt",
		text: "React and React Native apps, with feature flags and permissions deciding what each user can reach.",
		chips: ["React", "React Native", "Material UI", "Feature flags"],
	},
	{
		title: "Data & cloud",
		tone: "default",
		text: "PostgreSQL and MongoDB schemas modeled around real access patterns. AWS, from IAM hardening to production services.",
		chips: ["PostgreSQL", "MongoDB", "Prisma", "AWS", "IAM"],
	},
	{
		title: "Hardware",
		tone: "accent",
		text: "Rust on embedded targets, plus the CAD, FDM printing and carbon fiber to build the enclosure.",
		chips: ["Rust", "Arduino", "hidapi", "CAD", "Carbon fiber"],
	},
];

const ownProjects = [
	{
		id: "rs50",
		title: "RS50 force-feedback bridge",
		meta: "Rust · GPL-2.0",
		text: "Force feedback for a Logitech RS50 under Wine on Apple Silicon. A DirectInput proxy inside the bottle, a Rust daemon on the host.",
	},
	{
		id: "vsebcode",
		title: "VSebCode",
		meta: "TypeScript",
		text: "A fork of microsoft/vscode following VSCodium's patch set. Claude Code implements, Codex reviews, nothing merges unreviewed.",
	},
	{
		id: "clean",
		title: "Clean Architecture template",
		meta: "Node.js · DDD",
		text: "A Clean Architecture and DDD template with an AGENTS.md kernel, mapped to six target types from MCP servers to embedded.",
	},
];

/**
One row of the career list: employer, title and dates, the paragraphs, then the location.
*/
function CareerRow({
	role,
	isOpen = false,
}: {
	readonly role: Role;
	readonly isOpen?: boolean;
}) {
	return (
		<Accordion defaultExpanded={isOpen}>
			<AccordionSummary secondary={role.title} meta={role.dates}>
				{role.employer}
			</AccordionSummary>
			<AccordionDetails meta={role.location}>
				{role.paragraphs.map((paragraph) => (
					<p key={paragraph}>{paragraph}</p>
				))}
			</AccordionDetails>
		</Accordion>
	);
}

/**
The site's own projects, one open at a time: expanded and onChange kept in this parent.
*/
function OneOpenAtATime() {
	const [open, setOpen] = useState<string | false>("vsebcode");
	return (
		<div className="gl-accordion-surface">
			{ownProjects.map((project) => (
				<Accordion
					key={project.id}
					expanded={open === project.id}
					onChange={(_event, isExpanded) => {
						setOpen(isExpanded ? project.id : false);
					}}
				>
					<AccordionSummary meta={project.meta}>
						{project.title}
					</AccordionSummary>
					<AccordionDetails inset={false}>
						<p>{project.text}</p>
					</AccordionDetails>
				</Accordion>
			))}
		</div>
	);
}

/**
A section heading with its note beside it, as the site's sections open.
*/
function SectionHead({
	title,
	note,
}: {
	readonly title: string;
	readonly note: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "baseline",
				justifyContent: "space-between",
				gap: "8px 30px",
				padding: "0 3px",
			}}
		>
			<h2 className="text-heading" style={{ margin: 0 }}>
				{title}
			</h2>
			<p
				style={{
					margin: 0,
					fontSize: 12,
					color: "var(--color-muted)",
					maxWidth: "40ch",
				}}
			>
				{note}
			</p>
		</div>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"Rows on the career list's glass surface (class gl-accordion-surface). The summary is a button in a heading; the plus turns into a minus.",
			},
		},
	},
	render: () => (
		<div className="gl-accordion-surface">
			{roles.slice(0, 3).map((role, index) => (
				<CareerRow key={role.dates} role={role} isOpen={index === 0} />
			))}
		</div>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Columns follow what you pass; an expandIcon replaces the plus; disabled rows stay readable but inert.",
			},
		},
	},
	render: () => (
		<>
			<Stack gap={8}>
				<div className="gl-accordion-surface">
					<Accordion>
						<AccordionSummary
							secondary="Full Stack Software Engineer"
							meta="Aug 2022 – Jun 2023"
						>
							Limber Health
						</AccordionSummary>
						<AccordionDetails meta="Remote">
							<p>
								{
									"I reworked PDF generation for training specifications. Before: about 6 seconds. After: 10–"
								}
								{"⁠"}
								{"20 milliseconds."}
							</p>
						</AccordionDetails>
					</Accordion>
					<Accordion>
						<AccordionSummary meta="6 target types">
							Clean Architecture template
						</AccordionSummary>
						<AccordionDetails>
							<p>
								Mapped from MCP servers and CLI tools to embedded Rust, mobile,
								desktop and libraries.
							</p>
						</AccordionDetails>
					</Accordion>
					<Accordion>
						<AccordionSummary expandIcon={<Icon name="chevron-down" />}>
							How this site works
						</AccordionSummary>
						<AccordionDetails inset={false}>
							<p>
								A merged pull request publishes to a private S3 bucket, and
								CloudFront serves it to you through Cloudflare.
							</p>
						</AccordionDetails>
					</Accordion>
					<Accordion disabled>
						<AccordionSummary meta="Not published yet">
							Résumé as a PDF
						</AccordionSummary>
						<AccordionDetails>
							<p>Coming with the next résumé update.</p>
						</AccordionDetails>
					</Accordion>
				</div>
				<Caption>
					secondary + meta · meta only · title with expandIcon · disabled
				</Caption>
			</Stack>
			<Stack gap={8}>
				<OneOpenAtATime />
				<Caption>
					controlled: one open at a time (expanded + onChange); details run full
					width with inset=false
				</Caption>
			</Stack>
			<Stack gap={8}>
				<PaneAccordion
					orientation="horizontal"
					items={[capabilities[0], capabilities[1], capabilities[3]]}
					defaultOpen={["backend"]}
				/>
				<Caption>
					PaneAccordion, horizontal (stacks on phones): hover, focus or a press
					widens a pane to 2.6x and reveals its chips · tones default, alt,
					accent
				</Caption>
			</Stack>
			<Stack gap={8}>
				<PaneAccordion
					orientation="vertical"
					items={capabilities.slice(0, 2)}
				/>
				<Caption>
					PaneAccordion, stacked (auto at 899px and below, or vertical): chips
					shown, a press closes a pane
				</Caption>
			</Stack>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: { story: "The site's Experience section." },
		},
	},
	render: () => (
		<Stack gap={22}>
			<SectionHead
				title="Experience"
				note="Some dates overlap because I also held a side job."
			/>
			<div className="gl-accordion-surface">
				{roles.map((role, index) => (
					<CareerRow key={role.dates} role={role} isOpen={index === 0} />
				))}
			</div>
		</Stack>
	),
};
