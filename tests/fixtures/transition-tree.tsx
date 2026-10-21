/**
Test components on src/internal/transition.ts, shared by its Node and Chromium tests so both
render the same tree: what Fade, Grow, Zoom, Slide and Collapse do, minus ref forwarding.
*/
import * as React from "react";
import { useShouldReduceMotion } from "../../src/internal/hooks.ts";
import {
	collapseStyle,
	type Durations,
	durations,
	fadeStyle,
	getTimeout,
	growStyle,
	type MotionContext,
	slideStyle,
	type TransitionOptions,
	type TransitionStatus,
	useTransition,
	zoomStyle,
} from "../../src/internal/transition.ts";

export type Kind = "fade" | "grow" | "zoom" | "slide";

const styleOf = {
	fade: fadeStyle,
	grow: growStyle,
	zoom: zoomStyle,
	slide: slideStyle,
} satisfies Record<
	Kind,
	(status: TransitionStatus, context: MotionContext) => React.CSSProperties
>;

function useMotion(options: TransitionOptions, defaults: Durations) {
	return {
		enter: getTimeout(options.timeout, "enter", defaults.enter),
		exit: getTimeout(options.timeout, "exit", defaults.exit),
		reduced: useShouldReduceMotion(),
	};
}

export function Box({
	kind,
	label,
	...options
}: TransitionOptions & { kind: Kind; label: string }) {
	const ref = React.useRef<HTMLDivElement>(null);
	const status = useTransition(options, ref, durations[kind]);
	const motion = useMotion(options, durations[kind]);
	if (status === "unmounted") {
		return null;
	}

	return (
		<div
			ref={ref}
			id={label}
			data-transition={status}
			style={styleOf[kind](status, motion)}
		>
			{label}
		</div>
	);
}

export function Panel(options: TransitionOptions) {
	const ref = React.useRef<HTMLDivElement>(null);
	// Collapse defaults appear to false.
	const status = useTransition(
		{ appear: false, ...options },
		ref,
		durations.collapse,
	);
	const motion = useMotion(options, durations.collapse);
	if (status === "unmounted") {
		return null;
	}

	const { root, inner, hidden } = collapseStyle(status, motion, {
		in: options.in,
	});
	return (
		<div
			ref={ref}
			id="panel"
			data-transition={status}
			aria-hidden={hidden || undefined}
			style={root}
		>
			<div style={inner}>Panel</div>
		</div>
	);
}

/**
Content that is `in` when the page renders, with appear left at its default (Collapse's
forced on), each with the callbacks a test may watch.
*/
export function ServerTree(callbacks: Partial<TransitionOptions>) {
	return (
		<>
			<Box in kind="fade" label="fade" {...callbacks} />
			<Box in kind="grow" label="grow" {...callbacks} />
			<Box in kind="zoom" label="zoom" {...callbacks} />
			<Box in kind="slide" label="slide" {...callbacks} />
			<Panel appear in {...callbacks} />
		</>
	);
}
