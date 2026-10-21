/**
The server-HTML gate's rules, apart from the browser work so they can be tested on their own.

Text the client render shows that the server HTML doesn't comes in two kinds:

- hidden: in the server HTML but not visible, such as a transition that starts invisible. That's
  a visibility defect, and it always fails the package: it should render visibly, or not at all.
- absent: not in the server HTML at all, such as a popup open on load that renders through a
  portal, or content measured on the client. The package may leave out what the reference
  didn't show before JavaScript either, absent or hidden (tests/ssr/reference-baseline.json),
  but nothing the reference showed.

The package also fails on any error in its pages and on any hydration error. An exception in
tests/ssr/exceptions.json excuses a preview's named texts, or all of them, with its reason.
*/
import type { Preview } from "./reference.ts";

export type Runtime = "reference" | "package";

export type Observation = {
	/**
	Texts the client render shows inside #root that the server HTML holds but hides.
	*/
	hidden: string[];

	/**
	Texts the client render shows inside #root that the server HTML doesn't hold at all.
	*/
	absent: string[];

	/**
	Recoverable hydration errors.
	*/
	hydrationErrors: string[];

	/**
	Page and console errors on the client-rendered and hydrated pages.
	*/
	pageErrors: string[];

	/**
	Texts that move by more than 2px when the page hydrates.
	*/
	shifted: number;
	serverError?: string;
};

export type Baseline = Record<
	string,
	{ hidden: string[]; absent: string[]; hydrationErrors: number }
>;

export type Exception = {
	reason: string;

	/**
	The texts excused. Without it, every text of the preview is.
	*/
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

	const reference = baseline[preview.id];
	const notShownByReference = new Set<string>([
		...(reference?.absent ?? []),
		...(reference?.hidden ?? []),
	]);
	const missing =
		runtime === "reference"
			? observation.absent
			: observation.absent.filter((text) => !notShownByReference.has(text));
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
