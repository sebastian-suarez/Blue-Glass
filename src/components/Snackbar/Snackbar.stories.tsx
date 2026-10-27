import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Snackbar/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Caption,
	Row,
	Stack,
	Stage,
} from "../../../stories/blocks/preview-kit.js";
import { Alert } from "../Alert/index.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { CircularProgress } from "../Progress/index.js";
import {
	Snackbar,
	type SnackbarCloseReason,
	type SnackbarProps,
} from "./Snackbar.js";

const meta = {
	title: "Feedback/Snackbar",
	component: Snackbar,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Snackbar>;

export default meta;

type Story = StoryObj<Partial<SnackbarProps>>;

const published = "Published to S3. CloudFront picks it up in about a minute.";

function closeUnlessClickaway(close: () => void) {
	return (_event: unknown, reason: SnackbarCloseReason) => {
		if (reason !== "clickaway") {
			close();
		}
	};
}

function ShowAgain({
	onClick,
	isAtBottom = false,
}: {
	readonly onClick: () => void;
	readonly isAtBottom?: boolean;
}) {
	return (
		<div
			style={
				isAtBottom
					? { position: "absolute", left: 0, bottom: 0, padding: 20 }
					: { padding: 20 }
			}
		>
			<Button size="sm" onClick={onClick}>
				Show again
			</Button>
		</div>
	);
}

function Busy({ children }: { readonly children: React.ReactNode }) {
	return (
		<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
			<CircularProgress size="xs" color="inherit" aria-hidden="true" />
			{children}
		</span>
	);
}

function DefaultWithArgs(
	args: Partial<SnackbarProps>,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<Partial<SnackbarProps>>();
	return (
		<LiveArg
			value={args.open === true}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(isOpen, setIsOpen) => (
				<Stage height={210}>
					<ShowAgain
						onClick={() => {
							setIsOpen(true);
						}}
					/>
					<Snackbar
						{...args}
						open={isOpen}
						action={
							<Button variant="text" size="sm" href="#site">
								View site
							</Button>
						}
						onClose={(event, reason) => {
							args.onClose?.(event, reason);
							if (reason !== "clickaway") {
								setIsOpen(false);
							}
						}}
					/>
				</Stage>
			)}
		</LiveArg>
	);
}

function TopRight() {
	const [isOpen, setIsOpen] = React.useState(true);
	const close = () => {
		setIsOpen(false);
	};

	return (
		<Stage height={210}>
			<ShowAgain
				isAtBottom
				onClick={() => {
					setIsOpen(true);
				}}
			/>
			<Snackbar
				disablePortal
				open={isOpen}
				anchorOrigin={{ vertical: "top", horizontal: "right" }}
				onClose={closeUnlessClickaway(close)}
			>
				<Alert
					severity="error"
					action={
						<Button variant="text" size="sm" onClick={close}>
							Retry
						</Button>
					}
				>
					Couldn&apos;t reach the bucket. Try again.
				</Alert>
			</Snackbar>
		</Stage>
	);
}

function BottomLeft() {
	const [isOpen, setIsOpen] = React.useState(true);
	return (
		<Stage height={210}>
			<ShowAgain
				onClick={() => {
					setIsOpen(true);
				}}
			/>
			<Snackbar
				disablePortal
				open={isOpen}
				anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
				message={<Busy>Uploading build… 62%</Busy>}
				onClose={closeUnlessClickaway(() => {
					setIsOpen(false);
				})}
			/>
		</Stage>
	);
}

type PublishState = "idle" | "publishing" | "published" | "failed";

function Publish() {
	const [state, setState] = React.useState<PublishState>("idle");
	const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	React.useEffect(
		() => () => {
			clearTimeout(timerRef.current);
		},
		[],
	);
	const publish = (result: PublishState) => {
		clearTimeout(timerRef.current);
		setState("publishing");
		timerRef.current = setTimeout(() => {
			setState(result);
		}, 1600);
	};

	const handleClose = closeUnlessClickaway(() => {
		setState("idle");
	});
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 18, maxWidth: 600 }}>
			<div style={{ display: "grid", gap: 4 }}>
				<h3 className="text-title-sm" style={{ margin: 0 }}>
					Publish the portfolio
				</h3>
				<p
					className="text-caption"
					style={{ margin: 0, color: "var(--color-muted)" }}
				>
					The snackbar opens at the bottom of the frame, closes itself after 6
					seconds, and waits while you point at it or tab into it.
				</p>
			</div>
			<Row>
				<Button
					variant="primary"
					startIcon={<Icon name="upload" />}
					loading={state === "publishing"}
					onClick={() => {
						publish("published");
					}}
				>
					Publish
				</Button>
				<Button
					onClick={() => {
						publish("failed");
					}}
				>
					Publish with the bucket offline
				</Button>
			</Row>
			<Snackbar
				open={state === "publishing" || state === "published"}
				autoHideDuration={state === "published" ? 6000 : null}
				message={
					state === "publishing" ? <Busy>Publishing to S3…</Busy> : published
				}
				action={
					state === "published" ? (
						<Button variant="text" size="sm" href="#site">
							View site
						</Button>
					) : undefined
				}
				closable={state === "published"}
				onClose={handleClose}
			/>
			<Snackbar open={state === "failed"} onClose={handleClose}>
				<Alert
					severity="error"
					action={
						<Button
							variant="text"
							size="sm"
							onClick={() => {
								publish("published");
							}}
						>
							Retry
						</Button>
					}
					onClose={() => {
						setState("idle");
					}}
				>
					Couldn&apos;t reach the bucket. Try again.
				</Alert>
			</Snackbar>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		open: true,
		message: published,
		closable: true,
		closeText: "Close",
		disablePortal: true,
		onClose: fn<() => void>(),
	},
	argTypes: { message: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: ["open", "message", "closable", "closeText", "disablePortal"],
		},
		docs: {
			description: {
				story:
					"Bottom centre on color-ink with on-ink text, radius-tile and the primary button's lift. One action, an optional close; read politely.",
			},
		},
	},
	render: DefaultWithArgs,
};

export const DefaultOnPhone: Story = {
	...Default,
	name: "Default on a phone",
	tags: ["!autodocs"],
	globals: { viewport: { value: "phone", isRotated: false } },
	parameters: { ...Default.parameters, controls: { disable: true } },
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Any edge and corner; it slides in from its edge and leaves the same way. Host an Alert for a status with a word, or put a busy ring in the message.",
			},
		},
	},
	render: () => (
		<Row gap={16} align="stretch">
			<Stack gap={8} style={{ flex: "1 1 300px" }}>
				<TopRight />
				<Caption>top right · hosted Alert</Caption>
			</Stack>
			<Stack gap={8} style={{ flex: "1 1 300px" }}>
				<BottomLeft />
				<Caption>bottom left · CircularProgress inherit</Caption>
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
					"Full frame: publishing shows a busy snackbar, then the result. Success hides itself; the error stays until you retry or close it.",
			},
		},
	},
	render: () => <Publish />,
};
