"use client";
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
	tabStop: string | undefined;
	initialStop: number | undefined;
	autoFocusItem: boolean;
	setTabStop: (id: string) => void;
	isTyping: (at: number) => boolean;
};

type MenuContextValue = { mode: "menu"; dense: boolean };

const MenuItemContext = React.createContext<
	ListContextValue | MenuContextValue | undefined
>(undefined);

export function useMenuItemMode(): MenuItemMode | undefined {
	return React.use(MenuItemContext)?.mode;
}

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

const ChildIndexContext = React.createContext<number | undefined>(undefined);

function findInitialStop(children: React.ReactNode): number | undefined {
	let first: number | undefined;
	let firstEnabled: number | undefined;
	let selected: number | undefined;
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
	autoFocusItem?: boolean;
	dense?: boolean;
	disableListWrap?: boolean;
	children?: React.ReactNode;
	ref?: React.Ref<HTMLUListElement>;
};

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
	icon?: React.ReactNode;
	secondary?: React.ReactNode;
	end?: React.ReactNode;
	selected?: boolean;
	disabled?: boolean;
	divider?: boolean;
	dense?: boolean;
	tone?: "default" | "danger";
	href?: string;
	target?: string;
	rel?: string;
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

function isUnpicked(list: ListContextValue | undefined): boolean {
	return (
		list !== undefined &&
		list.tabStop === undefined &&
		list.initialStop === undefined
	);
}

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

		rememberReactEvent(event);
		onClick?.(event);
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
	onClose?: (event: React.SyntheticEvent, reason: MenuCloseReason) => void;
	anchor?: Element | null;
	disableListWrap?: boolean;
};

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
