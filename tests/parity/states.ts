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
	// Phase 2: the overlays opened, dismissed and nested, and the feedback that changes state.
	"components/Modal": [
		{
			// The Default example, open in place at rest, closed.
			name: "default closed",
			actions: [
				{ click: within(["dialog", "A modal layer"], "button", "Close") },
			],
		},
		{
			// The Example's modal, through the portal over the whole page.
			name: "opened",
			actions: [{ click: first("button", "Open a modal") }],
		},
		{
			name: "nested",
			actions: [
				{ click: first("button", "Open a modal") },
				// In the open modal's portal, outside #root.
				{ click: 'internal:role=button[name="Open nested"s] >> nth=0' },
			],
		},
	],
	"components/Backdrop": [
		// The backdrop is aria-hidden, so its own copy is what a press aims at.
		{
			name: "scrim dismissed",
			actions: [
				{ click: '#root >> internal:text="Press to dismiss"s >> nth=0' },
			],
		},
		{
			name: "loading cover dismissed",
			actions: [{ click: '#root >> internal:text="Publishing…"s >> nth=0' }],
		},
	],
	"components/Portal": [
		{
			name: "in place",
			actions: [{ click: first("button", "disablePortal") }],
		},
	],
	"components/Dialog": [
		{
			// The preview's one closed dialog, opened by its trigger over the whole page.
			name: "full page",
			actions: [{ click: first("button", "Open full page") }],
		},
		{
			name: "confirm dismissed",
			actions: [{ click: first("button", "Keep draft") }],
		},
	],
	"components/Drawer": [
		{
			name: "menu opened",
			actions: [{ click: first("button", "Open the menu") }],
		},
		{
			name: "default closed",
			actions: [{ click: first("button", "Close") }],
		},
		{
			// The persistent drawer closed, and the content beside it taking its place.
			name: "contents hidden",
			actions: [{ click: first("button", "Hide contents") }],
		},
	],
	"components/Alert": [
		{ name: "closed", actions: [{ click: first("button", "Close") }] },
		{
			// Retry swaps the failed upload for the success alert after 1.2s; the pointer then
			// moves off, so the new close button isn't hovered.
			name: "retried",
			actions: [
				{ click: first("button", "Retry") },
				{ wait: 1500 },
				{ hover: first("heading", "Production deploy") },
			],
		},
	],
	"components/Badge": [
		{ name: "hidden", actions: [{ click: first("button", "Hide badge") }] },
		{
			// Three reviews take the count from 3 to 0, which hides the pill.
			name: "queue emptied",
			actions: [
				{ click: first("button", "Review one") },
				{ click: first("button", "Review one") },
				{ click: first("button", "Review one") },
			],
		},
	],
	"components/Menu": [
		// The Example's menu, through the portal, with focus on its first item.
		{ name: "opened", actions: [{ click: first("button", "Actions") }] },
		{
			name: "arrow key",
			actions: [{ click: first("button", "Actions") }, { press: "ArrowDown" }],
		},
		// A standalone list's keyboard focus, past the disabled item to the danger row.
		{
			name: "list arrow keys",
			actions: [
				{
					focus: within(["menu", "Pull request"], "menuitem", "Preview build"),
				},
				{ press: "ArrowDown" },
				{ press: "ArrowDown" },
			],
		},
		// The Default section's menu, open in place at rest.
		{ name: "staged menu closed", actions: [{ press: "Escape" }] },
	],
	"components/Popover": [
		// The Example's share popover, through the portal, with focus on Copy link.
		{ name: "opened", actions: [{ click: first("button", "Share") }] },
	],
	"components/ClickAwayListener": [
		// A press on the heading is outside all three panels: each closes its own.
		{
			name: "pressed outside",
			actions: [{ click: first("heading", "Default") }],
		},
	],
	"components/Tooltip": [
		{
			// The Example toolbar's: the first "Copy email" is the Variants one, held open. Focus, not
			// hover: a full-page capture of this tall preview moves the pointer off the page.
			name: "focus shows it",
			actions: [
				{ focus: '#root >> internal:role=button[name="Copy email"s] >> nth=1' },
			],
		},
		{
			// The Example's long description, below its link with the arrow.
			name: "focus shows the arrowed one below",
			actions: [{ focus: first("link", "How it works") }],
		},
	],
	"components/Avatar": [
		{
			// The Example's employer strip; the Variants section has an "Employers" group without tooltips.
			name: "tooltip on hover",
			actions: [
				{
					hover:
						'#root >> internal:role=group[name="Employers"s] >> nth=1 >> internal:role=img[name="PayPal"s] >> nth=0',
				},
				{ wait: 900 },
			],
		},
	],
	"components/Popper": [
		{
			name: "bottom-end",
			actions: [{ click: first("button", "bottom-end") }],
		},
		{
			name: "left",
			actions: [{ click: first("button", "left") }],
		},
		{
			name: "virtual anchor",
			actions: [
				{
					hover:
						'#root >> internal:text="Move the pointer here: a virtual anchor follows it."s',
				},
			],
		},
	],
	"components/Snackbar": [
		{
			name: "closed by its close button",
			actions: [{ click: first("button", "Close") }],
		},
		{
			name: "Escape closes the open ones",
			actions: [{ press: "Escape" }],
		},
		{
			name: "publishing",
			actions: [{ click: first("button", "Publish") }, { wait: 300 }],
		},
		{
			name: "published",
			actions: [{ click: first("button", "Publish") }, { wait: 2200 }],
		},
		{
			name: "bucket offline",
			actions: [
				{ click: first("button", "Publish with the bucket offline") },
				{ wait: 2200 },
			],
		},
	],
	"components/TextareaAutosize": [
		{
			name: "grown",
			actions: [
				{ focus: first("textbox", "Notes") },
				{ press: "Enter" },
				{ press: "Enter" },
				{ press: "Enter" },
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
