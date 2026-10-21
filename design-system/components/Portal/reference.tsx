import * as React from 'react';
import * as ReactDOM from 'react-dom';

export interface PortalProps {
  children?: React.ReactNode;
  /** Mount point. Default document.body. */
  container?: Element | (() => Element | null) | null;
  /** Render in place instead. */
  disablePortal?: boolean;
}

function resolve(container: PortalProps['container']): Element | null {
  if (typeof document === 'undefined') return null;
  const node = typeof container === 'function' ? container() : container;
  return node || document.body;
}

/** Render children into another part of the DOM (default document.body). Renders nothing without a DOM. */
export function Portal({ children, container, disablePortal = false }: PortalProps): React.ReactElement | null {
  if (disablePortal) return <>{children}</>;
  const mountNode = resolve(container);
  return mountNode ? ReactDOM.createPortal(children, mountNode) : null;
}
