/* eslint-disable unicorn/filename-case -- The folder and its modules carry the documented hook's name, useMediaQuery. */
import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/useMediaQuery/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Row } from "../../../stories/blocks/preview-kit.js";
import { Paper } from "../Paper/index.js";
import { media, useMediaQuery } from "./index.js";

// A hook, so the docs page has no props table.
const meta = {
	title: "Utils/useMediaQuery",
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

type MediaName = keyof typeof media;

// Storybook's docgen attaches __docgenInfo to exported objects, so keep only the queries.
const names = Object.keys(media).filter(
	(name): name is MediaName =>
		typeof (media as Record<string, unknown>)[name] === "string",
);

/**
One query's live answer: ink while it matches, glass while it doesn't, and in words for screen
readers.
*/
function MediaFlag({ name }: { readonly name: MediaName }) {
	const isMatching = useMediaQuery(media[name]);
	return (
		<span
			className="text-micro"
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 8,
				padding: "5px 11px",
				borderRadius: "var(--radius-pill)",
				border: "1px solid var(--color-line)",
				background: isMatching ? "var(--color-ink)" : "var(--glass-control)",
				color: isMatching ? "var(--on-ink)" : "var(--ink-soft)",
			}}
		>
			<span
				aria-hidden="true"
				style={{
					width: 6,
					height: 6,
					borderRadius: 3,
					background: isMatching ? "var(--on-ink)" : "var(--dg-edge)",
				}}
			/>
			media.{name}{" "}
			<span className="gl-sr-only">
				{isMatching ? "matches" : "does not match"}
			</span>
		</span>
	);
}

/**
The hero grid (global.css): two columns from 900px, one below.
*/
function HeroGrid() {
	const isOneColumn = useMediaQuery(media.tablet);
	return (
		<Paper
			style={{
				padding: 22,
				display: "grid",
				gridTemplateColumns: isOneColumn ? "1fr" : "0.95fr 1.05fr",
				gap: isOneColumn ? 16 : 40,
				alignItems: "center",
			}}
		>
			<span className="text-subtitle">
				{isOneColumn
					? "One column at 899px and below"
					: "Two columns from 900px"}
			</span>
			<Paper variant="inset" style={{ height: 80 }} />
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"Live booleans for the site's own breakpoints and the input and preference queries it gates on. Dark flags match this frame right now.",
			},
		},
	},
	render: () => (
		<Row gap={8}>
			{names.map((name) => (
				<MediaFlag key={name} name={name} />
			))}
		</Row>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story: "The hero grid: two columns from 900px, one below (global.css).",
			},
		},
	},
	render: () => <HeroGrid />,
};
