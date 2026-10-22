import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useId } from "react";
import { Icon, type IconName } from "../src/components/Icon/index.ts";
import { componentDocs } from "./blocks/component-docs.tsx";
import { Caption, Labelled, Row, Tiles } from "./blocks/preview-kit.tsx";

const intro = `# Shared styles

The material that components share, from \`foundation.css\`: glass, the popover surface and the option rows.`;

const meta = {
	title: "Foundations/Shared styles",
	parameters: { docs: { page: componentDocs(intro) } },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// One row with Select's Option markup, on divs: XO's jsx-a11y rules reject a listbox role on
// ul and an option role on li.
function Option({
	children,
	secondary,
	icon,
	selected = false,
	disabled = false,
}: {
	readonly children: ReactNode;
	readonly secondary?: string;
	readonly icon?: IconName;
	readonly selected?: boolean;
	readonly disabled?: boolean;
}) {
	return (
		<div
			className="gl-option"
			role="option"
			aria-selected={selected}
			aria-disabled={disabled || undefined}
		>
			{icon === undefined ? null : (
				<span className="gl-option-icon">
					<Icon name={icon} />
				</span>
			)}
			<span className="gl-option-text">
				<span>{children}</span>
				{secondary === undefined ? null : (
					<span className="gl-option-secondary">{secondary}</span>
				)}
			</span>
			{selected ? (
				<span className="gl-option-end">
					<Icon name="check" size={16} />
				</span>
			) : null}
		</div>
	);
}

// Grouped rows, as Autocomplete's groupBy marks them up.
function GroupedOptions() {
	const id = useId();
	const groups = [
		{ name: "Backend", options: ["Node.js", "PostgreSQL"] },
		{ name: "Frontend", options: ["React", "Astro"] },
	];
	return (
		<div
			className="gl-listbox"
			role="listbox"
			aria-label="Stack"
			aria-multiselectable="true"
		>
			{groups.map(({ name, options }) => (
				<div
					key={name}
					className="gl-listbox"
					role="group"
					aria-labelledby={`${id}-${name}`}
				>
					<div id={`${id}-${name}`} className="gl-option-group">
						{name}
					</div>
					{options.map((option) => (
						<Option key={option} selected={option !== "Astro"}>
							{option}
						</Option>
					))}
				</div>
			))}
		</div>
	);
}

const levels = [
	{ fill: "glass", use: "Panels, cards and dialogs" },
	{ fill: "glass-raised", use: "The selected item in a group" },
	{ fill: "glass-control", use: "Chips and small controls" },
	{ fill: "glass-inset", use: "Wells and plates" },
	{ fill: "glass-faint", use: "Tracks behind a pill nav" },
];

export const GlassMaterial: Story = {
	name: "Glass material",
	parameters: {
		docs: {
			description: {
				story:
					"`gl-glass` frosts what lies behind it: the `--gl-fill` level (default `glass`) over a `--gl-blur` backdrop blur (default `blur-panel`) with `saturate(115%)`. It turns to `glass-solid` where blur is missing or the reader prefers reduced transparency.",
			},
		},
	},
	render: () => (
		<Tiles>
			{levels.map(({ fill, use }) => (
				<div
					key={fill}
					className="gl-glass"
					style={
						{
							"--gl-fill": `var(--${fill})`,
							display: "grid",
							alignContent: "end",
							gap: 4,
							minHeight: 132,
							padding: 20,
							border: "1px solid var(--glass-edge)",
							borderRadius: "var(--radius-pane)",
							boxShadow: "var(--shadow-pane)",
						} as CSSProperties
					}
				>
					<code className="text-code">{fill}</code>
					<Caption>{use}</Caption>
				</div>
			))}
		</Tiles>
	),
};

export const PopoverSurface: Story = {
	name: "Popover surface",
	parameters: {
		docs: {
			description: {
				story:
					"`gl-popover` is the side selector's material raised for floating use: `glass` with `blur-selector`, a `glass-edge` border, `radius-well` and `shadow-panel`. Its padding is `gl-popover-pad-none`, `gl-popover-pad-sm` (7px) or `gl-popover-pad-md` (16px).",
			},
		},
	},
	render: () => (
		<Row gap={20} align="flex-start">
			<Labelled label="gl-popover-pad-md">
				<div
					className="gl-popover gl-popover-pad-md"
					style={{ display: "grid", gap: 4, width: 280 }}
				>
					<p className="text-label" style={{ margin: 0 }}>
						Remote from Medellín
					</p>
					<p
						className="text-small"
						style={{ margin: 0, color: "var(--color-muted)" }}
					>
						Product teams first, with full US-hours overlap.
					</p>
				</div>
			</Labelled>
			<Labelled label="gl-popover-pad-sm, with option rows">
				<div className="gl-popover gl-popover-pad-sm" style={{ width: 240 }}>
					<div className="gl-listbox" role="listbox" aria-label="Sort projects">
						<Option selected>Newest first</Option>
						<Option>Oldest first</Option>
					</div>
				</div>
			</Labelled>
		</Row>
	),
};

export const OptionRows: Story = {
	name: "Option rows",
	parameters: {
		docs: {
			description: {
				story:
					"`gl-listbox` and `gl-option` are the rows of Menu, Select, Autocomplete, List and TransferList: 40px tall on `radius-control`, with icon, secondary text and end slots. A selected row is raised (`glass-raised`, a white edge, `shadow-raised`) and carries a check; a disabled row drops to 50% opacity. `gl-option-group` heads a group.",
			},
		},
	},
	render: () => (
		<Row gap={20} align="flex-start">
			<Labelled label="Icons, secondary text, selected and disabled">
				<div className="gl-popover gl-popover-pad-sm" style={{ width: 300 }}>
					<div className="gl-listbox" role="listbox" aria-label="Project">
						<Option icon="file" secondary="From 6 seconds to 10–20 ms">
							Training PDFs
						</Option>
						<Option selected icon="layers" secondary="Built together">
							A fitness app
						</Option>
						<Option disabled icon="folder" secondary="Archived">
							Client portal
						</Option>
					</div>
				</div>
			</Labelled>
			<Labelled label="Groups, several selected">
				<div className="gl-popover gl-popover-pad-sm" style={{ width: 240 }}>
					<GroupedOptions />
				</div>
			</Labelled>
		</Row>
	),
};
