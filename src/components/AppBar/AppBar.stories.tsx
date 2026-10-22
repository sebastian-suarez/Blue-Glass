import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import readme from "../../../design-system/components/AppBar/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack, Stage } from "../../../stories/blocks/preview-kit.js";
import { Icon } from "../Icon/index.js";
import { LightField } from "../LightField/index.js";
import { Paper } from "../Paper/index.js";
import { AppBar, Toolbar } from "./AppBar.js";

const meta = {
	title: "Surfaces/AppBar",
	component: AppBar,
	subcomponents: { Toolbar },
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof AppBar>;

export default meta;

type Story = StoryObj<typeof meta>;

const links = [
	{ label: "Work", href: "#work" },
	{ label: "Projects", href: "#projects" },
	{ label: "Experience", href: "#experience" },
	{ label: "Contact", href: "#contact" },
];

/**
The site's identity strip, composed from the documented parts: the brand, the nav pill and the
action. Compact drops the subtitle and the action, for a dense bar.
*/
function IdentityStrip({
	current,
	isCompact = false,
}: {
	readonly current?: string;
	readonly isCompact?: boolean;
}) {
	return (
		<>
			<a className="gl-app-bar-brand" href="#top">
				<span className="gl-app-bar-monogram" aria-hidden="true">
					ss
				</span>
				<span className="gl-app-bar-text">
					<strong className="gl-app-bar-title">Sebastian Suarez</strong>
					{isCompact ? null : (
						<span className="gl-app-bar-subtitle">
							Backend lead and architect
						</span>
					)}
				</span>
			</a>
			<nav className="gl-app-bar-nav" aria-label="Main navigation">
				{links.map((link) => (
					<a
						key={link.href}
						className="gl-app-bar-link"
						href={link.href}
						aria-current={link.label === current ? "page" : undefined}
					>
						{link.label}
					</a>
				))}
			</nav>
			{isCompact ? null : (
				<a className="gl-app-bar-action" href="#resume">
					Read résumé <Icon name="arrow-ne" />
				</a>
			)}
		</>
	);
}

const project = { padding: 22, display: "grid", gap: 8 } as const;

/**
The page under the bar: an intro and three project panels, enough to scroll.
*/
function PageBody() {
	return (
		<div style={{ display: "grid", gap: 16, padding: "20px 5% 28px" }}>
			<h3
				className="text-title-sm"
				style={{ margin: "8px 0 0", maxWidth: "24ch" }}
			>
				Backend lead. Builds the whole machine.
			</h3>
			<p
				className="text-small"
				style={{ margin: 0, color: "var(--color-muted)", maxWidth: "52ch" }}
			>
				Node.js, TypeScript and AWS backends for product teams. The same
				discipline goes into my Rust daemons and sim-racing hardware.
			</p>
			<Paper style={project}>
				<span className="text-subtitle">Training PDFs. A shorter wait.</span>
				<span className="text-small" style={{ color: "var(--color-muted)" }}>
					Limber Health: PDF generation went from about 6 seconds to 10–20
					milliseconds.
				</span>
			</Paper>
			<Paper style={project}>
				<span className="text-subtitle">CMS fetch and transform services</span>
				<span className="text-small" style={{ color: "var(--color-muted)" }}>
					Intive: two microservices for the mobile apps; response payloads 10%
					smaller.
				</span>
			</Paper>
			<Paper style={project}>
				<span className="text-subtitle">A fitness app on Stripe</span>
				<span className="text-small" style={{ color: "var(--color-muted)" }}>
					SunDevs: launched for 1,000 existing gym clients; webhooks decide app
					access.
				</span>
			</Paper>
		</div>
	);
}

/**
A scrolling page on the canvas with its own light field, optionally scrolled on mount. Full
bleed runs it across the frame, edge to edge.
*/
function ScrollingPage({
	height,
	initialScroll = 0,
	isFullBleed = false,
	children,
}: {
	readonly height: number;
	readonly initialScroll?: number;
	readonly isFullBleed?: boolean;
	readonly children?: React.ReactNode;
}) {
	const pageRef = React.useRef<HTMLDivElement>(null);
	React.useEffect(() => {
		if (initialScroll !== 0 && pageRef.current) {
			pageRef.current.scrollTop = initialScroll;
		}
	}, [initialScroll]);
	return (
		<div
			ref={pageRef}
			// The keyboard scrolls the page, so it's a named stop of its own.
			// eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
			tabIndex={0}
			role="region"
			aria-label="Scrolling page"
			style={{
				position: "relative",
				height,
				overflowY: "auto",
				overflowX: "hidden",
				background: "var(--color-canvas)",
				...(isFullBleed
					? {
							margin: "0 -28px",
							borderTop: "1px solid var(--color-line)",
							borderBottom: "1px solid var(--color-line)",
						}
					: {
							borderRadius: "var(--radius-pane)",
							border: "1px solid var(--color-line)",
						}),
			}}
		>
			<div
				style={{ position: "relative", isolation: "isolate", overflow: "clip" }}
			>
				<LightField variant="compact" />
				{children}
			</div>
		</div>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"Static: the site's header, transparent over the light field, here across the card's full width as the site spans the window.",
			},
		},
	},
	render: () => (
		<div style={{ margin: "0 -28px" }}>
			<AppBar>
				<Toolbar>
					<IdentityStrip />
				</Toolbar>
			</AppBar>
		</div>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Sticky and fixed bars sit on glass (blur-control) at z-app-bar. elevateOnScroll adds the shadow once the page moves.",
			},
		},
		// The preview shows three bars, each with a "Main navigation" nav, and two scrolling
		// pages, each a region named "Scrolling page", so axe's landmark-unique rule finds
		// repeated landmarks. The reference's preview fails the same rule; this story stays
		// faithful to it.
		a11y: { config: { rules: [{ id: "landmark-unique", enabled: false }] } },
	},
	render: () => (
		<>
			<Stack gap={8}>
				<ScrollingPage height={210}>
					<AppBar elevateOnScroll position="sticky">
						<Toolbar variant="dense">
							<IdentityStrip isCompact current="Work" />
						</Toolbar>
					</AppBar>
					<PageBody />
				</ScrollingPage>
				<Caption>
					sticky · elevateOnScroll, at rest · dense toolbar · current link
					(aria-current=&quot;page&quot;)
				</Caption>
			</Stack>
			<Stack gap={8}>
				<ScrollingPage height={210} initialScroll={150}>
					<AppBar elevateOnScroll position="sticky">
						<Toolbar variant="dense">
							<IdentityStrip isCompact current="Work" />
						</Toolbar>
					</AppBar>
					<PageBody />
				</ScrollingPage>
				<Caption>
					sticky · elevateOnScroll, scrolled: the bar lifts (shadow-pane)
				</Caption>
			</Stack>
			<Stack gap={8}>
				<Stage height={200}>
					<AppBar position="fixed">
						<Toolbar variant="dense">
							<IdentityStrip isCompact />
						</Toolbar>
					</AppBar>
					<p
						className="text-small"
						style={{
							position: "absolute",
							left: "5%",
							right: "5%",
							bottom: 14,
							margin: 0,
							color: "var(--color-muted)",
						}}
					>
						Fixed to the frame here; in a page it is fixed to the viewport, so
						leave room under it.
					</p>
				</Stage>
				<Caption>fixed · always lifted (shadow-control)</Caption>
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
					"A long page with a sticky bar: scroll it, then tab through the links.",
			},
		},
	},
	render: () => (
		<ScrollingPage isFullBleed height={340}>
			<AppBar elevateOnScroll position="sticky">
				<Toolbar variant="dense">
					<IdentityStrip current="Projects" />
				</Toolbar>
			</AppBar>
			<PageBody />
			<PageBody />
		</ScrollingPage>
	),
};
