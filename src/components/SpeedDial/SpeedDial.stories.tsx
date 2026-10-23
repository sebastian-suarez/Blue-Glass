import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/SpeedDial/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Stack,
	Caption,
	Stage,
	Tiles,
} from "../../../stories/blocks/preview-kit.js";
import {
	SpeedDial,
	SpeedDialAction,
	Icon,
	Paper,
	SpeedDialIcon,
} from "../../index.js";
import type { SpeedDialProps } from "./SpeedDial.js";

const meta = {
	title: "Navigation/SpeedDial",
	component: SpeedDial,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof SpeedDial>;
export default meta;
type Story = StoryObj<Partial<SpeedDialProps>>;
const p = { margin: 0, color: "var(--color-muted)" };
const C = [
	{ icon: "mail", label: "Email me" },
	{ icon: "link", label: "Copy link" },
	{ icon: "share", label: "Share" },
	{ icon: "download", label: "Download résumé" },
];
const V = C.slice(0, 3);
function PreviewJ(args: Partial<SpeedDialProps>) {
	const [exampleState1, setExampleState1] = React.useState("");
	return (
		<Stage height={340}>
			<div
				style={{ padding: "22px 24px", display: "grid", gap: 6, maxWidth: 400 }}
			>
				<span className="text-title-sm">Sebastian Suarez</span>
				<span className="text-caption" style={p}>
					Backend lead and architect. Medellín, Colombia.
				</span>
				<span
					role="status"
					className="text-micro"
					style={{ ...p, marginTop: 8 }}
				>
					{exampleState1}
				</span>
			</div>
			<SpeedDial
				ariaLabel="Contact and share"
				style={{ position: "absolute", right: 20, bottom: 20 }}
				{...args}
			>
				{C.map((n) => (
					<SpeedDialAction
						key={n.label}
						tooltipOpen
						icon={<Icon name={n.icon} />}
						tooltipTitle={n.label}
						onClick={() => {
							setExampleState1(`${n.label}: done.`);
						}}
					/>
				))}
			</SpeedDial>
		</Stage>
	);
}

const q: Record<
	NonNullable<SpeedDialProps["direction"]>,
	React.CSSProperties
> = {
	up: { position: "absolute", right: 18, bottom: 18 },
	down: { position: "absolute", right: 18, top: 18 },
	left: { position: "absolute", right: 18, top: "calc(50% - 23px)" },
	right: { position: "absolute", left: 18, top: "calc(50% - 23px)" },
};
function PreviewF({
	direction: t,
}: {
	readonly direction: NonNullable<SpeedDialProps["direction"]>;
}) {
	return (
		<Stage height={236}>
			<SpeedDial
				defaultOpen
				ariaLabel={`Contact, opens ${t}`}
				direction={t}
				style={q[t]}
			>
				{V.map((o) => (
					<SpeedDialAction
						key={o.label}
						icon={<Icon name={o.icon} />}
						tooltipTitle={o.label}
					/>
				))}
			</SpeedDial>
		</Stage>
	);
}

function PreviewU() {
	const [isExampleState2, setIsExampleState2] = React.useState(false);
	const value1Ref = React.useRef(0);
	return (
		<Stage height={380}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					overflow: "auto",
					padding: "24px 22px 120px",
				}}
				onScroll={(a) => {
					const s = a.currentTarget.scrollTop;
					if (Math.abs(s - value1Ref.current) < 8) {
						return;
					}

					setIsExampleState2(s > value1Ref.current && s > 40);
					value1Ref.current = s;
				}}
			>
				<Paper
					style={{
						padding: "24px 26px",
						display: "grid",
						gap: 12,
						maxWidth: 470,
					}}
				>
					<span className="text-micro" style={p}>
						How it works
					</span>
					<span className="text-subtitle">
						A merged pull request is the deploy.
					</span>
					<p className="text-small" style={p}>
						The site is static Astro pages in a private S3 bucket. CloudFront
						serves them, and Cloudflare sits in front for DNS and TLS.
					</p>
					<p className="text-small" style={p}>
						Infrastructure lives in OpenTofu. The CI roles that publish are
						capped by a permissions boundary that only a person can move.
					</p>
					<p className="text-small" style={p}>
						Every change runs through the same gate as VSebCode: Claude Code
						implements, Codex reviews, and nothing merges unreviewed.
					</p>
				</Paper>
			</div>
			<SpeedDial
				ariaLabel="Contact and share"
				hidden={isExampleState2}
				icon={<SpeedDialIcon />}
				style={{
					position: "fixed",
					right: "calc(16px + env(safe-area-inset-right, 0px))",
					bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
				}}
			>
				{C.map((a) => (
					<SpeedDialAction
						key={a.label}
						tooltipOpen
						icon={<Icon name={a.icon} />}
						tooltipTitle={a.label}
					/>
				))}
			</SpeedDial>
		</Stage>
	);
}

function DefaultWithArgs(
	args: Partial<SpeedDialProps>,
	{
		viewMode,
	}: {
		readonly viewMode: string;
	},
) {
	const [, updateArgs] = useArgs<Partial<SpeedDialProps>>();
	return (
		<LiveArg
			value={args.open}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(value, setValue) => (
				<PreviewJ
					{...args}
					open={value}
					onOpen={(event, reason) => {
						args.onOpen?.(event, reason);
						setValue(true);
					}}
					onClose={(event, reason) => {
						args.onClose?.(event, reason);
						setValue(false);
					}}
				/>
			)}
		</LiveArg>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		open: true,
		ariaLabel: "Contact and share",
		onOpen: fn<() => void>(),
		onClose: fn<() => void>(),
		onChange: fn<() => void>(),
	},
	argTypes: {},
	parameters: {
		controls: { disable: false, include: ["open", "ariaLabel"] },
		docs: {
			description: {
				story:
					"Open, with the labels shown: the ink trigger's plus has turned into a close, and the glass actions zoomed in 40ms apart.",
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
					"Four directions. Without tooltipOpen a label shows on hover and focus. A fine pointer opens it on hover too; arrows walk the actions, Escape closes.",
			},
		},
	},
	render: () => (
		<Tiles min={300}>
			<Stack gap={8}>
				<Caption>up</Caption>
				<PreviewF direction="up" />
			</Stack>
			<Stack gap={8}>
				<Caption>down</Caption>
				<PreviewF direction="down" />
			</Stack>
			<Stack gap={8}>
				<Caption>left</Caption>
				<PreviewF direction="left" />
			</Stack>
			<Stack gap={8}>
				<Caption>right</Caption>
				<PreviewF direction="right" />
			</Stack>
		</Tiles>
	),
};
export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"Pinned over a reading view with z-fab and safe-area insets. Scrolling down zooms it out (hidden); scrolling up brings it back.",
			},
		},
	},
	render: () => <PreviewU />,
};
