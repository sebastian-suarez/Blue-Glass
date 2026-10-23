import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import { type AddressInfo } from "node:net";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { scope } from "./phases.ts";
import { root } from "./reference.ts";

export const consumer = path.join(root, "tests/consumer/astro");

export type Outcome = { name: string; ok: boolean; detail: string };

type PageCheck = {
	name: string;
	path: string;
	javaScript: boolean;
	run: (page: Page) => Promise<string>;
};

type TypeStyle = {
	name: string;
	fontSize: string;
	fontWeight: number;
	letterSpacing?: string;
};

const documentedLayers = [
	"theme",
	"base",
	"gl-fallback",
	"gl-base",
	"components",
	"gl-components",
	"utilities",
];

function typeStyle(name: string): TypeStyle {
	const { resolve } = createRequire(path.join(consumer, "package.json"));
	const tokens = JSON.parse(
		fs.readFileSync(
			resolve("@sebastian-suarez/blue-glass/tokens.json"),
			"utf8",
		),
	) as { type: { groups: Array<{ styles: TypeStyle[] }> } };
	const style = tokens.type.groups
		.flatMap((group) => group.styles)
		.find((candidate) => candidate.name === name);
	if (style === undefined) {
		throw new Error(`tokens.json has no ${name}`);
	}

	return style;
}

function expectEqual(actual: unknown, expected: unknown, what: string) {
	if (actual !== expected) {
		throw new Error(
			`${what}: expected ${String(expected)}, got ${String(actual)}`,
		);
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function computedStyle(page: Page, selector: string) {
	return page.locator(selector).evaluate((element) => {
		const style = getComputedStyle(element);
		return {
			fontSize: style.fontSize,
			fontWeight: style.fontWeight,
			letterSpacing: style.letterSpacing,
		};
	});
}

function cascade(selectors: string[]) {
	const layers: string[] = [];
	const layerOf: Record<string, string> = {};
	const visit = (rules: CSSRuleList, layer: string) => {
		for (const rule of rules) {
			if (rule instanceof CSSStyleRule) {
				if (selectors.includes(rule.selectorText)) {
					layerOf[rule.selectorText] = layer;
				}
			} else if (rule instanceof CSSLayerStatementRule) {
				if (layer === "") {
					layers.push(
						...rule.nameList.filter((name) => !layers.includes(name)),
					);
				}
			} else if (rule instanceof CSSLayerBlockRule) {
				if (layer === "" && !layers.includes(rule.name)) {
					layers.push(rule.name);
				}

				visit(
					rule.cssRules,
					layer === "" ? rule.name : `${layer}.${rule.name}`,
				);
			} else if (rule instanceof CSSGroupingRule) {
				visit(rule.cssRules, layer);
			}
		}
	};

	for (const sheet of document.styleSheets) {
		visit(sheet.cssRules, "");
	}

	return { layers, layerOf };
}

const checks: PageCheck[] = [
	{
		name: "stylesheet",
		path: "/",
		javaScript: true,
		async run(page) {
			const { layers, layerOf } = await page.evaluate(cascade, [
				".text-heading",
				".text-2xl",
			]);
			expectEqual(
				layers.filter((name) => documentedLayers.includes(name)).join(" < "),
				documentedLayers.join(" < "),
				"layer order",
			);
			expectEqual(layerOf[".text-heading"], "gl-base", ".text-heading's layer");
			expectEqual(layerOf[".text-2xl"], "utilities", ".text-2xl's layer");
			return `layers ${layers.join(" < ")}`;
		},
	},
	{
		name: "utilities win",
		path: "/",
		javaScript: true,
		async run(page) {
			const style = await computedStyle(page, "#utilities-win");
			expectEqual(style.fontSize, "24px", "font-size");
			expectEqual(style.fontWeight, "600", "font-weight");
			const tracking = typeStyle("text-heading").letterSpacing ?? "0em";
			expectEqual(
				Number(style.letterSpacing.replace(/px$/v, "")).toFixed(2),
				(Number(tracking.replace(/em$/v, "")) * 24).toFixed(2),
				"letter-spacing in px",
			);
			return `text-heading text-2xl font-semibold: ${style.fontSize} ${style.fontWeight}`;
		},
	},
	{
		name: "type class alone",
		path: "/",
		javaScript: true,
		async run(page) {
			const heading = typeStyle("text-heading");
			const style = await computedStyle(page, "#type-class");
			expectEqual(style.fontSize, heading.fontSize, "font-size");
			expectEqual(style.fontWeight, String(heading.fontWeight), "font-weight");
			return `text-heading: ${style.fontSize} ${style.fontWeight}`;
		},
	},
	{
		name: "island",
		path: "/",
		javaScript: true,
		async run(page) {
			const island = page.locator("#package-exports");
			await island.scrollIntoViewIfNeeded();
			await page.locator("#package-exports[data-hydrated]").waitFor();
			const { phase, values } = scope();
			expectEqual(
				Number(await island.locator("output").textContent()),
				values.size,
				`exports in scope at phase ${phase}`,
			);
			return `client:visible hydrated, ${values.size} exports`;
		},
	},
	{
		name: "without JavaScript",
		path: "/",
		javaScript: false,
		async run(page) {
			const content = ["#utilities-win", "#type-class", "#package-exports"];
			const visible = await Promise.all(
				content.map(async (selector) => page.locator(selector).isVisible()),
			);
			const hidden = content.filter((_selector, index) => !visible[index]);
			if (hidden.length > 0) {
				throw new Error(`not visible: ${hidden.join(", ")}`);
			}

			const style = await computedStyle(page, "#type-class");
			expectEqual(
				style.fontSize,
				typeStyle("text-heading").fontSize,
				"font-size",
			);
			const marker = await page
				.locator("#package-exports")
				.getAttribute("data-hydrated");
			if (marker !== null) {
				throw new Error("the island hydrated with JavaScript off");
			}

			return "content visible and styled, island not hydrated";
		},
	},
];

const contentTypes: Record<string, string> = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".ico": "image/x-icon",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
};

async function serve(directory: string) {
	const server = http.createServer((request, response) => {
		const { pathname } = new URL(request.url ?? "/", "http://localhost");
		let file = path.join(directory, decodeURIComponent(pathname));
		if (fs.statSync(file, { throwIfNoEntry: false })?.isDirectory()) {
			file = path.join(file, "index.html");
		}

		if (
			!file.startsWith(directory + path.sep) ||
			!fs.statSync(file, { throwIfNoEntry: false })?.isFile()
		) {
			response.writeHead(404).end();
			return;
		}

		response.writeHead(200, {
			"content-type":
				contentTypes[path.extname(file)] ?? "application/octet-stream",
		});
		fs.createReadStream(file).pipe(response);
	});
	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", resolve);
	});
	const { port } = server.address() as AddressInfo;
	return {
		origin: `http://127.0.0.1:${port}`,
		async close() {
			await new Promise((resolve) => {
				server.close(resolve);
			});
		},
	};
}

async function runCheck(
	browser: Browser,
	origin: string,
	check: PageCheck,
): Promise<string> {
	const context = await browser.newContext({
		javaScriptEnabled: check.javaScript,
	});
	try {
		const page = await context.newPage();
		page.setDefaultTimeout(15_000);
		const problems: string[] = [];
		page.on("pageerror", (error) => {
			problems.push(`page error: ${error.message}`);
		});
		page.on("console", (message) => {
			if (message.type() === "error") {
				problems.push(`console error: ${message.text()}`);
			}
		});
		page.on("response", (response) => {
			if (response.status() >= 400) {
				problems.push(`${response.status()} ${response.url()}`);
			}
		});
		page.on("requestfailed", (request) => {
			problems.push(`request failed: ${request.url()}`);
		});
		await page.goto(new URL(check.path, origin).href);
		const detail = await check.run(page);
		if (problems.length > 0) {
			throw new Error(problems.join("\n"));
		}

		return detail;
	} finally {
		await context.close();
	}
}

export async function checkSite(): Promise<Outcome[]> {
	const server = await serve(path.join(consumer, "dist"));
	try {
		const browser = await chromium.launch();
		try {
			const results = await Promise.allSettled(
				checks.map(async (check) => runCheck(browser, server.origin, check)),
			);
			return checks.map((check, index) => {
				const result = results[index];
				return {
					name: `${check.path} ${check.name}`,
					ok: result.status === "fulfilled",
					detail:
						result.status === "fulfilled"
							? result.value
							: errorMessage(result.reason),
				};
			});
		} finally {
			await browser.close();
		}
	} finally {
		await server.close();
	}
}
