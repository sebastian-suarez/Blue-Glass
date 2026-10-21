// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// utils/NoSsr
export interface NoSsrProps {
    children?: React.ReactNode;
    /** Wait one more frame after mount before rendering (heavy children). */
    defer?: boolean;
    /** Rendered until the children mount. */
    fallback?: React.ReactNode;
}
/** Renders its children only in the browser, after mount: for anything that reads window or the DOM. */
export declare function NoSsr({ children, defer, fallback }: NoSsrProps): React.ReactElement;
