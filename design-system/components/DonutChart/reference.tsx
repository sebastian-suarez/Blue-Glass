import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback, useId } from '../internal/hooks';
import { formatFull } from './_charts-scale';
import { seriesColor, OTHER_COLOR, ChartTable, stepIndex } from './_charts-chrome';

export interface DonutChartDatum {
  /** Names the part in the legend, the centre readout and the table. */
  label: string;
  /** A positive amount; zero and negative parts are left out. */
  value: number;
  /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position, then dg-edge. */
  color?: string;
}

export interface DonutChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** Class names for the root element, merged with the component's own. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** The parts, in the order they run clockwise from 12 o'clock. Past five, the fifth on fold into Other. */
  data: DonutChartDatum[];
  /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
  title: string;
  /** One or two sentences with the takeaway. Default: every part with its share. */
  description?: string;
  /** Diameter in px. */
  size?: number;
  /** Ring width in px. Default 13% of the diameter. */
  thickness?: number;
  /** Words under the centre figure ("months"). */
  centerLabel?: React.ReactNode;
  /** The centre figure. Default: the formatted total. */
  total?: React.ReactNode;
  /** Formats values in the centre, the legend and the table. Default: thousands separators. */
  valueFormatter?: (value: number) => string;
  /** Name for the folded tail. */
  otherLabel?: string;
  /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
  table?: 'hidden' | 'visible' | 'none';
  /** The highlighted part (controlled): its segment stays full, the others dim, the centre reads it. */
  highlighted?: number | null;
  /** The part highlighted at first (uncontrolled). */
  defaultHighlighted?: number | null;
  /** Called when hover, a tap or the arrow keys move the highlight; null when it clears. */
  onHighlightChange?: (index: number | null) => void;
}

const MAX_SEGMENTS = 5;
const HALF_GAP = 1;

interface Segment {
  label: string;
  value: number;
  color: string;
  share: number;
  path: string;
}

function point(cx: number, cy: number, r: number, a: number): string {
  const x = cx + r * Math.sin(a);
  const y = cy - r * Math.cos(a);
  return `${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}`;
}

/** An annular sector from a0 to a1 (radians clockwise from 12 o'clock) with a constant 2px gap at each edge. */
function sector(cx: number, cy: number, R: number, r: number, a0: number, a1: number, whole: boolean): string {
  if (whole) {
    return `M${point(cx, cy, R, 0)}A${R} ${R} 0 1 1 ${point(cx, cy, R, Math.PI)}A${R} ${R} 0 1 1 ${point(cx, cy, R, 0)}Z` +
      `M${point(cx, cy, r, 0)}A${r} ${r} 0 1 0 ${point(cx, cy, r, Math.PI)}A${r} ${r} 0 1 0 ${point(cx, cy, r, 0)}Z`;
  }
  const dO = Math.asin(Math.min(1, HALF_GAP / R));
  const dI = Math.asin(Math.min(1, HALF_GAP / r));
  if (a1 - a0 <= 2 * dI) return '';
  const o0 = a0 + dO;
  const o1 = a1 - dO;
  const i0 = a0 + dI;
  const i1 = a1 - dI;
  const largeO = o1 - o0 > Math.PI ? 1 : 0;
  const largeI = i1 - i0 > Math.PI ? 1 : 0;
  return `M${point(cx, cy, R, o0)}A${R} ${R} 0 ${largeO} 1 ${point(cx, cy, R, o1)}L${point(cx, cy, r, i1)}A${r} ${r} 0 ${largeI} 0 ${point(cx, cy, r, i0)}Z`;
}

/** Part-to-whole at a glance: up to five segments with 2px gaps, the total in the centre, a legend with values, hover to read one part. */
export const DonutChart = React.forwardRef<HTMLDivElement, DonutChartProps>(function DonutChart(
  {
    data, title, description, size = 200, thickness, centerLabel, total, valueFormatter = formatFull, otherLabel = 'Other',
    table = 'hidden', highlighted, defaultHighlighted = null, onHighlightChange, className, ...rest
  },
  ref,
) {
  const uid = useId();
  const [active, setActiveState] = useControlled<number | null>(highlighted, defaultHighlighted);
  const setActive = useEventCallback((next: number | null) => {
    if (next === active) return;
    setActiveState(next);
    onHighlightChange?.(next);
  });
  const fmt = (v: number) => valueFormatter(v);
  const parts = data.filter((d) => isFinite(d.value) && d.value > 0);
  const folded = parts.length > MAX_SEGMENTS
    ? [...parts.slice(0, MAX_SEGMENTS - 1), { label: otherLabel, value: parts.slice(MAX_SEGMENTS - 1).reduce((a, d) => a + d.value, 0), color: OTHER_COLOR }]
    : parts;
  const sum = folded.reduce((a, d) => a + d.value, 0);
  const R = size / 2;
  const ring = thickness ?? Math.round(size * 0.13);
  const r = Math.max(4, R - ring);
  let angle = 0;
  const segments: Segment[] = folded.map((d, i) => {
    const span = (d.value / sum) * Math.PI * 2;
    const a0 = angle;
    angle += span;
    return {
      label: d.label,
      value: d.value,
      color: d.color ?? (i < 4 ? seriesColor(i) : OTHER_COLOR),
      share: d.value / sum,
      path: sector(R, R, R, r, a0, angle, folded.length === 1),
    };
  });
  const pct = (s: number) => `${Math.round(s * 100)}%`;
  const current = active != null && active < segments.length ? segments[active] : null;
  const summary =
    description ??
    `${segments.length} parts of ${fmt(sum)}: ${segments.map((s) => `${s.label} ${fmt(s.value)} (${pct(s.share)})`).join(', ')}.`;

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const next = stepIndex(e.key, active, segments.length);
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
  };
  const onFocus = (e: React.FocusEvent<SVGSVGElement>) => {
    if (active == null && segments.length && e.currentTarget.matches(':focus-visible')) setActive(0);
  };

  return (
    <div ref={ref} className={cx('gl-chart', 'gl-donut-chart', className)} {...rest}>
      <div className="gl-donut-chart-body">
        <div className="gl-donut-chart-figure" style={{ width: size, height: size }}>
          <svg
            className="gl-chart-svg"
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            role="img"
            aria-labelledby={`${uid}-title`}
            aria-describedby={`${uid}-desc`}
            tabIndex={segments.length ? 0 : undefined}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={() => setActive(null)}
            onPointerLeave={(e: React.PointerEvent<SVGSVGElement>) => {
              if (e.pointerType !== 'touch') setActive(null);
            }}
          >
            <title id={`${uid}-title`}>{title}</title>
            <desc id={`${uid}-desc`}>{summary}</desc>
            <g aria-hidden="true">
              {segments.map((s, i) => (
                <path
                  key={i}
                  className="gl-donut-chart-segment"
                  d={s.path}
                  fillRule="evenodd"
                  style={{ fill: s.color }}
                  data-dim={current && active !== i ? '' : undefined}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                />
              ))}
            </g>
          </svg>
          <div className="gl-donut-chart-center" aria-hidden="true" style={{ padding: ring + 10 }}>
            <span className="gl-donut-chart-total">{current ? fmt(current.value) : total ?? fmt(sum)}</span>
            <span className="gl-donut-chart-caption">{current ? `${current.label} · ${pct(current.share)}` : centerLabel}</span>
          </div>
        </div>
        <ul className="gl-donut-chart-legend">
          {segments.map((s, i) => (
            <li
              key={i}
              className="gl-donut-chart-row"
              data-active={active === i ? '' : undefined}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            >
              <span className="gl-chart-swatch" style={{ '--gl-key': s.color }} aria-hidden="true" />
              <span className="gl-donut-chart-label">{s.label}</span>
              <span className="gl-donut-chart-value">{fmt(s.value)}</span>
              <span className="gl-donut-chart-pct">{pct(s.share)}</span>
            </li>
          ))}
        </ul>
      </div>
      {table !== 'none' ? (
        <ChartTable
          caption={title}
          visible={table === 'visible'}
          columns={['Part', 'Value', 'Share']}
          rows={segments.map((s) => ({ head: s.label, cells: [fmt(s.value), pct(s.share)] }))}
        />
      ) : null}
    </div>
  );
});
