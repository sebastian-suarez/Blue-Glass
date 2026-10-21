import * as React from 'react';
import { cx } from '../internal/cx';
import { Icon } from '../data-display/Icon';

export interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'color'> {
  /**
   * always: the inline prose link, underlined 3px below the text (.hiw-asof a), the default.
   * hover: the "go" link (.replink, .figure-link): 13px, no underline until a fine-pointer
   * hover (5px offset), a 32px tap target. none: never underlined.
   */
  underline?: 'always' | 'hover' | 'none';
  /** Text colour: color-link, color-ink, color-muted or inherit. Default link for always, ink otherwise. */
  color?: 'link' | 'ink' | 'muted' | 'inherit';
  /**
   * Opens in a new tab: sets target="_blank" and rel="noopener noreferrer", adds the arrow-ne
   * icon and a screen-reader note. Turns on by itself when target="_blank".
   */
  external?: boolean;
  /** Icon after the text, e.g. `<Icon name="arrow-ne" />` on a same-tab "go" link. external adds arrow-ne unless you pass one. */
  endIcon?: React.ReactNode;
  /** The screen-reader note on external links. Default "(opens in a new tab)". */
  newTabLabel?: string;
  /** Render another element, e.g. a router link or "button"; it receives className, href and the rest. */
  component?: React.ElementType;
  children?: React.ReactNode;
}

/** Add noopener and noreferrer to whatever rel the caller passed. */
function externalRel(rel: string | undefined): string {
  const parts = (rel ?? '').split(/\s+/).filter(Boolean);
  for (const token of ['noopener', 'noreferrer']) if (!parts.includes(token)) parts.push(token);
  return parts.join(' ');
}

/** The site's links: underlined prose links in color-link, and the "go" links that underline under a pointer. */
export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    underline = 'always', color, external, endIcon, newTabLabel = '(opens in a new tab)', component: Component = 'a',
    className, children, target, rel, type, ...rest
  },
  ref,
) {
  const isExternal = external ?? target === '_blank';
  const tone = color ?? (underline === 'always' ? 'link' : 'ink');
  const isButton = Component === 'button';
  const icon = endIcon ?? (isExternal ? <Icon name="arrow-ne" /> : null);
  return (
    <Component
      ref={ref}
      className={cx(
        'gl-link',
        isButton && 'gl-link-button',
        `gl-link-underline-${underline}`,
        `gl-link-color-${tone}`,
        className,
      )}
      target={isExternal ? target ?? '_blank' : target}
      rel={isExternal ? externalRel(rel as string | undefined) : rel}
      type={isButton ? type ?? 'button' : type}
      {...rest}
    >
      {children}
      {icon ? (
        <span className="gl-link-icon" aria-hidden="true">
          {/* U+2060 word joiner: the arrow never wraps onto a line of its own. */}
          {'⁠'}
          {icon}
        </span>
      ) : null}
      {isExternal ? <span className="gl-sr-only"> {newTabLabel}</span> : null}
    </Component>
  );
});
