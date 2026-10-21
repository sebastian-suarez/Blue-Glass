// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// inputs/Rating
export interface RatingProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange' | 'defaultValue' | 'children'> {
    /** The rating, controlled; null for none. */
    value?: number | null;
    /** The initial rating, uncontrolled. */
    defaultValue?: number | null;
    /** Called with the event and the new rating; null when the reader presses the current star to clear it. */
    onChange?: (event: React.SyntheticEvent, value: number | null) => void;
    /** Called with the value under the mouse while it hovers, and -1 when it leaves: use it for live feedback. */
    onChangeActive?: (event: React.SyntheticEvent, value: number) => void;
    /** Number of stars. Default 5. */
    max?: number;
    /** The step: 1 for whole stars (default) or 0.5 for half stars. */
    precision?: number;
    /** Display only: no inputs; the stars become one image named by the value ("4 out of 5 stars"). */
    readOnly?: boolean;
    /** Shown but not operable; dimmed. */
    disabled?: boolean;
    /** Star size: sm 18px, md 24px (default), lg 32px. */
    size?: 'sm' | 'md' | 'lg';
    /** The radio inputs' name, for forms; generated when omitted. */
    name?: string;
    /** Visible text beside the stars: the value, or what it means. */
    label?: React.ReactNode;
    /** Accessible text for a value. Default: "4 out of 5 stars". */
    getLabelText?: (value: number) => string;
    /** Accessible text for no rating. Default: "No rating". */
    emptyLabelText?: string;
    /** The root's id; the inputs' ids derive from it. */
    id?: string;
    /** Names the stars (default "Rating"); read-only prefixes it to the value: "VSebCode: 4.5 out of 5 stars". */
    'aria-label'?: string;
    /** Names the stars by another element's id (interactive only). */
    'aria-labelledby'?: string;
    /** Classes on the root. */
    className?: string;
}
/**
 * Stars for a score. Each step is a visually hidden native radio, so arrow keys work as in any radio
 * group; the mouse previews before it commits, and pressing the current star clears it.
 */
export declare const Rating: React.ForwardRefExoticComponent<RatingProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
