/**
Server rendering of preview pages in Node. A preview's script runs in this realm (a separate
VM realm breaks `instanceof Date` in the components) with stand-ins for `window` and
`document`. Its createRoot(...).render(tree) call hands over the tree, which react-dom/server
renders while the real globals stay undefined, so a component that touches the DOM during
render throws.
*/
import { createRequire } from "node:module";
import path from "node:path";
import type * as ReactModule from "react";
import type * as ReactDomServer from "react-dom/server";
import { previewScript, root, type Preview } from "./reference.ts";

const require = createRequire(path.join(root, "package.json"));
const react = require("react") as typeof ReactModule;
const { renderToString } = require("react-dom/server") as typeof ReactDomServer;

export type Viewport = { width: number; height: number };

export const desktop: Viewport = { width: 1280, height: 900 };

/**
One media feature, such as "(min-width: 900px)" or "(hover: hover)".
*/
function doesFeatureMatch(text: string, viewport: Viewport): boolean {
	const feature = text.trim();
	if (feature === "all" || feature === "screen") {
		return true;
	}

	if (!feature.startsWith("(") || !feature.endsWith(")")) {
		return false;
	}

	const [name = "", value = ""] = feature
		.slice(1, -1)
		.split(":", 2)
		.map((part) => part.trim());
	const pixels = Number(value.replace(/px$/v, ""));
	const answers: Record<string, boolean> = {
		"min-width": viewport.width >= pixels,
		"max-width": viewport.width <= pixels,
		"min-height": viewport.height >= pixels,
		"max-height": viewport.height <= pixels,
		hover: value === "hover",
		pointer: value === "fine",
	};
	return answers[name] ?? false;
}

/**
Answers the media queries the previews ask, for a reader at `viewport` with a mouse and no
preferences set: widths, heights, hover and pointer. Anything else is false.
*/
export function doesQueryMatch(query: string, viewport: Viewport): boolean {
	return query
		.replace(/^@media\s+/v, "")
		.split(",")
		.some((alternative) =>
			alternative
				.split(" and ")
				.map((part) => part.trim())
				.filter((part) => part !== "" && part !== "only screen")
				.every((part) =>
					part.startsWith("not ")
						? !doesFeatureMatch(part.slice(4), viewport)
						: doesFeatureMatch(part, viewport),
				),
		);
}

export type ServerRender = { html: string } | { error: string };

/**
Renders a preview with `blueGlass` as its window.BlueGlass, for a reader at `viewport`.
*/
export function renderPreview(
	preview: Preview,
	blueGlass: Record<string, unknown>,
	viewport: Viewport = desktop,
): ServerRender {
	let tree: ReactModule.ReactNode;
	let hasRendered = false;
	/* eslint-disable @typescript-eslint/naming-convention -- the previews read these exact globals */
	const stubWindow = {
		React: react,
		ReactDOM: {
			createRoot: () => ({
				render(node: ReactModule.ReactNode) {
					tree = node;
					hasRendered = true;
				},
				unmount: () => undefined,
			}),
		},
		BlueGlass: { ...blueGlass },
		innerWidth: viewport.width,
		innerHeight: viewport.height,
		matchMedia: (query: string) => ({
			matches: doesQueryMatch(query, viewport),
			media: query,
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
			addListener: () => undefined,
			removeListener: () => undefined,
		}),
	};
	/* eslint-enable @typescript-eslint/naming-convention */
	const stubDocument = { getElementById: () => ({}) };
	try {
		// The preview scripts are the reference's own pages; running them is the point.
		// eslint-disable-next-line no-new-func
		const run = new Function(
			"window",
			"document",
			previewScript(preview.file),
		) as (window: unknown, document: unknown) => void;
		run(stubWindow, stubDocument);
		return hasRendered
			? { html: renderToString(tree) }
			: { error: "the preview rendered nothing" };
	} catch (error) {
		return {
			error:
				error instanceof Error
					? (error.message.split("\n", 1)[0] ?? "")
					: String(error),
		};
	}
}
