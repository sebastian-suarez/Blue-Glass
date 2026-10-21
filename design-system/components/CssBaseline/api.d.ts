// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// utils/CssBaseline
export interface CssBaselineProps {
    children?: React.ReactNode;
}
/** Adds the element resets once per document while mounted; renders its children unchanged. */
export declare function CssBaseline({ children }: CssBaselineProps): React.ReactElement;
