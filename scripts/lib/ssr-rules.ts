import type { Preview } from "./reference.ts";

export type Runtime = "reference" | "package";

export type Observation = {
	hidden: string[];

	absent: string[];

	hydrationErrors: string[];

	pageErrors: string[];

	shifted: number;
	serverError?: string;
};

export type Baseline = Record<
	string,
	{ hidden: string[]; absent: string[]; hydrationErrors: number }
>;

export type Exception = {
	reason: string;

	texts?: string[];
};

export type Result = Observation & {
	id: string;
	passed: boolean;
	problems: string[];
	notes: string[];
};

export type Rules = {
	runtime: Runtime;
	baseline: Baseline;
	exceptions: Record<string, Exception>;
};

const sample = (texts: string[]) => `"${texts.slice(0, 3).join('", "')}"`;

function countOf(texts: readonly string[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const text of texts) {
		counts.set(text, (counts.get(text) ?? 0) + 1);
	}

	return counts;
}

export function missingTexts(
	shown: readonly string[],
	shownWithoutScript: readonly string[],
	inServerHtml: readonly string[],
): { hidden: string[]; absent: string[] } {
	const visible = countOf(shownWithoutScript);
	const present = countOf(inServerHtml);
	const hidden: string[] = [];
	const absent: string[] = [];
	for (const [text, count] of countOf(shown)) {
		const seen = visible.get(text) ?? 0;
		const hiddenCopies = Math.max(0, (present.get(text) ?? 0) - seen);
		for (let copy = 0; copy < count - seen; copy++) {
			(copy < hiddenCopies ? hidden : absent).push(text);
		}
	}

	return { hidden, absent };
}

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

	for (const error of observation.pageErrors) {
		problems.push(`page: ${error}`);
	}

	const exception = exceptions[preview.id];
	const isExcused = (text: string) =>
		exception !== undefined &&
		(exception.texts === undefined || exception.texts.includes(text));
	const excused = (texts: string[], what: string) => {
		const allowed = texts.filter((text) => isExcused(text));
		if (allowed.length > 0) {
			notes.push(
				`${allowed.length} text(s) ${what}, allowed: ${exception?.reason ?? ""}`,
			);
		}

		return texts.filter((text) => !isExcused(text));
	};

	const hidden = excused(observation.hidden, "hidden until JavaScript");
	if (hidden.length > 0) {
		problems.push(
			`${hidden.length} text(s) in the server HTML but hidden until JavaScript, e.g. ${sample(hidden)}`,
		);
	}

	const allowance = countOf(baseline[preview.id]?.absent ?? []);
	const missing =
		runtime === "reference"
			? observation.absent
			: observation.absent.filter((text) => {
					const left = allowance.get(text) ?? 0;
					allowance.set(text, left - 1);
					return left <= 0;
				});
	const inherited = observation.absent.length - missing.length;
	const newlyMissing = excused(missing, "missing from the server HTML");
	if (newlyMissing.length > 0) {
		problems.push(
			`${newlyMissing.length} text(s) missing from the server HTML${runtime === "package" ? " that the reference showed" : ""}, e.g. ${sample(newlyMissing)}`,
		);
	}

	if (inherited > 0) {
		notes.push(
			`${inherited} text(s) missing from the server HTML, which the reference didn't show before JavaScript either`,
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
