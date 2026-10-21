/**
DOM helpers shared by the components, ported from design-system/shared/dom.ts. None of
them runs during render, so server rendering never reaches the document.
*/

export function ownerDocument(node?: Node | null): Document {
	return node?.ownerDocument ?? document;
}

export function ownerWindow(node?: Node | null): Window {
	return ownerDocument(node).defaultView ?? window;
}

/**
Width of the vertical scrollbar the document currently shows.
*/
export function getScrollbarSize(document_: Document = document): number {
	const view = document_.defaultView ?? window;
	return Math.max(0, view.innerWidth - document_.documentElement.clientWidth);
}

export const focusableSelector = [
	"a[href]",
	"area[href]",
	"button:not([disabled])",
	'input:not([disabled]):not([type="hidden"])',
	"select:not([disabled])",
	"textarea:not([disabled])",
	"iframe",
	"audio[controls]",
	"video[controls]",
	'[contenteditable]:not([contenteditable="false"])',
	'[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
Focusable, visible descendants in document order.
*/
export function getFocusable(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(focusableSelector)].filter(
		(element) =>
			!element.hasAttribute("inert") &&
			element.getAttribute("aria-hidden") !== "true" &&
			(element.offsetParent !== null ||
				element === element.ownerDocument.activeElement),
	);
}

/**
Whether `target` is `root` or inside it. It follows the DOM only, so portals count as outside.
*/
export function isInside(
	root: Element | null | undefined,
	target: EventTarget | null,
): boolean {
	return root !== null && root !== undefined && target instanceof Node
		? root.contains(target)
		: false;
}

/**
Forces a style recalculation so a following transition starts from the current state.
*/
export function reflow(node: Element | null): void {
	node?.getBoundingClientRect();
}

/**
A CSS custom property's resolved value on the root element, such as a duration token.
*/
export function readToken(name: string, fallback: string): string {
	if (typeof window === "undefined") {
		return fallback;
	}

	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	return value === "" ? fallback : value;
}

/**
Converts a CSS time ("160ms", "0.2s") to milliseconds; anything else is 0.
*/
export function toMs(value: string): number {
	const time = value.trim();
	const milliseconds = time.endsWith("ms")
		? Number(time.slice(0, -2))
		: time.endsWith("s")
			? Number(time.slice(0, -1)) * 1000
			: Number(time);
	return Number.isFinite(milliseconds) ? milliseconds : 0;
}
