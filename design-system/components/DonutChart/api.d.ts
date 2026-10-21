// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// charts/DonutChart
export interface DonutChartDatum {
    /** Names the part in the legend, the centre readout and the table. */
    label: string;
    /** A positive amount; zero and negative parts are left out. */
    value: number;
    /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position, then dg-edge. */
    color?: string;
}
export interface DonutChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The parts, in the order they run clockwise from 12 o'clock. Past five, the fifth on fold into Other. */
    data: DonutChartDatum[];
    /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
    title: string;
    /** One or two sentences with the takeaway. Default: every part with its share. */
    description?: string;
    /** Diameter in px. */
    size?: number;
    /** Ring width in px. Default 13% of the diameter. */
    thickness?: number;
    /** Words under the centre figure ("months"). */
    centerLabel?: React.ReactNode;
    /** The centre figure. Default: the formatted total. */
    total?: React.ReactNode;
    /** Formats values in the centre, the legend and the table. Default: thousands separators. */
    valueFormatter?: (value: number) => string;
    /** Name for the folded tail. */
    otherLabel?: string;
    /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
    table?: 'hidden' | 'visible' | 'none';
    /** The highlighted part (controlled): its segment stays full, the others dim, the centre reads it. */
    highlighted?: number | null;
    /** The part highlighted at first (uncontrolled). */
    defaultHighlighted?: number | null;
    /** Called when hover, a tap or the arrow keys move the highlight; null when it clears. */
    onHighlightChange?: (index: number | null) => void;
}
/** Part-to-whole at a glance: up to five segments with 2px gaps, the total in the centre, a legend with values, hover to read one part. */
export declare const DonutChart: React.ForwardRefExoticComponent<DonutChartProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
