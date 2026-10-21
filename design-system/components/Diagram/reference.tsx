import * as React from 'react';
import { cx } from '../internal/cx';
import { useForkRef, useId, useIsoLayoutEffect } from '../internal/hooks';

/** Edge and label tone: muted ink, or the accent blue that carries the travelling pulse. */
export type DiagramTone = 'muted' | 'accent';
/** Node tone: default glass box, accent outline, or accent fill with white text. */
export type DiagramNodeTone = 'default' | 'accent' | 'accent-fill';
export type DiagramShape = 'rect' | 'circle';
/** Region looks: a tinted glass panel, or the two rings of the architecture diagram. */
export type DiagramRegionTone = 'panel' | 'ring' | 'ring-inner';
/** A plain string is a regular line; an object can be bold. */
export type DiagramNodeLine = string | { text: string; bold?: boolean };

/** Background panel or ring. */
export interface DiagramRegion {
  shape?: DiagramShape;
  x: number;
  y: number;
  w: number;
  h: number;
  radius?: number;
  tone: DiagramRegionTone;
}

/** A labelled box (or disc). Lines are explicit: SVG text does not wrap. */
export interface DiagramNode {
  shape?: DiagramShape;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: DiagramNodeLine[];
  tone?: DiagramNodeTone;
}

/** A polyline. Arrowhead on the last point unless `arrow` is false. Accent edges carry the pulse. */
export interface DiagramEdge {
  points: Array<[number, number]>;
  arrow?: boolean;
  dashed?: boolean;
  tone?: DiagramTone;
}

/** Free text, placed by its top-left. With `align: 'middle'` the text centres inside `w`. */
export interface DiagramLabel {
  x: number;
  y: number;
  w?: number;
  lines: string[];
  align?: 'start' | 'middle';
  tone?: DiagramTone;
}

export interface DiagramData {
  /** Names the dataset; namespaces the SVG ids together with React's id. */
  id: string;
  /** The coordinate space (viewBox) every position is written in. */
  width: number;
  height: number;
  /** Accessible name for the whole diagram. */
  label: string;
  /** One or two sentences spelling out the relationships the arrows encode. */
  description: string;
  regions?: DiagramRegion[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  labels?: DiagramLabel[];
}

/*
 * The marks below are exported for MermaidDiagram, which draws Mermaid's layout with them, so
 * both components share one drawing. They're @internal: not on window.BlueGlass, not in index.d.ts.
 */

/** @internal Node text: 15px on a 20px line. */
export const DG_NODE_FONT = 15;
/** @internal */
export const DG_NODE_LINE = 20;
/** @internal Label text: 13px on a 16px line. */
export const DG_LABEL_FONT = 13;
/** @internal */
export const DG_LABEL_LINE = 16;
/** Baseline sits this fraction of the font size below the line's vertical centre. */
const BASELINE = 0.36;
/** Arrowhead half-size in diagram units (the old 5-unit marker at stroke width 2). */
const HEAD = 4;

/** @internal What an edge end carries: the arrowhead, a dot, a cross, or nothing. */
export type DgEnd = 'arrow' | 'circle' | 'cross' | 'none';
/** @internal A run of node text; a line is one or more runs, so part of a line can be bold. */
export interface DgRun {
  text: string;
  bold?: boolean;
}
type Pt = [number, number];

/** Order index for the reveal stagger (`--i`, see Diagram.css). */
const order = (i: number): React.CSSProperties => ({ '--i': i });

function normalise(line: DiagramNodeLine): DgRun[] {
  return [typeof line === 'string' ? { text: line, bold: false } : { text: line.text, bold: Boolean(line.bold) }];
}

/** Baseline y for line `i` of `n` lines vertically centred on `cy`. */
function baseline(cy: number, i: number, n: number, lineHeight: number, fontSize: number): number {
  return cy - ((n - 1) * lineHeight) / 2 + i * lineHeight + fontSize * BASELINE;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** @internal An SVG path through the points. */
export function dgPath(points: Pt[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${r2(x)} ${r2(y)}`).join(' ');
}

/** The mark at `end`, facing away from `prev`: the triangle (tip HEAD past the end), a dot or a cross centred on it. */
function endMark(kind: DgEnd, end: Pt, prev: Pt, key: string): React.ReactNode {
  if (kind === 'none') return null;
  const [ex, ey] = end;
  const len = Math.hypot(ex - prev[0], ey - prev[1]) || 1;
  const ux = (ex - prev[0]) / len;
  const uy = (ey - prev[1]) / len;
  if (kind === 'circle') return <circle key={key} className="gl-dg-head" cx={r2(ex)} cy={r2(ey)} r={HEAD} />;
  if (kind === 'cross') {
    const a = HEAD * 0.85;
    const d = `M ${r2(ex - a * (ux - uy))} ${r2(ey - a * (uy + ux))} L ${r2(ex + a * (ux - uy))} ${r2(ey + a * (uy + ux))} M ${r2(ex - a * (ux + uy))} ${r2(ey - a * (uy - ux))} L ${r2(ex + a * (ux + uy))} ${r2(ey + a * (uy - ux))}`;
    return <path key={key} className="gl-dg-head gl-dg-head-cross" d={d} />;
  }
  const tip = [ex + HEAD * ux, ey + HEAD * uy];
  const b1 = [ex - HEAD * ux - HEAD * uy, ey - HEAD * uy + HEAD * ux];
  const b2 = [ex - HEAD * ux + HEAD * uy, ey - HEAD * uy - HEAD * ux];
  return <path key={key} className="gl-dg-head" d={`M ${r2(tip[0])} ${r2(tip[1])} L ${r2(b1[0])} ${r2(b1[1])} L ${r2(b2[0])} ${r2(b2[1])} Z`} />;
}

/** @internal A background panel or ring. */
export function DgRegion({ region, i }: { region: DiagramRegion; i: number }) {
  const className = `gl-dg-region gl-dg-region-${region.tone}`;
  if (region.shape === 'circle') {
    return <circle className={className} style={order(i)} cx={region.x + region.w / 2} cy={region.y + region.h / 2} r={region.w / 2} />;
  }
  return <rect className={className} style={order(i)} x={region.x} y={region.y} width={region.w} height={region.h} rx={region.radius ?? 0} />;
}

/** @internal Props of DgEdge: a polyline plus what each end carries. */
export interface DgEdgeProps {
  points: Pt[];
  dashed?: boolean;
  tone?: DiagramTone;
  start?: DgEnd;
  end?: DgEnd;
  i: number;
  children?: React.ReactNode;
}

/** @internal An edge: the line, then its end marks. Extra marks (sequence numbers) ride in `children`. */
export function DgEdge({ points, dashed, tone = 'muted', start = 'none', end = 'arrow', i, children }: DgEdgeProps) {
  // Solid edges draw in through a normalised dash; dashed ones keep their pattern and fade.
  const kind = dashed ? 'gl-dg-edge-dashed' : 'gl-dg-edge-draw';
  const n = points.length;
  return (
    <g className={`gl-dg-edge-group gl-dg-tone-${tone}`} style={order(i)} aria-hidden="true">
      <path className={`gl-dg-edge ${kind}`} d={dgPath(points)} pathLength={dashed ? undefined : 1} strokeDasharray={dashed ? '6 6' : undefined} />
      {n > 1 ? endMark(start, points[0], points[1], 'start') : null}
      {n > 1 ? endMark(end, points[n - 1], points[n - 2], 'end') : null}
      {children}
    </g>
  );
}

/** @internal A dot that runs along an accent edge, rests, and runs again. Hidden under reduced motion. */
export function DgPulse({ points }: { points: Pt[] }) {
  return (
    <circle className="gl-dg-pulse" r={4.5} cx={0} cy={0}>
      <animateMotion dur="3.2s" repeatCount="indefinite" path={dgPath(points)} keyPoints="0;1;1" keyTimes="0;0.5;1" calcMode="linear" />
      <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.06;0.44;0.52;1" dur="3.2s" repeatCount="indefinite" />
    </circle>
  );
}

/** @internal Props of DgNode: a box, disc or caller-drawn outline, with centred lines of text. */
export interface DgNodeProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** `rect` is the 10-unit box; `outline` draws `outline` instead (each element gets gl-dg-box). */
  shape?: DiagramShape | 'outline';
  outline?: React.ReactNode;
  /** Corner radius of a rect. Default 10. */
  radius?: number;
  lines: DgRun[][];
  tone?: DiagramNodeTone;
  /** Centre of the text, when it isn't the box's (a cylinder's label sits below its lid). */
  textX?: number;
  textY?: number;
  i: number;
}

/** @internal A glass node. */
export function DgNode({ x, y, w, h, shape = 'rect', outline, radius = 10, lines, tone = 'default', textX, textY, i }: DgNodeProps) {
  const cx0 = textX ?? x + w / 2;
  const cy0 = textY ?? y + h / 2;
  return (
    <g className={`gl-dg-node gl-dg-node-${tone}`} style={order(i)}>
      {shape === 'outline' ? (
        outline
      ) : shape === 'circle' ? (
        <circle className="gl-dg-box" cx={x + w / 2} cy={y + h / 2} r={w / 2} />
      ) : (
        <rect className="gl-dg-box" x={x} y={y} width={w} height={h} rx={radius} />
      )}
      {lines.length > 0 ? (
        <text className="gl-dg-text" textAnchor="middle" fontSize={DG_NODE_FONT}>
          {lines.map((runs, j) =>
            runs.length === 1 ? (
              <tspan key={j} x={cx0} y={baseline(cy0, j, lines.length, DG_NODE_LINE, DG_NODE_FONT)} fontWeight={runs[0].bold ? 600 : 400}>
                {runs[0].text}
              </tspan>
            ) : (
              <tspan key={j} x={cx0} y={baseline(cy0, j, lines.length, DG_NODE_LINE, DG_NODE_FONT)}>
                {runs.map((run, k) => (
                  <tspan key={k} fontWeight={run.bold ? 600 : 400}>
                    {run.text}
                  </tspan>
                ))}
              </tspan>
            ),
          )}
        </text>
      ) : null}
    </g>
  );
}

/** @internal Free text, placed by its top-left (or centred in `w`). */
export function DgLabel({ label, i }: { label: DiagramLabel; i: number }) {
  const middle = label.align === 'middle';
  const x = middle ? label.x + (label.w ?? 0) / 2 : label.x;
  // Labels are placed by their top-left like the comp's text blocks.
  const cy = label.y + DG_LABEL_LINE / 2;
  return (
    <text className={`gl-dg-label gl-dg-label-${label.tone ?? 'muted'}`} style={order(i)} textAnchor={middle ? 'middle' : 'start'} fontSize={DG_LABEL_FONT}>
      {label.lines.map((text, j) => (
        <tspan key={j} x={x} y={cy + j * DG_LABEL_LINE + DG_LABEL_FONT * BASELINE}>
          {text}
        </tspan>
      ))}
    </text>
  );
}

/**
 * The site's diagram-reveal.ts, as an effect. States on `.gl-dg-wrap[data-reveal]`:
 * none (no JS yet: shown, or hidden with a 2.5 s failsafe when <html> has `gl-js`),
 * `armed` (hidden, waiting to scroll in) and `in` (shown). Pulses run only while on screen.
 * Reduced motion and automated browsers (navigator.webdriver) get the finished diagram at once,
 * so screenshots and visual tests never catch an entrance half-way.
 */
const noSubscribe = () => () => {};
/** Whether this reader gets the entrance: a browser with IntersectionObserver, motion welcome, not automated. */
const entranceOn = () =>
  typeof window !== 'undefined' &&
  typeof IntersectionObserver !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  !(typeof navigator !== 'undefined' && navigator.webdriver === true);
const entranceOff = () => false;

function useDiagramReveal(wrapRef: React.RefObject<HTMLDivElement>, enabled: boolean) {
  useIsoLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;
    const svg = wrap.querySelector('svg');
    const run = (on: boolean) => {
      if (!svg || typeof svg.pauseAnimations !== 'function') return;
      if (on) svg.unpauseAnimations();
      else svg.pauseAnimations();
    };
    const automated = typeof navigator !== 'undefined' && navigator.webdriver === true;
    if (!enabled || automated || typeof IntersectionObserver === 'undefined' || !window.matchMedia) {
      wrap.dataset.reveal = 'in';
      return undefined;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    wrap.dataset.reveal = reduced.matches ? 'in' : 'armed';
    run(false);
    let visible = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible = entry.isIntersecting;
          if (entry.isIntersecting) wrap.dataset.reveal = 'in';
          run(entry.isIntersecting && !reduced.matches);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(wrap);
    const onChange = () => {
      if (reduced.matches) wrap.dataset.reveal = 'in';
      run(!reduced.matches && visible);
    };
    reduced.addEventListener('change', onChange);
    return () => {
      observer.disconnect();
      reduced.removeEventListener('change', onChange);
      wrap.dataset.reveal = 'in';
    };
  }, [enabled]);
}

/**
 * The site's scrollable-hosts.ts: a host renders keyboard-scrollable (tabindex 0), then keeps
 * that and the "Scroll sideways" hint only while it actually overflows.
 */
function useHostOverflow(hostRef: React.RefObject<HTMLDivElement>, active: boolean): boolean | null {
  const [overflows, setOverflows] = React.useState<boolean | null>(null);
  useIsoLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !active) return undefined;
    const update = () => setOverflows(host.scrollWidth > host.clientWidth + 1);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    ro.observe(host);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [active]);
  return overflows;
}

export interface DiagramHostProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Id for the root element; also the base of the description's id. */
  id?: string;
  /** Class names for the root element, merged with the component's own. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** Accessible name for the whole figure (role group: the text inside stays readable). */
  label: string;
  /** One or two sentences spelling out the relationships the marks encode; becomes the SVG's desc. */
  description: string;
  /** Width of the coordinate space (the viewBox). */
  width: number;
  /** Height of the coordinate space (the viewBox). */
  height: number;
  /** Floor for the scale: below `width × minScale` px the host scrolls sideways instead. 0 = pure scaling. */
  minScale?: number;
  /** Play the entrance when the figure scrolls into view. Default true. */
  reveal?: boolean;
  /** Text under a host that overflows. */
  scrollHint?: React.ReactNode;
  /** SVG content, in the viewBox's coordinates. */
  children?: React.ReactNode;
}

/**
 * The shell every diagram and chart from the site shares: one SVG that scales with its
 * host, a scroll floor for phones with its hint, and the entrance reveal.
 */
export const DiagramHost = React.forwardRef<HTMLDivElement, DiagramHostProps>(function DiagramHost(
  { label, description, width, height, minScale = 0, reveal = true, scrollHint = 'Scroll sideways for the whole diagram.', id, className, children, ...rest },
  ref,
) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const hostRef = React.useRef<HTMLDivElement>(null);
  const handleRef = useForkRef<HTMLDivElement>(wrapRef, ref);
  const uid = useId(id);
  const descId = `${uid}-desc`;
  // Below the floor the host scrolls, so it must be reachable and named for keyboard users.
  const scrollable = minScale > 0;
  // Arm the entrance before anything measures: the overflow check forces a style pass, and a node
  // first styled as shown would fade out to its armed state instead of in.
  useDiagramReveal(wrapRef, reveal);
  const overflows = useHostOverflow(hostRef, scrollable);
  // Rendered armed (not armed by an effect), so no style pass in the same commit, such as another
  // figure measuring its overflow, can catch this one shown and fade it out before it fades in.
  const armed = React.useSyncExternalStore(noSubscribe, entranceOn, entranceOff) && reveal;
  const naming = { role: 'group', 'aria-label': label, 'aria-describedby': descId };
  // One unit of padding keeps the 1px strokes of boxes on the viewBox edge from being clipped.
  const viewBox = `-1 -1 ${width + 2} ${height + 2}`;
  return (
    <div ref={handleRef} id={id} className={cx('gl-dg-wrap', className)} data-reveal={armed ? 'armed' : undefined} {...rest}>
      <div
        ref={hostRef}
        className="gl-dg-host"
        data-scrollable={scrollable && overflows ? '' : undefined}
        tabIndex={scrollable && overflows !== false ? 0 : undefined}
        {...(scrollable ? naming : {})}
      >
        <svg
          className="gl-dg"
          viewBox={viewBox}
          style={{ minWidth: scrollable ? Math.round(width * minScale) : undefined }}
          {...(scrollable ? {} : naming)}
        >
          <desc id={descId}>{description}</desc>
          {children}
        </svg>
      </div>
      {scrollable ? <p className="gl-dg-hint">{scrollHint}</p> : null}
    </div>
  );
});

export interface DiagramProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Class names for the root element, merged with the component's own. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** Regions, edges, nodes and labels in the data's own coordinate space, plus its label and description. */
  data: DiagramData;
  /** Floor for the scale: below `width × minScale` px the host scrolls sideways (the site uses 0.58–0.6). 0 = pure scaling. */
  minScale?: number;
  /** Play the entrance when the diagram scrolls into view. Default true. */
  reveal?: boolean;
  /** Run a pulse along every accent edge while the diagram is on screen. Default true; never under reduced motion. */
  pulses?: boolean;
}

/** The site's data-driven diagram: regions, edges with arrowheads, glass nodes, labels and travelling pulses. */
export const Diagram = React.forwardRef<HTMLDivElement, DiagramProps>(function Diagram(
  { data, minScale = 0, reveal = true, pulses = true, ...rest },
  ref,
) {
  const accentEdges = pulses ? data.edges.filter((edge) => edge.tone === 'accent') : [];
  return (
    <DiagramHost
      ref={ref}
      label={data.label}
      description={data.description}
      width={data.width}
      height={data.height}
      minScale={minScale}
      reveal={reveal}
      data-diagram={data.id}
      {...rest}
    >
      {data.regions?.map((region, i) => <DgRegion key={i} region={region} i={i} />)}
      {data.edges.map((edge, i) => (
        <DgEdge key={i} points={edge.points} dashed={edge.dashed} tone={edge.tone} end={edge.arrow === false ? 'none' : 'arrow'} i={i} />
      ))}
      {data.nodes.map((node, i) => (
        <DgNode key={i} x={node.x} y={node.y} w={node.w} h={node.h} shape={node.shape} lines={node.lines.map(normalise)} tone={node.tone} i={i} />
      ))}
      {data.labels?.map((label, i) => <DgLabel key={i} label={label} i={i} />)}
      {accentEdges.length > 0 ? (
        <g className="gl-dg-pulses" aria-hidden="true">
          {accentEdges.map((edge, i) => (
            <DgPulse key={i} points={edge.points} />
          ))}
        </g>
      ) : null}
    </DiagramHost>
  );
});
