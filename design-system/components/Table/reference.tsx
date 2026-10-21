import * as React from 'react';
import { cx } from '../internal/cx';
import { useForkRef, useIsoLayoutEffect } from '../internal/hooks';
import { Icon } from './Icon';

export type TableSize = 'md' | 'sm';

interface TableContextValue {
  size: TableSize;
}
const TableContext = React.createContext<TableContextValue>({ size: 'md' });
const SectionContext = React.createContext<'head' | 'body' | null>(null);

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** surface: the site's career list surface (.career-surface), default. plain: only the scroll box. */
  variant?: 'surface' | 'plain';
  /** Cap the height so the body scrolls under a stickyHeader: px or any CSS length. */
  maxHeight?: number | string;
  /** Render as another element. Default div. */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/**
 * The glass surface a table sits on (.career-surface), scrolling sideways when the table is wider.
 * When it does scroll it joins the tab order, so the keyboard can scroll it too; name it with aria-label.
 */
export const TableContainer = React.forwardRef<HTMLDivElement, TableContainerProps>(function TableContainer(
  { variant = 'surface', maxHeight, component: Component = 'div', className, style, children, ...rest },
  ref,
) {
  const innerRef = React.useRef<HTMLDivElement | null>(null);
  const handleRef = useForkRef(innerRef, ref);
  const [scrollable, setScrollable] = React.useState(false);
  useIsoLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return undefined;
    const check = () => setScrollable(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  const named = rest['aria-label'] != null || rest['aria-labelledby'] != null;
  return (
    <Component
      ref={handleRef}
      className={cx('gl-table-container', variant === 'plain' && 'gl-table-container-plain', className)}
      style={maxHeight != null ? { maxHeight, ...style } : style}
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable && named ? 'region' : undefined}
      data-scrollable={scrollable ? '' : undefined}
      {...rest}
    >
      {children}
    </Component>
  );
});

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  /** md: 14px rows with room (default). sm: dense 13px rows. */
  size?: TableSize;
  /** Header cells stick to the top of a scrolling TableContainer (give it maxHeight). */
  stickyHeader?: boolean;
  /** Names the table, rendered as its <caption> in 12px color-muted. */
  caption?: React.ReactNode;
  /** Caption above or below the table. Default bottom, like the site's figure captions. */
  captionSide?: 'top' | 'bottom';
  children?: React.ReactNode;
}

/** A data table: 12px muted headers, color-line hairlines between rows, tabular figures for numbers. */
export const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table(
  { size = 'md', stickyHeader = false, caption, captionSide = 'bottom', className, children, ...rest },
  ref,
) {
  const context = React.useMemo(() => ({ size }), [size]);
  return (
    <TableContext.Provider value={context}>
      <table ref={ref} className={cx('gl-table', stickyHeader && 'gl-table-sticky', className)} {...rest}>
        {caption != null && caption !== false ? (
          <caption className={cx('gl-table-caption', captionSide === 'top' && 'gl-table-caption-top')}>{caption}</caption>
        ) : null}
        {children}
      </table>
    </TableContext.Provider>
  );
});

export interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children?: React.ReactNode;
}

/** The header rows: cells inside render as th scope="col" in the header style. */
export const TableHead = React.forwardRef<HTMLTableSectionElement, TableHeadProps>(function TableHead({ className, children, ...rest }, ref) {
  return (
    <SectionContext.Provider value="head">
      <thead ref={ref} className={cx('gl-table-head', className)} {...rest}>
        {children}
      </thead>
    </SectionContext.Provider>
  );
});

export interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children?: React.ReactNode;
}

/** The body rows. */
export const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(function TableBody({ className, children, ...rest }, ref) {
  return (
    <SectionContext.Provider value="body">
      <tbody ref={ref} className={cx('gl-table-body', className)} {...rest}>
        {children}
      </tbody>
    </SectionContext.Provider>
  );
});

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Highlight the row under a fine pointer (for rows that do something). */
  hover?: boolean;
  /** The raised selected state (glass-raised). Sets aria-selected; also show the state in a cell. */
  selected?: boolean;
  children?: React.ReactNode;
}

/** One row. */
export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { hover = false, selected, className, children, ...rest },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={cx('gl-table-row', hover && 'gl-table-row-hover', selected && 'gl-table-row-selected', className)}
      aria-selected={selected === undefined ? undefined : selected}
      {...rest}
    >
      {children}
    </tr>
  );
});

export interface TableCellProps extends Omit<React.TdHTMLAttributes<HTMLTableCellElement>, 'align'> {
  /** Text alignment. Default start; right for numeric cells. */
  align?: 'inherit' | 'left' | 'center' | 'right';
  /** A number: right-aligned, tabular figures. Set it on the column's header cell too. */
  numeric?: boolean;
  /** head or body look. Default from the section: head inside TableHead. */
  variant?: 'head' | 'body';
  /** Override the table's size for this cell. */
  size?: TableSize;
  /** normal, checkbox (tight, for a selection control) or none. */
  padding?: 'normal' | 'checkbox' | 'none';
  /** The column is sorted: sets aria-sort on the header cell. */
  sortDirection?: 'asc' | 'desc' | false;
  /** th or td. Default th in TableHead, td elsewhere; pass "th" for a row header. */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** A cell: th scope="col" in the head, td in the body, th scope="row" when you ask for a row header. */
export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { align = 'inherit', numeric = false, variant: variantProp, size: sizeProp, padding = 'normal', sortDirection = false, component, scope, className, children, ...rest },
  ref,
) {
  const table = React.useContext(TableContext);
  const section = React.useContext(SectionContext);
  const variant = variantProp ?? (section === 'head' ? 'head' : 'body');
  const Component: React.ElementType = component ?? (variant === 'head' ? 'th' : 'td');
  const isHeader = Component === 'th';
  const size = sizeProp ?? table.size;
  const textAlign = numeric && align === 'inherit' ? 'right' : align;
  return (
    <Component
      ref={ref}
      scope={isHeader ? scope ?? (section === 'head' ? 'col' : 'row') : scope}
      aria-sort={isHeader && sortDirection ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cx(
        'gl-table-cell',
        `gl-table-cell-${size}`,
        variant === 'head' ? 'gl-table-cell-head' : 'gl-table-cell-body',
        isHeader && variant === 'body' && 'gl-table-cell-rowheader',
        textAlign !== 'inherit' && `gl-table-cell-align-${textAlign}`,
        numeric && 'gl-table-cell-numeric',
        padding !== 'normal' && `gl-table-cell-pad-${padding}`,
        className as string | undefined,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});

export interface TableSortLabelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** This column is the sorted one. */
  active?: boolean;
  /** asc (arrow up) or desc (arrow down). Default asc. */
  direction?: 'asc' | 'desc';
  /** No arrow at all on inactive columns, not even under the pointer. */
  hideSortIcon?: boolean;
  children?: React.ReactNode;
}

/**
 * A header label that sorts its column: a button with a direction arrow. Put it in a TableCell
 * with sortDirection so the th carries aria-sort.
 */
export const TableSortLabel = React.forwardRef<HTMLButtonElement, TableSortLabelProps>(function TableSortLabel(
  { active = false, direction = 'asc', hideSortIcon = false, type = 'button', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('gl-table-sort', active && 'gl-table-sort-active', direction === 'asc' && 'gl-table-sort-asc', className)}
      {...rest}
    >
      <span className="gl-table-sort-label">{children}</span>
      {active || !hideSortIcon ? <Icon name="arrow-down" className="gl-table-sort-icon" /> : null}
      {active ? <span className="gl-sr-only">{direction === 'desc' ? ', sorted descending' : ', sorted ascending'}</span> : null}
    </button>
  );
});
