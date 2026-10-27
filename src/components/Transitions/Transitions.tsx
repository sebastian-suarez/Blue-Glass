"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useForkRef, useShouldReduceMotion } from "../../internal/hooks.js";
import {
	collapseStyle,
	type Durations,
	durations,
	fadeStyle,
	getTimeout,
	growStyle,
	type MotionContext,
	type SlideDirection,
	slideStyle,
	type TransitionOptions,
	type TransitionStatus,
	useTransition,
	zoomStyle,
} from "../../internal/transition.js";

export {
	type SlideDirection,
	type Timeout,
	type TransitionStatus,
	useTransition,
} from "../../internal/transition.js";

export type TransitionProps = TransitionOptions & {
	children:
		| React.ReactElement
		| ((
				status: TransitionStatus,
				ref: React.Ref<HTMLElement>,
		  ) => React.ReactNode);
};

export type FadeProps = TransitionProps & {
	easing?: string;
};

export type GrowProps = TransitionProps & {
	origin?: string;
};

export type ZoomProps = TransitionProps;

export type SlideProps = TransitionProps & {
	direction?: SlideDirection;
};

export type CollapseProps = TransitionOptions & {
	collapsedSize?: string;
	className?: string;
	style?: React.CSSProperties;
	children?: React.ReactNode;
};

type ChildRef = { readonly ref?: React.Ref<HTMLElement> };

type ChildProps = {
	readonly ref?: React.Ref<HTMLElement>;
	readonly style?: React.CSSProperties;
	readonly "data-transition"?: TransitionStatus;
};

type StyleOf = (
	status: TransitionStatus,
	motion: MotionContext,
) => React.CSSProperties;

function useTransitionChild(
	{ ref, ...props }: TransitionProps & ChildRef,
	defaults: Durations,
	styleOf?: StyleOf,
): React.ReactNode {
	const { children, timeout } = props;
	const nodeRef = React.useRef<HTMLElement | null>(null);
	const status = useTransition(props, nodeRef, defaults);
	const shouldReduceMotion = useShouldReduceMotion();
	const childRef = React.isValidElement<ChildProps>(children)
		? children.props.ref
		: undefined;
	const handleRef = useForkRef(nodeRef, childRef, ref);
	if (status === "unmounted") {
		return null;
	}

	if (typeof children === "function") {
		return children(status, handleRef ?? null);
	}

	// eslint-disable-next-line @eslint-react/no-children-only
	const child = React.Children.only(children) as React.ReactElement<ChildProps>;
	const motion: MotionContext = {
		enter: getTimeout(timeout, "enter", defaults.enter),
		exit: getTimeout(timeout, "exit", defaults.exit),
		reduced: shouldReduceMotion,
	};
	// eslint-disable-next-line @eslint-react/no-clone-element
	return React.cloneElement(child, {
		ref: handleRef,
		"data-transition": status,
		style: { ...child.props.style, ...styleOf?.(status, motion) },
	});
}

export function Transition(props: TransitionProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.fade);
}

export function Fade({
	easing,
	...props
}: FadeProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.fade, (status, motion) =>
		fadeStyle(status, motion, easing),
	);
}

export function Grow({
	origin,
	...props
}: GrowProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.grow, (status, motion) =>
		growStyle(status, motion, origin),
	);
}

export function Zoom(props: ZoomProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.zoom, zoomStyle);
}

export function Slide({
	direction = "up",
	...props
}: SlideProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.slide, (status, motion) =>
		slideStyle(status, motion, direction),
	);
}

export function Collapse({
	children,
	className,
	collapsedSize = "0px",
	style,
	ref,
	...options
}: CollapseProps & { readonly ref?: React.Ref<HTMLDivElement> }) {
	const nodeRef = React.useRef<HTMLDivElement | null>(null);
	const status = useTransition(
		{ ...options, appear: options.appear ?? false },
		nodeRef,
		durations.collapse,
	);
	const shouldReduceMotion = useShouldReduceMotion();
	const handleRef = useForkRef(nodeRef, ref);
	if (status === "unmounted") {
		return null;
	}

	const { root, inner, hidden } = collapseStyle(
		status,
		{
			enter: getTimeout(options.timeout, "enter", durations.collapse.enter),
			exit: getTimeout(options.timeout, "exit", durations.collapse.exit),
			reduced: shouldReduceMotion,
		},
		{ in: options.in, collapsedSize },
	);
	return (
		<div
			ref={handleRef}
			className={cx("gl-collapse", className)}
			data-transition={status}
			aria-hidden={hidden || undefined}
			style={{ ...root, ...style }}
		>
			<div style={inner}>{children}</div>
		</div>
	);
}

Transition.__glTransition = true;
Fade.__glTransition = true;
Grow.__glTransition = true;
Zoom.__glTransition = true;
Slide.__glTransition = true;
Collapse.__glTransition = true;
