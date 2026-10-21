// Blue Glass — types as documentation. window.BlueGlass holds every export below.
import type * as React from 'react';

// utils/Transitions
export type TransitionStatus = 'unmounted' | 'exited' | 'entering' | 'entered' | 'exiting';
export type Timeout = number | {
    enter?: number;
    exit?: number;
};
export interface TransitionProps {
    /** Show (true) or hide (false) the child. */
    in?: boolean;
    /** Run the enter transition on first mount when `in` starts true. Default true. */
    appear?: boolean;
    /** Mount the child only on first enter. */
    mountOnEnter?: boolean;
    /** Unmount the child after it exits. */
    unmountOnExit?: boolean;
    /** Duration in ms, or {enter, exit}. */
    timeout?: Timeout;
    onEnter?: (node: HTMLElement) => void;
    onEntered?: (node: HTMLElement) => void;
    onExit?: (node: HTMLElement) => void;
    onExited?: (node: HTMLElement) => void;
    /** One element that can hold a ref, or a render function of the status. */
    children: React.ReactElement | ((status: TransitionStatus, ref: React.Ref<HTMLElement>) => React.ReactNode);
}
/** Status machine behind every transition: exited -> entering -> entered -> exiting -> exited. */
export declare function useTransition(props: Omit<TransitionProps, 'children'>, nodeRef: React.MutableRefObject<HTMLElement | null>, defaults: {
    enter: number;
    exit: number;
}): TransitionStatus;
/** Base transition: no styles of its own; use the render function for custom states. */
export declare const Transition: React.ForwardRefExoticComponent<TransitionProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface FadeProps extends TransitionProps {
    easing?: string;
}
/** Opacity only. The reduced-motion fallback for every other transition. */
export declare const Fade: React.ForwardRefExoticComponent<TransitionProps & {
    easing?: string;
} & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface GrowProps extends TransitionProps {
    origin?: string;
}
/** Scale from 0.96 plus opacity, from the trigger's side (origin-aware). For menus, popovers, tooltips. */
export declare const Grow: React.ForwardRefExoticComponent<TransitionProps & {
    origin?: string;
} & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface ZoomProps extends TransitionProps {
}
/** Scale from 0.85 plus opacity, centred. For floating action buttons. */
export declare const Zoom: React.ForwardRefExoticComponent<TransitionProps & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export type SlideDirection = 'up' | 'down' | 'left' | 'right';
export interface SlideProps extends TransitionProps {
    direction?: SlideDirection;
}
/** Enter and leave along the same path. For drawers and snackbars. */
export declare const Slide: React.ForwardRefExoticComponent<TransitionProps & {
    direction?: SlideDirection;
} & {
    ref?: React.Ref<HTMLElement> | undefined;
}>;
export interface CollapseProps extends Omit<TransitionProps, 'children'> {
    /** Height kept visible when collapsed, e.g. "48px". Default 0. */
    collapsedSize?: string;
    className?: string;
    style?: React.CSSProperties;
    children?: React.ReactNode;
}
/**
 * Height reveal with the site's grid-rows technique (.pane .more): rows go from
 * 0fr to 1fr, so no measuring. Instant under reduced motion.
 */
export declare const Collapse: React.ForwardRefExoticComponent<CollapseProps & {
    ref?: React.Ref<HTMLDivElement> | undefined;
}>;
