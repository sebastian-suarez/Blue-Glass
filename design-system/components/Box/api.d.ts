// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// layout/Box
/** Spacing token names: tokens.json `space-*`, e.g. "lg" is var(--space-lg), 24px. */
export type SpaceToken = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'section-sm' | 'section';
/** A spacing token name, or 0 for none. */
export type SpaceValue = SpaceToken | 0;
export interface BoxProps extends React.HTMLAttributes<HTMLElement> {
    /** The element to render, e.g. "section", "ul", "article", "figure". Default "div". */
    component?: React.ElementType;
    /** Padding on every side: a spacing token name ("xs" … "section"), or 0. */
    p?: SpaceValue;
    /** Padding top; wins over py and p. */
    pt?: SpaceValue;
    /** Padding right; wins over px and p. */
    pr?: SpaceValue;
    /** Padding bottom; wins over py and p. */
    pb?: SpaceValue;
    /** Padding left; wins over px and p. */
    pl?: SpaceValue;
    /** Padding left and right; wins over p. */
    px?: SpaceValue;
    /** Padding top and bottom; wins over p. */
    py?: SpaceValue;
    /** Margin on every side: a spacing token name, 0, or "auto". */
    m?: SpaceValue | 'auto';
    /** Margin top; wins over my and m. */
    mt?: SpaceValue | 'auto';
    /** Margin right; wins over mx and m. */
    mr?: SpaceValue | 'auto';
    /** Margin bottom; wins over my and m. */
    mb?: SpaceValue | 'auto';
    /** Margin left; wins over mx and m. */
    ml?: SpaceValue | 'auto';
    /** Margin left and right; "auto" centres a box that has a width. Wins over m. */
    mx?: SpaceValue | 'auto';
    /** Margin top and bottom; wins over m. */
    my?: SpaceValue | 'auto';
    /** Gap between children (flex or grid display): a spacing token name, or 0. */
    gap?: SpaceValue;
    /** Gap between rows; wins over gap. */
    rowGap?: SpaceValue;
    /** Gap between columns; wins over gap. */
    columnGap?: SpaceValue;
    /** CSS display. */
    display?: 'block' | 'inline' | 'inline-block' | 'flex' | 'inline-flex' | 'grid' | 'inline-grid' | 'contents' | 'none';
    children?: React.ReactNode;
}
/** A plain element with spacing on the token scale: padding, margin and gap by token name, plus display. */
export declare const Box: React.ForwardRefExoticComponent<BoxProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
