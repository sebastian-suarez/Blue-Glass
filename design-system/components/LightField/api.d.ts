// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// surfaces/LightField
export interface LightFieldProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * The site's placements: top (behind the hero), middle (behind a long section),
     * bottom (behind the contact slab). compact fits any box: an addition for
     * dialogs, cards and previews.
     */
    variant?: 'top' | 'middle' | 'bottom' | 'compact';
}
/**
 * The blurred rings and fold the glass sits on (src/components/LightField.tsx).
 * Decorative only. Put it first inside a container with position: relative,
 * isolation: isolate and overflow: clip; it paints behind that container's content.
 */
export declare const LightField: React.ForwardRefExoticComponent<LightFieldProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
