// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// feedback/Progress
export interface LinearProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
    /** determinate: a bar for value. buffer: value plus valueBuffer. indeterminate (default): a bar slides while the length is unknown. */
    variant?: 'determinate' | 'indeterminate' | 'buffer';
    /** Progress from 0 to 100 (determinate and buffer). */
    value?: number;
    /** How much is ready ahead of value, 0 to 100 (buffer), drawn in color-ring at 40%. */
    valueBuffer?: number;
    /** Visible label above the track; it also names the progressbar. */
    label?: React.ReactNode;
    /** A readable value shown at the end of the label row and read as aria-valuetext ("3 of 5 files"). */
    valueText?: string;
    /** Show the rounded percentage at the end of the label row (determinate and buffer). */
    showValue?: boolean;
    /** default: color-blue on a color-line track. inherit: currentColor, for dark grounds. */
    color?: 'default' | 'inherit';
}
/** A 4px pill track in color-line with a color-blue bar: determinate, buffered, or sliding while the length is unknown. */
export declare const LinearProgress: React.ForwardRefExoticComponent<LinearProgressProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
export interface CircularProgressProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
    /** determinate: an arc for value. indeterminate (default): a turning arc that grows and shrinks. */
    variant?: 'determinate' | 'indeterminate';
    /** Progress from 0 to 100 (determinate). */
    value?: number;
    /** xs 20px, sm 28px, md 40px (default), lg 56px, or a number of px. */
    size?: 'xs' | 'sm' | 'md' | 'lg' | number;
    /** Ring stroke in px. Default 2.5, 3, 4 or 4.5 by size. */
    thickness?: number;
    /** Show the rounded percentage in the middle (determinate, 40px and up). */
    showValue?: boolean;
    /** default: color-blue on a color-line ring. inherit: currentColor, for dark grounds. */
    color?: 'default' | 'inherit';
}
/** An SVG ring: color-line track and a color-blue arc with round caps; determinate, or turning while the length is unknown. */
export declare const CircularProgress: React.ForwardRefExoticComponent<CircularProgressProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
