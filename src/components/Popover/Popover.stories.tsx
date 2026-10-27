import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Popover/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import { Caption, Row, Stage } from "../../../stories/blocks/preview-kit.js";
import type { Placement } from "../../internal/anchor.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Popover, type PopoverProps } from "./Popover.js";

const meta = {
	title: "Utils/Popover",
	component: Popover,
	parameters: {
		docs: { page: componentDocs(readme) },
		a11y: {
			config: {
				rules: [
					{
						id: "aria-hidden-focus",
						selector: '[aria-hidden="true"]:not([data-base-ui-focus-guard])',
					},
				],
			},
		},
	},
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<Partial<PopoverProps>>;

type StageProps = Omit<Partial<PopoverProps>, "placement" | "children"> & {
	readonly placement: Placement;
	readonly label: string;
	readonly anchorAt?: "center" | "start";
	readonly onToggle: () => void;
};

function AnchoredStage({
	placement,
	label,
	anchorAt = "center",
	open = false,
	onToggle,
	...popover
}: StageProps) {
	const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
	const isStart = anchorAt === "start";
	return (
		<Stage height={230}>
			<div
				style={{
					height: "100%",
					display: "grid",
					placeItems: isStart ? "center start" : "center",
					paddingLeft: isStart ? 20 : 0,
				}}
			>
				<Button
					ref={setAnchor}
					size="sm"
					aria-expanded={open}
					onClick={onToggle}
				>
					{label}
				</Button>
			</div>
			<Popover
				disablePortal
				disableScrollLock
				disableAutoFocus
				disableEnforceFocus
				{...popover}
				open={open && anchor !== null}
				anchorEl={anchor}
				placement={placement}
				style={{ width: isStart ? 180 : 220 }}
			>
				<span className="text-caption">
					Anchored {placement}. Press outside or Escape to close.
				</span>
			</Popover>
		</Stage>
	);
}

function OwnStage(props: Omit<StageProps, "open" | "onToggle" | "onClose">) {
	const [isOpen, setIsOpen] = React.useState(true);
	return (
		<AnchoredStage
			{...props}
			open={isOpen}
			onToggle={() => {
				setIsOpen((wasOpen) => !wasOpen);
			}}
			onClose={() => {
				setIsOpen(false);
			}}
		/>
	);
}

function AnchoredStageWithArgs(
	args: Partial<PopoverProps>,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<Partial<PopoverProps>>();
	return (
		<LiveArg
			value={args.open !== false}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(isOpen, setIsOpen) => (
				<AnchoredStage
					{...args}
					placement="bottom-start"
					label="Anchor"
					open={isOpen}
					onToggle={() => {
						setIsOpen(!isOpen);
					}}
					onClose={(event, reason) => {
						args.onClose?.(event, reason);
						setIsOpen(false);
					}}
				/>
			)}
		</LiveArg>
	);
}

const codeStyle: React.CSSProperties = {
	padding: "6px 10px",
	borderRadius: "var(--radius-control)",
	background: "var(--glass-control)",
	border: "1px solid var(--color-line)",
	overflowWrap: "anywhere",
};

function SharePopover() {
	const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
	const [isOpen, setIsOpen] = React.useState(false);
	const [isCopied, setIsCopied] = React.useState(false);
	return (
		<Row>
			<Button
				ref={setAnchor}
				startIcon={<Icon name="share" />}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				onClick={() => {
					setIsOpen(true);
					setIsCopied(false);
				}}
			>
				Share
			</Button>
			<Caption>Opens over the whole frame; focus moves in and returns.</Caption>
			<Popover
				open={isOpen}
				anchorEl={anchor}
				role="dialog"
				aria-label="Share this project"
				style={{ width: 300, display: "grid", gap: 12 }}
				onClose={() => {
					setIsOpen(false);
				}}
			>
				<span className="text-label">Share this project</span>
				<code className="text-micro" style={codeStyle}>
					https://sebastiansuarez.dev/#projects
				</code>
				<Row gap={8}>
					<Button
						data-autofocus
						size="sm"
						variant="primary"
						startIcon={<Icon name={isCopied ? "check" : "copy"} />}
						onClick={() => {
							setIsCopied(true);
						}}
					>
						{isCopied ? "Copied" : "Copy link"}
					</Button>
					<Button
						size="sm"
						onClick={() => {
							setIsOpen(false);
						}}
					>
						Close
					</Button>
				</Row>
			</Popover>
		</Row>
	);
}

export const Default: Story = {
	name: "Default",
	args: { open: true, onClose: fn<() => void>() },
	parameters: {
		controls: { disable: false, include: ["open"] },
		docs: {
			description: {
				story:
					"A glass surface that grows from its anchor (transform-origin follows the side it opens on).",
			},
		},
	},
	render: AnchoredStageWithArgs,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"It flips to the other side when there's no room, and shifts to stay on screen.",
			},
		},
	},
	render: () => (
		<Row gap={16} align="stretch">
			<div style={{ flex: "1 1 220px" }}>
				<OwnStage placement="top" label="top" />
			</div>
			<div style={{ flex: "1 1 220px" }}>
				<OwnStage placement="right" label="right" anchorAt="start" />
			</div>
		</Row>
	),
};

export const Example: Story = {
	name: "Example",
	render: () => <SharePopover />,
};
