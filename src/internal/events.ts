/**
Events and reasons for the documented callbacks of the components that run on Base UI.

Events. Where a documented callback takes a React event:
- Pass the real React event whenever one exists, that is, when our own handler on the native
  element saw the interaction. Call rememberReactEvent(event) in that handler. Base UI changes
  state synchronously inside the same dispatch, so in its change callback
  documentedEvent(details.event, element) finds and returns that React event.
- Only when Base UI changes state with no React event behind it (list navigation, an outside
  press, Escape, a timer) does documentedEvent fall back to toSyntheticEvent: an object with
  React.SyntheticEvent's shape around the native event. Always pass the component's own
  element as `element`, the popup for Escape and the backdrop for an outside press: it stands
  in for the currentTarget React would have set. A Base UI timer has no native event; its
  details.event is a placeholder Event that was never dispatched, so that element is its only
  target, and without one both targets would be null.
- Escape is wrapped too, even where the documented union also accepts a native KeyboardEvent:
  every Base UI-driven callback gets a SyntheticEvent, with the native one as nativeEvent. The
  modal adapter (modal.tsx) is the exception: Modal, Dialog and Drawer hear the Escape key
  themselves and pass its native KeyboardEvent, which their specs require.
- A remembered React event follows React's rules: its currentTarget is null once React's
  dispatch is over, as for any React event read after its handler returns.

Reasons. Base UI says why it changes state in eventDetails.reason ("outside-press",
"escape-key"…). Each documented union below has a table listing every reason Base UI declares
for the component, mapped to the documented reason, or to null where the documented API has
none. The table's type is Base UI's own union, so the typecheck fails when an upgrade adds or
drops a reason: each one is a decision made here, never a default. The functions:
- return the documented reason for a change to closed (or for Autocomplete, a value or text
  change);
- return undefined for a null entry, and for a reason the table doesn't know, which also
  warns once: an unknown reason never turns into a documented one.
When they return undefined, don't call the documented callback. With a controlled `open` the
popup then stays as it is, which is what the reference does for the interactions it doesn't
have, such as a press on the input of an open Autocomplete.

What events.browser.test.tsx found Base UI doing, which the ports have to cover themselves:
- Menu and Select close on Tab ("focus-out") only when Base UI has their trigger. A Menu
  anchored to anchorEl lets focus leave and stays open, so the Menu port handles Tab in its
  own onKeyDown, as the reference's MenuList does: a real React event and "tabKeyDown".
- Combobox reports some texts twice (a clear sets the text, then the value, which sets it
  again). The reference reports a text once, so the Autocomplete port skips repeats.

Unions that get no table: Snackbar's (Base UI's Toast reports no reasons, and Snackbar's
handlers make its own: timeout, clickaway, escapeKeyDown, closeButton), SpeedDial's (a port
with its own handlers) and Tooltip's callbacks (no reason). The documented unions are declared
here; the components should re-export these rather than declare their own.
*/
import type * as React from "react";
import type { Combobox } from "@base-ui/react/combobox";
import type { Dialog } from "@base-ui/react/dialog";
import type { Drawer } from "@base-ui/react/drawer";
import type { Menu } from "@base-ui/react/menu";
import type { Popover } from "@base-ui/react/popover";
import type { Select } from "@base-ui/react/select";

export type ModalCloseReason = "backdropClick" | "escapeKeyDown";
export type MenuCloseReason =
	"backdropClick" | "escapeKeyDown" | "itemClick" | "tabKeyDown";
export type SelectCloseReason =
	"escapeKeyDown" | "backdropClick" | "select" | "tabKeyDown";
export type DrawerCloseReason =
	"backdropClick" | "escapeKeyDown" | "closeButton" | "swipe";
export type AutocompleteCloseReason =
	"selectOption" | "escape" | "blur" | "toggleInput";
export type AutocompleteChangeReason =
	"selectOption" | "removeOption" | "createOption" | "clear";
export type AutocompleteInputChangeReason = "input" | "reset" | "clear";

/**
React's SyntheticEvent around a native event, for a Base UI change with no React event behind
it.
*/
class WrappedEvent<
	T extends Element,
	E extends Event,
> implements React.SyntheticEvent<T, E> {
	#isDefaultPrevented = false;
	#isPropagationStopped = false;
	readonly nativeEvent: E;
	readonly currentTarget: EventTarget & T;
	readonly target: EventTarget;
	readonly type: string;
	readonly bubbles: boolean;
	readonly cancelable: boolean;
	readonly eventPhase: number;
	readonly isTrusted: boolean;
	readonly timeStamp: number;

	constructor(nativeEvent: E, currentTarget: T | undefined) {
		this.nativeEvent = nativeEvent;
		// The element whose handler React would have run; else what the event knows of itself.
		// Both targets are null only for a placeholder that was never dispatched, wrapped with
		// no element, which the module comment rules out.
		const current =
			currentTarget ?? nativeEvent.currentTarget ?? nativeEvent.target;
		this.currentTarget = current as EventTarget & T;
		this.target = (nativeEvent.target ?? current)!;
		this.type = nativeEvent.type;
		this.bubbles = nativeEvent.bubbles;
		this.cancelable = nativeEvent.cancelable;
		this.eventPhase = nativeEvent.eventPhase;
		this.isTrusted = nativeEvent.isTrusted;
		this.timeStamp = nativeEvent.timeStamp;
	}

	get defaultPrevented(): boolean {
		return this.#isDefaultPrevented || this.nativeEvent.defaultPrevented;
	}

	preventDefault(): void {
		// Marked even when the native event can't be canceled, as React does, so a component
		// can see that the callback asked it to hold back.
		this.#isDefaultPrevented = true;
		this.nativeEvent.preventDefault();
	}

	isDefaultPrevented(): boolean {
		return this.defaultPrevented;
	}

	stopPropagation(): void {
		this.#isPropagationStopped = true;
		this.nativeEvent.stopPropagation();
	}

	isPropagationStopped(): boolean {
		return this.#isPropagationStopped;
	}

	persist(): void {
		// React 17 and later don't pool events, so there's nothing to keep.
	}
}

/**
An object with React.SyntheticEvent's shape around a native event. Its flags and methods act
on the native event: preventDefault and stopPropagation pass through.
*/
export function toSyntheticEvent<E extends Event, T extends Element = Element>(
	nativeEvent: E,
	currentTarget?: T,
): React.SyntheticEvent<T, E> {
	return new WrappedEvent<T, E>(nativeEvent, currentTarget);
}

const reactEvents = new WeakMap<Event, React.SyntheticEvent>();

/**
Keeps the React event our own handler received, so a Base UI change in the same dispatch can
pass it on.
*/
export function rememberReactEvent(event: React.SyntheticEvent): void {
	reactEvents.set(event.nativeEvent, event);
}

/**
The event for a documented callback: the React event remembered for this native event, else a
SyntheticEvent-shaped wrapper with `element` as its currentTarget.
*/
export function documentedEvent<E extends Event, T extends Element = Element>(
	nativeEvent: E,
	element?: T,
): React.SyntheticEvent<T, E> {
	const remembered = reactEvents.get(nativeEvent);
	// Remembered under this very native event, so its nativeEvent is E.
	return (
		(remembered as React.SyntheticEvent<T, E> | undefined) ??
		toSyntheticEvent(nativeEvent, element)
	);
}

type Table<Reason extends string, Documented extends string> = Readonly<
	Record<Reason, Documented | null>
>;

const warned = new Set<string>();

function lookUp<Reason extends string, Documented extends string>(
	family: string,
	table: Table<Reason, Documented>,
	reason: string,
): Documented | undefined {
	if (Object.hasOwn(table, reason)) {
		// Checked just above: the reason is one of the table's keys.
		return table[reason as Reason] ?? undefined;
	}

	const key = `${family}: ${reason}`;
	if (!warned.has(key)) {
		warned.add(key);
		console.warn(
			`Blue Glass: Base UI reason "${reason}" isn't in the ${family} table, so the documented callback isn't called. Map it in src/internal/events.ts.`,
		);
	}

	return undefined;
}

type ModalBaseReason =
	Dialog.Root.ChangeEventReason | Popover.Root.ChangeEventReason;

/**
Modal and Dialog run on Base UI's Dialog, Popover on its Popover. The reference closes on an
outside press and on Escape only.
*/
const modalCloseReasons = {
	"outside-press": "backdropClick",
	"escape-key": "escapeKeyDown",
	// The reference anchors to anchorEl and has no trigger or close part.
	"trigger-press": null,
	"trigger-hover": null,
	"trigger-focus": null,
	"close-press": null,
	// Focus leaving doesn't close the reference's Modal, even with disableEnforceFocus.
	"focus-out": null,
	"imperative-action": null,
	none: null,
} as const satisfies Table<ModalBaseReason, ModalCloseReason>;

export function modalCloseReason(
	reason: ModalBaseReason,
): ModalCloseReason | undefined {
	return lookUp("ModalCloseReason", modalCloseReasons, reason);
}

/**
Menu runs on Base UI's Menu.
*/
const menuCloseReasons = {
	"outside-press": "backdropClick",
	"escape-key": "escapeKeyDown",
	"item-press": "itemClick",
	// Only Tab moves focus out of an open menu: a press outside is outside-press first.
	"focus-out": "tabKeyDown",
	"trigger-press": null,
	"trigger-hover": null,
	"trigger-focus": null,
	// A submenu closing on an arrow key: the reference has no submenus.
	"list-navigation": null,
	"close-press": null,
	"sibling-open": null,
	"cancel-open": null,
	"imperative-action": null,
	none: null,
} as const satisfies Table<Menu.Root.ChangeEventReason, MenuCloseReason>;

export function menuCloseReason(
	reason: Menu.Root.ChangeEventReason,
): MenuCloseReason | undefined {
	return lookUp("MenuCloseReason", menuCloseReasons, reason);
}

/**
Select runs on Base UI's Select (not with `native`, which stays a <select>).
*/
const selectCloseReasons = {
	"item-press": "select",
	"outside-press": "backdropClick",
	"escape-key": "escapeKeyDown",
	"focus-out": "tabKeyDown",
	// The reference's trigger sits under the open menu's invisible backdrop, so pressing it
	// again is a backdrop click.
	"trigger-press": "backdropClick",
	// The reference doesn't close when the window resizes.
	"window-resize": null,
	"list-navigation": null,
	"cancel-open": null,
	"imperative-action": null,
	none: null,
} as const satisfies Table<Select.Root.ChangeEventReason, SelectCloseReason>;

export function selectCloseReason(
	reason: Select.Root.ChangeEventReason,
): SelectCloseReason | undefined {
	return lookUp("SelectCloseReason", selectCloseReasons, reason);
}

/**
Drawer runs on Base UI's Drawer.
*/
const drawerCloseReasons = {
	"outside-press": "backdropClick",
	"escape-key": "escapeKeyDown",
	// Android's back gesture: the platform's close request, which Escape is on a keyboard.
	"close-watcher": "escapeKeyDown",
	"close-press": "closeButton",
	swipe: "swipe",
	"trigger-press": null,
	"focus-out": null,
	"imperative-action": null,
	none: null,
} as const satisfies Table<Drawer.Root.ChangeEventReason, DrawerCloseReason>;

export function drawerCloseReason(
	reason: Drawer.Root.ChangeEventReason,
): DrawerCloseReason | undefined {
	return lookUp("DrawerCloseReason", drawerCloseReasons, reason);
}

/**
Base UI's Combobox and Autocomplete share one union of reasons.
*/
type ComboboxReason = Combobox.Root.ChangeEventReason;

/**
Autocomplete's onClose, from Base UI's onOpenChange(false).
*/
const autocompleteCloseReasons = {
	"item-press": "selectOption",
	"escape-key": "escape",
	// Base UI's dismiss button for screen readers: closing without a choice, as Escape does.
	"close-press": "escape",
	// The reference closes on blur, and a press outside blurs the input.
	"outside-press": "blur",
	"focus-out": "blur",
	// The popup indicator button.
	"trigger-press": "toggleInput",
	// The reference opens on a press in the input but never closes on one, and typing (or
	// emptying the text) never closes it.
	"input-press": null,
	"input-change": null,
	"input-clear": null,
	"clear-press": null,
	"chip-remove-press": null,
	"list-navigation": null,
	"cancel-open": null,
	"imperative-action": null,
	none: null,
} as const satisfies Table<ComboboxReason, AutocompleteCloseReason>;

export function autocompleteCloseReason(
	reason: ComboboxReason,
): AutocompleteCloseReason | undefined {
	return lookUp("AutocompleteCloseReason", autocompleteCloseReasons, reason);
}

/**
Autocomplete's onChange, from Base UI's onValueChange. Base UI reports a press on a chosen
item that drops it, and Backspace on a chip, with the same reasons as adding one, so the
caller says whether the change removed options.
*/
const autocompleteChangeReasons = {
	"item-press": "selectOption",
	// Backspace or Delete on a chip, or autofill picking an option.
	none: "selectOption",
	"chip-remove-press": "removeOption",
	"clear-press": "clear",
	// Escape while closed clears the value, as clearOnEscape does in the reference.
	"escape-key": "clear",
	// Emptying the text clears a single value, as in the reference.
	"input-clear": "clear",
	"input-change": null,
	"input-press": null,
	"trigger-press": null,
	"outside-press": null,
	"focus-out": null,
	"close-press": null,
	"list-navigation": null,
	"cancel-open": null,
	"imperative-action": null,
} as const satisfies Table<ComboboxReason, AutocompleteChangeReason>;

export function autocompleteChangeReason(
	reason: ComboboxReason,
	change: { removed: boolean },
): AutocompleteChangeReason | undefined {
	const documented = lookUp(
		"AutocompleteChangeReason",
		autocompleteChangeReasons,
		reason,
	);
	// "createOption" never comes from Base UI: freeSolo text is committed by our own handler.
	return documented === "selectOption" && change.removed
		? "removeOption"
		: documented;
}

/**
Autocomplete's onInputChange, from Base UI's onInputValueChange.
*/
const autocompleteInputChangeReasons = {
	"input-change": "input",
	// The text follows the chosen option: its label, or empty after a choice in multiple mode.
	"item-press": "reset",
	// Base UI empties the text itself (after a choice, or as the popup closes); a person
	// emptying it is input-change.
	"input-clear": "reset",
	// Base UI syncing the text to the selected value.
	none: "reset",
	"clear-press": "clear",
	"escape-key": "clear",
	"chip-remove-press": null,
	"input-press": null,
	"trigger-press": null,
	"outside-press": null,
	"focus-out": null,
	"close-press": null,
	"list-navigation": null,
	"cancel-open": null,
	"imperative-action": null,
} as const satisfies Table<ComboboxReason, AutocompleteInputChangeReason>;

export function autocompleteInputChangeReason(
	reason: ComboboxReason,
): AutocompleteInputChangeReason | undefined {
	return lookUp(
		"AutocompleteInputChangeReason",
		autocompleteInputChangeReasons,
		reason,
	);
}
