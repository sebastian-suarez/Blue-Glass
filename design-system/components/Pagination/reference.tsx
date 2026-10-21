import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback } from '../internal/hooks';
import { Icon } from '../data-display/Icon';

export type PaginationItemType = 'page' | 'first' | 'last' | 'next' | 'previous' | 'start-ellipsis' | 'end-ellipsis';

/** What Pagination hands renderItem for each item; spread it onto a PaginationItem. */
export interface PaginationRenderItemParams {
  type: PaginationItemType;
  page: number | null;
  selected: boolean;
  disabled: boolean;
  size: 'sm' | 'md';
  variant: 'glass' | 'text';
  'aria-label'?: string;
  'aria-current'?: 'page';
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

export interface PaginationProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onChange'> {
  /** Number of pages. Default 1. */
  count?: number;
  /** The current page, 1-based (controlled). */
  page?: number;
  /** The current page when uncontrolled. Default 1. */
  defaultPage?: number;
  /** Called with the event and the new page. */
  onChange?: (event: React.SyntheticEvent, page: number) => void;
  /** Pages shown on each side of the current one. Default 1. */
  siblingCount?: number;
  /** Pages always shown at each end. Default 1. */
  boundaryCount?: number;
  /** Disable every item. */
  disabled?: boolean;
  /** Add a first-page button. */
  showFirstButton?: boolean;
  /** Add a last-page button. */
  showLastButton?: boolean;
  /** Drop the previous-page button. */
  hidePrevButton?: boolean;
  /** Drop the next-page button. */
  hideNextButton?: boolean;
  /** glass: chip pills (glass-control with the chip hairline), the default. text: no fill until hover. */
  variant?: 'glass' | 'text';
  /** md: 36px pills; sm: 28px. Default md. */
  size?: 'sm' | 'md';
  /** Accessible name of each item. Default "Go to page 4", "Page 3" for the current one, "Go to next page". */
  getItemAriaLabel?: (type: PaginationItemType, page: number | null, selected: boolean) => string;
  /** Render each item yourself, e.g. `<PaginationItem {...item} href={…} />` for links. */
  renderItem?: (item: PaginationRenderItemParams) => React.ReactNode;
}

export interface PaginationItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** A page, a step button (first, previous, next, last) or an ellipsis. Default page. */
  type?: PaginationItemType;
  /** The page the item goes to; null for an ellipsis. */
  page?: number | null;
  /** The current page: the color-ink pill with on-ink text. Pair it with aria-current="page". */
  selected?: boolean;
  disabled?: boolean;
  /** glass (default) or text, as on Pagination. */
  variant?: 'glass' | 'text';
  /** md (36px, default) or sm (28px). */
  size?: 'sm' | 'md';
  /** Render a link instead of a button. */
  href?: string;
  /** Render a router link component instead; it receives href and className. */
  component?: React.ElementType;
}

const NAV_ICON: Record<string, string> = {
  first: 'chevrons-left',
  previous: 'chevron-left',
  next: 'chevron-right',
  last: 'chevrons-right',
};

function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}

/** MUI's usePagination item list, verbatim: e.g. previous, 1, …, 4, 5, 6, …, 10, next. */
function paginationList(
  count: number, page: number, siblingCount: number, boundaryCount: number,
  showFirst: boolean, showLast: boolean, hidePrev: boolean, hideNext: boolean,
): Array<number | PaginationItemType> {
  const startPages = range(1, Math.min(boundaryCount, count));
  const endPages = range(Math.max(count - boundaryCount + 1, boundaryCount + 1), count);
  const siblingsStart = Math.max(
    Math.min(page - siblingCount, count - boundaryCount - siblingCount * 2 - 1), // natural start; lower bound when page is high
    boundaryCount + 2, // after the start pages
  );
  const siblingsEnd = Math.min(
    Math.max(page + siblingCount, boundaryCount + siblingCount * 2 + 2), // natural end; upper bound when page is low
    endPages.length > 0 ? endPages[0] - 2 : count - 1, // before the end pages
  );
  const list: Array<number | PaginationItemType> = [];
  if (showFirst) list.push('first');
  if (!hidePrev) list.push('previous');
  list.push(...startPages);
  if (siblingsStart > boundaryCount + 2) list.push('start-ellipsis');
  else if (boundaryCount + 1 < count - boundaryCount) list.push(boundaryCount + 1);
  list.push(...range(siblingsStart, siblingsEnd));
  if (siblingsEnd < count - boundaryCount - 1) list.push('end-ellipsis');
  else if (count - boundaryCount > boundaryCount) list.push(count - boundaryCount);
  list.push(...endPages);
  if (!hideNext) list.push('next');
  if (showLast) list.push('last');
  return list;
}

function defaultItemAriaLabel(type: PaginationItemType, page: number | null, selected: boolean): string {
  if (type === 'page') return selected ? `Page ${page}` : `Go to page ${page}`;
  return `Go to ${type} page`;
}

/** One pill in a Pagination: a page, a previous/next/first/last chevron, or a non-interactive ellipsis. */
export const PaginationItem = React.forwardRef<HTMLElement, PaginationItemProps>(function PaginationItem(
  { type = 'page', page = null, selected = false, disabled = false, variant = 'glass', size = 'md', href, component, className, children, onClick, ...rest },
  ref,
) {
  if (type === 'start-ellipsis' || type === 'end-ellipsis') {
    return (
      <span ref={ref} className={cx('gl-pagination-ellipsis', `gl-pagination-ellipsis-${size}`, className)} {...rest}>
        …
      </span>
    );
  }
  const Root: React.ElementType = component ?? (href !== undefined ? 'a' : 'button');
  const isButton = Root === 'button';
  return (
    <Root
      ref={ref}
      className={cx(
        'gl-pagination-item',
        `gl-pagination-item-${variant}`,
        size === 'sm' && 'gl-pagination-item-sm',
        type !== 'page' && 'gl-pagination-item-step',
        selected && 'gl-pagination-item-selected',
        className,
      )}
      type={isButton ? 'button' : undefined}
      disabled={isButton ? disabled : undefined}
      href={isButton || disabled ? undefined : href}
      aria-disabled={!isButton && disabled ? true : undefined}
      role={!isButton && disabled ? 'link' : undefined}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      {...rest}
    >
      {type === 'page' ? children ?? page : <Icon name={NAV_ICON[type]} size={size === 'sm' ? 14 : 16} />}
    </Root>
  );
});

/** Page links as a row of pills, the current page in ink; folds long ranges with ellipses (MUI's algorithm). */
export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(function Pagination(
  {
    count = 1, page: pageProp, defaultPage = 1, onChange, siblingCount = 1, boundaryCount = 1, disabled = false,
    showFirstButton = false, showLastButton = false, hidePrevButton = false, hideNextButton = false,
    variant = 'glass', size = 'md', getItemAriaLabel = defaultItemAriaLabel, renderItem, className, ...rest
  },
  ref,
) {
  const [page, setPage] = useControlled<number>(pageProp, defaultPage);
  const go = useEventCallback((event: React.SyntheticEvent, next: number) => {
    setPage(next);
    onChange?.(event, next);
  });
  const list = paginationList(count, page, siblingCount, boundaryCount, showFirstButton, showLastButton, hidePrevButton, hideNextButton);
  const items: PaginationRenderItemParams[] = list.map((entry) => {
    if (typeof entry === 'number') {
      const selected = entry === page;
      return {
        type: 'page',
        page: entry,
        selected,
        disabled,
        size,
        variant,
        'aria-label': getItemAriaLabel('page', entry, selected),
        'aria-current': selected ? 'page' : undefined,
        onClick: (event: React.MouseEvent<HTMLElement>) => go(event, entry),
      };
    }
    const ellipsis = entry === 'start-ellipsis' || entry === 'end-ellipsis';
    const target =
      entry === 'first' ? 1 : entry === 'previous' ? page - 1 : entry === 'next' ? page + 1 : entry === 'last' ? count : null;
    return {
      type: entry,
      page: target,
      selected: false,
      disabled: disabled || (!ellipsis && (entry === 'next' || entry === 'last' ? page >= count : page <= 1)),
      size,
      variant,
      'aria-label': ellipsis ? undefined : getItemAriaLabel(entry, target, false),
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        if (target !== null) go(event, target);
      },
    };
  });
  return (
    <nav ref={ref} aria-label="Pagination" className={cx('gl-pagination', `gl-pagination-${size}`, className)} {...rest}>
      <ul className="gl-pagination-list" role="list">
        {items.map((item) => (
          <li key={item.type === 'page' ? `page-${item.page}` : item.type} className="gl-pagination-cell">
            {renderItem ? renderItem(item) : <PaginationItem {...item} />}
          </li>
        ))}
      </ul>
    </nav>
  );
});
