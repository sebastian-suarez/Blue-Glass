"use client";
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
	onClose?: (
		event: React.SyntheticEvent | KeyboardEvent,
		reason: MenuCloseReason,
	) => void;
	autoFocus?: boolean;
	dense?: boolean;
	id?: string;
	MenuListProps?: Partial<MenuListProps>;
	children?: React.ReactNode;
};

const itemSelector =
	'[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';

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

const popupFocusProps: { initialFocus: false } = { initialFocus: false };

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
									if (
										event.key !== "Tab" ||
										event.defaultPrevented ||
										!layer.isReporting()
									) {
										return;
									}

									event.preventDefault();
									onClose?.(event, "tabKeyDown");
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
