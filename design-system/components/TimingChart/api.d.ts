// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// charts/TimingChart
/** Before/after bars. Values in one unit (the site's are milliseconds); the axis is linear so the gap reads true. */
export interface TimingData {
    /** Names the dataset (kept on the root as data-chart). */
    id: string;
    /** Accessible name. */
    label: string;
    /** One or two sentences with the numbers, read by screen readers as the SVG's desc. */
    description: string;
    /** Right end of the axis, in the data's unit. */
    axisMax: number;
    /** Axis ticks: a value and its text ("2 s"). */
    ticks: Array<{
        value: number;
        text: string;
    }>;
    /** One bar per row: its name, value, the text at its tip, and muted or accent. */
    rows: Array<{
        name: string;
        value: number;
        text: string;
        tone?: 'muted' | 'accent';
    }>;
}
export interface TimingChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    /** Class names for the root element, merged with the component's own. */
    className?: string;
    /** Inline styles for the root element. */
    style?: React.CSSProperties;
    /** Rows, axis and accessible text. Two rows is the site's layout; more rows stack the same way. */
    data: TimingData;
    /** Floor for the scale: below `820 × minScale` px the host scrolls sideways (the site uses 0.6). */
    minScale?: number;
    /** Grow the bars in when the chart scrolls into view. Default true. */
    reveal?: boolean;
}
/** The site's before/after timing bars on a linear axis, styled and revealed like the diagrams. */
export declare const TimingChart: React.ForwardRefExoticComponent<TimingChartProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
