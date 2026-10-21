// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// navigation/Link
export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'color'> {
    /**
     * always: the inline prose link, underlined 3px below the text (.hiw-asof a), the default.
     * hover: the "go" link (.replink, .figure-link): 13px, no underline until a fine-pointer
     * hover (5px offset), a 32px tap target. none: never underlined.
     */
    underline?: 'always' | 'hover' | 'none';
    /** Text colour: color-link, color-ink, color-muted or inherit. Default link for always, ink otherwise. */
    color?: 'link' | 'ink' | 'muted' | 'inherit';
    /**
     * Opens in a new tab: sets target="_blank" and rel="noopener noreferrer", adds the arrow-ne
     * icon and a screen-reader note. Turns on by itself when target="_blank".
     */
    external?: boolean;
    /** Icon after the text, e.g. `<Icon name="arrow-ne" />` on a same-tab "go" link. external adds arrow-ne unless you pass one. */
    endIcon?: React.ReactNode;
    /** The screen-reader note on external links. Default "(opens in a new tab)". */
    newTabLabel?: string;
    /** Render another element, e.g. a router link or "button"; it receives className, href and the rest. */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** The site's links: underlined prose links in color-link, and the "go" links that underline under a pointer. */
export declare const Link: React.ForwardRefExoticComponent<LinkProps & {
    ref?: React.Ref<HTMLAnchorElement> | undefined;
}>;
