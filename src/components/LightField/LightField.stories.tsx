import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/LightField/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack, Tiles } from "../../../stories/blocks/preview-kit.js";
import { Paper } from "../Paper/index.js";
import { LightField, type LightFieldProps } from "./LightField.js";

const meta = {
	title: "Surfaces/LightField",
	component: LightField,
	parameters: {
		docs: { page: componentDocs(readme) },
		// The previews draw a field behind the frame; this one shows fields of its own.
		frame: { field: false },
	},
} satisfies Meta<typeof LightField>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
One placement in a bordered box. The site's placements are drawn for a page, so they show at
36% scale; compact fills the box as it is.
*/
function Placement({
	variant,
	label,
	height = 220,
}: {
	readonly variant: NonNullable<LightFieldProps["variant"]>;
	readonly label: string;
	readonly height?: number;
}) {
	return (
		<Stack gap={8}>
			<div
				style={{
					position: "relative",
					isolation: "isolate",
					overflow: "clip",
					height,
					borderRadius: "var(--radius-pane)",
					background: "var(--color-canvas)",
					border: "1px solid var(--color-line)",
				}}
			>
				<LightField
					variant={variant}
					style={
						variant === "compact"
							? undefined
							: {
									transform: "scale(0.36)",
									transformOrigin: "top left",
									width: "278%",
									height: variant === "bottom" ? "278%" : undefined,
								}
					}
				/>
			</div>
			<Caption>{label}</Caption>
		</Stack>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story: "compact: the rings and fold scaled to whatever box holds them.",
			},
		},
	},
	render: () => (
		<div
			style={{
				position: "relative",
				isolation: "isolate",
				overflow: "clip",
				height: 260,
				borderRadius: "var(--radius-panel)",
				background: "var(--color-canvas)",
			}}
		>
			<LightField variant="compact" />
			<Paper
				style={{
					position: "absolute",
					left: 32,
					bottom: 32,
					padding: "20px 24px",
					maxWidth: 300,
				}}
			>
				<span className="text-body-sm">
					The glass needs something to frost.
				</span>
			</Paper>
		</div>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"The site's three placements, shown at 36% scale: top behind the hero, middle behind a long section, bottom behind the contact slab.",
			},
		},
	},
	render: () => (
		<Tiles min={200}>
			<Placement variant="top" label="top" />
			<Placement variant="middle" label="middle" />
			<Placement variant="bottom" label="bottom" />
		</Tiles>
	),
};
