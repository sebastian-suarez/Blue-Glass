/**
Preview pages for the browser gates. A page is an unchanged preview.html with one runtime
injected into its head: the stylesheet, React (react.js) and window.BlueGlass. Pages are served
over HTTP from .cache/pages by a small local server, because module loading and Mermaid's
import need a real origin.
*/
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { previewScript, root, type Preview } from "./reference.ts";

export type Runtime = "reference" | "package";

export type PageOptions = {
	/**
	Extra CSS after the runtime's stylesheet: the parity mutation test plants defects with it.
	*/
	css?: string;

	/**
	Server-rendered markup to put inside #root.
	*/
	ssr?: string;

	/**
	Load no scripts at all, so the page shows only the server-rendered markup.
	*/
	noScript?: boolean;

	/**
	Hydrate the server-rendered markup instead of rendering from scratch.
	*/
	hydrate?: boolean;

	/**
	Tells apart several pages of one preview, such as "nojs".
	*/
	variant?: string;
};

const pagesDirectory = path.join(root, ".cache/pages");
const runtimesDirectory = path.join(root, ".cache/runtimes");
const mermaidDirectory = path.join(root, "node_modules/mermaid/dist");

/**
The URL the reference's MermaidDiagram loads Mermaid from; the gates serve the pinned copy.
*/
export const mermaidUrl =
	"https://cdn.jsdelivr.net/npm/mermaid@11.16.1/dist/mermaid.min.js";

const contentTypes: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json",
	".png": "image/png",
	".svg": "image/svg+xml",
	".woff2": "font/woff2",
};

function resolveRequest(url: string): string | undefined {
	const pathname = decodeURIComponent(
		new URL(url, "http://localhost").pathname,
	);
	const mounts: Array<[string, string]> = [
		["/pages/", pagesDirectory],
		["/runtimes/", runtimesDirectory],
		["/mermaid/", mermaidDirectory],
		["/story/", path.join(root, ".cache/story-gate")],
		["/islands/", path.join(root, ".cache/islands")],
		["/storybook/", path.join(root, "storybook-static")],
	];
	for (const [prefix, directory] of mounts) {
		if (pathname.startsWith(prefix)) {
			const file = path.join(directory, pathname.slice(prefix.length));
			if (!file.startsWith(directory)) {
				return undefined;
			}

			// The built Storybook's manager is its folder's index.html.
			return pathname.endsWith("/") ? path.join(file, "index.html") : file;
		}
	}

	return undefined;
}

export type Server = { origin: string; close: () => Promise<void> };

/**
Serves the pages, the runtimes, Mermaid and the built Storybook on a free local port.
*/
export async function startServer(): Promise<Server> {
	const server = http.createServer((request, response) => {
		const file = resolveRequest(request.url ?? "/");
		if (file === undefined || !fs.existsSync(file)) {
			response.writeHead(404).end();
			return;
		}

		response.writeHead(200, {
			"content-type":
				contentTypes[path.extname(file)] ?? "application/octet-stream",
			"cache-control": "no-store",
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
			await new Promise<void>((resolve) => {
				server.close(() => {
					resolve();
				});
			});
		},
	};
}

/**
Turns the preview's createRoot(...).render(tree) into hydrateRoot(...), recording every
recoverable error in window.__glHydrationErrors.
*/
const hydrationShim = `<script>
window.__glHydrationErrors = [];
(() => {
	const dom = window.ReactDOM;
	dom.createRoot = (container) => ({
		render(tree) {
			dom.hydrateRoot(container, tree, {
				onRecoverableError(error) {
					window.__glHydrationErrors.push(String(error && error.message || error));
				},
			});
		},
		unmount() {},
	});
})();
</script>`;

/**
Writes a preview page for a runtime and returns its URL path.
*/
export function writePage(
	preview: Preview,
	runtime: Runtime,
	options: PageOptions = {},
): string {
	const isScripted = options.noScript !== true;
	const head = [
		`<link rel="stylesheet" href="/runtimes/${runtime}.css">`,
		...(options.css === undefined
			? []
			: [`<style data-gl-mutation>${options.css}</style>`]),
		...(isScripted
			? [
					'<script src="/runtimes/react.js"></script>',
					`<script src="/runtimes/${runtime}.js"></script>`,
				]
			: []),
		...(isScripted && options.hydrate === true ? [hydrationShim] : []),
	].join("\n");
	let html = fs.readFileSync(preview.file, "utf8");
	if (!isScripted) {
		html = html.replace(/<script>[\s\S]*?<\/script>/v, "");
	}

	html = html.replace("</head>", () => `${head}\n</head>`);
	if (options.ssr !== undefined) {
		const markup = options.ssr;
		html = html.replace(
			'<div id="root"></div>',
			() => `<div id="root">${markup}</div>`,
		);
	}

	const suffix = options.variant === undefined ? "" : `--${options.variant}`;
	const name = `${preview.id.replace("/", "--")}${suffix}.html`;
	const file = path.join(pagesDirectory, runtime, name);
	fs.mkdirSync(path.dirname(file), { recursive: true });
	fs.writeFileSync(file, html);
	return `/pages/${runtime}/${name}`;
}

/**
Checks a preview has the shape the gates rely on: an inline script and an empty #root.
*/
export function assertPreviewShape(preview: Preview): void {
	previewScript(preview.file);
	if (
		!fs.readFileSync(preview.file, "utf8").includes('<div id="root"></div>')
	) {
		throw new Error(`${preview.id} has no empty #root`);
	}
}
