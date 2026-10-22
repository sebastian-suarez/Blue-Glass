import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/Typography/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Row, Stack } from "../../../stories/blocks/preview-kit.js";
import { Avatar } from "../Avatar/index.js";
import { Divider } from "../Divider/index.js";
import { Paper } from "../Paper/index.js";
import {
	Typography,
	type TypographyColor,
	type TypographyVariant,
} from "./Typography.js";

const meta = {
	title: "Data display/Typography",
	component: Typography,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Typography>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
A row of the type scale: the variant, its metrics, a sample, and the sample's own font size
where the token is too wide for a phone.
*/
type ScaleRow = readonly [TypographyVariant, string, string, string?];

const scale: ReadonlyArray<{
	name: string;
	stacked?: boolean;
	rows: readonly ScaleRow[];
}> = [
	{
		name: "Display",
		stacked: true,
		rows: [
			[
				"display",
				"80px / 1.02 · 400 · −0.05em",
				"Backend lead.",
				"min(80px, 18vw)",
			],
			["title-xl", "72px / 1.04 · 400 · −0.05em", "How this site works"],
			[
				"title-lg",
				"60px / 1.04 · 400 · −0.05em",
				"Open to backend lead and architect roles.",
				"min(60px, 15vw)",
			],
			[
				"title-md",
				"50px / 1.09 · 400 · −0.05em",
				"Training PDFs. A shorter wait.",
			],
			[
				"statement",
				"42px / 1.3 · 400 · −0.03em",
				"I draw the boundaries first.",
			],
		],
	},
	{
		name: "Headings",
		rows: [
			["heading", "32px / 1.15 · 500 · −0.035em", "What I bring to a team"],
			[
				"card-title",
				"30px / 1.15 · 400 · −0.04em",
				"RS50 force-feedback bridge",
			],
			["title-sm", "22px / 1.1 · 500 · −0.03em", "Data & cloud"],
			["subtitle", "19px / 1.15 · 500 · −0.02em", "Review and CI"],
		],
	},
	{
		name: "Body",
		rows: [
			[
				"lede",
				"19px / 1.6",
				"Node.js, TypeScript and AWS backends for product teams.",
			],
			["lede-sm", "18px / 1.6", "Owned two microservices for the mobile apps."],
			[
				"body-lg",
				"17px / 1.5 · −0.02em",
				"Reduced response payload size by 10%.",
			],
			[
				"body",
				"16px / 1.6",
				"I work on backend services and web and mobile apps.",
			],
			[
				"body-sm",
				"15px / 1.6",
				"Four of my own projects, where the architecture is the point.",
			],
			[
				"small",
				"14px / 1.65",
				"Reworked PDF generation for training specifications.",
			],
			["caption", "13px / 1.6", "Shipped for PayPal, EPAM and Intive"],
			["micro", "12px / 1.5", "Aug 2022 – Jun 2023 · Medellín, Colombia"],
			[
				"nano",
				"11px / 1.7",
				"React / React Native / Node.js / PostgreSQL / AWS",
			],
		],
	},
	{
		name: "Labels, code and diagrams",
		rows: [
			["button", "14px / 1.6 · 500", "See the work"],
			["kicker", "13px / 1.6 · 600 · 0.04em", "Under the hood"],
			["label", "13px / 1.6 · 600", "Education"],
			["name", "17px / 1.6 · 600 · −0.02em", "Sebastian Suarez"],
			["code", "mono · 0.9em", "astro check"],
			["diagram-node", "15px / 20px", "CloudFront"],
			["diagram-label", "13px / 16px", "viewer request"],
		],
	},
];

const colors: readonly TypographyColor[] = [
	"ink",
	"muted",
	"ink-soft",
	"accent",
	"link",
	"blue-deep",
	"danger",
	"warning",
	"success",
	"info",
];

/**
A token's class name over its metrics.
*/
function Metrics({
	variant,
	metrics,
}: {
	readonly variant: TypographyVariant;
	readonly metrics: string;
}) {
	return (
		<div style={{ display: "grid", gap: 1, alignContent: "start" }}>
			<Typography variant="micro" color="ink" style={{ fontWeight: 500 }}>
				text-{variant}
			</Typography>
			<Typography variant="nano" color="muted">
				{metrics}
			</Typography>
		</div>
	);
}

/**
The preview's type scale: every token, grouped, each with its metrics and a sample.
*/
function TypeScale() {
	return (
		<Paper style={{ padding: "8px 28px" }}>
			{scale.map((group, groupIndex) => (
				<div key={group.name}>
					{groupIndex > 0 ? <Divider /> : null}
					<Typography
						variant="label"
						color="muted"
						component="h3"
						style={{ padding: "16px 0 2px" }}
					>
						{group.name}
					</Typography>
					{group.rows.map(([variant, metrics, sample, fontSize], rowIndex) => (
						<div key={variant}>
							{rowIndex > 0 ? <Divider /> : null}
							{group.stacked ? (
								<div
									style={{ display: "grid", gap: 6, padding: "12px 0 14px" }}
								>
									<Metrics variant={variant} metrics={metrics} />
									<Typography
										variant={variant}
										component="p"
										style={
											fontSize === undefined || fontSize === ""
												? undefined
												: { fontSize }
										}
									>
										{sample}
									</Typography>
								</div>
							) : (
								<div
									style={{
										display: "flex",
										flexWrap: "wrap",
										alignItems: "baseline",
										gap: "6px 20px",
										padding: "10px 0",
									}}
								>
									<div style={{ flex: "0 0 170px" }}>
										<Metrics variant={variant} metrics={metrics} />
									</div>
									<div style={{ flex: "1 1 260px", minWidth: 0 }}>
										<Typography
											variant={variant}
											component={variant === "code" ? "code" : "p"}
										>
											{sample}
										</Typography>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			))}
		</Paper>
	);
}

/**
The preview's client-work panel, set only with Typography.
*/
function ClientWorkPanel() {
	return (
		<Paper
			component="article"
			aria-labelledby="ex-title"
			style={{
				padding: "clamp(24px, 5%, 40px)",
				display: "flex",
				flexWrap: "wrap",
				gap: "28px 8%",
			}}
		>
			<div style={{ flex: "1 1 220px", minWidth: 0 }}>
				<Row gap={10} style={{ marginBottom: 24 }}>
					<Avatar size="xs" orb={0} aria-hidden="true">
						LH
					</Avatar>
					<Typography variant="caption">Limber Health</Typography>
				</Row>
				<Typography
					fluid
					variant="title-md"
					component="h3"
					id="ex-title"
					style={{ marginBottom: 20 }}
				>
					Training PDFs. A shorter wait.
				</Typography>
				<Typography variant="caption" component="p">
					Full Stack Software Engineer
				</Typography>
				<Typography variant="micro" component="p" color="muted">
					Aug 2022 – Jun 2023
				</Typography>
			</div>
			<div style={{ flex: "1 1 300px", minWidth: 0 }}>
				<Typography
					gutterBottom
					variant="lede-sm"
					style={{ letterSpacing: "-0.015em" }}
				>
					Worked on provider web and patient mobile apps for remote therapeutic
					monitoring and home exercises.
				</Typography>
				<Typography
					variant="label"
					component="h4"
					color="muted"
					style={{ margin: "18px 0 8px" }}
				>
					My contribution
				</Typography>
				<Typography gutterBottom variant="small" color="muted">
					Worked across the web and mobile apps with React, React Native,
					Node.js, PostgreSQL, and AWS.
				</Typography>
				<Typography variant="small" color="muted">
					Reworked PDF generation for training specifications.
				</Typography>
				<Divider style={{ margin: "20px 0 16px" }} />
				<Typography
					variant="nano"
					color="muted"
					component="p"
					style={{ marginBottom: 6 }}
				>
					Outcome
				</Typography>
				<Typography variant="body-lg">
					{/* A word joiner after the dash keeps the range on one line. */}
					{
						"Cut PDF generation time from about 6 seconds to 10–\u{2060}20 milliseconds."
					}
				</Typography>
				<Typography
					variant="nano"
					color="muted"
					component="p"
					style={{ marginTop: 18 }}
				>
					React / React Native / Node.js / PostgreSQL / AWS
				</Typography>
			</div>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"A variant sets the token class and the element: heading is an h2, body-sm a p.",
			},
		},
	},
	render: () => (
		<div>
			<Typography gutterBottom variant="heading">
				What I bring to a team
			</Typography>
			<Typography variant="body-sm" color="muted" style={{ maxWidth: "62ch" }}>
				Node.js and TypeScript services with Clean Architecture boundaries and
				DDD vocabulary. Java and Spring before that.
			</Typography>
		</div>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"Every type token at its desktop size. The display group is fluid on the site; pass fluid to get its clamp().",
			},
		},
	},
	render: () => (
		<>
			<TypeScale />
			<Stack gap={10}>
				<Caption>color</Caption>
				<Row gap={18}>
					{colors.map((color) => (
						<Typography
							key={color}
							variant="body-sm"
							component="span"
							color={color}
							style={{ fontWeight: 500 }}
						>
							{color}
						</Typography>
					))}
				</Row>
			</Stack>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					gap: 20,
				}}
			>
				<Stack gap={8}>
					<Caption>textWrap balance (h1–h4 default)</Caption>
					<Typography
						variant="title-sm"
						component="h3"
						style={{ maxWidth: 230 }}
					>
						From an edit to production, in two checks
					</Typography>
				</Stack>
				<Stack gap={8}>
					<Caption>textWrap wrap</Caption>
					<Typography
						variant="title-sm"
						component="h3"
						textWrap="wrap"
						style={{ maxWidth: 230 }}
					>
						From an edit to production, in two checks
					</Typography>
				</Stack>
				<Stack gap={8}>
					<Caption>noWrap</Caption>
					<Typography noWrap variant="small" style={{ maxWidth: 230 }}>
						Static Astro pages in a private S3 bucket behind CloudFront and
						Cloudflare.
					</Typography>
				</Stack>
			</div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
					gap: 20,
				}}
			>
				<Stack gap={6}>
					<Caption>align left</Caption>
					<Typography variant="small" align="left">
						Medellín, Colombia
					</Typography>
				</Stack>
				<Stack gap={6}>
					<Caption>align center</Caption>
					<Typography variant="small" align="center">
						Medellín, Colombia
					</Typography>
				</Stack>
				<Stack gap={6}>
					<Caption>align right</Caption>
					<Typography variant="small" align="right">
						Medellín, Colombia
					</Typography>
				</Stack>
			</div>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"The client-work panel, set only with Typography: title-md (fluid), lede-sm, label, small, body-lg and nano.",
			},
		},
	},
	render: () => <ClientWorkPanel />,
};
