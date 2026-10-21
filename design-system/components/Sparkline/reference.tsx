import * as React from 'react';
import { cx } from '../internal/cx';
import { formatFull } from './_charts-scale';
import { barPath } from './_charts-chrome';

export interface SparklineProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children' | 'color'> {
  /** Class names for the root element, merged with the component's own. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** The values, oldest first. */
  data: number[];
  /** line (default) or bar. */
  plotType?: 'line' | 'bar';
  /** Width in px. */
  width?: number;
  /** Height in px, 24–32. */
  height?: number;
  /** What the values are, e.g. "Months using React per year, 2020–2026". Starts the accessible summary. */
  label: string;
  /** Replaces the generated summary (first, last, low and high). */
  summary?: string;
  /** Wash under the line at 10% of the accent. */
  area?: boolean;
  /** The accent for the last point. Default chart-1; the rest is the recessive dg-edge. */
  color?: string;
  /** Formats values in the summary and the hover readout. Default: thousands separators. */
  valueFormatter?: (value: number) => string;
  /** Show the value under the pointer in a small ink pill. Default false: the summary and the number beside it carry the values. */
  showTooltip?: boolean;
}

/** A word-sized trend, 24–32px tall, in the de-emphasis grey with the last point in the accent; fits a table cell or sits beside a number. */
export const Sparkline = React.forwardRef<HTMLSpanElement, SparklineProps>(function Sparkline(
  {
    data, plotType = 'line', width = 96, height = 28, label, summary, area = false, color = 'var(--chart-1)',
    valueFormatter = formatFull, showTooltip = false, className, style, ...rest
  },
  ref,
) {
  const [hover, setHover] = React.useState<number | null>(null);
  const h = Math.max(24, Math.min(32, height));
  const w = Math.max(24, width);
  const vals = data.filter((v) => isFinite(v));
  const n = data.length;
  const fmt = (v: number) => valueFormatter(v);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 0;
  const text =
    summary ??
    (n
      ? `${n} values: first ${fmt(data[0])}, last ${fmt(data[n - 1])}, low ${fmt(min)}, high ${fmt(max)}.`
      : 'No values.');

  let marks: React.ReactNode = null;
  let lastX = 0;
  let lastY = 0;
  const xs: number[] = [];
  const ys: number[] = [];
  if (n && plotType === 'bar') {
    const gap = 2;
    const bw = Math.max(2, Math.min(8, (w - gap * (n - 1)) / n));
    const total = n * bw + (n - 1) * gap;
    const ox = (w - total) / 2;
    const top = 3;
    const base = h - 2;
    const hi = Math.max(0, max);
    marks = data.map((v, i) => {
      const bh = hi > 0 ? (Math.max(0, v) / hi) * (base - top) : 0;
      const x = ox + i * (bw + gap);
      xs.push(x + bw / 2);
      ys.push(base - bh);
      return (
        <path
          key={i}
          className={cx('gl-sparkline-bar', i === n - 1 && 'gl-sparkline-last')}
          d={bh > 0 ? barPath(x, base - bh, bw, bh, 2, 'top') : `M${x} ${base - 1}h${bw}v1h${-bw}Z`}
          style={i === n - 1 ? { fill: color } : undefined}
        />
      );
    });
  } else if (n) {
    const pad = 6;
    const x0 = 2;
    const x1 = w - pad;
    const y = (v: number) => (max === min ? h / 2 : pad + ((max - v) / (max - min)) * (h - pad * 2));
    data.forEach((v, i) => {
      xs.push(n === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (n - 1));
      ys.push(y(v));
    });
    const d = xs.map((x, i) => `${i ? 'L' : 'M'}${Math.round(x * 10) / 10} ${Math.round(ys[i] * 10) / 10}`).join('');
    lastX = xs[n - 1];
    lastY = ys[n - 1];
    marks = (
      <>
        {area ? <path className="gl-sparkline-area" d={`${d}L${lastX} ${h}L${xs[0]} ${h}Z`} style={{ fill: color }} /> : null}
        <path className="gl-sparkline-line" d={d} />
        <circle className="gl-sparkline-dot" cx={lastX} cy={lastY} r={4} style={{ fill: color }} />
      </>
    );
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!showTooltip || !n) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * w;
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(xs[i] - px) < Math.abs(xs[best] - px)) best = i;
    if (best !== hover) setHover(best);
  };

  return (
    <span
      ref={ref}
      className={cx('gl-sparkline', className)}
      role="img"
      aria-label={`${label}: ${text}`}
      style={{ width: w, height: h, ...style }}
      {...rest}
    >
      <svg
        className="gl-sparkline-svg"
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden="true"
        focusable="false"
        onPointerMove={showTooltip ? onMove : undefined}
        onPointerLeave={showTooltip ? () => setHover(null) : undefined}
      >
        {marks}
        {showTooltip && hover != null && plotType === 'line' ? <circle className="gl-sparkline-hover" cx={xs[hover]} cy={ys[hover]} r={3} /> : null}
      </svg>
      {showTooltip ? (
        <span
          className={cx('gl-sparkline-tip', hover != null && 'gl-sparkline-tip-open')}
          aria-hidden="true"
          style={{ left: hover != null ? xs[hover] : 0 }}
        >
          {hover != null ? fmt(data[hover]) : ''}
        </span>
      ) : null}
    </span>
  );
});
