import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { satoshiFontFace } from "./font-face.ts";
import { assertFonts, fontsDirectory } from "./fonts.ts";
import { previewScript, root, type Preview } from "./reference.ts";

export type Runtime = "reference" | "package";

export type PageOptions = {
	css?: string;

	ssr?: string;

	noScript?: boolean;

	hydrate?: boolean;

	variant?: string;
};

const pagesDirectory = path.join(root, ".cache/pages");
const runtimesDirectory = path.join(root, ".cache/runtimes");
const mermaidDirectory = path.join(root, "node_modules/mermaid/dist");

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
		["/fonts/", fontsDirectory],
	];
	for (const [prefix, directory] of mounts) {
		if (pathname.startsWith(prefix)) {
			const file = path.join(directory, pathname.slice(prefix.length));
			if (!file.startsWith(directory)) {
				return undefined;
			}

			return pathname.endsWith("/") ? path.join(file, "index.html") : file;
		}
	}

	return undefined;
}

export type Server = { origin: string; close: () => Promise<void> };

export const fontStyle = `<style>${satoshiFontFace("/fonts")}</style>`;

export async function startServer(): Promise<Server> {
	assertFonts();
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

const fontShim = `<script>
(() => {
	const dom = window.ReactDOM;
	const createRoot = dom.createRoot;
	dom.createRoot = (container, options) => {
		const root = createRoot(container, options);
		const render = root.render.bind(root);
		root.render = (tree) => {
			const go = () => render(tree);
			document.fonts.load('400 16px "Satoshi"').then(go, go);
		};
		return root;
	};
})();
</script>`;

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

export function writePage(
	preview: Preview,
	runtime: Runtime,
	options: PageOptions = {},
): string {
	const isScripted = options.noScript !== true;
	const head = [
		fontStyle,
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
		...(isScripted ? [fontShim] : []),
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

export function assertPreviewShape(preview: Preview): void {
	previewScript(preview.file);
	if (
		!fs.readFileSync(preview.file, "utf8").includes('<div id="root"></div>')
	) {
		throw new Error(`${preview.id} has no empty #root`);
	}
}
