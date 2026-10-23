import type * as React from "react";
import { cx } from "../../internal/cx.js";
import { space } from "../../internal/layout.js";

export type SpaceToken =
	| "3xs"
	| "2xs"
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl"
	| "section-sm"
	| "section";

export type SpaceValue = SpaceToken | 0;

export type BoxProps = React.HTMLAttributes<HTMLElement> & {
	component?: React.ElementType;
	p?: SpaceValue;
	pt?: SpaceValue;
	pr?: SpaceValue;
	pb?: SpaceValue;
	pl?: SpaceValue;
	px?: SpaceValue;
	py?: SpaceValue;
	m?: SpaceValue | "auto";
	mt?: SpaceValue | "auto";
	mr?: SpaceValue | "auto";
	mb?: SpaceValue | "auto";
	ml?: SpaceValue | "auto";
	mx?: SpaceValue | "auto";
	my?: SpaceValue | "auto";
	gap?: SpaceValue;
	rowGap?: SpaceValue;
	columnGap?: SpaceValue;
	display?:
		| "block"
		| "inline"
		| "inline-block"
		| "flex"
		| "inline-flex"
		| "grid"
		| "inline-grid"
		| "contents"
		| "none";
	children?: React.ReactNode;
};

export function Box({
	ref,
	component: Component = "div",
	p,
	pt,
	pr,
	pb,
	pl,
	px,
	py,
	m,
	mt,
	mr,
	mb,
	ml,
	mx,
	my,
	gap,
	rowGap,
	columnGap,
	display,
	className,
	style,
	children,
	...rest
}: BoxProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	const shorthands: React.CSSProperties = {
		paddingTop: space(pt ?? py ?? p),
		paddingRight: space(pr ?? px ?? p),
		paddingBottom: space(pb ?? py ?? p),
		paddingLeft: space(pl ?? px ?? p),
		marginTop: space(mt ?? my ?? m),
		marginRight: space(mr ?? mx ?? m),
		marginBottom: space(mb ?? my ?? m),
		marginLeft: space(ml ?? mx ?? m),
		rowGap: space(rowGap ?? gap),
		columnGap: space(columnGap ?? gap),
		display,
	};
	return (
		<Component
			ref={ref}
			className={cx("gl-box", className)}
			style={{ ...shorthands, ...style }}
			{...rest}
		>
			{children}
		</Component>
	);
}
