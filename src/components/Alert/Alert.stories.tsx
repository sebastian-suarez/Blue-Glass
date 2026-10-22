import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import readme from "../../../design-system/components/Alert/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack, Tiles } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Paper } from "../Paper/index.js";
import {
	Alert,
	type AlertProps,
	type AlertSeverity,
	AlertTitle,
} from "./Alert.js";

const meta = {
	title: "Feedback/Alert",
	component: Alert,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

const messages: ReadonlyArray<readonly [AlertSeverity, string]> = [
	["success", "Published to S3."],
	["info", "Cache invalidation queued."],
	["warning", "TLS certificate renews in 9 days."],
	["error", "Couldn't reach the bucket."],
];

/**
The four severities in one fill, over the fill's name.
*/
function Fill({
	variant,
}: {
	readonly variant: NonNullable<AlertProps["variant"]>;
}) {
	return (
		<Stack gap={8}>
			<Tiles min={300} gap={10}>
				{messages.map(([severity, message]) => (
					<Alert key={severity} severity={severity} variant={variant}>
						{message}
					</Alert>
				))}
			</Tiles>
			<Caption>{variant}</Caption>
		</Stack>
	);
}

/**
The preview's closable alert: its close button takes it away, and "Show it again" brings it
back.
*/
function Closable() {
	const [isShown, setIsShown] = useState(true);
	return isShown ? (
		<Alert
			severity="success"
			onClose={() => {
				setIsShown(false);
			}}
		>
			Résumé PDF rebuilt from main.
		</Alert>
	) : (
		<div>
			<Button
				size="sm"
				onClick={() => {
					setIsShown(true);
				}}
			>
				Show it again
			</Button>
		</div>
	);
}

/**
The preview's deploy panel: Retry spins for 1.2s, then the failure gives way to the success,
whose close button leaves a way to replay the failed run.
*/
function DeployPanel() {
	const [run, setRun] = useState<
		"failed" | "retrying" | "published" | "dismissed"
	>("failed");
	useEffect(() => {
		if (run !== "retrying") {
			return;
		}

		const timer = setTimeout(() => {
			setRun("published");
		}, 1200);
		return () => {
			clearTimeout(timer);
		};
	}, [run]);

	let outcome = (
		<div>
			<Button
				size="sm"
				onClick={() => {
					setRun("failed");
				}}
			>
				Replay the failed run
			</Button>
		</div>
	);
	if (run === "failed" || run === "retrying") {
		outcome = (
			<Alert
				severity="error"
				action={
					<Button
						variant="text"
						size="sm"
						loading={run === "retrying"}
						onClick={() => {
							setRun("retrying");
						}}
					>
						Retry
					</Button>
				}
			>
				<AlertTitle>Upload failed</AlertTitle>
				Couldn&apos;t reach the bucket. Try again.
			</Alert>
		);
	} else if (run === "published") {
		outcome = (
			<Alert
				severity="success"
				onClose={() => {
					setRun("dismissed");
				}}
			>
				<AlertTitle>Published</AlertTitle>
				Published to S3. CloudFront picks it up in about a minute.
			</Alert>
		);
	}

	return (
		<Paper style={{ padding: 28, display: "grid", gap: 18, maxWidth: 600 }}>
			<div style={{ display: "grid", gap: 4 }}>
				<h3 className="text-title-sm" style={{ margin: 0 }}>
					Production deploy
				</h3>
				<p
					className="text-caption"
					style={{ margin: 0, color: "var(--color-muted)" }}
				>
					main@2fc0fe9 · private S3 bucket, served by CloudFront through
					Cloudflare
				</p>
			</div>
			{outcome}
			<Alert variant="outlined" severity="info">
				HTML is cached for 60 seconds at the edge; hashed assets for a year.
			</Alert>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		children:
			"Merging to main publishes the site. CloudFront serves the new build within a minute.",
		severity: "info",
		variant: "standard",
	},
	argTypes: { children: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: ["children", "severity", "variant"],
		},
		docs: {
			description: {
				story:
					"info, standard: the soft status tint, its icon, and the word screen readers hear first.",
			},
		},
	},
	render: (args) => <Alert {...args} style={{ maxWidth: 600 }} />,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Four severities, each with its own glyph and word, in three fills. Borders run all the way round; never a side stripe.",
			},
		},
	},
	render: () => (
		<>
			<Fill variant="standard" />
			<Fill variant="outlined" />
			<Fill variant="filled" />
			<Stack gap={8} style={{ maxWidth: 600 }}>
				<Alert
					severity="warning"
					action={
						<Button variant="text" size="sm">
							Renew now
						</Button>
					}
				>
					<AlertTitle>Certificate expiring</AlertTitle>
					sebastiansuarez.dev renews on October 29, and auto-renew is off.
				</Alert>
				<Caption>title · action</Caption>
			</Stack>
			<Stack gap={8} style={{ maxWidth: 600 }}>
				<Closable />
				<Caption>onClose: the close button</Caption>
			</Stack>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"A deploy panel: the failure says what to do and offers it; Retry swaps in the success.",
			},
		},
	},
	render: () => <DeployPanel />,
};
