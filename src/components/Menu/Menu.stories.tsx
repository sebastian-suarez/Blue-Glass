import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { useArgs } from "storybook/preview-api";
import { fn } from "storybook/test";
import readme from "../../../design-system/components/Menu/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { LiveArg } from "../../../stories/blocks/live-arg.js";
import {
	Caption,
	Stack,
	Stage,
	Tiles,
} from "../../../stories/blocks/preview-kit.js";
import { Button } from "../Button/index.js";
import { Icon } from "../Icon/index.js";
import { Paper } from "../Paper/index.js";
import { Menu, MenuItem, MenuList, type MenuProps } from "./Menu.js";

const meta = {
	title: "Navigation/Menu",
	component: Menu,
	parameters: {
		docs: { page: componentDocs(readme) },
		// Base UI keeps focus guards around an open menu: spans, aria-hidden and tabbable on purpose,
		// that hand focus on the moment they get it. axe's aria-hidden-focus rule allows that only to
		// an element with an onfocus property, which React's delegated onFocus never sets, so it
		// reports them. The rule still checks every other aria-hidden element.
		a11y: {
			config: {
				rules: [
					{
						id: "aria-hidden-focus",
						selector: '[aria-hidden="true"]:not([data-base-ui-focus-guard])',
					},
				],
			},
		},
	},
} satisfies Meta<typeof Menu>;

export default meta;

// Every story anchors its own menu, so none takes the required open or anchorEl.
type Story = StoryObj<Partial<MenuProps>>;

const repository = "https://github.com/sebastian-suarez/VSebCode";

/**
A project's actions, as both of the preview's menus hold them. onPick reports what a choice did.
*/
function ProjectActions({
	onPick,
}: {
	readonly onPick?: (message: string) => void;
}) {
	return (
		<>
			<MenuItem
				icon={<Icon name="code" />}
				href={repository}
				target="_blank"
				rel="noreferrer"
				end={<Icon name="arrow-ne" />}
			>
				Open repository
			</MenuItem>
			<MenuItem
				icon={<Icon name="link" />}
				end="⌘C"
				aria-keyshortcuts="Meta+C"
				onClick={() => onPick?.("Link copied.")}
			>
				Copy link
			</MenuItem>
			<MenuItem
				divider
				icon={<Icon name="share" />}
				onClick={() => onPick?.("Opened the share sheet.")}
			>
				Share
			</MenuItem>
			<MenuItem
				icon={<Icon name="trash" />}
				tone="danger"
				onClick={() => onPick?.("Deleted. Undo for 10 seconds.")}
			>
				Delete
			</MenuItem>
		</>
	);
}

/**
The Default section's stage: the button that toggles the menu, and the menu open in place under
it, leaving focus and the page's scroll alone.
*/
function StagedMenu({
	open = false,
	onToggle,
	...menu
}: Partial<MenuProps> & { readonly onToggle: () => void }) {
	const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
	return (
		<Stage height={290}>
			<div style={{ padding: 20 }}>
				<Button
					ref={setAnchor}
					id="staged-actions"
					size="sm"
					startIcon={<Icon name="more" />}
					aria-haspopup="menu"
					aria-expanded={open}
					aria-controls={open ? "staged-menu" : undefined}
					onClick={onToggle}
				>
					Project actions
				</Button>
			</div>
			<Menu
				disablePortal
				disableScrollLock
				disableAutoFocus
				disableEnforceFocus
				{...menu}
				id="staged-menu"
				open={open && anchor !== null}
				anchorEl={anchor}
			>
				<ProjectActions />
			</Menu>
		</Stage>
	);
}

/**
Default's stage: the args drive the menu, the button toggles open, and a choice, a press
outside, Escape or Tab sets it back to false.
*/
function StagedMenuWithArgs(
	args: Partial<MenuProps>,
	{ viewMode }: { readonly viewMode: string },
) {
	const [, updateArgs] = useArgs<Partial<MenuProps>>();
	return (
		<LiveArg
			value={args.open !== false}
			fixed={viewMode === "docs"}
			onChange={(open) => {
				updateArgs({ open });
			}}
		>
			{(isOpen, setIsOpen) => (
				<StagedMenu
					{...args}
					open={isOpen}
					onToggle={() => {
						setIsOpen(!isOpen);
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

const projects = [
	{ name: "VSebCode", stack: "TypeScript · Electron" },
	{ name: "RS50 force-feedback bridge", stack: "Rust · hidapi · Wine" },
	{ name: "Clean Architecture template", stack: "TypeScript · DDD · MCP" },
];

/**
A standalone list that keeps the current project, as a project switcher.
*/
function ProjectSwitcher() {
	const [current, setCurrent] = React.useState("VSebCode");
	return (
		<Paper radius="well" style={{ padding: 7 }}>
			<MenuList aria-label="Switch project">
				{projects.map((project) => (
					<MenuItem
						key={project.name}
						selected={project.name === current}
						secondary={project.stack}
						onClick={() => {
							setCurrent(project.name);
						}}
					>
						{project.name}
					</MenuItem>
				))}
			</MenuList>
		</Paper>
	);
}

function PullRequestActions() {
	return (
		<Paper radius="well" style={{ padding: 7 }}>
			<MenuList aria-label="Pull request">
				<MenuItem icon={<Icon name="eye" />}>Preview build</MenuItem>
				<MenuItem
					disabled
					divider
					icon={<Icon name="upload" />}
					secondary="Waiting for Codex review"
				>
					Merge and publish
				</MenuItem>
				<MenuItem icon={<Icon name="close" />} tone="danger">
					Close pull request
				</MenuItem>
			</MenuList>
		</Paper>
	);
}

function ExportActions() {
	return (
		<Paper radius="well" style={{ padding: 7 }}>
			<MenuList dense aria-label="Export résumé">
				<MenuItem
					icon={<Icon name="download" />}
					end="⌘P"
					aria-keyshortcuts="Meta+P"
				>
					Download PDF
				</MenuItem>
				<MenuItem icon={<Icon name="file" />}>Download Markdown</MenuItem>
				<MenuItem
					icon={<Icon name="copy" />}
					end="⇧⌘C"
					aria-keyshortcuts="Shift+Meta+C"
				>
					Copy as plain text
				</MenuItem>
				<MenuItem
					icon={<Icon name="mail" />}
					href="mailto:contact@sebastiansuarez.dev"
				>
					Email it to me
				</MenuItem>
			</MenuList>
		</Paper>
	);
}

const tagStyle: React.CSSProperties = {
	fontSize: 12,
	lineHeight: 1.5,
	padding: "5px 11px",
	borderRadius: "var(--radius-pill)",
	background: "var(--glass-control)",
	border: "1px solid rgba(88, 108, 143, 0.16)",
	color: "var(--ink-soft)",
};

/**
The Example: a project card whose Actions button opens the menu through the portal; a choice
reports in the status line.
*/
function ProjectCard() {
	const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
	const [isOpen, setIsOpen] = React.useState(false);
	const [status, setStatus] = React.useState("");
	return (
		<Paper style={{ padding: 28, display: "grid", gap: 16, maxWidth: 580 }}>
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
					gap: 16,
				}}
			>
				<div style={{ display: "grid", gap: 8, minWidth: 0 }}>
					<span className="text-title-sm">VSebCode</span>
					<span
						className="text-body-sm"
						style={{ color: "var(--color-muted)" }}
					>
						My fork of microsoft/vscode on VSCodium's patch set. Claude Code
						implements, Codex reviews, nothing merges unreviewed.
					</span>
				</div>
				<Button
					ref={setAnchor}
					id="vsebcode-actions"
					size="sm"
					endIcon={<Icon name="chevron-down" />}
					aria-haspopup="menu"
					aria-expanded={isOpen}
					aria-controls={isOpen ? "vsebcode-menu" : undefined}
					onClick={() => {
						setIsOpen(true);
					}}
				>
					Actions
				</Button>
			</div>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 12,
				}}
			>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
					{["TypeScript", "Electron", "Claude Code", "Codex"].map((tag) => (
						<span key={tag} style={tagStyle}>
							{tag}
						</span>
					))}
				</div>
				<span
					role="status"
					className="text-micro"
					style={{ color: "var(--color-muted)" }}
				>
					{status}
				</span>
			</div>
			<Menu
				id="vsebcode-menu"
				open={isOpen}
				anchorEl={anchor}
				placement="bottom-end"
				onClose={() => {
					setIsOpen(false);
				}}
			>
				<ProjectActions onPick={setStatus} />
			</Menu>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: { open: true, onClose: fn<() => void>() },
	parameters: {
		controls: { disable: false, include: ["open"] },
		docs: {
			description: {
				story:
					"A project actions menu, open. Focus lands on the first item; a choice, an outside press, Escape or Tab closes it.",
			},
		},
	},
	render: StagedMenuWithArgs,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Always-visible MenuLists on a glass well: a selected choice with a second line, a disabled item with a separator and a danger row, and dense rows with shortcuts.",
			},
		},
	},
	render: () => (
		<Tiles min={210}>
			<Stack gap={8} style={{ alignContent: "start" }}>
				<Caption>selected · secondary</Caption>
				<ProjectSwitcher />
			</Stack>
			<Stack gap={8} style={{ alignContent: "start" }}>
				<Caption>disabled · divider · danger</Caption>
				<PullRequestActions />
			</Stack>
			<Stack gap={8} style={{ alignContent: "start" }}>
				<Caption>dense · shortcuts · link</Caption>
				<ExportActions />
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
					"Open it with the button, then use the arrows, Home and End, or type a letter. Copy link reports in a status line.",
			},
		},
	},
	render: () => <ProjectCard />,
};
