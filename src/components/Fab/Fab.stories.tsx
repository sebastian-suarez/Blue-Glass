import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Fab/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import {
	Row,
	Caption,
	Labelled,
	Stage,
} from "../../../stories/blocks/preview-kit.js";
import { Fab, Paper, Zoom, Icon } from "../../index.js";
import type { FabProps } from "./Fab.js";

const meta = {
	title: "Inputs/Fab",
	component: Fab,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Fab>;
export default meta;
type Story = StoryObj<Partial<FabProps>>;
const A = [
	{
		company: "Limber Health",
		title: "Training PDFs. A shorter wait.",
		body: "I reworked PDF generation for training specifications: about 6 seconds down to 10–20 milliseconds.",
	},
	{
		company: "Intive",
		title: "CMS content, ready for mobile.",
		body: "I owned the two services between the client CMS and the mobile apps, and cut the response payload by 10%.",
	},
	{
		company: "SunDevs",
		title: "A fitness app. Built together.",
		body: "I led three developers to launch a fitness app for 1,000 gym clients, with access tied to Stripe subscription status.",
	},
];
const z = (a = 0): React.CSSProperties => ({
	position: "fixed",
	right: "calc(16px + env(safe-area-inset-right, 0px))",
	bottom: `calc(${16 + a}px + env(safe-area-inset-bottom, 0px))`,
	zIndex: "var(--z-fab)",
});
function PreviewG() {
	const value1Ref = React.useRef<HTMLDivElement | null>(null);
	const [isExampleState1, setIsExampleState1] = React.useState(false);
	React.useEffect(() => {
		const r = value1Ref.current;
		if (!r) {
			return;
		}

		r.scrollTop = 170;
		setIsExampleState1(r.scrollTop > 120);
	}, []);
	const s = () => {
		const isR = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		value1Ref.current?.scrollTo({ top: 0, behavior: isR ? "auto" : "smooth" });
	};

	return (
		<Stage height={380}>
			<div
				ref={value1Ref}
				role="region"
				aria-label="Client work"
				// eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex -- The scroll area needs keyboard access.
				tabIndex={0}
				style={{
					position: "absolute",
					inset: 0,
					overflow: "auto",
					padding: "26px 22px 140px",
				}}
				onScroll={(r) => {
					setIsExampleState1(r.currentTarget.scrollTop > 120);
				}}
			>
				<div
					style={{ display: "grid", gap: 4, marginBottom: 18, maxWidth: 460 }}
				>
					<span className="text-title-sm">Client work</span>
					<span
						className="text-caption"
						style={{ color: "var(--color-muted)" }}
					>
						Backend, web, and mobile. Medellín, Colombia.
					</span>
				</div>
				<div style={{ display: "grid", gap: 14, maxWidth: 460 }}>
					{A.map((r) => (
						<Paper
							key={r.company}
							style={{ padding: "20px 22px", display: "grid", gap: 6 }}
						>
							<span
								className="text-micro"
								style={{ color: "var(--color-muted)" }}
							>
								{r.company}
							</span>
							<span className="text-subtitle">{r.title}</span>
							<span
								className="text-small"
								style={{ color: "var(--color-muted)" }}
							>
								{r.body}
							</span>
						</Paper>
					))}
				</div>
			</div>
			<Zoom in={isExampleState1}>
				<Fab variant="glass" aria-label="Back to top" style={z(58)} onClick={s}>
					<Icon name="arrow-up" />
				</Fab>
			</Zoom>
			<Fab extended href="mailto:contact@sebastiansuarez.dev" style={z()}>
				<Icon name="mail" />
				Email me
			</Fab>
		</Stage>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		variant: "primary",
		size: "md",
		extended: false,
		disabled: false,
		"aria-label": "Email me",
		onClick: fn<() => void>(),
	},
	argTypes: { "aria-label": { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: ["variant", "size", "extended", "disabled", "aria-label"],
		},
		docs: {
			description: {
				story:
					"The ink circle for a screen's one action. Icon-only, so it has an aria-label.",
			},
		},
	},
	render: (args) => (
		<Row>
			<Fab {...args}>
				<Icon name="mail" />
				{args.extended === true ? "Email me" : null}
			</Fab>
		</Row>
	),
};
export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Primary is ink; glass is the frosted circle for a second floating action. md is the site's 46px control; extended adds a label.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={28} align="flex-start">
				<Labelled label="primary · sm 36" minHeight={56}>
					<Fab size="sm" aria-label="Email me">
						<Icon name="mail" />
					</Fab>
				</Labelled>
				<Labelled label="primary · md 46" minHeight={56}>
					<Fab aria-label="Email me">
						<Icon name="mail" />
					</Fab>
				</Labelled>
				<Labelled label="primary · lg 56" minHeight={56}>
					<Fab size="lg" aria-label="Email me">
						<Icon name="mail" />
					</Fab>
				</Labelled>
				<Labelled label="glass · sm" minHeight={56}>
					<Fab variant="glass" size="sm" aria-label="Back to top">
						<Icon name="arrow-up" />
					</Fab>
				</Labelled>
				<Labelled label="glass · md" minHeight={56}>
					<Fab variant="glass" aria-label="Back to top">
						<Icon name="arrow-up" />
					</Fab>
				</Labelled>
				<Labelled label="glass · lg" minHeight={56}>
					<Fab variant="glass" size="lg" aria-label="Back to top">
						<Icon name="arrow-up" />
					</Fab>
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="extended · primary">
					<Fab extended>
						<Icon name="mail" />
						Email me
					</Fab>
				</Labelled>
				<Labelled label="extended · glass">
					<Fab extended variant="glass">
						<Icon name="download" />
						Download résumé
					</Fab>
				</Labelled>
				<Labelled label="extended · sm">
					<Fab extended size="sm" variant="glass">
						<Icon name="share" />
						Share
					</Fab>
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="disabled · primary">
					<Fab disabled aria-label="Email me">
						<Icon name="mail" />
					</Fab>
				</Labelled>
				<Labelled label="disabled · glass">
					<Fab disabled variant="glass" aria-label="Back to top">
						<Icon name="arrow-up" />
					</Fab>
				</Labelled>
				<Labelled label="disabled · extended">
					<Fab disabled extended>
						<Icon name="send" />
						Sending
					</Fab>
				</Labelled>
			</Row>
		</>
	),
};
export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"Pinned with position: fixed, z-fab and safe-area insets. Back to top zooms in once you scroll past the first card, and out at the top.",
			},
		},
	},
	render: () => <PreviewG />,
};
