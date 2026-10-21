// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// lab/Timeline
export type TimelinePosition = 'left' | 'right' | 'alternate' | 'alternate-reverse';
export interface TimelineProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * Which side the content sits on. right: content right of the line, dates left (default).
     * left: the mirror. alternate / alternate-reverse: sides alternate, and fall back to
     * right under 700px.
     */
    position?: TimelinePosition;
    /**
     * Width of the opposite (date) column, px or a CSS length, for left and right positions
     * (and alternate once it folds under 700px). Default: half the row, as in MUI.
     */
    oppositeWidth?: number | string;
    /** The element to render. Default "ul". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A vertical sequence of events: dots on a hairline, content on one side, dates on the other. */
export declare const Timeline: React.ForwardRefExoticComponent<TimelineProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface TimelineItemProps extends React.HTMLAttributes<HTMLElement> {
    /** The element to render. Default "li". */
    component?: React.ElementType;
    /** TimelineOppositeContent (optional), TimelineSeparator, TimelineContent. */
    children?: React.ReactNode;
}
/** One event: the opposite content, the separator (dot and connector) and the content, in a row. */
export declare const TimelineItem: React.ForwardRefExoticComponent<TimelineItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface TimelineSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
    /** A TimelineDot, then a TimelineConnector (leave the connector off the last item). */
    children?: React.ReactNode;
}
/** The column that holds the dot and the connector. */
export declare const TimelineSeparator: React.ForwardRefExoticComponent<TimelineSeparatorProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface TimelineDotProps extends React.HTMLAttributes<HTMLSpanElement> {
    /**
     * filled: a solid dot (color-ink, or the tone). outlined: a 2px ring (dg-edge, or the tone).
     * orb: the site's glass orb (.tab-orb gradient); accent picks the bluer .orb-1.
     */
    variant?: 'filled' | 'outlined' | 'orb';
    /** State colour. Pair it with a word in the content; colour is never the only signal. */
    tone?: 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'info';
    /** An icon inside the dot (16px); the dot grows to fit it. */
    children?: React.ReactNode;
}
/** The marker on the line. */
export declare const TimelineDot: React.ForwardRefExoticComponent<TimelineDotProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface TimelineConnectorProps extends React.HTMLAttributes<HTMLSpanElement> {
}
/** The hairline between two dots (color-line, 2px). */
export declare const TimelineConnector: React.ForwardRefExoticComponent<TimelineConnectorProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}
/** The event itself: 15px copy; give its title more weight with your own markup. */
export declare const TimelineContent: React.ForwardRefExoticComponent<TimelineContentProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface TimelineOppositeContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
}
/** The other side of the line: the date, at 12px in color-muted (.career-date). */
export declare const TimelineOppositeContent: React.ForwardRefExoticComponent<TimelineOppositeContentProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
