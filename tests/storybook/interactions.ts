import type { Action } from "../parity/states.ts";

export type Step = {
	action: Action;
	arg: string | number | boolean;
	shows?: string[];
	hides?: string[];
};

export type Interaction = { arg: string; steps: Step[] };

const role = (name: string, accessibleName: string, state = "") =>
	`internal:role=${name}[name=${JSON.stringify(accessibleName)}s]${state}`;

export const interactions: Record<string, Interaction> = {
	"navigation-tabs--default": {
		arg: "value",
		steps: [
			{
				action: { click: role("tab", "Projects") },
				arg: "projects",
				shows: [role("tab", "Projects", "[selected=true]")],
			},
			{
				action: { click: role("tab", "Experience") },
				arg: "experience",
				shows: [role("tab", "Experience", "[selected=true]")],
			},
		],
	},
	"inputs-togglebutton--default": {
		arg: "value",
		steps: [
			{
				action: { click: role("button", "Code") },
				arg: "code",
				shows: [role("button", "Code", "[pressed=true]")],
			},
			{
				action: { click: role("button", "Notes") },
				arg: "notes",
				shows: [role("button", "Notes", "[pressed=true]")],
			},
		],
	},
	"surfaces-accordion--default": {
		arg: "expanded",
		steps: [
			{
				action: {
					click: 'internal:role=button[name="Frontend Software Engineer"i]',
				},
				arg: false,
				shows: [
					'internal:role=button[name="Frontend Software Engineer"i][expanded=false]',
				],
			},
			{
				action: {
					click: 'internal:role=button[name="Frontend Software Engineer"i]',
				},
				arg: true,
				shows: [
					'internal:role=button[name="Frontend Software Engineer"i][expanded=true]',
				],
			},
		],
	},
	"utils-transitions--default": {
		arg: "in",
		steps: [
			{
				action: { click: role("button", "Hide all") },
				arg: false,
				shows: [role("button", "Show all")],
			},
			{
				action: { click: role("button", "Show all") },
				arg: true,
				shows: [role("button", "Hide all")],
			},
		],
	},
	"utils-modal--default": {
		arg: "open",
		steps: [
			{
				action: {
					click: `${role("dialog", "A modal layer")} >> ${role("button", "Close")}`,
				},
				arg: false,
				hides: [role("dialog", "A modal layer")],
			},
			{
				action: { click: role("button", "Open") },
				arg: true,
				shows: [role("dialog", "A modal layer")],
			},
			{
				action: { press: "Escape" },
				arg: false,
				hides: [role("dialog", "A modal layer")],
			},
		],
	},
	"feedback-backdrop--default": {
		arg: "open",
		steps: [
			{
				action: { click: 'internal:text="Press to dismiss"s' },
				arg: false,
				hides: ['internal:text="Press to dismiss"s'],
			},
			{
				action: { click: role("button", "Show scrim") },
				arg: true,
				shows: ['internal:text="Press to dismiss"s'],
			},
		],
	},
	"utils-portal--default": {
		arg: "disablePortal",
		steps: [
			{
				action: { click: role("button", "disablePortal") },
				arg: true,
				shows: [role("button", "disablePortal", "[pressed=true]")],
			},
			{
				action: { click: role("button", "Into the target") },
				arg: false,
				shows: [role("button", "Into the target", "[pressed=true]")],
			},
		],
	},
	"navigation-menu--default": {
		arg: "open",
		steps: [
			{
				action: { click: 'internal:role=menuitem[name="Copy link"i]' },
				arg: false,
				hides: ["internal:role=menu"],
			},
			{
				action: { click: role("button", "Project actions") },
				arg: true,
				shows: [role("menu", "Project actions")],
			},
			{
				action: { press: "Escape" },
				arg: false,
				hides: ["internal:role=menu"],
			},
		],
	},
	"feedback-dialog--default": {
		arg: "open",
		steps: [
			{
				action: { click: role("button", "Keep draft") },
				arg: false,
				hides: ["internal:role=alertdialog"],
			},
			{
				action: { click: role("button", "Delete draft…") },
				arg: true,
				shows: [role("alertdialog", "Delete the RS50 bridge draft?")],
			},
			{
				action: { press: "Escape" },
				arg: false,
				hides: ["internal:role=alertdialog"],
			},
		],
	},
	"navigation-drawer--default": {
		arg: "open",
		steps: [
			{
				action: { click: role("button", "Close") },
				arg: false,
				hides: ["internal:role=dialog"],
			},
			{
				action: { click: role("button", "Menu") },
				arg: true,
				shows: [role("dialog", "Sebastian Suarez")],
			},
			{
				action: { press: "Escape" },
				arg: false,
				hides: ["internal:role=dialog"],
			},
		],
	},
	"utils-popper--default": {
		arg: "placement",
		steps: [
			{
				action: { click: 'internal:role=button[name="bottom-end"s]' },
				arg: "bottom-end",
				shows: ['internal:role=button[name="bottom-end"s][pressed=true]'],
			},
			{
				action: { click: 'internal:role=button[name="left"s]' },
				arg: "left",
				shows: ['internal:role=button[name="left"s][pressed=true]'],
			},
		],
	},
	"feedback-snackbar--default": {
		arg: "open",
		steps: [
			{
				action: { click: 'internal:role=button[name="Close"s]' },
				arg: false,
				hides: [
					'internal:text="Published to S3. CloudFront picks it up in about a minute."s',
				],
			},
			{
				action: { click: 'internal:role=button[name="Show again"s]' },
				arg: true,
				shows: [
					'internal:role=status >> internal:text="Published to S3. CloudFront picks it up in about a minute."s',
				],
			},
			{
				action: { press: "Escape" },
				arg: false,
				hides: [
					'internal:text="Published to S3. CloudFront picks it up in about a minute."s',
				],
			},
		],
	},
	"inputs-checkbox--default": {
		arg: "checked",
		steps: [
			{
				action: {
					click: role("checkbox", "Email me when a new release ships"),
				},
				arg: false,
				shows: [
					role(
						"checkbox",
						"Email me when a new release ships",
						"[checked=false]",
					),
				],
			},
			{
				action: {
					click: role("checkbox", "Email me when a new release ships"),
				},
				arg: true,
				shows: [
					role(
						"checkbox",
						"Email me when a new release ships",
						"[checked=true]",
					),
				],
			},
		],
	},
	"inputs-switch--default": {
		arg: "checked",
		steps: [
			{
				action: { click: role("switch", "Remote only") },
				arg: false,
				shows: [role("switch", "Remote only", "[checked=false]")],
			},
			{
				action: { click: role("switch", "Remote only") },
				arg: true,
				shows: [role("switch", "Remote only", "[checked=true]")],
			},
		],
	},
	"inputs-radiogroup--default": {
		arg: "value",
		steps: [
			{
				action: { click: role("radio", "Rust") },
				arg: "rust",
				shows: [role("radio", "Rust", "[checked=true]")],
			},
			{
				action: { click: role("radio", "React and Next.js") },
				arg: "react",
				shows: [role("radio", "React and Next.js", "[checked=true]")],
			},
		],
	},
	"inputs-select--default": {
		arg: "open",
		steps: [
			{
				action: { press: "Escape" },
				arg: false,
				hides: ["internal:role=listbox"],
			},
			{
				action: { click: role("combobox", "Primary stack") },
				arg: true,
				shows: [role("listbox", "Primary stack")],
			},
			{
				action: { press: "Escape" },
				arg: false,
				hides: ["internal:role=listbox"],
			},
		],
	},
	"inputs-autocomplete--default": {
		arg: "open",
		steps: [
			{
				action: { click: role("option", "PayPal") },
				arg: false,
				hides: ["internal:role=listbox"],
			},
			{
				action: { click: role("combobox", "Employer") },
				arg: true,
				shows: ["internal:role=listbox"],
			},
			{
				action: { press: "Escape" },
				arg: false,
				hides: ["internal:role=listbox"],
			},
		],
	},
	"navigation-speeddial--default": {
		arg: "open",
		steps: [
			{
				action: { click: role("button", "Contact and share") },
				arg: false,
				hides: [role("menuitem", "Email me")],
			},
			{
				action: { click: role("button", "Contact and share") },
				arg: true,
				shows: [role("menuitem", "Email me")],
			},
			{
				action: { press: "Escape" },
				arg: false,
				hides: [role("menuitem", "Email me")],
			},
		],
	},
};
