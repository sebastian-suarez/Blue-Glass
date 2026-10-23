import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/TextField/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Row,
	Stack,
	Caption,
	Tiles,
} from "../../../stories/blocks/preview-kit.js";
import { TextField, InputAdornment, Button, Paper, Icon } from "../../index.js";
import type { TextFieldProps } from "./TextField.js";

const meta = {
	title: "Inputs/TextField",
	component: TextField,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof TextField>;
export default meta;
type Story = StoryObj<Partial<TextFieldProps>>;
function PreviewR({
	caption: t,
	children: i,
}: {
	readonly caption: React.ReactNode;
	readonly children: React.ReactNode;
}) {
	return (
		<Stack gap={8}>
			{i}
			<Caption>{t}</Caption>
		</Stack>
	);
}

function PreviewD() {
	const [isExampleState1, setIsExampleState1] = React.useState(false);
	return (
		<TextField
			fullWidth
			label="Password"
			type={isExampleState1 ? "text" : "password"}
			defaultValue="medellin26"
			autoComplete="current-password"
			endAdornment={
				<InputAdornment position="end">
					<Button
						variant="text"
						size="sm"
						onClick={() => {
							setIsExampleState1((n) => !n);
						}}
					>
						{isExampleState1 ? "Hide" : "Show"}
					</Button>
				</InputAdornment>
			}
		/>
	);
}

function isValidEmail(value: string): boolean {
	const parts = value.split("@");
	return (
		parts.length === 2 &&
		parts[0] !== "" &&
		!/\s/u.test(value) &&
		parts[1].slice(1, -1).includes(".")
	);
}

function PreviewU() {
	const [exampleState2, setExampleState2] = React.useState("");
	const [exampleState3, setExampleState3] = React.useState("");
	const [isExampleState4, setIsExampleState4] = React.useState(false);
	const [isExampleState5, setIsExampleState5] = React.useState(false);
	const isF = isValidEmail(exampleState2);
	const isG = exampleState3.trim().length >= 20;
	return (
		<Paper
			component="form"
			{...{ noValidate: true }}
			style={{ padding: 28, display: "grid", gap: 18, maxWidth: 600 }}
			onSubmit={(y) => {
				y.preventDefault();
				setIsExampleState4(true);
				if (isF && isG) {
					setIsExampleState5(true);
				}
			}}
		>
			<div style={{ display: "grid", gap: 6 }}>
				<h3 className="text-title-sm" style={{ margin: 0 }}>
					Tell me about the role
				</h3>
				<p
					className="text-body-sm"
					style={{ margin: 0, color: "var(--color-muted)" }}
				>
					I work remotely from Medellín, Colombia, with full US-hours overlap. I
					reply within a day.
				</p>
			</div>
			<Tiles min={220} gap={16}>
				<TextField
					fullWidth
					label="Name"
					autoComplete="name"
					placeholder="Your name"
				/>
				<TextField
					required
					fullWidth
					label="Work email"
					type="email"
					autoComplete="email"
					placeholder="you@company.com"
					value={exampleState2}
					error={isExampleState4 && !isF}
					helperText={
						isExampleState4 && !isF
							? "Enter an email like name@company.com."
							: "Only for my reply."
					}
					onChange={(y, b) => {
						setExampleState2(b);
					}}
				/>
			</Tiles>
			<TextField
				multiline
				showCount
				required
				fullWidth
				label="Message"
				minRows={4}
				maxRows={8}
				maxLength={500}
				value={exampleState3}
				placeholder="The team, the stack, what you need from a backend lead…"
				error={isExampleState4 && !isG}
				helperText={
					isExampleState4 && !isG
						? "A sentence or two, at least 20 characters."
						: "Plain text. Links are fine."
				}
				onChange={(y, b) => {
					setExampleState3(b);
				}}
			/>
			<Row>
				<Button
					type="submit"
					variant="primary"
					startIcon={<Icon name={isExampleState5 ? "check" : "send"} />}
				>
					{isExampleState5 ? "Sent" : "Send message"}
				</Button>
				<Caption>
					{isExampleState5
						? "Thanks. I’ll write back soon."
						: "Fields with an asterisk are required."}
				</Caption>
			</Row>
		</Paper>
	);
}

function DefaultWithArgs(
	args: Partial<TextFieldProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<TextFieldProps>>();
	return (
		<LiveArg
			value={args.value}
			fixed={viewMode === "docs"}
			onChange={(value) => {
				updateArgs({ value });
			}}
		>
			{(value, setValue) => (
				<div style={{ maxWidth: 360 }}>
					<TextField
						{...args}
						value={value}
						onChange={(event, next) => {
							args.onChange?.(event, next);
							setValue(next);
						}}
					/>
				</div>
			)}
		</LiveArg>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		value: "",
		label: "Email",
		type: "email",
		placeholder: "you@company.com",
		helperText: "I reply within a day.",
		autoComplete: "email",
		fullWidth: true,
		onChange: fn<() => void>(),
	},
	argTypes: { label: { control: "text" }, helperText: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: [
				"value",
				"label",
				"type",
				"placeholder",
				"helperText",
				"autoComplete",
				"fullWidth",
			],
		},
		docs: {
			description: {
				story:
					"The label sits above, always visible; helper text sits below and is read with the field.",
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
					"Outlined is the default pill; filled is an inset well whose edge darkens on hover and focus. sm is 36px.",
			},
		},
	},
	render: () => (
		<>
			<Tiles min={200} gap={20}>
				<PreviewR caption="outlined">
					<TextField fullWidth label="Name" defaultValue="Sebastián Suárez" />
				</PreviewR>
				<PreviewR caption="filled">
					<TextField
						fullWidth
						label="Name"
						variant="filled"
						defaultValue="Sebastián Suárez"
					/>
				</PreviewR>
				<PreviewR caption="sm">
					<TextField fullWidth label="Employer" size="sm" defaultValue="EPAM" />
				</PreviewR>
			</Tiles>
			<Tiles min={200} gap={20}>
				<PreviewR caption="error">
					<TextField
						error
						fullWidth
						label="Email"
						type="email"
						defaultValue="sebas@"
						helperText="Add the domain: @company.com."
					/>
				</PreviewR>
				<PreviewR caption="filled · error">
					<TextField
						error
						fullWidth
						label="Email"
						variant="filled"
						type="email"
						defaultValue="sebas@"
						helperText="Add the domain: @company.com."
					/>
				</PreviewR>
				<PreviewR caption="required">
					<TextField
						required
						fullWidth
						label="Company"
						placeholder="Where the role is"
						helperText="So I know who’s asking."
					/>
				</PreviewR>
			</Tiles>
			<Tiles min={200} gap={20}>
				<PreviewR caption="read-only">
					<TextField
						readOnly
						fullWidth
						label="Time zone"
						defaultValue="Medellín (UTC−5)"
						helperText="Set from your browser."
					/>
				</PreviewR>
				<PreviewR caption="disabled">
					<TextField
						disabled
						fullWidth
						label="Location"
						defaultValue="Medellín, Colombia"
						helperText="Fixed for this role."
					/>
				</PreviewR>
				<PreviewR caption="counter">
					<TextField
						showCount
						fullWidth
						label="Handle"
						defaultValue="sebastiansuarez"
						maxLength={20}
						helperText="Letters and numbers."
					/>
				</PreviewR>
			</Tiles>
			<Tiles min={200} gap={20}>
				<PreviewR caption="start icon">
					<TextField
						fullWidth
						label="Search"
						type="search"
						placeholder="Search projects"
						startAdornment={<Icon name="search" />}
					/>
				</PreviewR>
				<PreviewR caption="unit">
					<TextField
						fullWidth
						label="Latency budget"
						type="number"
						defaultValue="120"
						inputProps={{ min: 0, step: 10 }}
						endAdornment={<InputAdornment position="end">ms</InputAdornment>}
					/>
				</PreviewR>
				<PreviewR caption="end button">
					<PreviewD />
				</PreviewR>
			</Tiles>
			<PreviewR caption="multiline · minRows 3 · counter">
				<TextField
					multiline
					showCount
					fullWidth
					label="Project summary"
					minRows={3}
					maxLength={280}
					defaultValue="A Rust daemon that bridges force feedback from a Logitech RS50 wheel to sims running under Wine on macOS."
				/>
			</PreviewR>
		</>
	),
};
export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story: "A contact form. Send it empty to see the errors.",
			},
		},
	},
	render: () => <PreviewU />,
};
