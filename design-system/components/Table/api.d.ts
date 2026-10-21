// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/Table
export type TableSize = 'md' | 'sm';
export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    /** surface: the site's career list surface (.career-surface), default. plain: only the scroll box. */
    variant?: 'surface' | 'plain';
    /** Cap the height so the body scrolls under a stickyHeader: px or any CSS length. */
    maxHeight?: number | string;
    /** Render as another element. Default div. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * The glass surface a table sits on (.career-surface), scrolling sideways when the table is wider.
 * When it does scroll it joins the tab order, so the keyboard can scroll it too; name it with aria-label.
 */
export declare const TableContainer: React.ForwardRefExoticComponent<TableContainerProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    /** md: 14px rows with room (default). sm: dense 13px rows. */
    size?: TableSize;
    /** Header cells stick to the top of a scrolling TableContainer (give it maxHeight). */
    stickyHeader?: boolean;
    /** Names the table, rendered as its <caption> in 12px color-muted. */
    caption?: React.ReactNode;
    /** Caption above or below the table. Default bottom, like the site's figure captions. */
    captionSide?: 'top' | 'bottom';
    children?: React.ReactNode;
}
/** A data table: 12px muted headers, color-line hairlines between rows, tabular figures for numbers. */
export declare const Table: React.ForwardRefExoticComponent<TableProps & {
    ref?: React.Ref<HTMLTableElement> | undefined;
}>;
export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children?: React.ReactNode;
}
/** The header rows: cells inside render as th scope="col" in the header style. */
export declare const TableHead: React.ForwardRefExoticComponent<TableHeadProps & {
    ref?: React.Ref<HTMLTableSectionElement> | undefined;
}>;
export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children?: React.ReactNode;
}
/** The body rows. */
export declare const TableBody: React.ForwardRefExoticComponent<TableBodyProps & {
    ref?: React.Ref<HTMLTableSectionElement> | undefined;
}>;
export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    /** Highlight the row under a fine pointer (for rows that do something). */
    hover?: boolean;
    /** The raised selected state (glass-raised). Sets aria-selected; also show the state in a cell. */
    selected?: boolean;
    children?: React.ReactNode;
}
/** One row. */
export declare const TableRow: React.ForwardRefExoticComponent<TableRowProps & {
    ref?: React.Ref<HTMLTableRowElement> | undefined;
}>;
export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
    /** Text alignment. Default start; right for numeric cells. */
    align?: 'inherit' | 'left' | 'center' | 'right';
    /** A number: right-aligned, tabular figures. Set it on the column's header cell too. */
    numeric?: boolean;
    /** head or body look. Default from the section: head inside TableHead. */
    variant?: 'head' | 'body';
    /** Override the table's size for this cell. */
    size?: TableSize;
    /** normal, checkbox (tight, for a selection control) or none. */
    padding?: 'normal' | 'checkbox' | 'none';
    /** The column is sorted: sets aria-sort on the header cell. */
    sortDirection?: 'asc' | 'desc' | false;
    /** th or td. Default th in TableHead, td elsewhere; pass "th" for a row header. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A cell: th scope="col" in the head, td in the body, th scope="row" when you ask for a row header. */
export declare const TableCell: React.ForwardRefExoticComponent<TableCellProps & {
    ref?: React.Ref<HTMLTableCellElement> | undefined;
}>;
export interface TableSortLabelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** This column is the sorted one. */
    active?: boolean;
    /** asc (arrow up) or desc (arrow down). Default asc. */
    direction?: 'asc' | 'desc';
    /** No arrow at all on inactive columns, not even under the pointer. */
    hideSortIcon?: boolean;
    children?: React.ReactNode;
}
/**
 * A header label that sorts its column: a button with a direction arrow. Put it in a TableCell
 * with sortDirection so the th carries aria-sort.
 */
export declare const TableSortLabel: React.ForwardRefExoticComponent<TableSortLabelProps & {
    ref?: React.Ref<HTMLButtonElement> | undefined;
}>;
