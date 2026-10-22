import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment, useState } from "react";
import readme from "../../../design-system/components/ToggleButton/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Labelled, Row } from "../../../stories/blocks/preview-kit.js";
import { Icon, SvgIcon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { ToggleButton, ToggleButtonGroup } from "./ToggleButton.js";

const meta = {
	title: "Inputs/ToggleButton",
	component: ToggleButton,
	subcomponents: { ToggleButtonGroup },
	args: { value: "watch" },
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof ToggleButton>;

export default meta;

type Story = StoryObj<typeof meta>;

const alignments = {
	left: "M4 6h16M4 10h10M4 14h16M4 18h10",
	center: "M4 6h16M7 10h10M4 14h16M7 18h10",
	right: "M4 6h16M10 10h10M4 14h16M10 18h10",
	justify: "M4 6h16M4 10h16M4 14h16M4 18h16",
};

/**
The preview's text-alignment glyph, drawn with SvgIcon.
*/
function AlignIcon({ to }: { readonly to: keyof typeof alignments }) {
	return (
		<SvgIcon size={16}>
			<path d={alignments[to]} />
		</SvgIcon>
	);
}

const node = {
	padding: "8px 12px",
	borderRadius: "var(--radius-node)",
	background: "rgba(255, 255, 255, 0.92)",
	border: "1px solid rgba(88, 108, 143, 0.32)",
	fontSize: 13,
	lineHeight: 1.4,
	textAlign: "center",
} as const;

/**
The preview's diagram view: the bridge from the sim to the wheel.
*/
function Bridge() {
	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				alignItems: "center",
				justifyContent: "center",
				gap: 8,
			}}
		>
			{[
				["Sim", "under Wine"],
				["Rust daemon", "scales forces"],
				["RS50 wheel", "HID reports"],
			].map(([name, note], index) => (
				<Fragment key={name}>
					{index ? (
						<Icon
							name="arrow-right"
							size={16}
							style={{ color: "var(--dg-edge)" }}
						/>
					) : null}
					<span style={node}>
						{name}
						<span
							style={{
								display: "block",
								fontSize: 12,
								color: "var(--color-muted)",
							}}
						>
							{note}
						</span>
					</span>
				</Fragment>
			))}
		</div>
	);
}

const code = `// Scale a DirectInput force (−10 000…10 000) to wheel torque.
fn to_torque(force: i32, max_nm: f32) -> f32 {
    (force as f32 / 10_000.0).clamp(-1.0, 1.0) * max_nm
}`;

/**
The preview's project panel: a view switch that always keeps one view, since onChange ignores
the null an exclusive group sends when the pressed button is pressed again.
*/
function ProjectViews() {
	const [view, setView] = useState("diagram");
	return (
		<Paper style={{ padding: 24, display: "grid", gap: 16, maxWidth: 640 }}>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
				}}
			>
				<div style={{ display: "grid", gap: 2 }}>
					<span className="text-subtitle">RS50 force-feedback bridge</span>
					<span className="text-micro" style={{ color: "var(--color-muted)" }}>
						Rust · Wine · macOS
					</span>
				</div>
				<ToggleButtonGroup
					exclusive
					size="sm"
					value={view}
					aria-label="Show the project as"
					onChange={(_event, next: string | null) => {
						if (next) {
							setView(next);
						}
					}}
				>
					<ToggleButton value="diagram">
						<Icon name="chart" />
						Diagram
					</ToggleButton>
					<ToggleButton value="code">
						<Icon name="code" />
						Code
					</ToggleButton>
					<ToggleButton value="notes">
						<Icon name="file" />
						Notes
					</ToggleButton>
				</ToggleButtonGroup>
			</div>
			<Paper
				variant="inset"
				style={{
					padding: 18,
					minHeight: 132,
					display: "grid",
					alignItems: "center",
				}}
			>
				{view === "diagram" ? <Bridge /> : null}
				{view === "code" ? (
					<pre
						className="text-micro"
						style={{
							margin: 0,
							fontFamily: "var(--font-mono)",
							whiteSpace: "pre-wrap",
							overflowWrap: "anywhere",
						}}
					>
						{code}
					</pre>
				) : null}
				{view === "notes" ? (
					<p
						className="text-small"
						style={{
							margin: 0,
							color: "var(--color-muted)",
							maxWidth: "58ch",
						}}
					>
						The sim sends force feedback as DirectInput effects under Wine. The
						daemon reads them, scales them to the wheel&apos;s torque, and
						writes the RS50&apos;s own HID reports, so the wheel works on macOS
						without its Windows driver.
					</p>
				) : null}
			</Paper>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"The site's segmented pill: nav-sized items in the glass-faint track; the pressed one rises (.project-tab) and carries a short ink bar.",
			},
		},
	},
	render: () => (
		<ToggleButtonGroup exclusive defaultValue="diagram" aria-label="View">
			<ToggleButton value="diagram">Diagram</ToggleButton>
			<ToggleButton value="code">Code</ToggleButton>
			<ToggleButton value="notes">Notes</ToggleButton>
		</ToggleButtonGroup>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"exclusive presses one; without it, any number. One tab stop, arrow keys between buttons. Icon-only buttons take an aria-label.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={24} align="flex-start">
				<Labelled label="multiple">
					<ToggleButtonGroup
						defaultValue={["node", "aws"]}
						aria-label="Stack filter"
					>
						<ToggleButton value="node">Node.js</ToggleButton>
						<ToggleButton value="rust">Rust</ToggleButton>
						<ToggleButton value="aws">AWS</ToggleButton>
						<ToggleButton value="postgres">PostgreSQL</ToggleButton>
					</ToggleButtonGroup>
				</Labelled>
				<Labelled label="icons only · exclusive">
					<ToggleButtonGroup
						exclusive
						defaultValue="left"
						aria-label="Text alignment"
					>
						<ToggleButton value="left" aria-label="Align left">
							<AlignIcon to="left" />
						</ToggleButton>
						<ToggleButton value="center" aria-label="Align center">
							<AlignIcon to="center" />
						</ToggleButton>
						<ToggleButton value="right" aria-label="Align right">
							<AlignIcon to="right" />
						</ToggleButton>
						<ToggleButton value="justify" aria-label="Justify">
							<AlignIcon to="justify" />
						</ToggleButton>
					</ToggleButtonGroup>
				</Labelled>
			</Row>
			<Row gap={24} align="flex-start">
				<Labelled label="sm · 36px">
					<ToggleButtonGroup
						exclusive
						size="sm"
						defaultValue="week"
						aria-label="Period, small"
					>
						<ToggleButton value="week">Week</ToggleButton>
						<ToggleButton value="month">Month</ToggleButton>
						<ToggleButton value="year">Year</ToggleButton>
					</ToggleButtonGroup>
				</Labelled>
				<Labelled label="md · 46px">
					<ToggleButtonGroup
						exclusive
						defaultValue="week"
						aria-label="Period, medium"
					>
						<ToggleButton value="week">Week</ToggleButton>
						<ToggleButton value="month">Month</ToggleButton>
						<ToggleButton value="year">Year</ToggleButton>
					</ToggleButtonGroup>
				</Labelled>
				<Labelled label="lg · 54px">
					<ToggleButtonGroup
						exclusive
						size="lg"
						defaultValue="week"
						aria-label="Period, large"
					>
						<ToggleButton value="week">Week</ToggleButton>
						<ToggleButton value="month">Month</ToggleButton>
						<ToggleButton value="year">Year</ToggleButton>
					</ToggleButtonGroup>
				</Labelled>
			</Row>
			<Row gap={24} align="flex-start">
				<Labelled label="vertical · up and down arrows" minHeight={0}>
					<ToggleButtonGroup
						exclusive
						orientation="vertical"
						defaultValue="limber"
						aria-label="Client"
					>
						<ToggleButton value="limber">Limber Health</ToggleButton>
						<ToggleButton value="intive">Intive</ToggleButton>
						<ToggleButton value="sundevs">SunDevs</ToggleButton>
					</ToggleButtonGroup>
				</Labelled>
				<Labelled label="one disabled" minHeight={0}>
					<ToggleButtonGroup exclusive defaultValue="ts" aria-label="Language">
						<ToggleButton value="ts">TypeScript</ToggleButton>
						<ToggleButton value="rust">Rust</ToggleButton>
						<ToggleButton disabled value="go">
							Go
						</ToggleButton>
					</ToggleButtonGroup>
				</Labelled>
				<Labelled label="disabled" minHeight={0}>
					<ToggleButtonGroup
						exclusive
						disabled
						defaultValue="ts"
						aria-label="Language, disabled"
					>
						<ToggleButton value="ts">TypeScript</ToggleButton>
						<ToggleButton value="rust">Rust</ToggleButton>
					</ToggleButtonGroup>
				</Labelled>
			</Row>
			<Row gap={24} align="flex-start">
				<Labelled label="standalone · off">
					<ToggleButton value="watch">
						<Icon name="bell" />
						Watch releases
					</ToggleButton>
				</Labelled>
				<Labelled label="standalone · on">
					<ToggleButton defaultSelected value="watch-on">
						<Icon name="bell" />
						Watch releases
					</ToggleButton>
				</Labelled>
				<Labelled label="standalone · icon">
					<ToggleButton defaultSelected value="star" aria-label="Star VSebCode">
						<Icon name="star" />
					</ToggleButton>
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
					"A view switch that always keeps one view: onChange ignores the null an exclusive group sends when the pressed button is pressed again.",
			},
		},
	},
	render: () => <ProjectViews />,
};
