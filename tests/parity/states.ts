export type Action =
	| { click: string }
	| { hover: string }
	| { focus: string }
	| { press: string }
	| { wait: number };

export type State = { name: string; actions: Action[] };

const first = (role: string, name: string) =>
	`#root >> internal:role=${role}[name=${JSON.stringify(name)}s] >> nth=0`;

const within = (outer: [string, string], role: string, name: string) =>
	`${first(...outer)} >> internal:role=${role}[name=${JSON.stringify(name)}s] >> nth=0`;

export const states: Record<string, State[]> = {
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
	"components/Modal": [
		{
			name: "default closed",
			actions: [
				{ click: within(["dialog", "A modal layer"], "button", "Close") },
			],
		},
		{
			name: "opened",
			actions: [{ click: first("button", "Open a modal") }],
		},
		{
			name: "nested",
			actions: [
				{ click: first("button", "Open a modal") },
				{ click: 'internal:role=button[name="Open nested"s] >> nth=0' },
			],
		},
	],
	"components/Backdrop": [
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
			name: "contents hidden",
			actions: [{ click: first("button", "Hide contents") }],
		},
	],
	"components/Alert": [
		{ name: "closed", actions: [{ click: first("button", "Close") }] },
		{
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
			name: "queue emptied",
			actions: [
				{ click: first("button", "Review one") },
				{ click: first("button", "Review one") },
				{ click: first("button", "Review one") },
			],
		},
	],
	"components/Menu": [
		{ name: "opened", actions: [{ click: first("button", "Actions") }] },
		{
			name: "arrow key",
			actions: [{ click: first("button", "Actions") }, { press: "ArrowDown" }],
		},
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
		{ name: "staged menu closed", actions: [{ press: "Escape" }] },
	],
	"components/Popover": [
		{ name: "opened", actions: [{ click: first("button", "Share") }] },
	],
	"components/ClickAwayListener": [
		{
			name: "pressed outside",
			actions: [{ click: first("heading", "Default") }],
		},
	],
	"components/Tooltip": [
		{
			name: "focus shows it",
			actions: [
				{ focus: '#root >> internal:role=button[name="Copy email"s] >> nth=1' },
			],
		},
		{
			name: "focus shows the arrowed one below",
			actions: [{ focus: first("link", "How it works") }],
		},
	],
	"components/Avatar": [
		{
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
	"components/TextField": [
		{ name: "focused", actions: [{ focus: first("textbox", "Email") }] },
		{
			name: "sent empty",
			actions: [{ click: first("button", "Send message") }],
		},
	],
	"components/Select": [
		{ name: "default closed", actions: [{ press: "Escape" }] },
		{
			name: "opened",
			actions: [
				{
					click:
						'#root >> internal:role=combobox[name="Primary stack"s] >> nth=1',
				},
			],
		},
		{
			name: "arrow key",
			actions: [
				{
					click:
						'#root >> internal:role=combobox[name="Primary stack"s] >> nth=1',
				},
				{ wait: 400 },
				{ press: "ArrowDown" },
			],
		},
		{
			name: "multiple opened",
			actions: [{ click: first("combobox", "Stack") }],
		},
	],
	"components/Autocomplete": [
		{
			name: "arrow key",
			actions: [
				{ focus: first("combobox", "Employer") },
				{ press: "ArrowDown" },
			],
		},
		{
			name: "chip removed",
			actions: [{ click: first("button", "Remove Node.js") }],
		},
		{
			name: "example filtered",
			actions: [{ focus: first("combobox", "Project") }, { press: "r" }],
		},
	],
	"components/Checkbox": [
		{
			name: "toggled",
			actions: [
				{ click: first("checkbox", "Email me when a new release ships") },
			],
		},
		{
			name: "all projects checked",
			actions: [
				{
					click: within(
						["group", "Notify me about"],
						"checkbox",
						"All projects",
					),
				},
			],
		},
		{ name: "focused", actions: [{ focus: first("checkbox", "Remote") }] },
	],
	"components/RadioGroup": [
		{
			name: "arrow key",
			actions: [
				{ focus: first("radio", "Node.js and TypeScript") },
				{ press: "ArrowDown" },
			],
		},
		{
			name: "continued without a role",
			actions: [{ click: first("button", "Continue") }],
		},
	],
	"components/Switch": [
		{ name: "toggled", actions: [{ click: first("switch", "Remote only") }] },
		{
			name: "focused",
			actions: [{ focus: first("switch", "Contract roles") }],
		},
	],
	"components/Slider": [
		{
			name: "end key",
			actions: [{ focus: first("slider", "Latency budget") }, { press: "End" }],
		},
		{
			name: "range arrow key",
			actions: [
				{ focus: first("slider", "Fastest expected") },
				{ press: "ArrowRight" },
			],
		},
		{
			name: "vertical home key",
			actions: [{ focus: first("slider", "Strength") }, { press: "Home" }],
		},
	],
	"components/Rating": [
		{
			name: "arrow key",
			actions: [
				{ focus: first("radio", "4 out of 5 stars") },
				{ press: "ArrowLeft" },
			],
		},
	],
	"components/TransferList": [
		{
			name: "moved selected",
			actions: [{ click: first("button", "Move selected to On the résumé") }],
		},
		{
			name: "moved all",
			actions: [{ click: first("button", "Move all to On the résumé") }],
		},
		{
			name: "row toggled",
			actions: [
				{ focus: first("listbox", "Stack") },
				{ press: "ArrowDown" },
				{ press: "Space" },
			],
		},
	],
	"components/Fab": [
		{ name: "focused", actions: [{ focus: first("button", "Email me") }] },
		{
			name: "back to top",
			actions: [
				{
					click: '#root >> internal:role=button[name="Back to top"s] >> nth=4',
				},
				{ wait: 800 },
			],
		},
	],
	"components/SpeedDial": [
		{
			name: "arrow key",
			actions: [
				{ focus: first("button", "Contact, opens up") },
				{ press: "ArrowUp" },
			],
		},
		{
			name: "example opened",
			actions: [
				{
					click:
						'#root >> internal:role=button[name="Contact and share"s] >> nth=1',
				},
				{ wait: 600 },
			],
		},
	],
};

export const selfTestStates: Record<string, State[]> = {
	"components/Button": [
		{ name: "focused", actions: [{ focus: "#root button >> nth=0" }] },
	],
};
