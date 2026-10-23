import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/ClickAwayListener/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import {
	type ClickAwayListenerProps,
	ClickAwayListener,
} from "./ClickAwayListener.js";

const meta = {
	title: "Utils/ClickAwayListener",
	component: ClickAwayListener,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof ClickAwayListener>;

export default meta;

type Story = StoryObj<ClickAwayListenerProps>;

const waiting = "Press anywhere outside the panel.";

function ClosingPanel({
	label,
	mouseEvent,
	onClickAway,
}: Pick<ClickAwayListenerProps, "mouseEvent" | "onClickAway"> & {
	readonly label: string;
}) {
	const [isOpen, setIsOpen] = React.useState(true);
	const [status, setStatus] = React.useState(waiting);
	return (
		<div style={{ display: "grid", gap: 10, justifyItems: "start" }}>
			{isOpen ? (
				<ClickAwayListener
					mouseEvent={mouseEvent}
					onClickAway={(event) => {
						onClickAway(event);
						setIsOpen(false);
						setStatus("Closed by a press outside.");
					}}
				>
					<Paper
						style={{
							padding: "16px 20px",
							display: "flex",
							gap: 12,
							alignItems: "center",
						}}
					>
						<Icon name="info" />
						<span className="text-caption">{label}</span>
					</Paper>
				</ClickAwayListener>
			) : (
				<Button
					size="sm"
					onClick={() => {
						setIsOpen(true);
						setStatus(waiting);
					}}
				>
					Show again
				</Button>
			)}
			<Caption>{status}</Caption>
		</div>
	);
}

export const Default: Story = {
	name: "Default",
	args: { onClickAway: fn<() => void>() },
	parameters: {
		docs: {
			description: {
				story:
					"Wraps one element; a pointer press outside it calls onClickAway. The press that opened it is ignored.",
			},
		},
	},
	render: (args) => (
		<ClosingPanel
			label="Open: press outside to close."
			onClickAway={args.onClickAway}
		/>
	),
};

export const Variants: Story = {
	name: "Variants",
	args: { onClickAway: fn<() => void>() },
	parameters: {
		docs: {
			description: {
				story:
					"Choose the event that counts: pointer down (default, feels instant) or a full click.",
			},
		},
	},
	render: (args) => (
		<Row gap={28} align="flex-start">
			<ClosingPanel
				label='mouseEvent="onPointerDown"'
				mouseEvent="onPointerDown"
				onClickAway={args.onClickAway}
			/>
			<ClosingPanel
				label='mouseEvent="onClick"'
				mouseEvent="onClick"
				onClickAway={args.onClickAway}
			/>
		</Row>
	),
};
