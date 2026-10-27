import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../../design-system/components/Avatar/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import {
	Caption,
	Labelled,
	Row,
	Stack,
} from "../../../stories/blocks/preview-kit.js";
import { Divider } from "../Divider/index.js";
import { Paper } from "../Paper/index.js";
import { Tooltip } from "../Tooltip/index.js";
import { Typography } from "../Typography/index.js";
import { Avatar, AvatarGroup } from "./Avatar.js";

const meta = {
	title: "Data display/Avatar",
	component: Avatar,
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

function portrait(ground: string, upper: string, lower: string, tilt = -28) {
	return `data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="${ground}"/><ellipse cx="60" cy="24" rx="34" ry="20" fill="none" stroke="${upper}" stroke-width="12" transform="rotate(${tilt} 60 24)"/><ellipse cx="10" cy="70" rx="36" ry="22" fill="none" stroke="${lower}" stroke-width="12" transform="rotate(26 10 70)"/><circle cx="40" cy="33" r="13" fill="#f4f8fc"/><path d="M15 80c3-17 13-25 25-25s22 8 25 25z" fill="#f4f8fc"/></svg>`,
	)}`;
}

const photo = portrait("#cfdef4", "#8eb8e8", "#bedff1");
const secondPhoto = portrait("#bedff1", "#cfdef4", "#8eb8e8", 20);
const thirdPhoto = portrait("#e8f1fa", "#bedff1", "#8eb8e8", -60);
const brokenPhoto = "data:image/png;base64,AAAA";
const employers = [
	"PayPal",
	"Nike, via Globant",
	"EPAM",
	"Gorilla Logic",
	"Intive",
	"SunDevs",
	"Limber Health",
];

function Identity() {
	return (
		<Paper style={{ padding: 24, display: "grid", gap: 20, maxWidth: 560 }}>
			<Row gap={13} wrap={false}>
				<Avatar variant="tile" aria-hidden="true">
					ss
				</Avatar>
				<span style={{ display: "grid" }}>
					<Typography
						variant="name"
						component="strong"
						style={{ lineHeight: 1.3 }}
					>
						Sebastian Suarez
					</Typography>
					<Typography variant="micro" color="muted">
						Backend lead and architect
					</Typography>
				</span>
			</Row>
			<Divider />
			<Row gap={16} style={{ justifyContent: "space-between" }}>
				<Typography variant="caption" color="muted">
					Shipped for
				</Typography>
				<AvatarGroup max={5} aria-label="Employers">
					{employers.map((name) => (
						<Tooltip key={name} title={name} describeChild={false}>
							<Avatar alt={name} />
						</Tooltip>
					))}
				</AvatarGroup>
			</Row>
		</Paper>
	);
}

export const Default: Story = {
	name: "Default",
	args: { alt: "Sebastian Suarez", variant: "circle", size: "md" },
	parameters: {
		controls: { disable: false, include: ["alt", "variant", "size"] },
		docs: {
			description: {
				story:
					"A circle: ink initials on one of the site's orbs, taken from alt and read as the name.",
			},
		},
	},
	render: (args) => (
		<Row gap={16}>
			<Avatar {...args} />
			<Caption>{`alt="${args.alt}"`}</Caption>
		</Row>
	),
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"md is the header's 40px monogram tile; every size scales from it.",
			},
		},
	},
	render: () => (
		<>
			<Row gap={22} align="flex-end">
				<Labelled label="xs 24">
					<Avatar size="xs" alt="Sebastian Suarez" />
				</Labelled>
				<Labelled label="sm 32">
					<Avatar size="sm" alt="Sebastian Suarez" />
				</Labelled>
				<Labelled label="md 40">
					<Avatar alt="Sebastian Suarez" />
				</Labelled>
				<Labelled label="lg 56" minHeight={60}>
					<Avatar size="lg" alt="Sebastian Suarez" />
				</Labelled>
				<Labelled label="tile xs">
					<Avatar variant="tile" size="xs" alt="Sebastian Suarez">
						ss
					</Avatar>
				</Labelled>
				<Labelled label="tile sm">
					<Avatar variant="tile" size="sm" alt="Sebastian Suarez">
						ss
					</Avatar>
				</Labelled>
				<Labelled label="tile md (.signature)">
					<Avatar variant="tile" alt="Sebastian Suarez">
						ss
					</Avatar>
				</Labelled>
				<Labelled label="tile lg" minHeight={60}>
					<Avatar variant="tile" size="lg" alt="Sebastian Suarez">
						ss
					</Avatar>
				</Labelled>
			</Row>
			<Row gap={22} align="flex-start">
				<Labelled label="orb 0 · .tab-orb">
					<Avatar orb={0} alt="Limber Health" />
				</Labelled>
				<Labelled label="orb 1 · .orb-1">
					<Avatar orb={1} alt="Intive" />
				</Labelled>
				<Labelled label="orb 2 · .orb-2">
					<Avatar orb={2} alt="SunDevs" />
				</Labelled>
				<Labelled label="photo">
					<Avatar src={photo} alt="Sebastian Suarez" />
				</Labelled>
				<Labelled label="photo · tile">
					<Avatar variant="tile" src={photo} alt="Sebastian Suarez" />
				</Labelled>
				<Labelled label="image fails → initials">
					<Avatar src={brokenPhoto} alt="Gorilla Logic" />
				</Labelled>
				<Labelled label="no name → glyph">
					<Avatar />
				</Labelled>
			</Row>
			<Row gap={28} align="flex-start">
				<Labelled label="group · max 5 of 7">
					<AvatarGroup max={5} aria-label="Employers">
						{employers.map((name) => (
							<Avatar key={name} alt={name} />
						))}
					</AvatarGroup>
				</Labelled>
				<Labelled label="photos · sm · spacing sm · total 1,000">
					<AvatarGroup
						size="sm"
						spacing="sm"
						total={1000}
						aria-label="Gym clients on the SunDevs app"
					>
						<Avatar src={photo} alt="Client one" />
						<Avatar src={secondPhoto} alt="Client two" />
						<Avatar src={thirdPhoto} alt="Client three" />
					</AvatarGroup>
				</Labelled>
				<Labelled label="tiles">
					<AvatarGroup variant="tile" max={4} aria-label="Projects">
						<Avatar alt="RS50 force-feedback bridge">RS</Avatar>
						<Avatar alt="VSebCode">VS</Avatar>
						<Avatar alt="Clean Architecture template">CA</Avatar>
						<Avatar alt="This portfolio">ss</Avatar>
					</AvatarGroup>
				</Labelled>
			</Row>
		</>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"The header identity and an employer strip; hover an avatar for its name.",
			},
		},
	},
	render: () => (
		<Stack gap={12}>
			<Identity />
		</Stack>
	),
};
