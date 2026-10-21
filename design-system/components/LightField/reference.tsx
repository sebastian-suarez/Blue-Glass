import * as React from 'react';
import { cx } from '../internal/cx';

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
export const LightField = React.forwardRef<HTMLDivElement, LightFieldProps>(function LightField({ variant = 'top', className, ...rest }, ref) {
  return (
    <div ref={ref} className={cx('gl-light-field', `gl-light-field-${variant}`, className)} aria-hidden="true" {...rest}>
      <span className="gl-light-ring gl-ring-one" />
      <span className="gl-light-ring gl-ring-two" />
      <span className="gl-light-fold" />
    </div>
  );
});
