import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Backdrop/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import { Caption, Row, Stage } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Paper } from "../Paper/index.js";
import { Backdrop, type BackdropProps } from "./Backdrop.js";

const meta = {
	title: "Feedback/Backdrop",
	component: Backdrop,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Backdrop>;

export default meta;

type Story = StoryObj<typeof meta>;

// As in the preview: over its region, above the region's content, with its copy centred.
const cover: React.CSSProperties = {
	position: "absolute",
	zIndex: 2,
	display: "grid",
	placeItems: "center",
	cursor: "pointer",
};

/**
The loading cover's status line: a spinner and a word, on a raised pill.
*/
function Publishing() {
	return (
		<span
			className="text-caption"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 10,
				padding: "8px 16px",
				borderRadius: "var(--radius-pill)",
				background: "var(--glass-raised)",
				border: "1px solid var(--glass-edge)",
				color: "var(--color-ink)",
			}}
		>
			<svg
				className="gl-button-spinner"
				viewBox="0 0 24 24"
				width="16"
				height="16"
				aria-hidden="true"
			>
				<circle
					cx="12"
					cy="12"
					r="9"
					fill="none"
					stroke="currentColor"
					strokeOpacity="0.25"
					strokeWidth="2.5"
				/>
				<path
					d="M21 12a9 9 0 0 0-9-9"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
				/>
			</svg>
			Publishing…
		</span>
	);
}

type RegionProps = BackdropProps & {
	readonly label: string;
	readonly isLoading?: boolean;
	readonly onShow: () => void;
};

/**
One of the preview's regions: page content and a button that shows the backdrop again, under a
backdrop that a press dismisses.
*/
function Region({
	label,
	isLoading = false,
	onShow,
	invisible = false,
	...backdrop
}: RegionProps) {
	return (
		<Stage height={200}>
			<div
				style={{
					padding: 20,
					display: "grid",
					gap: 10,
					justifyItems: "start",
				}}
			>
				<Paper style={{ padding: "14px 18px" }}>
					<span className="text-caption">Page content under the scrim</span>
				</Paper>
				<Button size="sm" onClick={onShow}>
					Show {label}
				</Button>
			</div>
			<Backdrop invisible={invisible} style={cover} {...backdrop}>
				{isLoading ? (
					<Publishing />
				) : (
					<Caption>
						{invisible
							? "invisible: catches the press, shows nothing"
							: "Press to dismiss"}
					</Caption>
				)}
			</Backdrop>
		</Stage>
	);
}

/**
A region that keeps its own open state, as each of the preview's does.
*/
function OwnRegion(
	props: Omit<RegionProps, "open" | "onShow" | "onClick">,
) {
	const [isOpen, setIsOpen] = React.useState(true);
	return (
		<Region
			{...props}
			open={isOpen}
			onShow={() => {
				setIsOpen(true);
			}}
			onClick={() => {
				setIsOpen(false);
			}}
		/>
	);
}

/**
Default's region: the open arg shows the backdrop, a press on it sets it back to false, and the
button shows it again.
*/
function ScrimWithArgs(
	args: BackdropProps,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<BackdropProps>();
	return (
		<LiveArg
			value={args.open}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(isOpen, setIsOpen) => (
				<Region
					{...args}
					label="scrim"
					open={isOpen}
					onShow={() => {
						setIsOpen(true);
					}}
					onClick={(event) => {
						args.onClick?.(event);
						setIsOpen(false);
					}}
				/>
			)}
		</LiveArg>
	);
}

export const Default: Story = {
	name: "Default",
	args: { open: true, invisible: false, onClick: fn<() => void>() },
	parameters: {
		controls: { disable: false, include: ["open", "invisible"] },
		docs: {
			description: {
				story:
					"scrim: color-ink at 32% with a 6px backdrop blur. It dims and frosts the page so the surface on top reads first.",
			},
		},
	},
	render: ScrimWithArgs,
};

export const Variants: Story = {
	name: "Variants",
	render: () => (
		<Row gap={16} align="stretch">
			<div style={{ flex: "1 1 240px" }}>
				<OwnRegion invisible label="invisible" />
			</div>
			<div style={{ flex: "1 1 240px" }}>
				<OwnRegion isLoading label="loading cover" />
			</div>
		</Row>
	),
};
