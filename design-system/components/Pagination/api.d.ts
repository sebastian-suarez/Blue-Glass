// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// navigation/Pagination
export type PaginationItemType = 'page' | 'first' | 'last' | 'next' | 'previous' | 'start-ellipsis' | 'end-ellipsis';
/** What Pagination hands renderItem for each item; spread it onto a PaginationItem. */
export interface PaginationRenderItemParams {
    type: PaginationItemType;
    page: number | null;
    selected: boolean;
    disabled: boolean;
    size: 'sm' | 'md';
    variant: 'glass' | 'text';
    'aria-label'?: string;
    'aria-current'?: 'page';
    onClick: (event: React.MouseEvent<HTMLElement>) => void;
}
export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
    /** Number of pages. Default 1. */
    count?: number;
    /** The current page, 1-based (controlled). */
    page?: number;
    /** The current page when uncontrolled. Default 1. */
    defaultPage?: number;
    /** Called with the event and the new page. */
    onChange?: (event: React.SyntheticEvent, page: number) => void;
    /** Pages shown on each side of the current one. Default 1. */
    siblingCount?: number;
    /** Pages always shown at each end. Default 1. */
    boundaryCount?: number;
    /** Disable every item. */
    disabled?: boolean;
    /** Add a first-page button. */
    showFirstButton?: boolean;
    /** Add a last-page button. */
    showLastButton?: boolean;
    /** Drop the previous-page button. */
    hidePrevButton?: boolean;
    /** Drop the next-page button. */
    hideNextButton?: boolean;
    /** glass: chip pills (glass-control with the chip hairline), the default. text: no fill until hover. */
    variant?: 'glass' | 'text';
    /** md: 36px pills; sm: 28px. Default md. */
    size?: 'sm' | 'md';
    /** Accessible name of each item. Default "Go to page 4", "Page 3" for the current one, "Go to next page". */
    getItemAriaLabel?: (type: PaginationItemType, page: number | null, selected: boolean) => string;
    /** Render each item yourself, e.g. `<PaginationItem {...item} href={…} />` for links. */
    renderItem?: (item: PaginationRenderItemParams) => React.ReactNode;
}
export interface PaginationItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
    /** A page, a step button (first, previous, next, last) or an ellipsis. Default page. */
    type?: PaginationItemType;
    /** The page the item goes to; null for an ellipsis. */
    page?: number | null;
    /** The current page: the color-ink pill with on-ink text. Pair it with aria-current="page". */
    selected?: boolean;
    disabled?: boolean;
    /** glass (default) or text, as on Pagination. */
    variant?: 'glass' | 'text';
    /** md (36px, default) or sm (28px). */
    size?: 'sm' | 'md';
    /** Render a link instead of a button. */
    href?: string;
    /** Render a router link component instead; it receives href and className. */
    component?: React.ElementType;
}
/** One pill in a Pagination: a page, a previous/next/first/last chevron, or a non-interactive ellipsis. */
export declare const PaginationItem: React.ForwardRefExoticComponent<PaginationItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
/** Page links as a row of pills, the current page in ink; folds long ranges with ellipses (MUI's algorithm). */
export declare const Pagination: React.ForwardRefExoticComponent<PaginationProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
