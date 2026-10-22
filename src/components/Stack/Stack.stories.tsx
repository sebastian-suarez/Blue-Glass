import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import readme from "../../../design-system/components/Stack/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import {
	Caption,
	Labelled,
	Stack as Column,
} from "../../../stories/blocks/preview-kit.js";
import { Paper } from "../Paper/index.js";
import { Stack } from "./Stack.js";

const meta = {
	title: "Layout/Stack",
	component: Stack,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

// The site's plate pill, and a layer card for the column.
const plate: CSSProperties = {
	fontSize: 13,
	lineHeight: 1.6,
	padding: "7px 15px",
	borderRadius: "var(--radius-pill)",
	background: "var(--glass-inset)",
	border: "1px solid rgba(255, 255, 255, 0.9)",
	boxShadow: "var(--shadow-plate)",
	color: "#33405a",
	whiteSpace: "nowrap",
};

const layer: CSSProperties = {
	padding: "10px 14px",
	borderRadius: "var(--radius-node)",
	background: "var(--glass-inset)",
	border: "1px solid var(--glass-edge)",
	boxShadow: "var(--shadow-inset)",
	fontSize: 13,
	color: "var(--ink-soft)",
};

const technologies = [
	"Node.js",
	"TypeScript",
	"AWS",
	"PostgreSQL",
	"MongoDB",
	"React",
	"Rust",
	"Terraform",
	"Cloudflare",
];

const employers = [
	"PayPal",
	"Nike, via Globant",
	"EPAM",
	"Gorilla Logic",
	"Intive",
	"SunDevs",
	"Limber Health",
];

export const Default: Story = {
	parameters: {
		docs: {
			description: { story: "A column with a token gap between children." },
		},
	},
	render: () => (
		<Stack spacing="sm" style={{ maxWidth: 360 }}>
			<div style={layer}>Domain</div>
			<div style={layer}>Application</div>
			<div style={layer}>Infrastructure, interfaces</div>
		</Stack>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"direction takes a value per breakpoint (xs, sm ≥361, md ≥701, lg ≥900, xl ≥1001); divider={true} draws a hairline that turns with it.",
			},
		},
	},
	render: () => (
		<>
			<Labelled label={'direction="row" spacing="xs"'} minHeight={40}>
				<Stack direction="row" spacing="xs">
					{technologies.slice(0, 3).map((name) => (
						<span key={name} style={plate}>
							{name}
						</span>
					))}
				</Stack>
			</Labelled>
			<Labelled
				label={`direction={{ xs: 'column', md: 'row' }} divider spacing="md"`}
				minHeight={40}
			>
				<Stack
					divider
					direction={{ xs: "column", md: "row" }}
					spacing="md"
					alignItems="center"
				>
					<span className="text-caption">Spike 0 · passed</span>
					<span className="text-caption">M1 · built</span>
					<span className="text-caption">M2 · planned</span>
					<span className="text-caption">M3 · planned</span>
				</Stack>
			</Labelled>
			<Labelled label={'column · divider · spacing="sm"'} minHeight={40}>
				<Paper
					variant="inset"
					style={{ padding: "14px 18px", width: "min(360px, 100%)" }}
				>
					<Stack divider spacing="sm">
						<span className="text-small">Claude Code implements</span>
						<span className="text-small">Codex reviews</span>
						<span className="text-small">VSebCode merges</span>
					</Stack>
				</Paper>
			</Labelled>
			<Column gap={8}>
				<Stack
					wrap
					direction="row"
					justifyContent="space-between"
					alignItems="baseline"
					spacing="sm"
					style={{ maxWidth: 560 }}
				>
					<span className="text-heading">Experience</span>
					<span style={{ fontSize: 12, color: "var(--color-muted)" }}>
						Some dates overlap because I also held a side job.
					</span>
				</Stack>
				<Caption>
					direction="row" justifyContent="space-between" alignItems="baseline"
					wrap
				</Caption>
			</Column>
			<Labelled label={'direction="row" wrap spacing="2xs"'} minHeight={40}>
				<Stack wrap direction="row" spacing="2xs" style={{ maxWidth: 420 }}>
					{technologies.map((name) => (
						<span
							key={name}
							style={{ ...plate, fontSize: 12, padding: "5px 11px" }}
						>
							{name}
						</span>
					))}
				</Stack>
			</Labelled>
		</>
	),
};

export const Example: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The site's employer strip: a row from 701px with hairlines above and below, plates wrapping inside.",
			},
		},
	},
	render: () => (
		<>
			<Stack
				component="section"
				aria-label="Employers"
				direction={{ xs: "column", md: "row" }}
				spacing="md"
				alignItems="flex-start"
				style={{
					padding: "22px 3px",
					borderTop: "1px solid var(--color-line)",
					borderBottom: "1px solid var(--color-line)",
				}}
			>
				<span
					style={{
						fontSize: 13,
						color: "var(--color-muted)",
						whiteSpace: "nowrap",
						paddingTop: 8,
					}}
				>
					Shipped for
				</span>
				<Stack
					wrap
					component="ul"
					direction="row"
					spacing="xs"
					style={{ margin: 0, padding: 0, listStyle: "none" }}
				>
					{employers.map((name) => (
						<li key={name} style={plate}>
							{name}
						</li>
					))}
				</Stack>
			</Stack>
			<Column gap={6}>
				<Caption>
					Stack component="ul" keeps the list semantics; spacing tokens keep the
					rhythm.
				</Caption>
			</Column>
		</>
	),
};
