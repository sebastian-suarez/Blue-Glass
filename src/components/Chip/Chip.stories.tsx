import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState, type CSSProperties } from "react";
import readme from "../../../design-system/components/Chip/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Labelled, Row } from "../../../stories/blocks/preview-kit.js";
import { Avatar } from "../Avatar/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Typography } from "../Typography/index.js";
import { Chip } from "./Chip.js";

const meta = {
	title: "Data display/Chip",
	component: Chip,
	args: { label: "TypeScript" },
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

const projects = [
	{
		title: "RS50 force-feedback bridge",
		tags: ["Rust", "hidapi", "DirectInput", "Wine"],
	},
	{
		title: "VSebCode",
		tags: ["TypeScript", "Electron", "Claude Code", "Codex"],
	},
	{
		title: "Clean Architecture template",
		tags: ["TypeScript", "Node.js", "DDD", "MCP"],
	},
	{
		title: "This portfolio",
		tags: ["Astro", "OpenTofu", "AWS", "Cloudflare", "GitHub Actions"],
	},
];
const filters = ["TypeScript", "Node.js", "Rust", "AWS", "Cloudflare", "MCP"];
const stack = ["Node.js", "PostgreSQL", "AWS"];
const chipList: CSSProperties = {
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
	margin: 0,
	padding: 0,
	listStyle: "none",
};

/**
The preview's removable stack: deleting a chip moves focus to the next close button, and
"Reset" brings the chips back once they're all gone.
*/
function DeletableStack() {
	const [tags, setTags] = useState(stack);
	const chips = useRef<Array<HTMLElement | null>>([]);
	const remove = (index: number) => {
		setTags((current) => current.filter((_tag, at) => at !== index));
		requestAnimationFrame(() => {
			(chips.current[index] ?? chips.current[index - 1])
				?.querySelector<HTMLElement>(".gl-chip-delete")
				?.focus();
		});
	};

	if (tags.length === 0) {
		return (
			<Chip
				label="Reset"
				icon={<Icon name="refresh" />}
				onClick={() => {
					setTags(stack);
				}}
			/>
		);
	}

	return (
		<ul style={chipList} aria-label="Stack">
			{tags.map((tag, index) => (
				<Chip
					key={tag}
					ref={(element) => {
						chips.current[index] = element;
					}}
					component="li"
					label={tag}
					onDelete={() => {
						remove(index);
					}}
				/>
			))}
		</ul>
	);
}

/**
The preview's project filter: toggling a stack chip filters the projects, and their matching
tags take the accent tone.
*/
function ProjectFilter() {
	const [chosen, setChosen] = useState(["TypeScript"]);
	const toggle = (tag: string) => {
		setChosen((current) =>
			current.includes(tag)
				? current.filter((each) => each !== tag)
				: [...current, tag],
		);
	};

	const shown = projects.filter(
		(project) =>
			chosen.length === 0 || project.tags.some((tag) => chosen.includes(tag)),
	);
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 18, maxWidth: 640 }}>
			<div style={{ display: "grid", gap: 10 }}>
				<Typography variant="label" component="h3" id="filter-label">
					Filter my projects by stack
				</Typography>
				<div
					role="group"
					aria-labelledby="filter-label"
					style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
				>
					{filters.map((tag) => (
						<Chip
							key={tag}
							label={tag}
							selected={chosen.includes(tag)}
							onClick={() => {
								toggle(tag);
							}}
						/>
					))}
				</div>
			</div>
			<Typography variant="micro" color="muted" role="status">
				{shown.length === projects.length
					? "All four projects"
					: `${shown.length} of ${projects.length} projects`}
			</Typography>
			<div style={{ display: "grid", gap: 14 }}>
				{shown.map((project) => (
					<div
						key={project.title}
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							justifyContent: "space-between",
							gap: "8px 16px",
						}}
					>
						<Typography variant="subtitle" component="h4">
							{project.title}
						</Typography>
						<ul style={chipList} aria-label={`${project.title} stack`}>
							{project.tags.map((tag) => (
								<Chip
									key={tag}
									component="li"
									size="sm"
									label={tag}
									tone={chosen.includes(tag) ? "accent" : "default"}
								/>
							))}
						</ul>
					</div>
				))}
			</div>
		</Paper>
	);
}

const ignore = () => undefined;

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"The site's stack chip (.chip): 12px ink-soft on glass-control with a hairline border.",
			},
		},
	},
	render: () => (
		<Row gap={6}>
			<Chip label="TypeScript" />
			<Chip label="Node.js" />
			<Chip label="AWS" />
		</Row>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"plate is the employer plate (.plate). Tones sit on the *-soft grounds and always carry a word.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={22} align="flex-start">
				<Labelled label="chip">
					<Chip label="PostgreSQL" />
				</Labelled>
				<Labelled label="chip · sm (.chip-sm)">
					<Chip size="sm" label="PostgreSQL" />
				</Labelled>
				<Labelled label="plate">
					<Chip variant="plate" label="Limber Health" />
				</Labelled>
				<Labelled label="plate · sm">
					<Chip variant="plate" size="sm" label="Limber Health" />
				</Labelled>
				<Labelled label="plate · link">
					<Chip
						variant="plate"
						href="#pipeline"
						label="From an edit to production"
					/>
				</Labelled>
			</Row>
			<Row gap={22} align="flex-start">
				<Labelled label="success">
					<Chip tone="success" icon={<Icon name="check" />} label="Merged" />
				</Labelled>
				<Labelled label="warning">
					<Chip tone="warning" icon={<Icon name="clock" />} label="In review" />
				</Labelled>
				<Labelled label="danger">
					<Chip
						tone="danger"
						icon={<Icon name="error" />}
						label="Checks failed"
					/>
				</Labelled>
				<Labelled label="info">
					<Chip tone="info" icon={<Icon name="info" />} label="Draft" />
				</Labelled>
				<Labelled label="accent">
					<Chip tone="accent" icon={<Icon name="star" />} label="Featured" />
				</Labelled>
			</Row>
			<Row gap={22} align="flex-start">
				<Labelled label="icon">
					<Chip icon={<Icon name="globe" />} label="Medellín, Colombia" />
				</Labelled>
				<Labelled label="avatar">
					<Chip
						avatar={<Avatar aria-hidden="true">SS</Avatar>}
						label="Sebastian Suarez"
					/>
				</Labelled>
				<Labelled label="clickable">
					<Chip label="Rust" onClick={ignore} />
				</Labelled>
				<Labelled label="selected">
					<Chip selected label="Rust" onClick={ignore} />
				</Labelled>
				<Labelled label="disabled">
					<Chip disabled label="Rust" onClick={ignore} />
				</Labelled>
			</Row>
			<Row gap={22} align="flex-start">
				<Labelled label="deletable (Backspace too)">
					<DeletableStack />
				</Labelled>
				<Labelled label="clickable · deletable">
					<Chip label="Wine" onClick={ignore} onDelete={ignore} />
				</Labelled>
				<Labelled label="selected · deletable">
					<Chip selected label="Wine" onClick={ignore} onDelete={ignore} />
				</Labelled>
				<Labelled label="plate · deletable">
					<Chip variant="plate" label="EPAM" onDelete={ignore} />
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
					"Filter chips toggle (aria-pressed) and the matching tags light up in the accent tone.",
			},
		},
	},
	render: () => (
		<>
			<ProjectFilter />
			<Caption>
				The tags under each project are static chips in a list, as on the
				site&apos;s project cards.
			</Caption>
		</>
	),
};
