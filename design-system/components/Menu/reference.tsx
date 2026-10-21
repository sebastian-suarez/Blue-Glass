import * as React from 'react';
import { cx } from '../internal/cx';
import { useEventCallback, useForkRef, useId, useIsoLayoutEffect } from '../internal/hooks';
import { Popover, PopoverProps } from '../utils/Popover';
import { Icon } from '../data-display/Icon';

export type MenuCloseReason = 'backdropClick' | 'escapeKeyDown' | 'itemClick' | 'tabKeyDown';
type CloseMenu = (event: React.SyntheticEvent | KeyboardEvent, reason: MenuCloseReason) => void;

const MenuContext = React.createContext<{ close: CloseMenu } | null>(null);

interface ListContextValue {
  dense: boolean;
  /** Id of the item that holds tabindex 0 (roving tab stop). */
  tabStop: string | null;
  autoFocusItem: boolean;
  setTabStop: (id: string) => void;
  /** True while a typeahead word is being typed, so Space extends it instead of activating. */
  isTyping: () => boolean;
}
const MenuListContext = React.createContext<ListContextValue | null>(null);

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
const TYPEAHEAD_MS = 500;

function getItems(list: HTMLElement): HTMLElement[] {
  return Array.from(list.querySelectorAll<HTMLElement>(ITEM_SELECTOR)).filter((el) => el.closest('[role="menu"]') === list);
}

function labelOf(el: HTMLElement): string {
  const label = el.querySelector('.gl-menu-item-label');
  return ((label ?? el).textContent ?? '').trim().toLowerCase();
}

export interface MenuListProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Move focus to the selected item, else the first enabled one, when this turns true. Menu sets it on open. */
  autoFocusItem?: boolean;
  /** Compact 32px rows for pointer-heavy screens. */
  dense?: boolean;
  /** Stop at the first and last item instead of wrapping around. */
  disableListWrap?: boolean;
  /** MenuItems, with separators between groups (`divider` on an item, or `<li role="separator" />`). */
  children?: React.ReactNode;
}

/** A role="menu" list with roving focus (Up and Down, Home and End, typeahead) that Menu renders, or that stands alone as an always-visible menu. */
export const MenuList = React.forwardRef<HTMLUListElement, MenuListProps>(function MenuList(
  { autoFocusItem = false, dense = false, disableListWrap = false, className, onKeyDown, children, ...rest },
  ref,
) {
  const menu = React.useContext(MenuContext);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const handleRef = useForkRef(listRef, ref);
  const [tabStop, setTabStop] = React.useState<string | null>(null);
  const typed = React.useRef({ keys: '', at: 0 });

  // The tab stop: where focus last was, else the selected item, else the first enabled one.
  useIsoLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const items = getItems(list);
    if (tabStop && items.some((el) => el.id === tabStop)) return;
    const initial =
      items.find((el) => el.getAttribute('aria-checked') === 'true') ??
      items.find((el) => el.getAttribute('aria-disabled') !== 'true') ??
      items[0];
    const next = initial ? initial.id : null;
    if (next !== tabStop) setTabStop(next);
  });

  // Move focus in. Inside a Menu the Modal also focuses the [data-autofocus] item once the surface is visible.
  const focusedOnce = React.useRef(false);
  React.useEffect(() => {
    if (!autoFocusItem) {
      focusedOnce.current = false;
      return;
    }
    const list = listRef.current;
    if (focusedOnce.current || !tabStop || !list) return;
    const el = getItems(list).find((item) => item.id === tabStop);
    if (!el) return;
    el.focus({ preventScroll: true });
    focusedOnce.current = document.activeElement === el;
  }, [autoFocusItem, tabStop]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    const list = listRef.current;
    if (!list) return;
    const items = getItems(list);
    if (!items.length) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const last = items.length - 1;
    let next: number | null = null;
    switch (e.key) {
      case 'ArrowDown':
        next = current < 0 ? 0 : current < last ? current + 1 : disableListWrap ? last : 0;
        break;
      case 'ArrowUp':
        next = current < 0 ? last : current > 0 ? current - 1 : disableListWrap ? 0 : last;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Tab':
        // A menu is one tab stop: Tab closes it and the Modal returns focus to the button.
        if (menu) {
          e.preventDefault();
          menu.close(e, 'tabKeyDown');
        }
        return;
      default: {
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = typed.current;
        if (e.timeStamp - t.at > TYPEAHEAD_MS) t.keys = '';
        t.at = e.timeStamp;
        if (e.key === ' ' && !t.keys) return; // Space alone activates the item
        t.keys += e.key.toLowerCase();
        const repeated = t.keys.split('').every((c) => c === t.keys[0]);
        const query = repeated ? t.keys[0] : t.keys;
        const from = repeated ? current + 1 : Math.max(current, 0);
        for (let i = 0; i < items.length; i += 1) {
          const index = (from + i) % items.length;
          if (labelOf(items[index]).startsWith(query)) {
            next = index;
            break;
          }
        }
        if (next === null) return;
      }
    }
    e.preventDefault();
    items[next].focus();
  };

  const ctx = React.useMemo<ListContextValue>(
    () => ({
      dense,
      tabStop,
      autoFocusItem,
      setTabStop,
      isTyping: () => typed.current.keys !== '' && performance.now() - typed.current.at < TYPEAHEAD_MS,
    }),
    [dense, tabStop, autoFocusItem],
  );

  return (
    <MenuListContext.Provider value={ctx}>
      <ul
        ref={handleRef}
        role="menu"
        className={cx('gl-listbox', 'gl-menu-list', dense && 'gl-menu-list-dense', className)}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {children}
      </ul>
    </MenuListContext.Provider>
  );
});

export interface MenuItemProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
  /** Icon before the label, 16px. */
  icon?: React.ReactNode;
  /** A second line under the label, in color-muted. */
  secondary?: React.ReactNode;
  /** Trailing slot: a shortcut ("⌘C"), a count, or arrow-ne on a link. Pair a shortcut with aria-keyshortcuts. */
  end?: React.ReactNode;
  /** The current choice in a set: the raised row, a check and aria-checked. Setting it, true or false, makes the item a menuitemradio. */
  selected?: boolean;
  /** Can't be chosen; still reachable with the arrows, as APG recommends, and announced as dimmed. */
  disabled?: boolean;
  /** A hairline separator after this item. */
  divider?: boolean;
  /** A 32px row. Inherits the list's dense. */
  dense?: boolean;
  /** danger for destructive items ("Delete"). */
  tone?: 'default' | 'danger';
  /** Render the item as a link: <a role="menuitem"> inside <li role="none">. */
  href?: string;
  /** Link target, with href. */
  target?: string;
  /** Link rel, with href. */
  rel?: string;
  /** Called on click, Enter or Space. The surrounding Menu then closes, unless you call event.preventDefault(). */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /** The label. */
  children?: React.ReactNode;
}

/** One row of a menu on the shared option row: an icon, a label with an optional second line, and an end slot. */
export const MenuItem = React.forwardRef<HTMLElement, MenuItemProps>(function MenuItem(props, ref) {
  const {
    icon, secondary, end, selected, disabled = false, divider = false, dense: denseProp, tone = 'default', href, target, rel,
    onClick, onKeyDown, onFocus, id: idProp, role: roleProp, className, children, ...rest
  } = props;
  const menu = React.useContext(MenuContext);
  const list = React.useContext(MenuListContext);
  const id = useId(idProp);
  const dense = denseProp ?? list?.dense ?? false;
  const role = roleProp ?? (selected === undefined ? 'menuitem' : 'menuitemradio');
  const isLink = href !== undefined;
  const isStop = list ? list.tabStop === id : false;

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    if (!e.defaultPrevented) menu?.close(e, 'itemClick');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.target !== e.currentTarget) return;
    if (e.key === ' ' && list?.isTyping()) return;
    // Links activate on Enter natively; rows need Enter and Space, links need Space.
    if (e.key === ' ' || (e.key === 'Enter' && !isLink)) {
      e.preventDefault();
      if (!disabled) e.currentTarget.click();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    onFocus?.(e);
    if (e.target === e.currentTarget) list?.setTabStop(id);
  };

  const attrs = {
    id,
    role,
    tabIndex: list ? (isStop ? 0 : -1) : 0,
    className: cx('gl-option', 'gl-menu-item', dense && 'gl-menu-item-dense', tone === 'danger' && 'gl-menu-item-danger', className),
    'aria-disabled': disabled || undefined,
    'aria-checked': role === 'menuitem' ? undefined : !!selected,
    'data-selected': selected ? '' : undefined,
    'data-autofocus': list?.autoFocusItem && isStop ? '' : undefined,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    ...rest,
  };

  const content = (
    <>
      {icon ? <span className="gl-option-icon">{icon}</span> : null}
      <span className="gl-option-text">
        <span className="gl-menu-item-label">{children}</span>
        {secondary ? <span className="gl-option-secondary">{secondary}</span> : null}
      </span>
      {end || selected ? (
        <span className="gl-option-end">
          {end}
          {selected ? <Icon name="check" size={16} /> : null}
        </span>
      ) : null}
    </>
  );
  const separator = divider ? <li role="separator" className="gl-menu-separator" /> : null;

  if (isLink) {
    return (
      <>
        <li role="none" className="gl-menu-item-wrap">
          <a ref={ref as React.Ref<HTMLAnchorElement>} href={disabled ? undefined : href} target={target} rel={rel} {...attrs}>
            {content}
          </a>
        </li>
        {separator}
      </>
    );
  }
  return (
    <>
      <li ref={ref as React.Ref<HTMLLIElement>} {...attrs}>
        {content}
      </li>
      {separator}
    </>
  );
});

export interface MenuProps extends Omit<PopoverProps, 'onClose' | 'padding' | 'children'> {
  /** Called with the reason (backdropClick, escapeKeyDown, itemClick, tabKeyDown). Set open to false to close. */
  onClose?: (event: React.SyntheticEvent | KeyboardEvent, reason: MenuCloseReason) => void;
  /** Focus the selected item, else the first enabled one, when it opens. Default true. */
  autoFocus?: boolean;
  /** Compact 32px rows. */
  dense?: boolean;
  /** Id of the role="menu" list, for the button's aria-controls. */
  id?: string;
  /** Props for the inner MenuList. aria-labelledby defaults to the anchor's id. */
  MenuListProps?: Partial<MenuListProps>;
  /** MenuItems, with separators between groups. */
  children?: React.ReactNode;
}

/** A list of actions on a glass popover anchored to the button that opens it, closing on a choice, an outside press, Escape or Tab. */
export const Menu = React.forwardRef<HTMLDivElement, MenuProps>(function Menu(props, ref) {
  const {
    open, onClose, anchorEl, autoFocus = true, dense = false, id, MenuListProps, disableAutoFocus = false,
    placement = 'bottom-start', className, children, ...rest
  } = props;
  const close = useEventCallback((event: React.SyntheticEvent | KeyboardEvent, reason: MenuCloseReason) => onClose?.(event, reason));
  const ctx = React.useMemo(() => ({ close }), [close]);
  const anchorId = anchorEl && typeof anchorEl === 'object' && 'id' in anchorEl && anchorEl.id ? anchorEl.id : undefined;
  return (
    <Popover
      ref={ref}
      open={open}
      anchorEl={anchorEl}
      onClose={close}
      placement={placement}
      padding="sm"
      disableAutoFocus={disableAutoFocus}
      className={cx('gl-menu', className)}
      {...rest}
    >
      <MenuContext.Provider value={ctx}>
        <MenuList id={id} aria-labelledby={anchorId} autoFocusItem={open && autoFocus && !disableAutoFocus} dense={dense} {...MenuListProps}>
          {children}
        </MenuList>
      </MenuContext.Provider>
    </Popover>
  );
});
