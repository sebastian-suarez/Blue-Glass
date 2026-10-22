import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/List/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Paper } from "../Paper/index.js";
import {
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	ListSubheader,
} from "./List.js";

// The preview's Variants and Example sections are left out until Chip and Avatar are ported:
// Variants puts a Chip in a row's secondaryAction, and Example an Avatar in each ListItemIcon.

const meta = {
	title: "Data display/List",
	component: List,
	subcomponents: {
		ListItem,
		ListItemButton,
		ListItemIcon,
		ListItemText,
		ListSubheader,
	},
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof List>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"Static rows: primary text over a muted secondary line, on the option row's geometry (40px, 13px in).",
			},
		},
	},
	render: () => (
		<Paper style={{ padding: 7, maxWidth: 520 }}>
			<List>
				<ListItem>
					<ListItemText
						primary="Backend"
						secondary="Node.js and TypeScript services with Clean Architecture boundaries."
					/>
				</ListItem>
				<ListItem>
					<ListItemText
						primary="Data & cloud"
						secondary="PostgreSQL and MongoDB schemas modeled around real access patterns."
					/>
				</ListItem>
				<ListItem>
					<ListItemText
						primary="Delivery"
						secondary="GitHub Actions pipelines, automated tests and OpenAPI contracts."
					/>
				</ListItem>
			</List>
		</Paper>
	),
};
