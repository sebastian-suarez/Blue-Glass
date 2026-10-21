import * as React from 'react';
import { cx } from '../internal/cx';
import type { SpaceValue } from './Box';
import { intIn, isResponsiveObject, isSpace, responsiveClasses } from './_surfaces-layout-system';

/**
 * The site's breakpoints, as min-width queries (the inverse of global.css's
 * max-width ones): xs 0, sm 361px, md 701px, lg 900px, xl 1001px.
 */
export type LayoutBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** One value, or one per breakpoint. Mobile first: a breakpoint without a value takes the one below it. */
export type ResponsiveValue<T> = T | Partial<Record<LayoutBreakpoint, T>>;

export interface GridProps extends React.HTMLAttributes<HTMLElement> {
  /** Lay the children out on the column grid. A Grid can be a container and an item at once. */
  container?: boolean;
  /** Container: the number of columns. Responsive values take 1–12; a single number can be any whole number. Default 12. */
  columns?: ResponsiveValue<number>;
  /** Container: gap between rows and columns, a spacing token name ("xs" … "section") or 0. */
  spacing?: SpaceValue;
  /** Container: gap between rows; wins over spacing. */
  rowSpacing?: SpaceValue;
  /** Container: gap between columns; wins over spacing. */
  columnSpacing?: SpaceValue;
  /** Item: how many columns it spans, 1–12, per breakpoint. With no size the item fills its row. */
  size?: ResponsiveValue<number>;
  /** Item: empty columns before it, 0–11, per breakpoint; it pushes from where the item would sit, as in MUI. */
  offset?: ResponsiveValue<number>;
  /** The element to render, e.g. "ul" or "section". Default "div". */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/**
 * A 12-column CSS grid on the site's breakpoints: a container sets the columns
 * and the gap token, its items span columns per breakpoint and can be offset.
 */
export const Grid = React.forwardRef<HTMLElement, GridProps>(function Grid(
  {
    container = false, columns, spacing, rowSpacing, columnSpacing, size, offset,
    component: Component = 'div', className, style, children, ...rest
  },
  ref,
) {
  const classes: string[] = ['gl-grid', 'gl-grid-item'];
  const vars: Record<string, number> = {};

  if (container) {
    classes.push('gl-grid-container');
    if (isResponsiveObject(columns)) classes.push(...responsiveClasses('gl-grid-columns', columns, (v) => intIn(v, 1, 12)));
    else if (intIn(columns, 1, 12)) classes.push(`gl-grid-columns-xs-${columns}`);
    else if (intIn(columns, 1, 96)) vars['--gl-grid-columns'] = columns as number;
    if (isSpace(spacing)) classes.push(`gl-grid-spacing-${spacing}`);
    if (isSpace(rowSpacing)) classes.push(`gl-grid-row-spacing-${rowSpacing}`);
    if (isSpace(columnSpacing)) classes.push(`gl-grid-column-spacing-${columnSpacing}`);
  }

  if (size !== undefined || offset !== undefined) {
    classes.push('gl-grid-sized');
    if (isResponsiveObject(size)) classes.push(...responsiveClasses('gl-grid-size', size, (v) => intIn(v, 1, 12)));
    else if (intIn(size, 1, 12)) classes.push(`gl-grid-size-xs-${size}`);
    else if (intIn(size, 1, 96)) vars['--gl-grid-size'] = size as number;
    if (isResponsiveObject(offset)) classes.push(...responsiveClasses('gl-grid-offset', offset, (v) => intIn(v, 0, 11)));
    else if (intIn(offset, 0, 11)) classes.push(`gl-grid-offset-xs-${offset}`);
    else if (intIn(offset, 0, 95)) vars['--gl-grid-offset'] = offset as number;
  }

  return (
    <Component ref={ref} className={cx(...classes, className)} style={{ ...vars, ...style }} {...rest}>
      {children}
    </Component>
  );
});
