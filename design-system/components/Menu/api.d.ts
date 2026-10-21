// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// navigation/Menu
export type MenuCloseReason = 'backdropClick' | 'escapeKeyDown' | 'itemClick' | 'tabKeyDown';
export interface MenuListProps extends React.HTMLAttributes<HTMLUListElement> {
    /** Move focus to the selected item, else the first enabled one, when this turns true. Menu sets it on open. */
    autoFocusItem?: boolean;
    /** Compact 32px rows for pointer-heavy screens. */
    dense?: boolean;
    /** Stop at the first and last item instead of wrapping around. */
    disableListWrap?: boolean;
    /** MenuItems, with separators between groups (`divider` on an item, or `<li role="separator" />`). */
    children?: React.ReactNode;
}
/** A role="menu" list with roving focus (Up and Down, Home and End, typeahead) that Menu renders, or that stands alone as an always-visible menu. */
export declare const MenuList: React.ForwardRefExoticComponent<MenuListProps & {
    ref?: React.Ref<HTMLUListElement> | undefined;
}>;
export interface MenuItemProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
    /** Icon before the label, 16px. */
    icon?: React.ReactNode;
    /** A second line under the label, in color-muted. */
    secondary?: React.ReactNode;
    /** Trailing slot: a shortcut ("⌘C"), a count, or arrow-ne on a link. Pair a shortcut with aria-keyshortcuts. */
    end?: React.ReactNode;
    /** The current choice in a set: the raised row, a check and aria-checked. Setting it, true or false, makes the item a menuitemradio. */
    selected?: boolean;
    /** Can't be chosen; still reachable with the arrows, as APG recommends, and announced as dimmed. */
    disabled?: boolean;
    /** A hairline separator after this item. */
    divider?: boolean;
    /** A 32px row. Inherits the list's dense. */
    dense?: boolean;
    /** danger for destructive items ("Delete"). */
    tone?: 'default' | 'danger';
    /** Render the item as a link: <a role="menuitem"> inside <li role="none">. */
    href?: string;
    /** Link target, with href. */
    target?: string;
    /** Link rel, with href. */
    rel?: string;
    /** Called on click, Enter or Space. The surrounding Menu then closes, unless you call event.preventDefault(). */
    onClick?: (event: React.MouseEvent<HTMLElement>) => void;
    /** The label. */
    children?: React.ReactNode;
}
/** One row of a menu on the shared option row: an icon, a label with an optional second line, and an end slot. */
export declare const MenuItem: React.ForwardRefExoticComponent<MenuItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface MenuProps extends Omit<PopoverProps, 'onClose' | 'padding' | 'children'> {
    /** Called with the reason (backdropClick, escapeKeyDown, itemClick, tabKeyDown). Set open to false to close. */
    onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: MenuCloseReason) => void;
    /** Focus the selected item, else the first enabled one, when it opens. Default true. */
    autoFocus?: boolean;
    /** Compact 32px rows. */
    dense?: boolean;
    /** Id of the role="menu" list, for the button's aria-controls. */
    id?: string;
    /** Props for the inner MenuList. aria-labelledby defaults to the anchor's id. */
    MenuListProps?: Partial<MenuListProps>;
    /** MenuItems, with separators between groups. */
    children?: React.ReactNode;
}
/** A list of actions on a glass popover anchored to the button that opens it, closing on a choice, an outside press, Escape or Tab. */
export declare const Menu: React.ForwardRefExoticComponent<MenuProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
