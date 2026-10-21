import * as React from 'react';
import { cx } from '../internal/cx';
import { useForkRef, useIsoLayoutEffect } from '../internal/hooks';

export interface TextareaAutosizeProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Height floor in rows. Default 1. */
  minRows?: number;
  /** Height ceiling in rows; scrolls past it. */
  maxRows?: number;
}

/** A plain textarea that grows with its content between minRows and maxRows. Unstyled: TextField styles it. */
export const TextareaAutosize = React.forwardRef<HTMLTextAreaElement, TextareaAutosizeProps>(function TextareaAutosize(
  { minRows = 1, maxRows, className, style, onChange, value, ...rest },
  ref,
) {
  const inner = React.useRef<HTMLTextAreaElement | null>(null);
  const handleRef = useForkRef(inner, ref);
  const resize = React.useCallback(() => {
    const el = inner.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const border = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    el.style.height = '0px';
    const content = el.scrollHeight - pad;
    let h = Math.max(content, minRows * line);
    if (maxRows) h = Math.min(h, maxRows * line);
    el.style.height = `${Math.ceil(h + pad + border)}px`;
    el.style.overflowY = maxRows && content > maxRows * line ? 'auto' : 'hidden';
  }, [minRows, maxRows]);
  useIsoLayoutEffect(() => {
    resize();
  });
  React.useEffect(() => {
    const el = inner.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let lastWidth = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== lastWidth) {
        lastWidth = el.clientWidth;
        resize();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [resize]);
  return (
    <textarea
      ref={handleRef}
      rows={minRows}
      className={cx('gl-textarea-autosize', className)}
      style={{ resize: 'none', ...style }}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        if (value === undefined) resize();
      }}
      {...rest}
    />
  );
});
