// Fixtures for the story layout gate's self-test (scripts/ssr/layout.ts --self): the same two
// columns, laid out in JavaScript and in CSS. Storybook doesn't load this folder.
import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

const meta = {
	title: "Fixtures/Layout",
	parameters: { frame: false },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const wideQuery = "(min-width: 700px)";

function subscribe(callback: () => void): () => void {
	const query = window.matchMedia(wideQuery);
	query.addEventListener("change", callback);
	return () => {
		query.removeEventListener("change", callback);
	};
}

/**
The pattern the gate exists to catch: the server can't know the width, so it guesses wide, and
a phone shows the wrong layout until hydration.
*/
function useIsWide(): boolean {
	return React.useSyncExternalStore(
		subscribe,
		() => window.matchMedia(wideQuery).matches,
		() => true,
	);
}

function JsColumns() {
	const isWide = useIsWide();
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: isWide ? "1fr 1fr" : "1fr",
				gap: 16,
				padding: 16,
			}}
		>
			<p>Left column</p>
			<p>Right column</p>
		</div>
	);
}

export const JsLayout: Story = {
	render: () => <JsColumns />,
};

export const CssLayout: Story = {
	render: () => (
		<>
			<style>
				{
					".layout-fixture{display:grid;grid-template-columns:1fr;gap:16px;padding:16px}@media (min-width:700px){.layout-fixture{grid-template-columns:1fr 1fr}}"
				}
			</style>
			<div className="layout-fixture">
				<p>Left column</p>
				<p>Right column</p>
			</div>
		</>
	),
};
