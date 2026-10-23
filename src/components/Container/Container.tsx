import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type ContainerProps = React.HTMLAttributes<HTMLElement> & {
	maxWidth?: "wrap" | "header" | "prose" | false;
	disableGutters?: boolean;
	component?: React.ElementType;
	children?: React.ReactNode;
};

export function Container({
	ref,
	maxWidth = "wrap",
	disableGutters = false,
	component: Component = "div",
	className,
	children,
	...rest
}: ContainerProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	return (
		<Component
			ref={ref}
			className={cx(
				"gl-container",
				maxWidth === false
					? "gl-container-uncapped"
					: maxWidth !== "wrap" && `gl-container-${maxWidth}`,
				disableGutters && "gl-container-flush",
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	);
}
