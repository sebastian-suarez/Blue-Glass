import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, useEffect, useState } from "react";
import readme from "../../../design-system/components/Skeleton/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import {
	Labelled,
	Row,
	Stack,
	Tiles,
} from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Skeleton } from "./Skeleton.js";

const meta = {
	title: "Feedback/Skeleton",
	component: Skeleton,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

// The preview's stack tags on the loaded card, and the card both states share.
const tag: CSSProperties = {
	fontSize: 12,
	lineHeight: 1.5,
	padding: "5px 11px",
	borderRadius: "var(--radius-pill)",
	background: "var(--glass-control)",
	border: "1px solid rgba(88, 108, 143, 0.16)",
	color: "var(--ink-soft)",
};
const card: CSSProperties = {
	padding: 26,
	display: "grid",
	gap: 16,
	alignContent: "start",
	minHeight: 300,
};

/**
A project card while it loads: busy, with a hidden status line, and skeletons in the shape of
its figure, title, summary and tags.
*/
function LoadingCard() {
	return (
		<Paper component="article" style={card} aria-busy="true">
			<span className="gl-sr-only">Loading project…</span>
			<Skeleton variant="rounded" height={96} />
			<div style={{ fontSize: 22, lineHeight: 1.1 }}>
				<Skeleton width="72%" />
			</div>
			<div style={{ fontSize: 15, lineHeight: 1.6 }}>
				<Skeleton />
				<Skeleton />
				<Skeleton width="58%" />
			</div>
			<Row gap={6}>
				<Skeleton variant="rounded" width={46} height={28} />
				<Skeleton variant="rounded" width={52} height={28} />
				<Skeleton variant="rounded" width={58} height={28} />
			</Row>
		</Paper>
	);
}

/**
The same project card once it has loaded.
*/
function LoadedCard() {
	return (
		<Paper component="article" style={card}>
			<div
				style={{
					height: 96,
					borderRadius: "var(--radius-well)",
					background: "var(--glass-inset)",
					border: "1px solid var(--glass-edge)",
					boxShadow: "var(--shadow-inset)",
					display: "grid",
					placeItems: "center",
					color: "var(--color-muted)",
					fontSize: 12,
				}}
			>
				sim (Wine) → rs50d → wheel
			</div>
			<h3 className="text-title-sm" style={{ margin: 0 }}>
				RS50 force-feedback bridge
			</h3>
			<p
				className="text-body-sm"
				style={{ margin: 0, color: "var(--color-muted)" }}
			>
				A Rust daemon that carries force feedback from a Windows sim under Wine
				to the wheel on macOS.
			</p>
			<Row gap={6}>
				<span style={tag}>Rust</span>
				<span style={tag}>Wine</span>
				<span style={tag}>macOS</span>
			</Row>
		</Paper>
	);
}

/**
The preview's two cards: "Reload the second card" shows it loading for 1.8s.
*/
function ProjectCards() {
	const [isReloading, setIsReloading] = useState(false);
	useEffect(() => {
		if (!isReloading) {
			return;
		}

		const timer = setTimeout(() => {
			setIsReloading(false);
		}, 1800);
		return () => {
			clearTimeout(timer);
		};
	}, [isReloading]);
	return (
		<Stack gap={14}>
			<Row>
				<Button
					size="sm"
					startIcon={<Icon name="refresh" />}
					disabled={isReloading}
					onClick={() => {
						setIsReloading(true);
					}}
				>
					Reload the second card
				</Button>
			</Row>
			<Tiles min={260} gap={18}>
				<LoadingCard />
				{isReloading ? <LoadingCard /> : <LoadedCard />}
			</Tiles>
		</Stack>
	);
}

export const Default: Story = {
	name: "Default",
	args: { variant: "text", animation: "pulse" },
	argTypes: {
		// Storybook's docgen reads the false option as the string "false".
		animation: { control: "inline-radio", options: ["pulse", "wave", false] },
	},
	parameters: {
		controls: { disable: false, include: ["variant", "animation"] },
		docs: {
			description: {
				story:
					"Text lines at the current font size, squeezed to 60% so paragraphs keep their rhythm; a slow pulse.",
			},
		},
	},
	render: (args) => (
		<div style={{ maxWidth: 460, fontSize: 16, lineHeight: 1.6 }}>
			<Skeleton {...args} />
			<Skeleton />
			<Skeleton width="62%" />
		</div>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Shapes follow what's loading: a pill line, a circle, square corners, or radius-well. Pulse, wave or still; reduced motion is always still.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={24} align="flex-end">
				<Labelled label="text at 30px" minHeight={84}>
					<div style={{ fontSize: 30, lineHeight: 1.15, width: 180 }}>
						<Skeleton />
					</div>
				</Labelled>
				<Labelled label="circular" minHeight={84}>
					<Skeleton variant="circular" width={44} height={44} />
				</Labelled>
				<Labelled label="rectangular" minHeight={84}>
					<Skeleton variant="rectangular" width={120} height={72} />
				</Labelled>
				<Labelled label="rounded" minHeight={84}>
					<Skeleton variant="rounded" width={120} height={72} />
				</Labelled>
			</Row>
			<Row gap={24} align="flex-end">
				<Labelled label="pulse">
					<Skeleton variant="rounded" width={150} height={46} />
				</Labelled>
				<Labelled label="wave">
					<Skeleton
						variant="rounded"
						width={150}
						height={46}
						animation="wave"
					/>
				</Labelled>
				<Labelled label="still">
					<Skeleton
						variant="rounded"
						width={150}
						height={46}
						animation={false}
					/>
				</Labelled>
			</Row>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"A loading project card beside the loaded one. The card is aria-busy with a hidden status line; the skeletons themselves are aria-hidden.",
			},
		},
	},
	render: () => <ProjectCards />,
};
