import * as React from 'react';
import { cx } from '../internal/cx';
import { useId } from '../internal/hooks';

export interface DividerProps extends React.HTMLAttributes<HTMLElement> {
  /** horizontal (default) or vertical. A vertical divider is one line of text tall unless it's a flexItem. */
  orientation?: 'horizontal' | 'vertical';
  /** full width (default), inset past a list row's icon (42px, or --gl-divider-inset), or middle (16px in from both ends). */
  variant?: 'full' | 'inset' | 'middle';
  /** Stretch a vertical divider to the full height of its flex row. */
  flexItem?: boolean;
  /** Where a label sits: centred between two lines (default) or at the start, the line after it. */
  textAlign?: 'center' | 'left';
  /** Render as another element. Default hr, or div when there is a label. Use "li" inside a List. */
  component?: React.ElementType;
  /** An optional label, set in 12px color-muted. */
  children?: React.ReactNode;
}

/** A 1px color-line hairline that separates content, as the site's rows, strips and footer do. */
export const Divider = React.forwardRef<HTMLElement, DividerProps>(function Divider(
  { orientation = 'horizontal', variant = 'full', flexItem = false, textAlign = 'center', component, className, children, id, ...rest },
  ref,
) {
  const labelId = useId(id ? `${id}-label` : undefined);
  const labelled = children != null && children !== false && children !== '';
  // An hr can't hold a label.
  const Component: React.ElementType = labelled && (component == null || component === 'hr') ? 'div' : component ?? 'hr';
  const vertical = orientation === 'vertical';
  return (
    <Component
      ref={ref}
      id={id}
      role={Component === 'hr' ? undefined : 'separator'}
      aria-orientation={vertical ? 'vertical' : undefined}
      aria-labelledby={labelled ? labelId : undefined}
      className={cx(
        'gl-divider',
        `gl-divider-${orientation}`,
        variant !== 'full' && `gl-divider-${variant}`,
        flexItem && 'gl-divider-flex-item',
        labelled && 'gl-divider-labelled',
        labelled && textAlign === 'left' && 'gl-divider-text-left',
        className,
      )}
      {...rest}
    >
      {labelled ? <span id={labelId} className="gl-divider-label">{children}</span> : null}
    </Component>
  );
});
