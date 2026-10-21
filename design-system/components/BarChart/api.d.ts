// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// charts/BarChart
export interface BarChartSeries {
    /** Names the series in the legend, the tooltip and the table. */
    label: string;
    /** One value per category, in category order; null leaves the slot empty. */
    data: Array<number | null>;
    /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position. */
    color?: string;
}
export interface BarChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The category names, one per bar group (years, employers, endpoints). */
    categories: string[];
    /** One to four series. Two or more get a legend and grouped bars with 2px gaps. */
    series: BarChartSeries[];
    /** vertical: columns rising from the baseline. horizontal: bars running right; better for long names. */
    layout?: 'vertical' | 'horizontal';
    /** Total height in px. Default 260 for columns; horizontal bars size to their rows. */
    height?: number;
    /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
    title: string;
    /** One or two sentences with the takeaway, read as the SVG's desc. Default: a generated range summary. */
    description?: string;
    /** Values printed at the bar ends: none, every bar (value), or each series' largest (max). */
    barLabel?: 'none' | 'value' | 'max';
    /** Formats values in labels, tooltips and the table. Default: thousands separators. */
    valueFormatter?: (value: number) => string;
    /** Formats axis ticks. Default: compact from 1,000 up (1K, 2K). */
    tickFormatter?: (value: number) => string;
    /** Header for the category column of the table. Default "Category". */
    categoryLabel?: string;
    /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
    table?: 'hidden' | 'visible' | 'none';
}
/** Bars and columns for comparing magnitude: baseline-anchored, 4px rounded data ends, a recessive axis, a hover tooltip and a table twin. */
export declare const BarChart: React.ForwardRefExoticComponent<BarChartProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
