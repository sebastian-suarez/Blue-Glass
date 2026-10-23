import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import readme from "../../design-system/sections/ClientWork/README.md?raw";
import { Button } from "../../src/components/Button/index.ts";
import {
	Diagram,
	type DiagramData,
	type DiagramNodeLine,
} from "../../src/components/Diagram/index.ts";
import { Icon } from "../../src/components/Icon/index.ts";
import { Paper } from "../../src/components/Paper/index.ts";
import { Tab, TabPanel, Tabs } from "../../src/components/Tabs/index.ts";
import {
	TimingChart,
	type TimingData,
} from "../../src/components/TimingChart/index.ts";
import { componentDocs } from "../blocks/component-docs.tsx";
import { SectionPage, wrap } from "../blocks/section-kit.tsx";

const meta = {
	title: "Sections/ClientWork",
	parameters: { frame: false, docs: { page: componentDocs(readme) } },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function boldLine(text: string): Exclude<DiagramNodeLine, string> {
	return { text, bold: true };
}

const cmsPipeline: DiagramData = {
	id: "cms-pipeline",
	width: 760,
	height: 200,
	label: "Client CMS to fetch service to transform service to mobile apps",
	description:
		"The client CMS feeds a fetch service that pulls its data. A transform service reshapes that data, including comments and reading time, into the mobile team's existing schema and serves the mobile apps. Both services were mine; changes to the pipeline cut response payload size by 10%.",
	regions: [{ x: 180, y: 10, w: 402, h: 170, radius: 16, tone: "panel" }],
	nodes: [
		{
			x: 0,
			y: 52,
			w: 150,
			h: 76,
			lines: [boldLine("Client CMS"), "modules, packages"],
		},
		{
			x: 196,
			y: 52,
			w: 160,
			h: 76,
			lines: [boldLine("Fetch service"), "pulls CMS data"],
		},
		{
			x: 406,
			y: 52,
			w: 160,
			h: 76,
			lines: [boldLine("Transform service"), "fits mobile schema"],
			tone: "accent",
		},
		{
			x: 610,
			y: 52,
			w: 150,
			h: 76,
			lines: [boldLine("Mobile apps"), "existing schema"],
		},
	],
	edges: [
		{
			points: [
				[150, 90],
				[191, 90],
			],
		},
		{
			points: [
				[356, 90],
				[401, 90],
			],
		},
		{
			points: [
				[566, 90],
				[605, 90],
			],
			tone: "accent",
		},
	],
	labels: [
		{ x: 196, y: 22, lines: ["Owned both services"] },
		{ x: 0, y: 140, w: 150, align: "middle", lines: ["traced, documented"] },
		{
			x: 406,
			y: 140,
			w: 160,
			align: "middle",
			lines: ["comments, reading time,", "other metadata"],
		},
		{
			x: 610,
			y: 140,
			w: 150,
			align: "middle",
			tone: "accent",
			lines: ["payload size −10%"],
		},
	],
};

const stripeAccess: DiagramData = {
	id: "stripe-access",
	width: 760,
	height: 256,
	label:
		"Gym app to Stripe checkout, Stripe webhooks to the backend, and access back to the app",
	description:
		"The gym app sends members to Stripe checkout for their subscription. Stripe webhooks report payment status to the Express.js backend, which runs on PostgreSQL on AWS, and app access follows that status.",
	nodes: [
		{
			x: 0,
			y: 48,
			w: 180,
			h: 72,
			lines: [boldLine("Gym app"), "React, React Native"],
		},
		{
			x: 290,
			y: 48,
			w: 180,
			h: 72,
			lines: [boldLine("Stripe checkout"), "subscription payment"],
		},
		{
			x: 580,
			y: 48,
			w: 180,
			h: 72,
			lines: [boldLine("Express.js backend"), "subscription status"],
			tone: "accent",
		},
		{
			x: 580,
			y: 188,
			w: 180,
			h: 64,
			lines: [boldLine("PostgreSQL"), "on AWS"],
		},
	],
	edges: [
		{
			points: [
				[180, 84],
				[285, 84],
			],
		},
		{
			points: [
				[470, 84],
				[575, 84],
			],
		},
		{
			points: [
				[670, 120],
				[670, 183],
			],
		},
		{
			points: [
				[600, 120],
				[600, 156],
				[90, 156],
				[90, 125],
			],
			tone: "accent",
		},
	],
	labels: [
		{ x: 190, y: 60, w: 86, align: "middle", lines: ["checkout"] },
		{ x: 480, y: 60, w: 86, align: "middle", lines: ["webhooks"] },
		{
			x: 190,
			y: 166,
			w: 380,
			align: "middle",
			tone: "accent",
			lines: ["access follows payment status"],
		},
	],
};

const pdfTiming: TimingData = {
	id: "pdf-timing",
	label: "PDF generation time, before and after the rework",
	description:
		"Before the rework, generating a training specification PDF took about 6 seconds. After it, 10 to 20 milliseconds.",
	axisMax: 6000,
	ticks: [
		{ value: 0, text: "0 s" },
		{ value: 2000, text: "2 s" },
		{ value: 4000, text: "4 s" },
		{ value: 6000, text: "6 s" },
	],
	rows: [
		{ name: "Before", value: 6000, text: "about 6 s" },
		{ name: "After", value: 20, text: "10–⁠20 ms", tone: "accent" },
	],
};

const muted: CSSProperties = { margin: 0, color: "var(--color-muted)" };

const projects: Array<{
	id: string;
	company: string;
	title: string;
	role: string;
	period: string;
	summary: string;
	result: string;
	stack: string;
	figure: ReactNode;
}> = [
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
		figure: <TimingChart data={pdfTiming} minScale={0.6} />,
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
		figure: <Diagram data={cmsPipeline} minScale={0.6} />,
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
		figure: <Diagram data={stripeAccess} minScale={0.6} />,
	},
];

function Folio() {
	return (
		<Tabs variant="side" aria-label="Choose a project" defaultValue="limber">
			{projects.map((project) => (
				<Tab key={project.id} value={project.id} label={project.company} />
			))}
			<Paper style={{ padding: "36px 5% 30px", minWidth: 0 }}>
				{projects.map((project, index) => (
					<TabPanel
						key={project.id}
						value={project.id}
						style={{ display: "grid", gap: 10, minWidth: 0 }}
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
						<h3
							className="text-title-md"
							style={{
								margin: "14px 0 6px",
								fontSize: "clamp(34px, 3.6vw, 50px)",
								maxWidth: "13ch",
							}}
						>
							{project.title}
						</h3>
						<span className="text-caption">{project.role}</span>
						<span className="text-micro" style={muted}>
							{project.period}
						</span>
						<p
							className="text-lede-sm"
							style={{
								margin: "14px 0 0",
								letterSpacing: "-0.015em",
								maxWidth: "61ch",
							}}
						>
							{project.summary}
						</p>
						<div
							style={{
								borderTop: "1px solid var(--color-line)",
								paddingTop: 18,
								marginTop: 10,
								display: "grid",
								gap: 8,
							}}
						>
							<span className="text-nano" style={muted}>
								Outcome
							</span>
							<span className="text-body-lg">{project.result}</span>
							<span className="text-nano" style={muted}>
								{project.stack}
							</span>
						</div>
						<Paper
							variant="inset"
							component="figure"
							style={{ margin: "24px 0 0", padding: 20, minWidth: 0 }}
						>
							{project.figure}
						</Paper>
					</TabPanel>
				))}
			</Paper>
		</Tabs>
	);
}

export const Default: Story = {
	render: () => (
		<SectionPage
			field="compact"
			note="Client work: Tabs (side, the site's folio selector), TabPanel crossfade, Paper, TimingChart and Diagram with the site's datasets."
		>
			<section
				id="work"
				aria-labelledby="work-title"
				style={{ ...wrap, paddingTop: 40 }}
			>
				<div
					style={{
						display: "flex",
						flexWrap: "wrap",
						justifyContent: "space-between",
						alignItems: "end",
						gap: 12,
						padding: "0 3px 30px",
					}}
				>
					<div>
						<h2 id="work-title" className="text-heading" style={{ margin: 0 }}>
							Client work
						</h2>
						<p className="text-small" style={{ ...muted, marginTop: 9 }}>
							Three projects from my CV, one at a time.
						</p>
					</div>
					<span className="text-micro" style={muted}>
						Medellín, Colombia · remote
					</span>
				</div>
				<Folio />
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						gap: 20,
						marginTop: 20,
						padding: "0 3px",
					}}
				>
					<span className="text-nano" style={muted}>
						Ten roles since 2017 in Experience.
					</span>
					<Button
						variant="text"
						href="#resume"
						endIcon={<Icon name="arrow-ne" />}
					>
						Full résumé
					</Button>
				</div>
			</section>
		</SectionPage>
	),
};

export const DefaultOnPhone: Story = {
	...Default,
	name: "Default on a phone",
	tags: ["!autodocs"],
	globals: { viewport: { value: "phone", isRotated: false } },
};
