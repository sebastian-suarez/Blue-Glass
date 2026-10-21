/**
 * Chart chrome shared by BarChart, LineChart, DonutChart and Sparkline: series colours,
 * width measurement, the ink tooltip, the legend and the data-table twin.
 * Styles live in BarChart.css (the .gl-chart-* rules).
 */
import * as React from 'react';
import { cx } from '../internal/cx';
import { useIsoLayoutEffect } from '../internal/hooks';

/** The validated categorical order (tokens chart-1 … chart-4). Never cycled. */
export const SERIES_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];
/** The "Other" fold and any fifth segment: the brand's recessive mark grey. */
export const OTHER_COLOR = 'var(--dg-edge)';
export const MAX_SERIES = 4;

export function seriesColor(i: number, override?: string): string {
  return override ?? SERIES_COLORS[i] ?? OTHER_COLOR;
}

/** Live content-box width of an element; null until first measured (render a fallback). */
export function useElementWidth(ref: React.RefObject<HTMLElement>): number | null {
  const [width, setWidth] = React.useState<number | null>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => {
      const w = Math.floor(el.clientWidth);
      setWidth((prev) => (prev === w || w === 0 ? prev : w));
    };
    read();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', schedule);
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', schedule);
      };
    }
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);
  return width;
}

/** Rounded data end (4px), square at the baseline. `end` is the side that carries the value. */
export function barPath(x: number, y: number, w: number, h: number, r: number, end: 'top' | 'bottom' | 'left' | 'right'): string {
  if (w <= 0 || h <= 0) return '';
  const vertical = end === 'top' || end === 'bottom';
  const rr = Math.max(0, Math.min(r, vertical ? w / 2 : h / 2, vertical ? h : w));
  const n = (v: number) => Math.round(v * 100) / 100;
  const [X, Y, W, H, R] = [n(x), n(y), n(w), n(h), n(rr)];
  switch (end) {
    case 'top':
      return `M${X} ${Y + H}V${n(Y + R)}A${R} ${R} 0 0 1 ${n(X + R)} ${Y}H${n(X + W - R)}A${R} ${R} 0 0 1 ${n(X + W)} ${n(Y + R)}V${n(Y + H)}Z`;
    case 'bottom':
      return `M${X} ${Y}V${n(Y + H - R)}A${R} ${R} 0 0 0 ${n(X + R)} ${n(Y + H)}H${n(X + W - R)}A${R} ${R} 0 0 0 ${n(X + W)} ${n(Y + H - R)}V${Y}Z`;
    case 'right':
      return `M${X} ${Y}H${n(X + W - R)}A${R} ${R} 0 0 1 ${n(X + W)} ${n(Y + R)}V${n(Y + H - R)}A${R} ${R} 0 0 1 ${n(X + W - R)} ${n(Y + H)}H${X}Z`;
    default:
      return `M${n(X + W)} ${Y}H${n(X + R)}A${R} ${R} 0 0 0 ${X} ${n(Y + R)}V${n(Y + H - R)}A${R} ${R} 0 0 0 ${n(X + R)} ${n(Y + H)}H${n(X + W)}Z`;
  }
}

export interface TooltipRow {
  color?: string;
  shape?: 'line' | 'rect';
  value: React.ReactNode;
  name?: React.ReactNode;
}

export interface ChartTooltipProps {
  /** Anchor point in the container's coordinates (px). */
  x: number;
  y: number;
  /** Where the tooltip sits relative to the anchor. */
  placement?: 'top' | 'right';
  /** Width of the positioned container, for clamping. */
  bounds: number;
  head?: React.ReactNode;
  rows: TooltipRow[];
  open: boolean;
}

/**
 * The ink pill: values lead (semibold, on-ink), names follow in a softer white,
 * keyed by a short stroke of the series colour with a white ring so dark slots read on ink.
 */
export function ChartTooltip({ x, y, placement = 'top', bounds, head, rows, open }: ChartTooltipProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left: number;
    let top: number;
    if (placement === 'right') {
      left = x + 14;
      if (left + w > bounds - 2) left = x - w - 14;
      top = y - h / 2;
    } else {
      left = x - w / 2;
      top = y - h - 10;
      if (top < -4) top = y + 14;
    }
    left = Math.max(0, Math.min(left, bounds - w));
    el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  });
  const single = rows.length === 1 && !head;
  return (
    <div ref={ref} className={cx('gl-chart-tooltip', single && 'gl-chart-tooltip-pill', open && 'gl-chart-tooltip-open')} aria-hidden="true">
      {head != null ? <div className="gl-chart-tooltip-head">{head}</div> : null}
      {rows.map((row, i) => (
        <div key={i} className="gl-chart-tooltip-row">
          {row.color ? (
            <span className={cx('gl-chart-key', row.shape === 'rect' && 'gl-chart-key-rect')} style={{ '--gl-key': row.color }} />
          ) : null}
          <span className="gl-chart-tooltip-value">{row.value}</span>
          {row.name != null ? <span className="gl-chart-tooltip-name">{row.name}</span> : null}
        </div>
      ))}
    </div>
  );
}

export interface LegendItem {
  label: React.ReactNode;
  color: string;
  value?: React.ReactNode;
}

/** Legend for two or more series: the mark's shape (rect for bars and segments, line for lines) beside ink text. */
export function ChartLegend({
  items, shape = 'rect', className, active, onActivate,
}: {
  items: LegendItem[];
  shape?: 'rect' | 'line';
  className?: string;
  active?: number | null;
  onActivate?: (i: number | null) => void;
}) {
  return (
    <ul className={cx('gl-chart-legend', className)}>
      {items.map((item, i) => (
        <li
          key={i}
          className="gl-chart-legend-item"
          data-dim={active != null && active !== i ? '' : undefined}
          onPointerEnter={onActivate ? () => onActivate(i) : undefined}
          onPointerLeave={onActivate ? () => onActivate(null) : undefined}
        >
          <span className={cx('gl-chart-swatch', shape === 'line' && 'gl-chart-swatch-line')} style={{ '--gl-key': item.color }} aria-hidden="true" />
          <span className="gl-chart-legend-label">{item.label}</span>
          {item.value != null ? <span className="gl-chart-legend-value">{item.value}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/** The table twin of a chart: every value, reachable without hovering. Visually hidden unless asked. */
export function ChartTable({
  caption, columns, rows, visible = false,
}: {
  caption: React.ReactNode;
  columns: React.ReactNode[];
  rows: Array<{ head: React.ReactNode; cells: React.ReactNode[] }>;
  visible?: boolean;
}) {
  return (
    <table className={cx('gl-chart-table', !visible && 'gl-sr-only')}>
      <caption className="gl-chart-table-caption">{caption}</caption>
      <thead>
        <tr>
          {columns.map((c, i) => (
            <th key={i} scope="col" className="gl-chart-table-col">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="gl-chart-table-row">
            <th scope="row" className="gl-chart-table-head">{r.head}</th>
            {r.cells.map((c, j) => (
              <td key={j} className="gl-chart-table-cell">{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Index movement for arrow-key reading of marks. Returns the next index or undefined when the key isn't ours. */
export function stepIndex(key: string, current: number | null, count: number, horizontalFirst = true): number | null | undefined {
  if (count === 0) return undefined;
  const next = ['ArrowRight', horizontalFirst ? 'ArrowDown' : 'ArrowUp'];
  const prev = ['ArrowLeft', horizontalFirst ? 'ArrowUp' : 'ArrowDown'];
  if (next.includes(key)) return current == null ? 0 : Math.min(count - 1, current + 1);
  if (prev.includes(key)) return current == null ? count - 1 : Math.max(0, current - 1);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'Escape') return null;
  return undefined;
}
