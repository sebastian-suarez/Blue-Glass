/**
Opened states the parity gate also compares: after the resting capture, each state's
actions run on both runtimes and the result is captured again. Overlays and inputs add
theirs in their phase (an open Select, a Menu with the second item highlighted, a Tooltip
on focus). Selectors are Playwright's, by role and accessible name, so they hold on Base
UI's DOM as well as the reference's.
*/
export type Action =
	| { click: string }
	| { hover: string }
	| { focus: string }
	| { press: string }
	| { wait: number };

export type State = { name: string; actions: Action[] };

/**
The first element with this role and exact accessible name, inside the preview.
*/
const first = (role: string, name: string) =>
	`#root >> internal:role=${role}[name=${JSON.stringify(name)}s] >> nth=0`;

/**
The same inside the first element of another role and name, such as a tab of one tab list.
*/
const within = (outer: [string, string], role: string, name: string) =>
	`${first(...outer)} >> internal:role=${role}[name=${JSON.stringify(name)}s] >> nth=0`;

export const states: Record<string, State[]> = {
	// Phase 1: the inputs, and the components whose Base UI DOM replaces the reference's.
	"components/Button": [
		{ name: "focused", actions: [{ focus: "#root button >> nth=0" }] },
	],
	"components/ButtonGroup": [
		{ name: "focused", actions: [{ focus: "#root button >> nth=0" }] },
	],
	"components/ToggleButton": [
		{
			name: "pressed",
			actions: [{ click: first("button", "Code") }],
		},
		{
			name: "arrow key",
			actions: [{ focus: first("button", "Diagram") }, { press: "ArrowRight" }],
		},
	],
	"components/Tabs": [
		{
			name: "second tab",
			actions: [{ click: within(["tablist", "Sections"], "tab", "Projects") }],
		},
		{
			name: "arrow key",
			actions: [
				{ focus: within(["tablist", "Sections"], "tab", "Work") },
				{ press: "ArrowRight" },
			],
		},
		{
			name: "side tab",
			actions: [
				{ click: within(["tablist", "Choose a project"], "tab", "Intive") },
			],
		},
	],
	"components/Accordion": [
		{
			name: "row opened",
			actions: [
				{
					click: first(
						"button",
						"Intive Senior Software Engineer Started Jul 2025",
					),
				},
			],
		},
		{
			name: "row closed",
			actions: [
				{
					click: first(
						"button",
						"EPAM Frontend Software Engineer Mar 2026 – Present",
					),
				},
			],
		},
		{
			name: "pane opened",
			actions: [{ click: first("button", "Hardware") }],
		},
		{
			name: "pane focused",
			actions: [{ focus: first("button", "Frontend & mobile") }],
		},
	],
	"sections/ClientWork": [
		{
			name: "second project",
			actions: [
				{ click: within(["tablist", "Choose a project"], "tab", "Intive") },
			],
		},
	],
};

/**
A state the self-test uses to prove the mechanism on the reference alone.
*/
export const selfTestStates: Record<string, State[]> = {
	"components/Button": [
		{ name: "focused", actions: [{ focus: "#root button >> nth=0" }] },
	],
};
