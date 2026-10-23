export function cx(
	...parts: Array<string | false | 0 | null | undefined>
): string {
	let out = "";
	for (const part of parts) {
		if (typeof part === "string" && part !== "") {
			out += out === "" ? part : ` ${part}`;
		}
	}

	return out;
}
