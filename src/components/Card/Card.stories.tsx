import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import readme from "../../../design-system/components/Card/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack, Tiles } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import {
	Card,
	CardActionArea,
	CardActions,
	CardContent,
	CardHeader,
	CardMedia,
} from "./Card.js";

const meta = {
	title: "Surfaces/Card",
	component: Card,
	subcomponents: {
		CardHeader,
		CardContent,
		CardMedia,
		CardActions,
		CardActionArea,
	},
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
The card's repository link, named after the card so each "Repository" is unique.
*/
function RepositoryLink({ name }: { readonly name: string }) {
	return (
		<Button
			variant="text"
			href="#repo"
			endIcon={<Icon name="arrow-ne" />}
			aria-label={`${name}: repository on GitHub`}
		>
			Repository
		</Button>
	);
}

const box: CSSProperties = {
	fill: "rgba(255, 255, 255, 0.92)",
	stroke: "rgba(88, 108, 143, 0.32)",
	strokeWidth: 1,
};
const highlightedBox: CSSProperties = {
	...box,
	stroke: "var(--color-blue)",
	strokeWidth: 1.5,
};
const edge: CSSProperties = {
	fill: "none",
	stroke: "var(--dg-edge)",
	strokeWidth: 2,
	strokeLinecap: "round",
};
const highlightedEdge: CSSProperties = { ...edge, stroke: "var(--color-blue)" };
const nodeText: CSSProperties = { fill: "var(--color-ink)", fontSize: 15 };
const edgeText: CSSProperties = { fill: "var(--color-muted)", fontSize: 13 };

/**
One box of the review gate: a rounded rect with a bold title over a detail line.
*/
function GateNode({
	x,
	y,
	width,
	height,
	title,
	detail,
	isHighlighted = false,
}: {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly title: string;
	readonly detail: string;
	readonly isHighlighted?: boolean;
}) {
	return (
		<g>
			<rect
				x={x}
				y={y}
				width={width}
				height={height}
				rx={10}
				style={isHighlighted ? highlightedBox : box}
			/>
			<text textAnchor="middle" style={nodeText}>
				<tspan x={x + width / 2} y={y + height / 2 - 4} fontWeight={600}>
					{title}
				</tspan>
				<tspan x={x + width / 2} y={y + height / 2 + 16}>
					{detail}
				</tspan>
			</text>
		</g>
	);
}

/**
The VSebCode card's figure: the review gate between the coding agent, the reviewer and the repo.
*/
function ReviewGate() {
	return (
		<svg
			viewBox="-1 -1 762 252"
			role="img"
			aria-label="Review gate: Claude Code implements, Codex reviews, VSebCode merges; AGENTS.md feeds both"
			style={{
				display: "block",
				width: "100%",
				height: "auto",
				fontFamily: "var(--font-sans)",
			}}
		>
			<path d="M 180 72 L 283 72" style={edge} />
			<path d="M 287 72 L 279 76 L 279 68 Z" style={{ fill: "var(--dg-edge)" }} />
			<path d="M 289 96 L 187 96" style={{ ...edge, strokeDasharray: "6 6" }} />
			<path
				d="M 183 96 L 191 92 L 191 100 Z"
				style={{ fill: "var(--dg-edge)" }}
			/>
			<path d="M 470 84 L 573 84" style={highlightedEdge} />
			<path
				d="M 577 84 L 569 88 L 569 80 Z"
				style={{ fill: "var(--color-blue)" }}
			/>
			<path d="M 380 180 L 380 127" style={edge} />
			<path
				d="M 380 123 L 376 131 L 384 131 Z"
				style={{ fill: "var(--dg-edge)" }}
			/>
			<path
				d="M 380 150 L 90 150 L 90 127"
				style={{ ...edge, strokeLinejoin: "round" }}
			/>
			<path d="M 90 123 L 86 131 L 94 131 Z" style={{ fill: "var(--dg-edge)" }} />
			<GateNode
				x={0}
				y={48}
				width={180}
				height={72}
				title="Claude Code"
				detail="implements"
			/>
			<GateNode
				isHighlighted
				x={290}
				y={48}
				width={180}
				height={72}
				title="Codex review gate"
				detail="GPT-6 Astra, xhigh"
			/>
			<GateNode
				x={580}
				y={48}
				width={180}
				height={72}
				title="VSebCode"
				detail="merge"
			/>
			<GateNode
				x={280}
				y={180}
				width={200}
				height={64}
				title="AGENTS.md"
				detail="imported from CLAUDE.md"
			/>
			<text textAnchor="middle" style={edgeText}>
				<tspan x={235} y={62}>
					patch
				</tspan>
			</text>
			<text textAnchor="middle" style={edgeText}>
				<tspan x={235} y={118}>
					sent back
				</tspan>
			</text>
			<text
				textAnchor="middle"
				style={{ ...edgeText, fill: "var(--color-blue-deep)" }}
			>
				<tspan x={525} y={74}>
					approved
				</tspan>
			</text>
		</svg>
	);
}

// The variant tiles: tighter than a full card.
const tile: CSSProperties = { padding: 26, gap: 14 };

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"The site's project card: glass, 40px in, 26px between a title block and the footer of chips and links.",
			},
		},
	},
	render: () => (
		<Card component="article" style={{ maxWidth: 640 }}>
			<CardHeader
				title="RS50 force-feedback bridge"
				subheader="Force feedback for a Logitech RS50 under Wine on Apple Silicon. A DirectInput proxy inside the bottle, a Rust daemon on the host, GPL-2.0."
			/>
			<CardActions
				chips={["Rust", "hidapi", "DirectInput", "Wine"]}
				chipsLabel="Stack"
			/>
		</Card>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"glass for cards on the field, outlined for grouping without depth, inset for a card that sits inside a glass panel.",
			},
		},
	},
	render: () => (
		<>
			<Tiles min={200} gap={16}>
				<Stack gap={8}>
					<Card style={tile}>
						<CardHeader title="Glass" headingLevel={4} />
						<CardContent>Panels and cards on the light field.</CardContent>
					</Card>
					<Caption>glass (default) · hover lifts the shadow</Caption>
				</Stack>
				<Stack gap={8}>
					<Card variant="outlined" style={tile}>
						<CardHeader title="Outlined" headingLevel={4} />
						<CardContent>A hairline in color-line, no fill.</CardContent>
					</Card>
					<Caption>outlined</Caption>
				</Stack>
				<Stack gap={8}>
					<Card variant="inset" style={tile}>
						<CardHeader title="Inset" headingLevel={4} />
						<CardContent>A glass-inset well on radius-well.</CardContent>
					</Card>
					<Caption>inset</Caption>
				</Stack>
			</Tiles>
			<Stack gap={8}>
				<Card component="article" style={{ maxWidth: 640 }}>
					<CardHeader
						title={
							<CardActionArea href="#clean-architecture">
								Clean Architecture template
							</CardActionArea>
						}
						subheader="A Clean Architecture and DDD template with an AGENTS.md kernel, mapped to six target types from MCP servers to embedded."
					/>
					<CardActions
						chips={["TypeScript", "Node.js", "DDD", "MCP"]}
						chipsLabel="Stack"
					>
						<RepositoryLink name="Clean Architecture template" />
					</CardActions>
				</Card>
				<Caption>
					CardActionArea around the title: the whole card is one link with one
					focus ring; Repository stays its own target
				</Caption>
			</Stack>
			<Stack gap={8}>
				<Card
					variant="outlined"
					style={{ maxWidth: 640, padding: 28, gap: 18 }}
				>
					<CardHeader
						title="This portfolio"
						subheader="Static Astro pages in a private S3 bucket behind CloudFront and Cloudflare."
						headingLevel={4}
						action={
							<Button
								size="sm"
								variant="text"
								href="#how-it-works"
								endIcon={<Icon name="arrow-ne" />}
							>
								How it works
							</Button>
						}
					/>
					<CardMedia
						height={96}
						style={{ display: "grid", placeItems: "center" }}
					>
						<span
							className="text-micro"
							style={{ color: "var(--color-muted)" }}
						>
							Request path: browser → Cloudflare → CloudFront → S3
						</span>
					</CardMedia>
				</Card>
				<Caption>outlined with a header action and a media well</Caption>
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
					"Own projects: four of my own projects, where the architecture is the point.",
			},
		},
	},
	render: () => (
		<Card component="article">
			<CardHeader
				title="VSebCode"
				subheader="A fork of microsoft/vscode following VSCodium's patch set. The first repo run through my multi-model harness: Claude Code implements, Codex reviews, nothing merges unreviewed."
			/>
			<CardMedia>
				<ReviewGate />
			</CardMedia>
			<CardActions
				chips={["TypeScript", "Electron", "Claude Code", "Codex"]}
				chipsLabel="Stack"
			>
				<RepositoryLink name="VSebCode" />
			</CardActions>
		</Card>
	),
};
