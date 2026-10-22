"use client";
/**
Menu, MenuItem and MenuList, ported from design-system/components/Menu/reference.tsx.

Menu runs on Base UI's Menu, anchored to `anchorEl` (src/internal/anchor.ts): `Menu.Popup` is the
glass surface (the ref, a div), Base UI's `Menu.List` is the `role="menu"` list (a <ul> with the
Menu's `id`, named by the anchor's id unless MenuListProps names it), and the items inside are
Base UI's, through the two-mode MenuItem (src/internal/menu-item.tsx). Base UI owns the keys: Up
and Down with wrapping (`loopFocus`, which MenuListProps' `disableListWrap` turns off), Home and
End, typeahead, Enter and Space, and a choice closes it (`itemClick`, with the item's React click
event, unless its onClick called preventDefault).

The reference's Menu is a Popover, so it sits on the same transparent modal layer
(src/internal/popup-layer.tsx), with Popover's flags: an outside press is the backdrop's
(`backdropClick`), Escape is reported from Base UI's (`escapeKeyDown`), and Tab, which Base UI
would let leave an anchored menu, closes it from the surface's keydown with that real event
(`tabKeyDown`), as the reference's MenuList does. Focus returns to where it was before the menu
opened: the button.

Focus moves in to the selected item, else the first enabled one (`autoFocus`, or MenuListProps'
`autoFocusItem`), as the surface starts to enter, so a key pressed right after the opening press
lands on it. With `autoFocus={false}` it goes to the list, and with `disableAutoFocus` it stays
put. Base UI would focus the list a frame later, so Menu.Popup's `initialFocus` is off: Base UI's
source reads it, though its types and docs leave it out.

MenuItem and MenuList are the adapter's: a MenuItem inside a Menu renders Base UI's item, and
inside the standalone MenuList the reference's roving-focus item.
*/
import { Menu as BaseMenu } from "@base-ui/react/menu";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { getFocusable } from "../../internal/dom.js";
import {
	documentedEvent,
	type MenuCloseReason,
	menuCloseReason,
} from "../../internal/events.js";
import { useEventCallback, useForkRef } from "../../internal/hooks.js";
import { BaseMenuItems, type MenuListProps } from "../../internal/menu-item.js";
import { usePopupLayer } from "../../internal/popup-layer.js";
import type { PopoverProps } from "../Popover/Popover.js";
import { Grow } from "../Transitions/Transitions.js";

export type { MenuCloseReason } from "../../internal/events.js";
export {
	type MenuListProps,
	MenuList,
	type MenuItemProps,
	MenuItem,
} from "../../internal/menu-item.js";

export type MenuProps = Omit<
	PopoverProps,
	"onClose" | "padding" | "children"
> & {
	/**
	Called with the reason (backdropClick, escapeKeyDown, itemClick, tabKeyDown). Set open to false
	to close.
	*/
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: MenuCloseReason,
	) => void;
	/**
	Focus the selected item, else the first enabled one, when it opens. Default true.
	*/
	autoFocus?: boolean;
	/**
	Compact 32px rows.
	*/
	dense?: boolean;
	/**
	Id of the role="menu" list, for the button's aria-controls.
	*/
	id?: string;
	/**
	Props for the inner MenuList. aria-labelledby defaults to the anchor's id.
	*/
	MenuListProps?: Partial<MenuListProps>;
	/**
	MenuItems, with separators between groups.
	*/
	children?: React.ReactNode;
};

const itemSelector =
	'[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

/**
Where focus goes as it opens: the selected item, else the first enabled one, else the first; or,
without an item to focus, a marked element, else the list.
*/
function initialFocusTarget(
	list: HTMLElement,
	shouldFocusItem: boolean,
): HTMLElement {
	if (!shouldFocusItem) {
		return (
			list.querySelector<HTMLElement>("[data-autofocus], [autofocus]") ?? list
		);
	}

	const items = [...list.querySelectorAll<HTMLElement>(itemSelector)];
	return (
		items.find((item) => item.getAttribute("aria-checked") === "true") ??
		items.find((item) => item.getAttribute("aria-disabled") !== "true") ??
		items[0] ??
		list
	);
}

// The layer moves focus in, a frame sooner than Menu.Popup's initialFocus would, so that's off.
// Menu.Popup reads it, though its props type leaves it out.
const popupFocusProps: { initialFocus: false } = { initialFocus: false };

/**
A list of actions on a glass popover anchored to the button that opens it, closing on a choice,
an outside press, Escape or Tab.
*/
export function Menu({
	open,
	onClose,
	anchorEl,
	autoFocus = true,
	dense = false,
	id,
	MenuListProps: listOptions,
	placement = "bottom-start",
	offset = 8,
	matchWidth = false,
	keepMounted = false,
	disableAutoFocus = false,
	disableRestoreFocus,
	disableEnforceFocus,
	disableScrollLock,
	disablePortal = false,
	container,
	transitionDuration,
	className,
	style,
	onFocus,
	onKeyDown,
	children,
	ref,
	...rest
}: MenuProps & { ref?: React.Ref<HTMLDivElement> }) {
	const {
		autoFocusItem,
		dense: listDense,
		disableListWrap = false,
		className: listClassName,
		ref: listRefProp,
		...listProps
	} = listOptions ?? {};
	const isDense = listDense ?? dense;
	const shouldFocusItem = autoFocusItem ?? (autoFocus && !disableAutoFocus);
	const listRef = React.useRef<HTMLUListElement | null>(null);
	const handleListRef = useForkRef(listRef, listRefProp);
	// The list's default name: the id of the element the menu is anchored to, as in the reference.
	const anchorId =
		anchorEl !== null &&
		typeof anchorEl === "object" &&
		"id" in anchorEl &&
		anchorEl.id !== ""
			? anchorEl.id
			: undefined;

	const layer = usePopupLayer({
		open,
		anchorEl,
		placement,
		offset,
		matchWidth,
		keepMounted,
		disablePortal,
		container,
		disableAutoFocus,
		disableRestoreFocus,
		disableEnforceFocus,
		disableScrollLock,
		onBackdropClick(event) {
			onClose?.(event, "backdropClick");
		},
		getInitialFocusTarget(surface) {
			if (!shouldFocusItem && disableAutoFocus) {
				return undefined;
			}

			const list = listRef.current;
			return list ? initialFocusTarget(list, shouldFocusItem) : surface;
		},
		getReturnTarget: (surface) =>
			getFocusable(surface)[0] ?? listRef.current ?? surface,
	});
	const handleRef = useForkRef(layer.surfaceRef, ref);

	// `open` stays controlled: every change Base UI asks for is cancelled, and Escape and a choice
	// are reported here. An outside press is the backdrop's to report, and Tab the keydown's below.
	const handleOpenChange = useEventCallback(
		(isOpen: boolean, details: BaseMenu.Root.ChangeEventDetails) => {
			details.cancel();
			const reason = isOpen ? undefined : menuCloseReason(details.reason);
			if (
				(reason === "escapeKeyDown" || reason === "itemClick") &&
				layer.isReporting()
			) {
				if (reason === "escapeKeyDown") {
					details.event.preventDefault();
				}

				onClose?.(
					documentedEvent(details.event, layer.surfaceRef.current ?? undefined),
					reason,
				);
				return;
			}

			details.allowPropagation();
		},
	);

	return (
		<>
			{layer.host}
			<BaseMenu.Root
				open={layer.isPresent}
				modal={false}
				loopFocus={!disableListWrap}
				onOpenChange={handleOpenChange}
			>
				<BaseMenu.Portal {...layer.portalProps}>
					<BaseMenu.Backdrop {...layer.backdropProps} />
					<BaseMenu.Positioner {...layer.positionerProps}>
						<Grow {...layer.transitionProps} timeout={transitionDuration}>
							<BaseMenu.Popup
								ref={handleRef}
								className={cx(
									"gl-popover",
									"gl-popover-pad-sm",
									"gl-menu",
									className,
								)}
								style={{ ...layer.surfaceStyle, ...style }}
								finalFocus={false}
								onFocus={(event) => {
									onFocus?.(event);
									layer.markInside(event);
								}}
								onKeyDown={(event) => {
									onKeyDown?.(event);
									// A menu is one tab stop: Tab closes it, and focus returns to the button.
									if (
										event.key === "Tab" &&
										!event.defaultPrevented &&
										layer.isReporting()
									) {
										event.preventDefault();
										onClose?.(event, "tabKeyDown");
									}
								}}
								{...popupFocusProps}
								{...rest}
							>
								<BaseMenu.List
									ref={handleListRef as React.Ref<HTMLDivElement>}
									render={<ul />}
									id={id}
									aria-labelledby={anchorId}
									{...(listProps as React.HTMLAttributes<HTMLDivElement>)}
									className={cx(
										"gl-listbox",
										"gl-menu-list",
										isDense && "gl-menu-list-dense",
										listClassName,
									)}
								>
									<BaseMenuItems dense={isDense}>{children}</BaseMenuItems>
								</BaseMenu.List>
							</BaseMenu.Popup>
						</Grow>
					</BaseMenu.Positioner>
				</BaseMenu.Portal>
			</BaseMenu.Root>
		</>
	);
}
