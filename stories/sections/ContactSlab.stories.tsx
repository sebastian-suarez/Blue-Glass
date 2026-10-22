import type { Meta, StoryObj } from "@storybook/react-vite";
import readme from "../../design-system/sections/ContactSlab/README.md?raw";
import { Icon } from "../../src/components/Icon/index.ts";
import { Link } from "../../src/components/Link/index.ts";
import { Paper } from "../../src/components/Paper/index.ts";
import { media } from "../../src/components/useMediaQuery/index.ts";
import { componentDocs } from "../blocks/component-docs.tsx";
import { profile, SectionPage, wrap } from "../blocks/section-kit.tsx";

const meta = {
	title: "Sections/ContactSlab",
	parameters: { frame: false, docs: { page: componentDocs(readme) } },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// The preview picks these with useMediaQuery(media.tablet) and useMediaQuery(media.phone),
// including the email's icon size (20, or 17 on phones). Here CSS picks them under the same
// queries, so the server HTML lays out as the hydrated page does.
const styles = `
.contact-slab {
	grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
	gap: 48px;
	align-items: end;
	padding: 64px 6%;
}
.contact-slab-email {
	gap: 16px;
	font-size: clamp(18px, 2.3vw, 28px);
}
@media ${media.tablet} {
	.contact-slab {
		grid-template-columns: minmax(0, 1fr);
		gap: 32px;
		align-items: start;
	}
}
@media ${media.phone} {
	.contact-slab {
		padding: 40px 7%;
	}
	.contact-slab-email {
		gap: 12px;
		font-size: clamp(15px, 4.6vw, 22px);
	}
	.contact-slab-email .gl-icon {
		width: 17px;
		height: 17px;
	}
}
`;

export const Default: Story = {
	render: () => (
		<SectionPage
			field="bottom"
			note="Contact and footer: Paper (the contact slab), Typography tokens (text-title-lg), Link (underline on hover, with the arrow)."
		>
			<style>{styles}</style>
			<section
				id="contact"
				aria-labelledby="contact-heading"
				style={{ ...wrap, paddingTop: 48 }}
			>
				<Paper className="contact-slab" style={{ display: "grid" }}>
					<div>
						<h2
							id="contact-heading"
							className="text-title-lg"
							style={{
								margin: 0,
								fontSize: "clamp(34px, 4.4vw, 60px)",
								maxWidth: "14ch",
							}}
						>
							Open to backend lead and architect roles.
						</h2>
						<p
							className="text-body-lg"
							style={{
								margin: "20px 0 0",
								color: "var(--color-muted)",
								maxWidth: "46ch",
								letterSpacing: 0,
							}}
						>
							Product teams first. Remote from Medellín, Colombia, with full
							US-hours overlap. Senior IC scope works too.
						</p>
					</div>
					<div>
						<a
							className="contact-slab-email"
							href={`mailto:${profile.email}`}
							style={{
								display: "flex",
								alignItems: "center",
								padding: "5px 0",
								letterSpacing: "-0.035em",
								overflowWrap: "anywhere",
								color: "var(--color-ink)",
								textDecoration: "none",
							}}
						>
							{profile.email} <Icon name="arrow-ne" size={20} />
						</a>
						<div
							style={{
								display: "flex",
								flexWrap: "wrap",
								gap: "8px 26px",
								marginTop: 22,
							}}
						>
							<Link
								underline="hover"
								color="ink"
								href="#github"
								endIcon={<Icon name="arrow-ne" size={14} />}
							>
								GitHub
							</Link>
							<Link
								underline="hover"
								color="ink"
								href="#linkedin"
								endIcon={<Icon name="arrow-ne" size={14} />}
							>
								LinkedIn
							</Link>
							<Link
								underline="hover"
								color="ink"
								href="#resume"
								endIcon={<Icon name="arrow-ne" size={14} />}
							>
								Résumé
							</Link>
						</div>
					</div>
				</Paper>
			</section>
			<footer
				className="text-micro"
				style={{
					...wrap,
					display: "flex",
					flexWrap: "wrap",
					alignItems: "center",
					justifyContent: "space-between",
					gap: "12px 20px",
					marginTop: 64,
					padding: "25px 3px 0",
					borderTop: "1px solid var(--color-line)",
					color: "var(--color-muted)",
				}}
			>
				<span>© {profile.fullName}</span>
				<span>{profile.location}</span>
				<Link underline="hover" color="muted" href="#top">
					Back to top <span aria-hidden="true">↑</span>
				</Link>
			</footer>
		</SectionPage>
	),
};

// Default at the phone size the layout gate checks: its axe test runs at 390px too, and the
// tag keeps the copy off the docs page.
export const DefaultOnPhone: Story = {
	...Default,
	name: "Default on a phone",
	tags: ["!autodocs"],
	globals: { viewport: { value: "phone", isRotated: false } },
};
