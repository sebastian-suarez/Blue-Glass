import * as React from 'react';
import { cx } from '../internal/cx';
import { useForkRef } from '../internal/hooks';

interface ListContextValue {
  dense: boolean;
  inList: boolean;
}
const ListContext = React.createContext<ListContextValue>({ dense: false, inList: false });
/** True inside a ListItem: a ListItemButton there needs no <li> of its own. */
const ListItemContext = React.createContext(false);

export interface ListProps extends React.HTMLAttributes<HTMLElement> {
  /** Compact rows: 32px instead of 40px, 13px text. Passed down to every row. */
  dense?: boolean;
  /** A color-line hairline between rows, as the site's career list (.career-row). */
  divided?: boolean;
  /** A ListSubheader (or any node) rendered first. */
  subheader?: React.ReactNode;
  /** Render as another element. Default ul; use "ol" for an ordered list. */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** A vertical list of rows: static rows like the site's career list, or interactive rows on the shared option row. */
export const List = React.forwardRef<HTMLElement, ListProps>(function List(
  { dense = false, divided = false, subheader, component: Component = 'ul', className, children, ...rest },
  ref,
) {
  const context = React.useMemo(() => ({ dense, inList: true }), [dense]);
  return (
    <ListContext.Provider value={context}>
      <Component ref={ref} className={cx('gl-list', dense && 'gl-list-dense', divided && 'gl-list-divided', className)} {...rest}>
        {subheader}
        {children}
      </Component>
    </ListContext.Provider>
  );
});

export interface ListItemProps extends React.HTMLAttributes<HTMLElement> {
  /** End slot: meta text, a chip or an action button. On a row that holds a ListItemButton it sits over the row's end. */
  secondaryAction?: React.ReactNode;
  /** A hairline under this row. */
  divider?: boolean;
  /** Compact row. Default from the List. */
  dense?: boolean;
  /** No padding. Automatic when the item holds a ListItemButton. */
  disablePadding?: boolean;
  /** No side padding: the row lines up with its surface's padding, as the career list does. */
  disableGutters?: boolean;
  /** center (default), or flex-start for rows whose text runs to several lines. */
  alignItems?: 'center' | 'flex-start';
  /** Render as another element. Default li. */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** One static row: an icon, primary and secondary text, and an end slot. */
export const ListItem = React.forwardRef<HTMLElement, ListItemProps>(function ListItem(
  {
    secondaryAction, divider = false, dense, disablePadding = false, disableGutters = false, alignItems = 'center',
    component: Component = 'li', className, children, ...rest
  },
  ref,
) {
  const list = React.useContext(ListContext);
  const isDense = dense ?? list.dense;
  const hasAction = secondaryAction != null && secondaryAction !== false;
  return (
    <ListItemContext.Provider value>
      <Component
        ref={ref}
        className={cx(
          'gl-list-item',
          isDense && 'gl-list-item-dense',
          divider && 'gl-list-item-divider',
          disablePadding && 'gl-list-item-flush',
          disableGutters && 'gl-list-item-no-gutters',
          alignItems === 'flex-start' && 'gl-list-item-align-start',
          hasAction && 'gl-list-item-has-action',
          className,
        )}
        {...rest}
      >
        {children}
        {hasAction ? <span className="gl-list-item-action">{secondaryAction}</span> : null}
      </Component>
    </ListItemContext.Provider>
  );
});

export interface ListItemButtonProps extends React.HTMLAttributes<HTMLElement> {
  /** The raised state of the site's selected tab. A button gets aria-pressed, a link aria-current="page". */
  selected?: boolean;
  disabled?: boolean;
  /** Compact row. Default from the List. */
  dense?: boolean;
  /** Render a link instead of a button. */
  href?: string;
  target?: string;
  rel?: string;
  /** End slot inside the row: a count, a shortcut, a chevron. */
  end?: React.ReactNode;
  /** center (default), or flex-start for multi-line rows. */
  alignItems?: 'center' | 'flex-start';
  /** Focus the row on mount. */
  autoFocus?: boolean;
  type?: 'button' | 'submit' | 'reset';
  /** Render as another element. Default button, or a when href is set. */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/**
 * An interactive row on the shared option row (.gl-option, the side selector's tab):
 * hover, focus ring, press and the raised selected state. Inside a List it brings its own <li>.
 */
export const ListItemButton = React.forwardRef<HTMLElement, ListItemButtonProps>(function ListItemButton(
  {
    selected, disabled = false, dense, href, target, rel, end, alignItems = 'center', autoFocus = false, type = 'button',
    component, className, children, onClick, ...rest
  },
  ref,
) {
  const list = React.useContext(ListContext);
  const inItem = React.useContext(ListItemContext);
  const isDense = dense ?? list.dense;
  const innerRef = React.useRef<HTMLElement | null>(null);
  const handleRef = useForkRef(innerRef, ref);
  React.useEffect(() => {
    if (autoFocus) innerRef.current?.focus();
  }, [autoFocus]);

  const Component: React.ElementType = component ?? (href !== undefined ? 'a' : 'button');
  const state: Record<string, unknown> = {};
  if (Component === 'a') {
    state.href = disabled ? undefined : href;
    state.target = target;
    state.rel = rel;
    if (selected) state['aria-current'] = 'page';
    if (disabled) {
      state['aria-disabled'] = true;
      state.role = 'link';
    }
  } else if (Component === 'button') {
    state.type = type;
    state.disabled = disabled;
    if (selected !== undefined) state['aria-pressed'] = selected;
  } else if (disabled) {
    state['aria-disabled'] = true;
  }

  const row = (
    <Component
      ref={handleRef}
      className={cx(
        'gl-option',
        'gl-list-button',
        isDense && 'gl-list-button-dense',
        alignItems === 'flex-start' && 'gl-list-button-align-start',
        className,
      )}
      data-selected={selected ? '' : undefined}
      onClick={(e: React.MouseEvent<HTMLElement>) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...state}
      {...rest}
    >
      {children}
      {end != null && end !== false ? <span className="gl-option-end gl-list-button-end">{end}</span> : null}
    </Component>
  );
  // A button can't be a direct child of a ul: give it the row's <li>.
  if (list.inList && !inItem) return <li className="gl-list-item gl-list-item-flush">{row}</li>;
  return row;
});

export interface ListItemIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
}

/** The leading icon (or small avatar) of a row, in color-muted; color-ink on a selected row. */
export const ListItemIcon = React.forwardRef<HTMLSpanElement, ListItemIconProps>(function ListItemIcon({ className, children, ...rest }, ref) {
  return (
    <span ref={ref} className={cx('gl-option-icon', 'gl-list-icon', className)} {...rest}>
      {children}
    </span>
  );
});

export interface ListItemTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The main line, in the row's ink. Children work too. */
  primary?: React.ReactNode;
  /** A second line in 12px color-muted. */
  secondary?: React.ReactNode;
  /** Indent to line up with rows that have an icon. */
  inset?: boolean;
  /** Keep each line to one, cut with an ellipsis. */
  noWrap?: boolean;
  children?: React.ReactNode;
}

/** A row's text: primary over an optional muted secondary line. */
export const ListItemText = React.forwardRef<HTMLSpanElement, ListItemTextProps>(function ListItemText(
  { primary, secondary, inset = false, noWrap = false, className, children, ...rest },
  ref,
) {
  const main = primary ?? children;
  return (
    <span ref={ref} className={cx('gl-option-text', 'gl-list-text', inset && 'gl-list-text-inset', noWrap && 'gl-list-text-nowrap', className)} {...rest}>
      {main != null && main !== false ? <span className="gl-list-primary">{main}</span> : null}
      {secondary != null && secondary !== false ? <span className="gl-option-secondary gl-list-secondary">{secondary}</span> : null}
    </span>
  );
});

export interface ListSubheaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Indent to line up with text after an icon. */
  inset?: boolean;
  /** Stick to the top of a scrolling list, on glass-solid. */
  sticky?: boolean;
  /** Render as another element. Default li. */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** A group label inside a list: 12px, weight 600, color-muted (.gl-option-group). */
export const ListSubheader = React.forwardRef<HTMLElement, ListSubheaderProps>(function ListSubheader(
  { inset = false, sticky = false, component: Component = 'li', className, children, ...rest },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cx('gl-option-group', 'gl-list-subheader', inset && 'gl-list-subheader-inset', sticky && 'gl-list-subheader-sticky', className)}
      {...rest}
    >
      {children}
    </Component>
  );
});
