import type { Preview } from "@storybook/react-vite";
import "../src/styles/index.css";
import { withFrame } from "./frame.tsx";

const preview: Preview = {
	decorators: [withFrame],
	// Every stories file gets a docs page; a component's renders componentDocs(readme).
	tags: ["autodocs"],
	parameters: {
		// The frame is the whole canvas, as in the reference previews.
		layout: "fullscreen",
		// A violation fails the story's test (npx vitest run --project storybook).
		a11y: { test: "error" },
		options: {
			storySort: {
				order: ["Introduction", "Foundations", ["Brand book", "Tokens"]],
			},
		},
	},
};

export default preview;
