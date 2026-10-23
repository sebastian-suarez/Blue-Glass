import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Autocomplete/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Row,
	Stack,
	Caption,
	Stage,
	Tiles,
} from "../../../stories/blocks/preview-kit.js";
import { Autocomplete, Paper, Icon, Button } from "../../index.js";
import type { AutocompleteProps } from "./Autocomplete.js";

const meta = {
	title: "Inputs/Autocomplete",
	component: Autocomplete,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Autocomplete>;
export default meta;
type Story = StoryObj<Partial<AutocompleteProps>>;
const p = [
	"EPAM",
	"Intive",
	"Limber Health",
	"SunDevs",
	"Globant",
	"PayPal",
	"Gorilla Logic",
];
const u = [
	{ label: "Node.js", group: "Runtime" },
	{ label: "TypeScript", group: "Languages" },
	{ label: "Rust", group: "Languages" },
	{ label: "PostgreSQL", group: "Data" },
	{ label: "MongoDB", group: "Data" },
	{ label: "AWS", group: "Cloud" },
	{ label: "Terraform", group: "Cloud" },
	{ label: "Cloudflare", group: "Cloud" },
	{ label: "React", group: "Frontend" },
];
const Y = [
	{
		label: "RS50 force-feedback bridge",
		group: "Own projects",
		secondary: "A Rust daemon for a sim-racing wheel under Wine on macOS",
	},
	{
		label: "VSebCode",
		group: "Own projects",
		secondary: "My fork of VS Code",
	},
	{
		label: "Clean Architecture template",
		group: "Own projects",
		secondary: "A template repository",
	},
	{
		label: "Limber Health training PDFs",
		group: "Client work",
		secondary: "From ~6 s to 10–20 ms",
	},
	{
		label: "Intive CMS fetch and transform services",
		group: "Client work",
		secondary: "Payload down 10%",
	},
	{
		label: "SunDevs fitness app",
		group: "Client work",
		secondary: "Payments on Stripe",
	},
];
const Z = [
	{ label: "Medellín", secondary: "UTC−5 all year, where I work from" },
	{ label: "New York", secondary: "Full overlap" },
	{ label: "San Francisco", secondary: "Full overlap" },
	{ label: "London", secondary: "Overlap in my mornings" },
	{ label: "Madrid", secondary: "Overlap in my mornings" },
	{ label: "Tokyo", secondary: "No working-hours overlap", disabled: true },
];
const f = { disablePortal: true };
function PreviewM({
	caption: o,
	children: l,
}: {
	readonly caption: React.ReactNode;
	readonly children: React.ReactNode;
}) {
	return (
		<Stack gap={8}>
			{l}
			<Caption>{o}</Caption>
		</Stack>
	);
}

function PreviewQ() {
	const [exampleState1, setExampleState1] = React.useState<
		(typeof Y)[number] | null
	>(null);
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 18, maxWidth: 620 }}>
			<div style={{ display: "grid", gap: 6 }}>
				<h3 className="text-title-sm" style={{ margin: 0 }}>
					Find a project
				</h3>
				<p
					className="text-body-sm"
					style={{ margin: 0, color: "var(--color-muted)" }}
				>
					Search my own projects and client work by name or summary.
				</p>
			</div>
			<Autocomplete
				fullWidth
				label="Project"
				placeholder="Try “Rust” or “PDF”"
				options={Y}
				groupBy={(i) => i.group}
				filterOptions={(i, { inputValue: n }) => {
					const a = n.trim().toLowerCase();
					return a === ""
						? [...i]
						: i.filter((g) =>
								`${g.label} ${g.secondary}`.toLowerCase().includes(a),
							);
				}}
				startAdornment={<Icon name="search" />}
				value={exampleState1}
				onChange={(i, n) => {
					setExampleState1(n as (typeof Y)[number] | null);
				}}
			/>
			{exampleState1 ? (
				<Paper
					variant="inset"
					style={{ padding: "16px 20px", display: "grid", gap: 4 }}
				>
					<span
						className="text-caption"
						style={{ color: "var(--color-muted)" }}
					>
						{exampleState1.group}
					</span>
					<span className="text-body" style={{ fontWeight: 500 }}>
						{exampleState1.label}
					</span>
					<span className="text-small" style={{ color: "var(--color-muted)" }}>
						{exampleState1.secondary}
					</span>
				</Paper>
			) : (
				<Caption>
					Nothing chosen yet. The list filters on names and summaries.
				</Caption>
			)}
			<Row>
				<Button
					variant="primary"
					endIcon={<Icon name="arrow-right" />}
					disabled={!exampleState1}
				>
					Open the project
				</Button>
			</Row>
		</Paper>
	);
}

function PreviewJ() {
	return (
		<Autocomplete
			loading
			defaultOpen
			disablePortal
			fullWidth
			label="Employer"
			options={[]}
			defaultInputValue="Glo"
		/>
	);
}

function DefaultWithArgs(
	args: Partial<AutocompleteProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<AutocompleteProps>>();
	return (
		<LiveArg
			value={args.open}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(value, setValue) => (
				<Stage height={350}>
					<div style={{ padding: 20, maxWidth: 340 }}>
						<Autocomplete
							options={p}
							defaultInputValue="a"
							{...args}
							open={value}
							onOpen={(event) => {
								args.onOpen?.(event);
								setValue(true);
							}}
							onClose={(event, reason) => {
								args.onClose?.(event, reason);
								setValue(false);
							}}
						/>
					</div>
				</Stage>
			)}
		</LiveArg>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		open: true,
		label: "Employer",
		placeholder: "Type a company",
		fullWidth: true,
		disablePortal: true,
		onOpen: fn<() => void>(),
		onClose: fn<() => void>(),
		onChange: fn<() => void>(),
		onInputChange: fn<() => void>(),
	},
	argTypes: { label: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: ["open", "label", "placeholder", "fullWidth", "disablePortal"],
		},
		docs: {
			description: {
				story:
					"An editable combobox in the field’s pill. The list filters as you type, ignoring case and accents, and the match is set in 600.",
			},
		},
	},
	render: DefaultWithArgs,
};
export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"multiple adds the site’s chips with a remove button; groupBy heads each run of options. Backspace removes the last chip.",
			},
		},
	},
	render: () => (
		<>
			<Stage height={420}>
				<div style={{ padding: 20, maxWidth: 460 }}>
					<Autocomplete
						multiple
						defaultOpen
						disableCloseOnSelect
						label="Stack"
						options={u}
						groupBy={(o) => o.group}
						defaultValue={[u[0], u[1], u[5]]}
						{...f}
						fullWidth
					/>
				</div>
			</Stage>
			<Row gap={16} align="stretch">
				<div style={{ flex: "1 1 260px", minWidth: 0 }}>
					<Stage height={190}>
						<div style={{ padding: 20 }}>
							<PreviewJ />
						</div>
					</Stage>
					<div style={{ marginTop: 8 }}>
						<Caption>loading</Caption>
					</div>
				</div>
				<div style={{ flex: "1 1 260px", minWidth: 0 }}>
					<Stage height={190}>
						<div style={{ padding: 20 }}>
							<Autocomplete
								defaultOpen
								label="Employer"
								options={p}
								defaultInputValue="Stripe"
								{...f}
								fullWidth
							/>
						</div>
					</Stage>
					<div style={{ marginTop: 8 }}>
						<Caption>no options</Caption>
					</div>
				</div>
			</Row>
			<div>
				<Stage height={380}>
					<div style={{ padding: 20, maxWidth: 380 }}>
						<Autocomplete
							defaultOpen
							label="Your time zone"
							options={Z}
							defaultInputValue="o"
							{...f}
							fullWidth
						/>
					</div>
				</Stage>
				<div style={{ marginTop: 8 }}>
					<Caption>
						disabled option, skipped by the keyboard · secondary line
					</Caption>
				</div>
			</div>
			<Tiles min={200} gap={20}>
				<PreviewM caption="free text">
					<Autocomplete
						freeSolo
						fullWidth
						label="Role"
						options={[
							"Backend lead",
							"Software architect",
							"Lead software engineer",
						]}
						defaultValue="Platform lead"
					/>
				</PreviewM>
				<PreviewM caption="error">
					<Autocomplete
						error
						fullWidth
						label="Employer"
						options={p}
						helperText="Choose one from the list."
						placeholder="Type a company"
					/>
				</PreviewM>
				<PreviewM caption="disabled">
					<Autocomplete
						disabled
						fullWidth
						label="Employer"
						options={p}
						defaultValue="EPAM"
					/>
				</PreviewM>
			</Tiles>
			<Tiles min={200} gap={20}>
				<PreviewM caption="filled">
					<Autocomplete
						fullWidth
						label="Employer"
						variant="filled"
						options={p}
						defaultValue="PayPal"
					/>
				</PreviewM>
				<PreviewM caption="sm">
					<Autocomplete
						fullWidth
						label="Employer"
						size="sm"
						options={p}
						defaultValue="SunDevs"
					/>
				</PreviewM>
				<PreviewM caption="sm · multiple">
					<Autocomplete
						multiple
						fullWidth
						label="Stack"
						size="sm"
						options={u}
						defaultValue={[u[2]]}
					/>
				</PreviewM>
			</Tiles>
		</>
	),
};
export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"Search across projects: grouped, with summaries, opening over the frame.",
			},
		},
	},
	render: () => <PreviewQ />,
};
