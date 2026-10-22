import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import readme from "../../../design-system/components/Diagram/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row, Stack } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Diagram, DiagramHost, type DiagramData } from "./Diagram.js";

// The site's datasets, as the preview draws them.
const siteFlow: DiagramData = {
	id: "site-flow",
	width: 600,
	height: 440,
	label:
		"How this site works: a merged pull request publishes to S3, and CloudFront serves it to you through Cloudflare",
	description:
		"A pull request that passed its checks merges into main, and GitHub Actions builds the site and syncs it to a private S3 bucket. CloudFront reads that bucket with signed requests, and Cloudflare proxies the pages to your browser.",
	regions: [
		{ x: 0, y: 32, w: 600, h: 168, radius: 16, tone: "panel" },
		{ x: 0, y: 264, w: 600, h: 168, radius: 16, tone: "panel" },
	],
	nodes: [
		{
			x: 20,
			y: 96,
			w: 150,
			h: 72,
			lines: [{ text: "Pull request", bold: true }, "checks must pass"],
		},
		{
			x: 225,
			y: 96,
			w: 150,
			h: 72,
			lines: [{ text: "GitHub Actions", bold: true }, "OIDC, no keys"],
		},
		{
			x: 430,
			y: 96,
			w: 150,
			h: 72,
			lines: [{ text: "S3 bucket", bold: true }, "private"],
		},
		{
			x: 430,
			y: 328,
			w: 150,
			h: 72,
			lines: [{ text: "CloudFront", bold: true }, "cache, HTTPS"],
		},
		{
			x: 225,
			y: 328,
			w: 150,
			h: 72,
			lines: [{ text: "Cloudflare", bold: true }, "DNS, proxy, TLS"],
		},
		{
			x: 20,
			y: 328,
			w: 150,
			h: 72,
			lines: [{ text: "Your browser", bold: true }, "this page"],
			tone: "accent",
		},
	],
	edges: [
		{
			points: [
				[170, 132],
				[220, 132],
			],
		},
		{
			points: [
				[375, 132],
				[425, 132],
			],
		},
		{
			points: [
				[505, 168],
				[505, 323],
			],
		},
		{
			points: [
				[430, 364],
				[380, 364],
			],
		},
		{
			points: [
				[225, 364],
				[175, 364],
			],
			tone: "accent",
		},
	],
	labels: [
		{ x: 16, y: 44, lines: ["Publish: merge to main"] },
		{ x: 16, y: 276, lines: ["Serve: every visit"] },
		{ x: 170, y: 104, w: 55, align: "middle", lines: ["merge"] },
		{ x: 375, y: 104, w: 55, align: "middle", lines: ["sync"] },
		{ x: 517, y: 224, lines: ["signed reads"] },
		{ x: 375, y: 336, w: 55, align: "middle", lines: ["HTTPS"] },
		{
			x: 170,
			y: 336,
			w: 55,
			align: "middle",
			tone: "accent",
			lines: ["proxied"],
		},
	],
};

const requestPath: DiagramData = {
	id: "request-path",
	width: 760,
	height: 186,
	label: "A request: your browser to Cloudflare to CloudFront to the S3 bucket",
	description:
		"Your browser reaches Cloudflare, which answers from DNSSEC-signed DNS, runs its edge checks and proxies the request to CloudFront over Full (strict) TLS. CloudFront redirects www to the apex, maps folder paths to index.html and adds security headers, then reads the page from the private S3 bucket with requests signed through origin access control. When the bucket has no such page, CloudFront sends the site's 404 page.",
	nodes: [
		{
			x: 0,
			y: 20,
			w: 160,
			h: 72,
			lines: [{ text: "Your browser", bold: true }, "any device"],
		},
		{
			x: 200,
			y: 20,
			w: 160,
			h: 72,
			lines: [{ text: "Cloudflare", bold: true }, "DNS, edge"],
		},
		{
			x: 400,
			y: 20,
			w: 160,
			h: 72,
			lines: [{ text: "CloudFront", bold: true }, "CDN"],
		},
		{
			x: 600,
			y: 20,
			w: 160,
			h: 72,
			lines: [{ text: "S3 bucket", bold: true }, "origin"],
		},
	],
	edges: [
		{
			points: [
				[160, 56],
				[195, 56],
			],
			tone: "accent",
		},
		{
			points: [
				[360, 56],
				[395, 56],
			],
			tone: "accent",
		},
		{
			points: [
				[560, 56],
				[595, 56],
			],
			tone: "accent",
		},
	],
	labels: [
		{
			x: 0,
			y: 108,
			w: 160,
			align: "middle",
			lines: ["asks for", "sebastiansuarez.dev"],
		},
		{
			x: 200,
			y: 108,
			w: 160,
			align: "middle",
			lines: ["DNSSEC-signed DNS", "Full (strict) TLS", "bot and AI checks"],
		},
		{
			x: 400,
			y: 108,
			w: 160,
			align: "middle",
			lines: [
				"www → apex, 301",
				"/dir → index.html",
				"security headers",
				"404 page on misses",
			],
		},
		{
			x: 600,
			y: 108,
			w: 160,
			align: "middle",
			lines: [
				"public access blocked",
				"reads signed by OAC",
				"versions for 30 days",
			],
		},
	],
};

const pipeline: DiagramData = {
	id: "pipeline",
	width: 760,
	height: 340,
	label:
		"From an edit to production: local dev, a pull request, two required checks, the merge, then deploy or infrastructure apply",
	description:
		"Work starts locally with the Astro dev server and type checks, then goes up as a pull request into main. Two checks, Build and Terraform plan, must pass before the ruleset allows the merge. A merge that changes the site runs the deploy job, which syncs the build to S3 and invalidates CloudFront. A merge that changes infra/ runs the Terraform apply jobs, which update the IAM stack and then the site stack in AWS and Cloudflare.",
	nodes: [
		{
			x: 0,
			y: 20,
			w: 180,
			h: 72,
			lines: [{ text: "Local dev", bold: true }, "astro dev, check"],
		},
		{
			x: 290,
			y: 20,
			w: 180,
			h: 72,
			lines: [{ text: "Pull request", bold: true }, "into main"],
		},
		{
			x: 580,
			y: 20,
			w: 180,
			h: 72,
			lines: [{ text: "Two checks", bold: true }, "Build, Terraform plan"],
		},
		{
			x: 580,
			y: 150,
			w: 180,
			h: 72,
			lines: [{ text: "Merge to main", bold: true }, "ruleset enforced"],
			tone: "accent",
		},
		{
			x: 290,
			y: 150,
			w: 180,
			h: 72,
			lines: [{ text: "Deploy job", bold: true }, "production env"],
		},
		{
			x: 0,
			y: 150,
			w: 180,
			h: 72,
			lines: [{ text: "S3 + CloudFront", bold: true }, "sync, invalidate"],
		},
		{
			x: 290,
			y: 260,
			w: 180,
			h: 72,
			lines: [{ text: "Terraform applies", bold: true }, "IAM, then site"],
		},
		{
			x: 0,
			y: 260,
			w: 180,
			h: 72,
			lines: [{ text: "AWS + Cloudflare", bold: true }, "IAM and site stacks"],
		},
	],
	edges: [
		{
			points: [
				[180, 56],
				[285, 56],
			],
		},
		{
			points: [
				[470, 56],
				[575, 56],
			],
		},
		{
			points: [
				[670, 92],
				[670, 145],
			],
		},
		{
			points: [
				[580, 186],
				[475, 186],
			],
			tone: "accent",
		},
		{
			points: [
				[290, 186],
				[185, 186],
			],
			tone: "accent",
		},
		{
			points: [
				[670, 222],
				[670, 296],
				[475, 296],
			],
		},
		{
			points: [
				[290, 296],
				[185, 296],
			],
		},
	],
	labels: [
		{ x: 180, y: 30, w: 110, align: "middle", lines: ["push"] },
		{ x: 470, y: 30, w: 110, align: "middle", lines: ["runs"] },
		{ x: 682, y: 110, lines: ["both pass"] },
		{
			x: 470,
			y: 160,
			w: 110,
			align: "middle",
			tone: "accent",
			lines: ["site change"],
		},
		{
			x: 180,
			y: 160,
			w: 110,
			align: "middle",
			tone: "accent",
			lines: ["publish"],
		},
		{
			x: 480,
			y: 270,
			w: 100,
			align: "middle",
			lines: ["infra/ change"],
		},
		{ x: 180, y: 270, w: 110, align: "middle", lines: ["apply"] },
	],
};

const rings: DiagramData = {
	id: "rings",
	width: 760,
	height: 320,
	label:
		"Domain, application and infrastructure rings, fanning out to six target types",
	description:
		"The domain core sits inside the application ring, which sits inside the infrastructure and interfaces ring. From the outer ring, arrows fan out to six target types: MCP servers, CLI tools and embedded Rust on one side, mobile, desktop and libraries on the other.",
	regions: [
		{ shape: "circle", x: 240, y: 20, w: 280, h: 280, tone: "ring" },
		{
			shape: "circle",
			x: 285,
			y: 65,
			w: 190,
			h: 190,
			tone: "ring-inner",
		},
	],
	nodes: [
		{
			shape: "circle",
			x: 330,
			y: 110,
			w: 100,
			h: 100,
			lines: [{ text: "Domain", bold: true }],
			tone: "accent-fill",
		},
		{ x: 0, y: 40, w: 150, h: 48, lines: ["MCP servers"] },
		{ x: 0, y: 136, w: 150, h: 48, lines: ["CLI tools"] },
		{ x: 0, y: 232, w: 150, h: 48, lines: ["Embedded, Rust"] },
		{ x: 610, y: 40, w: 150, h: 48, lines: ["Mobile"] },
		{ x: 610, y: 136, w: 150, h: 48, lines: ["Desktop"] },
		{ x: 610, y: 232, w: 150, h: 48, lines: ["Libraries"] },
	],
	edges: [
		{
			points: [
				[277, 64],
				[155, 64],
			],
		},
		{
			points: [
				[239, 160],
				[155, 160],
			],
		},
		{
			points: [
				[277, 256],
				[155, 256],
			],
		},
		{
			points: [
				[482, 64],
				[605, 64],
			],
		},
		{
			points: [
				[521, 160],
				[605, 160],
			],
		},
		{
			points: [
				[482, 256],
				[605, 256],
			],
		},
	],
	labels: [
		{
			x: 280,
			y: 40,
			w: 200,
			align: "middle",
			lines: ["Infrastructure, interfaces"],
		},
		{ x: 330, y: 76, w: 100, align: "middle", lines: ["Application"] },
	],
};

const iacSplit: DiagramData = {
	id: "iac-split",
	width: 760,
	height: 300,
	label:
		"A person sets the ceiling in the bootstrap stack; GitHub Actions applies the IAM and site stacks below it",
	description:
		"From a laptop, a person applies the bootstrap stack: the GitHub OIDC provider, a permissions boundary and the role that applies IAM. GitHub Actions applies the IAM stack, whose deploy, plan and apply roles all carry that boundary, and then the site stack: the S3 bucket, CloudFront, the certificate and the Cloudflare DNS records. CI can change its roles only below the boundary, and can't touch the boundary, the OIDC provider or the role it applies IAM with.",
	nodes: [
		{
			x: 0,
			y: 40,
			w: 180,
			h: 72,
			lines: [{ text: "Laptop", bold: true }, "admin sign-in"],
		},
		{
			x: 290,
			y: 40,
			w: 180,
			h: 72,
			lines: [{ text: "Bootstrap stack", bold: true }, "by hand, rarely"],
		},
		{
			x: 580,
			y: 36,
			w: 180,
			h: 80,
			lines: [
				{ text: "The ceiling", bold: true },
				"permissions boundary",
				"OIDC, IAM-apply role",
			],
			tone: "accent",
		},
		{
			x: 0,
			y: 188,
			w: 180,
			h: 72,
			lines: [{ text: "GitHub Actions", bold: true }, "one role per job"],
		},
		{
			x: 290,
			y: 188,
			w: 180,
			h: 72,
			lines: [{ text: "IAM stack", bold: true }, "capped CI roles"],
		},
		{
			x: 580,
			y: 184,
			w: 180,
			h: 80,
			lines: [
				{ text: "Site stack", bold: true },
				"S3, CloudFront,",
				"ACM, Cloudflare DNS",
			],
		},
	],
	edges: [
		{
			points: [
				[180, 76],
				[285, 76],
			],
		},
		{
			points: [
				[470, 76],
				[575, 76],
			],
		},
		{
			points: [
				[670, 116],
				[670, 150],
				[380, 150],
				[380, 183],
			],
			dashed: true,
		},
		{
			points: [
				[180, 224],
				[285, 224],
			],
			tone: "accent",
		},
		{
			points: [
				[470, 224],
				[575, 224],
			],
		},
	],
	labels: [
		{ x: 180, y: 50, w: 110, align: "middle", lines: ["applies"] },
		{ x: 470, y: 50, w: 110, align: "middle", lines: ["defines"] },
		{
			x: 450,
			y: 126,
			w: 150,
			align: "middle",
			lines: ["caps CI-managed roles"],
		},
		{
			x: 180,
			y: 198,
			w: 110,
			align: "middle",
			tone: "accent",
			lines: ["applies"],
		},
		{ x: 470, y: 198, w: 110, align: "middle", lines: ["then"] },
		{
			x: 580,
			y: 270,
			w: 180,
			align: "middle",
			lines: ["holds no IAM"],
		},
	],
};

const notFound: DiagramData = {
	id: "not-found",
	width: 760,
	height: 120,
	label:
		"Your request went to CloudFront and the S3 bucket, which had no such page",
	description:
		"Your browser asked CloudFront for the page, and CloudFront looked it up in the S3 bucket. The bucket has no such page and answered 403, so CloudFront sent back this page with status 404.",
	nodes: [
		{
			x: 0,
			y: 30,
			w: 180,
			h: 72,
			lines: [{ text: "Your browser", bold: true }, "old or mistyped link"],
		},
		{
			x: 290,
			y: 30,
			w: 180,
			h: 72,
			lines: [{ text: "CloudFront", bold: true }, "sebastiansuarez.dev"],
			tone: "accent",
		},
		{
			x: 580,
			y: 30,
			w: 180,
			h: 72,
			lines: [{ text: "S3 bucket", bold: true }, "no such page"],
		},
	],
	edges: [
		{
			points: [
				[180, 52],
				[285, 52],
			],
		},
		{
			points: [
				[470, 52],
				[575, 52],
			],
		},
		{
			points: [
				[579, 82],
				[475, 82],
			],
			dashed: true,
		},
		{
			points: [
				[289, 82],
				[185, 82],
			],
			tone: "accent",
		},
	],
	labels: [
		{ x: 182, y: 26, w: 100, align: "middle", lines: ["request"] },
		{ x: 472, y: 26, w: 100, align: "middle", lines: ["lookup"] },
		{ x: 472, y: 92, w: 106, align: "middle", lines: ["403, no key"] },
		{
			x: 182,
			y: 92,
			w: 106,
			align: "middle",
			tone: "accent",
			lines: ["this page, 404"],
		},
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
			lines: [{ text: "Claude Code", bold: true }, "implements"],
		},
		{
			x: 290,
			y: 48,
			w: 180,
			h: 72,
			lines: [{ text: "Codex review gate", bold: true }, "GPT-6 Astra, xhigh"],
			tone: "accent",
		},
		{
			x: 580,
			y: 48,
			w: 180,
			h: 72,
			lines: [{ text: "VSebCode", bold: true }, "merge"],
		},
		{
			x: 280,
			y: 180,
			w: 200,
			h: 64,
			lines: [{ text: "AGENTS.md", bold: true }, "imported from CLAUDE.md"],
		},
		{
			x: 580,
			y: 180,
			w: 180,
			h: 64,
			lines: [{ text: "Antigravity", bold: true }, "reads the same file"],
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

/**
The inset well the README puts a diagram in: an inset Paper as a figure, with a text-micro
caption.
*/
function Figure({
	caption,
	maxWidth,
	children,
}: {
	readonly caption: ReactNode;
	readonly maxWidth?: CSSProperties["maxWidth"];
	readonly children: ReactNode;
}) {
	return (
		<Paper
			variant="inset"
			component="figure"
			style={{ margin: 0, padding: 22, maxWidth, minWidth: 0 }}
		>
			{children}
			<figcaption
				className="text-micro"
				style={{ marginTop: 14, color: "var(--color-muted)" }}
			>
				{caption}
			</figcaption>
		</Paper>
	);
}

const gates = [
	{ name: "Spike 0", note: "passed", isDone: true },
	{ name: "M1", note: "built", isDone: false },
	{ name: "M2", note: "planned", isDone: false },
	{ name: "M3", note: "planned", isDone: false },
];

/**
The reveal's stagger index, the --i the README tells DiagramHost's children to set.
*/
function order(index: number): CSSProperties {
	const style: CSSProperties & { "--i": number } = { "--i": index };
	return style;
}

/**
The RS50 bridge's gates, drawn by hand inside DiagramHost with the gl-dg classes.
*/
function BridgeGates() {
	return (
		<DiagramHost
			label="RS50 bridge gates: Spike 0 passed, M1 built, M2 and M3 planned"
			description="Four gates in a row. Spike 0 passed on 16 Sep 2026; M1, the rs50d daemon, is built; M2 and M3 are planned."
			width={600}
			height={92}
			minScale={0.75}
		>
			<g className="gl-dg-edge-group" aria-hidden="true">
				<path
					className="gl-dg-edge gl-dg-edge-draw"
					d="M 70 34 L 530 34"
					pathLength={1}
				/>
			</g>
			{gates.map((gate, index) => (
				<g
					key={gate.name}
					className={`gl-dg-node gl-dg-node-${gate.isDone ? "accent-fill" : "default"}`}
					style={order(index)}
				>
					<circle
						className="gl-dg-box"
						cx={70 + index * 153.3}
						cy={34}
						r={14}
					/>
				</g>
			))}
			{gates.map((gate, index) => (
				<text
					key={gate.name}
					className={`gl-dg-label${gate.isDone ? " gl-dg-label-accent" : ""}`}
					style={order(index)}
					x={70 + index * 153.3}
					y={76}
					textAnchor="middle"
					fontSize={13}
				>
					<tspan fontWeight={600}>{gate.name}</tspan>
					{" · "}
					{gate.note}
				</text>
			))}
		</DiagramHost>
	);
}

const chip: CSSProperties = {
	fontSize: 12,
	lineHeight: 1.5,
	padding: "5px 11px",
	borderRadius: "var(--radius-pill)",
	background: "var(--glass-control)",
	border: "1px solid rgba(88, 108, 143, 0.16)",
	color: "var(--ink-soft)",
};

const meta = {
	title: "Charts/Diagram",
	component: Diagram,
	parameters: { docs: { page: componentDocs(readme) } },
	args: { data: siteFlow, minScale: 0.58 },
} satisfies Meta<typeof Diagram>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The hero diagram: regions, glass nodes, edges drawn in, labels, and a pulse on the accent edge. It scales with its host down to 0.58, then scrolls.",
			},
		},
	},
	render: (args) => (
		<Figure
			maxWidth={560}
			caption="How this site works: a merged pull request publishes to a private S3 bucket, and CloudFront serves it to you through Cloudflare."
		>
			<Diagram {...args} />
		</Figure>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Every look comes from the data: node and edge tones, bends, dashes, circle regions, multi-line labels. Each one enters in order when it scrolls into view.",
			},
		},
	},
	render: () => (
		<>
			<Stack gap={8}>
				<Figure caption="What each hop does with your request.">
					<Diagram data={requestPath} minScale={0.6} />
				</Figure>
				<Caption>accent edges, each with a pulse · multi-line labels</Caption>
			</Stack>
			<Stack gap={8}>
				<Figure caption="Two required checks gate every merge; what the merge changed decides what runs next.">
					<Diagram data={pipeline} minScale={0.6} />
				</Figure>
				<Caption>accent node · a bent edge · accent labels</Caption>
			</Stack>
			<Stack gap={8}>
				<Figure caption="Clean Architecture template: three rings fanning out to six target types.">
					<Diagram data={rings} minScale={0.6} />
				</Figure>
				<Caption>
					circle regions (ring, ring-inner) · an accent-fill disc with white
					text
				</Caption>
			</Stack>
			<Stack gap={8}>
				<Figure caption="CI applies its own roles only below a boundary a person set.">
					<Diagram data={iacSplit} minScale={0.6} />
				</Figure>
				<Caption>
					a dashed edge keeps its pattern and fades instead of drawing in
				</Caption>
			</Stack>
			<Stack gap={8} style={{ width: 340, maxWidth: "100%" }}>
				<Figure caption="What happened to your request.">
					<Diagram data={notFound} minScale={0.6} />
				</Figure>
				<Caption>
					minScale 0.6 in a narrow host: it scrolls, Tab reaches it, the hint
					shows
				</Caption>
			</Stack>
			<Stack gap={8}>
				<Figure caption="The RS50 bridge's gates, hand-drawn inside DiagramHost: same shell, same reveal.">
					<BridgeGates />
				</Figure>
				<Caption>DiagramHost with your own SVG children</Caption>
			</Stack>
		</>
	),
};

export const Example: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"A project card: the diagram between the blurb and the stack, as on the home page.",
			},
		},
	},
	render: () => (
		<Paper
			component="article"
			style={{ padding: 40, display: "grid", gap: 26, maxWidth: 720 }}
		>
			<div>
				<h3 className="text-card-title" style={{ margin: 0 }}>
					VSebCode
				</h3>
				<p
					className="text-body-sm"
					style={{
						margin: "10px 0 0",
						color: "var(--color-muted)",
						maxWidth: "62ch",
					}}
				>
					A fork of microsoft/vscode following VSCodium&apos;s patch set. The
					first repo run through my multi-model harness: Claude Code implements,
					Codex reviews, nothing merges unreviewed.
				</p>
			</div>
			<Diagram data={reviewGate} minScale={0.6} />
			<Row gap={16} style={{ justifyContent: "space-between" }}>
				<Row gap={6}>
					{["TypeScript", "Electron", "Claude Code", "Codex"].map((name) => (
						<span key={name} style={chip}>
							{name}
						</span>
					))}
				</Row>
				<Button
					variant="text"
					href="#vsebcode"
					endIcon={<Icon name="arrow-ne" />}
				>
					Repository
				</Button>
			</Row>
		</Paper>
	),
};
