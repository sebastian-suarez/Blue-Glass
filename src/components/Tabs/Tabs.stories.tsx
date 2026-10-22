import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Tabs/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack } from "../../../stories/blocks/preview-kit.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { type TabsProps, Tab, TabPanel, Tabs } from "./Tabs.js";

const meta = {
	title: "Navigation/Tabs",
	component: Tabs,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

const muted: CSSProperties = { margin: 0, color: "var(--color-muted)" };

const employers = [
	"EPAM",
	"Intive",
	"Limber Health",
	"SunDevs",
	"Globant",
	"PayPal",
	"Gorilla Logic",
];

const projects = [
	{
		id: "limber",
		company: "Limber Health",
		title: "Training PDFs. A shorter wait.",
		role: "Full Stack Software Engineer",
		period: "Aug 2022 – Jun 2023",
		summary:
			"Provider web and patient mobile apps for remote therapeutic monitoring and home exercises.",
		result: "Cut PDF generation from about 6 seconds to 10–20 milliseconds.",
		stack: "React / React Native / Node.js / PostgreSQL / AWS",
	},
	{
		id: "intive",
		company: "Intive",
		title: "CMS content, ready for mobile.",
		role: "Senior Software Engineer",
		period: "Started Jul 2025",
		summary:
			"Two microservices: one retrieved CMS data, the other transformed it for the mobile apps.",
		result: "Reduced response payload size by 10%.",
		stack: "Node.js / PostgreSQL / AWS / Docker / GitHub Actions",
	},
	{
		id: "sundevs",
		company: "SunDevs",
		title: "A fitness app. Built together.",
		role: "Lead Software Engineer",
		period: "May 2021 – Nov 2022",
		summary:
			"I led two frontend developers and one backend developer, with a PM and a product owner.",
		result:
			"Launched for 1,000 existing gym clients, with access tied to Stripe subscription status.",
		stack:
			"Node.js / Express.js / React / React Native / PostgreSQL / AWS / Stripe",
	},
];

/**
The preview's site sections: underline tabs over four panels.
*/
function SiteSections(props: TabsProps) {
	return (
		<Tabs aria-label="Sections" {...props}>
			<Tab value="work" label="Work" />
			<Tab value="projects" label="Projects" />
			<Tab value="experience" label="Experience" />
			<Tab value="contact" label="Contact" />
			<TabPanel value="work">
				<p className="text-small" style={muted}>
					Client work: backend, web and mobile for Limber Health, Intive and
					SunDevs.
				</p>
			</TabPanel>
			<TabPanel value="projects">
				<p className="text-small" style={muted}>
					My own projects: the RS50 force-feedback bridge, VSebCode and the
					Clean Architecture template.
				</p>
			</TabPanel>
			<TabPanel value="experience">
				<p className="text-small" style={muted}>
					EPAM, Intive, Limber Health, SunDevs, Globant, PayPal and Gorilla
					Logic.
				</p>
			</TabPanel>
			<TabPanel value="contact">
				<p className="text-small" style={muted}>
					contact@sebastiansuarez.dev, from Medellín, Colombia.
				</p>
			</TabPanel>
		</Tabs>
	);
}

/**
The client-work folio: the side selector beside a glass panel per project.
*/
function ClientWork() {
	return (
		<Tabs variant="side" aria-label="Choose a project" defaultValue="limber">
			{projects.map((project) => (
				<Tab key={project.id} value={project.id} label={project.company} />
			))}
			<Paper style={{ padding: "30px 30px 28px" }}>
				{projects.map((project, index) => (
					<TabPanel
						key={project.id}
						value={project.id}
						style={{ display: "grid", gap: 10 }}
					>
						<span
							className="text-caption"
							style={{ display: "flex", alignItems: "center", gap: 10 }}
						>
							<span
								className={`gl-tab-orb gl-tab-orb-${index}`}
								style={{ width: 18, height: 18 }}
								aria-hidden="true"
							/>
							{project.company}
						</span>
						<h3 className="text-card-title" style={{ margin: "6px 0 0" }}>
							{project.title}
						</h3>
						<span className="text-caption">
							{project.role}
							{" · "}
							<span style={{ color: "var(--color-muted)" }}>
								{project.period}
							</span>
						</span>
						<p className="text-small" style={{ ...muted, marginTop: 4 }}>
							{project.summary}
						</p>
						<div
							style={{
								borderTop: "1px solid var(--color-line)",
								paddingTop: 14,
								marginTop: 6,
								display: "grid",
								gap: 6,
							}}
						>
							<span
								className="text-nano"
								style={{ color: "var(--color-muted)" }}
							>
								Outcome
							</span>
							<span className="text-body-lg">{project.result}</span>
							<span
								className="text-nano"
								style={{ color: "var(--color-muted)" }}
							>
								{project.stack}
							</span>
						</div>
					</TabPanel>
				))}
			</Paper>
		</Tabs>
	);
}

/**
Default's tabs: the args drive them, and a click sets the value arg.
*/
function SiteSectionsWithArgs(args: TabsProps) {
	const [, updateArgs] = useArgs<TabsProps>();
	return (
		<SiteSections
			{...args}
			onChange={(event, value) => {
				args.onChange?.(event, value);
				updateArgs({ value });
			}}
		/>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		value: "work",
		variant: "underline",
		fullWidth: false,
		onChange: fn<() => void>(),
	},
	argTypes: {
		value: {
			control: "inline-radio",
			options: ["work", "projects", "experience", "contact"],
		},
	},
	parameters: {
		controls: { disable: false, include: ["value", "variant", "fullWidth"] },
		docs: {
			description: {
				story:
					"Underline: tabs in a row over the site's 16px ink mark, which slides to the selected tab. The panel fades in over 280ms.",
			},
		},
	},
	render: SiteSectionsWithArgs,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Pill is the site's nav pill with the raised tab selected. Tabs take icons and can be disabled. A long row scrolls, fades its edges and keeps the selected tab in view.",
			},
		},
	},
	render: () => (
		<>
			<Stack gap={8}>
				<Caption>pill</Caption>
				<Tabs variant="pill" aria-label="Site sections" defaultValue="projects">
					<Tab value="work" label="Work" />
					<Tab value="projects" label="Projects" />
					<Tab value="experience" label="Experience" />
					<Tab value="contact" label="Contact" />
				</Tabs>
			</Stack>
			<Stack gap={8}>
				<Caption>underline · icons · disabled</Caption>
				<Tabs aria-label="VSebCode" defaultValue="overview">
					<Tab value="overview" icon={<Icon name="home" />} label="Overview" />
					<Tab
						value="review"
						icon={<Icon name="layers" />}
						label="Review gate"
					/>
					<Tab value="stack" icon={<Icon name="code" />} label="Stack" />
					<Tab
						disabled
						value="releases"
						icon={<Icon name="clock" />}
						label="Releases"
					/>
				</Tabs>
			</Stack>
			<Stack gap={8}>
				<Caption>scrollable · pill</Caption>
				<div style={{ maxWidth: 360 }}>
					<Tabs variant="pill" aria-label="Employers" defaultValue="Intive">
						{employers.map((name) => (
							<Tab key={name} value={name} label={name} />
						))}
					</Tabs>
				</div>
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
					"Side: the client-work folio. A 176px selector with the orb and the check, beside a glass panel; a row of tabs on phones.",
			},
		},
	},
	render: () => <ClientWork />,
};

// Example at the phone size the layout gate checks: its axe test runs at 390px too, and the
// tag keeps the copy off the docs page.
export const ExampleOnPhone: Story = {
	...Example,
	name: "Example on a phone",
	tags: ["!autodocs"],
	globals: { viewport: { value: "phone", isRotated: false } },
};
