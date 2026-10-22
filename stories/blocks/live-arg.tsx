import { type ReactElement, useState } from "react";

/**
Keeps a Default's stateful arg (Tabs' value, Accordion's expanded, and in phase 2 an overlay's
open) in step both ways. A change from the component sets it here and calls `onChange`, which
the story points at `updateArgs`, so the Controls panel follows; a change from the panel arrives
as a new `value` and replaces it here. Docs pages render their stories with fixed args and drop
updateArgs, so this copy is what keeps the story working there.

The state lives in this component, not in the story's render: Storybook's hooks (useArgs) and
React's can't share one render function.

	const [, updateArgs] = useArgs<TabsProps>();
	<LiveArg value={args.value} onChange={(value) => { updateArgs({ value }); }}>
		{(value, setValue) => <Tabs {...args} value={value} onChange={(event, next) => { setValue(next); }} />}
	</LiveArg>
*/
export function LiveArg<Value>({
	value,
	onChange,
	children,
}: {
	readonly value: Value;
	readonly onChange: (next: Value) => void;
	readonly children: (
		value: Value,
		setValue: (next: Value) => void,
	) => ReactElement;
}): ReactElement {
	const [state, setState] = useState({ arg: value, value });
	let current = state.value;
	// The panel changed the arg: take its value, as React's "adjust state on a prop change" does.
	if (!Object.is(state.arg, value)) {
		current = value;
		setState({ arg: value, value });
	}

	return children(current, (next) => {
		setState((previous) => ({ ...previous, value: next }));
		onChange(next);
	});
}
