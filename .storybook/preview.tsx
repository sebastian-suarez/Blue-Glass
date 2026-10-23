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
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		a11y: { test: "error" },
		controls: { disable: true },
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
