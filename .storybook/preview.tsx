import type { Preview } from "@storybook/react-vite";
import "../src/styles/index.css";
import { viewports } from "../scripts/lib/viewports.ts";
import { withFrame } from "./frame.tsx";

const size = ({ width, height }: { width: number; height: number }) => ({
	width: `${width}px`,
	height: `${height}px`,
});

const preview: Preview = {
	decorators: [withFrame],
	// Every stories file gets a docs page; a component's renders componentDocs(readme).
	tags: ["autodocs"],
	parameters: {
		// The frame is the whole canvas, as in the reference previews.
		layout: "fullscreen",
		// A violation fails the story's test (npx vitest run --project storybook).
		a11y: { test: "error" },
		// Off unless a story turns them on: a component's Default lists the args it renders
		// through, and tests/unit/stories.test.ts checks that each one acts.
		controls: { disable: true },
		// The gates' phone and desktop sizes, with a tablet between. A story pinned to phone
		// (globals.viewport) runs its test at that size too.
		viewport: {
			options: {
				phone: { name: "Phone", styles: size(viewports.phone), type: "mobile" },
				tablet: {
					name: "Tablet",
					styles: size({ width: 834, height: 1112 }),
					type: "tablet",
				},
				desktop: {
					name: "Desktop",
					styles: size(viewports.desktop),
					type: "desktop",
				},
			},
		},
		options: {
			storySort: {
				order: ["Introduction", "Foundations", ["Brand book", "Tokens"]],
			},
		},
	},
};

export default preview;
