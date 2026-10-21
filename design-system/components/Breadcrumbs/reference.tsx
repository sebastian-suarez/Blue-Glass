import * as React from 'react';
import { cx } from '../internal/cx';
import { Icon } from '../data-display/Icon';
import { Link } from './Link';

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  /** The trail, in order: Link elements (or router links), with the current page last. */
  children?: React.ReactNode;
  /** Node between crumbs. Default a chevron-right Icon in color-muted, hidden from screen readers. */
  separator?: React.ReactNode;
  /** Collapse the middle of the trail when it has more crumbs than this. Default 8. */
  maxItems?: number;
  /** Crumbs kept before the "…" button when collapsed. Default 1. */
  itemsBeforeCollapse?: number;
  /** Crumbs kept after the "…" button when collapsed. Default 1. */
  itemsAfterCollapse?: number;
  /** Accessible name of the "…" button. Default "Show path". */
  expandText?: string;
  /** Treat the last crumb as the current page: color-ink and aria-current="page". Default true. */
  lastIsCurrent?: boolean;
  /** sm: 12px; md: 13px (text-caption). Default md. */
  size?: 'sm' | 'md';
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isLinkLike(el: React.ReactElement): boolean {
  const p = el.props as Record<string, unknown>;
  return el.type === Link || typeof p.href === 'string' || p.to !== undefined || typeof p.onClick === 'function';
}

/** Tag one crumb with its part class; the current page also gets aria-current="page". */
function crumb(child: React.ReactNode, current: boolean): React.ReactNode {
  if (typeof child === 'string' || typeof child === 'number') {
    return current ? (
      <span className="gl-breadcrumbs-current" aria-current="page">{child}</span>
    ) : (
      <span className="gl-breadcrumbs-text">{child}</span>
    );
  }
  if (!React.isValidElement(child)) return child;
  const props = child.props as { className?: string; 'aria-current'?: unknown };
  const part = current ? 'gl-breadcrumbs-current' : isLinkLike(child) ? 'gl-breadcrumbs-link' : 'gl-breadcrumbs-text';
  return React.cloneElement(child, {
    className: cx(props.className, part),
    'aria-current': current ? props['aria-current'] ?? 'page' : props['aria-current'],
  });
}

/** The path to the current page, as a list of links; long trails fold into a "…" button. */
export const Breadcrumbs = React.forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  {
    children, separator, maxItems = 8, itemsBeforeCollapse = 1, itemsAfterCollapse = 1, expandText = 'Show path',
    lastIsCurrent = true, size = 'md', className, ...rest
  },
  ref,
) {
  const [expanded, setExpanded] = React.useState(false);
  const listRef = React.useRef<HTMLOListElement | null>(null);
  const focusAfterExpand = React.useRef(false);

  const all = React.Children.toArray(children);
  const count = all.length;
  const sep = separator ?? <Icon name="chevron-right" size={size === 'sm' ? 12 : 14} />;
  const crumbs = all.map((child, i) => ({
    key: (React.isValidElement(child) && child.key) || `crumb-${i}`,
    node: crumb(child, lastIsCurrent && i === count - 1),
  }));

  // Expanding removes the focused "…" button, so focus moves to the first crumb it revealed.
  React.useEffect(() => {
    if (!expanded || !focusAfterExpand.current) return;
    focusAfterExpand.current = false;
    const items = listRef.current ? Array.from(listRef.current.children) : [];
    for (const li of items.slice(itemsBeforeCollapse)) {
      const target = li.querySelector<HTMLElement>(FOCUSABLE);
      if (target) {
        target.focus();
        return;
      }
    }
  }, [expanded, itemsBeforeCollapse]);

  const collapsed = !expanded && count > maxItems && itemsBeforeCollapse + itemsAfterCollapse < count;
  const rows: Array<{ key: React.Key; node: React.ReactNode }> = collapsed
    ? [
        ...crumbs.slice(0, itemsBeforeCollapse),
        {
          key: 'gl-breadcrumbs-collapse',
          node: (
            <button
              type="button"
              className="gl-breadcrumbs-collapse"
              aria-label={expandText}
              onClick={() => {
                focusAfterExpand.current = true;
                setExpanded(true);
              }}
            >
              <Icon name="more" size={16} />
            </button>
          ),
        },
        ...crumbs.slice(count - itemsAfterCollapse),
      ]
    : crumbs;

  return (
    <nav ref={ref} aria-label="Breadcrumb" className={cx('gl-breadcrumbs', `gl-breadcrumbs-${size}`, className)} {...rest}>
      <ol ref={listRef} className="gl-breadcrumbs-list" role="list">
        {rows.map((row, i) => (
          <li key={row.key} className="gl-breadcrumbs-item">
            {row.node}
            {i < rows.length - 1 ? (
              <span className="gl-breadcrumbs-separator" aria-hidden="true">{sep}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
});
