import * as React from 'react';
import { cx } from '../internal/cx';
import { useIsoLayoutEffect } from '../internal/hooks';
import type { SpaceValue } from '../layout/Box';
import type { ResponsiveValue } from '../layout/Grid';
import { intIn, isResponsiveObject, isSpace, responsiveClasses, space } from '../layout/_surfaces-layout-system';

export interface MasonryProps extends React.HTMLAttributes<HTMLElement> {
  /** Number of columns, or one per breakpoint (1–12; xs, sm ≥361, md ≥701, lg ≥900, xl ≥1001). Default { xs: 1, sm: 2, md: 3 }. */
  columns?: ResponsiveValue<number>;
  /** Space between items, both ways: a spacing token name ("3xs" … "xl") or 0. Default "md". */
  spacing?: SpaceValue;
  /** The element to render. Default "div". */
  component?: React.ElementType;
  children?: React.ReactNode;
}

interface Layout {
  columns: number;
  orders: number[];
  height: number;
}

const DEFAULT_COLUMNS = { xs: 1, sm: 2, md: 3 };

function readColumns(el: HTMLElement): number {
  const raw = getComputedStyle(el).getPropertyValue('--gl-masonry-columns').trim();
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Items of uneven height in balanced columns: each item goes to the shortest
 * column, measured with ResizeObserver, while the DOM keeps reading order
 * (columns are built with flex `order`). Before it measures, CSS columns lay it out.
 */
export const Masonry = React.forwardRef<HTMLElement, MasonryProps>(function Masonry(
  { columns = DEFAULT_COLUMNS, spacing = 'md', component: Component = 'div', className, style, children, ...rest },
  ref,
) {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = React.useState<Layout | null>(null);
  const items = React.Children.toArray(children);
  const count = items.length;
  // Re-subscribe the observers whenever the set of items changes, not only its length.
  const signature = items.map((child, i) => (React.isValidElement(child) && child.key != null ? String(child.key) : String(i))).join('|');

  const colClasses = isResponsiveObject(columns)
    ? responsiveClasses('gl-masonry-columns', columns, (v) => intIn(v, 1, 12))
    : intIn(columns, 1, 12)
      ? [`gl-masonry-columns-xs-${columns}`]
      : ['gl-masonry-columns-xs-3'];
  const gap = space(isSpace(spacing) ? spacing : 'md') as string;

  const measure = React.useCallback(() => {
    const inner = innerRef.current;
    if (!inner) return;
    const cols = readColumns(inner);
    const nodes = Array.from(inner.children).filter((el): el is HTMLElement => (el as HTMLElement).classList.contains('gl-masonry-item'));
    if (nodes.length === 0) {
      setLayout(null);
      return;
    }
    // A custom property's computed value has its var() resolved: "16px" for var(--space-md).
    const gapPx = parseFloat(getComputedStyle(inner).getPropertyValue('--gl-masonry-gap')) || 0;
    const heights = new Array(cols).fill(0) as number[];
    const orders = nodes.map((node) => {
      const h = node.getBoundingClientRect().height;
      let col = 0;
      for (let c = 1; c < cols; c++) if (heights[c] < heights[col] - 0.5) col = c;
      heights[col] += h + gapPx;
      return col + 1;
    });
    const height = Math.ceil(Math.max(...heights)) + 1;
    setLayout((prev) => {
      if (prev && prev.columns === cols && prev.height === height && prev.orders.length === orders.length && prev.orders.every((o, i) => o === orders[i])) {
        return prev;
      }
      return { columns: cols, orders, height };
    });
  }, []);

  useIsoLayoutEffect(() => {
    measure();
  });

  React.useEffect(() => {
    const inner = innerRef.current;
    if (!inner || typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(inner);
    for (const el of Array.from(inner.children)) if ((el as HTMLElement).classList.contains('gl-masonry-item')) ro.observe(el);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [measure, signature]);

  const ready = layout !== null && layout.orders.length === count;
  return (
    <Component
      ref={ref}
      className={cx('gl-masonry', ...colClasses, className)}
      style={{ '--gl-masonry-gap': gap, ...style } as React.CSSProperties}
      {...rest}
    >
      <div
        ref={innerRef}
        className="gl-masonry-inner"
        data-ready={ready ? '' : undefined}
        style={ready ? { height: `${layout!.height}px` } : undefined}
      >
        {items.map((child, i) => (
          <div
            key={React.isValidElement(child) && child.key != null ? child.key : i}
            className="gl-masonry-item"
            style={ready ? { order: layout!.orders[i] } : undefined}
          >
            {child}
          </div>
        ))}
        {ready
          ? Array.from({ length: layout!.columns - 1 }, (_, i) => (
              <span key={`gl-masonry-break-${i}`} className="gl-masonry-break" style={{ order: i + 1 }} aria-hidden="true" />
            ))
          : null}
      </div>
    </Component>
  );
});
