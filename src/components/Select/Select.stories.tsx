import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Select/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Row,
	Stack,
	Caption,
	Stage,
	Tiles,
} from "../../../stories/blocks/preview-kit.js";
import { Select, Paper, Option, Button, Icon } from "../../index.js";
import type { SelectProps } from "./Select.js";

const meta = {
	title: "Inputs/Select",
	component: Select,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<Partial<SelectProps>>;
const h = [
	"Node.js",
	"TypeScript",
	"AWS",
	"PostgreSQL",
	"MongoDB",
	"React",
	"Rust",
	"Terraform",
	"Cloudflare",
];
const V = [
	"EPAM",
	"Intive",
	"Limber Health",
	"SunDevs",
	"Globant",
	"PayPal",
	"Gorilla Logic",
];
const _ = {
	disablePortal: true,
	disableScrollLock: true,
	disableEnforceFocus: true,
};
const K = [
	"Backend architecture",
	"AWS and Terraform",
	"PostgreSQL performance",
	"Team practices",
	"Hiring process",
];
function PreviewR({
	caption: t,
	children: l,
}: {
	readonly caption: React.ReactNode;
	readonly children: React.ReactNode;
}) {
	return (
		<Stack gap={8}>
			{l}
			<Caption>{t}</Caption>
		</Stack>
	);
}

function PreviewU() {
	const [exampleState1, setExampleState1] = React.useState<
		"wed10" | "thu930" | "fri11" | null
	>(null);
	const [exampleState2, setExampleState2] = React.useState([
		"Backend architecture",
	]);
	const [exampleState3, setExampleState3] = React.useState("30");
	const [isExampleState4, setIsExampleState4] = React.useState(false);
	const A = {
		wed10: "Wednesday, 10:00",
		thu930: "Thursday, 09:30",
		fri11: "Friday, 11:00",
	}[exampleState1 ?? "wed10"];
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 18, maxWidth: 620 }}>
			<div style={{ display: "grid", gap: 6 }}>
				<h3 className="text-title-sm" style={{ margin: 0 }}>
					Book an intro call
				</h3>
				<p
					className="text-body-sm"
					style={{ margin: 0, color: "var(--color-muted)" }}
				>
					Pick a slot and what you’d like to cover. Times are Medellín time
					(UTC−5).
				</p>
			</div>
			<Tiles min={220} gap={16}>
				<Select
					required
					fullWidth
					label="Slot"
					placeholder="Choose a slot"
					value={exampleState1}
					onChange={(x, u) => {
						setExampleState1(u as "wed10" | "thu930" | "fri11" | null);
						setIsExampleState4(false);
					}}
				>
					<Option value="wed10" secondary="45 minutes free">
						Wednesday, 10:00
					</Option>
					<Option disabled value="wed15" secondary="Booked">
						Wednesday, 15:00
					</Option>
					<Option value="thu930" secondary="60 minutes free">
						Thursday, 09:30
					</Option>
					<Option value="fri11" secondary="30 minutes free">
						Friday, 11:00
					</Option>
				</Select>
				<Select
					native
					fullWidth
					label="Length"
					value={exampleState3}
					options={[
						{ value: "15", label: "15 minutes" },
						{ value: "30", label: "30 minutes" },
						{ value: "45", label: "45 minutes" },
					]}
					onChange={(x, u) => {
						setExampleState3(String(u));
					}}
				/>
			</Tiles>
			<Select
				multiple
				fullWidth
				label="Topics"
				value={exampleState2}
				options={K}
				placeholder="What should we cover?"
				helperText="Pick as many as you like."
				onChange={(x, u) => {
					setExampleState2(u as string[]);
				}}
			/>
			<Row>
				<Button
					variant="primary"
					startIcon={<Icon name={isExampleState4 ? "check" : "calendar"} />}
					disabled={exampleState1 === null}
					onClick={() => {
						setIsExampleState4(true);
					}}
				>
					{isExampleState4 ? "Requested" : "Request the call"}
				</Button>
				<Caption>
					{exampleState1 === null
						? "Choose a slot first."
						: `${A} · ${exampleState3} minutes${exampleState2.length > 0 ? ` · ${exampleState2.join(", ")}` : ""}`}
				</Caption>
			</Row>
		</Paper>
	);
}

function DefaultWithArgs(
	args: Partial<SelectProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<SelectProps>>();
	return (
		<LiveArg
			value={args.open}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(value, setValue) => (
				<Stage height={400}>
					<div style={{ padding: 20, maxWidth: 320 }}>
						<Select
							defaultValue="TypeScript"
							options={h.slice(0, 6)}
							PopoverProps={_}
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
		label: "Primary stack",
		fullWidth: true,
		onOpen: fn<() => void>(),
		onClose: fn<() => void>(),
		onChange: fn<() => void>(),
	},
	argTypes: { label: { control: "text" } },
	parameters: {
		controls: { disable: false, include: ["open", "label", "fullWidth"] },
		docs: {
			description: {
				story:
					"A select-only combobox in the field’s pill. The list opens in a glass popover; the chosen row is raised with a check.",
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
					"multiple shows the choices as the site’s chips and keeps the list open while you pick. native styles a real select.",
			},
		},
	},
	render: () => (
		<>
			<Tiles min={200} gap={20}>
				<PreviewR caption="placeholder">
					<Select
						fullWidth
						label="Employer"
						placeholder="Choose an employer"
						options={V}
					/>
				</PreviewR>
				<PreviewR caption="value">
					<Select
						fullWidth
						label="Primary stack"
						defaultValue="Node.js"
						options={h}
					/>
				</PreviewR>
				<PreviewR caption="filled">
					<Select
						fullWidth
						label="Primary stack"
						variant="filled"
						defaultValue="Rust"
						options={h}
					/>
				</PreviewR>
			</Tiles>
			<PreviewR caption="multiple">
				<div style={{ maxWidth: 440 }}>
					<Select
						multiple
						fullWidth
						label="Stack"
						defaultValue={["Node.js", "TypeScript", "AWS", "PostgreSQL"]}
						options={h}
					/>
				</div>
			</PreviewR>
			<Tiles min={200} gap={20}>
				<PreviewR caption="error">
					<Select
						error
						fullWidth
						label="Notice period"
						placeholder="Choose one"
						helperText="Pick one so I can plan the start."
						options={["Two weeks", "One month", "Two months"]}
					/>
				</PreviewR>
				<PreviewR caption="disabled">
					<Select
						disabled
						fullWidth
						label="Country"
						defaultValue="co"
						options={[{ value: "co", label: "Colombia" }]}
					/>
				</PreviewR>
				<PreviewR caption="native">
					<Select
						native
						fullWidth
						label="Employer"
						defaultValue="EPAM"
						options={V}
					/>
				</PreviewR>
			</Tiles>
			<Tiles min={200} gap={20}>
				<PreviewR caption="sm">
					<Select
						fullWidth
						size="sm"
						label="Sort"
						defaultValue="recent"
						options={[
							{ value: "recent", label: "Most recent" },
							{ value: "impact", label: "Biggest impact" },
						]}
					/>
				</PreviewR>
				<PreviewR caption="sm · multiple">
					<Select
						multiple
						fullWidth
						size="sm"
						label="Stack"
						defaultValue={["Rust", "React"]}
						options={h}
					/>
				</PreviewR>
				<PreviewR caption="start icon">
					<Select
						fullWidth
						label="Sort"
						startAdornment={<Icon name="sort" />}
						defaultValue="impact"
						options={[
							{ value: "recent", label: "Most recent" },
							{ value: "impact", label: "Biggest impact" },
						]}
					/>
				</PreviewR>
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
					"Booking a call: a disabled (booked) slot, a native select and a multiple one. These open over the whole frame; focus returns to the field.",
			},
		},
	},
	render: () => <PreviewU />,
};
