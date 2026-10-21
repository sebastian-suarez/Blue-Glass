import * as React from 'react';
import { cx } from '../internal/cx';
import type { SpaceValue } from './Box';
import type { ResponsiveValue } from './Grid';
import { isResponsiveObject, responsiveClasses, space } from './_surfaces-layout-system';

export type StackDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  /** Main axis, or one per breakpoint (xs, sm ≥361, md ≥701, lg ≥900, xl ≥1001). Default "column". */
  direction?: ResponsiveValue<StackDirection>;
  /** Gap between children: a spacing token name ("xs" … "section") or 0. Default 0. */
  spacing?: SpaceValue;
  /** Alias of spacing, the CSS name. spacing wins when both are set. */
  gap?: SpaceValue;
  /**
   * Put this element between each pair of children. true draws the built-in hairline
   * (color-line), which turns to match the direction at every breakpoint.
   */
  divider?: React.ReactNode;
  /** Cross-axis alignment. */
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline' | 'start' | 'end';
  /** Main-axis distribution. */
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly' | 'start' | 'end';
  /** Let children wrap onto new lines. */
  wrap?: boolean;
  /** The element to render, e.g. "ul" or "nav". Default "div". */
  component?: React.ElementType;
  children?: React.ReactNode;
}

const DIRECTIONS: StackDirection[] = ['row', 'column', 'row-reverse', 'column-reverse'];

/** One-dimensional layout: children in a column or a row, a token gap between them, an optional divider. */
export const Stack = React.forwardRef<HTMLElement, StackProps>(function Stack(
  {
    direction = 'column', spacing, gap, divider, alignItems, justifyContent, wrap = false,
    component: Component = 'div', className, style, children, ...rest
  },
  ref,
) {
  const dirClasses = isResponsiveObject(direction)
    ? responsiveClasses('gl-stack', direction, (v) => DIRECTIONS.includes(v))
    : DIRECTIONS.includes(direction as StackDirection) && direction !== 'column'
      ? [`gl-stack-xs-${direction}`]
      : [];
  const s: React.CSSProperties = {};
  const g = space(spacing ?? gap);
  if (g) s.gap = g;
  if (alignItems) s.alignItems = alignItems;
  if (justifyContent) s.justifyContent = justifyContent;

  let content: React.ReactNode = children;
  if (divider !== undefined && divider !== null && divider !== false) {
    const items = React.Children.toArray(children);
    const out: React.ReactNode[] = [];
    items.forEach((child, i) => {
      if (i > 0) {
        const key = `gl-stack-divider-${i}`;
        if (divider === true) out.push(<span key={key} className="gl-stack-rule" aria-hidden="true" />);
        else if (React.isValidElement(divider)) out.push(React.cloneElement(divider, { key }));
        else out.push(<React.Fragment key={key}>{divider}</React.Fragment>);
      }
      out.push(child);
    });
    content = out;
  }

  return (
    <Component
      ref={ref}
      className={cx('gl-stack', ...dirClasses, wrap && 'gl-stack-wrap', className)}
      style={{ ...s, ...style }}
      {...rest}
    >
      {content}
    </Component>
  );
});
