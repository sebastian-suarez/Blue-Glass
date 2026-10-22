import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import readme from "../../../design-system/components/Popper/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import { Caption, Stage } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Paper } from "../Paper/index.js";
import { Grow } from "../Transitions/index.js";
import {
	type Placement,
	type PopperProps,
	type VirtualElement,
	Popper,
} from "./Popper.js";

const meta = {
	title: "Utils/Popper",
	component: Popper,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Popper>;

export default meta;

// Each story renders its own anchor and opens on it, so open and anchorEl aren't args.
type Story = StoryObj<PopperProps>;

/**
The placements the Default's buttons offer, in the preview's order.
*/
const placements: Placement[] = [
	"top-start",
	"top",
	"top-end",
	"left",
	"right",
	"bottom-start",
	"bottom",
	"bottom-end",
];

/**
The preview's stage: an anchor in the middle, the Popper in place beside it (the stage's
transform makes it the containing block), and a button per placement.
*/
function PlacementStage({
	placement = "top",
	onPlacementChange,
	...props
}: Partial<PopperProps> & {
	readonly onPlacementChange: (placement: Placement) => void;
}) {
	const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
	return (
		<Stage height={280}>
			<div style={{ height: "100%", display: "grid", placeItems: "center" }}>
				<Paper ref={setAnchor} variant="inset" style={{ padding: "14px 18px" }}>
					<span className="text-caption">anchor</span>
				</Paper>
			</div>
			<Popper
				{...props}
				transition
				disablePortal
				open={anchor !== null}
				anchorEl={anchor}
				placement={placement}
			>
				{({ TransitionProps, placement: current }) => (
					<Grow {...TransitionProps}>
						<div
							className="text-micro"
							style={{
								padding: "6px 12px",
								borderRadius: "var(--radius-control)",
								background: "var(--color-ink)",
								color: "var(--on-ink)",
							}}
						>
							{current}
						</div>
					</Grow>
				)}
			</Popper>
			<div
				style={{
					position: "absolute",
					left: 12,
					right: 12,
					bottom: 12,
					display: "flex",
					flexWrap: "wrap",
					gap: 6,
				}}
			>
				{placements.map((option) => (
					<Button
						key={option}
						size="sm"
						variant={option === placement ? "primary" : "glass"}
						aria-pressed={option === placement}
						onClick={() => {
							onPlacementChange(option);
						}}
					>
						{option}
					</Button>
				))}
			</div>
		</Stage>
	);
}

/**
Default's stage: the placement arg drives the Popper, and the buttons set it.
*/
function PlacementStageWithArgs(
	args: PopperProps,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<PopperProps>();
	return (
		<LiveArg
			value={args.placement ?? "top"}
			fixed={viewMode === "docs"}
			onChange={(placement) => {
				updateArgs({ placement });
			}}
		>
			{(placement, setPlacement) => (
				<PlacementStage
					{...args}
					placement={placement}
					onPlacementChange={setPlacement}
				/>
			)}
		</LiveArg>
	);
}

/**
A virtual anchor at the pointer: a zero-size rect wherever it last moved over the area.
*/
function PointerAnchor() {
	const [point, setPoint] = React.useState<{ x: number; y: number } | null>(
		null,
	);
	const anchor = React.useMemo<VirtualElement | null>(
		() =>
			point === null
				? null
				: { getBoundingClientRect: () => new DOMRect(point.x, point.y, 0, 0) },
		[point],
	);
	return (
		<div
			style={{
				height: 120,
				borderRadius: "var(--radius-pane)",
				border: "1px dashed var(--color-line)",
				display: "grid",
				placeItems: "center",
			}}
			onPointerMove={(event) => {
				setPoint({ x: event.clientX, y: event.clientY });
			}}
			onPointerLeave={() => {
				setPoint(null);
			}}
		>
			<Caption>Move the pointer here: a virtual anchor follows it.</Caption>
			<Popper
				open={anchor !== null}
				anchorEl={anchor}
				placement="right-start"
				offset={14}
			>
				<div
					className="text-micro"
					style={{
						padding: "4px 10px",
						borderRadius: "var(--radius-pill)",
						background: "var(--glass-raised)",
						border: "1px solid var(--glass-edge)",
						boxShadow: "var(--shadow-raised)",
					}}
				>
					{point === null
						? ""
						: `${Math.round(point.x)}, ${Math.round(point.y)}`}
				</div>
			</Popper>
		</div>
	);
}

export const Default: Story = {
	name: "Default",
	args: { placement: "top" },
	argTypes: { placement: { control: "select", options: placements } },
	parameters: {
		controls: { disable: false, include: ["placement"] },
		docs: {
			description: {
				story:
					"A non-modal floating layer: no backdrop, no focus move. It follows scroll and resize, flips and shifts.",
			},
		},
	},
	render: PlacementStageWithArgs,
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"anchorEl can be a virtual rect: a cursor position, a text selection.",
			},
		},
	},
	render: () => <PointerAnchor />,
};
