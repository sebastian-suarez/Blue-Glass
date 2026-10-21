import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useForkRef } from '../internal/hooks';

export interface SliderMark {
  /** Where the mark sits, in the slider's units. */
  value: number;
  /** Text under the mark (12px, color-muted; ink inside the filled range). */
  label?: React.ReactNode;
}

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange' | 'defaultValue'> {
  /** The value (controlled): a number, or [low, high] for a range with two thumbs. */
  value?: number | number[];
  /** The starting value (uncontrolled). An array makes a range. Default: min. */
  defaultValue?: number | number[];
  /** Called on every change, while dragging too, with the new value and the thumb that moved. */
  onChange?: (event: React.SyntheticEvent, value: number | number[], activeThumb: number) => void;
  /** Called once a drag ends or a key changes the value: the moment to save. */
  onChangeCommitted?: (event: React.SyntheticEvent, value: number | number[]) => void;
  /** Lowest value. Default 0. */
  min?: number;
  /** Highest value. Default 100. */
  max?: number;
  /** Granularity. Default 1. null snaps to the marks only. */
  step?: number | null;
  /** The jump for Page Up/Down and Shift+arrow. Default 10 steps. */
  shiftStep?: number;
  /** true puts a dot at every step; an array places labelled marks. */
  marks?: boolean | SliderMark[];
  /** Default horizontal. Vertical fills its parent's height, so give the parent one. */
  orientation?: 'horizontal' | 'vertical';
  /** Dims to 50%; no pointer or keyboard changes. */
  disabled?: boolean;
  /** Which part is filled in color-blue: up to the value (normal), from it (inverted), or none. */
  track?: 'normal' | 'inverted' | false;
  /** The ink value pill over the thumb: auto shows it while dragging, hovered or keyboard-focused; on always; off never. */
  valueLabelDisplay?: 'auto' | 'on' | 'off';
  /** Format the value pill, e.g. (v) => `${v} ms`. A returned string also becomes aria-valuetext. */
  valueLabelFormat?: string | ((value: number, index: number) => React.ReactNode);
  /** The text a screen reader says for a value, e.g. "120 milliseconds". */
  getAriaValueText?: (value: number, index: number) => string;
  /** Names each thumb of a range, e.g. (i) => (i ? 'Highest' : 'Lowest'). */
  getAriaLabel?: (index: number) => string;
  /** Form field name: one hidden input per thumb. */
  name?: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function decimals(n: number): number {
  const s = String(n);
  if (s.includes('e-')) return parseInt(s.split('e-')[1], 10);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
}

type Drag = { index: number; pointerId: number; stack: [number, number]; origin: number };

/**
 * A slider on a 4px pill track (color-line rail, color-blue fill, a white thumb
 * with the dg-edge edge, an ink value pill) for one value or a range, with marks,
 * steps, a vertical orientation, pointer capture and the APG slider keyboard.
 */
export const Slider = React.forwardRef<HTMLSpanElement, SliderProps>(function Slider(props, ref) {
  const {
    value: valueProp, defaultValue, onChange, onChangeCommitted, min = 0, max = 100, step = 1, shiftStep,
    marks: marksProp = false, orientation = 'horizontal', disabled = false, track = 'normal',
    valueLabelDisplay = 'auto', valueLabelFormat, getAriaValueText, getAriaLabel, name, className,
    'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, 'aria-describedby': ariaDescribedby,
    ...rest
  } = props;
  const [state, setState] = useControlled<number | number[]>(valueProp, defaultValue ?? min);
  const range = Array.isArray(state);
  const values = (range ? (state as number[]).slice().sort((a, b) => a - b) : [state as number]).map((v) => clamp(v, min, max));
  const vertical = orientation === 'vertical';
  const [activeThumb, setActiveThumb] = React.useState(-1);
  const rootRef = React.useRef<HTMLSpanElement | null>(null);
  const handleRef = useForkRef(rootRef, ref);
  const railRef = React.useRef<HTMLSpanElement | null>(null);
  const thumbs = React.useRef<Array<HTMLSpanElement | null>>([]);
  const drag = React.useRef<Drag | null>(null);
  const current = React.useRef(values);
  current.current = values;
  const own = rest as Record<string, ((e: React.PointerEvent<HTMLSpanElement>) => void) | undefined>;

  const marks: SliderMark[] = React.useMemo(() => {
    if (Array.isArray(marksProp)) return marksProp;
    if (marksProp !== true || !step || step <= 0) return [];
    const out: SliderMark[] = [];
    const count = Math.floor((max - min) / step);
    if (count > 200) return out;
    for (let k = 0; k <= count; k++) out.push({ value: Number((min + k * step).toFixed(decimals(step))) });
    return out;
  }, [marksProp, step, min, max]);
  const markValues = marks.map((m) => m.value).sort((a, b) => a - b);

  const pct = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
  const snap = (raw: number): number => {
    const v = clamp(raw, min, max);
    if (step === null) {
      if (!markValues.length) return v;
      return markValues.reduce((best, m) => (Math.abs(m - v) < Math.abs(best - v) ? m : best), markValues[0]);
    }
    if (step <= 0) return v;
    return clamp(Number((Math.round((v - min) / step) * step + min).toFixed(decimals(step))), min, max);
  };
  const bounds = (cur: number[], i: number): [number, number] => [i > 0 ? cur[i - 1] : min, i < cur.length - 1 ? cur[i + 1] : max];
  const output = (next: number[]) => (range ? next : next[0]);

  const commit = (event: React.SyntheticEvent, i: number, raw: number): number[] | null => {
    const cur = current.current;
    const [lo, hi] = bounds(cur, i);
    const v = clamp(snap(raw), lo, hi);
    if (v === cur[i]) return null;
    const next = cur.slice();
    next[i] = v;
    current.current = next;
    setState(output(next));
    onChange?.(event, output(next), i);
    return next;
  };

  const valueAt = (x: number, y: number): number => {
    const r = railRef.current?.getBoundingClientRect();
    if (!r || (vertical ? r.height : r.width) === 0) return min;
    const p = vertical ? (r.bottom - y) / r.height : (x - r.left) / r.width;
    return min + clamp(p, 0, 1) * (max - min);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    own.onPointerDown?.(e);
    if (disabled || e.button !== 0 || e.defaultPrevented) return;
    e.preventDefault();
    const raw = valueAt(e.clientX, e.clientY);
    const cur = current.current;
    const onThumb = (e.target as HTMLElement).closest('[data-index]');
    let index = 0;
    if (onThumb) {
      index = Number(onThumb.getAttribute('data-index'));
    } else {
      for (let i = 1; i < cur.length; i++) {
        const d = Math.abs(cur[i] - raw);
        const best = Math.abs(cur[index] - raw);
        if (d < best || (d === best && raw > cur[i])) index = i;
      }
    }
    // Two thumbs on one value: the first movement decides which one goes.
    const stacked = onThumb && cur.length > 1 && ((index > 0 && cur[index - 1] === cur[index]) || (index < cur.length - 1 && cur[index + 1] === cur[index]));
    const pair: [number, number] = index > 0 && cur[index - 1] === cur[index] ? [index - 1, index] : [index, index + 1];
    drag.current = { index: stacked ? -1 : index, pointerId: e.pointerId, stack: pair, origin: raw };
    setActiveThumb(index);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best effort */
    }
    thumbs.current[index]?.focus({ preventScroll: true });
    if (!onThumb) commit(e, index, raw);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    own.onPointerMove?.(e);
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const raw = valueAt(e.clientX, e.clientY);
    if (d.index < 0) {
      if (raw === d.origin) return;
      d.index = raw < d.origin ? d.stack[0] : d.stack[1];
      setActiveThumb(d.index);
      thumbs.current[d.index]?.focus({ preventScroll: true });
    }
    commit(e, d.index, raw);
  };
  const endDrag = (e: React.PointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setActiveThumb(-1);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    onChangeCommitted?.(e, output(current.current));
  };

  const onThumbKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>, i: number) => {
    if (disabled) return;
    const cur = current.current;
    const [lo, hi] = bounds(cur, i);
    const unit = step ?? 0;
    const big = shiftStep ?? (step ? step * 10 : (max - min) / 10);
    const move = (dir: 1 | -1, size: number): number => {
      if (step === null) {
        const list = dir > 0 ? markValues.filter((m) => m > cur[i]) : markValues.filter((m) => m < cur[i]).reverse();
        return list.length ? list[0] : cur[i];
      }
      return cur[i] + dir * size;
    };
    let target: number;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        target = move(1, e.shiftKey ? big : unit);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        target = move(-1, e.shiftKey ? big : unit);
        break;
      case 'PageUp':
        target = move(1, big);
        break;
      case 'PageDown':
        target = move(-1, big);
        break;
      case 'Home':
        target = lo;
        break;
      case 'End':
        target = hi;
        break;
      default:
        return;
    }
    e.preventDefault();
    const next = commit(e, i, target);
    if (next) onChangeCommitted?.(e, output(next));
  };

  const format = (v: number, i: number): React.ReactNode =>
    typeof valueLabelFormat === 'function' ? valueLabelFormat(v, i) : typeof valueLabelFormat === 'string' ? valueLabelFormat : v;
  const valueText = (v: number, i: number): string | undefined => {
    if (getAriaValueText) return getAriaValueText(v, i);
    const f = format(v, i);
    return typeof f === 'string' && f !== String(v) ? f : undefined;
  };

  let a = 0;
  let b = 0;
  if (range) {
    a = pct(values[0]);
    b = pct(values[values.length - 1]);
  } else if (track === 'inverted') {
    a = pct(values[0]);
    b = 100;
  } else {
    b = pct(values[0]);
  }
  const at = (p: number): React.CSSProperties => (vertical ? { bottom: `${p}%` } : { left: `${p}%` });
  const inTrack = (m: number) =>
    track === false ? false : range ? m >= values[0] && m <= values[values.length - 1] : track === 'inverted' ? m >= values[0] : m <= values[0];
  const labelled = marks.some((m) => m.label !== undefined && m.label !== null && m.label !== '');

  return (
    <span
      {...rest}
      ref={handleRef}
      className={cx(
        'gl-slider',
        vertical ? 'gl-slider-vertical' : 'gl-slider-horizontal',
        disabled && 'gl-slider-disabled',
        labelled && 'gl-slider-labelled',
        valueLabelDisplay === 'on' && 'gl-slider-label-on',
        valueLabelDisplay === 'auto' && 'gl-slider-label-auto',
        className as string | undefined,
      )}
      data-dragging={activeThumb >= 0 ? '' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e: React.PointerEvent<HTMLSpanElement>) => {
        own.onPointerUp?.(e);
        endDrag(e);
      }}
      onPointerCancel={(e: React.PointerEvent<HTMLSpanElement>) => {
        own.onPointerCancel?.(e);
        endDrag(e);
      }}
    >
      <span ref={railRef} className="gl-slider-rail" />
      {track !== false ? <span className="gl-slider-track" style={vertical ? { bottom: `${a}%`, height: `${b - a}%` } : { left: `${a}%`, width: `${b - a}%` }} /> : null}
      {marks.map((m, k) => {
        const p = pct(clamp(m.value, min, max));
        const on = inTrack(m.value) ? '' : undefined;
        return (
          <React.Fragment key={k}>
            <span className="gl-slider-mark" style={at(p)} data-active={on} />
            {m.label !== undefined && m.label !== null && m.label !== '' ? (
              <span className="gl-slider-mark-label" style={at(p)} data-active={on} data-edge={p <= 0 ? 'start' : p >= 100 ? 'end' : undefined} aria-hidden="true">
                {m.label}
              </span>
            ) : null}
          </React.Fragment>
        );
      })}
      {values.map((v, i) => {
        const [lo, hi] = bounds(values, i);
        return (
          <span
            key={i}
            ref={(el: HTMLSpanElement | null) => {
              thumbs.current[i] = el;
            }}
            role="slider"
            data-index={i}
            tabIndex={disabled ? -1 : 0}
            className="gl-slider-thumb"
            style={at(pct(v))}
            data-active={activeThumb === i ? '' : undefined}
            aria-valuenow={v}
            aria-valuemin={lo}
            aria-valuemax={hi}
            aria-valuetext={valueText(v, i)}
            aria-orientation={orientation}
            aria-disabled={disabled || undefined}
            aria-label={getAriaLabel ? getAriaLabel(i) : ariaLabel}
            aria-labelledby={getAriaLabel ? undefined : ariaLabelledby}
            aria-describedby={ariaDescribedby}
            onKeyDown={(e: React.KeyboardEvent<HTMLSpanElement>) => onThumbKeyDown(e, i)}
          >
            {valueLabelDisplay !== 'off' ? (
              <span className="gl-slider-value" aria-hidden="true">
                {format(v, i)}
              </span>
            ) : null}
          </span>
        );
      })}
      {name ? values.map((v, i) => <input key={i} type="hidden" name={name} value={v} />) : null}
    </span>
  );
});
