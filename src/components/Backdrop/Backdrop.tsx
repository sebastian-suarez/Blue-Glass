/**
Backdrop, ported from design-system/components/Backdrop/reference.tsx: the scrim behind a modal
task, and a loading cover over a region. It's a Fade around one element with the gl-backdrop
classes, which foundation.css styles (Overlay layers): the scrim token with a 6px blur that drops
under reduced transparency, or nothing at all with `invisible`. Modal renders it behind its
content (src/internal/modal.tsx).

The Fade is the transition adapter's: a backdrop open when the page renders on the server shows
in its server HTML, and hydrating it animates nothing (docs/deviations.md, entry 9). It runs no
hooks itself, so it needs no client directive.
*/
import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { Fade } from "../Transitions/Transitions.js";

export type BackdropProps = React.HTMLAttributes<HTMLDivElement> & {
	/**
	Show the backdrop.
	*/
	open: boolean;
	/**
	Transparent: still catches clicks (popovers, menus).
	*/
	invisible?: boolean;
	/**
	Fade duration in ms.
	*/
	transitionDuration?: number | { enter?: number; exit?: number };
	/**
	Keep in the DOM while closed.
	*/
	keepMounted?: boolean;
	children?: React.ReactNode;
};

/**
The scrim behind a modal task: dims and frosts the page so the dialog reads first. Also a loading cover.
*/
export function Backdrop({
	open,
	invisible = false,
	transitionDuration,
	keepMounted = false,
	className,
	children,
	ref,
	...rest
}: BackdropProps & { ref?: React.Ref<HTMLDivElement> }) {
	return (
		<Fade
			appear
			in={open}
			timeout={transitionDuration}
			unmountOnExit={!keepMounted}
		>
			<div
				ref={ref}
				aria-hidden="true"
				className={cx(
					"gl-backdrop",
					invisible && "gl-backdrop-invisible",
					className,
				)}
				{...rest}
			>
				{children}
			</div>
		</Fade>
	);
}
