// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// charts/LineChart
export type LineChartX = string | number | Date;
export interface LineChartSeries {
    /** Names the series in the legend, the end label, the tooltip and the table. */
    label: string;
    /** One value per x position; null breaks the line. */
    data: Array<number | null>;
    /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position. */
    color?: string;
    /** Wash the area under this line at 10% of its hue. */
    area?: boolean;
}
export interface LineChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The x positions: strings (evenly spaced categories), numbers (a linear axis) or Dates (a time axis). */
    x: LineChartX[];
    /** One to four series on one y axis. Two or more get a legend and direct end labels. */
    series: LineChartSeries[];
    /** Wash every series' area at 10% of its hue. Clearest with one series. */
    area?: boolean;
    /** Total height in px, axis band included. */
    height?: number;
    /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
    title: string;
    /** One or two sentences with the takeaway, read as the SVG's desc. Default: a generated summary. */
    description?: string;
    /** The last value at each line's end, after the series name when there are two or more. Default true. */
    endLabels?: boolean;
    /** Formats values in the tooltip, end labels and table. Default: thousands separators. */
    valueFormatter?: (value: number) => string;
    /** Formats y-axis ticks. Default: compact from 1,000 up. */
    tickFormatter?: (value: number) => string;
    /** Formats an x value for ticks, tooltip and table. Default: dates by their spacing ("2024", "March 2024"). */
    xFormatter?: (x: LineChartX, where: 'tick' | 'tooltip') => string;
    /** Fixed y domain. Default: from 0 (or the data's minimum when negative) to a round maximum. */
    yDomain?: [number, number];
    /** Header for the x column of the table. Default "X". */
    xLabel?: string;
    /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
    table?: 'hidden' | 'visible' | 'none';
}
/** Lines for trends: 2px strokes, an optional 10% wash, a crosshair that snaps to the nearest x, one tooltip for every series, direct end labels. */
export declare const LineChart: React.ForwardRefExoticComponent<LineChartProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
