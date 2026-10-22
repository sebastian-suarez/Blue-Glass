import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../design-system/sections/SiteHeader/README.md?raw";
import { AppBar, Toolbar } from "../../src/components/AppBar/index.ts";
import { Chip } from "../../src/components/Chip/index.ts";
import { Icon } from "../../src/components/Icon/index.ts";
import { Stack } from "../../src/components/Stack/index.ts";
import { componentDocs } from "../blocks/component-docs.tsx";
import { profile, SectionPage, wrap } from "../blocks/section-kit.tsx";

const meta = {
	title: "Sections/SiteHeader",
	parameters: { frame: false, docs: { page: componentDocs(readme) } },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const employers = [
	"PayPal",
	"Nike, via Globant",
	"EPAM",
	"Gorilla Logic",
	"Intive",
	"SunDevs",
	"Limber Health",
];

const links = ["Work", "Projects", "Experience", "Contact"];

/**
The identity strip, from AppBar's part classes: monogram and name, the pill nav, then the
résumé action.
*/
function IdentityStrip() {
	return (
		<>
			<a className="gl-app-bar-brand" href="#top">
				<span className="gl-app-bar-monogram" aria-hidden="true">
					ss
				</span>
				<span className="gl-app-bar-text">
					<strong className="gl-app-bar-title">{profile.name}</strong>
					<span className="gl-app-bar-subtitle">{profile.role}</span>
				</span>
			</a>
			<nav className="gl-app-bar-nav" aria-label="Main navigation">
				{links.map((link) => (
					<a
						key={link}
						className="gl-app-bar-link"
						href={`#${link.toLowerCase()}`}
					>
						{link}
					</a>
				))}
			</nav>
			<a className="gl-app-bar-action" href="#resume">
				Read résumé <Icon name="arrow-ne" />
			</a>
		</>
	);
}

export const Default: Story = {
	render: () => (
		<SectionPage
			field="top"
			note="Header and employer strip: AppBar + Toolbar (identity strip), Stack + Chip (plate)."
		>
			<AppBar position="static">
				<Toolbar>
					<IdentityStrip />
				</Toolbar>
			</AppBar>
			<section
				aria-label="Employers"
				style={{
					...wrap,
					marginTop: 40,
					padding: "22px 3px",
					borderTop: "1px solid var(--color-line)",
					borderBottom: "1px solid var(--color-line)",
				}}
			>
				<Stack wrap direction="row" spacing="md" alignItems="center">
					<span
						className="text-caption"
						style={{ color: "var(--color-muted)", whiteSpace: "nowrap" }}
					>
						Shipped for
					</span>
					<ul
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: 8,
							margin: 0,
							padding: 0,
							listStyle: "none",
						}}
					>
						{employers.map((employer) => (
							<li key={employer}>
								<Chip variant="plate" label={employer} />
							</li>
						))}
					</ul>
				</Stack>
			</section>
		</SectionPage>
	),
};
