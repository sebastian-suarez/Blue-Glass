import * as React from 'react';
import { cx } from '../internal/cx';
import { useId } from '../internal/hooks';
import { DiagramHost, DgEdge, DgLabel, DgNode, DgPulse, DgRegion } from './Diagram';
import { kindOf, readLayout, sequenceActorHeight, uniformWidthCss } from './_mermaid-layout';
import type { MmLayout, MmNode } from './_mermaid-layout';

const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MERMAID_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.min.js';

/** A Mermaid config object (pass it to mermaid.initialize). */
export interface MermaidThemeConfig {
  theme: 'base';
  fontFamily: string;
  /** Mermaid's sequence diagrams measure every text at this size. */
  fontSize: number;
  /** Off, so labels break only where the source says `<br>`, as Diagram's do. */
  markdownAutoWrap: boolean;
  themeVariables: Record<string, string>;
  /** CSS Mermaid scopes under each diagram's id. The first rules size labels as Diagram sets them, so the layout fits its type. */
  themeCSS: string;
  flowchart: Record<string, unknown>;
  sequence: Record<string, unknown>;
}

/**
 * Blue Glass for Mermaid. The spacing and the label CSS make Mermaid lay boxes out at Diagram's
 * sizes: 15px node text on 20px lines with 16 units above and below (72-unit boxes for two lines),
 * 20 a side, 13px labels. MermaidDiagram then redraws flowcharts, state and sequence diagrams with
 * Diagram's marks. The theme variables (token values, as Mermaid does colour maths on literals)
 * dress every other diagram type, which Mermaid still draws itself.
 */
export const mermaidTheme: MermaidThemeConfig = {
  theme: 'base',
  fontFamily: SANS,
  fontSize: 15,
  markdownAutoWrap: false,
  themeVariables: {
    fontFamily: SANS,
    fontSize: '15px',
    background: '#f4f8fc', // glass-solid
    primaryColor: '#ffffff',
    primaryBorderColor: '#7a89a4', // dg-edge
    primaryTextColor: '#233047', // color-ink
    secondaryColor: '#e3ecf8', // info-soft
    secondaryBorderColor: '#7a89a4',
    secondaryTextColor: '#233047',
    tertiaryColor: '#f4f8fc',
    tertiaryBorderColor: '#7a89a4',
    tertiaryTextColor: '#233047',
    mainBkg: '#ffffff',
    nodeBorder: '#7a89a4',
    nodeTextColor: '#233047',
    textColor: '#233047',
    titleColor: '#233047',
    lineColor: '#7a89a4',
    arrowheadColor: '#7a89a4',
    defaultLinkColor: '#7a89a4',
    edgeLabelBackground: '#f4f8fc',
    clusterBkg: 'rgba(142, 184, 232, 0.13)', // .dg-region-panel
    clusterBorder: 'rgba(88, 108, 143, 0.2)',
    noteBkgColor: '#ffffff',
    noteBorderColor: 'rgba(88, 108, 143, 0.32)', // .dg-box hairline
    noteTextColor: '#45546c', // color-muted
    actorBkg: '#ffffff',
    actorBorder: 'rgba(88, 108, 143, 0.32)',
    actorTextColor: '#233047',
    actorLineColor: 'rgba(88, 108, 143, 0.32)',
    signalColor: '#7a89a4',
    signalTextColor: '#45546c',
    labelBoxBkgColor: 'rgba(142, 184, 232, 0.13)',
    labelBoxBorderColor: 'rgba(88, 108, 143, 0.2)',
    labelTextColor: '#45546c',
    loopTextColor: '#45546c',
    activationBkgColor: '#ffffff',
    activationBorderColor: 'rgba(88, 108, 143, 0.32)',
    sequenceNumberColor: '#ffffff',
    // Pie: the chart marks in their fixed order, white 2px gaps, text in ink and muted.
    pie1: '#4d7cc9', // chart-1
    pie2: '#424986', // chart-2
    pie3: '#2994ae', // chart-3
    pie4: '#5857b9', // chart-4
    pieStrokeColor: '#ffffff',
    pieStrokeWidth: '2px',
    pieOuterStrokeColor: 'rgba(88, 108, 143, 0.2)',
    pieOuterStrokeWidth: '1px',
    pieOpacity: '1',
    pieTitleTextSize: '17px',
    pieTitleTextColor: '#233047',
    pieSectionTextSize: '13px',
    pieSectionTextColor: '#ffffff',
    pieLegendTextSize: '13px',
    pieLegendTextColor: '#45546c',
  },
  themeCSS: [
    // Measured: Mermaid sizes boxes and labels from these. (MermaidDiagram adds 16 units above and below node text.)
    '.node .nodeLabel p { line-height: 20px; }',
    '.nodeLabel b, .nodeLabel strong { font-weight: 600; }',
    '.edgeLabel p, .edgeLabel span { font-size: 13px; line-height: 16px; }',
    '.cluster-label .nodeLabel, .cluster-label p { font-size: 13px; line-height: 16px; }',
    // Mermaid's own drawing, for the diagram types it still draws: Diagram's boxes, regions and tones.
    '.node rect, .node .label-container, rect.actor { rx: 10px; ry: 10px; stroke: rgba(88, 108, 143, 0.32); filter: drop-shadow(0 3px 8px rgba(64, 82, 125, 0.1)); }',
    '.cluster rect { rx: 16px; ry: 16px; }',
    '.node.accent rect, .node.accent polygon, .node.accent circle, .node.accent path { stroke: #4d7cc9; stroke-width: 1.5px; }',
    '.node.accentFill rect, .node.accentFill polygon, .node.accentFill circle, .node.accentFill path { fill: #3d68b0; stroke: none; }',
    '.node.accentFill .nodeLabel, .node.accentFill .label, .node.accentFill text, .node.accentFill span, .node.accentFill p { color: #ffffff; fill: #ffffff; }',
    '.flowchart-link, .transition, .messageLine0, .messageLine1 { stroke-width: 2px; stroke-linecap: round; }',
    '.edge-thickness-thick { stroke: #4d7cc9 !important; }',
  ].join('\n'),
  flowchart: {
    curve: 'linear',
    padding: 10,
    nodeSpacing: 32,
    rankSpacing: 40,
    diagramPadding: 8,
    htmlLabels: true,
    useMaxWidth: true,
    wrappingWidth: 10000,
    subGraphTitleMargin: { top: 12, bottom: 12 },
  },
  sequence: {
    useMaxWidth: true,
    mirrorActors: false,
    width: 150,
    height: 56,
    actorMargin: 50,
    boxMargin: 10,
    boxTextMargin: 5,
    noteMargin: 10,
    messageMargin: 34,
    diagramMarginX: 8,
    diagramMarginY: 8,
  },
};

interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  render(id: string, text: string): Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
}

let loading: Promise<MermaidApi> | null = null;
let queue: Promise<unknown> = Promise.resolve();

/** One script tag per page; a failed load clears the cache so a later diagram can try again. */
function loadMermaid(src: string): Promise<MermaidApi> {
  const existing = (window as unknown as { mermaid?: MermaidApi }).mermaid;
  if (existing) return Promise.resolve(existing);
  if (loading) return loading;
  loading = new Promise<MermaidApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      const api = (window as unknown as { mermaid?: MermaidApi }).mermaid;
      if (api) resolve(api);
      else reject(new Error('Mermaid did not load'));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error('Mermaid did not load'));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

/** Mermaid renders one diagram at a time; queue them. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

type Config = Record<string, unknown>;
const isPlain = (v: unknown): v is Config => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** The theme with the caller's config over it: objects merge one level deep, themeCSS appends. */
function mergeConfig(base: Config, extra: Config): Config {
  const out: Config = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (k === 'themeCSS' && typeof v === 'string') out.themeCSS = `${String(base.themeCSS ?? '')}\n${v}`;
    else if (isPlain(v) && isPlain(base[k])) out[k] = { ...(base[k] as Config), ...v };
    else out[k] = v;
  }
  return out;
}

interface Drawn {
  svg: string;
  layout: MmLayout | null;
  bind?: (element: Element) => void;
}

/**
 * Render, and for the kinds Diagram can draw, render again when the first pass shows a better fit:
 * one width for every box (flowcharts, state) or taller boxes for two-line participants (sequence).
 */
async function draw(api: MermaidApi, chart: string, config: Config, baseId: string, restyle: boolean): Promise<Drawn> {
  const init = (c: Config) => api.initialize({ ...c, startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, logLevel: 5 });
  // Node text gets 16 units above and below, as Diagram's boxes do (72 for two lines). Scoped by the
  // render's own ids to flowchart and state nodes: class diagrams use the same label markup for rows.
  const measure = (id: string) => (restyle ? `[id^="${id}-flowchart-"] .nodeLabel, [id^="${id}-state-"] .nodeLabel { display: inline-block; vertical-align: top; padding: 6px 0; }` : '');
  init(mergeConfig(config, { themeCSS: measure(`${baseId}a`) }));
  let out = await api.render(`${baseId}a`, chart);
  const kind = restyle ? kindOf(out.svg) : null;
  if (!kind) return { svg: out.svg, layout: null, bind: out.bindFunctions };
  if (kind === 'sequence') {
    const height = sequenceActorHeight(out.svg);
    if (height) {
      init(mergeConfig(config, { sequence: { height } }));
      out = await api.render(`${baseId}b`, chart);
    }
  } else {
    const css = uniformWidthCss(out.svg, `${baseId}b`);
    if (css) {
      init(mergeConfig(config, { themeCSS: `${measure(`${baseId}b`)}\n${css}` }));
      out = await api.render(`${baseId}b`, chart);
    }
  }
  return { svg: out.svg, layout: readLayout(out.svg, chart), bind: out.bindFunctions };
}

/** Spread a long list's reveal over at most ~9 steps, so a big diagram doesn't take seconds to land. */
const stagger = (count: number) => (count > 9 ? 8 / (count - 1) : 1);

/** The order along the flow: top to bottom (then left to right) or the reverse priority for left-to-right flows. */
function flowOrder<T>(items: T[], at: (item: T) => [number, number], horizontal: boolean): number[] {
  const order = items.map((item, i) => ({ i, p: at(item) }));
  order.sort((a, b) => (horizontal ? a.p[0] - b.p[0] || a.p[1] - b.p[1] : a.p[1] - b.p[1] || a.p[0] - b.p[0]));
  const rank: number[] = new Array(items.length);
  order.forEach((o, k) => (rank[o.i] = k));
  return rank;
}

function nodeOutline(n: MmNode): React.ReactNode {
  if (n.shape === 'dot') return <circle className="gl-mm-dot" cx={n.x + n.w / 2} cy={n.y + n.h / 2} r={7} />;
  if (n.shape === 'bar') return <rect className="gl-mm-dot" x={n.x} y={n.y} width={n.w} height={n.h} rx={Math.min(n.w, n.h) / 2} />;
  if (n.shape === 'ring') {
    return (
      <>
        <circle className="gl-mm-ring" cx={n.x + n.w / 2} cy={n.y + n.h / 2} r={7} />
        <circle className="gl-mm-dot" cx={n.x + n.w / 2} cy={n.y + n.h / 2} r={3.5} />
      </>
    );
  }
  return (n.outline ?? []).map((el, k) => React.createElement(el.tag, { key: k, className: 'gl-dg-box', ...el.attrs }));
}

/** A node with a `click … href` link: the whole box is the link, with the focus ring on the box. */
function Linked({ href, target, children }: { href?: string; target?: string; children: React.ReactElement }) {
  if (!href) return children;
  return (
    <a className="gl-mm-link" href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined}>
      {children}
    </a>
  );
}

/** Mermaid's layout in Diagram's marks: regions, lifelines, edges, boxes, labels, then the pulses. */
function MermaidMarks({ layout, pulses }: { layout: MmLayout; pulses: boolean }) {
  const horizontal = layout.flow === 'h';
  const boxes = [...layout.notes.map((n) => ({ ...n, note: true as const })), ...layout.nodes.map((n) => ({ ...n, note: false as const }))];
  const nodeRank = flowOrder(boxes, (b) => [b.x, b.y], horizontal);
  const edgeRank = layout.kind === 'sequence' ? layout.edges.map((_, i) => i) : flowOrder(layout.edges, (e) => e.points[0], horizontal);
  const kn = stagger(boxes.length);
  const ke = stagger(layout.edges.length);
  const kl = stagger(layout.labels.length);
  const labelRank = flowOrder(layout.labels, (l) => [l.x, l.y], horizontal);
  const accent = pulses ? layout.edges.filter((e) => e.tone === 'accent') : [];
  return (
    <>
      {layout.regions.map((region, i) => (
        <DgRegion key={`r${i}`} region={region} i={i} />
      ))}
      {layout.lines.map((l, i) => (
        <line key={`l${i}`} className={`gl-dg-region gl-mm-${l.kind}`} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} aria-hidden="true" />
      ))}
      {layout.bars.map((b, i) => (
        <DgNode key={`a${i}`} x={b.x} y={b.y} w={b.w} h={b.h} radius={3} lines={[]} i={i * stagger(layout.bars.length)} />
      ))}
      {layout.edges.map((e, i) => (
        <DgEdge key={`e${i}`} points={e.points} dashed={e.dashed} tone={e.tone} start={e.start} end={e.end} i={edgeRank[i] * ke}>
          {e.badge ? (
            <g className="gl-mm-badge">
              <circle cx={e.badge.x} cy={e.badge.y} r={9} />
              <text x={e.badge.x} y={e.badge.y + 3.9} textAnchor="middle" fontSize={11}>
                {e.badge.text}
              </text>
            </g>
          ) : null}
        </DgEdge>
      ))}
      {boxes.map((b, i) =>
        b.note ? (
          <DgNode key={`b${i}`} x={b.x} y={b.y} w={b.w} h={b.h} radius={10} lines={[]} i={nodeRank[i] * kn} />
        ) : (
          <Linked key={`b${i}`} href={b.href} target={b.target}>
            <DgNode
              x={b.x}
              y={b.y}
              w={b.w}
              h={b.h}
              shape={b.shape === 'rect' ? 'rect' : b.shape === 'circle' ? 'circle' : 'outline'}
              outline={b.shape === 'rect' || b.shape === 'circle' ? undefined : nodeOutline(b)}
              radius={b.radius}
              lines={b.lines}
              tone={b.tone}
              textX={b.textX}
              textY={b.textY}
              i={nodeRank[i] * kn}
            />
          </Linked>
        ),
      )}
      {layout.labels.map((label, i) => (
        <DgLabel key={`t${i}`} label={label} i={labelRank[i] * kl} />
      ))}
      {accent.length > 0 ? (
        <g className="gl-dg-pulses" aria-hidden="true">
          {accent.map((e, i) => (
            <DgPulse key={i} points={e.points} />
          ))}
        </g>
      ) : null}
    </>
  );
}

export interface MermaidDiagramProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Class names for the root element, merged with the component's own. */
  className?: string;
  /** Inline styles for the root element. */
  style?: React.CSSProperties;
  /** The Mermaid source. Add `accTitle:` and `accDescr:` lines so the drawing is named and described. */
  chart: string;
  /** Accessible name for the drawing. Use it when the source has no accTitle. */
  title?: string;
  /** Mermaid config over mermaidTheme for this diagram: objects merge one level deep, themeCSS appends. */
  config?: Record<string, unknown>;
  /** Where Mermaid is loaded from, once per page. Default: jsDelivr, mermaid@11.16.1. */
  src?: string;
  /** Floor for the scale, as Diagram's: below this share of its drawn width the diagram scrolls sideways instead. */
  minScale?: number;
  /** Redraw flowcharts, state and sequence diagrams with Diagram's marks. Default true; false keeps Mermaid's own drawing, themed. */
  restyle?: boolean;
  /** Play Diagram's entrance when the drawing scrolls into view. Default true. */
  reveal?: boolean;
  /** Run a pulse along every accent edge (`==>`) while on screen. Default true; never under reduced motion. */
  pulses?: boolean;
}

type Status = 'loading' | 'ready' | 'load-error' | 'parse-error';

/**
 * A Mermaid diagram drawn like Diagram. Mermaid loads once, on demand, and lays the diagram out;
 * flowcharts, state and sequence diagrams are then redrawn with Diagram's own marks (glass boxes,
 * right-angled edges, arrowheads, labels beside the lines, regions, the entrance and the pulses).
 * Other diagram types keep Mermaid's drawing in the theme. The source shows as a code block until
 * it draws, or if it can't.
 */
export const MermaidDiagram = React.forwardRef<HTMLDivElement, MermaidDiagramProps>(function MermaidDiagram(
  { chart, title, config, src = MERMAID_SRC, minScale = 0.6, restyle = true, reveal = true, pulses = true, className, ...rest },
  ref,
) {
  const uid = useId();
  const [status, setStatus] = React.useState<Status>('loading');
  const [overflows, setOverflows] = React.useState(false);
  const [drawn, setDrawn] = React.useState<Drawn | null>(null);
  const diagramRef = React.useRef<HTMLDivElement>(null);
  const configKey = JSON.stringify(config ?? {});
  const renders = React.useRef(0);

  React.useEffect(() => {
    let cancelled = false;
    const baseId = `${uid}-mermaid-${(renders.current += 1)}`;
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    const merged = mergeConfig(mermaidTheme as unknown as Config, JSON.parse(configKey) as Config);
    loadMermaid(src).then(
      (api) =>
        enqueue(() => draw(api, chart, merged, baseId, restyle)).then(
          (out) => {
            if (cancelled) return;
            setDrawn(out);
            setStatus('ready');
          },
          () => {
            if (!cancelled) setStatus('parse-error');
          },
        ),
      () => {
        if (!cancelled) setStatus('load-error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [chart, configKey, src, uid, restyle]);

  // Mermaid's own drawing: class the SVG, floor its width (minScale of its drawn width) and keep the host scrollable while it overflows.
  const native = status === 'ready' && drawn && !drawn.layout ? drawn : null;
  React.useEffect(() => {
    const el = diagramRef.current;
    if (!native || !el) return undefined;
    const svgEl = el.querySelector('svg');
    if (svgEl) {
      svgEl.classList.add('gl-mermaid-svg');
      const width = svgEl.viewBox && svgEl.viewBox.baseVal ? svgEl.viewBox.baseVal.width : 0;
      if (width > 0 && minScale > 0) svgEl.style.minWidth = `${Math.round(width * minScale)}px`;
    }
    native.bind?.(el);
    const update = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [native, minScale]);

  const layout = status === 'ready' && drawn?.layout ? drawn.layout : null;
  const name = title ?? (layout?.title || (layout?.kind === 'sequence' ? 'Sequence diagram' : layout?.kind === 'state' ? 'State diagram' : 'Flowchart'));
  return (
    <div ref={ref} className={cx('gl-mermaid', className)} data-status={status} data-drawing={layout ? 'diagram' : native ? 'mermaid' : undefined} {...rest}>
      {layout ? (
        <DiagramHost
          className="gl-mermaid-figure"
          label={name}
          description={layout.description}
          width={layout.width}
          height={layout.height}
          minScale={minScale}
          reveal={reveal}
          style={{ maxWidth: layout.width + 2 }}
          data-kind={layout.kind}
        >
          <MermaidMarks layout={layout} pulses={pulses} />
        </DiagramHost>
      ) : native ? (
        <>
          <div
            ref={diagramRef}
            className="gl-mermaid-diagram"
            role={title ? 'img' : overflows ? 'group' : undefined}
            aria-label={title ?? (overflows ? 'Diagram' : undefined)}
            tabIndex={overflows ? 0 : undefined}
            data-scrollable={overflows ? '' : undefined}
            dangerouslySetInnerHTML={{ __html: native.svg }}
          />
          {overflows ? <p className="gl-mermaid-status">Scroll sideways for the whole diagram.</p> : null}
        </>
      ) : (
        <>
          <pre className="gl-mermaid-source" aria-label={title ? `${title}: Mermaid source` : 'Mermaid source'}>
            <code className="gl-mermaid-code">{chart.trim()}</code>
          </pre>
          <p className="gl-mermaid-status" role="status">
            {status === 'loading'
              ? 'Drawing the diagram…'
              : status === 'load-error'
                ? "Mermaid didn't load, so this is the diagram's source."
                : "Mermaid couldn't read this source, so here it is as written."}
          </p>
        </>
      )}
    </div>
  );
});
