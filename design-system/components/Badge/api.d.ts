// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/Badge
export type BadgeTone = 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'info';
export type BadgeAnchor = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** The count or a short word in the pill. Numbers above max show as "max+". */
    badgeContent?: React.ReactNode;
    /** standard: the count pill (18px, 11px text). dot: an 8px dot, no text. */
    variant?: 'standard' | 'dot';
    /** Fill: default is color-ink; accent and the status tones fill under on-ink. Pair a status with a word. */
    tone?: BadgeTone;
    /** Cap for a numeric count. Default 99, shown as "99+". */
    max?: number;
    /** Show the pill when the count is 0 (hidden by default). */
    showZero?: boolean;
    /** Hide the pill; it fades and scales out. */
    invisible?: boolean;
    /** The child's corner the pill sits on. Default top-right. */
    anchor?: BadgeAnchor;
    /** circular pulls the pill in onto a round child such as an Avatar. Default rectangular. */
    overlap?: 'rectangular' | 'circular';
    /**
     * What the badge means, read by screen readers instead of the bare count, e.g. "4 unread".
     * Rendered as visually hidden text after the child; the visible pill is always aria-hidden.
     * Defaults to the visible count. Pass "" when the child's own name already says it.
     */
    label?: string;
    /**
     * The child's full name with the count, e.g. "Messages, 4 unread". Passed through to the child element,
     * so focus on a button reads it; no hidden text is added then.
     */
    'aria-label'?: string;
    /** Render as another element. Default span. */
    component?: React.ElementType;
    /** The element the badge sits on. Without one, the pill renders inline. */
    children?: React.ReactNode;
}
/** A count pill or a dot on a corner of its child: unread messages, pending reviews, presence. */
export declare const Badge: React.ForwardRefExoticComponent<BadgeProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
