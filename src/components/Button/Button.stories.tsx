import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Button/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Labelled, Row } from "../../../stories/blocks/preview-kit.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Button } from "./Button.js";

const meta = {
	title: "Inputs/Button",
	component: Button,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

function ContactBlock() {
	const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
	useEffect(() => {
		if (status !== "sending") {
			return;
		}

		const timer = setTimeout(() => {
			setStatus("sent");
		}, 1400);
		return () => {
			clearTimeout(timer);
		};
	}, [status]);
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 20, maxWidth: 560 }}>
			<div style={{ display: "grid", gap: 8 }}>
				<h3 className="text-title-sm" style={{ margin: 0 }}>
					Open to backend lead and architect roles.
				</h3>
				<p
					className="text-body-sm"
					style={{ margin: 0, color: "var(--color-muted)" }}
				>
					Product teams first. Remote from Medellín, Colombia, with full
					US-hours overlap.
				</p>
			</div>
			<Row>
				<Button
					variant="primary"
					loading={status === "sending"}
					onClick={() => {
						setStatus("sending");
					}}
				>
					{status === "sent" ? "Sent" : "Email me"}
				</Button>
				<Button href="#work">See the work</Button>
				<Button
					variant="text"
					href="#resume"
					endIcon={<Icon name="arrow-ne" />}
				>
					Read résumé
				</Button>
			</Row>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		children: "See the work",
		variant: "glass",
		tone: "default",
		size: "md",
		loading: false,
		disabled: false,
		fullWidth: false,
		onClick: fn<() => void>(),
	},
	argTypes: { children: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: [
				"children",
				"variant",
				"tone",
				"size",
				"loading",
				"disabled",
				"fullWidth",
			],
		},
		docs: {
			description: { story: "The glass pill. Verb first, sentence case." },
		},
	},
	render: (args) => (
		<Row>
			<Button {...args} />
		</Row>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Primary is the ink pill for the one thing a view is for; glass sits beside it; text is a link-weight action.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={20} align="flex-start">
				<Labelled label="primary">
					<Button variant="primary">Email me</Button>
				</Labelled>
				<Labelled label="glass">
					<Button variant="glass">See the work</Button>
				</Labelled>
				<Labelled label="text">
					<Button variant="text" endIcon={<Icon name="arrow-ne" />}>
						Repository
					</Button>
				</Labelled>
			</Row>
			<Row gap={20} align="flex-start">
				<Labelled label="primary · danger">
					<Button
						variant="primary"
						tone="danger"
						startIcon={<Icon name="trash" />}
					>
						Delete project
					</Button>
				</Labelled>
				<Labelled label="glass · danger">
					<Button tone="danger">Discard draft</Button>
				</Labelled>
				<Labelled label="text · danger">
					<Button variant="text" tone="danger">
						Remove
					</Button>
				</Labelled>
			</Row>
			<Row gap={20} align="center">
				<Button variant="primary" size="sm">
					Small
				</Button>
				<Button variant="primary">Medium</Button>
				<Button variant="primary" size="lg">
					Large
				</Button>
				<Button size="sm" startIcon={<Icon name="download" />}>
					Download
				</Button>
				<Button endIcon={<Icon name="arrow-right" />}>Continue</Button>
			</Row>
			<Row gap={20}>
				<Button loading variant="primary">
					Saving
				</Button>
				<Button loading>Loading</Button>
				<Button disabled variant="primary">
					Disabled
				</Button>
				<Button disabled>Disabled</Button>
			</Row>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story: "A contact block: one primary, one glass, one text action.",
			},
		},
	},
	render: () => <ContactBlock />,
};
