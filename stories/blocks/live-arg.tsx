import { type ReactElement, useState } from "react";

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
