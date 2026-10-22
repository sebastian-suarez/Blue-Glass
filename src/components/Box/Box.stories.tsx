import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import readme from "../../../design-system/components/Box/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import {
	Caption,
	Labelled,
	Row,
	Stack,
} from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Paper } from "../Paper/index.js";
import { type SpaceToken, Box } from "./Box.js";

const meta = {
	title: "Layout/Box",
	component: Box,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Box>;

export default meta;

type Story = StoryObj<typeof meta>;

// The preview's inset well, the plate inside it, and the employer strip's pill.
const well: CSSProperties = {
	background: "var(--glass-inset)",
	border: "1px solid var(--glass-edge)",
	boxShadow: "var(--shadow-inset)",
	borderRadius: "var(--radius-control)",
};

const plate: CSSProperties = {
	display: "block",
	background: "var(--glass-raised)",
	boxShadow: "var(--shadow-raised)",
	borderRadius: "var(--radius-node)",
	fontSize: 12,
	lineHeight: 1.5,
	padding: "4px 8px",
	color: "var(--ink-soft)",
};

const pill: CSSProperties = {
	fontSize: 13,
	padding: "7px 15px",
	borderRadius: "var(--radius-pill)",
	background: "var(--glass-inset)",
	border: "1px solid rgba(255, 255, 255, 0.9)",
	boxShadow: "var(--shadow-plate)",
	color: "#33405a",
};

const paddings: Array<[SpaceToken, string]> = [
	["xs", "8px"],
	["sm", "12px"],
	["md", "16px"],
	["lg", "24px"],
	["xl", "28px"],
	["2xl", "40px"],
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
			description: {
				story:
					'A div whose padding, margin and gap take token names: p="xl" is var(--space-xl), 28px.',
			},
		},
	},
	render: () => (
		<Box p="xl" style={{ ...well, maxWidth: 420 }}>
			<span style={plate}>{'p="xl" · 28px on every side'}</span>
		</Box>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story: "Specific sides win over axes, axes over all: pt beats py beats p.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={14} align="flex-end">
				{paddings.map(([token, length]) => (
					<Labelled key={token} label={`p="${token}" · ${length}`} minHeight={110}>
						<Box p={token} style={well}>
							<span style={plate}>{token}</span>
						</Box>
					</Labelled>
				))}
			</Row>
			<Row gap={20} align="flex-start">
				<Labelled label={'px="2xl" py="xs"'} minHeight={60}>
					<Box px="2xl" py="xs" style={well}>
						<span style={plate}>axes</span>
					</Box>
				</Labelled>
				<Labelled label={'p="lg" pt="xs"'} minHeight={60}>
					<Box p="lg" pt="xs" style={well}>
						<span style={plate}>one side wins</span>
					</Box>
				</Labelled>
				<Labelled label={'m="md" inside a well'} minHeight={60}>
					<div style={well}>
						<Box m="md" style={{ ...plate, padding: "6px 10px" }}>
							margin
						</Box>
					</div>
				</Labelled>
			</Row>
			<Stack gap={8}>
				<div style={{ ...well, padding: 8 }}>
					<Box
						mx="auto"
						p="sm"
						style={{ ...plate, width: 220, textAlign: "center" }}
					>
						{'mx="auto" centres a sized box'}
					</Box>
				</div>
			</Stack>
			<Row gap={20} align="flex-start">
				<Labelled label={'display="flex" gap="xs"'} minHeight={44}>
					<Box display="flex" gap="xs">
						{["Node.js", "TypeScript", "AWS"].map((name) => (
							<span key={name} style={plate}>
								{name}
							</span>
						))}
					</Box>
				</Labelled>
				<Labelled
					label={'display="grid" rowGap="2xs" columnGap="lg"'}
					minHeight={44}
				>
					<Box
						display="grid"
						rowGap="2xs"
						columnGap="lg"
						style={{ gridTemplateColumns: "auto auto" }}
					>
						{["PostgreSQL", "MongoDB", "Prisma", "Terraform"].map((name) => (
							<span key={name} style={plate}>
								{name}
							</span>
						))}
					</Box>
				</Labelled>
			</Row>
		</>
	),
};

export const Example: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The site's employer strip, laid out with Box alone: component sets the element, tokens set the space.",
			},
		},
	},
	render: () => (
		<>
			<Box
				component="section"
				aria-label="Employers"
				display="flex"
				gap="md"
				py="lg"
				px="3xs"
				style={{
					flexWrap: "wrap",
					alignItems: "center",
					columnGap: 22,
					borderTop: "1px solid var(--color-line)",
					borderBottom: "1px solid var(--color-line)",
				}}
			>
				<span
					style={{
						fontSize: 13,
						color: "var(--color-muted)",
						whiteSpace: "nowrap",
					}}
				>
					Shipped for
				</span>
				<Box
					component="ul"
					display="flex"
					gap="xs"
					m={0}
					p={0}
					style={{ flex: "1 1 320px", flexWrap: "wrap", listStyle: "none" }}
				>
					{employers.map((name) => (
						<li key={name} style={pill}>
							{name}
						</li>
					))}
				</Box>
			</Box>
			<Paper style={{ maxWidth: 560 }}>
				<Box p="2xl" display="grid" gap="md">
					<span className="text-title-sm">
						Open to backend lead and architect roles.
					</span>
					<span className="text-body-sm" style={{ color: "var(--color-muted)" }}>
						Product teams first. Remote from Medellín, Colombia, with full
						US-hours overlap.
					</span>
					<Box display="flex" gap="sm" mt="xs" style={{ flexWrap: "wrap" }}>
						<Button variant="primary" href="#contact">
							Email me
						</Button>
						<Button href="#work">See the work</Button>
					</Box>
				</Box>
			</Paper>
			<Caption>
				{'Paper gives the surface; Box p="2xl" gives the card padding, gap="md" the rhythm.'}
			</Caption>
		</>
	),
};
