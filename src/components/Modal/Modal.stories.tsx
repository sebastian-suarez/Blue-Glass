import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Modal/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import { Caption, Row, Stage } from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Fade, Grow } from "../Transitions/index.js";
import { Modal, type ModalProps } from "./Modal.js";

const meta = {
	title: "Utils/Modal",
	component: Modal,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Modal>;

export default meta;

// Only Default renders through its args, and every story brings its own content, so none takes
// the required open or children.
type Story = StoryObj<Partial<ModalProps>>;

// As in the preview: the content centred over the layer, taking the pointer only on its surface.
const centred: React.CSSProperties = {
	position: "absolute",
	inset: 0,
	display: "grid",
	placeItems: "center",
	pointerEvents: "none",
	padding: 16,
};

const surface: React.CSSProperties = {
	pointerEvents: "auto",
	width: "min(380px, 100%)",
	padding: 24,
	display: "grid",
	gap: 14,
};

type LayerProps = Omit<Partial<ModalProps>, "children"> & {
	readonly label: string;
	readonly onOpen: () => void;
	readonly onDismiss: () => void;
};

/**
One of the preview's cards: a button that opens the modal, and the modal open in place over the
card, leaving focus and the page's scroll alone. Its Close button dismisses it, as Escape and a
press outside do through onClose.
*/
function Layer({
	label,
	open = false,
	onOpen,
	onDismiss,
	...modal
}: LayerProps) {
	return (
		<Stage height={250}>
			<div style={{ padding: 20 }}>
				<Button size="sm" onClick={onOpen}>
					Open
				</Button>
			</div>
			<Modal
				disablePortal
				disableScrollLock
				disableEnforceFocus
				disableAutoFocus
				{...modal}
				open={open}
			>
				<Fade>
					<div style={centred}>
						<Paper style={surface} role="dialog" aria-label={label}>
							<span className="text-title-sm">{label}</span>
							<span
								className="text-body-sm"
								style={{ color: "var(--color-muted)" }}
							>
								Press outside, press Escape, or close.
							</span>
							<Row>
								<Button size="sm" variant="primary" onClick={onDismiss}>
									Close
								</Button>
							</Row>
						</Paper>
					</div>
				</Fade>
			</Modal>
		</Stage>
	);
}

/**
A card that keeps its own open state, as each of the preview's does.
*/
function OwnLayer(
	props: Omit<LayerProps, "open" | "onOpen" | "onDismiss" | "onClose">,
) {
	const [isOpen, setIsOpen] = React.useState(true);
	const close = () => {
		setIsOpen(false);
	};

	return (
		<Layer
			{...props}
			open={isOpen}
			onOpen={() => {
				setIsOpen(true);
			}}
			onDismiss={close}
			onClose={close}
		/>
	);
}

/**
Default's card: the args drive the modal, and Escape, a press on the backdrop or Close set open
back to false, as Open sets it to true.
*/
function LayerWithArgs(
	args: Partial<ModalProps>,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<Partial<ModalProps>>();
	return (
		<LiveArg
			value={args.open !== false}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(isOpen, setIsOpen) => (
				<Layer
					{...args}
					label="A modal layer"
					open={isOpen}
					onOpen={() => {
						setIsOpen(true);
					}}
					onDismiss={() => {
						setIsOpen(false);
					}}
					onClose={(event, reason) => {
						args.onClose?.(event, reason);
						setIsOpen(false);
					}}
				/>
			)}
		</LiveArg>
	);
}

/**
The Example: a modal over the whole frame, through the portal, and a second one it opens on top.
*/
function FullFrame() {
	const [isOpen, setIsOpen] = React.useState(false);
	const [isNestedOpen, setIsNestedOpen] = React.useState(false);
	return (
		<>
			<Row>
				<Button
					variant="primary"
					onClick={() => {
						setIsOpen(true);
					}}
				>
					Open a modal
				</Button>
				<Caption>
					Over the whole frame; Tab stays inside; focus returns here.
				</Caption>
			</Row>
			<Modal
				open={isOpen}
				onClose={() => {
					setIsOpen(false);
				}}
			>
				<Grow origin="center">
					<div style={{ ...centred, position: "fixed" }}>
						<Paper
							role="dialog"
							aria-modal="true"
							aria-labelledby="m1"
							style={surface}
						>
							<span id="m1" className="text-title-sm">
								Modal
							</span>
							<span
								className="text-body-sm"
								style={{ color: "var(--color-muted)" }}
							>
								Open a second one: Escape closes only the top layer.
							</span>
							<Row>
								<Button
									size="sm"
									startIcon={<Icon name="layers" />}
									onClick={() => {
										setIsNestedOpen(true);
									}}
								>
									Open nested
								</Button>
								<Button
									data-autofocus
									size="sm"
									variant="primary"
									onClick={() => {
										setIsOpen(false);
									}}
								>
									Done
								</Button>
							</Row>
						</Paper>
					</div>
				</Grow>
			</Modal>
			<Modal
				open={isNestedOpen}
				onClose={() => {
					setIsNestedOpen(false);
				}}
			>
				<Grow origin="center">
					<div style={{ ...centred, position: "fixed" }}>
						<Paper
							role="dialog"
							aria-modal="true"
							aria-label="Nested"
							style={{ ...surface, width: "min(300px, 100%)" }}
						>
							<span className="text-body-sm">Nested modal.</span>
							<Row>
								<Button
									size="sm"
									onClick={() => {
										setIsNestedOpen(false);
									}}
								>
									Close
								</Button>
							</Row>
						</Paper>
					</div>
				</Grow>
			</Modal>
		</>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		open: true,
		hideBackdrop: false,
		disablePortal: true,
		disableEnforceFocus: true,
		onClose: fn<() => void>(),
	},
	parameters: {
		controls: {
			disable: false,
			include: ["open", "hideBackdrop", "disablePortal", "disableEnforceFocus"],
		},
		docs: {
			description: {
				story:
					"Shown open inside the card. In a page it renders into document.body above everything (z-modal).",
			},
		},
	},
	render: LayerWithArgs,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"hideBackdrop leaves the page undimmed; the content still traps focus.",
			},
		},
	},
	render: () => <OwnLayer hideBackdrop label="No backdrop" />,
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: { description: { story: "Full-frame, with a nested modal." } },
	},
	render: () => <FullFrame />,
};
