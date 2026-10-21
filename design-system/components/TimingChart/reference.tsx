import * as React from 'react';
import { cx } from '../internal/cx';
import { DiagramHost } from './Diagram';

/** Before/after bars. Values in one unit (the site's are milliseconds); the axis is linear so the gap reads true. */
export interface TimingData {
  /** Names the dataset (kept on the root as data-chart). */
  id: string;
  /** Accessible name. */
  label: string;
  /** One or two sentences with the numbers, read by screen readers as the SVG's desc. */
  description: string;
  /** Right end of the axis, in the data's unit. */
  axisMax: number;
  /** Axis ticks: a value and its text ("2 s"). */
  ticks: Array<{ value: number; text: string }>;
  /** One bar per row: its name, value, the text at its tip, and muted or accent. */
  rows: Array<{ name: string; value: number; text: string; tone?: 'muted' | 'accent' }>;
}

const WIDTH = 820;
const BAR_X = 110;
const BAR_W = 600;
const BAR_H = 36;
const ROW_GAP = 20;
const TOP = 12;
/** A real 20 ms bar is 2 units wide on a 6 s axis; never draw it thinner than that. */
const MIN_BAR = 2;

export interface TimingChartProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Class names for the root element, merged with the component's own. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** Rows, axis and accessible text. Two rows is the site's layout; more rows stack the same way. */
  data: TimingData;
  /** Floor for the scale: below `820 × minScale` px the host scrolls sideways (the site uses 0.6). */
  minScale?: number;
  /** Grow the bars in when the chart scrolls into view. Default true. */
  reveal?: boolean;
}

/** The site's before/after timing bars on a linear axis, styled and revealed like the diagrams. */
export const TimingChart = React.forwardRef<HTMLDivElement, TimingChartProps>(function TimingChart(
  { data, minScale = 0, reveal = true, className, ...rest },
  ref,
) {
  const n = data.rows.length;
  // The site's AXIS_Y = 2 × BAR_H + ROW_GAP + 40 and HEIGHT 168, written for any row count.
  const axisY = TOP + n * BAR_H + (n - 1) * ROW_GAP + 28;
  const height = axisY + 36;
  const x = (value: number) => BAR_X + (Math.max(0, Math.min(value, data.axisMax)) / data.axisMax) * BAR_W;
  return (
    <DiagramHost
      ref={ref}
      label={data.label}
      description={data.description}
      width={WIDTH}
      height={height}
      minScale={minScale}
      reveal={reveal}
      scrollHint="Scroll sideways for the whole chart."
      className={cx('gl-dg-chart', className)}
      data-chart={data.id}
      {...rest}
    >
      <g className="gl-dg-axis" aria-hidden="true">
        <line className="gl-dg-axis-line" x1={BAR_X} x2={BAR_X + BAR_W} y1={axisY} y2={axisY} />
        {data.ticks.map((tick) => (
          <g key={tick.value}>
            <line className="gl-dg-axis-line" x1={x(tick.value)} x2={x(tick.value)} y1={axisY} y2={axisY + 6} />
            <text className="gl-dg-label" x={x(tick.value)} y={axisY + 22} textAnchor="middle" fontSize={13}>
              {tick.text}
            </text>
          </g>
        ))}
      </g>
      {data.rows.map((row, i) => {
        const y = TOP + i * (BAR_H + ROW_GAP);
        const w = Math.max(MIN_BAR, x(row.value) - BAR_X);
        const tone = row.tone ?? 'muted';
        return (
          <g key={row.name} className={`gl-dg-bar-row gl-dg-tone-${tone}`} style={{ '--i': i }}>
            <text className="gl-dg-text" x={0} y={y + BAR_H / 2 + 15 * 0.36} fontSize={15} fontWeight={600}>
              {row.name}
            </text>
            <rect className="gl-dg-bar-track" x={BAR_X} y={y} width={BAR_W} height={BAR_H} rx={10} />
            <rect className="gl-dg-bar" x={BAR_X} y={y} width={w} height={BAR_H} rx={Math.min(10, w / 2)} />
            <text className={`gl-dg-label gl-dg-label-${tone} gl-dg-bar-value`} x={BAR_X + w + 12} y={y + BAR_H / 2 + 13 * 0.36} fontSize={13}>
              {row.text}
            </text>
          </g>
        );
      })}
    </DiagramHost>
  );
});
