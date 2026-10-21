// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/Chip
export type ChipTone = 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'info';
export interface ChipProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
    /** The text. Keep it to a word or two. */
    label: React.ReactNode;
    /** chip: the site's stack tag (.chip, default). plate: the employer plate (.plate), larger and lifted. */
    variant?: 'chip' | 'plate';
    /** md (default) or sm (.chip-sm). */
    size?: 'sm' | 'md';
    /** A status or accent fill: the *-soft ground with status text. Pair a status with a word or icon. */
    tone?: ChipTone;
    /** An icon before the label (14px; 12px at sm). */
    icon?: React.ReactNode;
    /** An Avatar before the label, shrunk to 20px. Leave its alt off when the label already names it. */
    avatar?: React.ReactNode;
    /** Makes the chip a button. */
    onClick?: React.MouseEventHandler<HTMLElement>;
    /** Hover and press styling without onClick, e.g. inside your own button. */
    clickable?: boolean;
    /** Makes the chip a link. */
    href?: string;
    target?: string;
    rel?: string;
    /** Adds a trailing close button; Backspace or Delete on the chip calls it too. */
    onDelete?: (event: React.SyntheticEvent) => void;
    /** The close button's name. Default "Remove {label}". */
    deleteLabel?: string;
    /** Replace the close glyph. */
    deleteIcon?: React.ReactNode;
    /** Pressed: ink fill with on-ink text. Sets aria-pressed on a button chip (aria-current on a link). */
    selected?: boolean;
    disabled?: boolean;
    /** Element for a static chip. Default span; use "li" inside a list of chips. */
    component?: React.ElementType;
}
/** A compact tag: the site's stack chip, the employer plate, a filter you toggle or a value you remove. */
export declare const Chip: React.ForwardRefExoticComponent<ChipProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
