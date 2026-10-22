import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Dialog/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Caption,
	Row,
	Stack,
	Stage,
} from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { TextareaAutosize } from "../TextareaAutosize/index.js";
import { media } from "../useMediaQuery/index.js";
import {
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	type DialogProps,
	DialogTitle,
} from "./Dialog.js";

const meta = {
	title: "Feedback/Dialog",
	component: Dialog,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Dialog>;

export default meta;

// Only Default renders through its args, and every story brings its own content, so none takes
// the required open.
type Story = StoryObj<Partial<DialogProps>>;

// The preview's stages grow on phones, where the surface takes the card's phone padding and its
// actions stack: it picks their heights with useMediaQuery(media.phone). Here CSS picks them under
// the same query, so the server HTML lays out as the hydrated page does. On phones the notes'
// default text also wraps to three rows, while TextareaAutosize's server HTML is minRows rows tall
// and the browser measures the rest, so CSS holds the field at three rows there (past the field
// style's inline min-height): otherwise the centred surface grows, and every text moves, as the
// page hydrates.
const styles = `
.dialog-stage-confirm {
	height: 320px;
}
.dialog-stage-form {
	height: 470px;
}
@media ${media.phone} {
	.dialog-stage-confirm {
		height: 420px;
	}
	.dialog-stage-form {
		height: 600px;
	}
	.dialog-notes {
		min-height: calc(3lh + 22px) !important;
	}
}
`;

// As in the preview: each dialog open in place over its stage, leaving focus and the page's
// scroll alone.
const inPlace = {
	disablePortal: true,
	disableScrollLock: true,
	disableAutoFocus: true,
	disableEnforceFocus: true,
} as const;

// The form's fields: glass-control wells with the labels above them.
const field: React.CSSProperties = {
	width: "100%",
	minHeight: 46,
	padding: "10px 14px",
	borderRadius: "var(--radius-control)",
	border: "1px solid var(--dg-edge)",
	background: "var(--glass-control)",
	color: "var(--color-ink)",
	font: "inherit",
	fontSize: 15,
	lineHeight: 1.6,
};

const label: React.CSSProperties = {
	fontSize: 13,
	fontWeight: 600,
	lineHeight: 1.6,
	color: "var(--color-ink)",
};

const notes = [
	"Client work tabs crossfade instead of jumping between panels.",
	"Diagrams draw in on scroll; with reduced motion they arrive finished.",
	"The résumé PDF rebuilds on every merge to main.",
	"The light field rings are lighter on phones.",
	"HTML is cached for 60 seconds at the edge, hashed assets for a year.",
	"The 404 page has its own diagram of where the request went.",
];

/**
The button in a stage's corner that opens its dialog again.
*/
function Trigger({
	onClick,
	children,
}: {
	readonly onClick: () => void;
	readonly children: React.ReactNode;
}) {
	return (
		<div style={{ padding: 20 }}>
			<Button size="sm" onClick={onClick}>
				{children}
			</Button>
		</div>
	);
}

type ConfirmProps = Omit<Partial<DialogProps>, "children"> & {
	readonly onOpen: () => void;
	readonly onDismiss: () => void;
};

/**
The Default's stage: the destructive confirm, whose buttons both dismiss it, as Escape and a
press outside do through onClose.
*/
function Confirm({ open = false, onOpen, onDismiss, ...dialog }: ConfirmProps) {
	return (
		<div className="dialog-stage-confirm">
			<Stage height="100%">
				<Trigger onClick={onOpen}>Delete draft…</Trigger>
				<Dialog
					maxWidth="xs"
					role="alertdialog"
					{...inPlace}
					{...dialog}
					open={open}
				>
					<DialogTitle>Delete the RS50 bridge draft?</DialogTitle>
					<DialogContent>
						<DialogContentText>
							The write-up and its two capture files go. The repository on
							GitHub stays as it is.
						</DialogContentText>
					</DialogContent>
					<DialogActions>
						<Button data-autofocus onClick={onDismiss}>
							Keep draft
						</Button>
						<Button variant="primary" tone="danger" onClick={onDismiss}>
							Delete draft
						</Button>
					</DialogActions>
				</Dialog>
			</Stage>
		</div>
	);
}

/**
Default's stage: the args drive the dialog, Escape, a press outside and both buttons set open
back to false, and the trigger sets it to true.
*/
function ConfirmWithArgs(
	args: Partial<DialogProps>,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<Partial<DialogProps>>();
	return (
		<>
			<style>{styles}</style>
			<LiveArg
				value={args.open !== false}
				fixed={viewMode === "docs"}
				onChange={(open) => {
					updateArgs({ open });
				}}
			>
				{(isOpen, setIsOpen) => (
					<Confirm
						{...args}
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
		</>
	);
}

/**
Opened by its trigger, dismissed by Escape, a press outside or its own buttons, as each of the
preview's stages is.
*/
function useOpen(): {
	readonly isOpen: boolean;
	readonly open: () => void;
	readonly close: () => void;
} {
	const [isOpen, setIsOpen] = React.useState(true);
	return {
		isOpen,
		open() {
			setIsOpen(true);
		},
		close() {
			setIsOpen(false);
		},
	};
}

/**
scroll="paper": the release notes scroll between the title and Done.
*/
function ReleaseNotes() {
	const { isOpen, open, close } = useOpen();
	return (
		<Stage height={340}>
			<Trigger onClick={open}>Release notes</Trigger>
			<Dialog open={isOpen} onClose={close} {...inPlace}>
				<DialogTitle>What changed in v2.4</DialogTitle>
				<DialogContent>
					<ul
						style={{
							margin: 0,
							paddingLeft: 18,
							display: "grid",
							gap: 10,
							color: "var(--ink-soft)",
							fontSize: 14,
							lineHeight: 1.6,
						}}
					>
						{notes.map((note) => (
							<li key={note}>{note}</li>
						))}
					</ul>
				</DialogContent>
				<DialogActions>
					<Button size="sm" variant="primary" onClick={close}>
						Done
					</Button>
				</DialogActions>
			</Dialog>
		</Stage>
	);
}

/**
fullScreen: the calibration fills its stage with square corners.
*/
function Calibrate() {
	const { isOpen, open, close } = useOpen();
	return (
		<Stage height={340}>
			<Trigger onClick={open}>Calibrate</Trigger>
			<Dialog fullScreen open={isOpen} onClose={close} {...inPlace}>
				<DialogTitle>Calibrate the wheel</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Turn the RS50 from lock to lock once. The bridge reads the range and
						writes it to rs50d.toml.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button size="sm" onClick={close}>
						Cancel
					</Button>
					<Button size="sm" variant="primary" onClick={close}>
						Done
					</Button>
				</DialogActions>
			</Dialog>
		</Stage>
	);
}

type PublishProps = Omit<Partial<DialogProps>, "children" | "onClose"> & {
	readonly onClose: () => void;
};

/**
The short form, fullWidth: labels above glass-control fields, Enter submits, Publish last.
*/
function Publish({ open = false, onClose, ...dialog }: PublishProps) {
	const id = React.useId().replaceAll(/[^\w-]/gu, "");
	return (
		<Dialog fullWidth open={open} onClose={onClose} {...dialog}>
			<DialogTitle>Publish to production</DialogTitle>
			<DialogContent>
				<form
					id={`${id}-form`}
					style={{ display: "grid", gap: 16 }}
					onSubmit={(event) => {
						event.preventDefault();
						onClose();
					}}
				>
					<DialogContentText>
						The build goes to the private S3 bucket; CloudFront serves it through
						Cloudflare.
					</DialogContentText>
					<div style={{ display: "grid", gap: 6 }}>
						<label htmlFor={`${id}-name`} style={label}>
							Release name
						</label>
						<input
							data-autofocus
							id={`${id}-name`}
							defaultValue="v2.4 · client work tabs"
							style={field}
						/>
					</div>
					<div style={{ display: "grid", gap: 6 }}>
						<label htmlFor={`${id}-notes`} style={label}>
							Notes
						</label>
						<TextareaAutosize
							id={`${id}-notes`}
							className="dialog-notes"
							minRows={2}
							maxRows={5}
							defaultValue="Tabs crossfade instead of jumping. Diagrams draw in on scroll."
							style={field}
						/>
					</div>
				</form>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="primary" type="submit" form={`${id}-form`}>
					Publish
				</Button>
			</DialogActions>
		</Dialog>
	);
}

/**
The form open in place over its stage.
*/
function PublishInPlace() {
	const { isOpen, open, close } = useOpen();
	return (
		<div className="dialog-stage-form">
			<Stage height="100%">
				<Trigger onClick={open}>Publish…</Trigger>
				<Publish open={isOpen} onClose={close} {...inPlace} />
			</Stage>
		</div>
	);
}

/**
The same form over the whole frame, through the portal, and full screen on phones.
*/
function PublishFullPage() {
	const [isOpen, setIsOpen] = React.useState(false);
	return (
		<Row>
			<Button
				variant="primary"
				onClick={() => {
					setIsOpen(true);
				}}
			>
				Open full page
			</Button>
			<Caption>
				Over the whole frame: focus moves to Release name, Tab stays inside,
				Escape closes, focus returns here.
			</Caption>
			<Publish
				fullScreen="phone"
				open={isOpen}
				onClose={() => {
					setIsOpen(false);
				}}
			/>
		</Row>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		open: true,
		maxWidth: "xs",
		fullWidth: false,
		fullScreen: false,
		scroll: "paper",
		hideBackdrop: false,
		disablePortal: true,
		onClose: fn<() => void>(),
	},
	argTypes: {
		maxWidth: { control: "inline-radio", options: ["xs", "sm", "md", false] },
		fullScreen: { control: "inline-radio", options: [false, true, "phone"] },
	},
	parameters: {
		controls: {
			disable: false,
			include: [
				"open",
				"maxWidth",
				"fullWidth",
				"fullScreen",
				"scroll",
				"hideBackdrop",
				"disablePortal",
			],
		},
		docs: {
			description: {
				story:
					"role alertdialog for a destructive confirm: the title asks, the text says what goes and what stays, the danger primary sits last.",
			},
		},
	},
	render: ConfirmWithArgs,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					'scroll="paper" keeps the title and actions fixed and fades the edge with more behind it. fullScreen squares the corners; "phone" does it only at 700px and below.',
			},
		},
	},
	render: () => (
		<Row gap={16} align="stretch">
			<Stack gap={8} style={{ flex: "1 1 340px" }}>
				<ReleaseNotes />
				<Caption>scroll paper · maxWidth sm</Caption>
			</Stack>
			<Stack gap={8} style={{ flex: "0 1 300px" }}>
				<Calibrate />
				<Caption>fullScreen</Caption>
			</Stack>
		</Row>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"A short form, fullWidth: labels above glass-control fields, Enter submits, Publish last.",
			},
		},
	},
	render: () => (
		<>
			<style>{styles}</style>
			<PublishInPlace />
			<PublishFullPage />
		</>
	),
};

// The Example at the phone size the layout gate checks, where its stage grows and the full-page
// form fills the screen: its axe test runs at 390px too, and the tag keeps it off the docs page.
export const ExampleOnPhone: Story = {
	...Example,
	name: "Example on a phone",
	tags: ["!autodocs"],
	globals: { viewport: { value: "phone", isRotated: false } },
};
