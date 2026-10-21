// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// navigation/Breadcrumbs
export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
    /** The trail, in order: Link elements (or router links), with the current page last. */
    children?: React.ReactNode;
    /** Node between crumbs. Default a chevron-right Icon in color-muted, hidden from screen readers. */
    separator?: React.ReactNode;
    /** Collapse the middle of the trail when it has more crumbs than this. Default 8. */
    maxItems?: number;
    /** Crumbs kept before the "…" button when collapsed. Default 1. */
    itemsBeforeCollapse?: number;
    /** Crumbs kept after the "…" button when collapsed. Default 1. */
    itemsAfterCollapse?: number;
    /** Accessible name of the "…" button. Default "Show path". */
    expandText?: string;
    /** Treat the last crumb as the current page: color-ink and aria-current="page". Default true. */
    lastIsCurrent?: boolean;
    /** sm: 12px; md: 13px (text-caption). Default md. */
    size?: 'sm' | 'md';
}
/** The path to the current page, as a list of links; long trails fold into a "…" button. */
export declare const Breadcrumbs: React.ForwardRefExoticComponent<BreadcrumbsProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
