import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback, useId, useIsoLayoutEffect, usePrefersReducedMotion } from '../internal/hooks';
import { useMediaQuery, media } from '../utils/useMediaQuery';
import { Icon } from '../data-display/Icon';

export type TabValue = string | number;

interface TabsContextValue {
  variant: 'underline' | 'pill' | 'side';
  value: TabValue | false;
  /** The tab that holds tabindex 0 (roving tab stop). */
  tabStop: TabValue | false;
  baseId: string;
  select: (event: React.SyntheticEvent, value: TabValue) => void;
  hasPanel: (value: TabValue) => boolean;
  registerPanel: (value: TabValue) => () => void;
}
const TabsContext = React.createContext<TabsContextValue | null>(null);

// Values become id fragments: keep [A-Za-z0-9-], encode the rest so "a b" and "a-b" stay distinct.
const slug = (v: TabValue) => String(v).replace(/[^A-Za-z0-9-]/g, (c) => `_${c.charCodeAt(0).toString(16)}`);
const tabIdOf = (base: string, v: TabValue) => `${base}-tab-${slug(v)}`;
const panelIdOf = (base: string, v: TabValue) => `${base}-panel-${slug(v)}`;

/** The indicator's width: the site's mobile tab mark is 16px. */
const MARK = 16;
/** Room kept clear of the fade when a tab is scrolled into view. */
const EDGE = 40;

function revealTab(list: HTMLElement, tab: HTMLElement, smooth: boolean) {
  if (getComputedStyle(list).direction === 'rtl') {
    tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }
  const left = tab.offsetLeft - EDGE;
  const right = tab.offsetLeft + tab.offsetWidth + EDGE - list.clientWidth;
  const target = left < list.scrollLeft ? Math.max(0, left) : right > list.scrollLeft ? right : null;
  if (target !== null) list.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' });
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** The selected tab's value (controlled). false selects none. */
  value?: TabValue | false;
  /** The tab selected first (uncontrolled). Default: the first enabled tab. */
  defaultValue?: TabValue | false;
  /** Called with the new value when a tab is chosen by click or by the arrow keys. */
  onChange?: (event: React.SyntheticEvent, value: TabValue) => void;
  /** underline: tabs in a row over a sliding ink mark (default). pill: the site's nav pill. side: the client-work selector beside its panels. */
  variant?: 'underline' | 'pill' | 'side';
  /** Stretch the tabs to share the row (underline and pill). */
  fullWidth?: boolean;
  /** Names the tab list. */
  'aria-label'?: string;
  /** Names the tab list by another element's id. */
  'aria-labelledby'?: string;
  /** Tab elements, then the TabPanels (wrapped in a Paper or not). */
  children?: React.ReactNode;
}

/** A set of tabs and their panels, where Tab children form the tab list and every other child is the panel area. */
export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(function Tabs(props, ref) {
  const {
    value: valueProp, defaultValue, onChange, variant = 'underline', fullWidth = false, id,
    'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, className, children, ...rest
  } = props;
  const baseId = useId(id);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const phone = useMediaQuery(media.phone);
  const vertical = variant === 'side' && !phone;

  // Tab children go to the list (their value defaults to their position); the rest is the panel area.
  const items: Array<{ value: TabValue; disabled: boolean }> = [];
  const tabs: React.ReactNode[] = [];
  const panels: React.ReactNode[] = [];
  React.Children.toArray(children).forEach((child) => {
    if (React.isValidElement(child) && child.type === Tab) {
      const p = child.props as TabProps;
      const v = p.value ?? items.length;
      tabs.push(React.cloneElement(child as React.ReactElement<TabProps>, { value: v, orb: p.orb ?? ((items.length % 3) as 0 | 1 | 2) }));
      items.push({ value: v, disabled: !!p.disabled });
    } else {
      panels.push(child);
    }
  });
  const enabled = items.filter((t) => !t.disabled);
  const first = enabled.length ? enabled[0].value : false;

  const [value, setValue] = useControlled<TabValue | false>(valueProp, defaultValue !== undefined ? defaultValue : first);
  const tabStop = value !== false && enabled.some((t) => t.value === value) ? value : first;

  const select = useEventCallback((event: React.SyntheticEvent, next: TabValue) => {
    if (next === value) return;
    setValue(next);
    onChange?.(event, next);
  });

  // Panels register so a tab only points aria-controls at a panel that exists.
  const [registered, setRegistered] = React.useState<ReadonlyArray<TabValue>>([]);
  const registerPanel = React.useCallback((v: TabValue) => {
    setRegistered((prev) => (prev.includes(v) ? prev : [...prev, v]));
    return () => setRegistered((prev) => prev.filter((x) => x !== v));
  }, []);
  const hasPanel = React.useCallback((v: TabValue) => registered.includes(v), [registered]);

  const ctx = React.useMemo<TabsContextValue>(
    () => ({ variant, value, tabStop, baseId, select, hasPanel, registerPanel }),
    [variant, value, tabStop, baseId, select, hasPanel, registerPanel],
  );

  // Measure: which edges overflow (fades and scroll buttons), and where the underline mark sits.
  // Compared against what was rendered, outside React's update queue, and set only on a real change:
  // an updater function here would be rebased onto stale state while a scroll-priority update is
  // pending and re-render forever (React error 185).
  const [overflow, setOverflow] = React.useState({ start: false, end: false });
  const [mark, setMark] = React.useState<number | null>(null);
  const shown = React.useRef({ overflow, mark });
  shown.current = { overflow, mark };
  const measure = useEventCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const max = vertical ? 0 : list.scrollWidth - list.clientWidth;
    const pos = Math.abs(list.scrollLeft);
    const start = max > 1 && pos > 1;
    const end = max > 1 && pos < max - 1;
    const now = shown.current;
    if (now.overflow.start !== start || now.overflow.end !== end) {
      now.overflow = { start, end };
      setOverflow(now.overflow);
    }
    if (variant === 'underline') {
      const tab = value === false ? null : document.getElementById(tabIdOf(baseId, value));
      const x = tab && list.contains(tab) ? Math.round(tab.offsetLeft + tab.offsetWidth / 2 - MARK / 2) : null;
      if (now.mark !== x) {
        now.mark = x;
        setMark(x);
      }
    }
  });
  const tabKey = items.map((t) => `${String(t.value)}:${t.disabled ? 1 : 0}`).join('|');
  useIsoLayoutEffect(() => {
    measure();
  }, [measure, value, variant, vertical, tabKey]);
  React.useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(list);
    Array.from(list.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [measure, tabKey]);

  // Keep the selected tab in view in a scrolling row; instant on first paint.
  const painted = React.useRef(false);
  useIsoLayoutEffect(() => {
    const list = listRef.current;
    if (list && !vertical && value !== false && list.scrollWidth > list.clientWidth + 1) {
      const tab = document.getElementById(tabIdOf(baseId, value));
      if (tab && list.contains(tab)) revealTab(list, tab, painted.current && !reduced);
    }
    painted.current = true;
  }, [value, vertical]);

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!enabled.length) return;
    const i = enabled.findIndex((t) => tabIdOf(baseId, t.value) === (document.activeElement as HTMLElement | null)?.id);
    if (i < 0) return;
    const rtl = !vertical && !!listRef.current && getComputedStyle(listRef.current).direction === 'rtl';
    const nextKeys = vertical ? ['ArrowDown', 'ArrowRight'] : [rtl ? 'ArrowLeft' : 'ArrowRight'];
    const prevKeys = vertical ? ['ArrowUp', 'ArrowLeft'] : [rtl ? 'ArrowRight' : 'ArrowLeft'];
    let n: number;
    if (nextKeys.includes(e.key)) n = (i + 1) % enabled.length;
    else if (prevKeys.includes(e.key)) n = (i - 1 + enabled.length) % enabled.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = enabled.length - 1;
    else return;
    e.preventDefault();
    const target = enabled[n];
    document.getElementById(tabIdOf(baseId, target.value))?.focus();
    select(e, target.value); // automatic activation: selection follows focus
  };

  const scrollByPage = (dir: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const sign = getComputedStyle(list).direction === 'rtl' ? -1 : 1;
    list.scrollBy({ left: dir * sign * list.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <TabsContext.Provider value={ctx}>
      <div
        ref={ref}
        id={id}
        className={cx('gl-tabs', `gl-tabs-${variant}`, fullWidth && 'gl-tabs-full', panels.length > 0 && 'gl-tabs-with-panels', className)}
        {...rest}
      >
        <div className="gl-tabs-bar" data-overflow-start={overflow.start ? '' : undefined} data-overflow-end={overflow.end ? '' : undefined}>
          <div
            ref={listRef}
            role="tablist"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            aria-orientation={vertical ? 'vertical' : undefined}
            className="gl-tabs-list"
            onKeyDown={onListKeyDown}
            onScroll={vertical ? undefined : () => measure()}
          >
            {tabs}
            {variant === 'underline' && mark !== null ? (
              <span className="gl-tabs-indicator" aria-hidden="true" style={{ transform: `translateX(${mark}px)` }} />
            ) : null}
          </div>
          {vertical ? null : (
            <>
              <button type="button" className="gl-tabs-scroll gl-tabs-scroll-start" tabIndex={-1} aria-hidden="true" onClick={() => scrollByPage(-1)}>
                <Icon name="chevron-left" size={16} />
              </button>
              <button type="button" className="gl-tabs-scroll gl-tabs-scroll-end" tabIndex={-1} aria-hidden="true" onClick={() => scrollByPage(1)}>
                <Icon name="chevron-right" size={16} />
              </button>
            </>
          )}
        </div>
        {panels.length > 0 ? <div className="gl-tabs-panels">{panels}</div> : null}
      </div>
    </TabsContext.Provider>
  );
});

export interface TabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'type'> {
  /** Matches a TabPanel's value. Default: the tab's position (0, 1, 2…). */
  value?: TabValue;
  /** The label; children work too. */
  label?: React.ReactNode;
  /** Icon before the label, 16px. In the side variant it replaces the orb; null removes the orb. */
  icon?: React.ReactNode;
  /** The side variant's orb tint, the site's orb-0, orb-1 and orb-2. Default: by position. */
  orb?: 0 | 1 | 2;
  /** Can't be selected; the arrow keys skip it. */
  disabled?: boolean;
  /** The label, when label isn't set. */
  children?: React.ReactNode;
}

/** One tab inside Tabs: a button with role="tab" that selects its panel. */
export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value = 0, label, icon, orb = 0, disabled = false, className, onClick, children, ...rest },
  ref,
) {
  const ctx = React.useContext(TabsContext);
  const variant = ctx?.variant ?? 'underline';
  const selected = !!ctx && ctx.value === value;
  let lead: React.ReactNode = icon ? <span className="gl-tab-icon">{icon}</span> : null;
  if (variant === 'side' && icon === undefined) lead = <span className={`gl-tab-orb gl-tab-orb-${orb}`} aria-hidden="true" />;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={ctx ? tabIdOf(ctx.baseId, value) : undefined}
      aria-selected={selected}
      aria-controls={ctx && ctx.hasPanel(value) ? panelIdOf(ctx.baseId, value) : undefined}
      tabIndex={ctx ? (ctx.tabStop === value ? 0 : -1) : undefined}
      disabled={disabled}
      data-selected={selected ? '' : undefined}
      className={cx('gl-tab', className)}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (!e.defaultPrevented && !disabled) ctx?.select(e, value);
      }}
      {...rest}
    >
      {lead}
      <span className="gl-tab-label">{label ?? children}</span>
      {variant === 'side' ? (
        <span className="gl-tab-mark" aria-hidden="true">
          <Icon name="check" size={15} />
        </span>
      ) : null}
    </button>
  );
});

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The value of the Tab that shows this panel. */
  value: TabValue;
  /** Keep the content mounted while hidden, as the site does. false renders it only while selected. Default true. */
  keepMounted?: boolean;
  /** The panel's content. */
  children?: React.ReactNode;
}

/** The content for one tab: hidden until its tab is selected, then faded in with the site's 280ms crossfade. */
export const TabPanel = React.forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, keepMounted = true, className, style, children, ...rest },
  ref,
) {
  const ctx = React.useContext(TabsContext);
  const active = ctx ? ctx.value === value : true;
  // Fade in only when switched to, never on first paint (project-tabs.ts animates only after a switch).
  const [seen, setSeen] = React.useState({ active, animate: false });
  if (seen.active !== active) setSeen({ active, animate: seen.animate || active });
  const register = ctx?.registerPanel;
  useIsoLayoutEffect(() => register?.(value), [register, value]);
  return (
    <div
      ref={ref}
      role="tabpanel"
      id={ctx ? panelIdOf(ctx.baseId, value) : undefined}
      aria-labelledby={ctx ? tabIdOf(ctx.baseId, value) : undefined}
      hidden={!active}
      tabIndex={0}
      className={cx('gl-tab-panel', seen.animate && 'gl-tab-panel-animate', className)}
      // A display in `style` would beat [hidden]; a hidden panel stays hidden whatever it's given.
      style={active ? style : { ...style, display: 'none' }}
      {...rest}
    >
      {active || keepMounted ? children : null}
    </div>
  );
});
