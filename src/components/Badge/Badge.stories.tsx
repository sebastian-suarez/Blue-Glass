import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import readme from "../../../design-system/components/Badge/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Labelled, Row } from "../../../stories/blocks/preview-kit.js";
import { Avatar } from "../Avatar/index.js";
import { Button } from "../Button/index.js";
import { Icon, type IconName } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Typography } from "../Typography/index.js";
import { Badge } from "./Badge.js";

const meta = {
	title: "Data display/Badge",
	component: Badge,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

function IconTile({ icon = "bell" }: { readonly icon?: IconName }) {
	return (
		<Paper
			variant="inset"
			radius="control"
			style={{
				width: 40,
				height: 40,
				display: "grid",
				placeItems: "center",
				color: "var(--ink-soft)",
			}}
		>
			<Icon name={icon} />
		</Paper>
	);
}

function HideToggle() {
	const [isHidden, setIsHidden] = useState(false);
	return (
		<Row gap={18}>
			<Badge badgeContent={3} invisible={isHidden} label="3 new">
				<IconTile icon="mail" />
			</Badge>
			<Button
				size="sm"
				aria-pressed={isHidden}
				onClick={() => {
					setIsHidden((hidden) => !hidden);
				}}
			>
				{isHidden ? "Show badge" : "Hide badge"}
			</Button>
		</Row>
	);
}

function ReviewQueue() {
	const [waiting, setWaiting] = useState(3);
	return (
		<Paper
			style={{
				padding: 20,
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				gap: 18,
				maxWidth: 620,
			}}
		>
			<Badge
				variant="dot"
				tone="success"
				overlap="circular"
				anchor="bottom-right"
				label="Available"
			>
				<Avatar alt="Sebastian Suarez" />
			</Badge>
			<div style={{ flex: "1 1 200px", minWidth: 0 }}>
				<Typography variant="label" component="p">
					VSebCode
				</Typography>
				<Typography variant="micro" color="muted" component="p">
					Claude Code implements, Codex reviews, nothing merges unreviewed.
				</Typography>
			</div>
			<Row gap={14}>
				<Badge
					badgeContent={waiting}
					tone="info"
					aria-label={`Pull requests, ${waiting} waiting for review`}
				>
					<Button size="sm" startIcon={<Icon name="code" />}>
						Pull requests
					</Button>
				</Badge>
				<Button
					size="sm"
					variant="text"
					disabled={waiting === 0}
					onClick={() => {
						setWaiting((count) => Math.max(0, count - 1));
					}}
				>
					Review one
				</Button>
			</Row>
			<span role="status" className="gl-sr-only">
				{waiting === 0 ? "Nothing waiting for review" : ""}
			</span>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		badgeContent: 4,
		"aria-label": "Messages, 4 unread",
		variant: "standard",
		tone: "default",
		anchor: "top-right",
		overlap: "rectangular",
		invisible: false,
	},
	argTypes: { badgeContent: { control: "number" } },
	parameters: {
		controls: {
			disable: false,
			include: [
				"badgeContent",
				"aria-label",
				"variant",
				"tone",
				"anchor",
				"overlap",
				"invisible",
			],
		},
		docs: {
			description: {
				story:
					"An ink count pill on the child's top-right corner, cut out by a 2px glass-edge ring. aria-label passes through: the button is named “Messages, 4 unread”.",
			},
		},
	},
	render: (args) => (
		<Row gap={20}>
			<Badge {...args}>
				<Button startIcon={<Icon name="mail" />}>Messages</Button>
			</Badge>
		</Row>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Status tones fill under on-ink; pair them with a word. Numbers past max read as max+.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={26} align="flex-start">
				<Labelled label="default">
					<Badge badgeContent={4}>
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="accent">
					<Badge badgeContent={4} tone="accent">
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="danger">
					<Badge badgeContent={2} tone="danger" label="2 failed checks">
						<IconTile icon="error" />
					</Badge>
				</Labelled>
				<Labelled label="warning">
					<Badge badgeContent={1} tone="warning" label="1 warning">
						<IconTile icon="warning" />
					</Badge>
				</Labelled>
				<Labelled label="success">
					<Badge badgeContent={6} tone="success" label="6 passed">
						<IconTile icon="success" />
					</Badge>
				</Labelled>
				<Labelled label="info">
					<Badge badgeContent={3} tone="info" label="3 notes">
						<IconTile icon="info" />
					</Badge>
				</Labelled>
			</Row>
			<Row gap={26} align="flex-start">
				<Labelled label="12">
					<Badge badgeContent={12}>
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="120 · max 99">
					<Badge badgeContent={120}>
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="1200 · max 999">
					<Badge badgeContent={1200} max={999}>
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="text">
					<Badge badgeContent="New" tone="accent">
						<IconTile icon="star" />
					</Badge>
				</Labelled>
				<Labelled label="0 · showZero">
					<Badge showZero badgeContent={0}>
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="dot">
					<Badge variant="dot" label="New activity">
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="invisible">
					<HideToggle />
				</Labelled>
			</Row>
			<Row gap={26} align="flex-start">
				<Labelled label="top-right">
					<Badge badgeContent={4} anchor="top-right">
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="top-left">
					<Badge badgeContent={4} anchor="top-left">
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="bottom-right">
					<Badge badgeContent={4} anchor="bottom-right">
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="bottom-left">
					<Badge badgeContent={4} anchor="bottom-left">
						<IconTile />
					</Badge>
				</Labelled>
				<Labelled label="circular · dot">
					<Badge
						variant="dot"
						tone="success"
						overlap="circular"
						anchor="bottom-right"
						label="Available"
					>
						<Avatar alt="Sebastian Suarez" />
					</Badge>
				</Labelled>
				<Labelled label="circular · count">
					<Badge badgeContent={2} overlap="circular">
						<Avatar alt="Intive" orb={1} />
					</Badge>
				</Labelled>
				<Labelled label="standalone">
					<Row gap={8}>
						<Typography variant="small">Inbox</Typography>
						<Badge badgeContent={4} label="4 unread" />
					</Row>
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
					"A review queue: the count reads as words, and it scales out at zero.",
			},
		},
	},
	render: () => (
		<>
			<ReviewQueue />
			<Caption>Press Review one until the queue is empty.</Caption>
		</>
	),
};
