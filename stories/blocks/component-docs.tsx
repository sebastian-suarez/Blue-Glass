import {
	ArgTypes,
	Heading,
	Markdown,
	Stories,
	useOf,
} from "@storybook/addon-docs/blocks";

/**
The docs page of a component: its reference README, its stories (one per preview section), then
the props table generated from its types. Pass the README as a string imported with `?raw`:

	import readme from "../../../design-system/components/Button/README.md?raw";
	parameters: { docs: { page: componentDocs(readme) } },

A meta without a `component` gets no props table, so the page also suits plain markup stories.
*/
export function componentDocs(readme: string) {
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

	return ComponentDocs;
}
