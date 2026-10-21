// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// surfaces/Accordion
export interface AccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /** Open (controlled). Pair with onChange. */
    expanded?: boolean;
    /** Open on first render (uncontrolled). */
    defaultExpanded?: boolean;
    /** Called when the summary is pressed, with the requested state. */
    onChange?: (event: React.SyntheticEvent, expanded: boolean) => void;
    /** Dims the row; the summary can't be focused or pressed. */
    disabled?: boolean;
    /** Level of the heading that wraps the summary button. Default 3. */
    headingLevel?: 2 | 3 | 4 | 5 | 6;
    /** Props for the Collapse that reveals the details: timeout ({ enter: 300, exit: 200 } by default), unmountOnExit. */
    TransitionProps?: Partial<Pick<CollapseProps, 'timeout' | 'unmountOnExit' | 'mountOnEnter' | 'onEntered' | 'onExited'>>;
    /** An AccordionSummary first, then the AccordionDetails. */
    children?: React.ReactNode;
}
/**
 * One row of the site's career list (.career-row): a summary button with the
 * plus/minus toggle, its details revealed with Collapse. Stack rows inside an
 * element with class "gl-accordion-surface" for the list's glass surface (.career-surface).
 */
export declare const Accordion: React.ForwardRefExoticComponent<AccordionProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface AccordionSummaryProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Second column, in color-muted (.career-position): a role, a short fact. */
    secondary?: React.ReactNode;
    /** Third column, right-aligned in color-muted (.career-date): a date, a count. */
    meta?: React.ReactNode;
    /** Replace the plus/minus toggle with an icon; it turns 180° when open (use chevron-down). */
    expandIcon?: React.ReactNode;
    /** The row's title (.career-employer): 17px, -0.02em. */
    children?: React.ReactNode;
}
/**
 * The row's header (.career-row summary): a full-width button in a heading,
 * columns for title, secondary and meta, and the plus that turns into a minus.
 */
export declare const AccordionSummary: React.ForwardRefExoticComponent<AccordionSummaryProps & {
    ref?: React.Ref<HTMLButtonElement> | undefined;
}>;
export interface AccordionDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
    /** A small closing line at 11px (.career-description > span), such as the role's location. */
    meta?: React.ReactNode;
    /** Indent the details under the second column (26% on the left), as the site does. Default true; false runs full width. */
    inset?: boolean;
    children?: React.ReactNode;
}
/** The revealed part of a row (.career-description): 14px copy in color-muted, paragraphs 10px apart. */
export declare const AccordionDetails: React.ForwardRefExoticComponent<AccordionDetailsProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface PaneAccordionItem {
    /** Stable id: the React key and the base of the pane's ids. Default: the title, slugified (or the index). */
    id?: string;
    /** The pane's title (.pane-title), 22px. */
    title: React.ReactNode;
    /** The blurb, always visible (.pane-text). */
    text?: React.ReactNode;
    /** Tags revealed when the pane opens (.more > .chips). */
    chips?: React.ReactNode[];
    /** Other content to reveal instead of chips. */
    more?: React.ReactNode;
    /** default: glass-control. alt: fainter glass. accent: the ring-tinted pane with an accent title; one per set. */
    tone?: 'default' | 'alt' | 'accent';
}
export interface PaneAccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
    /** The panes, left to right. */
    items: PaneAccordionItem[];
    /**
     * auto: the site's layout, panes side by side, stacked at 899px and below.
     * horizontal: side by side down to 701px, stacked on phones. vertical: always stacked.
     */
    orientation?: 'auto' | 'horizontal' | 'vertical';
    /** Ids of the open panes (controlled). Panes not listed are closed. */
    open?: string[];
    /** Ids of the panes open on first render (uncontrolled). */
    defaultOpen?: string[];
    /** Called when a pane is pressed, with the ids that are now open. */
    onChange?: (event: React.SyntheticEvent, open: string[]) => void;
    /** Level of the heading around each pane's button. Default 3. */
    headingLevel?: 2 | 3 | 4 | 5 | 6;
}
/**
 * The site's horizontal accordion (.acc): glass panes that widen to 2.6x on
 * hover, focus or press and reveal their chips. Narrow screens and touch get a
 * tap toggle with the chips shown, as scripts/accordion.ts does.
 */
export declare const PaneAccordion: React.ForwardRefExoticComponent<PaneAccordionProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
