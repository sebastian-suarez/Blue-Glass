import { Combobox } from "@base-ui/react/combobox";
import { Dialog } from "@base-ui/react/dialog";
import { Drawer } from "@base-ui/react/drawer";
import { Menu } from "@base-ui/react/menu";
import { Popover } from "@base-ui/react/popover";
import { Select } from "@base-ui/react/select";
import * as React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import {
	autocompleteChangeReason,
	autocompleteCloseReason,
	autocompleteInputChangeReason,
	documentedEvent,
	drawerCloseReason,
	menuCloseReason,
	modalCloseReason,
	rememberReactEvent,
	selectCloseReason,
} from "./events.js";

type Report = {
	callback: "open" | "value" | "input";
	reason: string;
	documented: string | undefined;
	event: React.SyntheticEvent;
	native: Event;
};

let reports: Report[] = [];
const cleanups: Array<() => void> = [];

beforeEach(() => {
	reports = [];
	const warn = vi.spyOn(console, "warn");
	cleanups.push(() => {
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

afterEach(() => {
	for (const cleanup of cleanups.splice(0).toReversed()) {
		cleanup();
	}
});

function report(
	callback: Report["callback"],
	reason: string,
	documented: string | undefined,
	native: Event,
) {
	const element = document.querySelector("[data-popup]") ?? undefined;
	reports.push({
		callback,
		reason,
		documented,
		event: documentedEvent(native, element),
		native,
	});
}

function closeWith<Reason extends string>(
	map: (reason: Reason) => string | undefined,
	setOpen: (isOpen: boolean) => void,
) {
	return (isOpen: boolean, details: { reason: Reason; event: Event }) => {
		if (isOpen) {
			setOpen(true);
			return;
		}

		const documented = map(details.reason);
		report("open", details.reason, documented, details.event);
		if (documented !== undefined) {
			setOpen(false);
		}
	};
}

function reported(
	callback: Report["callback"],
): Array<[string, string | undefined]> {
	return reports
		.filter((entry) => entry.callback === callback)
		.map(({ reason, documented }) => [reason, documented]);
}

function lastClose(): Report {
	const close = reports.findLast(({ callback }) => callback === "open");
	if (!close) {
		throw new Error("Nothing closed");
	}

	return close;
}

async function waitForClose(): Promise<Report> {
	return vi.waitFor(() => lastClose());
}

async function mount(element: React.ReactElement): Promise<void> {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	cleanups.push(() => {
		root.unmount();
		container.remove();
	});
	root.render(element);
	await vi.waitFor(() => {
		expect(document.querySelector("[data-popup]")).not.toBeNull();
	});
}

function popup(): HTMLElement {
	const element = document.querySelector<HTMLElement>("[data-popup]");
	if (!element) {
		throw new Error("The popup isn't open");
	}

	return element;
}

function byText(text: string): HTMLElement {
	const element = [
		...document.querySelectorAll<HTMLElement>("button, [role]"),
	].find((candidate) => candidate.textContent.trim() === text);
	if (!element) {
		throw new Error(`Nothing reads "${text}"`);
	}

	return element;
}

async function pressOutside(): Promise<void> {
	await userEvent.click(document.body, {
		force: true,
		position: { x: 4, y: 4 },
	});
}

function Anchor({ ref }: { ref: React.Ref<HTMLButtonElement> }) {
	return (
		<button
			ref={ref}
			type="button"
			style={{ position: "fixed", left: 300, top: 200 }}
		>
			Anchor
		</button>
	);
}

describe("Popover → ModalCloseReason", () => {
	function Case() {
		const anchorRef = React.useRef<HTMLButtonElement>(null);
		const [open, setOpen] = React.useState(true);
		return (
			<>
				<Anchor ref={anchorRef} />
				<Popover.Root
					open={open}
					onOpenChange={closeWith(modalCloseReason, setOpen)}
				>
					<Popover.Portal>
						<Popover.Positioner anchor={anchorRef}>
							<Popover.Popup data-popup>
								<button type="button">Inside</button>
							</Popover.Popup>
						</Popover.Positioner>
					</Popover.Portal>
				</Popover.Root>
			</>
		);
	}

	test("Escape is escapeKeyDown, the native KeyboardEvent wrapped", async () => {
		await mount(<Case />);
		const element = popup();
		await userEvent.keyboard("{Escape}");
		const close = await waitForClose();
		expect(reported("open")).toEqual([["escape-key", "escapeKeyDown"]]);
		expect(close.native).toBeInstanceOf(KeyboardEvent);
		expect(close.event.nativeEvent).toBe(close.native);
		expect(close.event.currentTarget).toBe(element);
		expect(close.event.target).toBe(close.native.target);
		expect(close.event.type).toBe("keydown");
		expect(close.event.isTrusted).toBe(true);
	});

	test("a press outside is backdropClick, the native MouseEvent wrapped", async () => {
		await mount(<Case />);
		const element = popup();
		await pressOutside();
		const close = await waitForClose();
		expect(reported("open")).toEqual([["outside-press", "backdropClick"]]);
		expect(close.native).toBeInstanceOf(MouseEvent);
		expect(close.event.nativeEvent).toBe(close.native);
		expect(close.event.currentTarget).toBe(element);
	});
});

describe("Dialog → ModalCloseReason", () => {
	function Case() {
		const [open, setOpen] = React.useState(true);
		return (
			<Dialog.Root
				open={open}
				onOpenChange={closeWith(modalCloseReason, setOpen)}
			>
				<Dialog.Portal>
					<Dialog.Backdrop style={{ position: "fixed", inset: 0 }} />
					<Dialog.Popup
						data-popup
						style={{ position: "fixed", left: 300, top: 200, width: 200 }}
					>
						<Dialog.Title>Title</Dialog.Title>
						<button type="button">Inside</button>
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		);
	}

	test("Escape is escapeKeyDown", async () => {
		await mount(<Case />);
		await userEvent.keyboard("{Escape}");
		await waitForClose();
		expect(reported("open")).toEqual([["escape-key", "escapeKeyDown"]]);
	});

	test("a press on the backdrop is backdropClick", async () => {
		await mount(<Case />);
		await pressOutside();
		await waitForClose();
		expect(reported("open")).toEqual([["outside-press", "backdropClick"]]);
	});
});

describe("Menu → MenuCloseReason", () => {
	let clicked: React.MouseEvent | undefined;

	function Case() {
		const anchorRef = React.useRef<HTMLButtonElement>(null);
		const [open, setOpen] = React.useState(true);
		return (
			<>
				<Anchor ref={anchorRef} />
				<Menu.Root
					open={open}
					onOpenChange={closeWith(menuCloseReason, setOpen)}
				>
					<Menu.Portal>
						<Menu.Positioner anchor={anchorRef}>
							<Menu.Popup data-popup>
								<Menu.Item
									onClick={(event) => {
										clicked = event;
										rememberReactEvent(event);
									}}
								>
									Copy link
								</Menu.Item>
								<Menu.Item>Share</Menu.Item>
							</Menu.Popup>
						</Menu.Positioner>
					</Menu.Portal>
				</Menu.Root>
			</>
		);
	}

	test("a choice is itemClick, with the React event our handler saw", async () => {
		await mount(<Case />);
		await userEvent.click(byText("Copy link"));
		const close = await waitForClose();
		expect(reported("open")).toEqual([["item-press", "itemClick"]]);
		expect(clicked).toBeDefined();
		expect(close.event).toBe(clicked);
		expect(close.event.nativeEvent).toBe(close.native);
	});

	test("Escape is escapeKeyDown", async () => {
		await mount(<Case />);
		await userEvent.keyboard("{Escape}");
		await waitForClose();
		expect(reported("open")).toEqual([["escape-key", "escapeKeyDown"]]);
	});

	test("a press outside is backdropClick", async () => {
		await mount(<Case />);
		await pressOutside();
		await waitForClose();
		expect(reported("open")).toEqual([["outside-press", "backdropClick"]]);
	});

	test("Tab out of a menu with its own trigger is tabKeyDown", async () => {
		function WithTrigger() {
			const [open, setOpen] = React.useState(false);
			return (
				<Menu.Root
					open={open}
					onOpenChange={closeWith(menuCloseReason, setOpen)}
				>
					<Menu.Trigger>Actions</Menu.Trigger>
					<Menu.Portal>
						<Menu.Positioner>
							<Menu.Popup data-popup>
								<Menu.Item>Copy link</Menu.Item>
							</Menu.Popup>
						</Menu.Positioner>
					</Menu.Portal>
				</Menu.Root>
			);
		}

		const container = document.createElement("div");
		document.body.append(container);
		const root = createRoot(container);
		cleanups.push(() => {
			root.unmount();
			container.remove();
		});
		root.render(<WithTrigger />);
		await userEvent.click(await vi.waitFor(() => byText("Actions")));
		await vi.waitFor(() => byText("Copy link"));
		await userEvent.keyboard("{ArrowDown}");
		await userEvent.keyboard("{Tab}");
		const close = await waitForClose();
		expect(reported("open")).toEqual([["focus-out", "tabKeyDown"]]);
		expect(close.native).toBeInstanceOf(FocusEvent);
	});

	test("anchored with no trigger, Base UI lets Tab move focus out and stays open", async () => {
		await mount(<Case />);
		await userEvent.keyboard("{ArrowDown}");
		expect(document.activeElement).toBe(byText("Copy link"));
		await userEvent.keyboard("{Tab}");
		await vi.waitFor(() => {
			expect(popup().contains(document.activeElement)).toBe(false);
		});
		expect(reports).toEqual([]);
	});
});

describe("Select → SelectCloseReason", () => {
	function Case() {
		const [open, setOpen] = React.useState(true);
		return (
			<Select.Root
				open={open}
				defaultValue="sm"
				items={{ sm: "Small", md: "Medium" }}
				onOpenChange={closeWith(selectCloseReason, setOpen)}
			>
				<Select.Trigger style={{ position: "fixed", left: 300, top: 200 }}>
					<Select.Value />
				</Select.Trigger>
				<Select.Portal>
					<Select.Positioner alignItemWithTrigger={false}>
						<Select.Popup data-popup>
							<Select.List>
								<Select.Item value="sm">
									<Select.ItemText>Small</Select.ItemText>
								</Select.Item>
								<Select.Item value="md">
									<Select.ItemText>Medium</Select.ItemText>
								</Select.Item>
							</Select.List>
						</Select.Popup>
					</Select.Positioner>
				</Select.Portal>
			</Select.Root>
		);
	}

	function trigger(): HTMLElement {
		const element = document.querySelector<HTMLElement>('[role="combobox"]');
		if (!element) {
			throw new Error("No trigger");
		}

		return element;
	}

	test("a choice is select", async () => {
		await mount(<Case />);
		await userEvent.click(byText("Medium"));
		await waitForClose();
		expect(reported("open")).toEqual([["item-press", "select"]]);
	});

	test("Escape is escapeKeyDown", async () => {
		await mount(<Case />);
		await userEvent.keyboard("{Escape}");
		await waitForClose();
		expect(reported("open")).toEqual([["escape-key", "escapeKeyDown"]]);
	});

	test("a press outside is backdropClick", async () => {
		await mount(<Case />);
		await pressOutside();
		await waitForClose();
		expect(reported("open")).toEqual([["outside-press", "backdropClick"]]);
	});

	test("a press on the trigger is backdropClick, as in the reference", async () => {
		await mount(<Case />);
		await userEvent.click(trigger(), { force: true });
		await waitForClose();
		expect(reported("open")).toEqual([["trigger-press", "backdropClick"]]);
	});

	test("Tab is tabKeyDown", async () => {
		await mount(<Case />);
		await vi.waitFor(() => {
			expect(popup().contains(document.activeElement)).toBe(true);
		});
		await userEvent.keyboard("{Tab}");
		const close = await waitForClose();
		expect(reported("open")).toEqual([["focus-out", "tabKeyDown"]]);
		expect(close.native).toBeInstanceOf(FocusEvent);
	});
});

describe("Drawer → DrawerCloseReason", () => {
	function Case() {
		const [open, setOpen] = React.useState(true);
		return (
			<Drawer.Root
				open={open}
				onOpenChange={closeWith(drawerCloseReason, setOpen)}
			>
				<Drawer.Portal>
					<Drawer.Backdrop style={{ position: "fixed", inset: 0 }} />
					<Drawer.Viewport>
						<Drawer.Popup
							data-popup
							style={{ position: "fixed", left: 300, top: 200, width: 200 }}
						>
							<Drawer.Title>Title</Drawer.Title>
							<Drawer.Close>Close</Drawer.Close>
						</Drawer.Popup>
					</Drawer.Viewport>
				</Drawer.Portal>
			</Drawer.Root>
		);
	}

	test("the close part is closeButton", async () => {
		await mount(<Case />);
		await userEvent.click(byText("Close"));
		await waitForClose();
		expect(reported("open")).toEqual([["close-press", "closeButton"]]);
	});

	test("Escape is escapeKeyDown", async () => {
		await mount(<Case />);
		await userEvent.keyboard("{Escape}");
		await waitForClose();
		expect(reported("open")).toEqual([["escape-key", "escapeKeyDown"]]);
	});

	test("a press on the backdrop is backdropClick", async () => {
		await mount(<Case />);
		await pressOutside();
		await waitForClose();
		expect(reported("open")).toEqual([["outside-press", "backdropClick"]]);
	});
});

const fruits = ["Apple", "Banana", "Cherry"];

describe("Combobox → the Autocomplete reasons", () => {
	function Single() {
		const valueRef = React.useRef<unknown>(null);
		const textRef = React.useRef("");
		return (
			<Combobox.Root
				items={fruits}
				onOpenChange={(isOpen, details) => {
					if (!isOpen) {
						report(
							"open",
							details.reason,
							autocompleteCloseReason(details.reason),
							details.event,
						);
					}
				}}
				onValueChange={(next, details) => {
					const wasRemoved = next === null && valueRef.current !== null;
					valueRef.current = next;
					report(
						"value",
						details.reason,
						autocompleteChangeReason(details.reason, { removed: wasRemoved }),
						details.event,
					);
				}}
				onInputValueChange={(next, details) => {
					if (next === textRef.current) {
						return;
					}

					textRef.current = next;
					report(
						"input",
						details.reason,
						autocompleteInputChangeReason(details.reason),
						details.event,
					);
				}}
			>
				<div style={{ position: "fixed", left: 300, top: 200 }}>
					<Combobox.Input data-popup aria-label="Fruit" />
					<Combobox.Trigger>Open</Combobox.Trigger>
					<Combobox.Clear>Clear</Combobox.Clear>
				</div>
				<Combobox.Portal>
					<Combobox.Positioner>
						<Combobox.Popup>
							<Combobox.List>
								{(item: string) => (
									<Combobox.Item key={item} value={item}>
										{item}
									</Combobox.Item>
								)}
							</Combobox.List>
						</Combobox.Popup>
					</Combobox.Positioner>
				</Combobox.Portal>
			</Combobox.Root>
		);
	}

	function input(): HTMLInputElement {
		const element = document.querySelector<HTMLInputElement>(
			'input[aria-label="Fruit"]',
		);
		if (!element) {
			throw new Error("No input");
		}

		return element;
	}

	async function openList(): Promise<void> {
		await userEvent.click(byText("Open"));
		await vi.waitFor(() => {
			expect(document.querySelector('[role="option"]')).not.toBeNull();
		});
	}

	test("typing, a choice, then the clear button", async () => {
		await mount(<Single />);
		await userEvent.type(input(), "ch");
		await userEvent.click(byText("Cherry"));
		await waitForClose();
		expect(reported("open")).toEqual([["item-press", "selectOption"]]);
		expect(reported("value")).toEqual([["item-press", "selectOption"]]);
		expect(reported("input")).toEqual([
			["input-change", "input"],
			["input-change", "input"],
			["item-press", "reset"],
		]);

		reports = [];
		await userEvent.click(byText("Clear"));
		await vi.waitFor(() => {
			expect(reported("value")).toEqual([["clear-press", "clear"]]);
		});
		expect(reported("input")).toEqual([["clear-press", "clear"]]);
	});

	test("emptying the text clears the value", async () => {
		await mount(<Single />);
		await openList();
		await userEvent.click(byText("Banana"));
		await waitForClose();
		reports = [];
		await userEvent.clear(input());
		await vi.waitFor(() => {
			expect(reported("value")).toEqual([["input-clear", "clear"]]);
		});
		expect(reported("input")).toEqual([["input-change", "input"]]);
		expect(
			reported("open").every(([, documented]) => documented === undefined),
		).toBe(true);
	});

	test("Escape, a press outside and the indicator close with escape, blur and toggleInput", async () => {
		await mount(<Single />);
		await openList();
		await userEvent.keyboard("{Escape}");
		await waitForClose();
		await openList();
		await pressOutside();
		await vi.waitFor(() => {
			expect(reported("open")).toHaveLength(2);
		});
		await openList();
		await userEvent.click(byText("Open"));
		await vi.waitFor(() => {
			expect(reported("open")).toHaveLength(3);
		});
		expect(reported("open")).toEqual([
			["escape-key", "escape"],
			["outside-press", "blur"],
			["trigger-press", "toggleInput"],
		]);
	});

	function Multiple() {
		const countRef = React.useRef(0);
		return (
			<Combobox.Root
				multiple
				items={fruits}
				onValueChange={(next, details) => {
					const wasRemoved = next.length < countRef.current;
					countRef.current = next.length;
					report(
						"value",
						details.reason,
						autocompleteChangeReason(details.reason, { removed: wasRemoved }),
						details.event,
					);
				}}
			>
				<div style={{ position: "fixed", left: 300, top: 200 }}>
					<Combobox.Value>
						{(value: string[]) => (
							<Combobox.Chips>
								{value.map((fruit) => (
									<Combobox.Chip key={fruit} aria-label={fruit}>
										{fruit}
										<Combobox.ChipRemove aria-label={`Remove ${fruit}`}>
											x
										</Combobox.ChipRemove>
									</Combobox.Chip>
								))}
								<Combobox.Input data-popup aria-label="Fruits" />
							</Combobox.Chips>
						)}
					</Combobox.Value>
					<Combobox.Trigger>Open</Combobox.Trigger>
				</div>
				<Combobox.Portal>
					<Combobox.Positioner>
						<Combobox.Popup>
							<Combobox.List>
								{(item: string) => (
									<Combobox.Item key={item} value={item}>
										{item}
									</Combobox.Item>
								)}
							</Combobox.List>
						</Combobox.Popup>
					</Combobox.Positioner>
				</Combobox.Portal>
			</Combobox.Root>
		);
	}

	test("multiple: a press on a chosen option and a chip's remove button remove it", async () => {
		await mount(<Multiple />);
		await openList();
		await userEvent.click(byText("Apple"));
		await userEvent.click(byText("Banana"));
		await userEvent.click(byText("Apple"));
		await vi.waitFor(() => {
			expect(reported("value")).toHaveLength(3);
		});
		const remove = document.querySelector<HTMLElement>(
			'[aria-label="Remove Banana"]',
		);
		if (!remove) {
			throw new Error("No chip for Banana");
		}

		await userEvent.click(remove, { force: true });
		await vi.waitFor(() => {
			expect(reported("value")).toHaveLength(4);
		});
		expect(reported("value")).toEqual([
			["item-press", "selectOption"],
			["item-press", "selectOption"],
			["item-press", "removeOption"],
			["chip-remove-press", "removeOption"],
		]);
	});
});
