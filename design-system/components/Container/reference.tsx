import * as React from 'react';
import { cx } from '../internal/cx';

export interface ContainerProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * The cap on the content width. wrap: the site's page width (size-wrap, 1180px), the default.
   * header: the header's width (size-header, 1380px). prose: a reading measure (62ch).
   * false: no cap, only the side gutters.
   */
  maxWidth?: 'wrap' | 'header' | 'prose' | false;
  /** Drop the side gutters (5% each side, 6% under 700px) and run edge to edge up to maxWidth. */
  disableGutters?: boolean;
  /** The element to render, e.g. "main" or "section". Default "div". */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** The site's page column (.wrap): centred, min(1180px, 90%) wide, 88% under 700px. */
export const Container = React.forwardRef<HTMLElement, ContainerProps>(function Container(
  { maxWidth = 'wrap', disableGutters = false, component: Component = 'div', className, children, ...rest },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cx(
        'gl-container',
        maxWidth === false ? 'gl-container-uncapped' : maxWidth !== 'wrap' && `gl-container-${maxWidth}`,
        disableGutters && 'gl-container-flush',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});
