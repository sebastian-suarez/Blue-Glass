/**
The portfolio's interactive islands, as it will ship them: rendered on the server, then hydrated
later (Astro's client:visible). scripts/ssr/islands.ts renders each in Node, checks that its HTML
works before hydration, hydrates it after those checks, and checks that it then behaves as the
READMEs document. Copy follows the reference previews.
*/
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	PaneAccordion,
	Tab,
	TabPanel,
	Tabs,
} from "#ui";

/**
The client-work folio (sections/ClientWork), with the second project chosen so a server that
falls back to the first tab shows the wrong panel.
*/
function ClientWork() {
	return (
		<Tabs variant="side" aria-label="Choose a project" defaultValue="intive">
			<Tab value="limber" label="Limber Health" />
			<Tab value="intive" label="Intive" />
			<Tab value="sundevs" label="SunDevs" />
			<TabPanel value="limber">
				<p>Training PDFs. A shorter wait.</p>
			</TabPanel>
			<TabPanel value="intive">
				<p>CMS content, ready for mobile.</p>
			</TabPanel>
			<TabPanel value="sundevs">
				<p>A fitness app. Built together.</p>
			</TabPanel>
		</Tabs>
	);
}

/**
A project's underline tabs, whose last tab is disabled.
*/
function ProjectTabs() {
	return (
		<Tabs aria-label="VSebCode" defaultValue="overview">
			<Tab value="overview" label="Overview" />
			<Tab value="review" label="Review gate" />
			<Tab value="stack" label="Stack" />
			<Tab disabled value="releases" label="Releases" />
			<TabPanel value="overview">
				<p>A VS Code fork with a review gate before every agent edit.</p>
			</TabPanel>
			<TabPanel value="review">
				<p>Each change waits for an approval in the editor.</p>
			</TabPanel>
			<TabPanel value="stack">
				<p>TypeScript, Electron and the VS Code extension API.</p>
			</TabPanel>
			<TabPanel value="releases">
				<p>No public release yet.</p>
			</TabPanel>
		</Tabs>
	);
}

/**
The career list: the first row open, the second closed, the third disabled.
*/
function Career() {
	return (
		<div className="gl-accordion-surface">
			<Accordion defaultExpanded>
				<AccordionSummary
					secondary="Frontend Software Engineer"
					meta="Mar 2026 – Present"
				>
					EPAM
				</AccordionSummary>
				<AccordionDetails meta="Medellín, Colombia">
					<p>Frontend work for a client in financial services.</p>
				</AccordionDetails>
			</Accordion>
			<Accordion>
				<AccordionSummary
					secondary="Senior Software Engineer"
					meta="Started Jul 2025"
				>
					Intive
				</AccordionSummary>
				<AccordionDetails meta="Remote">
					<p>Backend and mobile work across a CMS and its apps.</p>
				</AccordionDetails>
			</Accordion>
			<Accordion disabled>
				<AccordionSummary meta="Not published yet">
					Résumé as a PDF
				</AccordionSummary>
				<AccordionDetails>
					<p>The PDF comes with the next release.</p>
				</AccordionDetails>
			</Accordion>
		</div>
	);
}

/**
The capabilities panes, with Backend open.
*/
function Capabilities() {
	return (
		<PaneAccordion
			defaultOpen={["backend"]}
			items={[
				{
					id: "backend",
					title: "Backend",
					text: "Node.js and TypeScript services with Clean Architecture boundaries.",
					chips: ["Node.js", "NestJS"],
				},
				{
					id: "frontend",
					title: "Frontend & mobile",
					text: "React and React Native apps, with feature flags.",
					chips: ["React", "React Native"],
					tone: "alt",
				},
				{
					id: "hardware",
					title: "Hardware",
					text: "Rust on embedded targets, plus CAD and carbon fiber.",
					chips: ["Rust", "Arduino"],
					tone: "accent",
				},
			]}
		/>
	);
}

export const islands = { ClientWork, ProjectTabs, Career, Capabilities };
