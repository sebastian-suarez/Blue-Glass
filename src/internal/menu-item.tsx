"use client";
/**
The two-mode MenuItem, and the standalone MenuList it shares with Menu
(design-system/components/Menu).

Why two modes: Base UI's `Menu.Item` throws "MenuRootContext is missing" outside `Menu.Root`, but
the documented MenuList also stands alone, as an always-visible menu. So a context tells each
MenuItem where it is:
- Inside a Base UI menu (under `BaseMenuItems`, which the Menu port puts inside Base UI's
  `Menu.List`, and `MenuPopupList` inside `Menu.Popup`), it renders `Menu.Item`, or
  `Menu.LinkItem` with `href`. Base UI then owns the roving focus, the arrow keys, Home and End,
  typeahead, wrapping (`loopFocus`) and closing on a choice.
- Inside the standalone `MenuList`, or with no list at all, it renders the reference's own item,
  and `MenuList` owns the roving tab stop and the keys, ported from the reference.

Both modes render the same row: `<li class="gl-option gl-menu-item">` with the icon, label,
second line and end slot, `role="menuitemradio"` and `aria-checked` once `selected` is set, and a
`<li role="separator">` after it with `divider`. With `href` the row is `<a role="menuitem">`
inside `<li role="none" class="gl-menu-item-wrap">`. `dense` comes from the item, else the list.

The documented `onClick(event)` runs on click, Enter or Space in both modes. In a Base UI menu,
calling `event.preventDefault()` keeps the menu open: the adapter then stops Base UI's close
handler (`preventBaseUIHandler`). The item also remembers its React click event
(`rememberReactEvent`), so the menu's close callback gets that same event from
`documentedEvent(details.event, popup)`. A disabled item stays reachable with the arrows but
its `onClick` doesn't run.

`MenuList` here is the reference's, which the Menu module exports as the standalone MenuList:
`autoFocusItem`, `dense`, `disableListWrap`, Up and Down, Home and End, typeahead (a word typed
within 500ms, or one letter repeated to cycle), and Tab leaves it. Its roving tab stop is set
during render (the selected item, else the first enabled one, among the MenuItems it holds
directly), so the server HTML already has one tabbable item and hydration matches it. Items it
can't see while rendering (inside a fragment, or rendered by another component) are each
tabbable until it mounts, so the server HTML can still be tabbed into. Once mounted, the list
keeps the stop where focus last was. Inside a Base UI menu the list is Base UI's (`Menu.List` in
the Menu port, `Menu.Popup` itself in `MenuPopupList`), so `disableListWrap` becomes
`Menu.Root`'s `loopFocus={false}`.

`BaseUiMenu` is the smallest controlled Base UI menu around `MenuPopupList`, enough for this
adapter's tests; the Menu port (src/components/Menu) is the documented one. Its `onClose` gets
`documentedEvent` and `menuCloseReason` from the events adapter.
*/
import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { BaseUIEvent } from "@base-ui/react/types";
import * as React from "react";
import { Icon } from "../components/Icon/Icon.js";
import { cx } from "./cx.js";
import {
	documentedEvent,
	type MenuCloseReason,
	menuCloseReason,
	rememberReactEvent,
} from "./events.js";
import { useForkRef, useId, useIsoLayoutEffect } from "./hooks.js";

export type MenuItemMode = "menu" | "list";

type ListContextValue = {
	mode: "list";
	dense: boolean;
	/**
	Id of the item that holds tabindex 0 (the roving tab stop), once the list has mounted.
	*/
	tabStop: string | undefined;
	/**
	Until then, the position among the list's children of the item that holds it.
	*/
	initialStop: number | undefined;
	autoFocusItem: boolean;
	setTabStop: (id: string) => void;
	/**
	Whether a typeahead word is being typed at this moment (a key event's timeStamp), so Space
	extends it instead of activating. Typeahead reads every time from its key events.
	*/
	isTyping: (at: number) => boolean;
};

type MenuContextValue = { mode: "menu"; dense: boolean };

const MenuItemContext = React.createContext<
	ListContextValue | MenuContextValue | undefined
>(undefined);

/**
Which mode a MenuItem here renders in: "menu" inside a Base UI menu, "list" inside the
standalone MenuList, undefined outside both (it then renders the standalone item).
*/
export function useMenuItemMode(): MenuItemMode | undefined {
	return React.use(MenuItemContext)?.mode;
}

/**
Marks its children as the items of a Base UI menu, so MenuItems render `Menu.Item`. Place it
inside `Menu.Popup`.
*/
export function BaseMenuItems({
	dense = false,
	children,
}: {
	readonly dense?: boolean;
	readonly children?: React.ReactNode;
}) {
	const value = React.useMemo<MenuContextValue>(
		() => ({ mode: "menu", dense }),
		[dense],
	);
	return <MenuItemContext value={value}>{children}</MenuItemContext>;
}

// Each child's position in its MenuList, so the item there can tell it holds the first tab stop.
const ChildIndexContext = React.createContext<number | undefined>(undefined);

/**
The position of the child that holds the tab stop before the list has mounted: the selected
MenuItem, else the first enabled one, else the first. The same rule as the mounted list's, read
from the elements instead of the DOM.
*/
function findInitialStop(children: React.ReactNode): number | undefined {
	let first: number | undefined;
	let firstEnabled: number | undefined;
	let selected: number | undefined;
	// Children.forEach counts positions the way Children.map does below.
	// eslint-disable-next-line @eslint-react/no-children-for-each
	React.Children.forEach(children, (child, index) => {
		if (
			!React.isValidElement<MenuItemProps>(child) ||
			child.type !== MenuItem
		) {
			return;
		}

		first ??= index;
		if (child.props.disabled !== true) {
			firstEnabled ??= index;
		}

		if (child.props.selected === true) {
			selected ??= index;
		}
	});
	return selected ?? firstEnabled ?? first;
}

const itemSelector =
	'[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
const typeaheadMs = 500;

function getItems(list: HTMLElement): HTMLElement[] {
	return [...list.querySelectorAll<HTMLElement>(itemSelector)].filter(
		(element) => element.closest('[role="menu"]') === list,
	);
}

function labelOf(element: HTMLElement): string {
	const label = element.querySelector(".gl-menu-item-label") ?? element;
	return (label.textContent ?? "").trim().toLowerCase();
}

/**
The next item for an arrow key, from the focused one (-1 for none), wrapping unless told not to.
*/
function stepIndex(
	current: number,
	last: number,
	step: 1 | -1,
	isWrapping: boolean,
): number {
	if (current === -1) {
		return step === 1 ? 0 : last;
	}

	const next = current + step;
	if (next >= 0 && next <= last) {
		return next;
	}

	if (!isWrapping) {
		return current;
	}

	return step === 1 ? 0 : last;
}

export type MenuListProps = React.HTMLAttributes<HTMLUListElement> & {
	/**
	Move focus to the selected item, else the first enabled one, when this turns true.
	*/
	autoFocusItem?: boolean;
	/**
	Compact 32px rows for pointer-heavy screens.
	*/
	dense?: boolean;
	/**
	Stop at the first and last item instead of wrapping around.
	*/
	disableListWrap?: boolean;
	children?: React.ReactNode;
	ref?: React.Ref<HTMLUListElement>;
};

/**
A role="menu" list with roving focus (Up and Down, Home and End, typeahead) that stands alone
as an always-visible menu. Ported from the reference.
*/
export function MenuList({
	autoFocusItem = false,
	dense = false,
	disableListWrap = false,
	className,
	onKeyDown,
	children,
	ref,
	...rest
}: MenuListProps) {
	const listRef = React.useRef<HTMLUListElement | null>(null);
	const handleRef = useForkRef(listRef, ref);
	const [tabStop, setTabStop] = React.useState<string | undefined>(undefined);
	const typedRef = React.useRef({ keys: "", at: 0 });

	// The tab stop: where focus last was, else the selected item, else the first enabled one.
	useIsoLayoutEffect(() => {
		const list = listRef.current;
		if (!list) {
			return;
		}

		const items = getItems(list);
		if (
			tabStop !== undefined &&
			items.some((element) => element.id === tabStop)
		) {
			return;
		}

		const initial =
			items.find(
				(element) => element.getAttribute("aria-checked") === "true",
			) ??
			items.find(
				(element) => element.getAttribute("aria-disabled") !== "true",
			) ??
			items[0];
		const next = initial?.id;
		if (next !== tabStop) {
			setTabStop(next);
		}
	});

	// Move focus in once each time autoFocusItem turns true.
	const hasFocusedRef = React.useRef(false);
	React.useEffect(() => {
		if (!autoFocusItem) {
			hasFocusedRef.current = false;
			return;
		}

		const list = listRef.current;
		if (!list || tabStop === undefined || hasFocusedRef.current) {
			return;
		}

		const element = getItems(list).find((item) => item.id === tabStop);
		if (!element) {
			return;
		}

		element.focus({ preventScroll: true });
		hasFocusedRef.current = document.activeElement === element;
	}, [autoFocusItem, tabStop]);

	// The item that typed keys lead to, or undefined when they match nothing.
	const findTyped = (
		event: React.KeyboardEvent<HTMLUListElement>,
		items: HTMLElement[],
		current: number,
	): number | undefined => {
		const typed = typedRef.current;
		if (event.timeStamp - typed.at > typeaheadMs) {
			typed.keys = "";
		}

		typed.at = event.timeStamp;
		// Space alone activates the item.
		if (event.key === " " && typed.keys === "") {
			return undefined;
		}

		typed.keys += event.key.toLowerCase();
		const first = typed.keys[0] ?? "";
		const isRepeated = [...typed.keys].every((key) => key === first);
		const query = isRepeated ? first : typed.keys;
		const from = isRepeated ? current + 1 : Math.max(current, 0);
		for (let offset = 0; offset < items.length; offset++) {
			const index = (from + offset) % items.length;
			if (labelOf(items[index]).startsWith(query)) {
				return index;
			}
		}

		return undefined;
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
		onKeyDown?.(event);
		const list = listRef.current;
		if (!list || event.defaultPrevented) {
			return;
		}

		const items = getItems(list);
		if (items.length === 0) {
			return;
		}

		const current = items.indexOf(document.activeElement as HTMLElement);
		const last = items.length - 1;
		let next: number | undefined;
		switch (event.key) {
			case "ArrowDown": {
				next = stepIndex(current, last, 1, !disableListWrap);
				break;
			}

			case "ArrowUp": {
				next = stepIndex(current, last, -1, !disableListWrap);
				break;
			}

			case "Home": {
				next = 0;
				break;
			}

			case "End": {
				next = last;
				break;
			}

			default: {
				const isModified = event.ctrlKey || event.metaKey || event.altKey;
				if (!isModified && event.key.length === 1) {
					next = findTyped(event, items, current);
				}
			}
		}

		if (next === undefined) {
			return;
		}

		event.preventDefault();
		items[next]?.focus();
	};

	const initialStop = findInitialStop(children);
	const context = React.useMemo<ListContextValue>(
		() => ({
			mode: "list",
			dense,
			tabStop,
			initialStop,
			autoFocusItem,
			setTabStop,
			isTyping: (at) =>
				typedRef.current.keys !== "" && at - typedRef.current.at < typeaheadMs,
		}),
		[dense, tabStop, initialStop, autoFocusItem],
	);

	return (
		<MenuItemContext value={context}>
			<ul
				ref={handleRef}
				// The documented MenuList is a role="menu" <ul>, as in the reference.
				role="menu"
				className={cx(
					"gl-listbox",
					"gl-menu-list",
					dense && "gl-menu-list-dense",
					className,
				)}
				onKeyDown={handleKeyDown}
				{...rest}
			>
				{/* Each item learns its position, for the tab stop the server HTML needs. */}
				{/* eslint-disable-next-line @eslint-react/no-children-map */}
				{React.Children.map(children, (child, index) => (
					<ChildIndexContext value={index}>{child}</ChildIndexContext>
				))}
			</ul>
		</MenuItemContext>
	);
}

export type MenuItemProps = Omit<
	React.HTMLAttributes<HTMLElement>,
	"onClick"
> & {
	/**
	Icon before the label, 16px.
	*/
	icon?: React.ReactNode;
	/**
	A second line under the label, in color-muted.
	*/
	secondary?: React.ReactNode;
	/**
	Trailing slot: a shortcut, a count, or arrow-ne on a link.
	*/
	end?: React.ReactNode;
	/**
	The current choice in a set. Setting it, true or false, makes the item a menuitemradio.
	*/
	selected?: boolean;
	/**
	Can't be chosen; still reachable with the arrows.
	*/
	disabled?: boolean;
	/**
	A hairline separator after this item.
	*/
	divider?: boolean;
	/**
	A 32px row. Inherits the list's dense.
	*/
	dense?: boolean;
	tone?: "default" | "danger";
	/**
	Render the item as a link: <a role="menuitem"> inside <li role="none">.
	*/
	href?: string;
	target?: string;
	rel?: string;
	/**
	Called on click, Enter or Space. A surrounding Menu then closes, unless prevented.
	*/
	onClick?: (event: React.MouseEvent<HTMLElement>) => void;
	children?: React.ReactNode;
	ref?: React.Ref<HTMLElement>;
};

function MenuItemContent({
	icon,
	secondary,
	end,
	selected,
	children,
}: Pick<
	MenuItemProps,
	"icon" | "secondary" | "end" | "selected" | "children"
>) {
	const isSelected = selected === true;
	// The slots render when truthy, as in the reference.
	const hasIcon = Boolean(icon);
	const hasSecondary = Boolean(secondary);
	const hasEnd = isSelected || Boolean(end);
	return (
		<>
			{hasIcon ? <span className="gl-option-icon">{icon}</span> : null}
			<span className="gl-option-text">
				<span className="gl-menu-item-label">{children}</span>
				{hasSecondary ? (
					<span className="gl-option-secondary">{secondary}</span>
				) : null}
			</span>
			{hasEnd ? (
				<span className="gl-option-end">
					{end}
					{isSelected ? <Icon name="check" size={16} /> : null}
				</span>
			) : null}
		</>
	);
}

function itemClassName(
	isDense: boolean,
	tone: MenuItemProps["tone"],
	className: string | undefined,
): string {
	return cx(
		"gl-option",
		"gl-menu-item",
		isDense && "gl-menu-item-dense",
		tone === "danger" && "gl-menu-item-danger",
		className,
	);
}

const separator = <li role="separator" className="gl-menu-separator" />;

// The checked state both modes put on a row.
function checkedState(role: React.AriaRole, selected: boolean | undefined) {
	return {
		"aria-checked": role === "menuitem" ? undefined : selected === true,
		"data-selected": selected === true ? "" : undefined,
	};
}

function itemRole(
	role: React.AriaRole | undefined,
	selected: boolean | undefined,
): React.AriaRole {
	if (role !== undefined) {
		return role;
	}

	return selected === undefined ? "menuitem" : "menuitemradio";
}

// Enter and Space press a row; a link takes only Space here, as Enter follows it natively.
// Space while a typeahead word is being typed extends the word instead.
function pressOnKey(
	event: React.KeyboardEvent<HTMLElement>,
	isLink: boolean,
	isDisabled: boolean,
	isTyping: () => boolean,
): void {
	if (event.defaultPrevented || event.target !== event.currentTarget) {
		return;
	}

	const isSpace = event.key === " ";
	const isActivation = isSpace || (!isLink && event.key === "Enter");
	if (!isActivation || (isSpace && isTyping())) {
		return;
	}

	event.preventDefault();
	if (!isDisabled) {
		event.currentTarget.click();
	}
}

/**
Whether this item holds the list's tab stop: the one the mounted list chose, or before that,
the one it picked during render.
*/
function isTabStop(
	list: ListContextValue | undefined,
	id: string,
	childIndex: number | undefined,
): boolean {
	if (list === undefined) {
		return false;
	}

	return list.tabStop === undefined
		? list.initialStop !== undefined && list.initialStop === childIndex
		: list.tabStop === id;
}

/**
Before the list has mounted, when it couldn't pick an item while rendering (its items sit inside
fragments or other components): every item is tabbable, until the mounted list picks one.
*/
function isUnpicked(list: ListContextValue | undefined): boolean {
	return (
		list !== undefined &&
		list.tabStop === undefined &&
		list.initialStop === undefined
	);
}

/**
The reference's item: a roving tab stop in a standalone MenuList, a plain focusable row alone.
*/
function ListMenuItem({
	icon,
	secondary,
	end,
	selected,
	disabled = false,
	divider = false,
	dense,
	tone = "default",
	href,
	target,
	rel,
	onClick,
	onKeyDown,
	onFocus,
	id: idProp,
	role: roleProp,
	className,
	children,
	ref,
	...rest
}: MenuItemProps) {
	const context = React.use(MenuItemContext);
	const list = context?.mode === "list" ? context : undefined;
	const childIndex = React.use(ChildIndexContext);
	const id = useId(idProp);
	const isDense = dense ?? list?.dense ?? false;
	const role = itemRole(roleProp, selected);
	const isLink = href !== undefined;
	const isStop = isTabStop(list, id, childIndex);
	const isAutoFocusTarget = list !== undefined && isStop && list.autoFocusItem;

	const handleClick = (event: React.MouseEvent<HTMLElement>) => {
		if (disabled) {
			event.preventDefault();
			return;
		}

		onClick?.(event);
	};

	const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
		onKeyDown?.(event);
		pressOnKey(
			event,
			isLink,
			disabled,
			() => list?.isTyping(event.timeStamp) ?? false,
		);
	};

	const handleFocus = (event: React.FocusEvent<HTMLElement>) => {
		onFocus?.(event);
		if (event.target === event.currentTarget) {
			list?.setTabStop(id);
		}
	};

	const attributes = {
		id,
		role,
		tabIndex: list === undefined || isStop || isUnpicked(list) ? 0 : -1,
		className: itemClassName(isDense, tone, className),
		"aria-disabled": disabled || undefined,
		...checkedState(role, selected),
		"data-autofocus": isAutoFocusTarget ? "" : undefined,
		onClick: handleClick,
		onKeyDown: handleKeyDown,
		onFocus: handleFocus,
		...rest,
	};
	const content = (
		<MenuItemContent
			icon={icon}
			secondary={secondary}
			end={end}
			selected={selected}
		>
			{children}
		</MenuItemContent>
	);

	const row = isLink ? (
		<li role="none" className="gl-menu-item-wrap">
			<a
				ref={ref as React.Ref<HTMLAnchorElement>}
				href={disabled ? undefined : href}
				target={target}
				rel={rel}
				{...attributes}
			>
				{content}
			</a>
		</li>
	) : (
		<li ref={ref as React.Ref<HTMLLIElement>} {...attributes}>
			{content}
		</li>
	);

	return (
		<>
			{row}
			{divider ? separator : null}
		</>
	);
}

/**
The item inside a Base UI menu: Menu.Item (or Menu.LinkItem) rendering the same row.
*/
function BaseMenuItem({
	icon,
	secondary,
	end,
	selected,
	disabled = false,
	divider = false,
	dense,
	tone = "default",
	href,
	target,
	rel,
	onClick,
	role: roleProp,
	className,
	children,
	ref,
	...rest
}: MenuItemProps) {
	const context = React.use(MenuItemContext);
	const isDense = dense ?? context?.dense ?? false;
	const role = itemRole(roleProp, selected);
	// Typeahead matches the label, as in the standalone list, when it's plain text.
	const label =
		typeof children === "string" || typeof children === "number"
			? String(children)
			: undefined;

	const handleClick = (event: BaseUIEvent<React.MouseEvent<HTMLElement>>) => {
		if (disabled) {
			event.preventDefault();
			event.preventBaseUIHandler();
			return;
		}

		// Base UI closes the menu in this dispatch; its close callback finds this React event.
		rememberReactEvent(event);
		onClick?.(event);
		// The documented way to keep the menu open: skip Base UI's close handler.
		if (event.defaultPrevented) {
			event.preventBaseUIHandler();
		}
	};

	const shared = {
		role,
		label,
		className: itemClassName(isDense, tone, className),
		...checkedState(role, selected),
		onClick: handleClick,
		...rest,
	};
	const content = (
		<MenuItemContent
			icon={icon}
			secondary={secondary}
			end={end}
			selected={selected}
		>
			{children}
		</MenuItemContent>
	);

	if (href !== undefined) {
		return (
			<>
				<li role="none" className="gl-menu-item-wrap">
					<BaseMenu.LinkItem
						ref={ref}
						closeOnClick
						href={disabled ? undefined : href}
						target={target}
						rel={rel}
						aria-disabled={disabled || undefined}
						{...shared}
					>
						{content}
					</BaseMenu.LinkItem>
				</li>
				{divider ? separator : null}
			</>
		);
	}

	return (
		<>
			<BaseMenu.Item ref={ref} render={<li />} disabled={disabled} {...shared}>
				{content}
			</BaseMenu.Item>
			{divider ? separator : null}
		</>
	);
}

/**
One row of a menu. Inside a Base UI menu it renders Menu.Item; inside the standalone MenuList,
or alone, the reference's roving item. See the module comment.
*/
export function MenuItem(props: MenuItemProps) {
	return useMenuItemMode() === "menu" ? (
		<BaseMenuItem {...props} />
	) : (
		<ListMenuItem {...props} />
	);
}

export type MenuPopupListProps = Omit<
	React.HTMLAttributes<HTMLUListElement>,
	"children"
> & {
	dense?: boolean;
	children?: React.ReactNode;
	ref?: React.Ref<HTMLUListElement>;
};

/**
Base UI's Menu.Popup as the role="menu" list (a <ul>), with its items in "menu" mode. Place it
inside Menu.Positioner.
*/
export function MenuPopupList({
	dense = false,
	className,
	children,
	ref,
	...rest
}: MenuPopupListProps) {
	return (
		<BaseMenu.Popup
			ref={ref as React.Ref<HTMLDivElement>}
			render={<ul />}
			className={cx(
				"gl-listbox",
				"gl-menu-list",
				dense && "gl-menu-list-dense",
				className,
			)}
			{...(rest as React.HTMLAttributes<HTMLDivElement>)}
		>
			<BaseMenuItems dense={dense}>{children}</BaseMenuItems>
		</BaseMenu.Popup>
	);
}

export type BaseUiMenuCloseReason = MenuCloseReason;

export type BaseUiMenuProps = MenuPopupListProps & {
	open: boolean;
	/**
	Called with the documented event and reason: the item's React click event for itemClick, else
	a SyntheticEvent-shaped wrapper (events.ts).
	*/
	onClose?: (event: React.SyntheticEvent, reason: MenuCloseReason) => void;
	/**
	The element the menu is placed against.
	*/
	anchor?: Element | null;
	disableListWrap?: boolean;
};

/**
A controlled Base UI menu around MenuPopupList: the least needed to test MenuItem's "menu"
mode. The Menu port replaces it.
*/
export function BaseUiMenu({
	open,
	onClose,
	anchor,
	disableListWrap = false,
	ref,
	...listProps
}: BaseUiMenuProps) {
	const popupRef = React.useRef<HTMLUListElement | null>(null);
	const handleRef = useForkRef(popupRef, ref);
	return (
		<BaseMenu.Root
			open={open}
			loopFocus={!disableListWrap}
			onOpenChange={(isOpen, details) => {
				const reason = isOpen ? undefined : menuCloseReason(details.reason);
				if (reason !== undefined) {
					onClose?.(
						documentedEvent(details.event, popupRef.current ?? undefined),
						reason,
					);
				}
			}}
		>
			<BaseMenu.Portal>
				<BaseMenu.Positioner anchor={anchor} side="bottom" align="start">
					<MenuPopupList ref={handleRef} {...listProps} />
				</BaseMenu.Positioner>
			</BaseMenu.Portal>
		</BaseMenu.Root>
	);
}
