import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import readme from "../../../design-system/components/Table/README.md?raw";
import { componentDocs } from "../../../stories/blocks/component-docs.js";
import { Caption, Stack } from "../../../stories/blocks/preview-kit.js";
import { Icon } from "../Icon/index.js";
import { Typography } from "../Typography/index.js";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TableSortLabel,
} from "./Table.js";

const meta = {
	title: "Data display/Table",
	component: Table,
	subcomponents: {
		TableContainer,
		TableHead,
		TableBody,
		TableRow,
		TableCell,
		TableSortLabel,
	},
	parameters: { docs: { page: componentDocs(readme) } },
} satisfies Meta<typeof Table>;

export default meta;

type Story = StoryObj<typeof meta>;

type Role = {
	employer: string;
	title: string;
	dates: string;
	location: string;
};

const roles: Role[] = [
	{
		employer: "EPAM",
		title: "Frontend Software Engineer",
		dates: "Mar 2026 – Present",
		location: "Remote",
	},
	{
		employer: "Intive",
		title: "Senior Software Engineer",
		dates: "Started Jul 2025",
		location: "Remote",
	},
	{
		employer: "EPAM",
		title: "Lead Software Engineer",
		dates: "Dec 2024 – Apr 2025",
		location: "Remote",
	},
	{
		employer: "Globant",
		title: "Senior Software Engineer",
		dates: "Jun 2023 – Dec 2024",
		location: "Medellín, Colombia",
	},
	{
		employer: "Limber Health",
		title: "Full Stack Software Engineer",
		dates: "Aug 2022 – Jun 2023",
		location: "Remote",
	},
	{
		employer: "SunDevs",
		title: "Lead Software Engineer",
		dates: "May 2021 – Nov 2022",
		location: "Remote",
	},
	{
		employer: "PayPal",
		title: "Full Stack Software Engineer",
		dates: "Dec 2021 – Jul 2022",
		location: "Remote",
	},
	{
		employer: "Gorilla Logic",
		title: "Full Stack Software Engineer",
		dates: "Dec 2020 – Dec 2021",
		location: "Medellín, Colombia",
	},
	{
		employer: "Pefpi",
		title: "Full Stack Software Engineer",
		dates: "Apr 2020 – Aug 2020",
		location: "Medellín, Colombia",
	},
	{
		employer: "ActiveONE",
		title: "Software Engineer",
		dates: "Oct 2017 – Apr 2019",
		location: "Medellín, Colombia",
	},
];

const overlapNote = "Some dates overlap because I also held a side job.";

const months = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

/**
The first "Mon YYYY" in a role's dates, as a month count, so roles sort by start date.
*/
function monthOf(dates: string): number {
	const { month = "", year = "" } =
		/(?<month>[A-Z][a-z]{2}) (?<year>\d{4})/u.exec(dates)?.groups ?? {};
	if (month === "") {
		return 0;
	}

	const yearMonths = Number(year) * 12;
	return yearMonths + months.indexOf(month);
}

const muted = { color: "var(--color-muted)" };

/**
The outcomes table: employers as row headers, figures right-aligned.
*/
function Outcomes() {
	return (
		<TableContainer aria-label="Outcomes">
			<Table>
				<TableHead>
					<TableRow>
						<TableCell>Employer</TableCell>
						<TableCell>What changed</TableCell>
						<TableCell numeric>Result</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					<TableRow>
						<TableCell component="th">Limber Health</TableCell>
						<TableCell>PDF generation for a training specification</TableCell>
						{/* An en dash and a word joiner, so the range never breaks. */}
						<TableCell numeric>10–⁠20 ms</TableCell>
					</TableRow>
					<TableRow>
						<TableCell component="th">Intive</TableCell>
						<TableCell>Response payload size</TableCell>
						<TableCell numeric>−10%</TableCell>
					</TableRow>
					<TableRow>
						<TableCell component="th">Globant</TableCell>
						<TableCell>Content creation to live publication</TableCell>
						<TableCell numeric>−5%</TableCell>
					</TableRow>
					<TableRow>
						<TableCell component="th">SunDevs</TableCell>
						<TableCell>Gym clients on the new app</TableCell>
						<TableCell numeric>1,000</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
	);
}

type Column = keyof Role;

/**
My experience from the CV, sortable by any column: the newest first, and ties newest first.
*/
function Experience() {
	const [orderBy, setOrderBy] = React.useState<Column>("dates");
	const [direction, setDirection] = React.useState<"asc" | "desc">("desc");
	const rows = React.useMemo(() => {
		const valueOf = (role: Role) =>
			orderBy === "dates" ? monthOf(role.dates) : role[orderBy];
		const sorted = roles.toSorted((first, second) => {
			const a = valueOf(first);
			const b = valueOf(second);
			const order =
				typeof a === "number" && typeof b === "number"
					? a - b
					: String(a).localeCompare(String(b));
			return order === 0 ? monthOf(second.dates) - monthOf(first.dates) : order;
		});
		return direction === "asc" ? sorted : sorted.toReversed();
	}, [orderBy, direction]);
	const sortBy = (column: Column) => {
		if (column === orderBy) {
			setDirection((current) => (current === "asc" ? "desc" : "asc"));
		} else {
			setOrderBy(column);
			setDirection(column === "dates" ? "desc" : "asc");
		}
	};

	const header = (column: Column, label: string) => (
		<TableCell sortDirection={orderBy === column ? direction : false}>
			<TableSortLabel
				active={orderBy === column}
				direction={orderBy === column ? direction : "asc"}
				onClick={() => {
					sortBy(column);
				}}
			>
				{label}
			</TableSortLabel>
		</TableCell>
	);

	return (
		<TableContainer aria-label="Experience">
			<Table
				caption={`Experience, from my CV (October 2026). ${overlapNote}`}
				style={{ minWidth: 660 }}
			>
				<TableHead>
					<TableRow>
						{header("employer", "Employer")}
						{header("title", "Role")}
						{header("dates", "Dates")}
						{header("location", "Location")}
					</TableRow>
				</TableHead>
				<TableBody>
					{rows.map((role) => (
						<TableRow key={role.employer + role.dates} hover>
							<TableCell component="th">{role.employer}</TableCell>
							<TableCell>{role.title}</TableCell>
							<TableCell style={{ ...muted, whiteSpace: "nowrap" }}>
								{role.dates}
							</TableCell>
							<TableCell style={muted}>{role.location}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
	);
}

export const Default: Story = {
	name: "Default",
	parameters: {
		docs: {
			description: {
				story:
					"On the career surface (.career-surface): 12px muted headers, hairlines between rows, figures right-aligned in tabular numerals.",
			},
		},
	},
	render: () => <Outcomes />,
};

export const Variants: Story = {
	name: "Variants",
	parameters: {
		docs: {
			description: {
				story:
					"sm is the dense size. stickyHeader keeps the header over a capped, scrolling body. A selected row is the raised tab (glass-raised).",
			},
		},
	},
	render: () => (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
				gap: 20,
				alignItems: "start",
			}}
		>
			<Stack gap={8}>
				<TableContainer maxHeight={252} aria-label="All roles">
					<Table stickyHeader size="sm">
						<TableHead>
							<TableRow>
								<TableCell>Employer</TableCell>
								<TableCell>Dates</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{roles.map((role) => (
								<TableRow key={role.employer + role.dates}>
									<TableCell component="th">{role.employer}</TableCell>
									<TableCell style={{ ...muted, whiteSpace: "nowrap" }}>
										{role.dates}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
				<Caption>size sm · stickyHeader · maxHeight 252 (scroll it)</Caption>
			</Stack>
			<Stack gap={8}>
				<TableContainer>
					<Table
						size="sm"
						caption="Client work, newest first"
						captionSide="top"
					>
						<TableHead>
							<TableRow>
								<TableCell>Client</TableCell>
								<TableCell sortDirection="desc">
									<TableSortLabel active direction="desc">
										Started
									</TableSortLabel>
								</TableCell>
								<TableCell numeric>Tools</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							<TableRow hover selected={false}>
								<TableCell component="th">Intive</TableCell>
								<TableCell style={muted}>Jul 2025</TableCell>
								<TableCell numeric>5</TableCell>
							</TableRow>
							<TableRow hover selected>
								<TableCell component="th">
									<span
										style={{
											display: "inline-flex",
											alignItems: "center",
											gap: 6,
										}}
									>
										<Icon name="check" size={14} />
										Limber Health
									</span>
								</TableCell>
								<TableCell style={muted}>Aug 2022</TableCell>
								<TableCell numeric>5</TableCell>
							</TableRow>
							<TableRow hover selected={false}>
								<TableCell component="th">SunDevs</TableCell>
								<TableCell style={muted}>May 2021</TableCell>
								<TableCell numeric>7</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</TableContainer>
				<Caption>hover · selected · sorted column · caption on top</Caption>
			</Stack>
		</div>
	),
};

export const Example: Story = {
	name: "Example",
	parameters: {
		docs: {
			description: {
				story:
					"My experience from the CV. Sort by any column; aria-sort follows on the header cell.",
			},
		},
	},
	render: () => (
		<>
			<Experience />
			<Typography variant="micro" color="muted">
				The table keeps a 660px minimum, so on a phone it scrolls sideways
				inside the surface instead of crushing the columns.
			</Typography>
		</>
	),
};
