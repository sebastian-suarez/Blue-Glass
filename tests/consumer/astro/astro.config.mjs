// @ts-check
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// The portfolio's setup (github.com/sebastian-suarez/portfolio, astro.config.mjs), so the
// package is checked in the same pipeline it ships to.
export default defineConfig({
	output: "static",
	integrations: [react()],
	vite: {
		plugins: [tailwindcss()],
		build: {
			// The portfolio doesn't minify CSS (Lightning CSS drops its scroll-driven rules),
			// so the cascade checked here is the one it serves.
			cssMinify: false,
		},
	},
});
