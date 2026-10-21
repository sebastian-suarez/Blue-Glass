import * as React from 'react';
import { cx } from '../internal/cx';
import { useId } from '../internal/hooks';
import { niceTicks, linear, formatCompact, formatFull, textWidth } from './_charts-scale';
import { seriesColor, useElementWidth, barPath, ChartTooltip, ChartLegend, ChartTable, stepIndex, MAX_SERIES } from './_charts-chrome';

export interface BarChartSeries {
  /** Names the series in the legend, the tooltip and the table. */
  label: string;
  /** One value per category, in category order; null leaves the slot empty. */
  data: Array<number | null>;
  /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position. */
  color?: string;
}

export interface BarChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** Class names for the root element, merged with the component's own. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** The category names, one per bar group (years, employers, endpoints). */
  categories: string[];
  /** One to four series. Two or more get a legend and grouped bars with 2px gaps. */
  series: BarChartSeries[];
  /** vertical: columns rising from the baseline. horizontal: bars running right; better for long names. */
  layout?: 'vertical' | 'horizontal';
  /** Total height in px. Default 260 for columns; horizontal bars size to their rows. */
  height?: number;
  /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
  title: string;
  /** One or two sentences with the takeaway, read as the SVG's desc. Default: a generated range summary. */
  description?: string;
  /** Values printed at the bar ends: none, every bar (value), or each series' largest (max). */
  barLabel?: 'none' | 'value' | 'max';
  /** Formats values in labels, tooltips and the table. Default: thousands separators. */
  valueFormatter?: (value: number) => string;
  /** Formats axis ticks. Default: compact from 1,000 up (1K, 2K). */
  tickFormatter?: (value: number) => string;
  /** Header for the category column of the table. Default "Category". */
  categoryLabel?: string;
  /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
  table?: 'hidden' | 'visible' | 'none';
}

const GAP = 2;
const RADIUS = 4;
const MAX_THICK = 24;

interface Mark {
  index: number;
  c: number;
  s: number;
  value: number;
  path: string;
  /** Anchor for the tooltip and label: the data end's centre. */
  ax: number;
  ay: number;
  hit: [number, number, number, number];
  label?: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; text: string };
}

/** Bars and columns for comparing magnitude: baseline-anchored, 4px rounded data ends, a recessive axis, a hover tooltip and a table twin. */
export const BarChart = React.forwardRef<HTMLDivElement, BarChartProps>(function BarChart(
  {
    categories, series: seriesIn, layout = 'vertical', height, title, description, barLabel = 'none',
    valueFormatter = formatFull, tickFormatter = formatCompact, categoryLabel = 'Category', table = 'hidden',
    className, ...rest
  },
  ref,
) {
  const series = seriesIn.slice(0, MAX_SERIES);
  const uid = useId();
  const plotRef = React.useRef<HTMLDivElement>(null);
  const measured = useElementWidth(plotRef);
  const W = measured ?? 640;
  const [active, setActive] = React.useState<number | null>(null);
  const horizontal = layout === 'horizontal';
  const nC = categories.length;
  const nS = Math.max(1, series.length);

  const values = series.flatMap((s) => s.data.filter((v): v is number => v != null && isFinite(v)));
  const dataMin = Math.min(0, ...values);
  const dataMax = Math.max(0, ...values);
  const fmt = (v: number) => valueFormatter(v);

  // Which bars carry a printed value: all, or the first occurrence of each series' largest.
  const maxAt = series.map((s) => {
    let best = -1;
    s.data.forEach((v, i) => {
      if (v != null && isFinite(v) && (best < 0 || v > (s.data[best] as number))) best = i;
    });
    return best;
  });
  const labelled = (s: number, c: number) => barLabel === 'value' || (barLabel === 'max' && maxAt[s] === c);
  const labelWidths = (neg: boolean) =>
    Math.max(0, ...series.flatMap((s, si) => s.data.map((v, ci) => (v != null && (v < 0) === neg && labelled(si, ci) ? textWidth(fmt(v)) : 0))));
  const labelW = labelWidths(false);
  const negLabelW = labelWidths(true);

  let H: number;
  let marks: Mark[] = [];
  let ticks: number[] = [];
  let grid: Array<{ x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number; anchor: 'end' | 'middle' }> = [];
  let baseline: { x1: number; y1: number; x2: number; y2: number };
  let cats: Array<{ x: number; y: number; text: string; anchor: 'end' | 'middle' }> = [];
  let showValueAxis = true;

  if (!horizontal) {
    H = height ?? 260;
    const top = barLabel !== 'none' && labelW > 0 ? 22 : 12;
    const bottom = negLabelW > 0 ? 48 : 30;
    const plotH = H - top - bottom;
    ticks = niceTicks(dataMin, dataMax, Math.max(2, Math.min(6, Math.floor(plotH / 52))));
    const tickText = ticks.map((t) => tickFormatter(t));
    const left = Math.max(...tickText.map((t) => textWidth(t))) + 12;
    const x0 = left;
    const x1 = W - 6;
    const y = linear(ticks[0], ticks[ticks.length - 1], H - bottom, top);
    const band = (x1 - x0) / Math.max(1, nC);
    const thick = Math.max(2, Math.min(MAX_THICK, (band * 0.72 - (nS - 1) * GAP) / nS));
    const groupW = nS * thick + (nS - 1) * GAP;
    const y0 = y(0);
    grid = ticks.map((t, i) => ({ x1: x0, y1: y(t), x2: x1, y2: y(t), label: tickText[i], lx: x0 - 10, ly: y(t) + 4.5, anchor: 'end' as const }));
    baseline = { x1: x0, y1: y0, x2: x1, y2: y0 };
    const maxCat = Math.max(0, ...categories.map((c) => textWidth(c)));
    const every = Math.max(1, Math.ceil(maxCat / Math.max(1, band - 6)));
    cats = categories.map((c, i) => ({ x: x0 + band * i + band / 2, y: H - bottom + 20, text: i % every === 0 ? c : '', anchor: 'middle' as const }));
    series.forEach((s, si) => {
      s.data.forEach((v, ci) => {
        if (v == null || !isFinite(v)) return;
        const bx = x0 + band * ci + (band - groupW) / 2 + si * (thick + GAP);
        const yv = y(v);
        const top0 = Math.min(y0, yv);
        const h = Math.abs(y0 - yv);
        const text = fmt(v);
        const fits = nS === 1 ? textWidth(text) <= band - 4 : textWidth(text) <= thick + GAP * 2 + 6;
        marks.push({
          index: ci * nS + si, c: ci, s: si, value: v,
          path: barPath(bx, top0, thick, h, RADIUS, v >= 0 ? 'top' : 'bottom'),
          ax: bx + thick / 2, ay: v >= 0 ? yv : yv,
          hit: [bx - GAP / 2, top, thick + GAP, H - bottom - top],
          label: labelled(si, ci) && fits ? { x: bx + thick / 2, y: v >= 0 ? yv - 7 : yv + 17, anchor: 'middle', text } : undefined,
        });
      });
    });
  } else {
    const thick = nS === 1 ? 20 : Math.max(8, Math.min(16, 40 / nS));
    const groupH = nS * thick + (nS - 1) * GAP;
    const bandAuto = groupH + (nS === 1 ? 14 : 16);
    showValueAxis = barLabel !== 'value';
    const top = 6;
    const bottom = showValueAxis ? 30 : 6;
    H = height ?? top + bottom + nC * bandAuto;
    const band = (H - top - bottom) / Math.max(1, nC);
    const th = Math.max(2, Math.min(thick, (band * 0.8 - (nS - 1) * GAP) / nS));
    const gH = nS * th + (nS - 1) * GAP;
    const nameEdge = Math.max(0, ...categories.map((c) => textWidth(c))) + 2;
    const left = nameEdge + 12 + (negLabelW > 0 ? negLabelW + 10 : 0);
    ticks = niceTicks(dataMin, dataMax, Math.max(2, Math.min(6, Math.floor((W - left) / 90))));
    const tickText = ticks.map((t) => tickFormatter(t));
    const right = Math.max(barLabel !== 'none' ? labelW + 10 : 0, showValueAxis ? textWidth(tickText[tickText.length - 1]) / 2 + 2 : 0) + 4;
    const x0 = left;
    const x1 = W - right;
    const x = linear(ticks[0], ticks[ticks.length - 1], x0, x1);
    const xz = x(0);
    grid = showValueAxis
      ? ticks.map((t, i) => ({ x1: x(t), y1: top, x2: x(t), y2: H - bottom, label: tickText[i], lx: x(t), ly: H - bottom + 20, anchor: 'middle' as const }))
      : [];
    baseline = { x1: xz, y1: top, x2: xz, y2: H - bottom };
    cats = categories.map((c, i) => ({ x: nameEdge, y: top + band * i + band / 2 + 4.5, text: c, anchor: 'end' as const }));
    series.forEach((s, si) => {
      s.data.forEach((v, ci) => {
        if (v == null || !isFinite(v)) return;
        const by = top + band * ci + (band - gH) / 2 + si * (th + GAP);
        const xv = x(v);
        const left0 = Math.min(xz, xv);
        const w = Math.abs(xv - xz);
        const text = fmt(v);
        marks.push({
          index: ci * nS + si, c: ci, s: si, value: v,
          path: barPath(left0, by, w, th, RADIUS, v >= 0 ? 'right' : 'left'),
          ax: xv, ay: by,
          hit: [x0, by - GAP / 2, x1 - x0, th + GAP],
          label: labelled(si, ci) ? { x: v >= 0 ? xv + 8 : xv - 8, y: by + th / 2 + 4.5, anchor: v >= 0 ? 'start' : 'end', text } : undefined,
        });
      });
    });
  }
  marks = marks.sort((a, b) => a.index - b.index);
  const count = marks.length;
  const current = active != null ? marks.find((m) => m.index === active) ?? null : null;

  const summary =
    description ??
    `${horizontal ? 'Bar' : 'Column'} chart of ${series.map((s) => s.label).join(', ')} across ${nC} categories, from ${fmt(Math.min(...values))} to ${fmt(Math.max(...values))}.`;

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const pos = current ? marks.indexOf(current) : null;
    const next = stepIndex(e.key, pos, count);
    if (next === undefined) return;
    e.preventDefault();
    setActive(next == null ? null : marks[next].index);
  };
  const onFocus = (e: React.FocusEvent<SVGSVGElement>) => {
    if (active == null && count && e.currentTarget.matches(':focus-visible')) setActive(marks[0].index);
  };

  return (
    <div ref={ref} className={cx('gl-chart', 'gl-bar-chart', horizontal && 'gl-bar-chart-horizontal', className)} {...rest}>
      {series.length > 1 ? (
        <ChartLegend items={series.map((s, i) => ({ label: s.label, color: seriesColor(i, s.color) }))} shape="rect" />
      ) : null}
      <div ref={plotRef} className="gl-chart-plot">
        <svg
          className="gl-chart-svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={`${uid}-title`}
          aria-describedby={`${uid}-desc`}
          tabIndex={count ? 0 : undefined}
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
            {grid.map((g, i) =>
              ticks[i] === 0 ? null : <line key={`g${i}`} className="gl-chart-gridline" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />,
            )}
            {grid.map((g, i) => (
              <text key={`t${i}`} className="gl-chart-tick" x={g.lx} y={g.ly} textAnchor={g.anchor}>
                {g.label}
              </text>
            ))}
            {cats.map((c, i) =>
              c.text ? (
                <text key={`c${i}`} className={horizontal ? 'gl-chart-category' : 'gl-chart-tick'} x={c.x} y={c.y} textAnchor={c.anchor}>
                  {c.text}
                </text>
              ) : null,
            )}
            {marks.map((m) => (
              <path
                key={`b${m.index}`}
                className="gl-bar-chart-bar"
                d={m.path}
                style={{ fill: seriesColor(m.s, series[m.s].color) }}
                data-dim={current && current.index !== m.index ? '' : undefined}
              />
            ))}
            <line className="gl-chart-axis-line" x1={baseline.x1} y1={baseline.y1} x2={baseline.x2} y2={baseline.y2} />
            {marks.map((m) =>
              m.label ? (
                <text key={`l${m.index}`} className="gl-chart-value" x={m.label.x} y={m.label.y} textAnchor={m.label.anchor}>
                  {m.label.text}
                </text>
              ) : null,
            )}
            {marks.map((m) => (
              <rect
                key={`h${m.index}`}
                className="gl-chart-hit"
                x={m.hit[0]}
                y={m.hit[1]}
                width={Math.max(0, m.hit[2])}
                height={Math.max(0, m.hit[3])}
                onPointerEnter={() => setActive(m.index)}
                onPointerDown={() => setActive(m.index)}
              />
            ))}
          </g>
        </svg>
        <ChartTooltip
          open={current != null}
          x={current ? current.ax : 0}
          y={current ? current.ay : 0}
          bounds={W}
          head={current && nS > 1 ? categories[current.c] : undefined}
          rows={
            current
              ? [{ color: seriesColor(current.s, series[current.s].color), value: fmt(current.value), name: nS > 1 ? series[current.s].label : categories[current.c] }]
              : []
          }
        />
      </div>
      {table !== 'none' ? (
        <ChartTable
          caption={title}
          visible={table === 'visible'}
          columns={[categoryLabel, ...series.map((s) => s.label)]}
          rows={categories.map((c, ci) => ({ head: c, cells: series.map((s) => (s.data[ci] == null ? '–' : fmt(s.data[ci] as number))) }))}
        />
      ) : null}
    </div>
  );
});
