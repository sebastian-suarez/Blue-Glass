import * as React from 'react';
import { cx } from '../internal/cx';
import { useControlled, useEventCallback, useId } from '../internal/hooks';
import { Collapse } from '../utils/Transitions';
import type { CollapseProps } from '../utils/Transitions';
import { useMediaQuery } from '../utils/useMediaQuery';

type HeadingLevel = 2 | 3 | 4 | 5 | 6;

interface AccordionContextValue {
  expanded: boolean;
  disabled: boolean;
  toggle: (event: React.SyntheticEvent) => void;
  triggerId: string;
  regionId: string;
  headingLevel: HeadingLevel;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export interface AccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Open (controlled). Pair with onChange. */
  expanded?: boolean;
  /** Open on first render (uncontrolled). */
  defaultExpanded?: boolean;
  /** Called when the summary is pressed, with the requested state. */
  onChange?: (event: React.SyntheticEvent, expanded: boolean) => void;
  /** Dims the row; the summary can't be focused or pressed. */
  disabled?: boolean;
  /** Level of the heading that wraps the summary button. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Props for the Collapse that reveals the details: timeout ({ enter: 300, exit: 200 } by default), unmountOnExit. */
  TransitionProps?: Partial<Pick<CollapseProps, 'timeout' | 'unmountOnExit' | 'mountOnEnter' | 'onEntered' | 'onExited'>>;
  /** An AccordionSummary first, then the AccordionDetails. */
  children?: React.ReactNode;
}

/**
 * One row of the site's career list (.career-row): a summary button with the
 * plus/minus toggle, its details revealed with Collapse. Stack rows inside an
 * element with class "gl-accordion-surface" for the list's glass surface (.career-surface).
 */
export const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(function Accordion(
  {
    expanded: expandedProp, defaultExpanded = false, onChange, disabled = false, headingLevel = 3,
    TransitionProps, id, className, children, ...rest
  },
  ref,
) {
  const [expanded, setExpanded] = useControlled(expandedProp, defaultExpanded);
  const baseId = useId(id);
  const triggerId = `${baseId}-summary`;
  const regionId = `${baseId}-details`;
  const toggle = useEventCallback((event: React.SyntheticEvent) => {
    if (disabled) return;
    const next = !expanded;
    setExpanded(next);
    onChange?.(event, next);
  });
  const ctx = React.useMemo<AccordionContextValue>(
    () => ({ expanded, disabled, toggle, triggerId, regionId, headingLevel }),
    [expanded, disabled, toggle, triggerId, regionId, headingLevel],
  );
  const [summary, ...details] = React.Children.toArray(children);
  return (
    <div
      ref={ref}
      id={id}
      className={cx('gl-accordion', expanded && 'gl-accordion-expanded', disabled && 'gl-accordion-disabled', className)}
      {...rest}
    >
      <AccordionContext.Provider value={ctx}>
        {summary}
        <Collapse in={expanded} timeout={{ enter: 300, exit: 200 }} {...TransitionProps} className="gl-accordion-collapse">
          <div id={regionId} role="region" aria-labelledby={triggerId} className="gl-accordion-region">
            {details}
          </div>
        </Collapse>
      </AccordionContext.Provider>
    </div>
  );
});

/** Up/Down/Home/End move between sibling rows' summaries (WAI-ARIA APG accordion, optional keys). */
function moveBetweenRows(event: React.KeyboardEvent<HTMLButtonElement>): void {
  const { key } = event;
  if ((key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') || event.altKey || event.ctrlKey || event.metaKey) return;
  const row = event.currentTarget.closest('.gl-accordion');
  const parent = row?.parentElement;
  if (!parent) return;
  const triggers = Array.from(
    parent.querySelectorAll<HTMLButtonElement>(':scope > .gl-accordion > .gl-accordion-heading > .gl-accordion-summary'),
  ).filter((b) => !b.disabled);
  const i = triggers.indexOf(event.currentTarget);
  const n = triggers.length;
  if (i < 0 || n < 2) return;
  const next = key === 'ArrowDown' ? (i + 1) % n : key === 'ArrowUp' ? (i - 1 + n) % n : key === 'Home' ? 0 : n - 1;
  event.preventDefault();
  triggers[next].focus();
}

export interface AccordionSummaryProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Second column, in color-muted (.career-position): a role, a short fact. */
  secondary?: React.ReactNode;
  /** Third column, right-aligned in color-muted (.career-date): a date, a count. */
  meta?: React.ReactNode;
  /** Replace the plus/minus toggle with an icon; it turns 180° when open (use chevron-down). */
  expandIcon?: React.ReactNode;
  /** The row's title (.career-employer): 17px, -0.02em. */
  children?: React.ReactNode;
}

/**
 * The row's header (.career-row summary): a full-width button in a heading,
 * columns for title, secondary and meta, and the plus that turns into a minus.
 */
export const AccordionSummary = React.forwardRef<HTMLButtonElement, AccordionSummaryProps>(function AccordionSummary(
  { secondary, meta, expandIcon, className, children, onClick, onKeyDown, ...rest },
  ref,
) {
  const ctx = React.useContext(AccordionContext);
  const Heading = `h${ctx?.headingLevel ?? 3}` as React.ElementType;
  const hasSecondary = secondary !== undefined && secondary !== null && secondary !== false;
  const hasMeta = meta !== undefined && meta !== null && meta !== false;
  return (
    <Heading className="gl-accordion-heading">
      <button
        ref={ref}
        type="button"
        id={ctx?.triggerId}
        aria-expanded={ctx ? ctx.expanded : undefined}
        aria-controls={ctx?.regionId}
        disabled={ctx?.disabled}
        className={cx(
          'gl-accordion-summary',
          hasSecondary && 'gl-accordion-summary-has-secondary',
          hasMeta && 'gl-accordion-summary-has-meta',
          className,
        )}
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(e);
          if (!e.defaultPrevented) ctx?.toggle(e);
        }}
        onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
          onKeyDown?.(e);
          if (!e.defaultPrevented) moveBetweenRows(e);
        }}
        {...rest}
      >
        <span className="gl-accordion-summary-primary">{children}</span>
        {hasSecondary ? <span className="gl-accordion-summary-secondary">{secondary}</span> : null}
        {hasMeta ? <span className="gl-accordion-summary-meta">{meta}</span> : null}
        {expandIcon ? (
          <span className="gl-accordion-expand-icon" aria-hidden="true">{expandIcon}</span>
        ) : (
          <span className="gl-accordion-toggle" aria-hidden="true" />
        )}
      </button>
    </Heading>
  );
});

export interface AccordionDetailsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A small closing line at 11px (.career-description > span), such as the role's location. */
  meta?: React.ReactNode;
  /** Indent the details under the second column (26% on the left), as the site does. Default true; false runs full width. */
  inset?: boolean;
  children?: React.ReactNode;
}

/** The revealed part of a row (.career-description): 14px copy in color-muted, paragraphs 10px apart. */
export const AccordionDetails = React.forwardRef<HTMLDivElement, AccordionDetailsProps>(function AccordionDetails(
  { meta, inset = true, className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('gl-accordion-details', !inset && 'gl-accordion-details-full', className)} {...rest}>
      {children}
      {meta !== undefined && meta !== null ? <span className="gl-accordion-details-meta">{meta}</span> : null}
    </div>
  );
});

/* ---------- PaneAccordion: the site's horizontal accordion (.acc, scripts/accordion.ts) ---------- */

export interface PaneAccordionItem {
  /** Stable id: the React key and the base of the pane's ids. Default: the title, slugified (or the index). */
  id?: string;
  /** The pane's title (.pane-title), 22px. */
  title: React.ReactNode;
  /** The blurb, always visible (.pane-text). */
  text?: React.ReactNode;
  /** Tags revealed when the pane opens (.more > .chips). */
  chips?: React.ReactNode[];
  /** Other content to reveal instead of chips. */
  more?: React.ReactNode;
  /** default: glass-control. alt: fainter glass. accent: the ring-tinted pane with an accent title; one per set. */
  tone?: 'default' | 'alt' | 'accent';
}

export interface PaneAccordionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The panes, left to right. */
  items: PaneAccordionItem[];
  /**
   * auto: the site's layout, panes side by side, stacked at 899px and below.
   * horizontal: side by side down to 701px, stacked on phones. vertical: always stacked.
   */
  orientation?: 'auto' | 'horizontal' | 'vertical';
  /** Ids of the open panes (controlled). Panes not listed are closed. */
  open?: string[];
  /** Ids of the panes open on first render (uncontrolled). */
  defaultOpen?: string[];
  /** Called when a pane is pressed, with the ids that are now open. */
  onChange?: (event: React.SyntheticEvent, open: string[]) => void;
  /** Level of the heading around each pane's button. Default 3. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

function slug(value: React.ReactNode, index: number): string {
  if (typeof value === 'string' || typeof value === 'number') {
    const s = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (s) return s;
  }
  return `pane-${index}`;
}

/**
 * The site's horizontal accordion (.acc): glass panes that widen to 2.6x on
 * hover, focus or press and reveal their chips. Narrow screens and touch get a
 * tap toggle with the chips shown, as scripts/accordion.ts does.
 */
export const PaneAccordion = React.forwardRef<HTMLDivElement, PaneAccordionProps>(function PaneAccordion(
  { items, orientation = 'auto', open, defaultOpen, onChange, headingLevel = 3, id, className, onKeyDown, ...rest },
  ref,
) {
  const baseId = useId(id);
  const ids = items.map((item, i) => item.id ?? slug(item.title, i));
  const controlled = React.useRef(open !== undefined).current;
  const [inner, setInner] = React.useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const key of defaultOpen ?? []) init[key] = true;
    return init;
  });
  // accordion.ts: compact = (hover: none), (max-width: 899px); the other orientations move the width.
  const compactQuery =
    orientation === 'horizontal' ? '(hover: none), (max-width: 700px)' : orientation === 'vertical' ? 'all' : '(hover: none), (max-width: 899px)';
  const compact = useMediaQuery(compactQuery);

  // On compact layouts the chips are visible by default, so every pane starts open (the script's init).
  const initialised = React.useRef(false);
  React.useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    if (!controlled && compact) {
      setInner(() => {
        const all: Record<string, boolean> = {};
        for (const key of ids) all[key] = true;
        return all;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = (key: string): boolean | undefined => (controlled ? (open ?? []).includes(key) : inner[key]);

  const press = useEventCallback((event: React.SyntheticEvent, key: string) => {
    const opening = state(key) !== true;
    const next: Record<string, boolean> = {};
    for (const k of ids) {
      const s = state(k);
      if (s !== undefined) next[k] = s;
    }
    if (opening && !compact) for (const other of ids) if (other !== key) next[other] = false;
    next[key] = opening;
    if (!controlled) setInner(next);
    onChange?.(event, ids.filter((k) => next[k]));
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (!target.classList || !target.classList.contains('gl-pane-button')) return;
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(':scope > .gl-pane > .gl-pane-heading > .gl-pane-button'));
    const i = buttons.indexOf(target as HTMLButtonElement);
    const n = buttons.length;
    if (i < 0 || n < 2) return;
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
    const next = forward ? (i + 1) % n : back ? (i - 1 + n) % n : event.key === 'Home' ? 0 : n - 1;
    event.preventDefault();
    buttons[next].focus();
  };

  const Heading = `h${headingLevel}` as React.ElementType;
  return (
    <div
      ref={ref}
      id={id}
      className={cx('gl-pane-accordion', `gl-pane-accordion-${orientation}`, className)}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {items.map((item, i) => {
        const key = ids[i];
        const s = state(key);
        const buttonId = `${baseId}-${key}-button`;
        const bodyId = `${baseId}-${key}-body`;
        const hasChips = Array.isArray(item.chips) && item.chips.length > 0;
        const hasMore = item.more !== undefined && item.more !== null;
        return (
          <div
            key={key}
            className={cx('gl-pane', `gl-pane-${item.tone ?? 'default'}`)}
            data-state={s === undefined ? undefined : s ? 'open' : 'closed'}
          >
            <Heading className="gl-pane-heading">
              <button
                type="button"
                id={buttonId}
                className="gl-pane-button"
                aria-expanded={s === true}
                aria-controls={bodyId}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => press(e, key)}
              >
                <span className="gl-pane-title">{item.title}</span>
              </button>
            </Heading>
            <div id={bodyId} className="gl-pane-body">
              {item.text !== undefined && item.text !== null ? <p className="gl-pane-text">{item.text}</p> : null}
              {hasMore || hasChips ? (
                <div className="gl-pane-more">
                  <div className="gl-pane-more-inner">
                    {hasMore ? (
                      item.more
                    ) : (
                      <ul className="gl-pane-chips">
                        {item.chips!.map((chip, j) => (
                          <li key={typeof chip === 'string' ? chip : j} className="gl-pane-chip">
                            {chip}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
});
