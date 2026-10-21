// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// layout/ImageList
export type ImageListVariant = 'standard' | 'quilted' | 'woven' | 'masonry';
export interface ImageListProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * standard: equal cells on a grid. quilted: items span cols and rows. woven: every
     * second item is 70% tall, centred. masonry: CSS columns, each image at its own height.
     */
    variant?: ImageListVariant;
    /** Number of columns. Default 2. */
    cols?: number;
    /** Space between items: a spacing token name ("3xs" … "xl") or 0. Default "xs" (8px). */
    gap?: SpaceValue;
    /** Row height in px, or "auto" to follow the images (standard, quilted, woven). Default "auto". */
    rowHeight?: number | 'auto';
    /**
     * contain: the whole image shows, 12px inside its plate, the default for the brand's diagrams.
     * cover: the image fills the tile edge to edge and may be cropped.
     */
    fit?: 'contain' | 'cover';
    /** The element to render. Default "ul". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A grid of figures. The brand's imagery is diagrams, each in an inset plate. */
export declare const ImageList: React.ForwardRefExoticComponent<ImageListProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ImageListItemProps extends React.HTMLAttributes<HTMLElement> {
    /** Columns the item spans (standard, quilted, woven). Default 1. */
    cols?: number;
    /** Rows the item spans (standard, quilted, woven). Default 1. */
    rows?: number;
    /** The element to render. Default "li". */
    component?: React.ElementType;
    /** An <img> (it gets the fill styles), or any element such as an inline SVG; then an ImageListItemBar. */
    children?: React.ReactNode;
}
/** One tile: an inset plate (glass-inset, glass-edge, radius-control) the image fills. */
export declare const ImageListItem: React.ForwardRefExoticComponent<ImageListItemProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ImageListItemBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    /** The caption's first line: 13px, weight 500. */
    title?: React.ReactNode;
    /** A second line in color-muted. */
    subtitle?: React.ReactNode;
    /** bottom or top: a glass strip over the image. below: plain text under it. Default "bottom". */
    position?: 'bottom' | 'top' | 'below';
    /** An action at the end of the strip, e.g. a link with an arrow-ne icon. */
    actionIcon?: React.ReactNode;
    /** Which side the action sits on. Default "right". */
    actionPosition?: 'left' | 'right';
}
/** The tile's caption: a glass strip (glass-raised, blur-control) with a title and a muted subtitle. */
export declare const ImageListItemBar: React.ForwardRefExoticComponent<ImageListItemBarProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
