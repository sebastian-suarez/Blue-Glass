import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Drawer/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Caption,
	Row,
	Stack,
	Stage,
	Tiles,
} from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon, type IconName } from "../Icon/index.js";
import { media, useMediaQuery } from "../useMediaQuery/index.js";
import { Drawer, type DrawerProps } from "./Drawer.js";

const meta = {
	title: "Navigation/Drawer",
	component: Drawer,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Drawer>;

export default meta;

type Story = StoryObj<Partial<DrawerProps>>;

const inPlace = {
	disablePortal: true,
	disableScrollLock: true,
	disableAutoFocus: true,
	disableEnforceFocus: true,
} as const;

const muted: React.CSSProperties = { margin: 0, color: "var(--color-muted)" };

const sections: ReadonlyArray<{ label: string; icon: IconName }> = [
	{ label: "Work", icon: "layers" },
	{ label: "Projects", icon: "folder" },
	{ label: "Experience", icon: "clock" },
	{ label: "Contact", icon: "mail" },
];

function SiteLinks({ onPick }: { readonly onPick?: () => void }) {
	const [current, setCurrent] = React.useState("Work");
	return (
		<nav aria-label="Main navigation" style={{ display: "grid", gap: 16 }}>
			<ul className="gl-listbox" style={{ margin: "0 -12px" }}>
				{sections.map(({ label, icon }) => (
					<li key={label}>
						<a
							className="gl-option"
							href={`#${label.toLowerCase()}`}
							aria-current={label === current ? "page" : undefined}
							data-selected={label === current ? "" : undefined}
							onClick={(event) => {
								event.preventDefault();
								setCurrent(label);
								onPick?.();
							}}
						>
							<span className="gl-option-icon">
								<Icon name={icon} size={16} />
							</span>
							<span className="gl-option-text">{label}</span>
						</a>
					</li>
				))}
			</ul>
			<div
				style={{
					borderTop: "1px solid var(--color-line)",
					paddingTop: 12,
					display: "grid",
					gap: 2,
					justifyItems: "start",
				}}
			>
				<Button
					variant="text"
					href="#resume"
					endIcon={<Icon name="arrow-ne" />}
				>
					Read résumé
				</Button>
				<span className="text-micro" style={{ color: "var(--color-muted)" }}>
					Medellín, Colombia
				</span>
			</div>
		</nav>
	);
}

type SiteMenuProps = Omit<Partial<DrawerProps>, "children"> & {
	readonly onOpen: () => void;
};

function SiteMenu({ open = false, onOpen, ...drawer }: SiteMenuProps) {
	return (
		<Stage height={440}>
			<div
				style={{
					padding: "16px 18px",
					display: "flex",
					alignItems: "center",
					justifyContent: "flex-end",
					gap: 12,
				}}
			>
				<span className="text-caption" style={{ color: "var(--color-muted)" }}>
					sebastiansuarez.dev
				</span>
				<Button
					size="sm"
					startIcon={<Icon name="menu" />}
					aria-haspopup="dialog"
					aria-expanded={open}
					onClick={onOpen}
				>
					Menu
				</Button>
			</div>
			<Drawer title="Sebastian Suarez" {...inPlace} {...drawer} open={open}>
				<p className="text-caption" style={{ ...muted, marginBottom: 14 }}>
					Backend lead and architect
				</p>
				<SiteLinks />
			</Drawer>
		</Stage>
	);
}

function SiteMenuWithArgs(
	args: Partial<DrawerProps>,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<Partial<DrawerProps>>();
	return (
		<LiveArg
			value={args.open !== false}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(isOpen, setIsOpen) => (
				<SiteMenu
					{...args}
					open={isOpen}
					onOpen={() => {
						setIsOpen(true);
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

const repository = "https://github.com/sebastian-suarez/VSebCode";

function ProjectDetails() {
	const [isOpen, setIsOpen] = React.useState(true);
	return (
		<Stage height={320}>
			<div style={{ padding: 16 }}>
				<Button
					size="sm"
					onClick={() => {
						setIsOpen(true);
					}}
				>
					Details
				</Button>
			</div>
			<Drawer
				anchor="right"
				inset={false}
				width={272}
				open={isOpen}
				title="VSebCode"
				{...inPlace}
				onClose={() => {
					setIsOpen(false);
				}}
			>
				<div style={{ display: "grid", gap: 12 }}>
					<p className="text-small" style={muted}>
						My fork of microsoft/vscode on VSCodium&apos;s patch set.
					</p>
					<dl
						className="text-caption"
						style={{
							margin: 0,
							display: "grid",
							gridTemplateColumns: "auto 1fr",
							gap: "6px 12px",
						}}
					>
						<dt style={{ color: "var(--color-muted)" }}>Stack</dt>
						<dd style={{ margin: 0 }}>TypeScript, Electron</dd>
						<dt style={{ color: "var(--color-muted)" }}>Review</dt>
						<dd style={{ margin: 0 }}>
							Codex reviews every Claude Code change
						</dd>
					</dl>
					<div>
						<Button
							variant="text"
							href={repository}
							target="_blank"
							rel="noreferrer"
							endIcon={<Icon name="arrow-ne" />}
						>
							Repository
						</Button>
					</div>
				</div>
			</Drawer>
		</Stage>
	);
}

function ShareSheet() {
	const [isOpen, setIsOpen] = React.useState(true);
	const [isCopied, setIsCopied] = React.useState(false);
	return (
		<Stage height={320}>
			<div style={{ padding: 16 }}>
				<Button
					size="sm"
					startIcon={<Icon name="share" />}
					onClick={() => {
						setIsOpen(true);
						setIsCopied(false);
					}}
				>
					Share
				</Button>
			</div>
			<Drawer
				anchor="bottom"
				open={isOpen}
				title="Share this project"
				{...inPlace}
				onClose={() => {
					setIsOpen(false);
				}}
			>
				<div style={{ display: "grid", gap: 12 }}>
					<code
						className="text-micro"
						style={{
							padding: "6px 10px",
							borderRadius: "var(--radius-control)",
							background: "var(--glass-control)",
							border: "1px solid var(--color-line)",
							overflowWrap: "anywhere",
						}}
					>
						https://sebastiansuarez.dev/#projects
					</code>
					<Row gap={8}>
						<Button
							size="sm"
							variant="primary"
							startIcon={<Icon name={isCopied ? "check" : "copy"} />}
							onClick={() => {
								setIsCopied(true);
							}}
						>
							{isCopied ? "Copied" : "Copy link"}
						</Button>
						<Button
							size="sm"
							startIcon={<Icon name="mail" />}
							href="mailto:?subject=VSebCode"
						>
							Email
						</Button>
					</Row>
				</div>
			</Drawer>
		</Stage>
	);
}

const chapters = [
	"The request path",
	"The pipeline",
	"The review gate",
	"Infrastructure as code",
];

function Contents() {
	const isPhone = useMediaQuery(media.phone);
	const [isOpen, setIsOpen] = React.useState(!isPhone);
	return (
		<Stage height={300}>
			<div
				style={{
					position: "absolute",
					inset: 0,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<div style={{ padding: "12px 14px 0", display: "flex" }}>
					<Button
						size="sm"
						startIcon={
							<Icon name={isOpen ? "chevrons-left" : "chevrons-right"} />
						}
						aria-controls="hiw-contents"
						aria-expanded={isOpen}
						onClick={() => {
							setIsOpen((wasOpen) => !wasOpen);
						}}
					>
						{isOpen ? "Hide contents" : "Show contents"}
					</Button>
				</div>
				<div style={{ flex: 1, minHeight: 0, display: "flex" }}>
					<Drawer
						id="hiw-contents"
						variant="persistent"
						open={isOpen}
						title="Contents"
						width={isPhone ? 200 : 230}
						role="navigation"
						onClose={() => {
							setIsOpen(false);
						}}
					>
						<ol
							className="text-small"
							style={{
								margin: 0,
								paddingLeft: 18,
								display: "grid",
								gap: 6,
								color: "var(--ink-soft)",
							}}
						>
							{chapters.map((chapter) => (
								<li key={chapter}>{chapter}</li>
							))}
						</ol>
					</Drawer>
					<div
						style={{
							flex: 1,
							minWidth: 0,
							padding: "14px 22px",
							display: "grid",
							alignContent: "start",
							gap: 8,
						}}
					>
						<span className="text-subtitle">How this site works</span>
						<p className="text-small" style={muted}>
							A merged pull request publishes to a private S3 bucket, and
							CloudFront serves it to you through Cloudflare.
						</p>
					</div>
				</div>
			</div>
		</Stage>
	);
}

const resume = ["Summary", "Experience", "Education", "Skills"];

function ResumeSections() {
	const isPhone = useMediaQuery(media.phone);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: isPhone ? "column" : "row",
				minHeight: 230,
				border: "1px solid var(--color-line)",
				borderRadius: "var(--radius-pane)",
			}}
		>
			<Drawer
				variant="permanent"
				anchor={isPhone ? "top" : "left"}
				width={190}
				title="Résumé"
				role="navigation"
			>
				<ul className="gl-listbox" style={{ margin: "0 -12px" }}>
					{resume.map((section, index) => (
						<li key={section}>
							<a
								className="gl-option"
								href={`#${section.toLowerCase()}`}
								data-selected={index === 0 ? "" : undefined}
								aria-current={index === 0 ? "true" : undefined}
								onClick={(event) => {
									event.preventDefault();
								}}
							>
								<span className="gl-option-text">{section}</span>
							</a>
						</li>
					))}
				</ul>
			</Drawer>
			<div
				style={{
					flex: 1,
					minWidth: 0,
					padding: "22px 24px",
					display: "grid",
					alignContent: "start",
					gap: 8,
				}}
			>
				<span className="text-subtitle">Summary</span>
				<p className="text-small" style={muted}>
					Backend lead and architect for product teams: Node.js, TypeScript and
					AWS backends, with Rust daemons and sim-racing hardware as proof.
				</p>
			</div>
		</div>
	);
}

function FullFrameMenu() {
	const [isOpen, setIsOpen] = React.useState(false);
	const close = () => {
		setIsOpen(false);
	};

	return (
		<Row>
			<Button
				variant="primary"
				startIcon={<Icon name="menu" />}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
				onClick={() => {
					setIsOpen(true);
				}}
			>
				Open the menu
			</Button>
			<Caption>
				Over the whole frame on the scrim. Tab stays inside; Escape, the scrim
				or Close returns focus here.
			</Caption>
			<Drawer open={isOpen} title="Sebastian Suarez" onClose={close}>
				<p className="text-caption" style={{ ...muted, marginBottom: 14 }}>
					Backend lead and architect
				</p>
				<SiteLinks onPick={close} />
			</Drawer>
		</Row>
	);
}

export const Default: Story = {
	name: "Default",
	args: {
		open: true,
		anchor: "left",
		inset: true,
		title: "Sebastian Suarez",
		hideBackdrop: false,
		disablePortal: true,
		onClose: fn<() => void>(),
	},
	argTypes: { title: { control: "text" } },
	parameters: {
		controls: {
			disable: false,
			include: [
				"open",
				"anchor",
				"inset",
				"title",
				"hideBackdrop",
				"disablePortal",
			],
		},
		docs: {
			description: {
				story:
					"Temporary, from the left: a glass panel 12px in from the edges over the scrim, with the header slot's title and close button.",
			},
		},
	},
	render: SiteMenuWithArgs,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Flush to its edge with only the inner corners rounded; a bottom sheet with a grab handle (drag it down to close); persistent beside the content it pushes; permanent and static.",
			},
		},
	},
	render: () => (
		<>
			<Tiles min={300}>
				<Stack gap={8}>
					<Caption>right · flush</Caption>
					<ProjectDetails />
				</Stack>
				<Stack gap={8}>
					<Caption>bottom · sheet with grab handle</Caption>
					<ShareSheet />
				</Stack>
			</Tiles>
			<Stack gap={8}>
				<Caption>persistent · pushes the content beside it</Caption>
				<Contents />
			</Stack>
			<Stack gap={8}>
				<Caption>permanent</Caption>
				<ResumeSections />
			</Stack>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story: "The site's menu as a drawer, over the whole frame.",
			},
		},
	},
	render: () => <FullFrameMenu />,
};
