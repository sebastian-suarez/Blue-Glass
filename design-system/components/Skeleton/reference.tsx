import * as React from 'react';
import { cx } from '../internal/cx';

const toCss = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v);

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** text: one line at the current font size (default). rectangular: square corners. rounded: radius-well. circular: a circle. */
  variant?: 'text' | 'rectangular' | 'rounded' | 'circular';
  /** Width: a number of px or any CSS length. Default the full line (text) or the children's width. */
  width?: number | string;
  /** Height: a number of px or any CSS length. Text takes its height from the font size. */
  height?: number | string;
  /** pulse: a slow opacity breath (default). wave: a light sheen moving across. false: still. */
  animation?: 'pulse' | 'wave' | false;
  /** Content to size the placeholder by; it stays invisible. */
  children?: React.ReactNode;
}

/** A color-line placeholder in the shape of what is loading, always aria-hidden (the region it stands in for carries aria-busy). */
export const Skeleton = React.forwardRef<HTMLSpanElement, SkeletonProps>(function Skeleton(
  { variant = 'text', width, height, animation = 'pulse', className, style, children, ...rest },
  ref,
) {
  const sized = children != null && children !== false;
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cx(
        'gl-skeleton',
        `gl-skeleton-${variant}`,
        animation && `gl-skeleton-${animation}`,
        sized && 'gl-skeleton-with-children',
        sized && width == null && 'gl-skeleton-fit-width',
        sized && height == null && 'gl-skeleton-fit-height',
        className,
      )}
      style={{ width: toCss(width), height: toCss(height), ...style }}
      {...rest}
    >
      {children}
    </span>
  );
});
