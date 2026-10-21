// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/Icon
/**
 * Glyphs on a 24-unit grid, 1.5 stroke, round caps and joins: the spec of the
 * site's one icon, the north-east arrow (src/components/Icons.tsx), which is
 * `arrow-ne` here verbatim. Every other glyph is drawn to match it.
 */
type Part = {
    d: string;
    fill?: boolean;
} | {
    c: [number, number, number];
    fill?: boolean;
} | {
    r: [number, number, number, number, number];
    fill?: boolean;
};
export declare const GLYPHS: Record<string, Part[]>;
export type IconName = keyof typeof GLYPHS;
export declare const iconNames: IconName[];
export interface SvgIconProps extends React.SVGProps<SVGSVGElement> {
    /** Box size in px. Default 18 (the site's .icon). */
    size?: number | string;
    /** Accessible name. Without it the icon is decorative (aria-hidden). */
    title?: string;
    /** Stroke width on the 24-unit grid. Default 1.5. */
    strokeWidth?: number;
    viewBox?: string;
    children?: React.ReactNode;
}
/** The SVG shell every glyph uses: currentColor stroke, round caps and joins. */
export declare const SvgIcon: React.ForwardRefExoticComponent<SvgIconProps & {
    ref?: React.Ref<SVGSVGElement> | undefined;
}>;
export interface IconProps extends Omit<SvgIconProps, 'children'> {
    /** Glyph name, e.g. "arrow-ne", "check", "chevron-down". See iconNames. */
    name: IconName | string;
    /** Fill closed shapes (a filled star in Rating). */
    filled?: boolean;
}
/** A named glyph from the Blue Glass set. */
export declare const Icon: React.ForwardRefExoticComponent<IconProps & {
    ref?: React.Ref<SVGSVGElement> | undefined;
}>;
