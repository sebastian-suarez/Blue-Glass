import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../design-system/sections/ProjectCard/README.md?raw";
import { Button } from "../../src/components/Button/index.ts";
import {
	Card,
	CardActions,
	CardHeader,
} from "../../src/components/Card/index.ts";
import {
	Diagram,
	type DiagramData,
	type DiagramNodeLine,
} from "../../src/components/Diagram/index.ts";
import { Icon } from "../../src/components/Icon/index.ts";
import { media } from "../../src/components/useMediaQuery/index.ts";
import { componentDocs } from "../blocks/component-docs.tsx";
import { SectionPage, wrap } from "../blocks/section-kit.tsx";

const meta = {
	title: "Sections/ProjectCard",
	parameters: { frame: false, docs: { page: componentDocs(readme) } },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function boldLine(text: string): Exclude<DiagramNodeLine, string> {
	return { text, bold: true };
}

const styles = `
.own-projects {
	grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
	gap: 64px;
}
.own-projects-intro {
	position: sticky;
}
@media ${media.tablet} {
	.own-projects {
		grid-template-columns: minmax(0, 1fr);
		gap: 32px;
	}
	.own-projects-intro {
		position: static;
	}
}
`;

const milestones: DiagramData = {
	id: "milestones",
	width: 760,
	height: 180,
	label: "Milestone plan: Spike 0, then M1, M2, M3",
	description:
		"Four gates in sequence. Spike 0, raw force packets from user space, passed when the wheel moved on 16 Sep 2026. M1, the rs50d daemon, is built and waits for its first wheel run. M2, the DirectInput proxy DLL, and M3, Assetto Corsa end to end, are planned.",
	nodes: [
		{
			x: 0,
			y: 32,
			w: 160,
			h: 88,
			lines: [boldLine("Spike 0"), "raw force packets", "from user space"],
			tone: "accent",
		},
		{
			x: 200,
			y: 32,
			w: 160,
			h: 88,
			lines: [boldLine("M1"), "rs50d daemon"],
		},
		{
			x: 400,
			y: 32,
			w: 160,
			h: 88,
			lines: [boldLine("M2"), "DirectInput", "proxy DLL"],
		},
		{
			x: 600,
			y: 32,
			w: 160,
			h: 88,
			lines: [boldLine("M3"), "Assetto Corsa,", "end to end"],
		},
	],
	edges: [
		{
			points: [
				[160, 76],
				[195, 76],
			],
		},
		{
			points: [
				[360, 76],
				[395, 76],
			],
		},
		{
			points: [
				[560, 76],
				[595, 76],
			],
		},
	],
	labels: [
		{
			x: 0,
			y: 136,
			w: 160,
			align: "middle",
			tone: "accent",
			lines: ["go: wheel moved,", "16 Sep 2026"],
		},
		{
			x: 200,
			y: 136,
			w: 160,
			align: "middle",
			lines: ["built,", "first wheel run next"],
		},
		{ x: 400, y: 136, w: 160, align: "middle", lines: ["planned"] },
		{ x: 600, y: 136, w: 160, align: "middle", lines: ["planned"] },
	],
};

const reviewGate: DiagramData = {
	id: "review-gate",
	width: 760,
	height: 250,
	label:
		"Review gate: Claude Code implements, Codex reviews, VSebCode merges; AGENTS.md feeds both",
	description:
		"Claude Code sends a patch to the Codex review gate, which either sends it back or approves it into the VSebCode merge. AGENTS.md, imported from CLAUDE.md, feeds both Claude Code and the review gate, and Antigravity reads the same file.",
	nodes: [
		{
			x: 0,
			y: 48,
			w: 180,
			h: 72,
			lines: [boldLine("Claude Code"), "implements"],
		},
		{
			x: 290,
			y: 48,
			w: 180,
			h: 72,
			lines: [boldLine("Codex review gate"), "GPT-6 Astra, xhigh"],
			tone: "accent",
		},
		{
			x: 580,
			y: 48,
			w: 180,
			h: 72,
			lines: [boldLine("VSebCode"), "merge"],
		},
		{
			x: 280,
			y: 180,
			w: 200,
			h: 64,
			lines: [boldLine("AGENTS.md"), "imported from CLAUDE.md"],
		},
		{
			x: 580,
			y: 180,
			w: 180,
			h: 64,
			lines: [boldLine("Antigravity"), "reads the same file"],
		},
	],
	edges: [
		{
			points: [
				[180, 72],
				[285, 72],
			],
		},
		{
			points: [
				[289, 96],
				[185, 96],
			],
			dashed: true,
		},
		{
			points: [
				[470, 84],
				[575, 84],
			],
			tone: "accent",
		},
		{
			points: [
				[380, 180],
				[380, 125],
			],
		},
		{
			points: [
				[380, 150],
				[90, 150],
				[90, 125],
			],
		},
		{
			points: [
				[480, 212],
				[575, 212],
			],
		},
	],
	labels: [
		{ x: 211, y: 44, w: 48, align: "middle", lines: ["patch"] },
		{ x: 199, y: 108, w: 72, align: "middle", lines: ["sent back"] },
		{
			x: 493,
			y: 56,
			w: 64,
			align: "middle",
			tone: "accent",
			lines: ["approved"],
		},
	],
};

const projects = [
	{
		title: "VSebCode",
		blurb:
			"A fork of microsoft/vscode following VSCodium's patch set. The first repo run through my multi-model harness: Claude Code implements, Codex reviews, nothing merges unreviewed.",
		tags: ["TypeScript", "Electron", "Claude Code", "Codex"],
		diagram: reviewGate,
		repo: true,
	},
	{
		title: "RS50 force-feedback bridge",
		blurb:
			"Force feedback for a Logitech RS50 under Wine on Apple Silicon. A DirectInput proxy inside the bottle, a Rust daemon on the host, GPL-2.0.",
		tags: ["Rust", "hidapi", "DirectInput", "Wine"],
		diagram: milestones,
		repo: false,
	},
];

export const Default: Story = {
	render: () => (
		<SectionPage
			field="middle"
			note="Own projects: Card (glass, the site's .card), CardHeader, Diagram with the site's datasets, CardActions (chips and a go link)."
		>
			<style>{styles}</style>
			<section
				id="projects"
				className="own-projects"
				aria-labelledby="projects-title"
				style={{
					...wrap,
					paddingTop: 40,
					display: "grid",
					alignItems: "start",
				}}
			>
				<div className="own-projects-intro" style={{ top: 40 }}>
					<h2
						id="projects-title"
						className="text-heading"
						style={{ margin: 0 }}
					>
						Own projects
					</h2>
					<p
						className="text-small"
						style={{
							margin: "12px 0 0",
							color: "var(--color-muted)",
							maxWidth: "30ch",
						}}
					>
						Four of my own projects, where the architecture is the point.
					</p>
				</div>
				<div style={{ display: "grid", gap: 28, minWidth: 0 }}>
					{projects.map((project) => (
						<Card key={project.title} component="article">
							<CardHeader title={project.title} subheader={project.blurb} />
							<Diagram data={project.diagram} minScale={0.6} />
							<CardActions chips={project.tags} chipsLabel="Stack">
								{project.repo ? (
									<Button
										variant="text"
										href="#repo"
										endIcon={<Icon name="arrow-ne" />}
										aria-label={`${project.title}: repository on GitHub`}
									>
										Repository
									</Button>
								) : null}
							</CardActions>
						</Card>
					))}
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
