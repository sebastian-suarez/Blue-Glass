// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/List
export interface ListProps extends React.HTMLAttributes<HTMLElement> {
    /** Compact rows: 32px instead of 40px, 13px text. Passed down to every row. */
    dense?: boolean;
    /** A color-line hairline between rows, as the site's career list (.career-row). */
    divided?: boolean;
    /** A ListSubheader (or any node) rendered first. */
    subheader?: React.ReactNode;
    /** Render as another element. Default ul; use "ol" for an ordered list. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A vertical list of rows: static rows like the site's career list, or interactive rows on the shared option row. */
export declare const List: React.ForwardRefExoticComponent<ListProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ListItemProps extends React.HTMLAttributes<HTMLElement> {
    /** End slot: meta text, a chip or an action button. On a row that holds a ListItemButton it sits over the row's end. */
    secondaryAction?: React.ReactNode;
    /** A hairline under this row. */
    divider?: boolean;
    /** Compact row. Default from the List. */
    dense?: boolean;
    /** No padding. Automatic when the item holds a ListItemButton. */
    disablePadding?: boolean;
    /** No side padding: the row lines up with its surface's padding, as the career list does. */
    disableGutters?: boolean;
    /** center (default), or flex-start for rows whose text runs to several lines. */
    alignItems?: 'center' | 'flex-start';
    /** Render as another element. Default li. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** One static row: an icon, primary and secondary text, and an end slot. */
export declare const ListItem: React.ForwardRefExoticComponent<ListItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ListItemButtonProps extends React.HTMLAttributes<HTMLElement> {
    /** The raised state of the site's selected tab. A button gets aria-pressed, a link aria-current="page". */
    selected?: boolean;
    disabled?: boolean;
    /** Compact row. Default from the List. */
    dense?: boolean;
    /** Render a link instead of a button. */
    href?: string;
    target?: string;
    rel?: string;
    /** End slot inside the row: a count, a shortcut, a chevron. */
    end?: React.ReactNode;
    /** center (default), or flex-start for multi-line rows. */
    alignItems?: 'center' | 'flex-start';
    /** Focus the row on mount. */
    autoFocus?: boolean;
    type?: 'button' | 'submit' | 'reset';
    /** Render as another element. Default button, or a when href is set. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * An interactive row on the shared option row (.gl-option, the side selector's tab):
 * hover, focus ring, press and the raised selected state. Inside a List it brings its own <li>.
 */
export declare const ListItemButton: React.ForwardRefExoticComponent<ListItemButtonProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ListItemIconProps extends React.HTMLAttributes<HTMLSpanElement> {
    children?: React.ReactNode;
}
/** The leading icon (or small avatar) of a row, in color-muted; color-ink on a selected row. */
export declare const ListItemIcon: React.ForwardRefExoticComponent<ListItemIconProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface ListItemTextProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** The main line, in the row's ink. Children work too. */
    primary?: React.ReactNode;
    /** A second line in 12px color-muted. */
    secondary?: React.ReactNode;
    /** Indent to line up with rows that have an icon. */
    inset?: boolean;
    /** Keep each line to one, cut with an ellipsis. */
    noWrap?: boolean;
    children?: React.ReactNode;
}
/** A row's text: primary over an optional muted secondary line. */
export declare const ListItemText: React.ForwardRefExoticComponent<ListItemTextProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface ListSubheaderProps extends React.HTMLAttributes<HTMLElement> {
    /** Indent to line up with text after an icon. */
    inset?: boolean;
    /** Stick to the top of a scrolling list, on glass-solid. */
    sticky?: boolean;
    /** Render as another element. Default li. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A group label inside a list: 12px, weight 600, color-muted (.gl-option-group). */
export declare const ListSubheader: React.ForwardRefExoticComponent<ListSubheaderProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
