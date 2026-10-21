// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/Avatar
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';
export type AvatarVariant = 'circle' | 'tile';
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** Image URL. While it loads the orb shows through; if it fails, the avatar falls back to children, then initials from alt, then the user glyph. */
    src?: string;
    /** Responsive image candidates, as on <img>. */
    srcSet?: string;
    /** Sizes for srcSet, as on <img>. */
    sizes?: string;
    /** The person's or the company's name: the image's alt text, the source of the initials, and the name read for a lettered avatar. */
    alt?: string;
    /** circle: initials on the site's orb gradient (default). tile: the monogram glass tile (.signature). */
    variant?: AvatarVariant;
    /** xs 24px · sm 32px · md 40px, the signature tile's size (default) · lg 56px. */
    size?: AvatarSize;
    /** Which of the site's three orbs the circle uses (.tab-orb, .orb-1, .orb-2). Default: picked from alt, so a name always gets the same orb. */
    orb?: 0 | 1 | 2;
    /** Extra attributes for the <img>, e.g. loading="lazy" or referrerPolicy. */
    imgProps?: React.ImgHTMLAttributes<HTMLImageElement>;
    /** Render as another element. Default span, so an avatar can sit inside a button or a chip. */
    component?: React.ElementType;
    /** Initials or an icon, shown when there is no image. */
    children?: React.ReactNode;
}
/** A person or a company: initials on one of the site's orbs, the monogram glass tile, or a photo. */
export declare const Avatar: React.ForwardRefExoticComponent<AvatarProps & {
    ref?: React.Ref<HTMLSpanElement> | undefined;
}>;
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Most avatars shown, counting the "+N" one. Default 5. */
    max?: number;
    /** The real total when you pass only some of the avatars; the "+N" counts from it. */
    total?: number;
    /** Size of every avatar in the group (an avatar's own size wins). */
    size?: AvatarSize;
    /** Shape of every avatar in the group (an avatar's own variant wins). */
    variant?: AvatarVariant;
    /** Overlap: md, a fifth of the avatar (default), or sm, tighter. */
    spacing?: 'md' | 'sm';
    /** Render the surplus yourself, e.g. a link to the full list. */
    renderSurplus?: (surplus: number) => React.ReactNode;
    /** Render as another element. Default div. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** A row of overlapping avatars, each cut out of the canvas by a 2px ring, with the rest counted as "+N". */
export declare const AvatarGroup: React.ForwardRefExoticComponent<AvatarGroupProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
