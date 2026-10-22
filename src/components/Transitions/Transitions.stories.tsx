import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import readme from "../../../design-system/components/Transitions/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row, Stack } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Collapse, Fade, Grow, Slide, Transition, Zoom } from "./index.js";

const meta = {
	title: "Utils/Transitions",
	component: Transition,
	subcomponents: { Fade, Grow, Zoom, Slide, Collapse },
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Transition>;

export default meta;

// The stories render their own demos, so they take no args, not even the required children.
type Story = StoryObj;

const box = {
	width: 120,
	height: 84,
	display: "grid",
	placeItems: "center",
} as const;

/**
A transition over its caption, in a cell of the box's size.
*/
function Specimen({
	label,
	children,
}: {
	readonly label: string;
	readonly children: React.ReactNode;
}) {
	return (
		<Stack gap={8}>
			<div style={{ width: 120, height: 84 }}>{children}</div>
			<Caption>{label}</Caption>
		</Stack>
	);
}

/**
Fade, Grow, Zoom and Slide on one switch.
*/
function Transitions() {
	const [isShown, setIsShown] = React.useState(true);
	return (
		<div style={{ display: "grid", gap: 16 }}>
			<Row>
				<Button
					size="sm"
					variant="primary"
					onClick={() => {
						setIsShown((shown) => !shown);
					}}
				>
					{isShown ? "Hide all" : "Show all"}
				</Button>
				<Caption>Enter 200-280ms ease-out-quint; exit faster.</Caption>
			</Row>
			<Row gap={18} align="flex-start">
				<Specimen label="Fade">
					<Fade in={isShown}>
						<Paper style={box}>
							<span className="text-caption">Fade</span>
						</Paper>
					</Fade>
				</Specimen>
				<Specimen label="Grow">
					<Grow in={isShown} origin="top left">
						<Paper style={box}>
							<span className="text-caption">Grow</span>
						</Paper>
					</Grow>
				</Specimen>
				<Specimen label="Zoom">
					<Zoom in={isShown}>
						<Paper style={box}>
							<span className="text-caption">Zoom</span>
						</Paper>
					</Zoom>
				</Specimen>
				<Specimen label="Slide">
					<div
						style={{ overflow: "hidden", borderRadius: "var(--radius-panel)" }}
					>
						<Slide in={isShown} direction="right">
							<Paper style={box}>
								<span className="text-caption">Slide</span>
							</Paper>
						</Slide>
					</div>
				</Specimen>
			</Row>
		</div>
	);
}

/**
A project card whose second paragraph Collapse reveals.
*/
function ReadMore() {
	const [isOpen, setIsOpen] = React.useState(false);
	return (
		<Paper style={{ padding: 24, maxWidth: 560, display: "grid", gap: 12 }}>
			<span className="text-subtitle">RS50 force-feedback bridge</span>
			<p
				className="text-body-sm"
				style={{ margin: 0, color: "var(--color-muted)" }}
			>
				{
					"A Rust daemon that carries force feedback from a Windows sim under Wine to the wheel on macOS."
				}
			</p>
			<Collapse in={isOpen}>
				<p
					className="text-body-sm"
					style={{ margin: 0, paddingBottom: 4, color: "var(--color-muted)" }}
				>
					{
						"It replaces a closed driver with an open one: the sim's FFB packets are read in the Wine prefix, normalised, and written to the wheel at the device's rate."
					}
				</p>
			</Collapse>
			<Row>
				<Button
					variant="text"
					aria-expanded={isOpen}
					endIcon={<Icon name={isOpen ? "chevron-up" : "chevron-down"} />}
					onClick={() => {
						setIsOpen((open) => !open);
					}}
				>
					{isOpen ? "Show less" : "Read more"}
				</Button>
			</Row>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"Each transition takes `in` and one child that can hold a ref. Under reduced motion, Grow, Zoom and Slide become fades and Collapse is instant.",
			},
		},
	},
	render: () => <Transitions />,
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"Collapse uses the site's grid-rows reveal (.pane .more): no measuring, no jump.",
			},
		},
	},
	render: () => <ReadMore />,
};
