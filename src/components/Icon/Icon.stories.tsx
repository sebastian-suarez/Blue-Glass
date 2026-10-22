import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/Icon/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row, Stack } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Paper } from "../Paper/index.js";
import { Icon, iconNames, SvgIcon } from "./Icon.js";

const meta = {
	title: "Data display/Icon",
	component: Icon,
	args: { name: "arrow-ne" },
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	name: "Default",
	args: { name: "arrow-ne", size: 32, filled: false, strokeWidth: 1.5 },
	argTypes: {
		name: { control: "select", options: iconNames },
		// Both take a number or a CSS length, so docgen alone gives them a JSON field.
		size: { control: "number" },
		strokeWidth: { control: "number" },
	},
	parameters: {
		controls: {
			disable: false,
			include: ["name", "size", "filled", "strokeWidth"],
		},
		docs: {
			description: {
				story:
					"arrow-ne is the site's own glyph (Icons.tsx), copied exactly. Every other glyph is drawn to its spec: 24-unit grid, 1.5 stroke, round caps and joins, currentColor.",
			},
		},
	},
	render: (args) => (
		<Row gap={16}>
			<Icon {...args} />
			<Button variant="text" href="#repo" endIcon={<Icon name="arrow-ne" />}>
				Repository
			</Button>
		</Row>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: { story: "The full set, at the site's 18px .icon size." },
		},
	},
	render: () => (
		<>
			<Paper variant="inset" style={{ padding: 20 }}>
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
						gap: "18px 10px",
					}}
				>
					{iconNames.map((name) => (
						<Stack
							key={name}
							gap={6}
							style={{ justifyItems: "center", textAlign: "center" }}
						>
							<Icon name={name} size={22} />
							<Caption>{name}</Caption>
						</Stack>
					))}
				</div>
			</Paper>
			<Row gap={20} align="flex-end">
				<Icon name="star" size={14} />
				<Icon name="star" size={18} />
				<Icon name="star" size={24} />
				<Icon
					filled
					name="star"
					size={32}
					style={{ color: "var(--color-blue)" }}
				/>
				<Icon
					name="success"
					size={24}
					style={{ color: "var(--success)" }}
					title="Done"
				/>
				<Icon
					name="warning"
					size={24}
					style={{ color: "var(--warning)" }}
					title="Warning"
				/>
				<Icon
					name="error"
					size={24}
					style={{ color: "var(--danger)" }}
					title="Error"
				/>
			</Row>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story: "SvgIcon: bring your own path on the same shell.",
			},
		},
	},
	render: () => (
		<Row gap={16}>
			<SvgIcon size={28}>
				<path d="M4 18c4-1 6-4 8-8s4-6 8-6" />
				<circle cx="4" cy="18" r="1.6" fill="currentColor" />
			</SvgIcon>
			<Caption>a custom path, same stroke and caps</Caption>
		</Row>
	),
};
