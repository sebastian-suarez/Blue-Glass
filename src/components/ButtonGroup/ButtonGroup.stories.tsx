import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment, useState } from "react";
import readme from "../../../design-system/components/ButtonGroup/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import {
	Caption,
	Labelled,
	Row,
	Stack,
} from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { ButtonGroup } from "./ButtonGroup.js";

const meta = {
	title: "Inputs/ButtonGroup",
	component: ButtonGroup,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

const node = {
	padding: "8px 12px",
	borderRadius: "var(--radius-node)",
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(88, 108, 143, 0.32)",
	fontSize: 13,
	whiteSpace: "nowrap",
} as const;

/**
The preview's pipeline: four services joined by arrows.
*/
function Pipeline() {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "center",
				gap: 8,
			}}
		>
			{["GitHub Actions", "S3", "CloudFront", "Cloudflare"].map(
				(name, index) => (
					<Fragment key={name}>
						{index > 0 ? (
							<Icon
								name="arrow-right"
								size={16}
								style={{ color: "var(--dg-edge)" }}
							/>
						) : null}
						<span style={node}>{name}</span>
					</Fragment>
				),
			)}
		</div>
	);
}

/**
The preview's diagram header: a small glass group zooms the pipeline between 50% and 150%,
a primary split exports it, and text links sit under it.
*/
function DiagramHeader() {
	const [zoom, setZoom] = useState(100);
	const step = (by: number) => {
		setZoom((current) => Math.min(150, Math.max(50, current + by)));
	};

	return (
		<Paper style={{ padding: 24, display: "grid", gap: 18, maxWidth: 640 }}>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
				}}
			>
				<div style={{ display: "grid", gap: 2 }}>
					<span className="text-subtitle">How this site works</span>
					<span className="text-micro" style={{ color: "var(--color-muted)" }}>
						A merged pull request, published and served.
					</span>
				</div>
				<ButtonGroup size="sm" aria-label="Zoom">
					<Button
						aria-label="Zoom out"
						disabled={zoom <= 50}
						onClick={() => {
							step(-25);
						}}
					>
						<Icon name="minus" size={16} />
					</Button>
					<Button
						aria-label={`Reset zoom, ${zoom}%`}
						onClick={() => {
							setZoom(100);
						}}
					>
						{zoom}%
					</Button>
					<Button
						aria-label="Zoom in"
						disabled={zoom >= 150}
						onClick={() => {
							step(25);
						}}
					>
						<Icon name="plus" size={16} />
					</Button>
				</ButtonGroup>
			</div>
			<Paper
				variant="inset"
				style={{
					minHeight: 132,
					padding: 16,
					display: "grid",
					placeItems: "center",
					overflow: "hidden",
				}}
			>
				<div style={{ transform: `scale(${zoom / 100})` }}>
					<Pipeline />
				</div>
			</Paper>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
				}}
			>
				<ButtonGroup variant="primary" aria-label="Export the diagram">
					<Button startIcon={<Icon name="download" />}>Export SVG</Button>
					<Button>PNG</Button>
				</ButtonGroup>
				<ButtonGroup variant="text" aria-label="About this diagram">
					<Button href="#source" endIcon={<Icon name="arrow-ne" />}>
						Source
					</Button>
					<Button href="#how-it-works">Every service</Button>
				</ButtonGroup>
			</div>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"The site's nav pill (.identity-strip nav): a glass-faint track, 46px tall, holding nav-weight buttons.",
			},
		},
	},
	render: () => (
		<Row>
			<ButtonGroup aria-label="Résumé">
				<Button>Read résumé</Button>
				<Button>Download PDF</Button>
				<Button>Copy link</Button>
			</ButtonGroup>
		</Row>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"glass is the nav track; primary splits one ink pill with on-ink hairlines; text separates link-weight actions with short rules.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={24} align="flex-start">
				<Labelled label="glass">
					<ButtonGroup aria-label="Main navigation">
						<Button href="#work">Work</Button>
						<Button href="#projects">Projects</Button>
						<Button href="#experience">Experience</Button>
						<Button href="#contact">Contact</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="primary · split">
					<ButtonGroup variant="primary" aria-label="Contact">
						<Button>Email me</Button>
						<Button aria-label="More ways to reach me">
							<Icon name="chevron-down" size={16} />
						</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="text">
					<ButtonGroup variant="text" aria-label="Project links">
						<Button href="#repo">Repository</Button>
						<Button href="#notes">Write-up</Button>
						<Button href="#log">Changelog</Button>
					</ButtonGroup>
				</Labelled>
			</Row>
			<Row gap={24} align="flex-start">
				<Labelled label="sm · 36px">
					<ButtonGroup size="sm" aria-label="Share, small">
						<Button startIcon={<Icon name="copy" />}>Copy</Button>
						<Button startIcon={<Icon name="share" />}>Share</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="md · 46px">
					<ButtonGroup aria-label="Share, medium">
						<Button startIcon={<Icon name="copy" />}>Copy</Button>
						<Button startIcon={<Icon name="share" />}>Share</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="lg · 54px">
					<ButtonGroup size="lg" aria-label="Share, large">
						<Button startIcon={<Icon name="copy" />}>Copy</Button>
						<Button startIcon={<Icon name="share" />}>Share</Button>
					</ButtonGroup>
				</Labelled>
			</Row>
			<Row gap={24} align="flex-start">
				<Labelled label="primary · sm">
					<ButtonGroup variant="primary" size="sm" aria-label="Deploy, small">
						<Button>Deploy</Button>
						<Button aria-label="Deploy options">
							<Icon name="chevron-down" size={16} />
						</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="primary · lg">
					<ButtonGroup variant="primary" size="lg" aria-label="Deploy, large">
						<Button>Deploy</Button>
						<Button aria-label="Deploy options">
							<Icon name="chevron-down" size={16} />
						</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="text · sm">
					<ButtonGroup variant="text" size="sm" aria-label="Repository links">
						<Button href="#issues">Issues</Button>
						<Button href="#releases">Releases</Button>
					</ButtonGroup>
				</Labelled>
			</Row>
			<Row gap={24} align="flex-start">
				<Labelled label="vertical · glass" minHeight={0}>
					<ButtonGroup orientation="vertical" aria-label="Résumé, stacked">
						<Button>Read résumé</Button>
						<Button>Download PDF</Button>
						<Button>Copy link</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="vertical · primary" minHeight={0}>
					<ButtonGroup
						variant="primary"
						orientation="vertical"
						aria-label="Start, stacked"
					>
						<Button>Email me</Button>
						<Button>See the work</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="vertical · text" minHeight={0}>
					<ButtonGroup
						variant="text"
						orientation="vertical"
						aria-label="Project links, stacked"
					>
						<Button href="#repo">Repository</Button>
						<Button href="#notes">Write-up</Button>
						<Button href="#log">Changelog</Button>
					</ButtonGroup>
				</Labelled>
			</Row>
			<Row gap={24} align="flex-start">
				<Labelled label="one disabled">
					<ButtonGroup aria-label="Draft">
						<Button>Save draft</Button>
						<Button disabled>Publish</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="disabled">
					<ButtonGroup disabled aria-label="Draft, disabled">
						<Button>Save draft</Button>
						<Button>Publish</Button>
					</ButtonGroup>
				</Labelled>
				<Labelled label="primary · disabled">
					<ButtonGroup
						disabled
						variant="primary"
						aria-label="Contact, disabled"
					>
						<Button>Email me</Button>
						<Button aria-label="More ways to reach me">
							<Icon name="chevron-down" size={16} />
						</Button>
					</ButtonGroup>
				</Labelled>
			</Row>
			<Stack gap={8} style={{ maxWidth: 520 }}>
				<ButtonGroup fullWidth aria-label="Period">
					<Button>Last week</Button>
					<Button>Last month</Button>
					<Button>This year</Button>
				</ButtonGroup>
				<Caption>fullWidth: the buttons share the width</Caption>
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
					"A diagram header: a small glass group for zoom, a primary split for export, text links under it.",
			},
		},
	},
	render: () => <DiagramHeader />,
};
