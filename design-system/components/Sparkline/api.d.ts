// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// charts/Sparkline
export interface SparklineProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** The values, oldest first. */
    data: number[];
    /** line (default) or bar. */
    plotType?: 'line' | 'bar';
    /** Width in px. */
    width?: number;
    /** Height in px, 24–32. */
    height?: number;
    /** What the values are, e.g. "Months using React per year, 2020–2026". Starts the accessible summary. */
    label: string;
    /** Replaces the generated summary (first, last, low and high). */
    summary?: string;
    /** Wash under the line at 10% of the accent. */
    area?: boolean;
    /** The accent for the last point. Default chart-1; the rest is the recessive dg-edge. */
    color?: string;
    /** Formats values in the summary and the hover readout. Default: thousands separators. */
    valueFormatter?: (value: number) => string;
    /** Show the value under the pointer in a small ink pill. Default false: the summary and the number beside it carry the values. */
    showTooltip?: boolean;
}
/** A word-sized trend, 24–32px tall, in the de-emphasis grey with the last point in the accent; fits a table cell or sits beside a number. */
export declare const Sparkline: React.ForwardRefExoticComponent<SparklineProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
