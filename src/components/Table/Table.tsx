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
	/**
	`surface`: the site's career list surface (.career-surface), default. `plain`: only the scroll box.
	*/
	variant?: "surface" | "plain";
	/**
	Cap the height so the body scrolls under a stickyHeader: px or any CSS length.
	*/
	maxHeight?: number | string;
	/**
	Render as another element. Default div.
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

/**
The glass surface a table sits on (.career-surface), scrolling sideways when the table is wider.
When it does scroll it joins the tab order, so the keyboard can scroll it too; name it with aria-label.
*/
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
	// Only the client can measure an overflow, so the server HTML starts with no tab stop.
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
	/**
	`md`: 14px rows with room (default). `sm`: dense 13px rows.
	*/
	size?: TableSize;
	/**
	Header cells stick to the top of a scrolling TableContainer (give it maxHeight).
	*/
	stickyHeader?: boolean;
	/**
	Names the table, rendered as its <caption> in 12px color-muted.
	*/
	caption?: React.ReactNode;
	/**
	Caption above or below the table. Default bottom, like the site's figure captions.
	*/
	captionSide?: "top" | "bottom";
	children?: React.ReactNode;
};

/**
A data table: 12px muted headers, color-line hairlines between rows, tabular figures for numbers.
*/
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

/**
The header rows: cells inside render as th scope="col" in the header style.
*/
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

/**
The body rows.
*/
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
	/**
	Highlight the row under a fine pointer (for rows that do something).
	*/
	hover?: boolean;
	/**
	The raised selected state (glass-raised). Sets aria-selected; also show the state in a cell.
	*/
	selected?: boolean;
	children?: React.ReactNode;
};

/**
One row.
*/
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
	/**
	Text alignment. Default start; right for numeric cells.
	*/
	align?: "inherit" | "left" | "center" | "right";
	/**
	A number: right-aligned, tabular figures. Set it on the column's header cell too.
	*/
	numeric?: boolean;
	/**
	`head` or `body` look. Default from the section: `head` inside TableHead.
	*/
	variant?: "head" | "body";
	/**
	Override the table's size for this cell.
	*/
	size?: TableSize;
	/**
	`normal`, `checkbox` (tight, for a selection control) or `none`.
	*/
	padding?: "normal" | "checkbox" | "none";
	/**
	The column is sorted: sets aria-sort on the header cell.
	*/
	sortDirection?: "asc" | "desc" | false;
	/**
	`th` or `td`. Default `th` in TableHead, `td` elsewhere; pass "th" for a row header.
	*/
	component?: React.ElementType;
	children?: React.ReactNode;
};

const ariaSort = { asc: "ascending", desc: "descending" } as const;

/**
A cell: th scope="col" in the head, td in the body, th scope="row" when you ask for a row header.
*/
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
	// The section picks the element and variant only the look, as the API documents. The
	// reference picks it from variant, so a body-look cell in the head lost its header role.
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
		/**
		This column is the sorted one.
		*/
		active?: boolean;
		/**
		`asc` (arrow up) or `desc` (arrow down). Default `asc`.
		*/
		direction?: "asc" | "desc";
		/**
		No arrow at all on inactive columns, not even under the pointer.
		*/
		hideSortIcon?: boolean;
		children?: React.ReactNode;
	};

/**
A header label that sorts its column: a button with a direction arrow. Put it in a TableCell
with sortDirection so the th carries aria-sort.
*/
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
