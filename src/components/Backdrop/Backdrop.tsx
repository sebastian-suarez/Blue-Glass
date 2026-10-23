import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { Fade } from "../Transitions/Transitions.js";

export type BackdropProps = React.HTMLAttributes<HTMLDivElement> & {
	open: boolean;
	invisible?: boolean;
	transitionDuration?: number | { enter?: number; exit?: number };
	keepMounted?: boolean;
	children?: React.ReactNode;
};

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
