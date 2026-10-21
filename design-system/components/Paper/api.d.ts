// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// surfaces/Paper
export interface PaperProps extends React.HTMLAttributes<HTMLElement> {
    /**
     * glass: the frosted panel (.glass-panel), the default.
     * inset: a well inside a panel (.project-figure).
     * solid: glass-solid, no blur, for surfaces stacked on glass.
     * outlined: transparent with a hairline.
     */
    variant?: 'glass' | 'inset' | 'solid' | 'outlined';
    /** Shadow depth: 0 none, 1 shadow-pane, 2 shadow-panel (glass default). */
    elevation?: 0 | 1 | 2;
    /** Corner radius token. Default radius-panel for glass and solid, radius-well for inset, radius-pane for outlined. */
    radius?: 'panel' | 'pane' | 'well' | 'control' | 'none';
    /** Render as another element, e.g. "section" or "figure". */
    component?: React.ElementType;
    children?: React.ReactNode;
}
/** The surface every panel is cut from: translucent white over the light field, blurred, with a top highlight. */
export declare const Paper: React.ForwardRefExoticComponent<PaperProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
