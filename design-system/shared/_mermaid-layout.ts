/**
 * Mermaid's layout, redrawn with Diagram's marks.
 *
 * Mermaid places everything (dagre for flowcharts and state diagrams, its own engine for
 * sequences). This module mounts the SVG Mermaid rendered, off screen, reads the geometry back
 * (boxes, the true edge points from `data-points`, labels, clusters, lifelines) and rebuilds it
 * the way the site's diagrams are drawn: right-angled edges that leave and enter boxes square,
 * arrowheads 1 unit short of the box, labels beside the line instead of on it, region titles at
 * the top left. MermaidDiagram renders the result with Diagram's own marks.
 *
 * Internal to MermaidDiagram; not part of the public API.
 */
import type { DiagramLabel, DiagramNodeTone, DiagramRegion, DiagramTone, DgEnd, DgRun } from './Diagram';

export type MmKind = 'flowchart' | 'state' | 'sequence';

/** One element of a node outline Mermaid drew (a diamond, cylinder, hexagon…), in final coordinates. */
export interface MmShapeEl {
  tag: 'path' | 'polygon' | 'rect' | 'circle' | 'ellipse';
  attrs: Record<string, string>;
}

export interface MmNode {
  x: number;
  y: number;
  w: number;
  h: number;
  /** `rect`/`circle` are Diagram's; `outline` keeps Mermaid's shape; `dot`/`ring`/`bar` are a state diagram's start, end and fork. */
  shape: 'rect' | 'circle' | 'outline' | 'dot' | 'ring' | 'bar';
  radius?: number;
  outline?: MmShapeEl[];
  lines: DgRun[][];
  tone: DiagramNodeTone;
  textX?: number;
  textY?: number;
  /** Plain text, for the description. */
  name: string;
  /** A `click … href` link on the node (strict mode keeps http(s), mailto and relative links). */
  href?: string;
  target?: string;
}

export interface MmEdge {
  points: Array<[number, number]>;
  dashed: boolean;
  tone: DiagramTone;
  start: DgEnd;
  end: DgEnd;
  /** A sequence number on the sender's lifeline. */
  badge?: { x: number; y: number; text: string };
}

export interface MmLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'lifeline' | 'divider';
}

export interface MmLayout {
  kind: MmKind;
  /** The main direction of the flow, for the order of the entrance. */
  flow: 'v' | 'h';
  width: number;
  height: number;
  title: string;
  description: string;
  regions: DiagramRegion[];
  lines: MmLine[];
  edges: MmEdge[];
  nodes: MmNode[];
  /** Region titles, then edge labels. */
  labels: DiagramLabel[];
  /** Notes in a sequence: boxes drawn with nodes, their text with labels. */
  notes: Array<{ x: number; y: number; w: number; h: number }>;
  /** Activation bars in a sequence: drawn under the messages, so their numbers stay on top. */
  bars: Array<{ x: number; y: number; w: number; h: number }>;
}

// ---------------------------------------------------------------- constants (Diagram's)

/** The arrowhead's tip runs HEAD past the line's end; ending the line GAP short of a box leaves the tip 1 unit off it. */
const GAP = 5;
/** Label text: 13px on a 16px line. */
const LABEL_LINE = 16;
/** Labels sit this far off the line: their near edge 12 units away, as on the site. */
const LABEL_OFF = 12;
/** Room around the drawing, so box shadows aren't clipped by the host. */
const PAD = 8;
/** Parallel runs in one gap sit this far apart. */
const TRACK = 8;

// ---------------------------------------------------------------- small geometry

interface P {
  x: number;
  y: number;
}
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const cxOf = (b: Box) => (b.x0 + b.x1) / 2;
const cyOf = (b: Box) => (b.y0 + b.y1) / 2;
const overlaps = (a: Box, b: Box, m = 0) => a.x0 < b.x1 + m && b.x0 < a.x1 + m && a.y0 < b.y1 + m && b.y0 < a.y1 + m;
const inflate = (b: Box, m: number): Box => ({ x0: b.x0 - m, y0: b.y0 - m, x1: b.x1 + m, y1: b.y1 + m });
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Distance from p to the box's outline (0 when inside). */
function distToBox(p: P, b: Box): number {
  const dx = Math.max(b.x0 - p.x, 0, p.x - b.x1);
  const dy = Math.max(b.y0 - p.y, 0, p.y - b.y1);
  return Math.hypot(dx, dy);
}
/** Distance from p to the box's border line, inside or out. */
function distToBorder(p: P, b: Box): number {
  if (p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1) return Math.min(p.x - b.x0, b.x1 - p.x, p.y - b.y0, b.y1 - p.y);
  return distToBox(p, b);
}

function simplify(points: P[]): P[] {
  const out: P[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
    out.push({ x: p.x, y: p.y });
  }
  // Drop the middle of three points on one axis-parallel line.
  for (let i = out.length - 2; i >= 1; i -= 1) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    const straightX = Math.abs(a.x - b.x) < 0.01 && Math.abs(b.x - c.x) < 0.01;
    const straightY = Math.abs(a.y - b.y) < 0.01 && Math.abs(b.y - c.y) < 0.01;
    if (straightX || straightY) out.splice(i, 1);
  }
  return out;
}

/** Move the end of the polyline back by d along its last segment (or the start forward). */
function trimEnd(points: P[], d: number, atStart: boolean): void {
  const n = points.length;
  if (n < 2 || d <= 0) return;
  const [a, b] = atStart ? [points[1], points[0]] : [points[n - 2], points[n - 1]];
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 0.01) return;
  const t = Math.min(d, Math.max(len - 1, 0)) / len;
  const moved = { x: b.x - (b.x - a.x) * t, y: b.y - (b.y - a.y) * t };
  if (atStart) points[0] = moved;
  else points[n - 1] = moved;
}

// ---------------------------------------------------------------- reading the SVG

/** Mounts Mermaid's SVG off screen at its natural size so its geometry can be measured. */
function mount(svgText: string): { svg: SVGSVGElement; dispose: () => void } | null {
  if (typeof document === 'undefined') return null;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;z-index:-1;contain:layout paint;';
  host.innerHTML = svgText; // the HTML parser: Mermaid's labels hold <br>, which XML parsing rejects
  const svg = host.querySelector('svg');
  if (!svg) return null;
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    svg.setAttribute('width', String(vb.width));
    svg.setAttribute('height', String(vb.height));
  }
  svg.style.maxWidth = 'none';
  document.body.appendChild(host);
  return { svg, dispose: () => host.remove() };
}

type M = DOMMatrix;
function toRoot(svg: SVGSVGElement, el: Element): M {
  const root = svg.getScreenCTM();
  const own = (el as SVGGraphicsElement).getScreenCTM?.();
  if (!root || !own) return new DOMMatrix();
  return DOMMatrix.fromMatrix(root).inverse().multiply(DOMMatrix.fromMatrix(own));
}
const apply = (m: M, x: number, y: number): P => {
  const p = new DOMPoint(x, y).matrixTransform(m);
  return { x: p.x, y: p.y };
};
function boxOf(svg: SVGSVGElement, el: Element): Box | null {
  const g = el as SVGGraphicsElement;
  if (typeof g.getBBox !== 'function') return null;
  let b: DOMRect;
  try {
    b = g.getBBox();
  } catch {
    return null;
  }
  if (!(b.width > 0 || b.height > 0)) return null;
  const m = toRoot(svg, el);
  const pts = [apply(m, b.x, b.y), apply(m, b.x + b.width, b.y), apply(m, b.x, b.y + b.height), apply(m, b.x + b.width, b.y + b.height)];
  return {
    x0: Math.min(...pts.map((p) => p.x)),
    y0: Math.min(...pts.map((p) => p.y)),
    x1: Math.max(...pts.map((p) => p.x)),
    y1: Math.max(...pts.map((p) => p.y)),
  };
}
const num = (el: Element | null, name: string, d = 0) => {
  const v = el ? parseFloat(el.getAttribute(name) ?? '') : NaN;
  return Number.isFinite(v) ? v : d;
};
const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Lines of runs from an HTML label: `<br>` and blocks break lines, `<b>`/`<strong>` are bold. */
function runsOf(container: Element | null): DgRun[][] {
  const lines: DgRun[][] = [[]];
  const push = (text: string, bold: boolean) => {
    const line = lines[lines.length - 1];
    const last = line[line.length - 1];
    if (last && Boolean(last.bold) === bold) last.text += text;
    else line.push({ text, bold });
  };
  const walk = (node: Node, bold: boolean) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        push(child.nodeValue ?? '', bold);
        return;
      }
      if (child.nodeType !== 1) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'br') {
        lines.push([]);
        return;
      }
      if (tag === 'style' || tag === 'script' || tag === 'i' && /\bfa[srlb]?\b/.test(el.className)) return;
      const block = tag === 'p' || tag === 'div' || tag === 'li';
      if (block && lines[lines.length - 1].some((r) => r.text.trim())) lines.push([]);
      const weight = el.style?.fontWeight ?? '';
      walk(el, bold || tag === 'b' || tag === 'strong' || weight === 'bold' || parseInt(weight, 10) >= 600);
      if (block) lines.push([]);
    });
  };
  if (container) walk(container, false);
  const out: DgRun[][] = [];
  for (const line of lines) {
    const runs = line.map((r) => ({ text: r.text.replace(/\s+/g, ' '), bold: r.bold })).filter((r) => r.text.length > 0);
    if (runs.length === 0) continue;
    runs[0].text = runs[0].text.replace(/^ /, '');
    runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/ $/, '');
    const kept = runs.filter((r) => r.text.length > 0);
    if (kept.length) out.push(kept);
  }
  return out;
}
const plain = (lines: DgRun[][]) => lines.map((l) => l.map((r) => r.text).join('')).join(' ');

/** Lines from SVG text: one per <text>, or per <tspan> when a <text> holds several. */
function svgTextLines(texts: Element[]): string[] {
  const out: string[] = [];
  for (const t of texts) {
    const spans = Array.from(t.querySelectorAll('tspan'));
    if (spans.length > 1) for (const s of spans) out.push(clean(s.textContent ?? ''));
    else out.push(clean(t.textContent ?? ''));
  }
  return out.filter(Boolean);
}

let measureCtx: CanvasRenderingContext2D | null | undefined;
/** Greedy word wrap at `width`, measured in the label font. */
function wrapText(text: string, width: number, font: string): string[] {
  if (measureCtx === undefined) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return [text];
  measureCtx.font = font;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && measureCtx.measureText(next).width > width + 0.5) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------- kinds and the source

/** The diagram type Mermaid stamped on its SVG. */
export function kindOf(svgText: string): MmKind | null {
  const m = /aria-roledescription="([^"]+)"/.exec(svgText);
  const role = m ? m[1] : '';
  if (role === 'flowchart-v2' || role === 'flowchart') return 'flowchart';
  if (role === 'stateDiagram') return 'state';
  if (role === 'sequence') return 'sequence';
  return null;
}

/** The graph direction from the source (`flowchart LR`, or a state diagram's `direction`). */
function directionOf(source: string): 'TB' | 'BT' | 'LR' | 'RL' {
  const body = source.replace(/^\s*---[\s\S]*?---/, '').replace(/%%.*$/gm, '');
  const m = /^\s*(?:flowchart|graph)(?:-elk)?\s+(TB|TD|BT|LR|RL)\b/im.exec(body) ?? /^\s*direction\s+(TB|TD|BT|LR|RL)\s*$/im.exec(body);
  const d = m ? m[1].toUpperCase() : 'TB';
  return d === 'TD' ? 'TB' : (d as 'TB' | 'BT' | 'LR' | 'RL');
}

/** accTitle, else a front-matter `title` (which Mermaid draws as text; Diagram's figures leave titles to the page). */
const roleTitle = (svg: SVGSVGElement) =>
  clean(svg.querySelector(':scope > title')?.textContent ?? '') || clean(svg.querySelector('text[class$="TitleText"]')?.textContent ?? '');
const roleDesc = (svg: SVGSVGElement) => clean(svg.querySelector(':scope > desc')?.textContent ?? '');

// ---------------------------------------------------------------- the width plan (flowcharts, state)

/**
 * After a first render: CSS for a second one that gives every box node one width, as the site's
 * diagrams do (the widest label plus 20 a side, rounded up to 10, 120–240). Mermaid then lays out
 * with the final widths. Null when nothing needs to change.
 */
export function uniformWidthCss(svgText: string, nextId: string): string | null {
  const kind = kindOf(svgText);
  if (kind !== 'flowchart' && kind !== 'state') return null;
  const mounted = mount(svgText);
  if (!mounted) return null;
  try {
    const { svg } = mounted;
    const prefix = `${svg.id}-`;
    const rects: Array<{ suffix: string; w: number }> = [];
    svg.querySelectorAll('g.node').forEach((g) => {
      const shape = g.querySelector(':scope > rect');
      const fo = g.querySelector(':scope > g.label foreignObject');
      if (!shape || !fo || !g.id.startsWith(prefix)) return;
      const w = num(fo, 'width');
      if (w > 0) rects.push({ suffix: g.id.slice(prefix.length), w });
    });
    if (rects.length < 2) return null;
    const widest = Math.max(...rects.map((r) => r.w));
    const box = Math.min(240, Math.max(120, Math.ceil((widest + 40) / 10) * 10));
    const label = box - 40;
    const rules = rects
      .filter((r) => r.w < label - 0.5)
      .map((r) => `[id="${(nextId + '-' + r.suffix).replace(/["\\]/g, '\\$&')}"] .nodeLabel{display:inline-block;min-width:${label}px}`);
    return rules.length ? rules.join('\n') : null;
  } finally {
    mounted.dispose();
  }
}

/** After a first render: the actor box height a sequence needs for its tallest participant name. */
export function sequenceActorHeight(svgText: string): number | null {
  if (kindOf(svgText) !== 'sequence') return null;
  const mounted = mount(svgText);
  if (!mounted) return null;
  try {
    let most = 1;
    mounted.svg.querySelectorAll('[data-et="participant"]').forEach((g) => {
      most = Math.max(most, svgTextLines(Array.from(g.querySelectorAll('text.actor'))).length);
    });
    return most > 1 ? 32 + 20 * most : null;
  } finally {
    mounted.dispose();
  }
}

// ---------------------------------------------------------------- flowchart and state

/** Half the straight run of each side around its middle: how far off-centre an edge may attach. */
interface Flat {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
type End = Box & { key: string; flat: Flat };
interface GNode extends End {
  node: MmNode;
  /** A state diagram's note: drawn as a note box with label text, not as a node. */
  note?: boolean;
}
interface GCluster extends Box {
  key: string;
  title: string[];
  titleW: number;
  /** How far the drawn region grows above Mermaid's box to clear a nested region (see below). */
  lift: number;
}
interface GEdge {
  raw: P[];
  dashed: boolean;
  tone: DiagramTone;
  start: DgEnd;
  end: DgEnd;
  label: string[];
  labelW: number;
  s: End;
  t: End;
  axis: 'v' | 'h' | null;
  forward: boolean;
  route: P[];
}

function endKind(marker: string | null): DgEnd {
  if (!marker) return 'none';
  const m = /#([^)]*)\)/.exec(marker);
  const id = (m ? m[1] : marker).toLowerCase();
  if (id.includes('circle')) return 'circle';
  if (id.includes('cross')) return 'cross';
  return 'arrow';
}

/** The end point of every command in a path (control points skipped). */
function pathEnds(d: string): P[] {
  const out: P[] = [];
  const re = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/gi;
  let cur: P = { x: 0, y: 0 };
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const cmd = m[1];
    const C = cmd.toUpperCase();
    if (C === 'Z') continue;
    const abs = cmd === C;
    const nums = (m[2].match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    const step = C === 'C' ? 6 : C === 'S' || C === 'Q' ? 4 : C === 'A' ? 7 : C === 'H' || C === 'V' ? 1 : 2;
    for (let i = 0; i + step <= nums.length; i += step) {
      let x = cur.x;
      let y = cur.y;
      if (C === 'H') x = abs ? nums[i] : cur.x + nums[i];
      else if (C === 'V') y = abs ? nums[i] : cur.y + nums[i];
      else {
        x = nums[i + step - 2] + (abs ? 0 : cur.x);
        y = nums[i + step - 1] + (abs ? 0 : cur.y);
      }
      cur = { x, y };
      out.push(cur);
    }
  }
  return out;
}

/**
 * An edge's points: dagre's own (`data-points`, before the arrow marker shortens the line), except
 * where Mermaid cut the drawn path at a cluster's edge (an edge to or from a subgraph): then the
 * drawn path, lengthened again by the marker's 4 units.
 */
function pointsOf(path: Element): P[] {
  const drawn = pathEnds(path.getAttribute('d') ?? '');
  let data: P[] = [];
  try {
    const raw = path.getAttribute('data-points');
    const pts = raw ? (JSON.parse(atob(raw)) as Array<{ x: number; y: number }>) : [];
    if (Array.isArray(pts)) data = pts.map((p) => ({ x: +p.x, y: +p.y }));
  } catch {
    data = [];
  }
  if (data.length < 2) return drawn;
  if (drawn.length < 2) return data;
  const far = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y) > 6;
  if (!far(drawn[0], data[0]) && !far(drawn[drawn.length - 1], data[data.length - 1])) return data;
  const out = drawn.map((p) => ({ ...p }));
  const lengthen = (atStart: boolean) => {
    const n = out.length;
    const [a, b] = atStart ? [out[1], out[0]] : [out[n - 2], out[n - 1]];
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const moved = { x: b.x + ((b.x - a.x) / len) * 4, y: b.y + ((b.y - a.y) / len) * 4 };
    if (atStart) out[0] = moved;
    else out[n - 1] = moved;
  };
  if (path.getAttribute('marker-end')) lengthen(false);
  if (path.getAttribute('marker-start')) lengthen(true);
  return out;
}

const rounded = (b: Box, r: number): Flat => {
  const w = Math.max(0, (b.x1 - b.x0) / 2 - r);
  const h = Math.max(0, (b.y1 - b.y0) / 2 - r);
  return { top: w, bottom: w, left: h, right: h };
};

/** How much of each side of an outline (diamond, cylinder, hexagon…) runs along its bounding box. */
function flatOf(svg: SVGSVGElement, parts: Element[], b: Box): Flat {
  const geoms = parts.filter((p): p is SVGGeometryElement => typeof (p as SVGGeometryElement).isPointInFill === 'function');
  if (!geoms.length) return { top: 0, bottom: 0, left: 0, right: 0 };
  const inv = geoms.map((g) => toRoot(svg, g).inverse());
  const inside = (x: number, y: number) =>
    geoms.some((g, i) => {
      try {
        return g.isPointInFill(new DOMPoint(x, y).matrixTransform(inv[i]));
      } catch {
        return false;
      }
    });
  const cx = cxOf(b);
  const cy = cyOf(b);
  const run = (at: (d: number) => [number, number], half: number) => {
    let ok = 0;
    for (let d = 0; d <= half - 4; d += 4) {
      const [x1, y1] = at(d);
      const [x2, y2] = at(-d);
      if (!inside(x1, y1) || !inside(x2, y2)) break;
      ok = d;
    }
    return ok;
  };
  const hw = (b.x1 - b.x0) / 2;
  const hh = (b.y1 - b.y0) / 2;
  return {
    top: run((d) => [cx + d, b.y0 + 2], hw),
    bottom: run((d) => [cx + d, b.y1 - 2], hw),
    left: run((d) => [b.x0 + 2, cy + d], hh),
    right: run((d) => [b.x1 - 2, cy + d], hh),
  };
}

function readGraph(svg: SVGSVGElement, kind: MmKind, source: string): MmLayout | null {
  const dir = directionOf(source);
  const dirAxis: 'v' | 'h' = dir === 'TB' || dir === 'BT' ? 'v' : 'h';

  // Clusters (subgraphs, composite states) → regions with their titles at the top left.
  const clusters: GCluster[] = [];
  svg.querySelectorAll('g.cluster, g.statediagram-cluster').forEach((g) => {
    const rects = Array.from(g.querySelectorAll('rect')).filter((r) => !r.closest('.cluster-label'));
    let best: Box | null = null;
    for (const r of rects) {
      const b = boxOf(svg, r);
      if (b && (!best || (b.x1 - b.x0) * (b.y1 - b.y0) > (best.x1 - best.x0) * (best.y1 - best.y0))) best = b;
    }
    if (!best) return;
    const labelEl = g.querySelector('.cluster-label');
    const fo = labelEl?.querySelector('.nodeLabel, foreignObject div');
    const title = fo ? runsOf(fo).map((l) => l.map((r) => r.text).join('')) : svgTextLines(Array.from(labelEl?.querySelectorAll('text') ?? []));
    const titleW = num(labelEl?.querySelector('foreignObject') ?? null, 'width', 8 * Math.max(0, ...title.map((t) => t.length)));
    clusters.push({ ...best, key: `c:${g.id}`, title, titleW, lift: 0 });
  });
  // Mermaid keeps a title's margin above a cluster's nodes but not above a nested cluster, so a
  // title at the top left can sit on the inner region's edge. Grow the outer region upward to clear it.
  const area = (b: Box) => (b.x1 - b.x0) * (b.y1 - b.y0);
  for (const outer of [...clusters].sort((p, q) => area(p) - area(q))) {
    if (!outer.title.length) continue;
    const top = outer.y0 - outer.lift;
    const titleBox = { x0: outer.x0 + 16, y0: top + 12, x1: outer.x0 + 16 + outer.titleW, y1: top + 12 + outer.title.length * LABEL_LINE };
    for (const inner of clusters) {
      if (inner === outer || inner.x0 < outer.x0 - 0.5 || inner.x1 > outer.x1 + 0.5 || inner.y1 > outer.y1 + 0.5) continue;
      const innerTop = inner.y0 - inner.lift;
      if (innerTop < titleBox.y1 + 10 && inner.x0 < titleBox.x1 && inner.x1 > titleBox.x0) {
        const more = titleBox.y1 + 10 - innerTop;
        outer.lift += more;
        titleBox.y0 -= more;
        titleBox.y1 -= more;
      }
    }
  }

  // Nodes. Anything else in a nodes group (an icon or image shape) has no Diagram equivalent:
  // Mermaid then draws the whole diagram itself.
  const nodes: GNode[] = [];
  let unknown = false;
  svg.querySelectorAll('g.nodes > *').forEach((el) => {
    if (!el.matches('g.node, g.root, .edgeLabel, a')) unknown = true;
  });
  svg.querySelectorAll('g.node').forEach((g) => {
    const labelG = g.querySelector(':scope > g.label');
    const shapeEls = Array.from(g.children).filter((c) => c !== labelG && c.tagName.toLowerCase() !== 'title');
    if (shapeEls.length === 0) return;
    // Image and icon nodes have no Diagram equivalent: let Mermaid draw the whole diagram.
    if (shapeEls.some((el) => el.matches('image, svg') || el.querySelector('image, svg'))) {
      unknown = true;
      return;
    }
    const shapeBoxes = shapeEls.map((el) => boxOf(svg, el)).filter((b): b is Box => Boolean(b));
    if (shapeBoxes.length === 0) {
      unknown = true;
      return;
    }
    const box: Box = {
      x0: Math.min(...shapeBoxes.map((b) => b.x0)),
      y0: Math.min(...shapeBoxes.map((b) => b.y0)),
      x1: Math.max(...shapeBoxes.map((b) => b.x1)),
      y1: Math.max(...shapeBoxes.map((b) => b.y1)),
    };
    const labelSpan = labelG?.querySelector('.nodeLabel') ?? labelG?.querySelector('foreignObject div');
    const lines = labelSpan ? runsOf(labelSpan) : svgTextLines(Array.from(labelG?.querySelectorAll('text') ?? [])).map((t) => [{ text: t }]);
    const fo = labelG?.querySelector('foreignObject');
    const textBox = fo ? boxOf(svg, fo) : null;
    const cls = g.getAttribute('class') ?? '';
    const tone: DiagramNodeTone = /(?:^|\s)accent-?fill(?:\s|$)/i.test(cls) ? 'accent-fill' : /(?:^|\s)accent(?:\s|$)/.test(cls) ? 'accent' : 'default';
    const first = shapeEls[0];
    const tag = first.tagName.toLowerCase();
    const w = box.x1 - box.x0;
    const h = box.y1 - box.y0;
    let node: MmNode;
    let flat: Flat = { top: 0, bottom: 0, left: 0, right: 0 };
    const base = { x: box.x0, y: box.y0, w, h, lines, tone, name: plain(lines) };
    const isNote = /(?:^|\s)statediagram-note(?:\s|$)/.test(cls);
    if (isNote) {
      node = { ...base, shape: 'rect', radius: 10 };
      flat = rounded(box, 10);
    } else if (lines.length === 0 && Math.min(w, h) <= 12 && Math.max(w, h) > 24) {
      node = { ...base, shape: 'bar' }; // a state diagram's fork or join
      flat = w > h ? { top: w / 2 - 2, bottom: w / 2 - 2, left: 0, right: 0 } : { top: 0, bottom: 0, left: h / 2 - 2, right: h / 2 - 2 };
    } else if (shapeEls.length === 1 && tag === 'rect') {
      node = { ...base, shape: 'rect', radius: 10 };
      flat = rounded(box, 10);
    } else if (shapeEls.length === 1 && tag === 'circle') {
      node = { ...base, shape: /state-start/.test(first.getAttribute('class') ?? '') ? 'dot' : 'circle' };
    } else if (lines.length === 0 && w <= 24 && h <= 24) {
      node = { ...base, shape: 'ring' }; // a state diagram's end
    } else {
      // Keep Mermaid's outline: the filled path of a rough.js group, else the element itself.
      const outline: MmShapeEl[] = [];
      const kept: Element[] = [];
      for (const el of shapeEls) {
        const parts = el.tagName.toLowerCase() === 'g' ? Array.from(el.querySelectorAll('path')).filter((p) => (p.getAttribute('fill') ?? '') !== 'none').slice(0, 1) : [el];
        kept.push(...parts);
        for (const part of parts) {
          const t = part.tagName.toLowerCase() as MmShapeEl['tag'];
          if (!['path', 'polygon', 'rect', 'circle', 'ellipse'].includes(t)) continue;
          const attrs: Record<string, string> = {};
          for (const a of ['d', 'points', 'x', 'y', 'width', 'height', 'r', 'cx', 'cy', 'rx', 'ry']) {
            const v = part.getAttribute(a);
            if (v != null) attrs[a] = v;
          }
          const m = toRoot(svg, part);
          attrs.transform = `matrix(${r2(m.a)},${r2(m.b)},${r2(m.c)},${r2(m.d)},${r2(m.e)},${r2(m.f)})`;
          outline.push({ tag: t, attrs });
        }
      }
      if (outline.length === 0) unknown = true;
      node = { ...base, shape: 'outline', outline };
      flat = flatOf(svg, kept, box);
    }
    if (textBox && lines.length) {
      node.textX = cxOf(textBox);
      node.textY = cyOf(textBox);
    }
    if (!node.name) node.name = { dot: 'start', ring: 'end', bar: 'fork' }[node.shape as 'dot' | 'ring' | 'bar'] ?? 'a choice';
    const link = g.parentElement?.closest('a');
    const href = link ? link.getAttribute('href') ?? link.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? '' : '';
    if (href && !/^\s*(?:javascript|data|vbscript):/i.test(href)) {
      node.href = href;
      node.target = link?.getAttribute('target') ?? undefined;
    }
    nodes.push({ ...box, key: `n:${g.id}`, flat, node, note: isNote });
  });
  if (unknown || nodes.length === 0) return null;

  // Edge labels by id.
  const labelsById = new Map<string, { lines: string[]; w: number; h: number }>();
  svg.querySelectorAll('g.edgeLabel g.label[data-id]').forEach((g) => {
    const span = g.querySelector('.edgeLabel') ?? g.querySelector('foreignObject div');
    let lines = span ? runsOf(span).map((l) => l.map((r) => r.text).join('')) : svgTextLines(Array.from(g.querySelectorAll('text')));
    const fo = g.querySelector('foreignObject');
    const w = num(fo, 'width');
    const h = num(fo, 'height');
    // Mermaid wraps plain edge labels at 200px; redo its breaks in our font.
    if (lines.length === 1 && h > LABEL_LINE * 1.5 && w > 0) {
      lines = wrapText(lines[0], w, `13px ${getComputedStyle(svg).fontFamily || 'sans-serif'}`);
    }
    if (lines.length) labelsById.set(g.getAttribute('data-id') ?? '', { lines, w: w || 8 * Math.max(...lines.map((l) => l.length)), h: lines.length * LABEL_LINE });
  });

  // Edges, matched to their end boxes by geometry: the dagre points start and end on the boxes.
  const ends: End[] = [...nodes, ...clusters.map((c) => ({ ...c, flat: rounded(c, 16) }))];
  const findEnd = (p: P) => {
    let best: End | null = null;
    let bestArea = Infinity;
    for (const n of nodes) {
      if (distToBox(p, n) <= 2) {
        const area = (n.x1 - n.x0) * (n.y1 - n.y0);
        if (area < bestArea) {
          best = n;
          bestArea = area;
        }
      }
    }
    if (best) return best;
    let bestD = 3;
    for (const c of ends) {
      const d = distToBorder(p, c);
      if (d < bestD) {
        best = c;
        bestD = d;
      }
    }
    return best;
  };
  const edges: GEdge[] = [];
  svg.querySelectorAll('path[data-edge="true"], g.edgePaths > path').forEach((path) => {
    const cls = path.getAttribute('class') ?? '';
    if (/edge-thickness-invisible/.test(cls)) return;
    const m = toRoot(svg, path);
    const raw = pointsOf(path).map((p) => apply(m, p.x, p.y));
    if (raw.length < 2) return;
    const s = findEnd(raw[0]);
    const t = findEnd(raw[raw.length - 1]);
    if (!s || !t) {
      unknown = true; // an edge we can't place: never drop it silently
      return;
    }
    const lab = labelsById.get(path.getAttribute('data-id') ?? '');
    const accent = /edge-thickness-thick|(?:^|\s)accent(?:\s|$)|edge-animation/.test(cls);
    const edge: GEdge = {
      raw,
      dashed: /edge-pattern-(?:dotted|dashed)|note-edge/.test(cls),
      tone: accent ? 'accent' : 'muted',
      start: endKind(path.getAttribute('marker-start')),
      end: endKind(path.getAttribute('marker-end')),
      label: lab?.lines ?? [],
      labelW: lab?.w ?? 0,
      s,
      t,
      axis: null,
      forward: true,
      route: raw,
    };
    edges.push(edge);
  });

  if (unknown) return null;
  routeEdges(edges, nodes, dirAxis);
  const regions: DiagramRegion[] = clusters.map((c) => ({ x: c.x0, y: c.y0 - c.lift, w: c.x1 - c.x0, h: c.y1 - c.y0 + c.lift, radius: 16, tone: 'panel' }));
  const titles: DiagramLabel[] = clusters
    .filter((c) => c.title.length)
    .map((c) => ({ x: c.x0 + 16, y: c.y0 - c.lift + 12, lines: c.title, align: 'start' }));
  const edgeLabels = placeLabels(edges, nodes, titles);

  const description =
    roleDesc(svg) ||
    (edges.length
      ? `Arrows: ${edges
          .map((e) => {
            const name = (b: Box & { key: string }) => (b as GNode).node?.name || (clusters.find((c) => c.key === b.key)?.title.join(' ') ?? '');
            const from = name(e.s);
            const to = name(e.t);
            const both = e.start !== 'none' && e.end !== 'none';
            return `${from || 'a box'} ${both ? 'and' : 'to'} ${to || 'a box'}${e.label.length ? ` (${e.label.join(' ')})` : ''}`;
          })
          .join('; ')}.`
      : `Boxes: ${nodes.map((n) => n.node.name).filter(Boolean).join(', ')}.`);

  return finish({
    kind,
    flow: dirAxis,
    width: 0,
    height: 0,
    title: roleTitle(svg),
    description,
    regions,
    lines: [],
    edges: edges.map((e) => ({ points: e.route.map((p) => [p.x, p.y] as [number, number]), dashed: e.dashed, tone: e.tone, start: e.start, end: e.end })),
    nodes: nodes.filter((n) => !n.note).map((n) => n.node),
    labels: [
      ...titles,
      ...nodes
        .filter((n) => n.note)
        .map((n): DiagramLabel => {
          const text = n.node.lines.map((l) => l.map((r) => r.text).join(''));
          return { x: n.x0, y: cyOf(n) - (text.length * LABEL_LINE) / 2, w: n.x1 - n.x0, lines: text, align: 'middle' };
        }),
      ...edgeLabels,
    ],
    notes: nodes.filter((n) => n.note).map((n) => ({ x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 })),
    bars: [],
  });
}

// ---------------------------------------------------------------- orthogonal routing

interface Jog {
  edge: GEdge;
  index: number; // index of the jog's first point in edge.route
  m: number; // main-axis coordinate of the run
  c0: number;
  c1: number;
  group: string;
  prio: number;
}

/**
 * Re-route every edge with right angles through dagre's own channels: leave the source square
 * from the middle of the side facing the target, jog across in the gaps between ranks (where
 * dagre put its dummy points), go straight through ranks at the dummy's column, and enter the
 * target square. Runs that share a gap get their own tracks unless they fan out of one box or
 * into one box, so crossing edges never merge into one line.
 */
function routeEdges(edges: GEdge[], nodes: GNode[], dirAxis: 'v' | 'h'): void {
  const M = (p: P, a: 'v' | 'h') => (a === 'v' ? p.y : p.x);
  const C = (p: P, a: 'v' | 'h') => (a === 'v' ? p.x : p.y);
  const mk = (m: number, c: number, a: 'v' | 'h'): P => (a === 'v' ? { x: c, y: m } : { x: m, y: c });
  const lo = (b: Box, a: 'v' | 'h') => (a === 'v' ? b.y0 : b.x0);
  const hi = (b: Box, a: 'v' | 'h') => (a === 'v' ? b.y1 : b.x1);
  const clo = (b: Box, a: 'v' | 'h') => (a === 'v' ? b.x0 : b.y0);
  const chi = (b: Box, a: 'v' | 'h') => (a === 'v' ? b.x1 : b.y1);
  /** The straight half-run of the side facing along the axis (hi = bottom or right). */
  const halfOf = (b: End, a: 'v' | 'h', hiSide: boolean) => (a === 'v' ? (hiSide ? b.flat.bottom : b.flat.top) : hiSide ? b.flat.right : b.flat.left);

  // 1. Axis and direction per edge.
  for (const e of edges) {
    if (e.s.key === e.t.key) continue;
    const sepV = e.s.y1 <= e.t.y0 + 0.5 || e.t.y1 <= e.s.y0 + 0.5;
    const sepH = e.s.x1 <= e.t.x0 + 0.5 || e.t.x1 <= e.s.x0 + 0.5;
    e.axis = sepV && sepH ? dirAxis : sepV ? 'v' : sepH ? 'h' : null;
    if (e.axis) e.forward = M({ x: cxOf(e.t), y: cyOf(e.t) }, e.axis) > M({ x: cxOf(e.s), y: cyOf(e.s) }, e.axis);
  }

  // 2. Ports. A side whose edges all go one way in one style shares its middle (a fan-out tree,
  //    a fan-in bus); otherwise each edge gets its own port, spread 24 apart in the order of where
  //    it comes from, so no two edges ever share a line.
  type SideUse = { edge: GEdge; role: 'out' | 'in'; other: number };
  const sides = new Map<string, { box: GEdge['s']; axis: 'v' | 'h'; uses: SideUse[] }>();
  const sideOf = (box: GEdge['s'], axis: 'v' | 'h', hiSide: boolean) => {
    const k = `${box.key}|${axis}|${hiSide ? 1 : 0}`;
    let s = sides.get(k);
    if (!s) sides.set(k, (s = { box, axis, uses: [] }));
    return { side: s, key: k };
  };
  edges.forEach((e, i) => ((e as unknown as { i: number }).i = i));
  const idx = (e: GEdge) => (e as unknown as { i: number }).i;
  const style = (e: GEdge) => `${e.dashed ? 'd' : 's'}${e.tone}`;
  for (const e of edges) {
    if (!e.axis) continue;
    const a = e.axis;
    const inner = e.raw.slice(1, -1);
    const nextOfS = inner[0] ?? { x: cxOf(e.t), y: cyOf(e.t) };
    const nextOfT = inner[inner.length - 1] ?? { x: cxOf(e.s), y: cyOf(e.s) };
    sideOf(e.s, a, e.forward).side.uses.push({ edge: e, role: 'out', other: C(nextOfS, a) });
    sideOf(e.t, a, !e.forward).side.uses.push({ edge: e, role: 'in', other: C(nextOfT, a) });
  }
  const ports = new Map<string, number>(); // `${edgeIndex}|out|in` → cross coordinate
  const shared = new Map<string, string>(); // `${edgeIndex}|out|in` → group key of a shared side
  for (const [key, side] of sides) {
    const { box, axis, uses } = side;
    const mid = (clo(box, axis) + chi(box, axis)) / 2;
    const half = halfOf(box, axis, key.endsWith('|1'));
    const uniform = uses.every((u) => u.role === uses[0].role && style(u.edge) === style(uses[0].edge));
    if (uses.length === 1 || uniform || half < 8) {
      for (const u of uses) {
        ports.set(`${idx(u.edge)}|${u.role}`, mid);
        if (uses.length > 1 && uniform) shared.set(`${idx(u.edge)}|${u.role}`, `${u.role}:${key}`);
      }
      continue;
    }
    const sorted = [...uses].sort((p, q) => p.other - q.other);
    const step = Math.min(24, (2 * half) / (sorted.length - 1));
    sorted.forEach((u, j) => ports.set(`${idx(u.edge)}|${u.role}`, mid + (j - (sorted.length - 1) / 2) * step));
  }

  // A rank band: the main-axis extent of any node. Dummies inside one fix the column; dummies outside are free.
  const bands = (a: 'v' | 'h') => nodes.map((n) => [lo(n, a), hi(n, a)] as [number, number]);
  const inBand = (m: number, a: 'v' | 'h') => bands(a).some(([l, h]) => m > l - 1 && m < h + 1);
  const isCluster = (b: GEdge['s']) => b.key.startsWith('c:');

  // 3. Routes, recording the jogs (cross-axis runs) for track assignment.
  const jogs: Jog[] = [];
  for (const e of edges) {
    if (e.s.key === e.t.key) {
      e.route = loopRoute(e, sides);
      continue;
    }
    if (!e.axis) {
      e.route = fallbackRoute(e);
      continue;
    }
    const a = e.axis;
    const sMain = e.forward ? hi(e.s, a) : lo(e.s, a);
    const tMain = e.forward ? lo(e.t, a) : hi(e.t, a);
    let sCross = ports.get(`${idx(e)}|out`) ?? (clo(e.s, a) + chi(e.s, a)) / 2;
    let tCross = ports.get(`${idx(e)}|in`) ?? (clo(e.t, a) + chi(e.t, a)) / 2;
    const inner = e.raw.slice(1, -1).filter((p) => (M(p, a) - sMain) * (e.forward ? 1 : -1) > 0.5 && (tMain - M(p, a)) * (e.forward ? 1 : -1) > 0.5);
    const bandDummies = inner.filter((p) => inBand(M(p, a), a));
    if (bandDummies.length === 0) {
      const sMid = (clo(e.s, a) + chi(e.s, a)) / 2;
      const tMid = (clo(e.t, a) + chi(e.t, a)) / 2;
      const sHalf = halfOf(e.s, a, e.forward);
      const tHalf = halfOf(e.t, a, !e.forward);
      // Nearly aligned: snap straight rather than jog a few units.
      if (Math.abs(sCross - tCross) < 4) {
        if (Math.abs(sCross - tMid) <= tHalf) tCross = sCross;
        else if (Math.abs(tCross - sMid) <= sHalf) sCross = tCross;
      }
      // To or from a cluster: straight wherever the two flat runs overlap across the axis.
      if ((isCluster(e.s) || isCluster(e.t)) && Math.abs(sCross - tCross) > 0.5) {
        const oLo = Math.max(sMid - sHalf, tMid - tHalf);
        const oHi = Math.min(sMid + sHalf, tMid + tHalf);
        if (oHi >= oLo) {
          const pick = sCross >= oLo && sCross <= oHi ? sCross : tCross >= oLo && tCross <= oHi ? tCross : (oLo + oHi) / 2;
          sCross = pick;
          tCross = pick;
        }
      }
    }
    const route: P[] = [mk(sMain, sCross, a)];
    let cur = sCross;
    let lastFree: number | null = null;
    let bandSeen = false;
    const outGroup = shared.get(`${idx(e)}|out`);
    const inGroup = shared.get(`${idx(e)}|in`);
    const jog = (m: number, to: number, isLast: boolean) => {
      const isFirst = !bandSeen;
      let group = `e:${idx(e)}:${jogs.length}`;
      let prio = 1;
      if (isFirst && outGroup) [group, prio] = [outGroup, 0];
      else if (isLast && inGroup) [group, prio] = [inGroup, 2];
      jogs.push({ edge: e, index: route.length, m, c0: cur, c1: to, group, prio });
      route.push(mk(m, cur, a), mk(m, to, a));
      cur = to;
    };
    for (const p of inner) {
      if (inBand(M(p, a), a)) {
        const req = C(p, a);
        // A column a few units off is the same column: dagre keeps dummies well clear of boxes.
        if (Math.abs(req - cur) >= 4) jog(lastFree ?? (M(route[route.length - 1], a) + M(p, a)) / 2, req, false);
        bandSeen = true;
        lastFree = null;
      } else lastFree = M(p, a);
    }
    // Arriving a few units off the port: move the port instead of jogging.
    const tMid2 = (clo(e.t, a) + chi(e.t, a)) / 2;
    if (Math.abs(tCross - cur) < 4 && Math.abs(cur - tMid2) <= halfOf(e.t, a, !e.forward)) tCross = cur;
    if (Math.abs(tCross - cur) > 0.5) jog(lastFree ?? (M(route[route.length - 1], a) + tMain) / 2, tCross, true);
    route.push(mk(tMain, tCross, a));
    e.route = route;
  }

  // 4. Tracks. Runs in one gap that overlap across the axis go on separate tracks: trees nearest
  //    their source, buses nearest their target, single runs between, ordered so their stems don't
  //    cross (a run heading right whose port is further left sits lower, and the mirror).
  const byGap = new Map<string, Jog[]>();
  for (const j of jogs) {
    const k = `${j.edge.axis}|${Math.round(j.m)}`;
    const list = byGap.get(k) ?? [];
    list.push(j);
    byGap.set(k, list);
  }
  for (const [k, list] of byGap) {
    const a = k.split('|')[0] as 'v' | 'h';
    type Group = { lo: number; hi: number; prio: number; key: number; jogs: Jog[] };
    const groups = new Map<string, Group>();
    for (const j of list) {
      const g = groups.get(j.group) ?? { lo: Infinity, hi: -Infinity, prio: j.prio, key: 0, jogs: [] };
      g.lo = Math.min(g.lo, j.c0, j.c1);
      g.hi = Math.max(g.hi, j.c0, j.c1);
      g.jogs.push(j);
      // Singles: heading up the cross axis, a lower port goes deeper; heading down, a higher port does.
      g.key = j.c1 > j.c0 ? -j.c1 : 100000 + j.c1;
      groups.set(j.group, g);
    }
    const ordered = [...groups.values()].sort((p, q) => p.prio - q.prio || p.key - q.key);
    const placed: Array<{ g: Group; t: number }> = [];
    for (const g of ordered) {
      let t = 0;
      for (const o of placed) if (!(g.hi + TRACK <= o.g.lo || g.lo - TRACK >= o.g.hi)) t = Math.max(t, o.t + 1);
      placed.push({ g, t });
    }
    const count = Math.max(...placed.map((p) => p.t)) + 1;
    if (count < 2) continue;
    // Spread the tracks inside the gap, keeping 8 units off the boxes on either side.
    const m0 = list[0].m;
    let below = -Infinity;
    let above = Infinity;
    for (const n of nodes) {
      if (hi(n, a) <= m0 + 0.5) below = Math.max(below, hi(n, a));
      if (lo(n, a) >= m0 - 0.5) above = Math.min(above, lo(n, a));
    }
    const room = Number.isFinite(below) && Number.isFinite(above) ? above - below - 16 : TRACK * count;
    const step = Math.max(3, Math.min(TRACK, room / (count - 1)));
    const forward = list.filter((j) => j.edge.forward).length >= list.length / 2 ? 1 : -1;
    for (const { g, t } of placed) {
      const off = (t - (count - 1) / 2) * step * forward;
      for (const j of g.jogs) {
        const r = j.edge.route;
        r[j.index] = mk(j.m + off, C(r[j.index], a), a);
        r[j.index + 1] = mk(j.m + off, C(r[j.index + 1], a), a);
      }
    }
  }

  // 5. Ends: arrowheads stop GAP short of the box; bare ends touch it.
  for (const e of edges) {
    if (!e.axis) continue;
    const r = simplify(e.route);
    if (e.end !== 'none') trimEnd(r, GAP, false);
    if (e.start !== 'none') trimEnd(r, GAP, true);
    e.route = r;
  }
}

/**
 * A box's edge to itself: a right-angled loop, 24 out and 24 across, on the side dagre chose,
 * or the first side no other edge uses.
 */
function loopRoute(e: GEdge, sides: Map<string, unknown>): P[] {
  const b = e.s;
  const cx = cxOf(b);
  const cy = cyOf(b);
  const mx = e.raw.reduce((t, p) => t + p.x, 0) / e.raw.length;
  const my = e.raw.reduce((t, p) => t + p.y, 0) / e.raw.length;
  const hw = (b.x1 - b.x0) / 2 || 1;
  const hh = (b.y1 - b.y0) / 2 || 1;
  const dagreSide = Math.abs(mx - cx) / hw > Math.abs(my - cy) / hh ? (mx > cx ? 'right' : 'left') : my > cy ? 'bottom' : 'top';
  const key = { right: `${b.key}|h|1`, left: `${b.key}|h|0`, bottom: `${b.key}|v|1`, top: `${b.key}|v|0` } as const;
  const order = [dagreSide, 'right', 'bottom', 'top', 'left'] as Array<keyof typeof key>;
  const side = order.find((sd) => !sides.has(key[sd])) ?? dagreSide;
  const o = 24;
  const half = Math.min(12, (side === 'left' || side === 'right' ? b.flat.left : b.flat.top) || 12);
  const r: P[] =
    side === 'right'
      ? [{ x: b.x1, y: cy - half }, { x: b.x1 + o, y: cy - half }, { x: b.x1 + o, y: cy + half }, { x: b.x1, y: cy + half }]
      : side === 'left'
        ? [{ x: b.x0, y: cy - half }, { x: b.x0 - o, y: cy - half }, { x: b.x0 - o, y: cy + half }, { x: b.x0, y: cy + half }]
        : side === 'bottom'
          ? [{ x: cx - half, y: b.y1 }, { x: cx - half, y: b.y1 + o }, { x: cx + half, y: b.y1 + o }, { x: cx + half, y: b.y1 }]
          : [{ x: cx - half, y: b.y0 }, { x: cx - half, y: b.y0 - o }, { x: cx + half, y: b.y0 - o }, { x: cx + half, y: b.y0 }];
  if (e.end !== 'none') trimEnd(r, GAP, false);
  if (e.start !== 'none') trimEnd(r, GAP, true);
  return r;
}

/** Boxes that overlap: dagre's own points, with the ends trimmed for their marks. */
function fallbackRoute(e: GEdge): P[] {
  const r = e.raw.map((p) => ({ ...p }));
  if (e.end !== 'none') trimEnd(r, GAP, false);
  if (e.start !== 'none') trimEnd(r, GAP, true);
  return r;
}

// ---------------------------------------------------------------- labels beside their lines

/**
 * Each edge label goes where the site puts them: centred 12 units above a horizontal run, or
 * 12 units right of a vertical one. Longest runs are tried first, then the other side; the first
 * spot that clears boxes, titles, other labels and lines wins.
 */
function placeLabels(edges: GEdge[], nodes: GNode[], titles: DiagramLabel[]): DiagramLabel[] {
  const obstacles: Box[] = nodes.map((n) => inflate(n, 4));
  for (const t of titles) obstacles.push(labelBox(t, 120));
  type Seg = { a: P; b: P; box: Box; edge: GEdge };
  const segs: Seg[] = [];
  for (const e of edges) {
    for (let i = 0; i + 1 < e.route.length; i += 1) {
      const a = e.route[i];
      const b = e.route[i + 1];
      segs.push({ a, b, edge: e, box: inflate({ x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y) }, 3) });
    }
  }
  // A run another edge also draws (a tree's trunk, a bus) can't say which edge a label belongs to.
  const sharedRun = (s: Seg) =>
    segs.some((o) => {
      if (o.edge === s.edge) return false;
      const horiz = Math.abs(s.a.y - s.b.y) < 0.5 && Math.abs(o.a.y - o.b.y) < 0.5 && Math.abs(s.a.y - o.a.y) < 0.5;
      const vert = Math.abs(s.a.x - s.b.x) < 0.5 && Math.abs(o.a.x - o.b.x) < 0.5 && Math.abs(s.a.x - o.a.x) < 0.5;
      if (horiz) return Math.min(Math.max(s.a.x, s.b.x), Math.max(o.a.x, o.b.x)) - Math.max(Math.min(s.a.x, s.b.x), Math.min(o.a.x, o.b.x)) > 1;
      if (vert) return Math.min(Math.max(s.a.y, s.b.y), Math.max(o.a.y, o.b.y)) - Math.max(Math.min(s.a.y, s.b.y), Math.min(o.a.y, o.b.y)) > 1;
      return false;
    });
  const placed: Box[] = [];
  const out: DiagramLabel[] = [];
  for (const e of edges) {
    if (!e.label.length) continue;
    const w = Math.max(e.labelW, 8);
    const h = e.label.length * LABEL_LINE;
    const own = segs.filter((s) => s.edge === e).map((s) => ({ ...s, len: Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y), shared: sharedRun(s) }));
    const usable = own.some((s) => !s.shared && s.len >= 12) ? own.filter((s) => !s.shared) : own;
    usable.sort((p, q) => q.len - p.len);
    type Spot = { box: Box; align: 'start' | 'middle' };
    const spots: Spot[] = [];
    for (const t of [0.5, 0.3, 0.7]) {
      for (const { a, b } of usable) {
        const horizontal = Math.abs(a.y - b.y) < 0.5;
        const vertical = Math.abs(a.x - b.x) < 0.5;
        const mx = a.x + (b.x - a.x) * t;
        const my = a.y + (b.y - a.y) * t;
        if (horizontal) {
          // Centred over the run, or (for a label wider than its run) flush with either end of it.
          const lo = Math.min(a.x, b.x);
          const hi = Math.max(a.x, b.x);
          const xs = t === 0.5 ? [mx - w / 2] : t === 0.3 ? [lo + 8] : [hi - 8 - w];
          for (const x0 of xs) {
            spots.push({ box: { x0, y0: a.y - LABEL_OFF - h, x1: x0 + w, y1: a.y - LABEL_OFF }, align: 'middle' });
            spots.push({ box: { x0, y0: a.y + LABEL_OFF, x1: x0 + w, y1: a.y + LABEL_OFF + h }, align: 'middle' });
          }
        } else if (vertical) {
          spots.push({ box: { x0: a.x + LABEL_OFF, y0: my - h / 2, x1: a.x + LABEL_OFF + w, y1: my + h / 2 }, align: 'start' });
          spots.push({ box: { x0: a.x - LABEL_OFF - w, y0: my - h / 2, x1: a.x - LABEL_OFF, y1: my + h / 2 }, align: 'middle' });
        } else {
          // A diagonal (fallback routes): beside it, along the normal.
          const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const nx = -(b.y - a.y) / len;
          const ny = (b.x - a.x) / len;
          const ox = mx + nx * (LABEL_OFF + w / 2);
          const oy = my + ny * (LABEL_OFF + h / 2);
          spots.push({ box: { x0: ox - w / 2, y0: oy - h / 2, x1: ox + w / 2, y1: oy + h / 2 }, align: 'middle' });
        }
      }
    }
    const clear = (b: Box) => !obstacles.some((o) => overlaps(b, o)) && !placed.some((o) => overlaps(b, o, 4)) && !segs.some((s) => overlaps(b, s.box));
    const spot = spots.find((s) => clear(s.box)) ?? spots[0];
    if (!spot) continue;
    placed.push(spot.box);
    out.push({
      x: spot.box.x0,
      y: spot.box.y0,
      w: spot.align === 'middle' ? spot.box.x1 - spot.box.x0 : undefined,
      lines: e.label,
      align: spot.align,
      tone: e.tone,
    });
  }
  return out;
}

/** A label's box, for bounds and collisions (width estimated when the label doesn't carry one). */
function labelBox(l: DiagramLabel, est: number): Box {
  const w = l.w ?? est;
  return { x0: l.x, y0: l.y, x1: l.x + w, y1: l.y + l.lines.length * LABEL_LINE };
}

// ---------------------------------------------------------------- sequence

function readSequence(svg: SVGSVGElement): MmLayout | null {
  // Unknown element kinds mean a feature this reader doesn't know: let Mermaid draw it.
  const known = new Set(['participant', 'life-line', 'message', 'note', 'control-structure']);
  let unknown = false;
  svg.querySelectorAll('[data-et]').forEach((el) => {
    if (!known.has(el.getAttribute('data-et') ?? '')) unknown = true;
  });
  if (unknown) return null;

  const nodes: MmNode[] = [];
  const regions: DiagramRegion[] = [];
  const labels: DiagramLabel[] = [];
  const lines: MmLine[] = [];
  const edges: MmEdge[] = [];
  const notes: MmLayout['notes'] = [];

  // Participants: every kind becomes a box; `actor` (a person) is the accent box, as the site marks the reader.
  // Every kind of participant (database, queue, a person…) becomes a box of the participants' size,
  // in the top row, or where Mermaid drew it when it's created part-way down.
  const lifelines = Array.from(svg.querySelectorAll('line[data-et="life-line"]'));
  const groups = Array.from(svg.querySelectorAll('[data-et="participant"]'));
  const drawn = groups.map((g) => ({ g, rect: g.querySelector('rect.actor-top'), box: boxOf(svg, g) }));
  const rectBoxes = drawn.map((d) => (d.rect ? boxOf(svg, d.rect) : null)).filter((b): b is Box => Boolean(b));
  const boxW = drawn.reduce((w, d) => Math.max(w, num(d.rect, 'width', 0)), 0) || 150;
  const boxH = drawn.reduce((h, d) => Math.max(h, num(d.rect, 'height', 0)), 0) || 56;
  const row = Math.min(...(rectBoxes.length ? rectBoxes : drawn.map((d) => d.box).filter((b): b is Box => Boolean(b))).map((b) => b.y0), 0);
  const actors = new Map<string, { x: number; box: Box; name: string; end: number }>();
  for (const { g, rect, box: drawnBox } of drawn) {
    const id = g.getAttribute('data-id') ?? '';
    const type = g.getAttribute('data-type') ?? 'participant';
    const life = lifelines.find((l) => l.getAttribute('data-id') === id);
    const lm = life ? toRoot(svg, life) : null;
    const lifeX = life && lm ? apply(lm, num(life, 'x1'), 0).x : drawnBox ? cxOf(drawnBox) : 0;
    const lifeEnd = life && lm ? apply(lm, 0, num(life, 'y2', 2000)).y : 2000;
    const own = rect ? boxOf(svg, rect) : null;
    const top = own ? own.y0 : drawnBox && drawnBox.y0 > row + boxH ? drawnBox.y0 : row;
    const box = own && type === 'participant' ? own : { x0: lifeX - boxW / 2, y0: top, x1: lifeX + boxW / 2, y1: top + boxH };
    const text = svgTextLines(Array.from(g.querySelectorAll('text.actor')));
    const runs: DgRun[][] = text.map((t, i) => [{ text: t, bold: i === 0 }]);
    nodes.push({ x: box.x0, y: box.y0, w: box.x1 - box.x0, h: box.y1 - box.y0, shape: 'rect', radius: 10, lines: runs, tone: type === 'actor' ? 'accent' : 'default', name: text.join(' ') });
    actors.set(id, { x: lifeX, box, name: text.join(' '), end: lifeEnd });
  }
  if (!actors.size) return null;

  // `box` groups and `rect` highlights → panels (a group's title at the top left).
  svg.querySelectorAll('rect.rect').forEach((r) => {
    const b = boxOf(svg, r);
    if (!b) return;
    regions.push({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0, radius: 16, tone: 'panel' });
    const title = r.parentElement?.querySelector(':scope > text.text');
    if (title && clean(title.textContent ?? '')) labels.push({ x: b.x0 + 16, y: b.y0 + 10, lines: [clean(title.textContent ?? '')], align: 'start' });
  });

  // Frames (loop, alt, opt, par, critical, break) → panels titled "loop · condition", sections as dashed dividers.
  const sectionWord: Record<string, string> = { alt: 'else', par: 'and', critical: 'option' };
  svg.querySelectorAll('[data-et="control-structure"]').forEach((g) => {
    const frame = Array.from(g.querySelectorAll('line.loopLine')).filter((l) => !/dasharray/.test(l.getAttribute('style') ?? ''));
    const dividers = Array.from(g.querySelectorAll('line.loopLine')).filter((l) => /dasharray/.test(l.getAttribute('style') ?? ''));
    if (!frame.length) return;
    const m = toRoot(svg, g);
    const pts = frame.flatMap((l) => [apply(m, num(l, 'x1'), num(l, 'y1')), apply(m, num(l, 'x2'), num(l, 'y2'))]);
    const b: Box = { x0: Math.min(...pts.map((p) => p.x)), y0: Math.min(...pts.map((p) => p.y)), x1: Math.max(...pts.map((p) => p.x)), y1: Math.max(...pts.map((p) => p.y)) };
    regions.push({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0, radius: 12, tone: 'panel' });
    const word = clean(g.querySelector('text.labelText')?.textContent ?? '');
    const cond = clean(g.querySelector('text.loopText')?.textContent ?? '').replace(/^\[|\]$/g, '');
    labels.push({ x: b.x0 + 12, y: b.y0 + 8, lines: [[word, cond].filter(Boolean).join(' · ')], align: 'start' });
    const titles = Array.from(g.querySelectorAll('text.sectionTitle'));
    dividers.forEach((d, i) => {
      const p0 = apply(m, num(d, 'x1'), num(d, 'y1'));
      const p1 = apply(m, num(d, 'x2'), num(d, 'y2'));
      lines.push({ x1: p0.x, y1: p0.y, x2: p1.x, y2: p1.y, kind: 'divider' });
      const t = clean(titles[i]?.textContent ?? '').replace(/^\[|\]$/g, '');
      labels.push({ x: b.x0 + 12, y: p0.y + 8, lines: [[sectionWord[word] ?? '', t].filter(Boolean).join(' · ')], align: 'start' });
    });
  });

  // Notes → small glass boxes with their text in the label style.
  svg.querySelectorAll('[data-et="note"]').forEach((g) => {
    const rect = g.querySelector('rect.note');
    const b = rect ? boxOf(svg, rect) : null;
    if (!b) return;
    notes.push({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 });
    const text = svgTextLines(Array.from(g.querySelectorAll('text.noteText')));
    const h = text.length * LABEL_LINE;
    labels.push({ x: b.x0, y: cyOf(b) - h / 2, w: b.x1 - b.x0, lines: text, align: 'middle' });
  });

  // Activations → narrow glass bars on the lifeline.
  const bars: MmLayout['bars'] = [];
  svg.querySelectorAll('rect[class^="activation"]').forEach((r) => {
    const b = boxOf(svg, r);
    if (b) bars.push({ x: b.x0, y: b.y0, w: b.x1 - b.x0, h: b.y1 - b.y0 });
  });

  // Messages, with the text that precedes each one and the number that follows it.
  const all = Array.from(svg.querySelectorAll('text.messageText, [data-et="message"], text.sequenceNumber'));
  let pending: Element[] = [];
  let last: MmEdge | null = null;
  const described: string[] = [];
  for (const el of all) {
    const cls = el.getAttribute('class') ?? '';
    if (/messageText/.test(cls)) {
      pending.push(el);
      continue;
    }
    if (/sequenceNumber/.test(cls)) {
      if (last) {
        const p = apply(toRoot(svg, el), num(el, 'x'), num(el, 'y'));
        last.badge = { x: p.x, y: last.points[0][1], text: clean(el.textContent ?? '') };
      }
      continue;
    }
    const from = el.getAttribute('data-from') ?? '';
    const to = el.getAttribute('data-to') ?? '';
    const m = toRoot(svg, el);
    const dashed = /messageLine1/.test(cls);
    const start = endKind(el.getAttribute('marker-start'));
    const end = endKind(el.getAttribute('marker-end'));
    const text = svgTextLines(pending);
    pending = [];
    let points: P[];
    let labelSpot: { cx: number; y: number };
    if (el.tagName.toLowerCase() === 'path') {
      // A message to self: a right-angled loop out to the right and back.
      const ps = pointsOf(el).map((p) => apply(m, p.x, p.y));
      const a = ps[0];
      const b = ps[ps.length - 1];
      const out = Math.max(...ps.map((p) => p.x)) - a.x;
      const x2 = a.x + Math.max(32, out * 0.75);
      points = [a, { x: x2, y: a.y }, { x: x2, y: b.y }, { x: a.x, y: b.y }];
      labelSpot = { cx: (a.x + x2) / 2, y: a.y };
    } else {
      const a = apply(m, num(el, 'x1'), num(el, 'y1'));
      const b = apply(m, num(el, 'x2'), num(el, 'y2'));
      const dirn = Math.sign(b.x - a.x) || 1;
      // Mermaid stops lines 4 short of the lifeline for its marker; restore that, then use Diagram's gap.
      const bEnd = { x: b.x + (end === 'none' ? 0 : 4 * dirn), y: b.y };
      const aStart = { x: a.x - (start === 'none' ? 0 : 4 * dirn), y: a.y };
      points = [aStart, bEnd];
      labelSpot = { cx: (a.x + b.x) / 2, y: a.y };
    }
    if (end !== 'none') trimEnd(points, GAP, false);
    if (start !== 'none') trimEnd(points, GAP, true);
    const edge: MmEdge = { points: points.map((p) => [p.x, p.y] as [number, number]), dashed, tone: 'muted', start, end };
    edges.push(edge);
    last = edge;
    if (text.length) {
      const h = text.length * LABEL_LINE;
      labels.push({ x: labelSpot.cx - 150, y: labelSpot.y - LABEL_OFF - h, w: 300, lines: text, align: 'middle' });
    }
    described.push(`${actors.get(from)?.name ?? from} to ${actors.get(to)?.name ?? to}${text.length ? `: ${text.join(' ')}` : ''}`);
  }

  // Lifelines from each box to just past the last thing drawn.
  let bottom = 0;
  for (const e of edges) for (const [, y] of e.points) bottom = Math.max(bottom, y);
  for (const r of regions) bottom = Math.max(bottom, r.y + r.h);
  for (const n of notes) bottom = Math.max(bottom, n.y + n.h);
  for (const n of bars) bottom = Math.max(bottom, n.y + n.h);
  bottom += 24;
  // Destroyed participants keep Mermaid's shorter lifeline.
  for (const a of actors.values()) lines.push({ x1: a.x, y1: a.box.y1, x2: a.x, y2: Math.min(bottom, a.end), kind: 'lifeline' });

  return finish({
    kind: 'sequence',
    flow: 'v',
    width: 0,
    height: 0,
    title: roleTitle(svg),
    description: roleDesc(svg) || (described.length ? `Messages: ${described.join('; ')}.` : `Participants: ${[...actors.values()].map((a) => a.name).join(', ')}.`),
    regions,
    lines,
    edges,
    nodes,
    labels,
    notes,
    bars,
  });
}

// ---------------------------------------------------------------- bounds

/** Shift everything so the drawing starts at PAD, and size the canvas to fit. */
function finish(layout: MmLayout): MmLayout {
  const boxes: Box[] = [];
  for (const n of layout.nodes) boxes.push({ x0: n.x, y0: n.y, x1: n.x + n.w, y1: n.y + n.h });
  for (const r of layout.regions) boxes.push({ x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
  for (const n of [...layout.notes, ...layout.bars]) boxes.push({ x0: n.x, y0: n.y, x1: n.x + n.w, y1: n.y + n.h });
  for (const l of layout.labels) {
    const longest = Math.max(...l.lines.map((t) => t.length), 1);
    const w = l.align === 'middle' ? Math.min(l.w ?? 0, longest * 8) : longest * 8;
    const x0 = l.align === 'middle' ? l.x + ((l.w ?? 0) - w) / 2 : l.x;
    boxes.push({ x0, y0: l.y, x1: x0 + w, y1: l.y + l.lines.length * LABEL_LINE });
  }
  for (const e of layout.edges) for (const [x, y] of e.points) boxes.push({ x0: x - 5, y0: y - 5, x1: x + 5, y1: y + 5 });
  for (const l of layout.lines) boxes.push({ x0: Math.min(l.x1, l.x2), y0: Math.min(l.y1, l.y2), x1: Math.max(l.x1, l.x2), y1: Math.max(l.y1, l.y2) });
  if (!boxes.length) return layout;
  const minX = Math.min(...boxes.map((b) => b.x0));
  const minY = Math.min(...boxes.map((b) => b.y0));
  const maxX = Math.max(...boxes.map((b) => b.x1));
  const maxY = Math.max(...boxes.map((b) => b.y1));
  const dx = PAD - minX;
  const dy = PAD - minY;
  const sx = (v: number) => r2(v + dx);
  const sy = (v: number) => r2(v + dy);
  return {
    ...layout,
    width: Math.ceil(maxX - minX + PAD * 2),
    height: Math.ceil(maxY - minY + PAD * 2),
    nodes: layout.nodes.map((n) => ({
      ...n,
      x: sx(n.x),
      y: sy(n.y),
      w: r2(n.w),
      h: r2(n.h),
      textX: n.textX === undefined ? undefined : sx(n.textX),
      textY: n.textY === undefined ? undefined : sy(n.textY),
      outline: n.outline?.map((el) => ({
        ...el,
        attrs: { ...el.attrs, transform: el.attrs.transform.replace(/matrix\(([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)/, (_m, a, b, c, d, e, f) => `matrix(${a},${b},${c},${d},${r2(+e + dx)},${r2(+f + dy)})`) },
      })),
    })),
    regions: layout.regions.map((r) => ({ ...r, x: sx(r.x), y: sy(r.y), w: r2(r.w), h: r2(r.h) })),
    notes: layout.notes.map((n) => ({ x: sx(n.x), y: sy(n.y), w: r2(n.w), h: r2(n.h) })),
    bars: layout.bars.map((n) => ({ x: sx(n.x), y: sy(n.y), w: r2(n.w), h: r2(n.h) })),
    labels: layout.labels.map((l) => ({ ...l, x: sx(l.x), y: sy(l.y), w: l.w === undefined ? undefined : r2(l.w) })),
    edges: layout.edges.map((e) => ({
      ...e,
      points: e.points.map(([x, y]) => [sx(x), sy(y)] as [number, number]),
      badge: e.badge ? { ...e.badge, x: sx(e.badge.x), y: sy(e.badge.y) } : undefined,
    })),
    lines: layout.lines.map((l) => ({ ...l, x1: sx(l.x1), y1: sy(l.y1), x2: sx(l.x2), y2: sy(l.y2) })),
  };
}

// ---------------------------------------------------------------- entry

/** Read Mermaid's SVG back as a Diagram-style layout, or null when this kind (or something in it) isn't supported. */
export function readLayout(svgText: string, source: string): MmLayout | null {
  const kind = kindOf(svgText);
  if (!kind) return null;
  const mounted = mount(svgText);
  if (!mounted) return null;
  try {
    return kind === 'sequence' ? readSequence(mounted.svg) : readGraph(mounted.svg, kind, source);
  } catch {
    return null;
  } finally {
    mounted.dispose();
  }
}
