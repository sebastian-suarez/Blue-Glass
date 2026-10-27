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
	direction?: ResponsiveValue<StackDirection>;
	spacing?: SpaceValue;
	gap?: SpaceValue;
	divider?: React.ReactNode;
	alignItems?:
		| "flex-start"
		| "center"
		| "flex-end"
		| "stretch"
		| "baseline"
		| "start"
		| "end";
	justifyContent?:
		| "flex-start"
		| "center"
		| "flex-end"
		| "space-between"
		| "space-around"
		| "space-evenly"
		| "start"
		| "end";
	wrap?: boolean;
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

function between(divider: React.ReactNode, index: number): React.ReactNode {
	const key = `gl-stack-divider-${index}`;
	return divider === true ? (
		<span key={key} className="gl-stack-rule" aria-hidden="true" />
	) : (
		<React.Fragment key={key}>{divider}</React.Fragment>
	);
}

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
	if ((divider ?? false) !== false) {
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
