import type * as React from "react";
import { afterEach, describe, expect, expectTypeOf, test, vi } from "vitest";
import type * as Reference from "../../design-system/source/index.js";
import {
	type AutocompleteChangeReason,
	autocompleteChangeReason,
	type AutocompleteCloseReason,
	autocompleteCloseReason,
	type AutocompleteInputChangeReason,
	autocompleteInputChangeReason,
	type DrawerCloseReason,
	drawerCloseReason,
	documentedEvent,
	type MenuCloseReason,
	menuCloseReason,
	type ModalCloseReason,
	modalCloseReason,
	rememberReactEvent,
	type SelectCloseReason,
	selectCloseReason,
	toSyntheticEvent,
} from "./events.js";

afterEach(() => {
	vi.restoreAllMocks();
});

test("the reason unions are the documented ones", () => {
	expectTypeOf<ModalCloseReason>().toEqualTypeOf<Reference.ModalCloseReason>();
	expectTypeOf<MenuCloseReason>().toEqualTypeOf<Reference.MenuCloseReason>();
	expectTypeOf<SelectCloseReason>().toEqualTypeOf<Reference.SelectCloseReason>();
	expectTypeOf<DrawerCloseReason>().toEqualTypeOf<Reference.DrawerCloseReason>();
	expectTypeOf<AutocompleteCloseReason>().toEqualTypeOf<Reference.AutocompleteCloseReason>();
	expectTypeOf<AutocompleteChangeReason>().toEqualTypeOf<Reference.AutocompleteChangeReason>();
	expectTypeOf<AutocompleteInputChangeReason>().toEqualTypeOf<Reference.AutocompleteInputChangeReason>();
});

describe("toSyntheticEvent", () => {
	const members = [
		"nativeEvent",
		"target",
		"currentTarget",
		"type",
		"bubbles",
		"cancelable",
		"defaultPrevented",
		"eventPhase",
		"isTrusted",
		"timeStamp",
		"preventDefault",
		"stopPropagation",
		"isDefaultPrevented",
		"isPropagationStopped",
		"persist",
	];

	test("has React.SyntheticEvent's shape, read from the native event", () => {
		const native = new Event("keydown", { bubbles: true, cancelable: true });
		const event = toSyntheticEvent(native);
		for (const member of members) {
			expect(Reflect.has(event, member), member).toBe(true);
		}

		expect(event).toMatchObject({
			nativeEvent: native,
			type: "keydown",
			bubbles: true,
			cancelable: true,
			defaultPrevented: false,
			eventPhase: native.eventPhase,
			isTrusted: false,
			timeStamp: native.timeStamp,
		});
		expect(event.isDefaultPrevented()).toBe(false);
		expect(event.isPropagationStopped()).toBe(false);
	});

	test("goes where the documented callbacks promise a React event", () => {
		const event = toSyntheticEvent(new Event("pointerdown"));
		expectTypeOf(event).toExtend<React.SyntheticEvent>();
		const onClose = (
			_event: React.SyntheticEvent | KeyboardEvent,
			_reason: ModalCloseReason,
		) => undefined;
		expectTypeOf(onClose).toBeCallableWith(event, "backdropClick");
		expectTypeOf(toSyntheticEvent<KeyboardEvent>).returns.toEqualTypeOf<
			React.SyntheticEvent<Element, KeyboardEvent>
		>();
	});

	test("preventDefault passes through, and counts even when the event can't be canceled", () => {
		const cancelable = new Event("click", { cancelable: true });
		const event = toSyntheticEvent(cancelable);
		event.preventDefault();
		expect(cancelable.defaultPrevented).toBe(true);
		expect(event.defaultPrevented).toBe(true);
		expect(event.isDefaultPrevented()).toBe(true);

		// Base UI's placeholder for a timer: never dispatched, not cancelable.
		const placeholder = toSyntheticEvent(new Event("base-ui"));
		placeholder.preventDefault();
		expect(placeholder.nativeEvent.defaultPrevented).toBe(false);
		expect(placeholder.isDefaultPrevented()).toBe(true);
	});

	test("reflects a native event prevented elsewhere", () => {
		const native = new Event("click", { cancelable: true });
		const event = toSyntheticEvent(native);
		native.preventDefault();
		expect(event.defaultPrevented).toBe(true);
	});

	test("stopPropagation stops the native event", () => {
		const target = new EventTarget();
		const later = vi.fn<() => void>();
		target.addEventListener("ping", (native) => {
			const event = toSyntheticEvent(native);
			event.stopPropagation();
			expect(event.isPropagationStopped()).toBe(true);
		});
		target.addEventListener("ping", later);
		const native = new Event("ping");
		const stop = vi.spyOn(native, "stopPropagation");
		target.dispatchEvent(native);
		expect(stop).toHaveBeenCalledOnce();
		// It's stopPropagation, not stopImmediatePropagation: the target's other listeners run.
		expect(later).toHaveBeenCalledOnce();
	});

	test("persist does nothing", () => {
		const event = toSyntheticEvent(new Event("click"));
		expect(() => {
			event.persist();
		}).not.toThrow();
		expect(event.isDefaultPrevented()).toBe(false);
	});
});

describe("documentedEvent", () => {
	test("passes on the React event our handler remembered for the same native event", () => {
		const native = new Event("click");
		const reactEvent = toSyntheticEvent(native);
		rememberReactEvent(reactEvent);
		expect(documentedEvent(native)).toBe(reactEvent);
	});

	test("wraps a native event no handler of ours saw", () => {
		const native = new Event("pointerdown");
		const event = documentedEvent(native);
		expect(event.nativeEvent).toBe(native);
		expect(event.isDefaultPrevented()).toBe(false);
	});
});

describe("reasons", () => {
	test("Modal, Dialog and Popover: an outside press and Escape, nothing else", () => {
		expect(modalCloseReason("outside-press")).toBe("backdropClick");
		expect(modalCloseReason("escape-key")).toBe("escapeKeyDown");
		for (const reason of [
			"trigger-press",
			"trigger-hover",
			"trigger-focus",
			"close-press",
			"focus-out",
			"imperative-action",
			"none",
		] as const) {
			expect(modalCloseReason(reason), reason).toBeUndefined();
		}
	});

	test("Menu: a choice, Escape, an outside press and Tab", () => {
		expect(menuCloseReason("item-press")).toBe("itemClick");
		expect(menuCloseReason("escape-key")).toBe("escapeKeyDown");
		expect(menuCloseReason("outside-press")).toBe("backdropClick");
		expect(menuCloseReason("focus-out")).toBe("tabKeyDown");
		expect(menuCloseReason("list-navigation")).toBeUndefined();
		expect(menuCloseReason("sibling-open")).toBeUndefined();
	});

	test("Select: a choice, and a press on the trigger counts as one on the backdrop", () => {
		expect(selectCloseReason("item-press")).toBe("select");
		expect(selectCloseReason("trigger-press")).toBe("backdropClick");
		expect(selectCloseReason("outside-press")).toBe("backdropClick");
		expect(selectCloseReason("escape-key")).toBe("escapeKeyDown");
		expect(selectCloseReason("focus-out")).toBe("tabKeyDown");
		expect(selectCloseReason("window-resize")).toBeUndefined();
	});

	test("Drawer: the close part, swipes, and Android's back gesture as Escape", () => {
		expect(drawerCloseReason("close-press")).toBe("closeButton");
		expect(drawerCloseReason("swipe")).toBe("swipe");
		expect(drawerCloseReason("close-watcher")).toBe("escapeKeyDown");
		expect(drawerCloseReason("outside-press")).toBe("backdropClick");
		expect(drawerCloseReason("focus-out")).toBeUndefined();
	});

	test("Autocomplete closes on a choice, Escape, blur and the indicator only", () => {
		expect(autocompleteCloseReason("item-press")).toBe("selectOption");
		expect(autocompleteCloseReason("escape-key")).toBe("escape");
		expect(autocompleteCloseReason("outside-press")).toBe("blur");
		expect(autocompleteCloseReason("focus-out")).toBe("blur");
		expect(autocompleteCloseReason("trigger-press")).toBe("toggleInput");
		expect(autocompleteCloseReason("input-press")).toBeUndefined();
		expect(autocompleteCloseReason("input-clear")).toBeUndefined();
	});

	test("Autocomplete's value changes: the caller says whether options went", () => {
		expect(autocompleteChangeReason("item-press", { removed: false })).toBe(
			"selectOption",
		);
		expect(autocompleteChangeReason("item-press", { removed: true })).toBe(
			"removeOption",
		);
		expect(autocompleteChangeReason("none", { removed: true })).toBe(
			"removeOption",
		);
		expect(
			autocompleteChangeReason("chip-remove-press", { removed: true }),
		).toBe("removeOption");
		for (const reason of [
			"clear-press",
			"escape-key",
			"input-clear",
		] as const) {
			expect(autocompleteChangeReason(reason, { removed: true })).toBe("clear");
		}

		expect(
			autocompleteChangeReason("input-change", { removed: false }),
		).toBeUndefined();
	});

	test("Autocomplete's text changes: typing, a reset to the selection, a clear", () => {
		expect(autocompleteInputChangeReason("input-change")).toBe("input");
		expect(autocompleteInputChangeReason("item-press")).toBe("reset");
		expect(autocompleteInputChangeReason("input-clear")).toBe("reset");
		expect(autocompleteInputChangeReason("none")).toBe("reset");
		expect(autocompleteInputChangeReason("clear-press")).toBe("clear");
		expect(autocompleteInputChangeReason("escape-key")).toBe("clear");
	});

	test("a reason no table knows maps to nothing, and says so once", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		// A reason a future Base UI might add: the types forbid it, so cast as an upgrade would.
		const future = "trigger-swipe" as "none";
		expect(menuCloseReason(future)).toBeUndefined();
		expect(menuCloseReason(future)).toBeUndefined();
		expect(warn).toHaveBeenCalledOnce();
		expect(warn.mock.calls[0]?.[0]).toMatch(
			/"trigger-swipe".*MenuCloseReason/u,
		);
		// Inherited keys aren't reasons either.
		expect(modalCloseReason("toString" as "none")).toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(2);
	});

	test("a reason the table maps to null is a decision, not a warning", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		expect(modalCloseReason("focus-out")).toBeUndefined();
		expect(warn).not.toHaveBeenCalled();
	});
});
