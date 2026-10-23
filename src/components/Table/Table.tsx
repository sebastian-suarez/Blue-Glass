"use client";
import * as React from "react";
import { cx } from "../../internal/cx.js";
import { useForkRef, useIsoLayoutEffect } from "../../internal/hooks.js";
import { Icon } from "../Icon/Icon.js";

export type TableSize = "md" | "sm";

const TableContext = React.createContext<{ size: TableSize }>({ size: "md" });
const SectionContext = React.createContext<"head" | "body" | undefined>(
	undefined,
);

export type TableContainerProps = React.HTMLAttributes<HTMLDivElement> & {
	variant?: "surface" | "plain";
	maxHeight?: number | string;
	component?: React.ElementType;
	children?: React.ReactNode;
};

export function TableContainer({
	variant = "surface",
	maxHeight,
	component: Component = "div",
	className,
	style,
	children,
	ref,
	...rest
}: TableContainerProps & { ref?: React.Ref<HTMLDivElement> | undefined }) {
	const innerRef = React.useRef<HTMLDivElement | null>(null);
	const handleRef = useForkRef(innerRef, ref);
	const [isScrollable, setIsScrollable] = React.useState(false);
	useIsoLayoutEffect(() => {
		const element = innerRef.current;
		if (!element) {
			return undefined;
		}

		const check = () => {
			setIsScrollable(
				element.scrollWidth > element.clientWidth + 1 ||
					element.scrollHeight > element.clientHeight + 1,
			);
		};

		check();
		if (typeof ResizeObserver === "undefined") {
			return undefined;
		}

		const observer = new ResizeObserver(check);
		observer.observe(element);
		for (const child of element.children) {
			observer.observe(child);
		}

		return () => {
			observer.disconnect();
		};
	}, []);
	const isNamed = [rest["aria-label"], rest["aria-labelledby"]].some(
		(name) => name !== undefined && name !== null,
	);
	return (
		<Component
			ref={handleRef}
			className={cx(
				"gl-table-container",
				variant === "plain" && "gl-table-container-plain",
				className,
			)}
			style={
				maxHeight === undefined || maxHeight === null
					? style
					: { maxHeight, ...style }
			}
			tabIndex={isScrollable ? 0 : undefined}
			role={isScrollable && isNamed ? "region" : undefined}
			data-scrollable={isScrollable ? "" : undefined}
			{...rest}
		>
			{children}
		</Component>
	);
}

export type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
	size?: TableSize;
	stickyHeader?: boolean;
	caption?: React.ReactNode;
	captionSide?: "top" | "bottom";
	children?: React.ReactNode;
};

export function Table({
	size = "md",
	stickyHeader = false,
	caption,
	captionSide = "bottom",
	className,
	children,
	ref,
	...rest
}: TableProps & { ref?: React.Ref<HTMLTableElement> | undefined }) {
	const context = React.useMemo(() => ({ size }), [size]);
	const hasCaption =
		caption !== undefined && caption !== null && caption !== false;
	return (
		<TableContext value={context}>
			<table
				ref={ref}
				className={cx("gl-table", stickyHeader && "gl-table-sticky", className)}
				{...rest}
			>
				{hasCaption ? (
					<caption
						className={cx(
							"gl-table-caption",
							captionSide === "top" && "gl-table-caption-top",
						)}
					>
						{caption}
					</caption>
				) : null}
				{children}
			</table>
		</TableContext>
	);
}

export type TableHeadProps = React.HTMLAttributes<HTMLTableSectionElement> & {
	children?: React.ReactNode;
};

export function TableHead({
	className,
	children,
	ref,
	...rest
}: TableHeadProps & {
	ref?: React.Ref<HTMLTableSectionElement> | undefined;
}) {
	return (
		<SectionContext value="head">
			<thead ref={ref} className={cx("gl-table-head", className)} {...rest}>
				{children}
			</thead>
		</SectionContext>
	);
}

export type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement> & {
	children?: React.ReactNode;
};

export function TableBody({
	className,
	children,
	ref,
	...rest
}: TableBodyProps & {
	ref?: React.Ref<HTMLTableSectionElement> | undefined;
}) {
	return (
		<SectionContext value="body">
			<tbody ref={ref} className={cx("gl-table-body", className)} {...rest}>
				{children}
			</tbody>
		</SectionContext>
	);
}

export type TableRowProps = React.HTMLAttributes<HTMLTableRowElement> & {
	hover?: boolean;
	selected?: boolean;
	children?: React.ReactNode;
};

export function TableRow({
	hover = false,
	selected,
	className,
	children,
	ref,
	...rest
}: TableRowProps & { ref?: React.Ref<HTMLTableRowElement> | undefined }) {
	return (
		<tr
			ref={ref}
			className={cx(
				"gl-table-row",
				hover && "gl-table-row-hover",
				selected && "gl-table-row-selected",
				className,
			)}
			aria-selected={selected}
			{...rest}
		>
			{children}
		</tr>
	);
}

export type TableCellProps = Omit<
	React.TdHTMLAttributes<HTMLTableCellElement>,
	"align"
> & {
	align?: "inherit" | "left" | "center" | "right";
	numeric?: boolean;
	variant?: "head" | "body";
	size?: TableSize;
	padding?: "normal" | "checkbox" | "none";
	sortDirection?: "asc" | "desc" | false;
	component?: React.ElementType;
	children?: React.ReactNode;
};

const ariaSort = { asc: "ascending", desc: "descending" } as const;

export function TableCell({
	align = "inherit",
	numeric = false,
	variant: variantProperty,
	size: sizeProperty,
	padding = "normal",
	sortDirection = false,
	component,
	scope,
	className,
	children,
	ref,
	...rest
}: TableCellProps & { ref?: React.Ref<HTMLTableCellElement> | undefined }) {
	const table = React.use(TableContext);
	const section = React.use(SectionContext);
	const variant = variantProperty ?? (section === "head" ? "head" : "body");
	const Component: React.ElementType =
		component ?? (section === "head" ? "th" : "td");
	const isHeader = Component === "th";
	const size = sizeProperty ?? table.size;
	const textAlign = numeric && align === "inherit" ? "right" : align;
	return (
		<Component
			ref={ref}
			scope={isHeader ? (scope ?? (section === "head" ? "col" : "row")) : scope}
			aria-sort={
				isHeader && sortDirection !== false
					? ariaSort[sortDirection]
					: undefined
			}
			className={cx(
				"gl-table-cell",
				`gl-table-cell-${size}`,
				variant === "head" ? "gl-table-cell-head" : "gl-table-cell-body",
				isHeader &&
					section !== "head" &&
					variant === "body" &&
					"gl-table-cell-rowheader",
				textAlign !== "inherit" && `gl-table-cell-align-${textAlign}`,
				numeric && "gl-table-cell-numeric",
				padding !== "normal" && `gl-table-cell-pad-${padding}`,
				className,
			)}
			{...rest}
		>
			{children}
		</Component>
	);
}

export type TableSortLabelProps =
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		active?: boolean;
		direction?: "asc" | "desc";
		hideSortIcon?: boolean;
		children?: React.ReactNode;
	};

export function TableSortLabel({
	active = false,
	direction = "asc",
	hideSortIcon = false,
	type = "button",
	className,
	children,
	ref,
	...rest
}: TableSortLabelProps & { ref?: React.Ref<HTMLButtonElement> | undefined }) {
	return (
		<button
			ref={ref}
			type={type}
			className={cx(
				"gl-table-sort",
				active && "gl-table-sort-active",
				direction === "asc" && "gl-table-sort-asc",
				className,
			)}
			{...rest}
		>
			<span className="gl-table-sort-label">{children}</span>
			{active || !hideSortIcon ? (
				<Icon name="arrow-down" className="gl-table-sort-icon" />
			) : null}
			{active ? (
				<span className="gl-sr-only">
					{direction === "desc" ? ", sorted descending" : ", sorted ascending"}
				</span>
			) : null}
		</button>
	);
}
