import type { Buffer } from "node:buffer";
import type { Browser, BrowserContext, Page } from "playwright";
import { waitForFonts } from "./fonts.ts";
import { mermaidUrl } from "./pages.ts";
import { root } from "./reference.ts";
import { viewports } from "./viewports.ts";

export type Box = { x: number; y: number; width: number; height: number };

export type Region = Box & { label: string };

export const fixedNow = new Date("2026-10-21T12:00:00Z");

export { viewports } from "./viewports.ts";

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
	await page.clock.setFixedTime(fixedNow);
	await page.goto(url, { waitUntil: "networkidle" });
	await waitForFonts(page);
	return { page, errors };
}

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

async function waitForStableLayout(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const read = () => {
			const { documentElement } = document;
			return `${documentElement.scrollWidth}×${documentElement.scrollHeight}:${document.querySelectorAll("*").length}`;
		};

		let last = read();
		let unchanged = 0;
		for (let tries = 0; unchanged < 3 && tries < 100; tries++) {
			// eslint-disable-next-line no-await-in-loop -- each reading waits for the previous one
			await new Promise((resolve) => {
				setTimeout(resolve, 150);
			});
			const now = read();
			unchanged = now === last ? unchanged + 1 : 0;
			last = now;
		}
	});
}

export async function settle(page: Page): Promise<void> {
	await page.waitForLoadState("networkidle");
	await page.evaluate(async () => {
		await document.fonts.ready;
	});
	await waitForStableLayout(page);
	await page.evaluate(async () => {
		await new Promise((resolve) => {
			requestAnimationFrame(() => {
				requestAnimationFrame(resolve);
			});
		});
	});
	await freeze(page);
}

export async function screenshot(page: Page): Promise<Buffer> {
	return page.screenshot({
		fullPage: true,
		animations: "disabled",
		caret: "hide",
		scale: "css",
	});
}

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

export type TextPosition = { text: string; x: number; y: number };

export async function textPositions(
	page: Page,
	scope = "#root",
): Promise<TextPosition[]> {
	return page.evaluate((selector) => {
		const out: Array<{ text: string; x: number; y: number }> = [];
		const container = document.querySelector(selector);
		if (container === null) {
			return out;
		}

		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
		for (
			let node = walker.nextNode();
			node !== null;
			node = walker.nextNode()
		) {
			const text = node.textContent?.replaceAll(/\s+/gv, " ").trim() ?? "";
			const range = document.createRange();
			range.selectNodeContents(node);
			const box = range.getBoundingClientRect();
			if (text !== "" && box.width > 0 && box.height > 0) {
				out.push({
					text,
					x: Math.round(box.left + globalThis.scrollX),
					y: Math.round(box.top + globalThis.scrollY),
				});
			}
		}

		return out;
	}, scope);
}

export function compareLayouts(
	before: TextPosition[],
	after: TextPosition[],
): { moved: string[]; changed: boolean } {
	const isChanged =
		before.length !== after.length ||
		before.some((box, index) => after[index]?.text !== box.text);
	const moved = before
		.filter((box, index) => {
			const match = after[index];
			return (
				match?.text === box.text &&
				(Math.abs(match.x - box.x) > 2 || Math.abs(match.y - box.y) > 2)
			);
		})
		.map((box) => box.text);
	return { moved, changed: isChanged };
}

export async function allTexts(page: Page, scope = "#root"): Promise<string[]> {
	return page.evaluate((selector) => {
		const container = document.querySelector(selector);
		if (container === null) {
			return [];
		}

		const texts: string[] = [];
		const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
		for (
			let node = walker.nextNode();
			node !== null;
			node = walker.nextNode()
		) {
			const text = node.textContent?.replaceAll(/\s+/gv, " ").trim() ?? "";
			if (text !== "") {
				texts.push(text);
			}
		}

		return texts;
	}, scope);
}

export async function visibleTexts(
	page: Page,
	scope = "#root",
): Promise<string[]> {
	return page.evaluate((selector) => {
		const container = document.querySelector(selector);
		if (container === null) {
			return [];
		}

		const alphaOf = (color: string): number => {
			const alpha =
				/^rgba\((?:[^,]*,){3}\s*(?<alpha>[\d.]+)\)$/v.exec(color)?.groups
					?.alpha ?? /\/\s*(?<alpha>[\d.]+)%?\)$/v.exec(color)?.groups?.alpha;
			return alpha === undefined ? 1 : Number(alpha);
		};

		const isCutAway = (node: Element, clipPath: string): boolean => {
			const inset = /^inset\((?<values>[^\)]*?)(?: round [^\)]*)?\)$/v.exec(
				clipPath,
			)?.groups?.values;
			if (inset === undefined) {
				return false;
			}

			const box = node.getBoundingClientRect();
			const [top = "0px", right = top, bottom = top, left = right] = inset
				.trim()
				.split(/\s+/v, 4);
			const length = (value: string, size: number) =>
				value.endsWith("%")
					? (Number(value.slice(0, -1)) / 100) * size
					: Number(value.replace(/px$/v, ""));
			return (
				length(left, box.width) + length(right, box.width) >= box.width ||
				length(top, box.height) + length(bottom, box.height) >= box.height
			);
		};

		const isShown = (element: Element | null): boolean => {
			const ink = element === null ? undefined : getComputedStyle(element);
			if (
				ink !== undefined &&
				ink.backgroundClip !== "text" &&
				(alphaOf(ink.color) === 0 || alphaOf(ink.webkitTextFillColor) === 0)
			) {
				return false;
			}

			for (let node = element; node !== null; node = node.parentElement) {
				const style = getComputedStyle(node);
				if (
					style.display === "none" ||
					style.visibility === "hidden" ||
					style.visibility === "collapse" ||
					Number(style.opacity) === 0 ||
					isCutAway(node, style.clipPath)
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
