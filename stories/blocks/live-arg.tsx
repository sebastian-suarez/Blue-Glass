import { type ReactElement, useState } from "react";

/**
Feeds a Default's stateful arg (Tabs' value, Accordion's expanded, and in phase 2 an overlay's
open) to its component. On the canvas the args are the truth: the component gets the arg, and a
change goes to `onChange`, which the story points at `updateArgs`, so the panel and the story
can't disagree. On a docs page (`fixed`), Storybook renders the story with its initial args and
doesn't rerender it when they change, so LiveArg keeps the value itself and leaves the args
alone, and the canvas still opens on the preview's value.

The state lives in this component, not in the story's render: Storybook's hooks (useArgs) and
React's can't share one render function.

	function SiteSectionsWithArgs(args: TabsProps, { viewMode }: { readonly viewMode: string }) {
		const [, updateArgs] = useArgs<TabsProps>();
		return (
			<LiveArg value={args.value} fixed={viewMode === "docs"} onChange={(value) => { updateArgs({ value }); }}>
				{(value, setValue) => <Tabs {...args} value={value} onChange={(event, next) => { setValue(next); }} />}
			</LiveArg>
		);
	}
*/
export function LiveArg<Value>({
	value,
	fixed,
	onChange,
	children,
}: {
	readonly value: Value;
	readonly fixed: boolean;
	readonly onChange: (next: Value) => void;
	readonly children: (
		value: Value,
		setValue: (next: Value) => void,
	) => ReactElement;
}): ReactElement {
	const [local, setLocal] = useState(value);
	return fixed ? children(local, setLocal) : children(value, onChange);
}
