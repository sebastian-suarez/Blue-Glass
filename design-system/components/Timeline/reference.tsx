import * as React from 'react';
import { cx } from '../internal/cx';

export type TimelinePosition = 'left' | 'right' | 'alternate' | 'alternate-reverse';

const TimelineContext = React.createContext<{ position: TimelinePosition }>({ position: 'right' });

export interface TimelineProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Which side the content sits on. right: content right of the line, dates left (default).
   * left: the mirror. alternate / alternate-reverse: sides alternate, and fall back to
   * right under 700px.
   */
  position?: TimelinePosition;
  /**
   * Width of the opposite (date) column, px or a CSS length, for left and right positions
   * (and alternate once it folds under 700px). Default: half the row, as in MUI.
   */
  oppositeWidth?: number | string;
  /** The element to render. Default "ul". */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** A vertical sequence of events: dots on a hairline, content on one side, dates on the other. */
export const Timeline = React.forwardRef<HTMLElement, TimelineProps>(function Timeline(
  { position = 'right', oppositeWidth, component: Component = 'ul', className, style, children, ...rest },
  ref,
) {
  const ctx = React.useMemo(() => ({ position }), [position]);
  const s: Record<string, string | number | undefined> = { ...style };
  if (oppositeWidth !== undefined) {
    s['--gl-timeline-opposite-width'] = typeof oppositeWidth === 'number' ? `${oppositeWidth}px` : oppositeWidth;
  }
  return (
    <Component
      ref={ref}
      className={cx('gl-timeline', `gl-timeline-${position}`, oppositeWidth !== undefined && 'gl-timeline-fixed-opposite', className)}
      style={s}
      {...rest}
    >
      <TimelineContext.Provider value={ctx}>{children}</TimelineContext.Provider>
    </Component>
  );
});

export interface TimelineItemProps extends React.HTMLAttributes<HTMLElement> {
  /** The element to render. Default "li". */
  component?: React.ElementType;
  /** TimelineOppositeContent (optional), TimelineSeparator, TimelineContent. */
  children?: React.ReactNode;
}

/** One event: the opposite content, the separator (dot and connector) and the content, in a row. */
export const TimelineItem = React.forwardRef<HTMLElement, TimelineItemProps>(function TimelineItem(
  { component: Component = 'li', className, children, ...rest },
  ref,
) {
  const { position } = React.useContext(TimelineContext);
  const hasOpposite = React.Children.toArray(children).some(
    (child) => React.isValidElement(child) && child.type === TimelineOppositeContent,
  );
  return (
    <Component
      ref={ref}
      className={cx(
        'gl-timeline-item',
        !hasOpposite && 'gl-timeline-item-no-opposite',
        !hasOpposite && (position === 'alternate' || position === 'alternate-reverse') && 'gl-timeline-item-spacer',
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
});

export interface TimelineSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** A TimelineDot, then a TimelineConnector (leave the connector off the last item). */
  children?: React.ReactNode;
}

/** The column that holds the dot and the connector. */
export const TimelineSeparator = React.forwardRef<HTMLDivElement, TimelineSeparatorProps>(function TimelineSeparator(
  { className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('gl-timeline-separator', className)} aria-hidden="true" {...rest}>
      {children}
    </div>
  );
});

export interface TimelineDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * filled: a solid dot (color-ink, or the tone). outlined: a 2px ring (dg-edge, or the tone).
   * orb: the site's glass orb (.tab-orb gradient); accent picks the bluer .orb-1.
   */
  variant?: 'filled' | 'outlined' | 'orb';
  /** State colour. Pair it with a word in the content; colour is never the only signal. */
  tone?: 'default' | 'accent' | 'danger' | 'warning' | 'success' | 'info';
  /** An icon inside the dot (16px); the dot grows to fit it. */
  children?: React.ReactNode;
}

/** The marker on the line. */
export const TimelineDot = React.forwardRef<HTMLSpanElement, TimelineDotProps>(function TimelineDot(
  { variant = 'filled', tone = 'default', className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={cx(
        'gl-timeline-dot',
        `gl-timeline-dot-${variant}`,
        tone !== 'default' && `gl-timeline-dot-${tone}`,
        children !== undefined && children !== null && 'gl-timeline-dot-icon',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
});

export interface TimelineConnectorProps extends React.HTMLAttributes<HTMLSpanElement> {}

/** The hairline between two dots (color-line, 2px). */
export const TimelineConnector = React.forwardRef<HTMLSpanElement, TimelineConnectorProps>(function TimelineConnector(
  { className, ...rest },
  ref,
) {
  return <span ref={ref} className={cx('gl-timeline-connector', className)} {...rest} />;
});

export interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/** The event itself: 15px copy; give its title more weight with your own markup. */
export const TimelineContent = React.forwardRef<HTMLDivElement, TimelineContentProps>(function TimelineContent(
  { className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('gl-timeline-content', className)} {...rest}>
      {children}
    </div>
  );
});

export interface TimelineOppositeContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

/** The other side of the line: the date, at 12px in color-muted (.career-date). */
export const TimelineOppositeContent = React.forwardRef<HTMLDivElement, TimelineOppositeContentProps>(
  function TimelineOppositeContent({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={cx('gl-timeline-opposite', className)} {...rest}>
        {children}
      </div>
    );
  },
);
