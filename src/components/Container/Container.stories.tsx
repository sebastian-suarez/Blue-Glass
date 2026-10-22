import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties } from "react";
import readme from "../../../design-system/components/Container/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack } from "../../../stories/blocks/preview-kit.js";
import { type ContainerProps, Container } from "./Container.js";

const meta = {
	title: "Layout/Container",
	component: Container,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Container>;

export default meta;

type Story = StoryObj<typeof meta>;

// The page the frame stands in for, and the content a Container holds in it.
const page: CSSProperties = {
	borderRadius: "var(--radius-control)",
	border: "1px solid var(--color-line)",
	background: "rgba(255, 255, 255, 0.18)",
	padding: "10px 0",
};

const content: CSSProperties = {
	borderRadius: "var(--radius-node)",
	background: "var(--glass-inset)",
	border: "1px solid var(--glass-edge)",
	boxShadow: "var(--shadow-inset)",
	padding: "10px 14px",
	fontSize: 12,
	lineHeight: 1.5,
	color: "var(--ink-soft)",
};

/**
A Container in the stand-in page, its content naming the cap.
*/
function Column({
	label,
	note,
	...props
}: ContainerProps & { readonly label: string; readonly note: string }) {
	return (
		<Stack gap={8}>
			<div style={page}>
				<Container {...props}>
					<div style={content}>
						<strong style={{ fontWeight: 600 }}>{label}</strong>
						{" · "}
						{note}
					</div>
				</Container>
			</div>
		</Stack>
	);
}

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"The site's .wrap: centred, min(1180px, 90%) wide, 88% under 700px. The frame stands in for the page.",
			},
		},
	},
	render: () => <Column label="wrap" note="min(size-wrap, 90%)" />,
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"maxWidth picks the cap; the gutters (90%, 88% under 700px) always hold. disableGutters runs edge to edge up to the cap.",
			},
		},
	},
	render: () => (
		<>
			<Stack gap={8}>
				<div
					style={
						{
							...page,
							display: "grid",
							gap: 8,
							"--size-wrap": "590px",
							"--size-header": "690px",
						} as CSSProperties
					}
				>
					<Container>
						<div style={content}>
							<strong style={{ fontWeight: 600 }}>wrap</strong>
							{" · 1180px"}
						</div>
					</Container>
					<Container maxWidth="header">
						<div style={content}>
							<strong style={{ fontWeight: 600 }}>header</strong>
							{" · 1380px, held to 90% by the gutters on this page"}
						</div>
					</Container>
					<Container maxWidth="prose" style={{ fontSize: 8 }}>
						<div style={content}>
							<strong style={{ fontWeight: 600 }}>prose</strong>
							{" · 62ch"}
						</div>
					</Container>
					<Container maxWidth={false}>
						<div style={content}>
							<strong style={{ fontWeight: 600 }}>{"maxWidth={false}"}</strong>
							{" · 90%, no cap"}
						</div>
					</Container>
				</div>
				<Caption>
					On a 1400px page, drawn at half size: the frame halves --size-wrap and
					--size-header (and the type, for 62ch).
				</Caption>
			</Stack>
			<Stack gap={8}>
				<Column label="gutters" note="90% of this card's width" />
				<Column
					disableGutters
					label="disableGutters"
					note="the full width, up to the cap"
				/>
				<Caption>
					At this card&apos;s real width every cap is wider than 90%, so only
					the gutters show.
				</Caption>
			</Stack>
		</>
	),
};

export const Example: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"A page section: the wrap holds the heading row, the prose cap holds the copy.",
			},
		},
	},
	render: () => (
		<>
			<div style={{ ...page, padding: "26px 0 30px" }}>
				<Container component="section" aria-labelledby="bg-title">
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "baseline",
							justifyContent: "space-between",
							gap: "8px 30px",
							marginBottom: 18,
						}}
					>
						<h2 id="bg-title" className="text-heading" style={{ margin: 0 }}>
							Background
						</h2>
						<span style={{ fontSize: 12, color: "var(--color-muted)" }}>
							Medellín, Colombia
						</span>
					</div>
					<Container
						disableGutters
						maxWidth="prose"
						style={{ marginInline: 0 }}
					>
						<p className="text-body-lg" style={{ margin: 0 }}>
							I work on backend services and web and mobile apps. Node.js and
							React are my main tools. Some projects have been about shipping a
							new product, others about changing a system that was already in
							use. I&apos;ve led small teams and still spend my time writing
							code.
						</p>
					</Container>
				</Container>
			</div>
			<Caption>
				Container nests: the inner one is capped at 62ch, flush to the outer
				one&apos;s start.
			</Caption>
		</>
	),
};
