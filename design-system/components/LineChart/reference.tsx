import * as React from 'react';
import { cx } from '../internal/cx';
import { useId } from '../internal/hooks';
import { niceTicks, linear, formatCompact, formatFull, textWidth, timeTicks, formatTime, formatDateLong, type TimeUnit } from './_charts-scale';
import { seriesColor, useElementWidth, ChartTooltip, ChartLegend, ChartTable, stepIndex, MAX_SERIES } from './_charts-chrome';

export type LineChartX = string | number | Date;

export interface LineChartSeries {
  /** Names the series in the legend, the end label, the tooltip and the table. */
  label: string;
  /** One value per x position; null breaks the line. */
  data: Array<number | null>;
  /** A CSS colour to override the slot. Default: chart-1 … chart-4 by position. */
  color?: string;
  /** Wash the area under this line at 10% of its hue. */
  area?: boolean;
}

export interface LineChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title' | 'children'> {
  /** Class names for the root element, merged with the component's own. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** The x positions: strings (evenly spaced categories), numbers (a linear axis) or Dates (a time axis). */
  x: LineChartX[];
  /** One to four series on one y axis. Two or more get a legend and direct end labels. */
  series: LineChartSeries[];
  /** Wash every series' area at 10% of its hue. Clearest with one series. */
  area?: boolean;
  /** Total height in px, axis band included. */
  height?: number;
  /** Accessible name: the SVG's title and the table's caption. Put a visible heading beside the chart too. */
  title: string;
  /** One or two sentences with the takeaway, read as the SVG's desc. Default: a generated summary. */
  description?: string;
  /** The last value at each line's end, after the series name when there are two or more. Default true. */
  endLabels?: boolean;
  /** Formats values in the tooltip, end labels and table. Default: thousands separators. */
  valueFormatter?: (value: number) => string;
  /** Formats y-axis ticks. Default: compact from 1,000 up. */
  tickFormatter?: (value: number) => string;
  /** Formats an x value for ticks, tooltip and table. Default: dates by their spacing ("2024", "March 2024"). */
  xFormatter?: (x: LineChartX, where: 'tick' | 'tooltip') => string;
  /** Fixed y domain. Default: from 0 (or the data's minimum when negative) to a round maximum. */
  yDomain?: [number, number];
  /** Header for the x column of the table. Default "X". */
  xLabel?: string;
  /** The data-table twin: hidden for screen readers (default), visible under the chart, or none. */
  table?: 'hidden' | 'visible' | 'none';
}

const DAY = 86400000;
const LABEL_GAP = 16;

/** Lines for trends: 2px strokes, an optional 10% wash, a crosshair that snaps to the nearest x, one tooltip for every series, direct end labels. */
export const LineChart = React.forwardRef<HTMLDivElement, LineChartProps>(function LineChart(
  {
    x: xs, series: seriesIn, area = false, height = 260, title, description, endLabels, valueFormatter = formatFull,
    tickFormatter = formatCompact, xFormatter, yDomain, xLabel = 'X', table = 'hidden', className, ...rest
  },
  ref,
) {
  const series = seriesIn.slice(0, MAX_SERIES);
  const uid = useId();
  const plotRef = React.useRef<HTMLDivElement>(null);
  const measured = useElementWidth(plotRef);
  const W = measured ?? 640;
  const H = height;
  const [active, setActive] = React.useState<number | null>(null);
  const n = xs.length;
  const kind: 'time' | 'linear' | 'point' = xs[0] instanceof Date ? 'time' : typeof xs[0] === 'number' ? 'linear' : 'point';
  const xNum = xs.map((v, i) => (v instanceof Date ? v.getTime() : typeof v === 'number' ? v : i));
  const showEnd = endLabels ?? true;
  // One series: the title names it, so its end label is just the value.
  const single = series.length === 1;

  // Date spacing decides how a date reads: years, months or days.
  let unit: TimeUnit = 'day';
  if (kind === 'time' && n > 1) {
    const gaps = xNum.slice(1).map((v, i) => v - xNum[i]).sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)];
    unit = median >= 300 * DAY ? 'year' : median >= 27 * DAY ? 'month' : 'day';
  }
  const fmtX = (v: LineChartX, where: 'tick' | 'tooltip'): string => {
    if (xFormatter) return xFormatter(v, where);
    if (v instanceof Date) return formatDateLong(v.getTime(), unit);
    return typeof v === 'number' ? String(v) : v;
  };
  const fmt = (v: number) => valueFormatter(v);

  const values = series.flatMap((s) => s.data.filter((v): v is number => v != null && isFinite(v)));
  const vMin = values.length ? Math.min(...values) : 0;
  const vMax = values.length ? Math.max(...values) : 1;
  const top = 12;
  const bottom = 30;
  const plotH = H - top - bottom;
  const ticks = yDomain ? niceTicks(yDomain[0], yDomain[1], 5).filter((t) => t >= yDomain[0] - 1e-9 && t <= yDomain[1] + 1e-9) : niceTicks(Math.min(0, vMin), Math.max(0, vMax), Math.max(2, Math.min(6, Math.floor(plotH / 50))));
  const d0 = yDomain ? yDomain[0] : ticks[0];
  const d1 = yDomain ? yDomain[1] : ticks[ticks.length - 1];
  const tickText = ticks.map((t) => tickFormatter(t));
  const left = Math.max(...tickText.map((t) => textWidth(t))) + 12;

  // End labels: name + last value, measured to reserve the right margin.
  const ends = series.map((s, si) => {
    let li = -1;
    for (let i = s.data.length - 1; i >= 0; i--) if (s.data[i] != null && isFinite(s.data[i] as number)) { li = i; break; }
    const v = li >= 0 ? (s.data[li] as number) : null;
    return { si, li, v, text: single ? '' : s.label, valueText: v == null ? '' : fmt(v) };
  });
  // On narrow charts, end labels that would take over 38% of the width give way to the legend and tooltip.
  const endFits = single || endLabelWidth(true, ends) + 22 <= W * 0.38;
  const showEndLabels = showEnd && endFits;
  const endW = endLabelWidth(showEndLabels, ends);
  const lastTickHalf = kind === 'point' ? textWidth(fmtX(xs[n - 1], 'tick')) / 2 : 18;
  const right = showEndLabels ? endW + 22 : Math.max(10, lastTickHalf);
  const x0 = kind === 'point' ? left + Math.min(16, textWidth(fmtX(xs[0], 'tick')) / 2) : left + 4;
  const x1 = W - right;
  const xMin = Math.min(...xNum);
  const xMax = Math.max(...xNum);
  const px = kind === 'point'
    ? (i: number) => (n === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (n - 1))
    : (i: number) => linear(xMin, xMax === xMin ? xMin + 1 : xMax, x0, x1)(xNum[i]);
  const py = linear(d0, d1, H - bottom, top);
  const baseY = py(Math.max(d0, Math.min(0, d1)));

  // X ticks.
  let xTicks: Array<{ x: number; text: string }> = [];
  if (kind === 'point') {
    const widest = Math.max(...xs.map((v) => textWidth(fmtX(v, 'tick'))));
    const room = n > 1 ? (x1 - x0) / (n - 1) : x1 - x0;
    const every = Math.max(1, Math.ceil((widest + 10) / Math.max(1, room)));
    xTicks = xs.map((v, i) => ({ x: px(i), text: i % every === 0 || i === n - 1 ? fmtX(v, 'tick') : '' }));
    if (every > 1 && (n - 1) % every !== 0) {
      const prev = Math.floor((n - 1) / every) * every;
      if (px(n - 1) - px(prev) < widest + 10) xTicks[prev].text = '';
    }
  } else if (kind === 'time') {
    const { ticks: tt, unit: tu } = timeTicks(xMin, xMax, Math.max(2, Math.floor((x1 - x0) / 80)));
    const sx = linear(xMin, xMax, x0, x1);
    xTicks = tt.map((t) => ({ x: sx(t), text: xFormatter ? xFormatter(new Date(t), 'tick') : formatTime(t, tu) }));
  } else {
    const lt = niceTicks(xMin, xMax, Math.max(2, Math.floor((x1 - x0) / 80))).filter((t) => t >= xMin && t <= xMax);
    const sx = linear(xMin, xMax, x0, x1);
    xTicks = lt.map((t) => ({ x: sx(t), text: xFormatter ? xFormatter(t, 'tick') : String(t) }));
  }

  // Paths, split at gaps.
  const lines = series.map((s) => {
    const segs: Array<Array<[number, number]>> = [];
    let cur: Array<[number, number]> = [];
    s.data.forEach((v, i) => {
      if (v == null || !isFinite(v)) {
        if (cur.length) segs.push(cur);
        cur = [];
      } else cur.push([px(i), py(v)]);
    });
    if (cur.length) segs.push(cur);
    const r = (p: number) => Math.round(p * 10) / 10;
    const d = segs.map((seg) => seg.map(([a, b], i) => `${i ? 'L' : 'M'}${r(a)} ${r(b)}`).join('')).join('');
    const areaD = segs
      .filter((seg) => seg.length > 1)
      .map((seg) => `M${r(seg[0][0])} ${r(baseY)}` + seg.map(([a, b]) => `L${r(a)} ${r(b)}`).join('') + `L${r(seg[seg.length - 1][0])} ${r(baseY)}Z`)
      .join('');
    return { d, areaD };
  });

  // End labels: start at the line ends, then spread to 16px apart; leaders connect any that moved.
  const placed = ends
    .filter((e) => e.li >= 0)
    .map((e) => ({ ...e, ly: py(e.v as number), y0: py(e.v as number), x: px(e.li) }))
    .sort((a, b) => a.ly - b.ly);
  for (let i = 1; i < placed.length; i++) if (placed[i].ly - placed[i - 1].ly < LABEL_GAP) placed[i].ly = placed[i - 1].ly + LABEL_GAP;
  const overflow = placed.length ? placed[placed.length - 1].ly - (H - bottom) : 0;
  if (overflow > 0) {
    for (const p of placed) p.ly -= overflow;
    for (let i = placed.length - 2; i >= 0; i--) if (placed[i + 1].ly - placed[i].ly < LABEL_GAP) placed[i].ly = placed[i + 1].ly - LABEL_GAP;
  }
  const labelX = x1 + 14;

  const current = active != null && active >= 0 && active < n ? active : null;
  const cx0 = current != null ? px(current) : 0;
  const markers = current != null
    ? series.map((s, si) => ({ si, v: s.data[current] })).filter((m): m is { si: number; v: number } => m.v != null && isFinite(m.v))
    : [];
  const tipY = markers.length ? markers.reduce((a, m) => a + py(m.v), 0) / markers.length : top + plotH / 2;

  const nearest = (clientX: number, rect: DOMRect) => {
    const xIn = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    let dist = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(px(i) - xIn);
      if (d < dist) { dist = d; best = i; }
    }
    return best;
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const next = nearest(e.clientX, e.currentTarget.getBoundingClientRect());
    if (next !== active) setActive(next);
  };
  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const next = stepIndex(e.key, current, n);
    if (next === undefined) return;
    e.preventDefault();
    setActive(next);
  };
  const onFocus = (e: React.FocusEvent<SVGSVGElement>) => {
    if (active == null && n && e.currentTarget.matches(':focus-visible')) setActive(n - 1);
  };

  const summary =
    description ??
    `Line chart of ${series.map((s) => s.label).join(', ')} from ${fmtX(xs[0], 'tooltip')} to ${fmtX(xs[n - 1], 'tooltip')}` +
      (ends.some((e) => e.v != null) ? `, ending at ${ends.filter((e) => e.v != null).map((e) => `${e.text} ${e.valueText}`).join(', ')}.` : '.');

  return (
    <div ref={ref} className={cx('gl-chart', 'gl-line-chart', className)} {...rest}>
      {series.length > 1 ? <ChartLegend items={series.map((s, i) => ({ label: s.label, color: seriesColor(i, s.color) }))} shape="line" /> : null}
      <div ref={plotRef} className="gl-chart-plot">
        <svg
          className="gl-chart-svg"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-labelledby={`${uid}-title`}
          aria-describedby={`${uid}-desc`}
          tabIndex={n ? 0 : undefined}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerMove}
          onPointerLeave={(e: React.PointerEvent<SVGSVGElement>) => {
            if (e.pointerType !== 'touch') setActive(null);
          }}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={() => setActive(null)}
        >
          <title id={`${uid}-title`}>{title}</title>
          <desc id={`${uid}-desc`}>{summary}</desc>
          <g aria-hidden="true">
            {ticks.map((t, i) =>
              t === d0 && d0 === 0 ? null : <line key={`g${i}`} className="gl-chart-gridline" x1={left} y1={py(t)} x2={x1} y2={py(t)} />,
            )}
            {ticks.map((t, i) => (
              <text key={`t${i}`} className="gl-chart-tick" x={left - 10} y={py(t) + 4.5} textAnchor="end">
                {tickText[i]}
              </text>
            ))}
            {xTicks.map((t, i) =>
              t.text ? (
                <text key={`x${i}`} className="gl-chart-tick" x={t.x} y={H - bottom + 20} textAnchor="middle">
                  {t.text}
                </text>
              ) : null,
            )}
            <line className="gl-chart-axis-line" x1={left} y1={baseY} x2={x1} y2={baseY} />
            {series.map((s, si) =>
              area || s.area ? <path key={`a${si}`} className="gl-line-chart-area" d={lines[si].areaD} style={{ fill: seriesColor(si, s.color) }} /> : null,
            )}
            {series.map((s, si) => (
              <path key={`l${si}`} className="gl-line-chart-line" d={lines[si].d} style={{ stroke: seriesColor(si, s.color) }} />
            ))}
            {showEndLabels
              ? placed.map((p) => (
                  <g key={`e${p.si}`} className="gl-line-chart-end">
                    {Math.abs(p.ly - p.y0) > 1.5 || p.x < x1 - 1 ? (
                      <polyline
                        className="gl-line-chart-leader"
                        points={p.x < x1 - 1 ? `${p.x + 6},${p.y0} ${x1 + 4},${p.y0} ${labelX - 4},${p.ly}` : `${p.x + 6},${p.y0} ${labelX - 4},${p.ly}`}
                        style={{ stroke: seriesColor(p.si, series[p.si].color) }}
                      />
                    ) : null}
                    <circle className="gl-line-chart-dot" cx={p.x} cy={p.y0} r={4} style={{ fill: seriesColor(p.si, series[p.si].color) }} />
                    <text className="gl-chart-value" x={labelX} y={p.ly + 4.5}>
                      {p.text ? (
                        <>
                          {p.text}
                          <tspan className="gl-line-chart-end-value" dx={6}>{p.valueText}</tspan>
                        </>
                      ) : (
                        p.valueText
                      )}
                    </text>
                  </g>
                ))
              : null}
            {current != null ? <line className="gl-line-chart-crosshair" x1={cx0} y1={top} x2={cx0} y2={H - bottom} /> : null}
            {markers.map((m) => (
              <circle key={`m${m.si}`} className="gl-line-chart-marker" cx={cx0} cy={py(m.v)} r={4} style={{ fill: seriesColor(m.si, series[m.si].color) }} />
            ))}
          </g>
        </svg>
        <ChartTooltip
          open={current != null}
          x={cx0}
          y={tipY}
          placement="right"
          bounds={W}
          head={current != null ? fmtX(xs[current], 'tooltip') : undefined}
          rows={markers.map((m) => ({ color: seriesColor(m.si, series[m.si].color), value: fmt(m.v), name: series[m.si].label }))}
        />
      </div>
      {table !== 'none' ? (
        <ChartTable
          caption={title}
          visible={table === 'visible'}
          columns={[xLabel, ...series.map((s) => s.label)]}
          rows={xs.map((v, i) => ({ head: fmtX(v, 'tooltip'), cells: series.map((s) => (s.data[i] == null ? '–' : fmt(s.data[i] as number))) }))}
        />
      ) : null}
    </div>
  );
});

/** Widest end label (name, a gap, the value), for the right margin. */
function endLabelWidth(on: boolean, ends: Array<{ text: string; valueText: string }>): number {
  if (!on) return 0;
  return Math.max(0, ...ends.map((e) => (e.text ? textWidth(e.text) + 6 : 0) + textWidth(e.valueText)));
}
