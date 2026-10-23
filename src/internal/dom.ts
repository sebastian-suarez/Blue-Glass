export function ownerDocument(node?: Node | null): Document {
	return node?.ownerDocument ?? document;
}

export function ownerWindow(node?: Node | null): Window {
	return ownerDocument(node).defaultView ?? window;
}

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

export function getFocusable(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(focusableSelector)].filter(
		(element) =>
			!element.hasAttribute("inert") &&
			element.getAttribute("aria-hidden") !== "true" &&
			(element.offsetParent !== null ||
				element === element.ownerDocument.activeElement),
	);
}

export function isInside(
	root: Element | null | undefined,
	target: EventTarget | null,
): boolean {
	return root !== null && root !== undefined && target instanceof Node
		? root.contains(target)
		: false;
}

export function reflow(node: Element | null): void {
	node?.getBoundingClientRect();
}

export function readToken(name: string, fallback: string): string {
	if (typeof window === "undefined") {
		return fallback;
	}

	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	return value === "" ? fallback : value;
}

export function toMs(value: string): number {
	const time = value.trim();
	const milliseconds = time.endsWith("ms")
		? Number(time.slice(0, -2))
		: time.endsWith("s")
			? Number(time.slice(0, -1)) * 1000
			: Number(time);
	return Number.isFinite(milliseconds) ? milliseconds : 0;
}
