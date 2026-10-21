export function ownerDocument(node?: Node | null): Document {
  return (node && node.ownerDocument) || document;
}

export function ownerWindow(node?: Node | null): Window {
  return ownerDocument(node).defaultView || window;
}

/** Width of the vertical scrollbar the document currently shows. */
export function getScrollbarSize(doc: Document = document): number {
  const w = doc.defaultView || window;
  return Math.max(0, w.innerWidth - doc.documentElement.clientWidth);
}

export const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), ' +
  'textarea:not([disabled]), iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable="false"]), ' +
  '[tabindex]:not([tabindex="-1"])';

/** Focusable, visible descendants in document order. */
export function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true' && (el.offsetParent !== null || el === document.activeElement),
  );
}

/** True when `target` is `root` or inside it (handles portals by DOM only). */
export function contains(root: Element | null | undefined, target: EventTarget | null): boolean {
  return !!root && target instanceof Node && root.contains(target);
}

/** Force a style recalculation so a following transition starts from the current state. */
export function reflow(node: Element | null): void {
  if (node) void (node as HTMLElement).getBoundingClientRect();
}

/** Read a CSS custom property's resolved value off :root, e.g. a duration token. */
export function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** "160ms" | "0.2s" -> milliseconds. */
export function toMs(value: string): number {
  const v = value.trim();
  if (v.endsWith('ms')) return parseFloat(v);
  if (v.endsWith('s')) return parseFloat(v) * 1000;
  return parseFloat(v) || 0;
}
