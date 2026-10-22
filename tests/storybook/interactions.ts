/**
The steps a reader takes in each stateful Default, which the Storybook gate
(scripts/storybook/run.ts) replays: on the canvas, where the Controls panel must follow each
step; after a change in the panel, which the story must follow; and on the docs page, where the
Default must respond without writing the args. `--self` replays each entry on the reference's
preview page too, inside its "Default" section, since the Default story renders that section.

Actions use tests/parity/states.ts's syntax, without its "#root >>" prefix: the gate looks
inside the story first, then in what it portals into body. `arg` is the value the panel must
show after the step; `shows` and `hides` are selectors that must be visible, or gone or
hidden, afterwards.
*/
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

/*
Stateful Defaults without an entry, since no step could be checked on the reference's preview:
- Popover: the Variants section's popovers open after the Default's and sit above it, so they
  take Escape and every outside press; nothing inside the Default's popover closes it.
- Tooltip: the preview holds the Default's tooltip open with no handlers, so on the reference
  nothing a reader does closes it; the story adds the wiring.
The Controls check still proves their `open` acts.
*/
export const interactions: Record<string, Interaction> = {
	// Phase 1.
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
	// Phase 2. The Defaults that open in place on load start with a dismissal.
	"utils-modal--default": {
		arg: "open",
		// Escape goes to the top layer, which at load is the Variants example's, opened after
		// this one; once reopened, this one is on top.
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
				// The backdrop is aria-hidden, so its own copy is what a press aims at.
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
				// "Copy link" also shows its shortcut, so its name is matched as a substring.
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
	// The Popper's buttons set its placement, which Default lists through LiveArg.
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
			// The Default opens on load: its close button asks to close (closeButton).
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
			// README: "Escape closes an open snackbar (escapeKeyDown)."
			{
				action: { press: "Escape" },
				arg: false,
				hides: [
					'internal:text="Published to S3. CloudFront picks it up in about a minute."s',
				],
			},
		],
	},
};
