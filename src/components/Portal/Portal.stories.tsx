import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import readme from "../../../design-system/components/Portal/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import { Caption, Row } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Paper } from "../Paper/index.js";
import { type PortalProps, Portal } from "./Portal.js";

const meta = {
	title: "Utils/Portal",
	component: Portal,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Portal>;

export default meta;

type Story = StoryObj<typeof meta>;

const place: React.CSSProperties = {
	padding: 16,
	minHeight: 110,
	display: "grid",
	alignContent: "start",
	gap: 10,
};

/**
The two places of the preview: where the Portal is written, and the container next to it, which
the toggles choose between.
*/
function Places({
	disablePortal = false,
	onDisablePortalChange,
	...props
}: PortalProps & {
	readonly onDisablePortalChange: (disablePortal: boolean) => void;
}) {
	// The container is a ref's element, so it arrives after the first render.
	const [target, setTarget] = React.useState<HTMLDivElement | null>(null);
	return (
		<div style={{ display: "grid", gap: 14 }}>
			<Row>
				<Button
					size="sm"
					variant={disablePortal ? "glass" : "primary"}
					aria-pressed={!disablePortal}
					onClick={() => {
						onDisablePortalChange(false);
					}}
				>
					Into the target
				</Button>
				<Button
					size="sm"
					variant={disablePortal ? "primary" : "glass"}
					aria-pressed={disablePortal}
					onClick={() => {
						onDisablePortalChange(true);
					}}
				>
					disablePortal
				</Button>
			</Row>
			<div
				style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
			>
				<Paper variant="inset" style={place}>
					<Caption>Where it&apos;s written</Caption>
					<Portal {...props} container={target} disablePortal={disablePortal}>
						<span
							className="text-caption"
							style={{
								padding: "6px 12px",
								borderRadius: "var(--radius-pill)",
								background: "var(--glass-raised)",
								border: "1px solid var(--glass-edge)",
								boxShadow: "var(--shadow-raised)",
								justifySelf: "start",
							}}
						>
							I&apos;m the portal&apos;s child
						</span>
					</Portal>
				</Paper>
				<Paper variant="inset" style={place}>
					<Caption>The container</Caption>
					<div
						ref={setTarget}
						style={{ display: "grid", justifyItems: "start" }}
					/>
				</Paper>
			</div>
		</div>
	);
}

/**
Default's places: the disablePortal arg drives the Portal, and the toggles set it.
*/
function PlacesWithArgs(
	args: PortalProps,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<PortalProps>();
	return (
		<LiveArg
			value={args.disablePortal === true}
			fixed={viewMode === "docs"}
			onChange={(disablePortal) => {
				updateArgs({ disablePortal });
			}}
		>
			{(disablePortal, setDisablePortal) => (
				<Places
					{...args}
					disablePortal={disablePortal}
					onDisablePortalChange={setDisablePortal}
				/>
			)}
		</LiveArg>
	);
}

export const Default: Story = {
	name: "Default",
	args: { disablePortal: false },
	parameters: {
		controls: { disable: false, include: ["disablePortal"] },
		docs: {
			description: {
				story:
					"Renders its children into another DOM node (document.body unless a container is given). React context and events still flow from where it's written.",
			},
		},
	},
	render: PlacesWithArgs,
};
