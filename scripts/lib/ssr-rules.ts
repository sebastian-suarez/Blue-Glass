/**
The server-HTML gate's rules, apart from the browser work so they can be tested on their own.
The package fails on any hydration error, and on any text it shows only after JavaScript that
the reference shows before, unless an exception allows it with a reason.
*/
import type { Preview } from "./reference.ts";

export type Runtime = "reference" | "package";

export type Observation = {
	/**
	Texts the client render shows inside #root that the server HTML doesn't.
	*/
	clientOnly: string[];
	hydrationErrors: string[];

	/**
	Texts that move by more than 2px when the page hydrates.
	*/
	shifted: number;
	serverError?: string;
};

export type Baseline = Record<
	string,
	{ clientOnly: string[]; hydrationErrors: number }
>;

export type Result = Observation & {
	id: string;
	passed: boolean;
	problems: string[];
	notes: string[];
};

export type Rules = {
	runtime: Runtime;
	baseline: Baseline;
	exceptions: Record<string, { reason: string }>;
};

export function judge(
	preview: Preview,
	observation: Observation,
	{ runtime, baseline, exceptions }: Rules,
): Result {
	const problems: string[] = [];
	const notes: string[] = [];
	if (observation.serverError !== undefined) {
		problems.push(`server render: ${observation.serverError}`);
	}

	for (const error of observation.hydrationErrors) {
		problems.push(`hydration: ${error}`);
	}

	const exception = exceptions[preview.id];
	const asInReference = new Set<string>(baseline[preview.id]?.clientOnly);
	const regressions =
		runtime === "reference"
			? observation.clientOnly
			: observation.clientOnly.filter((text) => !asInReference.has(text));
	const inherited = observation.clientOnly.length - regressions.length;
	if (regressions.length > 0) {
		const summary = `${regressions.length} text(s) visible only after JavaScript, e.g. "${regressions.slice(0, 3).join('", "')}"`;
		if (exception === undefined) {
			problems.push(summary);
		} else {
			notes.push(`${summary} (allowed: ${exception.reason})`);
		}
	}

	if (inherited > 0) {
		notes.push(
			`${inherited} text(s) visible only after JavaScript, as in the reference`,
		);
	}

	if (observation.shifted > 0) {
		notes.push(
			`${observation.shifted} text(s) move by more than 2px when the page hydrates`,
		);
	}

	return {
		...observation,
		id: preview.id,
		passed: problems.length === 0,
		problems,
		notes,
	};
}
