import type { Meta, StoryObj } from "@storybook/react-vite";
import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import readme from "../../../design-system/components/Progress/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import {
	Caption,
	Labelled,
	Row,
	Stack,
} from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { CircularProgress, LinearProgress } from "./Progress.js";

const meta = {
	title: "Feedback/Progress",
	component: LinearProgress,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof LinearProgress>;

export default meta;

type Story = StoryObj<typeof meta>;

type StepState = "done" | "active" | "waiting";

/**
A pipeline step: its state's mark, its title and detail, and the bar of the step that's moving.
*/
function Step({
	title,
	state,
	detail,
	children,
}: {
	readonly title: string;
	readonly state: StepState;
	readonly detail: string;
	readonly children?: ReactNode;
}) {
	let mark = <Icon name="clock" size={18} />;
	if (state === "done") {
		mark = <Icon name="success" size={20} />;
	} else if (state === "active") {
		mark = <CircularProgress size="xs" aria-hidden="true" />;
	}

	const tone = state === "done" ? "var(--success)" : "var(--color-muted)";
	return (
		<li
			style={{
				display: "grid",
				gridTemplateColumns: "22px minmax(0, 1fr)",
				gap: 12,
				alignItems: "start",
				padding: "14px 0",
				borderTop: "1px solid var(--color-line)",
			}}
		>
			<span
				style={{
					display: "grid",
					placeItems: "center",
					height: 22,
					color: tone,
				}}
			>
				{mark}
			</span>
			<div style={{ display: "grid", gap: 8, minWidth: 0 }}>
				<div
					style={{
						display: "flex",
						alignItems: "baseline",
						gap: 12,
						fontSize: 14,
						lineHeight: 1.55,
					}}
				>
					<span style={{ fontWeight: 500 }}>{title}</span>
					<span style={{ marginLeft: "auto", fontSize: 12, color: tone }}>
						{detail}
					</span>
				</div>
				{children}
			</div>
		</li>
	);
}

type Stage = "upload" | "invalidate" | "done";

const files = 214;

// The invalidation step waits for the upload, then moves, then is done.
const invalidations: Record<Stage, { state: StepState; detail: string }> = {
	upload: { state: "waiting", detail: "Waiting" },
	invalidate: { state: "active", detail: "About a minute" },
	done: { state: "done", detail: "Done" },
};

/**
The preview's deploy pipeline: "Run again" uploads the 214 files 9% at a time, then invalidates
the cache for 2.2s while its bar slides.
*/
function Pipeline() {
	const [uploaded, setUploaded] = useState(62);
	const [stage, setStage] = useState<Stage>("upload");
	const [isRunning, setIsRunning] = useState(false);
	useEffect(() => {
		if (!isRunning) {
			return;
		}

		const timer = setTimeout(
			() => {
				if (stage !== "upload") {
					setStage("done");
					setIsRunning(false);
					return;
				}

				const next = Math.min(100, uploaded + 9);
				setUploaded(next);
				// A full upload hands over to the invalidation at once.
				if (next >= 100) {
					setStage("invalidate");
				}
			},
			stage === "upload" ? 260 : 2200,
		);
		return () => {
			clearTimeout(timer);
		};
	}, [isRunning, stage, uploaded]);

	const sent = Math.round((uploaded / 100) * files);
	const invalidation = invalidations[stage];
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 14, maxWidth: 600 }}>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					gap: "12px 16px",
				}}
			>
				<div style={{ display: "grid", gap: 4, minWidth: 0 }}>
					<h3 className="text-title-sm" style={{ margin: 0 }}>
						Production deploy
					</h3>
					<p
						className="text-caption"
						style={{ margin: 0, color: "var(--color-muted)" }}
					>
						main@2fc0fe9 · triggered by a merge
					</p>
				</div>
				<span style={{ marginLeft: "auto" }}>
					<Button
						size="sm"
						startIcon={<Icon name="refresh" />}
						disabled={isRunning}
						onClick={() => {
							setUploaded(0);
							setStage("upload");
							setIsRunning(true);
						}}
					>
						Run again
					</Button>
				</span>
			</div>
			<ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
				<Step title="Build" state="done" detail="Done in 1m 12s" />
				<Step
					title="Upload to S3"
					state={stage === "upload" ? "active" : "done"}
					detail={stage === "upload" ? `${sent} of ${files} files` : "Done"}
				>
					{stage === "upload" ? (
						<LinearProgress
							variant="determinate"
							value={uploaded}
							aria-label="Upload to S3"
							aria-valuetext={`${sent} of ${files} files`}
						/>
					) : null}
				</Step>
				<Step
					title="Invalidate CloudFront cache"
					state={invalidation.state}
					detail={invalidation.detail}
				>
					{stage === "invalidate" ? (
						<LinearProgress aria-label="Invalidate CloudFront cache" />
					) : null}
				</Step>
			</ol>
		</Paper>
	);
}

const onInk: CSSProperties = {
	display: "inline-flex",
	alignItems: "center",
	gap: 10,
	minHeight: 46,
	padding: "0 20px 0 14px",
	borderRadius: "var(--radius-tile)",
	background: "var(--color-ink)",
	color: "var(--on-ink)",
	fontSize: 14,
	boxShadow: "var(--shadow-primary)",
};

export const Default: Story = {
	name: "Default",
	args: {
		"aria-label": "Deploying",
		variant: "indeterminate",
		color: "default",
	},
	parameters: {
		controls: {
			disable: false,
			include: ["aria-label", "variant", "color"],
		},
		docs: {
			description: {
				story:
					"Indeterminate: a color-blue bar slides along a 4px color-line pill, and the ring turns. Under reduced motion both become a slow pulse.",
			},
		},
	},
	render: (args) => (
		<Stack gap={20} style={{ maxWidth: 600 }}>
			<LinearProgress {...args} />
			<Row gap={16}>
				<CircularProgress aria-label="Deploying" />
				<Caption>
					Name every progress bar: label, aria-label or aria-labelledby.
				</Caption>
			</Row>
		</Stack>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Determinate when the length is known, buffer when some is ready ahead (color-ring at 40%), indeterminate when it isn't.",
			},
		},
	},
	render: () => (
		<>
			<Stack gap={22} style={{ maxWidth: 600 }}>
				<LinearProgress
					showValue
					variant="determinate"
					value={62}
					label="Uploading build to S3"
				/>
				<LinearProgress
					variant="buffer"
					value={38}
					valueBuffer={64}
					label="Streaming lap telemetry"
					valueText="38% · 64% buffered"
				/>
				<LinearProgress
					label="Invalidating CloudFront cache"
					valueText="About a minute"
				/>
			</Stack>
			<Row gap={28} align="flex-end" style={{ marginTop: 14 }}>
				<Labelled label="xs 20" minHeight={56}>
					<CircularProgress size="xs" />
				</Labelled>
				<Labelled label="sm 28" minHeight={56}>
					<CircularProgress size="sm" />
				</Labelled>
				<Labelled label="md 40" minHeight={56}>
					<CircularProgress />
				</Labelled>
				<Labelled label="lg 56" minHeight={56}>
					<CircularProgress size="lg" />
				</Labelled>
				<Labelled label="determinate 25" minHeight={56}>
					<CircularProgress variant="determinate" value={25} />
				</Labelled>
				<Labelled label="showValue" minHeight={56}>
					<CircularProgress
						showValue
						variant="determinate"
						value={72}
						size="lg"
						aria-label="Calibration"
					/>
				</Labelled>
				<Labelled label="inherit on ink" minHeight={56}>
					<span style={onInk}>
						<CircularProgress
							size="xs"
							color="inherit"
							aria-label="Publishing"
						/>
						Publishing…
					</span>
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
					"A deploy pipeline: the step that's moving shows its bar, done steps say so with an icon and a word.",
			},
		},
	},
	render: () => <Pipeline />,
};
