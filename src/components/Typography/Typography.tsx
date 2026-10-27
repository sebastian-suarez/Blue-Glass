import type * as React from "react";
import { cx } from "../../internal/cx.js";

export type TypographyVariant =
	| "display"
	| "title-xl"
	| "title-lg"
	| "title-md"
	| "statement"
	| "heading"
	| "card-title"
	| "title-sm"
	| "subtitle"
	| "lede"
	| "lede-sm"
	| "body-lg"
	| "body"
	| "body-sm"
	| "small"
	| "caption"
	| "micro"
	| "nano"
	| "button"
	| "kicker"
	| "label"
	| "name"
	| "code"
	| "diagram-node"
	| "diagram-label";

export type TypographyColor =
	| "inherit"
	| "ink"
	| "muted"
	| "ink-soft"
	| "accent"
	| "link"
	| "blue-deep"
	| "danger"
	| "warning"
	| "success"
	| "info";

const elements: Record<TypographyVariant, keyof React.JSX.IntrinsicElements> = {
	display: "h1",
	"title-xl": "h1",
	"title-lg": "h2",
	"title-md": "h2",
	statement: "p",
	heading: "h2",
	"card-title": "h3",
	"title-sm": "h3",
	subtitle: "h4",
	lede: "p",
	"lede-sm": "p",
	"body-lg": "p",
	body: "p",
	"body-sm": "p",
	small: "p",
	caption: "span",
	micro: "span",
	nano: "span",
	button: "span",
	kicker: "span",
	label: "span",
	name: "span",
	code: "code",
	"diagram-node": "span",
	"diagram-label": "span",
};

const fluidSizes: Partial<Record<TypographyVariant, string>> = {
	display: "clamp(44px, 5.6vw, 80px)",
	"title-xl": "clamp(40px, 5vw, 72px)",
	"title-lg": "clamp(34px, 4.4vw, 60px)",
	"title-md": "clamp(34px, 3.6vw, 50px)",
	statement: "clamp(26px, 3vw, 42px)",
};

const headings = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

export type TypographyProps = Omit<
	React.HTMLAttributes<HTMLElement>,
	"color"
> & {
	variant?: TypographyVariant;
	component?: React.ElementType;
	color?: TypographyColor;
	align?: "inherit" | "left" | "center" | "right" | "justify";
	noWrap?: boolean;
	gutterBottom?: boolean;
	textWrap?: "balance" | "pretty" | "wrap";
	fluid?: boolean;
	children?: React.ReactNode;
};

function defaultWrap(tag: string): TypographyProps["textWrap"] {
	if (headings.has(tag)) {
		return "balance";
	}

	return tag === "p" ? "pretty" : undefined;
}

export function Typography({
	variant = "body",
	component,
	color = "inherit",
	align = "inherit",
	noWrap = false,
	gutterBottom = false,
	textWrap,
	fluid = false,
	className,
	style,
	children,
	ref,
	...rest
}: TypographyProps & { ref?: React.Ref<HTMLElement> }) {
	const Component: React.ElementType =
		component ??
		(Object.hasOwn(elements, variant) ? elements[variant] : "span");
	const tag = typeof Component === "string" ? Component : "";
	const wrap = textWrap ?? defaultWrap(tag);
	const fluidSize = fluid ? fluidSizes[variant] : undefined;
	return (
		<Component
			ref={ref}
			className={cx(
				"gl-typography",
				`text-${variant}`,
				variant === "code" && "gl-typography-code",
				color !== "inherit" && `gl-typography-${color}`,
				align !== "inherit" && `gl-typography-align-${align}`,
				noWrap && "gl-typography-nowrap",
				gutterBottom && "gl-typography-gutter",
				wrap !== undefined && !noWrap && `gl-typography-${wrap}`,
				className,
			)}
			style={
				fluidSize === undefined ? style : { fontSize: fluidSize, ...style }
			}
			{...rest}
		>
			{children}
		</Component>
	);
}
