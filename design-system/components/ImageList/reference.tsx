import * as React from 'react';
import { cx } from '../internal/cx';
import type { SpaceValue } from './Box';
import { isSpace, space } from './_surfaces-layout-system';

export type ImageListVariant = 'standard' | 'quilted' | 'woven' | 'masonry';

interface ImageListContextValue {
  variant: ImageListVariant;
}

const ImageListContext = React.createContext<ImageListContextValue>({ variant: 'standard' });

export interface ImageListProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * standard: equal cells on a grid. quilted: items span cols and rows. woven: every
   * second item is 70% tall, centred. masonry: CSS columns, each image at its own height.
   */
  variant?: ImageListVariant;
  /** Number of columns. Default 2. */
  cols?: number;
  /** Space between items: a spacing token name ("3xs" … "xl") or 0. Default "xs" (8px). */
  gap?: SpaceValue;
  /** Row height in px, or "auto" to follow the images (standard, quilted, woven). Default "auto". */
  rowHeight?: number | 'auto';
  /**
   * contain: the whole image shows, 12px inside its plate, the default for the brand's diagrams.
   * cover: the image fills the tile edge to edge and may be cropped.
   */
  fit?: 'contain' | 'cover';
  /** The element to render. Default "ul". */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** A grid of figures. The brand's imagery is diagrams, each in an inset plate. */
export const ImageList = React.forwardRef<HTMLElement, ImageListProps>(function ImageList(
  { variant = 'standard', cols = 2, gap = 'xs', rowHeight = 'auto', fit = 'contain', component: Component = 'ul', className, style, children, ...rest },
  ref,
) {
  const vars: Record<string, string | number> = {
    '--gl-image-list-cols': Math.max(1, Math.round(cols)),
    '--gl-image-list-gap': space(isSpace(gap) ? gap : 'xs') as string,
  };
  if (typeof rowHeight === 'number' && variant !== 'masonry') vars['--gl-image-list-row'] = `${rowHeight}px`;
  const ctx = React.useMemo(() => ({ variant }), [variant]);
  return (
    <Component
      ref={ref}
      className={cx(
        'gl-image-list',
        `gl-image-list-${variant}`,
        `gl-image-list-${fit === 'cover' ? 'cover' : 'contain'}`,
        typeof rowHeight === 'number' && 'gl-image-list-fixed',
        className,
      )}
      style={{ ...vars, ...style }}
      {...rest}
    >
      <ImageListContext.Provider value={ctx}>{children}</ImageListContext.Provider>
    </Component>
  );
});

export interface ImageListItemProps extends React.HTMLAttributes<HTMLElement> {
  /** Columns the item spans (standard, quilted, woven). Default 1. */
  cols?: number;
  /** Rows the item spans (standard, quilted, woven). Default 1. */
  rows?: number;
  /** The element to render. Default "li". */
  component?: React.ElementType;
  /** An <img> (it gets the fill styles), or any element such as an inline SVG; then an ImageListItemBar. */
  children?: React.ReactNode;
}

/** One tile: an inset plate (glass-inset, glass-edge, radius-control) the image fills. */
export const ImageListItem = React.forwardRef<HTMLElement, ImageListItemProps>(function ImageListItem(
  { cols = 1, rows = 1, component: Component = 'li', className, style, children, ...rest },
  ref,
) {
  const { variant } = React.useContext(ImageListContext);
  const s: React.CSSProperties = {};
  if (variant !== 'masonry') {
    if (cols > 1) s.gridColumnEnd = `span ${Math.round(cols)}`;
    if (rows > 1) s.gridRowEnd = `span ${Math.round(rows)}`;
  }
  const content = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === 'img') {
      const props = child.props as { className?: string };
      return React.cloneElement(child, { className: cx('gl-image-list-img', props.className) });
    }
    return child;
  });
  return (
    <Component ref={ref} className={cx('gl-image-list-item', className)} style={{ ...s, ...style }} {...rest}>
      {content}
    </Component>
  );
});

export interface ImageListItemBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** The caption's first line: 13px, weight 500. */
  title?: React.ReactNode;
  /** A second line in color-muted. */
  subtitle?: React.ReactNode;
  /** bottom or top: a glass strip over the image. below: plain text under it. Default "bottom". */
  position?: 'bottom' | 'top' | 'below';
  /** An action at the end of the strip, e.g. a link with an arrow-ne icon. */
  actionIcon?: React.ReactNode;
  /** Which side the action sits on. Default "right". */
  actionPosition?: 'left' | 'right';
}

/** The tile's caption: a glass strip (glass-raised, blur-control) with a title and a muted subtitle. */
export const ImageListItemBar = React.forwardRef<HTMLDivElement, ImageListItemBarProps>(function ImageListItemBar(
  { title, subtitle, position = 'bottom', actionIcon, actionPosition = 'right', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cx(
        'gl-image-list-bar',
        `gl-image-list-bar-${position}`,
        position !== 'below' && 'gl-image-list-bar-overlay',
        actionIcon && actionPosition === 'left' && 'gl-image-list-bar-action-left',
        className,
      )}
      {...rest}
    >
      <div className="gl-image-list-bar-text">
        {title !== undefined && title !== null ? <span className="gl-image-list-bar-title">{title}</span> : null}
        {subtitle !== undefined && subtitle !== null ? <span className="gl-image-list-bar-subtitle">{subtitle}</span> : null}
        {children}
      </div>
      {actionIcon ? <div className="gl-image-list-bar-action">{actionIcon}</div> : null}
    </div>
  );
});
