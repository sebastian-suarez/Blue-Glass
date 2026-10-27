import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { Icon } from "../Icon/index.js";

export type LinkProps = Omit<
	React.AnchorHTMLAttributes<HTMLAnchorElement>,
	"color"
> & {
	underline?: "always" | "hover" | "none";
	color?: "link" | "ink" | "muted" | "inherit";
	external?: boolean;
	endIcon?: React.ReactNode;
	newTabLabel?: string;
	component?: React.ElementType;
	children?: React.ReactNode;
};

function externalRel(rel: string | undefined): string {
	const parts = (rel ?? "").split(/\s+/u).filter(Boolean);
	for (const token of ["noopener", "noreferrer"]) {
		if (!parts.includes(token)) {
			parts.push(token);
		}
	}

	return parts.join(" ");
}

export function Link({
	underline = "always",
	color,
	external,
	endIcon,
	newTabLabel = "(opens in a new tab)",
	component: Component = "a",
	className,
	children,
	target,
	rel,
	type,
	ref,
	...rest
}: LinkProps & { ref?: React.Ref<HTMLAnchorElement> }) {
	const isNewTab = target === "_blank";
	const isExternal = external ?? isNewTab;
	const tone = color ?? (underline === "always" ? "link" : "ink");
	const isButton = Component === "button";
	const icon = endIcon ?? (isExternal ? <Icon name="arrow-ne" /> : null);
	const hasIcon = Boolean(icon);
	return (
		<Component
			ref={ref}
			className={cx(
				"gl-link",
				isButton && "gl-link-button",
				`gl-link-underline-${underline}`,
				`gl-link-color-${tone}`,
				className,
			)}
			target={isExternal ? (target ?? "_blank") : target}
			rel={isExternal ? externalRel(rel) : rel}
			type={isButton ? (type ?? "button") : type}
			{...rest}
		>
			{children}
			{hasIcon ? (
				<span className="gl-link-icon" aria-hidden="true">
					{"\u{2060}"}
					{icon}
				</span>
			) : null}
			{isExternal ? <span className="gl-sr-only"> {newTabLabel}</span> : null}
		</Component>
	);
}
