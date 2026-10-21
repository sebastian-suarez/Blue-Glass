import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useId } from '../internal/hooks';
import { Icon } from '../data-display/Icon';

function decimalsOf(n: number): number {
  const text = String(n);
  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

function roundTo(value: number, precision: number): number {
  return Number((Math.round(value / precision) * precision).toFixed(decimalsOf(precision)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export interface RatingProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onChange' | 'defaultValue' | 'children'> {
  /** The rating, controlled; null for none. */
  value?: number | null;
  /** The initial rating, uncontrolled. */
  defaultValue?: number | null;
  /** Called with the event and the new rating; null when the reader presses the current star to clear it. */
  onChange?: (event: React.SyntheticEvent, value: number | null) => void;
  /** Called with the value under the mouse while it hovers, and -1 when it leaves: use it for live feedback. */
  onChangeActive?: (event: React.SyntheticEvent, value: number) => void;
  /** Number of stars. Default 5. */
  max?: number;
  /** The step: 1 for whole stars (default) or 0.5 for half stars. */
  precision?: number;
  /** Display only: no inputs; the stars become one image named by the value ("4 out of 5 stars"). */
  readOnly?: boolean;
  /** Shown but not operable; dimmed. */
  disabled?: boolean;
  /** Star size: sm 18px, md 24px (default), lg 32px. */
  size?: 'sm' | 'md' | 'lg';
  /** The radio inputs' name, for forms; generated when omitted. */
  name?: string;
  /** Visible text beside the stars: the value, or what it means. */
  label?: React.ReactNode;
  /** Accessible text for a value. Default: "4 out of 5 stars". */
  getLabelText?: (value: number) => string;
  /** Accessible text for no rating. Default: "No rating". */
  emptyLabelText?: string;
  /** The root's id; the inputs' ids derive from it. */
  id?: string;
  /** Names the stars (default "Rating"); read-only prefixes it to the value: "VSebCode: 4.5 out of 5 stars". */
  'aria-label'?: string;
  /** Names the stars by another element's id (interactive only). */
  'aria-labelledby'?: string;
  /** Classes on the root. */
  className?: string;
}

/**
 * Stars for a score. Each step is a visually hidden native radio, so arrow keys work as in any radio
 * group; the mouse previews before it commits, and pressing the current star clears it.
 */
export const Rating = React.forwardRef<HTMLSpanElement, RatingProps>(function Rating(
  {
    value: valueProp, defaultValue = null, onChange, onChangeActive, max = 5, precision = 1, readOnly = false,
    disabled = false, size = 'md', name: nameProp, label, getLabelText, emptyLabelText = 'No rating', className,
    id: idProp, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, ...rest
  },
  ref,
) {
  const baseId = useId(idProp);
  const name = nameProp ?? `${baseId}-rating`;
  const [valueState, setValue] = useControlled<number | null>(valueProp, defaultValue);
  const value = valueState == null ? null : roundTo(clamp(valueState, 0, max), precision);
  const [hover, setHover] = React.useState(-1);
  const starsRef = React.useRef<HTMLSpanElement | null>(null);
  const interactive = !readOnly && !disabled;
  const textFor = getLabelText ?? ((v: number) => `${v} out of ${max} stars`);
  const shown = interactive && hover !== -1 ? hover : value ?? 0;
  const steps = Math.max(1, Math.round(1 / precision));

  const commit = (event: React.SyntheticEvent, next: number | null) => {
    setValue(next);
    onChange?.(event, next);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    commit(event, raw === '' ? null : parseFloat(raw));
  };

  // Hover preview, mouse only: the value under the pointer, rounded to the step, as MUI computes it.
  const handlePointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!interactive || event.pointerType !== 'mouse' || !starsRef.current) return;
    const node = starsRef.current;
    const { left, right, width } = node.getBoundingClientRect();
    if (width === 0) return;
    const rtl = getComputedStyle(node).direction === 'rtl';
    const percent = rtl ? (right - event.clientX) / width : (event.clientX - left) / width;
    const next = clamp(roundTo(max * percent + precision / 2, precision), precision, max);
    if (next !== hover) {
      setHover(next);
      onChangeActive?.(event, next);
    }
  };
  const handlePointerLeave = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (hover === -1) return;
    setHover(-1);
    onChangeActive?.(event, -1);
  };

  const stars: React.ReactNode[] = [];
  for (let i = 1; i <= max; i += 1) {
    const fill = clamp(shown - (i - 1), 0, 1);
    const hits: React.ReactNode[] = [];
    if (!readOnly) {
      for (let k = 1; k <= steps; k += 1) {
        const stepValue = roundTo(i - 1 + k * precision, precision);
        const inputId = `${baseId}-${String(stepValue).replace('.', '-')}`;
        const segment = steps > 1 ? { insetInlineStart: `${((k - 1) / steps) * 100}%`, width: `${100 / steps}%` } : undefined;
        hits.push(
          <React.Fragment key={k}>
            <input
              className="gl-rating-input gl-sr-only"
              type="radio"
              id={inputId}
              name={name}
              value={stepValue}
              checked={value === stepValue}
              disabled={disabled}
              onChange={handleChange}
            />
            <label
              htmlFor={inputId}
              className="gl-rating-hit"
              style={segment}
              onClick={(event: React.MouseEvent<HTMLLabelElement>) => {
                // Pressing the current value clears it (keyboard Space on a checked radio never gets here).
                if (!interactive || stepValue !== value) return;
                event.preventDefault();
                setHover(-1);
                commit(event, null);
              }}
            >
              <span className="gl-sr-only">{textFor(stepValue)}</span>
            </label>
          </React.Fragment>,
        );
      }
    }
    stars.push(
      <span
        key={i}
        className={cx('gl-rating-star', interactive && hover !== -1 && Math.ceil(hover) === i && 'gl-rating-star-hover')}
      >
        <span className="gl-rating-icon" aria-hidden="true">
          <Icon name="star" className="gl-rating-empty" />
          {fill > 0 ? (
            <Icon
              name="star"
              filled
              className="gl-rating-fill"
              style={fill < 1 ? { '--gl-rating-fill': `${Math.round(fill * 100)}%` } : undefined}
            />
          ) : null}
        </span>
        {hits}
      </span>,
    );
  }

  const valueText = value == null ? emptyLabelText : textFor(value);

  return (
    <span
      ref={ref}
      id={idProp}
      className={cx('gl-rating', `gl-rating-${size}`, readOnly && 'gl-rating-readonly', disabled && 'gl-rating-disabled', className)}
      {...rest}
    >
      <span
        ref={starsRef}
        className="gl-rating-stars"
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={readOnly ? (ariaLabel ? `${ariaLabel}: ${valueText}` : valueText) : ariaLabelledby ? undefined : ariaLabel ?? 'Rating'}
        aria-labelledby={readOnly ? undefined : ariaLabelledby}
        aria-disabled={disabled || undefined}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerLeave={interactive ? handlePointerLeave : undefined}
      >
        {stars}
        {interactive ? (
          <>
            <input
              className="gl-rating-input gl-rating-none gl-sr-only"
              type="radio"
              id={`${baseId}-none`}
              name={name}
              value=""
              checked={value == null}
              onChange={handleChange}
            />
            <label htmlFor={`${baseId}-none`} className="gl-sr-only">{emptyLabelText}</label>
          </>
        ) : null}
      </span>
      {label != null ? <span className="gl-rating-label">{label}</span> : null}
    </span>
  );
});
