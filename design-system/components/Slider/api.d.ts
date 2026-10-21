// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/Slider
export interface SliderMark {
    /** Where the mark sits, in the slider's units. */
    value: number;
    /** Text under the mark (12px, color-muted; ink inside the filled range). */
    label?: React.ReactNode;
}
export interface SliderProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange' | 'defaultValue'> {
    /** The value (controlled): a number, or [low, high] for a range with two thumbs. */
    value?: number | number[];
    /** The starting value (uncontrolled). An array makes a range. Default: min. */
    defaultValue?: number | number[];
    /** Called on every change, while dragging too, with the new value and the thumb that moved. */
    onChange?: (event: React.SyntheticEvent, value: number | number[], activeThumb: number) => void;
    /** Called once a drag ends or a key changes the value: the moment to save. */
    onChangeCommitted?: (event: React.SyntheticEvent, value: number | number[]) => void;
    /** Lowest value. Default 0. */
    min?: number;
    /** Highest value. Default 100. */
    max?: number;
    /** Granularity. Default 1. null snaps to the marks only. */
    step?: number | null;
    /** The jump for Page Up/Down and Shift+arrow. Default 10 steps. */
    shiftStep?: number;
    /** true puts a dot at every step; an array places labelled marks. */
    marks?: boolean | SliderMark[];
    /** Default horizontal. Vertical fills its parent's height, so give the parent one. */
    orientation?: 'horizontal' | 'vertical';
    /** Dims to 50%; no pointer or keyboard changes. */
    disabled?: boolean;
    /** Which part is filled in color-blue: up to the value (normal), from it (inverted), or none. */
    track?: 'normal' | 'inverted' | false;
    /** The ink value pill over the thumb: auto shows it while dragging, hovered or keyboard-focused; on always; off never. */
    valueLabelDisplay?: 'auto' | 'on' | 'off';
    /** Format the value pill, e.g. (v) => `${v} ms`. A returned string also becomes aria-valuetext. */
    valueLabelFormat?: string | ((value: number, index: number) => React.ReactNode);
    /** The text a screen reader says for a value, e.g. "120 milliseconds". */
    getAriaValueText?: (value: number, index: number) => string;
    /** Names each thumb of a range, e.g. (i) => (i ? 'Highest' : 'Lowest'). */
    getAriaLabel?: (index: number) => string;
    /** Form field name: one hidden input per thumb. */
    name?: string;
}
/**
 * A slider on a 4px pill track (color-line rail, color-blue fill, a white thumb
 * with the dg-edge edge, an ink value pill) for one value or a range, with marks,
 * steps, a vertical orientation, pointer capture and the APG slider keyboard.
 */
export declare const Slider: React.ForwardRefExoticComponent<SliderProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
