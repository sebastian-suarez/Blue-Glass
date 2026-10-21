// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// surfaces/AppBar
export interface AppBarProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * static: in the flow with no fill, the site's header over the light field (default).
     * sticky: sticks to the top of its scroll container, on glass. fixed: fixed to the
     * viewport (or the nearest transformed ancestor), on glass. Both sit at z-app-bar.
     */
    position?: 'static' | 'sticky' | 'fixed';
    /** Sticky and fixed: lift the bar with a shadow only once its scroll container has scrolled. */
    elevateOnScroll?: boolean;
    /** The element to render. Default "header". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * The page's top bar (.identity-strip's header). Static it is the site's header,
 * transparent over the light field; sticky and fixed put it on glass with blur-control.
 */
export declare const AppBar: React.ForwardRefExoticComponent<AppBarProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ToolbarProps extends React.HTMLAttributes<HTMLElement> {
    /** regular: the site's identity strip, 38px 5% (28px from 1000px down). dense: 12px tall padding, for sticky bars. */
    variant?: 'regular' | 'dense';
    /** Drop the 5% side padding. */
    disableGutters?: boolean;
    /** The element to render. Default "div". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/**
 * The bar's row (.identity-strip): flex, centred items, space-between, 25px
 * gaps, capped at size-header (1380px). It wraps under 700px.
 */
export declare const Toolbar: React.ForwardRefExoticComponent<ToolbarProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
