/**
 * Private helpers for the option lists in Select, Autocomplete and TransferList
 * (builder inputs-b): keyboard movement over enabled rows, typeahead, accent- and
 * case-insensitive matching, and scrolling a row into view inside its list only.
 */
import * as React from 'react';

/** Lower case, accents stripped: "Medellín" -> "medellin". */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Where `query` first occurs in `text`, ignoring case and accents, as [start, end)
 * in `text`'s own indices (so the original characters can be wrapped). Null when absent.
 */
export function matchRange(text: string, query: string): [number, number] | null {
  const q = fold(query.trim());
  if (!q) return null;
  let folded = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) {
      starts.push(i);
      ends.push(i + ch.length);
    }
    folded += f;
    i += ch.length;
  }
  const at = folded.indexOf(q);
  if (at < 0) return null;
  return [starts[at], ends[at + q.length - 1]];
}

/**
 * The next enabled index from `from` in direction `dir`. With `wrap`, it cycles;
 * without, it stays on `from` at the ends. `from` of -1 starts before the first
 * (dir 1) or after the last (dir -1) row.
 */
export function stepIndex(from: number, dir: 1 | -1, count: number, isEnabled: (i: number) => boolean, wrap = false): number {
  if (count <= 0) return -1;
  let i = from < 0 ? (dir > 0 ? -1 : count) : from;
  for (let n = 0; n < count; n++) {
    i += dir;
    if (i >= count || i < 0) {
      if (!wrap) return from >= 0 && from < count ? from : -1;
      i = i >= count ? 0 : count - 1;
    }
    if (isEnabled(i)) return i;
  }
  return from;
}

/** First (dir 1) or last (dir -1) enabled index, or -1. */
export function edgeIndex(dir: 1 | -1, count: number, isEnabled: (i: number) => boolean): number {
  return stepIndex(-1, dir, count, isEnabled, false);
}

/** Jump `delta` rows (PageUp/PageDown), clamped, landing on the nearest enabled row in that direction. */
export function jumpIndex(from: number, delta: number, count: number, isEnabled: (i: number) => boolean): number {
  if (count <= 0) return -1;
  const dir: 1 | -1 = delta > 0 ? 1 : -1;
  let target = Math.min(count - 1, Math.max(0, (from < 0 ? 0 : from) + delta));
  if (isEnabled(target)) return target;
  const forward = stepIndex(target, dir, count, isEnabled, false);
  if (forward !== target && isEnabled(forward)) return forward;
  target = stepIndex(target, dir === 1 ? -1 : 1, count, isEnabled, false);
  return isEnabled(target) ? target : from;
}

/** True for a key that types a character (typeahead), not a shortcut. */
export function isPrintableKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): boolean {
  return e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey;
}

/**
 * APG typeahead: characters typed within 500ms build a search string; the next
 * enabled row whose text starts with it wins. Repeating one letter cycles through
 * the rows that start with it.
 */
export function useTypeahead(timeout = 500) {
  const state = React.useRef<{ text: string; timer: ReturnType<typeof setTimeout> | undefined }>({ text: '', timer: undefined });
  React.useEffect(() => () => clearTimeout(state.current.timer), []);
  return React.useCallback(
    (char: string, labels: string[], active: number, isEnabled: (i: number) => boolean): number => {
      const s = state.current;
      const c = fold(char);
      clearTimeout(s.timer);
      s.text += c;
      s.timer = setTimeout(() => {
        s.text = '';
      }, timeout);
      const n = labels.length;
      const find = (needle: string, start: number) => {
        for (let k = 0; k < n; k++) {
          const i = (((start + k) % n) + n) % n;
          if (isEnabled(i) && fold(labels[i]).startsWith(needle)) return i;
        }
        return -1;
      };
      // A longer string keeps the current row while it still matches; one letter moves on.
      let idx = find(s.text, s.text.length > 1 ? Math.max(active, 0) : active + 1);
      if (idx < 0 && s.text.length > 1) {
        // A repeated letter cycles through its rows; anything else starts over from the latest letter.
        const repeated = s.text.split('').every((ch) => ch === s.text[0]);
        idx = find(repeated ? s.text[0] : c, active + 1);
        if (!repeated) s.text = c;
      }
      if (idx < 0) s.text = '';
      return idx;
    },
    [timeout],
  );
}

/** Scroll `el` into view inside its nearest scrolling ancestor only, never the page. */
export function scrollIntoViewNearest(el: Element | null | undefined): void {
  if (!el) return;
  let box = el.parentElement;
  while (box) {
    const oy = getComputedStyle(box).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight) break;
    box = box.parentElement;
  }
  if (!box) return;
  const cs = getComputedStyle(box);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const padBottom = parseFloat(cs.paddingBottom) || 0;
  const b = box.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const top = b.top + box.clientTop + padTop;
  const bottom = b.top + box.clientTop + box.clientHeight - padBottom;
  if (r.top < top) box.scrollTop -= top - r.top;
  else if (r.bottom > bottom) box.scrollTop += r.bottom - bottom;
}
