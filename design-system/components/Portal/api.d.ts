// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// utils/Portal
export interface PortalProps {
    children?: React.ReactNode;
    /** Mount point. Default document.body. */
    container?: Element | (() => Element | null) | null;
    /** Render in place instead. */
    disablePortal?: boolean;
}
/** Render children into another part of the DOM (default document.body). Renders nothing without a DOM. */
export declare function Portal({ children, container, disablePortal }: PortalProps): React.ReactElement | null;
