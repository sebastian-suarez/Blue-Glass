import * as React from "react";
import { cx } from "../../internal/cx.js";

export type ButtonGroupProps = React.HTMLAttributes<HTMLDivElement> & {
	variant?: "glass" | "primary" | "text";
	size?: "sm" | "md" | "lg";
	orientation?: "horizontal" | "vertical";
	fullWidth?: boolean;
	disabled?: boolean;
	children?: React.ReactNode;
};

type ChildProps = Pick<ButtonGroupProps, "variant" | "size" | "disabled">;

export function ButtonGroup({
	variant = "glass",
	size = "md",
	orientation = "horizontal",
	fullWidth = false,
	disabled = false,
	className,
	children,
	ref,
	...rest
}: ButtonGroupProps & { ref?: React.Ref<HTMLDivElement> }) {
	// eslint-disable-next-line @eslint-react/no-children-map -- The documented group sets these on every child Button.
	const items = React.Children.map(children, (child): React.ReactNode => {
		if (
			!React.isValidElement<ChildProps>(child) ||
			typeof child.type === "string"
		) {
			return child;
		}

		// eslint-disable-next-line @eslint-react/no-clone-element -- As above.
		return React.cloneElement(child, {
			variant,
			size,
			disabled: disabled || child.props.disabled,
		});
	});
	return (
		<div
			ref={ref}
			role="group"
			className={cx(
				"gl-button-group",
				`gl-button-group-${variant}`,
				`gl-button-group-${size}`,
				orientation === "vertical" && "gl-button-group-vertical",
				fullWidth && "gl-button-group-full",
				disabled && "gl-button-group-disabled",
				className,
			)}
			{...rest}
		>
			{items}
		</div>
	);
}
