import * as React from "react";
import { cx } from "../../internal/cx.js";
import {
	isResponsiveObject,
	responsiveClasses,
	space,
} from "../../internal/layout.js";
import type { SpaceValue } from "../Box/Box.js";
import type { ResponsiveValue } from "../Grid/Grid.js";

export type StackDirection =
	"row" | "column" | "row-reverse" | "column-reverse";

export type StackProps = React.HTMLAttributes<HTMLElement> & {
	/**
	Main axis, or one per breakpoint (xs, sm ≥361, md ≥701, lg ≥900, xl ≥1001). Default "column".
	*/
	direction?: ResponsiveValue<StackDirection>;
	/**
	Gap between children: a spacing token name ("xs" … "section") or 0. Default 0.
	*/
	spacing?: SpaceValue;
	/**
	Alias of spacing, the CSS name. spacing wins when both are set.
	*/
	gap?: SpaceValue;
	/**
	Put this element between each pair of children. true draws the built-in hairline
	(color-line), which turns to match the direction at every breakpoint.
	*/
	divider?: React.ReactNode;
	/**
	Cross-axis alignment.
	*/
	alignItems?:
		| "flex-start"
		| "center"
		| "flex-end"
		| "stretch"
		| "baseline"
		| "start"
		| "end";
	/**
	Main-axis distribution.
	*/
	justifyContent?:
		| "flex-start"
		| "center"
		| "flex-end"
		| "space-between"
		| "space-around"
		| "space-evenly"
		| "start"
		| "end";
	/**
	Let children wrap onto new lines.
	*/
	wrap?: boolean;
	/**
	The element to render, e.g. "ul" or "nav". Default "div".
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

const directions: ReadonlySet<unknown> = new Set<StackDirection>([
	"row",
	"column",
	"row-reverse",
	"column-reverse",
]);

function isDirection(value: unknown): value is StackDirection {
	return directions.has(value);
}

/**
What goes between two children: the hairline for `true`, else the caller's divider.
*/
function between(divider: React.ReactNode, index: number): React.ReactNode {
	const key = `gl-stack-divider-${index}`;
	return divider === true ? (
		<span key={key} className="gl-stack-rule" aria-hidden="true" />
	) : (
		<React.Fragment key={key}>{divider}</React.Fragment>
	);
}

/**
One-dimensional layout: children in a column or a row, a token gap between them, an optional divider.
*/
export function Stack({
	ref,
	direction = "column",
	spacing,
	gap,
	divider,
	alignItems,
	justifyContent,
	wrap = false,
	component: Component = "div",
	className,
	style,
	children,
	...rest
}: StackProps & { ref?: React.Ref<HTMLElement> | undefined }) {
	// Column is the stylesheet's default, so a single column needs no class.
	const directionClasses = isResponsiveObject(direction)
		? responsiveClasses("gl-stack", direction, isDirection)
		: direction !== "column" && isDirection(direction)
			? [`gl-stack-xs-${direction}`]
			: [];
	const layout: React.CSSProperties = {
		gap: space(spacing ?? gap),
		alignItems,
		justifyContent,
	};

	let content = children;
	// Undefined, null and false mean no divider.
	if ((divider ?? false) !== false) {
		// Children.toArray drops null, undefined and booleans, so dividers never double up.
		// eslint-disable-next-line @eslint-react/no-children-to-array -- The documented divider goes between the children that render.
		content = React.Children.toArray(children).flatMap((child, index) =>
			index === 0 ? [child] : [between(divider, index), child],
		);
	}

	return (
		<Component
			ref={ref}
			className={cx(
				"gl-stack",
				...directionClasses,
				wrap && "gl-stack-wrap",
				className,
			)}
			style={{ ...layout, ...style }}
			{...rest}
		>
			{content}
		</Component>
	);
}
