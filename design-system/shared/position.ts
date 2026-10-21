export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export type Placement =
  | 'top' | 'top-start' | 'top-end'
  | 'bottom' | 'bottom-start' | 'bottom-end'
  | 'left' | 'left-start' | 'left-end'
  | 'right' | 'right-start' | 'right-end';

export interface PositionOptions {
  placement?: Placement;
  /** Gap between the anchor and the floating element, px. */
  offset?: number;
  /** Flip to the opposite side when the preferred side overflows. */
  flip?: boolean;
  /** Keep the floating element inside the viewport on the cross axis. */
  shift?: boolean;
  /** Viewport padding kept clear, px. */
  padding?: number;
  /** Make the floating element at least as wide as the anchor (menus under a field). */
  matchWidth?: boolean;
  /** The box to stay inside; default the window. */
  viewport?: { width: number; height: number };
}

export interface PositionResult {
  x: number;
  y: number;
  placement: Placement;
  /** transform-origin for origin-aware scale-in, relative to the floating box. */
  origin: string;
  maxHeight: number;
  minWidth?: number;
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/**
 * position: fixed is relative to the viewport unless an ancestor creates a
 * containing block (transform, filter, backdrop-filter, contain, will-change).
 * Returns that block's box in viewport coordinates, or null for the viewport.
 */
export function containingBlock(el: Element | null): { x: number; y: number; width: number; height: number } | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.documentElement) {
    const cs = getComputedStyle(node);
    const bf = (cs as unknown as { backdropFilter?: string }).backdropFilter || (cs as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter;
    if (
      cs.transform !== 'none' || cs.perspective !== 'none' || cs.filter !== 'none' || (bf && bf !== 'none') ||
      /transform|filter|perspective/.test(cs.willChange) || /paint|layout|strict|content/.test(cs.contain)
    ) {
      const r = node.getBoundingClientRect();
      return { x: r.left + node.clientLeft, y: r.top + node.clientTop, width: node.clientWidth, height: node.clientHeight };
    }
    node = node.parentElement;
  }
  return null;
}

/** computePosition for an element that is (or will be) position: fixed, in its own containing block's coordinates. */
export function positionFixed(anchor: DOMRect, floatingEl: HTMLElement, opts: PositionOptions = {}): PositionResult {
  const cb = containingBlock(floatingEl);
  const a = cb ? new DOMRect(anchor.left - cb.x, anchor.top - cb.y, anchor.width, anchor.height) : anchor;
  return computePosition(a, { width: floatingEl.offsetWidth, height: floatingEl.offsetHeight }, cb ? { ...opts, viewport: { width: cb.width, height: cb.height } } : opts);
}

export function splitPlacement(p: Placement): [Side, Align] {
  const [side, align] = p.split('-') as [Side, Align | undefined];
  return [side, align ?? 'center'];
}

function place(a: DOMRect, f: { width: number; height: number }, side: Side, align: Align, offset: number) {
  let x = 0;
  let y = 0;
  if (side === 'top' || side === 'bottom') {
    y = side === 'top' ? a.top - f.height - offset : a.bottom + offset;
    x = align === 'start' ? a.left : align === 'end' ? a.right - f.width : a.left + a.width / 2 - f.width / 2;
  } else {
    x = side === 'left' ? a.left - f.width - offset : a.right + offset;
    y = align === 'start' ? a.top : align === 'end' ? a.bottom - f.height : a.top + a.height / 2 - f.height / 2;
  }
  return { x, y };
}

/**
 * Position a fixed floating box against an anchor rect, viewport coordinates.
 * Flip on the main axis, shift on the cross axis, cap height to the space left.
 */
export function computePosition(anchor: DOMRect, floating: { width: number; height: number }, opts: PositionOptions = {}): PositionResult {
  const { placement = 'bottom', offset = 8, flip = true, shift = true, padding = 8, matchWidth = false, viewport } = opts;
  const vw = viewport ? viewport.width : typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = viewport ? viewport.height : typeof window !== 'undefined' ? window.innerHeight : 768;
  let [side, align] = splitPlacement(placement);
  const width = matchWidth ? Math.max(floating.width, anchor.width) : floating.width;
  const box = { width, height: floating.height };

  const space: Record<Side, number> = {
    top: anchor.top - padding - offset,
    bottom: vh - anchor.bottom - padding - offset,
    left: anchor.left - padding - offset,
    right: vw - anchor.right - padding - offset,
  };
  const need = side === 'top' || side === 'bottom' ? box.height : box.width;
  if (flip && space[side] < need && space[OPPOSITE[side]] > space[side]) side = OPPOSITE[side];

  let { x, y } = place(anchor, box, side, align, offset);
  if (shift) {
    if (side === 'top' || side === 'bottom') x = Math.min(Math.max(x, padding), Math.max(padding, vw - box.width - padding));
    else y = Math.min(Math.max(y, padding), Math.max(padding, vh - box.height - padding));
  }
  const maxHeight = Math.max(80, side === 'top' ? space.top : side === 'bottom' ? space.bottom : vh - 2 * padding);

  // Origin: the edge facing the anchor, at the anchor's centre on the cross axis.
  let origin: string;
  if (side === 'top' || side === 'bottom') {
    const ox = Math.min(Math.max(anchor.left + anchor.width / 2 - x, 0), box.width);
    origin = `${Math.round(ox)}px ${side === 'top' ? '100%' : '0'}`;
  } else {
    const oy = Math.min(Math.max(anchor.top + anchor.height / 2 - y, 0), box.height);
    origin = `${side === 'left' ? '100%' : '0'} ${Math.round(oy)}px`;
  }
  const finalPlacement = (align === 'center' ? side : `${side}-${align}`) as Placement;
  return { x: Math.round(x), y: Math.round(y), placement: finalPlacement, origin, maxHeight, minWidth: matchWidth ? anchor.width : undefined };
}
