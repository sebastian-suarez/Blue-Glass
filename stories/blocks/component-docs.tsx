import { lazy, Suspense } from "react";

/**
The docs page of a component: its reference README, its stories (one per preview section), then
the props table generated from its types. Pass the README as a string imported with `?raw`:

	import readme from "../../../design-system/components/Button/README.md?raw";
	parameters: { docs: { page: componentDocs(readme) } },

A meta without a `component` gets no props table, so the page also suits plain markup stories.

The docs blocks load only once a docs page renders: Storybook's UI components read `document` as
they load, and the story layout gate (scripts/ssr/layout.ts) imports stories files in Node.
*/
export function componentDocs(readme: string) {
	const Page = lazy(async () => {
		const { ArgTypes, Heading, Markdown, Stories, useOf } =
			await import("@storybook/addon-docs/blocks");

		function ComponentDocs() {
			const { preparedMeta } = useOf("meta", ["meta"]);
			return (
				<>
					<Markdown>{readme}</Markdown>
					<Stories title="Preview" />
					{preparedMeta.component === undefined ? null : (
						<>
							<Heading>API</Heading>
							<ArgTypes />
						</>
					)}
				</>
			);
		}

		return { default: ComponentDocs };
	});

	function ComponentDocsPage() {
		return (
			<Suspense fallback={null}>
				<Page />
			</Suspense>
		);
	}

	return ComponentDocsPage;
}
