"use client";
/**
Fade, Grow, Zoom, Slide and Collapse, and the Transition they share, ported from
design-system/components/Transitions/reference.tsx. The status machine and each one's motion are
the transition adapter's (src/internal/transition.ts), which the overlays use too.

As in the reference, Transition, Fade, Grow, Zoom and Slide take one child that can hold a ref,
or a render function of the status and the ref for its element. The child keeps its own ref and
gets the status as data-transition, with the motion's style on top of its own. Collapse renders
its own element. Each carries the reference's `__glTransition` mark, so a Modal drives its `in`
and waits for its exit.

The change is the adapter's: content that is `in` when the page renders on the server, or
hydrates, starts entered, so its server HTML is visible and hydrating it animates nothing.
`appear` applies to client-side mounts (docs/deviations.md).
*/
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

/**
The props every transition takes, and its one child.
*/
export type TransitionProps = TransitionOptions & {
	/**
	One element that can hold a ref, or a render function of the status.
	*/
	children:
		| React.ReactElement
		| ((
				status: TransitionStatus,
				ref: React.Ref<HTMLElement>,
		  ) => React.ReactNode);
};

export type FadeProps = TransitionProps & {
	/**
	The fade's timing function. Default ease-out-quint in and ease out.
	*/
	easing?: string;
};

export type GrowProps = TransitionProps & {
	/**
	The transform-origin. Default the anchored popup's, --gl-transform-origin.
	*/
	origin?: string;
};

export type ZoomProps = TransitionProps;

export type SlideProps = TransitionProps & {
	/**
	The direction the child moves in when entering. Default "up".
	*/
	direction?: SlideDirection;
};

export type CollapseProps = TransitionOptions & {
	/**
	Height kept visible when collapsed, e.g. "48px". Default 0.
	*/
	collapsedSize?: string;
	className?: string;
	style?: React.CSSProperties;
	children?: React.ReactNode;
};

/**
The ref of Transition, Fade, Grow, Zoom and Slide: the child's element.
*/
type ChildRef = { readonly ref?: React.Ref<HTMLElement> };

/**
What a transition reads from its child and sets on it.
*/
type ChildProps = {
	readonly ref?: React.Ref<HTMLElement>;
	readonly style?: React.CSSProperties;
	readonly "data-transition"?: TransitionStatus;
};

type StyleOf = (
	status: TransitionStatus,
	motion: MotionContext,
) => React.CSSProperties;

/**
The status machine on the child, with the motion's style for each status (none for Transition).
*/
function useTransitionChild(
	{ ref, ...props }: TransitionProps & ChildRef,
	defaults: Durations,
	styleOf?: StyleOf,
): React.ReactNode {
	const { children, timeout } = props;
	const nodeRef = React.useRef<HTMLElement | null>(null);
	const status = useTransition(props, nodeRef, defaults);
	const shouldReduceMotion = useShouldReduceMotion();
	// React 19 keeps an element's ref in its props.
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

	// The reference's contract: exactly one element, which the transition styles in place.
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

/**
Base transition: no styles of its own; use the render function for custom states.
*/
export function Transition(props: TransitionProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.fade);
}

/**
Opacity only. The reduced-motion fallback for every other transition.
*/
export function Fade({
	easing,
	...props
}: FadeProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.fade, (status, motion) =>
		fadeStyle(status, motion, easing),
	);
}

/**
Scale from 0.96 plus opacity, from the trigger's side (origin-aware). For menus, popovers,
tooltips.
*/
export function Grow({
	origin,
	...props
}: GrowProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.grow, (status, motion) =>
		growStyle(status, motion, origin),
	);
}

/**
Scale from 0.85 plus opacity, centred. For floating action buttons.
*/
export function Zoom(props: ZoomProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.zoom, zoomStyle);
}

/**
Enter and leave along the same path. For drawers and snackbars.
*/
export function Slide({
	direction = "up",
	...props
}: SlideProps & ChildRef): React.ReactNode {
	return useTransitionChild(props, durations.slide, (status, motion) =>
		slideStyle(status, motion, direction),
	);
}

/**
Height reveal with the site's grid-rows technique (.pane .more): rows go from 0fr to 1fr, so no
measuring. Instant under reduced motion. `appear` defaults to false.
*/
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

// The reference's mark: a Modal gives a child that carries it `in`, and waits for its onExited.
Transition.__glTransition = true;
Fade.__glTransition = true;
Grow.__glTransition = true;
Zoom.__glTransition = true;
Slide.__glTransition = true;
Collapse.__glTransition = true;
