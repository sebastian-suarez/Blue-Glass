import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../design-system/sections/Hero/README.md?raw";
import { Button } from "../../src/components/Button/index.ts";
import {
	Diagram,
	type DiagramData,
} from "../../src/components/Diagram/index.ts";
import { Icon } from "../../src/components/Icon/index.ts";
import { Paper } from "../../src/components/Paper/index.ts";
import { media } from "../../src/components/useMediaQuery/index.ts";
import { componentDocs } from "../blocks/component-docs.tsx";
import { profile, SectionPage, wrap } from "../blocks/section-kit.tsx";

const meta = {
	title: "Sections/Hero",
	parameters: { frame: false, docs: { page: componentDocs(readme) } },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// The preview picks these with useMediaQuery(media.tablet) and useMediaQuery(media.phone). Here
// CSS picks them under the same queries, so the server HTML lays out as the hydrated page does.
const styles = `
.hero {
	grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
	gap: 56px;
	padding: 40px 0 64px;
}
.hero-figure {
	padding: 28px;
}
@media ${media.tablet} {
	.hero {
		grid-template-columns: minmax(0, 1fr);
		gap: 40px;
	}
}
@media ${media.phone} {
	.hero {
		padding: 24px 0 48px;
	}
	.hero-lede {
		font-size: 17px;
	}
	.hero-figure {
		padding: 18px;
	}
}
`;

// The site's own deploy flow, the preview's dataset.
const siteFlow: DiagramData = {
	id: "site-flow",
	width: 600,
	height: 440,
	label:
		"How this site works: a merged pull request publishes to S3, and CloudFront serves it to you through Cloudflare",
	description:
		"A pull request that passed its checks merges into main, and GitHub Actions builds the site and syncs it to a private S3 bucket. CloudFront reads that bucket with signed requests, and Cloudflare proxies the pages to your browser.",
	regions: [
		{ x: 0, y: 32, w: 600, h: 168, radius: 16, tone: "panel" },
		{ x: 0, y: 264, w: 600, h: 168, radius: 16, tone: "panel" },
	],
	nodes: [
		{
			x: 20,
			y: 96,
			w: 150,
			h: 72,
			lines: [{ text: "Pull request", bold: true }, "checks must pass"],
		},
		{
			x: 225,
			y: 96,
			w: 150,
			h: 72,
			lines: [{ text: "GitHub Actions", bold: true }, "OIDC, no keys"],
		},
		{
			x: 430,
			y: 96,
			w: 150,
			h: 72,
			lines: [{ text: "S3 bucket", bold: true }, "private"],
		},
		{
			x: 430,
			y: 328,
			w: 150,
			h: 72,
			lines: [{ text: "CloudFront", bold: true }, "cache, HTTPS"],
		},
		{
			x: 225,
			y: 328,
			w: 150,
			h: 72,
			lines: [{ text: "Cloudflare", bold: true }, "DNS, proxy, TLS"],
		},
		{
			x: 20,
			y: 328,
			w: 150,
			h: 72,
			lines: [{ text: "Your browser", bold: true }, "this page"],
			tone: "accent",
		},
	],
	edges: [
		{
			points: [
				[170, 132],
				[220, 132],
			],
		},
		{
			points: [
				[375, 132],
				[425, 132],
			],
		},
		{
			points: [
				[505, 168],
				[505, 323],
			],
		},
		{
			points: [
				[430, 364],
				[380, 364],
			],
		},
		{
			points: [
				[225, 364],
				[175, 364],
			],
			tone: "accent",
		},
	],
	labels: [
		{ x: 16, y: 44, lines: ["Publish: merge to main"] },
		{ x: 16, y: 276, lines: ["Serve: every visit"] },
		{ x: 170, y: 104, w: 55, align: "middle", lines: ["merge"] },
		{ x: 375, y: 104, w: 55, align: "middle", lines: ["sync"] },
		{ x: 517, y: 224, lines: ["signed reads"] },
		{ x: 375, y: 336, w: 55, align: "middle", lines: ["HTTPS"] },
		{
			x: 170,
			y: 336,
			w: 55,
			align: "middle",
			tone: "accent",
			lines: ["proxied"],
		},
	],
};

export const Default: Story = {
	render: () => (
		<SectionPage
			field="top"
			note="Hero: Typography tokens (text-display, text-lede), Button (primary, glass, text), Paper + Diagram with the site's own dataset."
		>
			<style>{styles}</style>
			<section
				className="hero"
				aria-labelledby="hero-title"
				style={{ ...wrap, display: "grid", alignItems: "center" }}
			>
				<div>
					<h1
						id="hero-title"
						className="text-display"
						style={{
							margin: 0,
							fontSize: "clamp(44px, 5.6vw, 80px)",
							maxWidth: "11ch",
						}}
					>
						Backend lead. Builds the whole machine.
					</h1>
					<p
						className="text-lede hero-lede"
						style={{
							margin: "26px 0 0",
							color: "var(--color-muted)",
							maxWidth: "42ch",
						}}
					>
						Node.js, TypeScript and AWS backends for product teams. The same
						discipline goes into my Rust daemons and sim-racing hardware.
					</p>
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: 12,
							marginTop: 34,
						}}
					>
						<Button variant="primary" href={`mailto:${profile.email}`}>
							Email me
						</Button>
						<Button href="#work">See the work</Button>
					</div>
				</div>
				<Paper component="figure" className="hero-figure" style={{ margin: 0 }}>
					<Diagram data={siteFlow} minScale={0.58} />
					<figcaption
						className="text-micro"
						style={{ marginTop: 14, color: "var(--color-muted)" }}
					>
						How this site works: a merged pull request publishes to a private S3
						bucket, and CloudFront serves it to you through Cloudflare.
						<span style={{ display: "block", marginTop: 4 }}>
							<Button
								variant="text"
								href="#how-it-works"
								endIcon={<Icon name="arrow-ne" />}
							>
								See every service
							</Button>
						</span>
					</figcaption>
				</Paper>
			</section>
		</SectionPage>
	),
};
