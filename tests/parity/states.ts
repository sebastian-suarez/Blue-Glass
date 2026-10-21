/**
Opened states the parity gate also compares: after the resting capture, each state's
actions run on both runtimes and the result is captured again. Overlays and inputs add
theirs in their phase (an open Select, a Menu with the second item highlighted, a Tooltip
on focus). Selectors are Playwright's.
*/
export type Action =
	| { click: string }
	| { hover: string }
	| { focus: string }
	| { press: string }
	| { wait: number };

export type State = { name: string; actions: Action[] };

export const states: Record<string, State[]> = {};

/**
A state the self-test uses to prove the mechanism on the reference alone.
*/
export const selfTestStates: Record<string, State[]> = {
	"components/Button": [
		{ name: "focused", actions: [{ focus: "#root button >> nth=0" }] },
	],
};
