import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type LightFieldProps = React.HTMLAttributes<HTMLDivElement> & {
	variant?: "top" | "middle" | "bottom" | "compact";
};

export function LightField({
	variant = "top",
	className,
	ref,
	...rest
}: LightFieldProps & { ref?: React.Ref<HTMLDivElement> }) {
	return (
		<div
			ref={ref}
			className={cx("gl-light-field", `gl-light-field-${variant}`, className)}
			aria-hidden="true"
			{...rest}
		>
			<span className="gl-light-ring gl-ring-one" />
			<span className="gl-light-ring gl-ring-two" />
			<span className="gl-light-fold" />
		</div>
	);
}
