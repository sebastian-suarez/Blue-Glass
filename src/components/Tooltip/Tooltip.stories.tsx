import type { Meta, StoryObj } from "@storybook/react-vite";
import type * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Tooltip/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Caption,
	Row,
	Stack,
	Stage,
} from "../../../stories/blocks/preview-kit.js";
import type { Placement } from "../../internal/anchor.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Tooltip, type TooltipProps } from "./Tooltip.js";

const meta = {
	title: "Data display/Tooltip",
	component: Tooltip,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<Partial<TooltipProps>>;

const placements: Placement[] = [
	"top",
	"top-start",
	"top-end",
	"bottom",
	"bottom-start",
	"bottom-end",
	"left",
	"left-start",
	"left-end",
	"right",
	"right-start",
	"right-end",
];

const centred: React.CSSProperties = {
	height: "100%",
	display: "grid",
	placeItems: "center",
};

const cell = (area: string): React.CSSProperties => ({
	gridArea: area,
	display: "grid",
	placeItems: "center",
});

function DefaultWithArgs(
	args: Partial<TooltipProps>,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<Partial<TooltipProps>>();
	return (
		<LiveArg
			value={args.open === true}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(isOpen, setIsOpen) => (
				<Stage height={150}>
					<div style={centred}>
						<Tooltip
							{...args}
							title={args.title}
							open={isOpen}
							onOpen={(event) => {
								args.onOpen?.(event);
								setIsOpen(true);
							}}
							onClose={(event) => {
								args.onClose?.(event);
								setIsOpen(false);
							}}
						>
							<Button variant="primary" startIcon={<Icon name="mail" />}>
								Email me
							</Button>
						</Tooltip>
					</div>
				</Stage>
			)}
		</LiveArg>
	);
}

function Placements() {
	return (
		<Stage height={300}>
			<div
				style={{
					...centred,
					gridTemplateAreas: '". n ." "w . e" ". s ."',
					gridTemplateColumns: "1fr 1fr 1fr",
					gridTemplateRows: "1fr 1fr 1fr",
					padding: "44px 0",
				}}
			>
				<div style={cell("n")}>
					<Tooltip
						arrow
						open
						disablePortal
						title="Download résumé"
						placement="top"
						describeChild={false}
					>
						<Button size="sm">
							<Icon name="download" />
						</Button>
					</Tooltip>
				</div>
				<div style={cell("e")}>
					<Tooltip
						arrow
						open
						disablePortal
						title="Copy email"
						placement="right"
						describeChild={false}
					>
						<Button size="sm">
							<Icon name="copy" />
						</Button>
					</Tooltip>
				</div>
				<div style={cell("s")}>
					<Tooltip
						arrow
						open
						disablePortal
						title="Open repository"
						placement="bottom"
						describeChild={false}
					>
						<Button size="sm">
							<Icon name="code" />
						</Button>
					</Tooltip>
				</div>
				<div style={cell("w")}>
					<Tooltip
						arrow
						open
						disablePortal
						title="Share"
						placement="left"
						describeChild={false}
					>
						<Button size="sm">
							<Icon name="share" />
						</Button>
					</Tooltip>
				</div>
			</div>
		</Stage>
	);
}

function Toolbar() {
	return (
		<Paper
			style={{
				padding: "14px 16px",
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 10,
				maxWidth: 620,
			}}
		>
			<Row gap={6} wrap={false}>
				<Tooltip title="Copy email" describeChild={false}>
					<Button size="sm">
						<Icon name="copy" />
					</Button>
				</Tooltip>
				<Tooltip title="Download résumé" describeChild={false}>
					<Button size="sm">
						<Icon name="download" />
					</Button>
				</Tooltip>
				<Tooltip title="Open repository" describeChild={false}>
					<Button size="sm">
						<Icon name="code" />
					</Button>
				</Tooltip>
				<Tooltip title="Share" describeChild={false}>
					<Button size="sm">
						<Icon name="share" />
					</Button>
				</Tooltip>
			</Row>
			<Row gap={10}>
				<Tooltip
					arrow
					title="Static Astro pages in a private S3 bucket behind CloudFront and Cloudflare."
					placement="bottom"
				>
					<Button
						size="sm"
						variant="text"
						href="#how-it-works"
						endIcon={<Icon name="arrow-ne" />}
					>
						How it works
					</Button>
				</Tooltip>
				<Tooltip title="Waiting for Codex review">
					<span style={{ display: "inline-flex" }}>
						<Button disabled size="sm" variant="primary">
							Merge
						</Button>
					</span>
				</Tooltip>
			</Row>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		title: "contact@sebastiansuarez.dev",
		open: true,
		placement: "top",
		arrow: false,
		describeChild: true,
		disablePortal: true,
		onOpen: fn<() => void>(),
		onClose: fn<() => void>(),
	},
	argTypes: {
		title: { control: "text" },
		placement: { control: "select", options: placements },
	},
	parameters: {
		controls: {
			disable: false,
			include: [
				"open",
				"title",
				"placement",
				"arrow",
				"describeChild",
				"disablePortal",
			],
		},
		docs: {
			description: {
				story:
					"An ink label that describes its child: aria-describedby while open, role tooltip, above by default.",
			},
		},
	},
	render: DefaultWithArgs,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Four placements with the arrow, which points at the anchor's centre. Icon-only buttons take the title as their name (describeChild false).",
			},
		},
	},
	render: () => (
		<>
			<Placements />
			<Stage height={170}>
				<div style={{ ...centred, placeItems: "start", padding: "28px 24px" }}>
					<Tooltip
						open
						disablePortal
						title="A DirectInput proxy inside the Wine bottle, a Rust daemon on the host. Long titles wrap at 280px."
						placement="bottom-start"
					>
						<Button size="sm" endIcon={<Icon name="info" />}>
							RS50 force-feedback bridge
						</Button>
					</Tooltip>
				</div>
			</Stage>
			<Caption>bottom-start, no arrow: a long title wraps at 280px.</Caption>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"Hover waits 500ms, then moves along the row at once. Tab shows it on focus; long-press on touch; Escape dismisses.",
			},
		},
	},
	render: () => (
		<Stack gap={10}>
			<Toolbar />
			<Caption>
				Merge is disabled, so a span wrapper takes the pointer for it.
			</Caption>
		</Stack>
	),
};
