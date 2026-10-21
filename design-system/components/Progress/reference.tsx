import * as React from 'react';
import { cx } from '../internal/cx';
import { useId } from '../internal/hooks';

const clamp = (v: number) => Math.min(100, Math.max(0, Number.isFinite(v) ? v : 0));

export interface LinearProgressProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
  /** determinate: a bar for value. buffer: value plus valueBuffer. indeterminate (default): a bar slides while the length is unknown. */
  variant?: 'determinate' | 'indeterminate' | 'buffer';
  /** Progress from 0 to 100 (determinate and buffer). */
  value?: number;
  /** How much is ready ahead of value, 0 to 100 (buffer), drawn in color-ring at 40%. */
  valueBuffer?: number;
  /** Visible label above the track; it also names the progressbar. */
  label?: React.ReactNode;
  /** A readable value shown at the end of the label row and read as aria-valuetext ("3 of 5 files"). */
  valueText?: string;
  /** Show the rounded percentage at the end of the label row (determinate and buffer). */
  showValue?: boolean;
  /** default: color-blue on a color-line track. inherit: currentColor, for dark grounds. */
  color?: 'default' | 'inherit';
}

/** A 4px pill track in color-line with a color-blue bar: determinate, buffered, or sliding while the length is unknown. */
export const LinearProgress = React.forwardRef<HTMLDivElement, LinearProgressProps>(function LinearProgress(
  { variant = 'indeterminate', value = 0, valueBuffer = 0, label, valueText, showValue = false, color = 'default', id, className, ...rest },
  ref,
) {
  const labelId = useId(id ? `${id}-label` : undefined);
  const determinate = variant !== 'indeterminate';
  const v = clamp(value);
  const named = rest['aria-label'] != null || rest['aria-labelledby'] != null;
  const shown = valueText ?? (showValue && determinate ? `${Math.round(v)}%` : undefined);
  return (
    <div
      ref={ref}
      id={id}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(v) : undefined}
      aria-valuetext={valueText}
      aria-labelledby={!named && label != null ? labelId : undefined}
      aria-label={!named && label == null ? 'Loading' : undefined}
      className={cx('gl-linear-progress', `gl-linear-progress-${variant}`, color === 'inherit' && 'gl-progress-inherit', className)}
      {...rest}
    >
      {label != null || shown != null ? (
        <div className="gl-linear-progress-head">
          {label != null ? (
            <span id={labelId} className="gl-linear-progress-label">
              {label}
            </span>
          ) : null}
          {shown != null ? (
            <span className="gl-linear-progress-value" aria-hidden="true">
              {shown}
            </span>
          ) : null}
        </div>
      ) : null}
      {/* The indeterminate bar is the track's ::before; determinate bars slide in from the left. */}
      <div className="gl-linear-progress-track">
        {variant === 'buffer' ? (
          <div className="gl-linear-progress-buffer-bar" style={{ transform: `translateX(${clamp(valueBuffer) - 100}%)` }} />
        ) : null}
        {determinate ? <div className="gl-linear-progress-bar" style={{ transform: `translateX(${v - 100}%)` }} /> : null}
      </div>
    </div>
  );
});

const SIZES = { xs: 20, sm: 28, md: 40, lg: 56 } as const;

export interface CircularProgressProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'color'> {
  /** determinate: an arc for value. indeterminate (default): a turning arc that grows and shrinks. */
  variant?: 'determinate' | 'indeterminate';
  /** Progress from 0 to 100 (determinate). */
  value?: number;
  /** xs 20px, sm 28px, md 40px (default), lg 56px, or a number of px. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  /** Ring stroke in px. Default 2.5, 3, 4 or 4.5 by size. */
  thickness?: number;
  /** Show the rounded percentage in the middle (determinate, 40px and up). */
  showValue?: boolean;
  /** default: color-blue on a color-line ring. inherit: currentColor, for dark grounds. */
  color?: 'default' | 'inherit';
}

/** An SVG ring: color-line track and a color-blue arc with round caps; determinate, or turning while the length is unknown. */
export const CircularProgress = React.forwardRef<HTMLSpanElement, CircularProgressProps>(function CircularProgress(
  { variant = 'indeterminate', value = 0, size = 'md', thickness, showValue = false, color = 'default', className, style, ...rest },
  ref,
) {
  const px = typeof size === 'number' ? size : SIZES[size];
  const stroke = thickness ?? (px <= 20 ? 2.5 : px <= 28 ? 3 : px <= 40 ? 4 : 4.5);
  const c = px / 2;
  const r = (px - stroke) / 2;
  const determinate = variant === 'determinate';
  const v = clamp(value);
  const named = rest['aria-label'] != null || rest['aria-labelledby'] != null;
  return (
    <span
      ref={ref}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(v) : undefined}
      aria-label={named ? undefined : 'Loading'}
      className={cx('gl-circular-progress', `gl-circular-progress-${variant}`, color === 'inherit' && 'gl-progress-inherit', className)}
      style={{ width: px, height: px, ...style }}
      {...rest}
    >
      <svg className="gl-circular-progress-svg" viewBox={`0 0 ${px} ${px}`} width={px} height={px} aria-hidden="true" focusable="false">
        <circle className="gl-circular-progress-track" cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} />
        {/* pathLength 100: dash lengths and offsets read as percentages of the ring. */}
        <circle
          className="gl-circular-progress-arc"
          cx={c}
          cy={c}
          r={r}
          fill="none"
          strokeWidth={stroke}
          pathLength={100}
          strokeDasharray={determinate ? '100 100' : undefined}
          strokeDashoffset={determinate ? 100 - v : undefined}
          style={determinate && v <= 0 ? { visibility: 'hidden' } : undefined}
        />
      </svg>
      {showValue && determinate && px >= 40 ? (
        <span className="gl-circular-progress-value" style={{ fontSize: Math.round(px * 0.27) }} aria-hidden="true">
          {`${Math.round(v)}%`}
        </span>
      ) : null}
    </span>
  );
});
