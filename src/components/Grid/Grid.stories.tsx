import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CSSProperties, ReactNode } from "react";
import readme from "../../../design-system/components/Grid/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack } from "../../../stories/blocks/preview-kit.js";
import { Paper } from "../Paper/index.js";
import { Grid } from "./Grid.js";

const meta = {
	title: "Layout/Grid",
	component: Grid,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

const cell: CSSProperties = {
	minHeight: 46,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	textAlign: "center",
	padding: "8px 10px",
	borderRadius: "var(--radius-node)",
	background: "var(--glass-inset)",
	border: "1px solid var(--glass-edge)",
	boxShadow: "var(--shadow-inset)",
	fontSize: 12,
	lineHeight: 1.4,
	color: "var(--ink-soft)",
};

/**
An inset cell that shows where a grid item sits; accent raises the items a variant moves.
*/
function Cell({
	children,
	accent = false,
}: {
	readonly children?: ReactNode;
	readonly accent?: boolean;
}) {
	return (
		<div
			style={
				accent
					? {
							...cell,
							background: "var(--glass-raised)",
							boxShadow: "var(--shadow-raised)",
							color: "var(--color-ink)",
						}
					: cell
			}
		>
			{children}
		</div>
	);
}

/**
A client outcome on an inset Paper: where, the figure, and what changed.
*/
function Outcome({
	figure,
	title,
	body,
	children,
}: {
	readonly figure: string;
	readonly title: string;
	readonly body: string;
	readonly children?: ReactNode;
}) {
	return (
		<Paper
			variant="inset"
			style={{
				padding: 22,
				height: "100%",
				display: "grid",
				gap: 6,
				alignContent: "start",
			}}
		>
			<span style={{ fontSize: 12, color: "var(--color-muted)" }}>{title}</span>
			<span className="text-title-sm">{figure}</span>
			<span className="text-small" style={{ color: "var(--color-muted)" }}>
				{body}
			</span>
			{children}
		</Paper>
	);
}

function bar(label: string, value: string, width: string, fill: string) {
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "52px 1fr auto",
				alignItems: "center",
				gap: 10,
			}}
		>
			<span style={{ fontSize: 12, color: "var(--color-muted)" }}>{label}</span>
			<span
				style={{
					height: 10,
					borderRadius: "var(--radius-pill)",
					background: "rgba(142, 184, 232, 0.14)",
					border: "1px solid rgba(88, 108, 143, 0.14)",
					overflow: "hidden",
				}}
			>
				<span
					style={{
						display: "block",
						width,
						minWidth: 4,
						height: "100%",
						borderRadius: "var(--radius-pill)",
						background: fill,
					}}
				/>
			</span>
			<span
				style={{
					fontSize: 12,
					color: "var(--color-ink)",
					minWidth: 54,
					textAlign: "right",
				}}
			>
				{value}
			</span>
		</div>
	);
}

/**
The PDF generation time before and after, as two bars.
*/
function BeforeAfter() {
	return (
		<div
			role="img"
			aria-label="PDF generation: about 6 seconds before, 10 to 20 milliseconds after"
			style={{ display: "grid", gap: 10, marginTop: 14 }}
		>
			{bar("Before", "~6 s", "100%", "var(--dg-bar)")}
			{bar("After", "10–20 ms", "0.3%", "var(--color-blue)")}
		</div>
	);
}

const count = (length: number) =>
	Array.from({ length }, (_, index) => index + 1);

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Twelve columns. Each item takes a size per breakpoint: full width on phones, halves from 701px, thirds from 900px.",
			},
		},
	},
	render: () => (
		<Grid container spacing="md">
			{count(3).map((item) => (
				<Grid key={item} size={{ xs: 12, md: 6, lg: 4 }}>
					<Cell>{"size={{ xs: 12, md: 6, lg: 4 }}"}</Cell>
				</Grid>
			))}
		</Grid>
	),
};

export const Variants: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Breakpoints are the site's: sm from 361px, md from 701px, lg from 900px, xl from 1001px. This card is 760px wide, so md is live.",
			},
		},
	},
	render: () => (
		<>
			<Stack gap={8}>
				<Grid container spacing="xs">
					{count(12).map((item) => (
						<Grid key={item} size={1}>
							<Cell>1</Cell>
						</Grid>
					))}
					<Grid size={6}>
						<Cell>6</Cell>
					</Grid>
					<Grid size={6}>
						<Cell>6</Cell>
					</Grid>
					<Grid size={4}>
						<Cell>4</Cell>
					</Grid>
					<Grid size={4}>
						<Cell>4</Cell>
					</Grid>
					<Grid size={4}>
						<Cell>4</Cell>
					</Grid>
					<Grid size={3}>
						<Cell>3</Cell>
					</Grid>
					<Grid size={9}>
						<Cell>9</Cell>
					</Grid>
				</Grid>
				<Caption>sizes · spacing="xs"</Caption>
			</Stack>
			<Stack gap={8}>
				<Grid container spacing="xs">
					<Grid size={6} offset={3}>
						<Cell accent>size 6 · offset 3</Cell>
					</Grid>
					<Grid size={4}>
						<Cell>size 4</Cell>
					</Grid>
					<Grid size={4} offset={4}>
						<Cell accent>size 4 · offset 4</Cell>
					</Grid>
					<Grid size={{ xs: 12, md: 5 }} offset={{ md: 7 }}>
						<Cell accent>{"offset={{ md: 7 }}"}</Cell>
					</Grid>
				</Grid>
				<Caption>
					offset pushes an item from where it would sit, as in MUI
				</Caption>
			</Stack>
			<Stack gap={8}>
				<Grid container spacing="xl">
					{count(4).map((item) => (
						<Grid key={item} size={3}>
							<Cell>3</Cell>
						</Grid>
					))}
				</Grid>
				<Grid container rowSpacing="2xs" columnSpacing="lg">
					{count(6).map((item) => (
						<Grid key={item} size={4}>
							<Cell>4</Cell>
						</Grid>
					))}
				</Grid>
				<Caption>spacing="xl" · rowSpacing="2xs" columnSpacing="lg"</Caption>
			</Stack>
			<Stack gap={8}>
				<Grid container columns={5} spacing="xs">
					{count(5).map((item) => (
						<Grid key={item} size={1}>
							<Cell>1 of 5</Cell>
						</Grid>
					))}
				</Grid>
				<Grid container columns={{ xs: 2, md: 4 }} spacing="xs">
					{count(4).map((item) => (
						<Grid key={item} size={1}>
							<Cell>1 of 4</Cell>
						</Grid>
					))}
				</Grid>
				<Caption>
					{"columns={5} · columns={{ xs: 2, md: 4 }}: four here, two on phones"}
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
					"Client work at a glance: a 7/5 split from 701px, the right column a nested grid.",
			},
		},
	},
	render: () => (
		<Grid container spacing="md">
			<Grid size={{ xs: 12, md: 7 }}>
				<Outcome
					title="Limber Health · training PDFs"
					figure="~6 s → 10–20 ms"
					body="I reworked PDF generation for training specifications, on a product for remote therapeutic monitoring and home exercises."
				>
					<BeforeAfter />
				</Outcome>
			</Grid>
			<Grid container size={{ xs: 12, md: 5 }} spacing="md">
				<Grid size={12}>
					<Outcome
						title="Intive · CMS services"
						figure="Payload −10%"
						body="Fetch and transform services shaping CMS data for the mobile apps."
					/>
				</Grid>
				<Grid size={12}>
					<Outcome
						title="SunDevs · fitness app"
						figure="1,000 gym clients"
						body="Launched on Stripe; webhooks decide who can open the app."
					/>
				</Grid>
			</Grid>
		</Grid>
	),
};
