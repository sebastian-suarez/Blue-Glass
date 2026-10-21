/**
Deterministic captures of preview pages in Chromium. Every capture uses the same viewport,
clock and fonts, and freezes motion the same way before the screenshot:

- finite CSS animations and transitions jump to their end (the state a reader settles on);
- infinite ones (pulses, spinners, indeterminate bars) pause at their start;
- SVG animations (the Diagram pulses) pause at time 0.

Without this, two runs of the same page differ by animation phase alone.
*/
import type { Buffer } from "node:buffer";
import type { Browser, BrowserContext, Page } from "playwright";
import { mermaidUrl } from "./pages.ts";
import { root } from "./reference.ts";

export type Box = { x: number; y: number; width: number; height: number };

export type Region = Box & { label: string };

/**
The moment every capture pretends it is, so dates rendered from "now" never drift.
*/
export const fixedNow = new Date("2026-10-21T12:00:00Z");

export const viewports = {
	desktop: { width: 1280, height: 900 },
	phone: { width: 390, height: 844 },
} as const;

export async function newContext(
	browser: Browser,
	options: {
		width?: number;
		height?: number;
		javaScriptEnabled?: boolean;
	} = {},
): Promise<BrowserContext> {
	const context = await browser.newContext({
		viewport: {
			width: options.width ?? viewports.desktop.width,
			height: options.height ?? viewports.desktop.height,
		},
		deviceScaleFactor: 1,
		reducedMotion: "no-preference",
		javaScriptEnabled: options.javaScriptEnabled ?? true,
		locale: "en-US",
		timezoneId: "UTC",
	});
	await context.route(mermaidUrl, async (route) => {
		await route.fulfill({
			path: `${root}/node_modules/mermaid/dist/mermaid.min.js`,
			contentType: "text/javascript",
		});
	});
	return context;
}

/**
Opens a page, recording its page errors and console errors.
*/
export async function openPage(
	context: BrowserContext,
	url: string,
): Promise<{ page: Page; errors: string[] }> {
	const page = await context.newPage();
	const errors: string[] = [];
	page.on("pageerror", (error) => {
		errors.push(`pageerror: ${error.message.split("\n", 1)[0] ?? ""}`);
	});
	page.on("console", (message) => {
		if (message.type() === "error") {
			errors.push(`console: ${message.text().split("\n", 1)[0] ?? ""}`);
		}
	});
	// Date reads the fixed moment from the first script on; timers keep running.
	await page.clock.setFixedTime(fixedNow);
	await page.goto(url, { waitUntil: "networkidle" });
	return { page, errors };
}

/**
Freezes CSS, Web Animations and SVG animations as the module comment describes.
*/
export async function freeze(page: Page): Promise<void> {
	await page.evaluate(() => {
		for (const animation of document.getAnimations()) {
			const timing = animation.effect?.getComputedTiming();
			if (timing !== undefined && Number.isFinite(timing.endTime)) {
				animation.finish();
			} else {
				animation.pause();
				animation.currentTime = 0;
			}
		}

		for (const svg of document.querySelectorAll("svg")) {
			svg.pauseAnimations();
			svg.setCurrentTime(0);
		}
	});
}

/**
Waits for fonts, the network and two frames, then freezes motion.
*/
export async function settle(page: Page): Promise<void> {
	await page.waitForLoadState("networkidle");
	await page.evaluate(async () => {
		await document.fonts.ready;
		await new Promise((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(resolve);
			});
		});
	});
	await freeze(page);
}

/**
A full-page PNG of the frozen page.
*/
export async function screenshot(page: Page): Promise<Buffer> {
	return page.screenshot({
		fullPage: true,
		animations: "disabled",
		caret: "hide",
		scale: "css",
	});
}

/**
The regions a preview is made of: each section the preview frame renders (its titled
groups), in page coordinates, then the whole page.
*/
export async function regions(page: Page): Promise<Region[]> {
	return page.evaluate(() => {
		const out: Array<{
			label: string;
			x: number;
			y: number;
			width: number;
			height: number;
		}> = [];
		for (const [index, section] of [
			...document.querySelectorAll("#root section"),
		].entries()) {
			const box = section.getBoundingClientRect();
			const heading = section.querySelector("h2")?.textContent?.trim() ?? "";
			out.push({
				label: heading === "" ? `section ${index + 1}` : heading,
				x: Math.floor(box.left + window.scrollX),
				y: Math.floor(box.top + window.scrollY),
				width: Math.ceil(box.width),
				height: Math.ceil(box.height),
			});
		}

		const { documentElement } = document;
		out.push({
			label: "page",
			x: 0,
			y: 0,
			width: documentElement.scrollWidth,
			height: documentElement.scrollHeight,
		});
		return out;
	});
}

/**
The text a reader can see inside `scope`: text nodes with a non-empty box whose element and
ancestors aren't hidden by display, visibility or opacity. The server-HTML gate compares
this list with and without JavaScript.
*/
export async function visibleTexts(
	page: Page,
	scope = "#root",
): Promise<string[]> {
	return page.evaluate((selector) => {
		const container = document.querySelector(selector);
		if (container === null) {
			return [];
		}

		const isShown = (element: Element | null): boolean => {
			for (let node = element; node !== null; node = node.parentElement) {
				const style = getComputedStyle(node);
				if (
					style.display === "none" ||
					style.visibility === "hidden" ||
					style.visibility === "collapse" ||
					Number(style.opacity) === 0
				) {
					return false;
				}
			}

			return true;
		};

		const texts: string[] = [];
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
		for (
			let node = walker.nextNode();
			node !== null;
			node = walker.nextNode()
		) {
			const text = node.textContent?.replaceAll(/\s+/gv, " ").trim() ?? "";
			if (text === "" || !isShown(node.parentElement)) {
				continue;
			}

			const range = document.createRange();
			range.selectNodeContents(node);
			const box = range.getBoundingClientRect();
			if (box.width > 0 && box.height > 0) {
				texts.push(text);
			}
		}

		return texts;
	}, scope);
}
