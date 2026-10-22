import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/Typography/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Typography } from "./Typography.js";

const meta = {
	title: "Data display/Typography",
	component: Typography,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Typography>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"A variant sets the token class and the element: heading is an h2, body-sm a p.",
			},
		},
	},
	render: () => (
		<div>
			<Typography gutterBottom variant="heading">
				What I bring to a team
			</Typography>
			<Typography
				variant="body-sm"
				color="muted"
				style={{ maxWidth: "62ch" }}
			>
				Node.js and TypeScript services with Clean Architecture boundaries and
				DDD vocabulary. Java and Spring before that.
			</Typography>
		</div>
	),
};
