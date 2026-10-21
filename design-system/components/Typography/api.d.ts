// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// data-display/Typography
/** Every type token (tokens.json "type"), named without the `text-` prefix. */
export type TypographyVariant = 'display' | 'title-xl' | 'title-lg' | 'title-md' | 'statement' | 'heading' | 'card-title' | 'title-sm' | 'subtitle' | 'lede' | 'lede-sm' | 'body-lg' | 'body' | 'body-sm' | 'small' | 'caption' | 'micro' | 'nano' | 'button' | 'kicker' | 'label' | 'name' | 'code' | 'diagram-node' | 'diagram-label';
export type TypographyColor = 'inherit' | 'ink' | 'muted' | 'ink-soft' | 'accent' | 'link' | 'blue-deep' | 'danger' | 'warning' | 'success' | 'info';
export interface TypographyProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
    /** The type token to set, without `text-`: display, heading, body, micro, code… Default body. */
    variant?: TypographyVariant;
    /** Render as another element; the variant's look stays. Default from the variant (heading → h2, body → p, micro → span…). */
    component?: React.ElementType;
    /** Text colour token. Default inherit. */
    color?: TypographyColor;
    /** Text alignment. Default inherit. */
    align?: 'inherit' | 'left' | 'center' | 'right' | 'justify';
    /** One line, cut with an ellipsis. */
    noWrap?: boolean;
    /** A bottom margin of half a line (0.5em). The root has no margin otherwise. */
    gutterBottom?: boolean;
    /** Line breaking: balance (default on h1–h6, as the site), pretty (default on p) or plain wrap. */
    textWrap?: 'balance' | 'pretty' | 'wrap';
    /** Use the site's fluid size for the display group, e.g. display = clamp(44px, 5.6vw, 80px). */
    fluid?: boolean;
    children?: React.ReactNode;
}
/** Text set in one of the Blue Glass type tokens, on the element that variant means. */
export declare const Typography: React.ForwardRefExoticComponent<TypographyProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
