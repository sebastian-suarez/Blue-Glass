import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type CSSProperties } from "react";
import readme from "../../../design-system/components/Link/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Labelled, Row } from "../../../stories/blocks/preview-kit.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Link } from "./Link.js";

const meta = {
	title: "Navigation/Link",
	component: Link,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Link>;

export default meta;

type Story = StoryObj<typeof meta>;

const repository = "https://github.com/sebastian-suarez/portfolio";

const prose: CSSProperties = {
	margin: 0,
	maxWidth: "62ch",
	color: "var(--color-muted)",
	textWrap: "pretty",
};

/**
The preview's panel: a prose link in a sentence, then a row of go links. "Copy page link"
reads "Link copied" once pressed.
*/
function SitePanel() {
	const [isCopied, setIsCopied] = useState(false);
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 18, maxWidth: 600 }}>
			<div style={{ display: "grid", gap: 10 }}>
				<h3 className="text-subtitle" style={{ margin: 0 }}>
					How this site works
				</h3>
				<p className="text-body-sm" style={prose}>
					A static site on AWS behind Cloudflare, shipped by GitHub Actions and
					described in OpenTofu.
				</p>
				<p className="text-caption" style={prose}>
					Checked against the live setup on 20 October 2026. The code is public
					on <Link href={repository}>GitHub</Link>.
				</p>
			</div>
			<Row gap={22}>
				<Link
					underline="hover"
					href="#services"
					endIcon={<Icon name="arrow-ne" />}
				>
					See every service
				</Link>
				<Link external underline="hover" href={repository}>
					Repository
				</Link>
				<Link
					underline="hover"
					component="button"
					color="muted"
					onClick={() => {
						setIsCopied(true);
					}}
				>
					{isCopied ? "Link copied" : "Copy page link"}
				</Link>
			</Row>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		href: repository,
		children: "GitHub",
		underline: "always",
		external: false,
	},
	argTypes: { children: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: ["children", "underline", "external"],
		},
		docs: {
			description: {
				story:
					"The inline prose link: color-link, always underlined, 3px below the text.",
			},
		},
	},
	render: (args) => (
		<p className="text-caption" style={prose}>
			Checked against the live setup on 20 October 2026. The code is public on{" "}
			<Link {...args} />.
		</p>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"hover is the site's “go” link: ink, 13px, a 32px tap target, underlined 5px below only under a pointer. external opens a new tab with the arrow and a screen-reader note.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={32} align="flex-start">
				<Labelled label="underline always">
					<Link href="#resume">Read the résumé</Link>
				</Labelled>
				<Labelled label="underline hover">
					<Link
						underline="hover"
						href="#how-it-works"
						endIcon={<Icon name="arrow-ne" />}
					>
						See every service
					</Link>
				</Labelled>
				<Labelled label="underline none">
					<Link underline="none" href="#contact">
						Contact
					</Link>
				</Labelled>
			</Row>
			<Row gap={32} align="flex-start">
				<Labelled label="color link">
					<Link href="#work">Client work</Link>
				</Labelled>
				<Labelled label="color ink">
					<Link color="ink" href="#projects">
						Projects
					</Link>
				</Labelled>
				<Labelled label="color muted">
					<Link color="muted" href="#experience">
						Experience
					</Link>
				</Labelled>
			</Row>
			<Row gap={32} align="flex-start">
				<Labelled label="external">
					<Link external href={repository}>
						GitHub
					</Link>
				</Labelled>
				<Labelled label="external · underline hover">
					<Link external underline="hover" href={repository}>
						Repository
					</Link>
				</Labelled>
				<Labelled label="component button">
					<Link underline="hover" component="button">
						Copy email
					</Link>
				</Labelled>
			</Row>
			<p className="text-body" style={{ ...prose, color: "var(--color-ink)" }}>
				I build backend systems in Node.js, TypeScript and AWS from Medellín,
				Colombia. This page&apos;s source is on{" "}
				<Link external href={repository}>
					GitHub
				</Link>
				, and the <Link href="#resume">résumé</Link> lists every role.
			</p>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"A panel's prose link plus a row of go links: same-tab with an arrow, external, and a link-weight button.",
			},
		},
	},
	render: () => <SitePanel />,
};
