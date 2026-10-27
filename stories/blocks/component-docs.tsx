import { lazy, Suspense } from "react";

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
