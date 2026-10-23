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
		return undefined;
	}
}

export function toSyntheticEvent<E extends Event, T extends Element = Element>(
	nativeEvent: E,
	currentTarget?: T,
): React.SyntheticEvent<T, E> {
	return new WrappedEvent<T, E>(nativeEvent, currentTarget);
}

const reactEvents = new WeakMap<Event, React.SyntheticEvent>();

export function rememberReactEvent(event: React.SyntheticEvent): void {
	reactEvents.set(event.nativeEvent, event);
}

export function documentedEvent<E extends Event, T extends Element = Element>(
	nativeEvent: E,
	element?: T,
): React.SyntheticEvent<T, E> {
	const remembered = reactEvents.get(nativeEvent);
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

const modalCloseReasons = {
	"outside-press": "backdropClick",
	"escape-key": "escapeKeyDown",
	"trigger-press": null,
	"trigger-hover": null,
	"trigger-focus": null,
	"close-press": null,
	"focus-out": null,
	"imperative-action": null,
	none: null,
} as const satisfies Table<ModalBaseReason, ModalCloseReason>;

export function modalCloseReason(
	reason: ModalBaseReason,
): ModalCloseReason | undefined {
	return lookUp("ModalCloseReason", modalCloseReasons, reason);
}

const menuCloseReasons = {
	"outside-press": "backdropClick",
	"escape-key": "escapeKeyDown",
	"item-press": "itemClick",
	"focus-out": "tabKeyDown",
	"trigger-press": null,
	"trigger-hover": null,
	"trigger-focus": null,
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

const selectCloseReasons = {
	"item-press": "select",
	"outside-press": "backdropClick",
	"escape-key": "escapeKeyDown",
	"focus-out": "tabKeyDown",
	"trigger-press": "backdropClick",
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

const drawerCloseReasons = {
	"outside-press": "backdropClick",
	"escape-key": "escapeKeyDown",
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

type ComboboxReason = Combobox.Root.ChangeEventReason;

const autocompleteCloseReasons = {
	"item-press": "selectOption",
	"escape-key": "escape",
	"close-press": "escape",
	"outside-press": "blur",
	"focus-out": "blur",
	"trigger-press": "toggleInput",
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

const autocompleteChangeReasons = {
	"item-press": "selectOption",
	none: "selectOption",
	"chip-remove-press": "removeOption",
	"clear-press": "clear",
	"escape-key": "clear",
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
	return documented === "selectOption" && change.removed
		? "removeOption"
		: documented;
}

const autocompleteInputChangeReasons = {
	"input-change": "input",
	"item-press": "reset",
	"input-clear": "reset",
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
