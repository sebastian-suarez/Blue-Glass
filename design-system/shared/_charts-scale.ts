/**
 * Scales, ticks and number/date formatting shared by the Blue Glass charts.
 * Pure functions: no DOM, safe at module level and on the server.
 */

/** A "nice" step (1, 2, 2.5 or 5 × 10^n) that splits `span` into about `count` parts. */
export function niceStep(span: number, count: number): number {
  if (!isFinite(span) || span <= 0) return 1;
  const raw = span / Math.max(1, count);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const nice = n > 5 ? 10 : n > 2.5 ? 5 : n > 2 ? 2.5 : n > 1 ? 2 : 1;
  return nice * pow;
}

/** Round, evenly spaced ticks covering [min, max]; the domain snaps out to the first and last tick. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) {
    if (min === 0) return [0, 1];
    const pad = Math.abs(min) * 0.5;
    min -= pad;
    max += pad;
  }
  const step = niceStep(max - min, count);
  const lo = Math.floor(min / step + 1e-9) * step;
  const hi = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  return ticks;
}

/** Linear map from a domain to a range. */
export function linear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

const compact = (v: number, unit: string, div: number) => {
  const n = v / div;
  const s = Math.abs(n) >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString();
  return s + unit;
};

/** 0 · 950 · 1.2K · 12K · 1.5M: compact from 1,000 up, as the axis-tick spec asks. */
export function formatCompact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e9) return compact(v, 'B', 1e9);
  if (a >= 1e6) return compact(v, 'M', 1e6);
  if (a >= 1e3) return compact(v, 'K', 1e3);
  if (Number.isInteger(v)) return String(v);
  return String(+v.toFixed(a < 1 ? 2 : 1));
}

/** Full number with thousands separators, for tooltips and tables. */
export function formatFull(v: number): string {
  if (!isFinite(v)) return '';
  const fixed = Number.isInteger(v) ? v : +v.toFixed(2);
  return fixed.toLocaleString('en-US');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type TimeUnit = 'year' | 'quarter' | 'month' | 'week' | 'day';

/** Calendar-aligned ticks between two dates: whole years, quarters, months, weeks or days. */
export function timeTicks(min: number, max: number, count = 6): { ticks: number[]; unit: TimeUnit } {
  const DAY = 86400000;
  const span = Math.max(1, max - min);
  const options: Array<[TimeUnit, number, number]> = [
    ['day', 1, DAY], ['day', 2, 2 * DAY], ['week', 1, 7 * DAY], ['month', 1, 30.4 * DAY], ['quarter', 1, 91.3 * DAY],
    ['month', 6, 182.6 * DAY], ['year', 1, 365.25 * DAY], ['year', 2, 730.5 * DAY], ['year', 5, 1826 * DAY], ['year', 10, 3652 * DAY],
  ];
  let pick = options[options.length - 1];
  for (const o of options) {
    if (span / o[2] <= count) { pick = o; break; }
  }
  const [unit, every] = pick;
  const d = new Date(min);
  const ticks: number[] = [];
  if (unit === 'year') {
    let y = Math.ceil(d.getFullYear() / every) * every;
    if (new Date(y, 0, 1).getTime() < min) y += every;
    for (; new Date(y, 0, 1).getTime() <= max; y += every) ticks.push(new Date(y, 0, 1).getTime());
  } else if (unit === 'month' || unit === 'quarter') {
    const step = unit === 'quarter' ? 3 : every;
    let y = d.getFullYear();
    let m = Math.ceil(d.getMonth() / step) * step;
    if (new Date(y, m, 1).getTime() < min) m += step;
    for (let t = new Date(y, m, 1); t.getTime() <= max; t = new Date(y, m, 1)) {
      ticks.push(t.getTime());
      m += step;
      if (m > 11) { y += Math.floor(m / 12); m %= 12; }
    }
  } else {
    const stepDays = unit === 'week' ? 7 : every;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (start.getTime() < min) start.setDate(start.getDate() + 1);
    for (const t = start; t.getTime() <= max; t.setDate(t.getDate() + stepDays)) ticks.push(t.getTime());
  }
  return { ticks, unit: unit === 'quarter' ? 'quarter' : unit };
}

/** Short tick text for a time unit: "2024", "Mar 2024", "Mar 4". */
export function formatTime(t: number, unit: TimeUnit): string {
  const d = new Date(t);
  if (unit === 'year') return String(d.getFullYear());
  if (unit === 'month' || unit === 'quarter') return d.getMonth() === 0 ? String(d.getFullYear()) : MONTHS[d.getMonth()];
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Long form for tooltips and tables: "March 2024" / "4 March 2024". */
export function formatDateLong(t: number, unit: TimeUnit): string {
  const d = new Date(t);
  const month = d.toLocaleString('en-GB', { month: 'long' });
  if (unit === 'year') return String(d.getFullYear());
  if (unit === 'month' || unit === 'quarter') return `${month} ${d.getFullYear()}`;
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/**
 * Width estimate for system-sans text at `size` px, used to reserve margins before
 * the browser can measure. Deliberately a touch generous so labels never clip.
 */
export function textWidth(text: string, size = 13, weight = 400): number {
  let w = 0;
  for (const ch of text) {
    if (ch === ' ') w += 0.28;
    else if ('il.,:;|!\'’'.includes(ch)) w += 0.27;
    else if ('fjrt()[]-'.includes(ch)) w += 0.36;
    else if ('mwMW'.includes(ch)) w += 0.86;
    else if (ch >= 'A' && ch <= 'Z') w += 0.66;
    else if (ch >= '0' && ch <= '9') w += 0.58;
    else w += 0.55;
  }
  return Math.ceil(w * size * (weight >= 600 ? 1.06 : 1)) + 2;
}
